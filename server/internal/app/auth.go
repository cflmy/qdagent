package app

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type identity struct {
	Principal string
	Name      string
}
type auth struct {
	store                    *Store
	origins                  map[string]bool
	clientID, secret, issuer string
	mu                       sync.Mutex
	provider                 *oidc.Provider
	dev                      string
	client                   *http.Client
}

func newAuth(s *Store) (*auth, error) {
	a := &auth{client: newOIDCClient(), store: s, issuer: "https://id.cflmy.cn", clientID: env("QDAGENT_OIDC_CLIENT_ID", "app_e18ec1c40109417bb34b56c0c1749fe8"), origins: map[string]bool{}, dev: os.Getenv("QDAGENT_DEV_OWNER")}
	for _, o := range strings.Split(env("QDAGENT_OIDC_REDIRECT_ORIGINS", "https://agent.qdqc.com,http://127.0.0.1:7964,http://localhost:7964"), ",") {
		a.origins[strings.TrimSpace(o)] = true
	}
	if a.dev != "" {
		return a, nil
	}
	p := env("QDAGENT_OIDC_SECRET_FILE", s.root+"/.marqdo/secrets/oidc_client_secret")
	b, err := os.ReadFile(p)
	if err != nil {
		return nil, errors.New("OIDC secret unavailable")
	}
	a.secret = strings.TrimSpace(string(b))
	if a.secret == "" {
		return nil, errors.New("OIDC secret empty")
	}
	return a, nil
}
func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
func (a *auth) origin(r *http.Request) (string, error) {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	host := r.Host
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	peer := net.ParseIP(ip)
	// Forwarded origin is accepted only from a local/private reverse proxy, then exact-allowlisted.
	if peer != nil && (peer.IsLoopback() || peer.IsPrivate()) {
		if p := r.Header.Get("X-Forwarded-Proto"); p == "https" || p == "http" {
			scheme = p
		}
		if h := r.Header.Get("X-Forwarded-Host"); h != "" && !strings.ContainsAny(h, ", /\\\r\n") {
			host = h
		}
	}
	origin := scheme + "://" + host
	if !a.origins[origin] {
		return "", errors.New("登录来源未在允许列表中")
	}
	return origin, nil
}
func (a *auth) who(r *http.Request) (identity, error) {
	if a.dev != "" {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		if p := net.ParseIP(ip); p != nil && p.IsLoopback() {
			return identity{a.dev, "本地开发"}, nil
		}
	}
	c, err := r.Cookie("qd_session_v2")
	if err != nil || len(c.Value) != 96 {
		return identity{}, errors.New("请先登录")
	}
	var i identity
	err = a.store.db.QueryRow(`SELECT principal,name FROM qd_http_sessions WHERE hash=? AND expires>?`, digest(c.Value), time.Now().Unix()).Scan(&i.Principal, &i.Name)
	return i, err
}
func (a *auth) discover(ctx context.Context) (*oidc.Provider, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.provider != nil {
		return a.provider, nil
	}
	ctx, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()
	p, err := oidc.NewProvider(oidc.ClientContext(ctx, a.client), a.issuer)
	if err != nil {
		return nil, err
	}
	a.provider = p
	return p, nil
}
func (a *auth) oauth(p *oidc.Provider, redirect string) oauth2.Config {
	endpoint := p.Endpoint()
	endpoint.AuthStyle = oauth2.AuthStyleInParams
	return oauth2.Config{ClientID: a.clientID, ClientSecret: a.secret, Endpoint: endpoint, RedirectURL: redirect, Scopes: []string{oidc.ScopeOpenID, "profile", "email"}}
}
func (a *auth) login(w http.ResponseWriter, r *http.Request) {
	origin, err := a.origin(r)
	if err != nil {
		a.failure(w, r, "origin", err)
		return
	}
	p, err := a.discover(r.Context())
	if err != nil {
		a.failure(w, r, "discovery", err)
		return
	}
	state, nonce, verifier := randomID(), randomID(), oauth2.GenerateVerifier()
	redirect := origin + "/oidc/callback"
	_, err = a.store.db.Exec(`INSERT INTO qd_http_logins(state,nonce,verifier,redirect,expires) VALUES(?,?,?,?,?)`, digest(state), nonce, verifier, redirect, time.Now().Add(10*time.Minute).Unix())
	if err != nil {
		a.failure(w, r, "storage", err)
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "qd_login_v2", Value: state, Path: "/oidc", HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: strings.HasPrefix(origin, "https:"), MaxAge: 600})
	conf := a.oauth(p, redirect)
	http.Redirect(w, r, conf.AuthCodeURL(state, oidc.Nonce(nonce), oauth2.S256ChallengeOption(verifier)), http.StatusFound)
}
func (a *auth) callback(w http.ResponseWriter, r *http.Request) {
	origin, err := a.origin(r)
	if err != nil {
		a.failure(w, r, "origin", err)
		return
	}
	state := r.URL.Query().Get("state")
	cookie, e := r.Cookie("qd_login_v2")
	if e != nil || len(state) != 48 || subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(state)) != 1 {
		a.failure(w, r, "state", e)
		return
	}
	var nonce, verifier, redirect string
	var expires int64
	err = a.store.db.QueryRow(`DELETE FROM qd_http_logins WHERE state=? RETURNING nonce,verifier,redirect,expires`, digest(state)).Scan(&nonce, &verifier, &redirect, &expires)
	if err != nil || expires < time.Now().Unix() || redirect != origin+"/oidc/callback" {
		a.failure(w, r, "state", err)
		return
	}
	if r.URL.Query().Get("error") != "" || r.URL.Query().Get("code") == "" {
		a.failure(w, r, "authorization", nil)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	ctx = oidc.ClientContext(ctx, a.client)
	defer cancel()
	p, err := a.discover(ctx)
	if err != nil {
		a.failure(w, r, "discovery", err)
		return
	}
	conf := a.oauth(p, redirect)
	token, err := conf.Exchange(ctx, r.URL.Query().Get("code"), oauth2.VerifierOption(verifier))
	if err != nil {
		a.failure(w, r, "exchange", err)
		return
	}
	raw, ok := token.Extra("id_token").(string)
	if !ok {
		a.failure(w, r, "missing_token", nil)
		return
	}
	verified, err := p.Verifier(&oidc.Config{ClientID: a.clientID}).Verify(ctx, raw)
	if err != nil || verified.Nonce != nonce {
		a.failure(w, r, "verification", err)
		return
	}
	info, err := p.UserInfo(ctx, oauth2.StaticTokenSource(token))
	if err != nil || info.Subject != verified.Subject {
		a.failure(w, r, "userinfo", err)
		return
	}
	var claims struct {
		Name      string `json:"name"`
		Preferred string `json:"preferred_username"`
	}
	_ = info.Claims(&claims)
	name := claims.Name
	if name == "" {
		name = claims.Preferred
	}
	if name == "" {
		name = "求道用户"
	}
	principal := a.issuer + "\n" + verified.Subject
	session := randomID() + randomID()
	_, err = a.store.db.Exec(`INSERT INTO qd_http_sessions(hash,principal,name,expires) VALUES(?,?,?,?)`, digest(session), principal, name, time.Now().Add(8*time.Hour).Unix())
	if err != nil {
		a.failure(w, r, "storage", err)
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "qd_session_v2", Value: session, Path: "/", MaxAge: 28800, HttpOnly: true, Secure: strings.HasPrefix(origin, "https:"), SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: "qd_login_v2", Path: "/oidc", MaxAge: -1, HttpOnly: true, Secure: strings.HasPrefix(origin, "https:"), SameSite: http.SameSiteLaxMode})
	http.Redirect(w, r, "/app", http.StatusSeeOther)
}
func (a *auth) logout(w http.ResponseWriter, r *http.Request) {
	if c, e := r.Cookie("qd_session_v2"); e == nil {
		_, _ = a.store.db.Exec(`DELETE FROM qd_http_sessions WHERE hash=?`, digest(c.Value))
	}
	http.SetCookie(w, &http.Cookie{Name: "qd_session_v2", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	if r.URL.Path == "/api/logout" {
		writeJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
func (a *auth) protect(next func(http.ResponseWriter, *http.Request, identity)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		i, err := a.who(r)
		if err != nil {
			writeError(w, 401, "authentication_required", "请先登录")
			return
		}
		if r.Method != "GET" && r.Method != "HEAD" {
			origin, e := a.origin(r)
			if e != nil || r.Header.Get("Origin") != origin {
				writeError(w, 403, "origin_mismatch", "请求来源不匹配")
				return
			}
		}
		w.Header().Set("Cache-Control", "no-store")
		next(w, r, i)
	}
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]string{"code": code, "message": message}})
}
