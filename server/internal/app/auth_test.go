package app

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	jose "github.com/go-jose/go-jose/v4"
)

// Exercise the real provider/client/verifier, signed JWTs and browser cookies.
// This is a private mock issuer; production issuer validation is not relaxed.
func TestOIDCFullFlowWithDiscoveryRecoveryAndReplayProtection(t *testing.T) {
	s := testServer(t)
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: key}, (&jose.SignerOptions{}).WithHeader("kid", "test-key"))
	if err != nil {
		t.Fatal(err)
	}
	var discoveryCount atomic.Int32
	var tokenCount atomic.Int32
	var nonce, challenge string
	var badNonce, mismatchSubject, rejectExchange bool
	providerURL := ""
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		if discoveryCount.Add(1) == 1 {
			w.WriteHeader(503)
			return
		}
		writeJSON(w, 200, map[string]any{"issuer": providerURL, "authorization_endpoint": providerURL + "/authorize", "token_endpoint": providerURL + "/token", "userinfo_endpoint": providerURL + "/userinfo", "jwks_uri": providerURL + "/keys", "id_token_signing_alg_values_supported": []string{"RS256"}})
	})
	mux.HandleFunc("/keys", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{Key: &key.PublicKey, KeyID: "test-key", Algorithm: "RS256", Use: "sig"}}})
	})
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		tokenCount.Add(1)
		r.ParseForm()
		digest := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
		if r.Method != "POST" || r.Header.Get("Authorization") != "" || r.Form.Get("client_id") != "fixture-client" || r.Form.Get("client_secret") != "fixture-private" || r.Form.Get("redirect_uri") != "http://127.0.0.1:7964/oidc/callback" || base64.RawURLEncoding.EncodeToString(digest[:]) != challenge {
			t.Error("invalid token request or PKCE")
			w.WriteHeader(400)
			return
		}
		if rejectExchange {
			w.WriteHeader(503)
			return
		}
		tokenNonce := nonce
		if badNonce {
			tokenNonce = "different"
		}
		raw, _ := json.Marshal(map[string]any{"iss": providerURL, "sub": "test-subject", "aud": "fixture-client", "iat": time.Now().Unix(), "exp": time.Now().Add(time.Minute).Unix(), "nonce": tokenNonce})
		signed, _ := signer.Sign(raw)
		token, _ := signed.CompactSerialize()
		writeJSON(w, 200, map[string]any{"access_token": "fixture-access", "token_type": "Bearer", "id_token": token, "expires_in": 60})
	})
	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer fixture-access" {
			t.Error("userinfo lacks bearer token")
		}
		sub := "test-subject"
		if mismatchSubject {
			sub = "different-subject"
		}
		writeJSON(w, 200, map[string]string{"sub": sub, "name": "验收用户"})
	})
	provider := httptest.NewServer(mux)
	defer provider.Close()
	providerURL = provider.URL
	s.auth.dev = ""
	s.auth.issuer = providerURL
	s.auth.clientID = "fixture-client"
	s.auth.secret = "fixture-private"
	begin := func() (*http.Cookie, string) {
		login := request(s, "GET", "/login", "")
		if login.Code != 302 {
			t.Fatal(login.Code, login.Body.String())
		}
		location, _ := url.Parse(login.Header().Get("Location"))
		q := location.Query()
		nonce = q.Get("nonce")
		challenge = q.Get("code_challenge")
		if nonce == "" || challenge == "" || q.Get("code_challenge_method") != "S256" {
			t.Fatal("missing login binding")
		}
		for _, cookie := range login.Result().Cookies() {
			if cookie.Name == "qd_login_v2" {
				return cookie, q.Get("state")
			}
		}
		t.Fatal("missing browser state cookie")
		return nil, ""
	}
	callback := func(cookie *http.Cookie, state string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "http://127.0.0.1:7964/oidc/callback?code=fixture-code&state="+url.QueryEscape(state), nil)
		r.RemoteAddr = "127.0.0.1:1234"
		r.AddCookie(cookie)
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, r)
		return w
	}
	cookie, state := begin()
	result := callback(cookie, state)
	if result.Code != 303 || result.Header().Get("Location") != "/app" {
		t.Fatal("login failed", result.Code, result.Header(), result.Body.String())
	}
	if discoveryCount.Load() != 2 || tokenCount.Load() != 1 {
		t.Fatal("unexpected retry contract")
	}
	var session *http.Cookie
	for _, c := range result.Result().Cookies() {
		if c.Name == "qd_session_v2" {
			session = c
		}
	}
	if session == nil || !session.HttpOnly || session.SameSite != http.SameSiteLaxMode {
		t.Fatal("session cookie missing protection")
	}
	r := httptest.NewRequest("GET", "http://127.0.0.1:7964/api/me", nil)
	r.AddCookie(session)
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, r)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "验收用户") {
		t.Fatal("session cannot access API")
	}
	if callback(cookie, state).Header().Get("Location") != "/?auth_error=state" {
		t.Fatal("single-use authorization state reused")
	}
	badNonce = true
	cookie, state = begin()
	if callback(cookie, state).Header().Get("Location") != "/?auth_error=verification" {
		t.Fatal("bad nonce accepted")
	}
	badNonce = false
	mismatchSubject = true
	cookie, state = begin()
	if callback(cookie, state).Header().Get("Location") != "/?auth_error=userinfo" {
		t.Fatal("subject mismatch accepted")
	}
	cookie, state = begin()
	previous := tokenCount.Load()
	cancelled := httptest.NewRequest("GET", "http://127.0.0.1:7964/oidc/callback?error=access_denied&state="+url.QueryEscape(state), nil)
	cancelled.RemoteAddr = "127.0.0.1:1234"
	cancelled.AddCookie(cookie)
	cancelledResponse := httptest.NewRecorder()
	s.Handler().ServeHTTP(cancelledResponse, cancelled)
	if cancelledResponse.Header().Get("Location") != "/?auth_error=authorization" || tokenCount.Load() != previous {
		t.Fatal("cancelled authorization attempted token exchange")
	}
	mismatchSubject = false
	rejectExchange = true
	cookie, state = begin()
	before := tokenCount.Load()
	if callback(cookie, state).Header().Get("Location") != "/?auth_error=exchange" || tokenCount.Load() != before+1 {
		t.Fatal("authorization code exchange retried or failure hidden")
	}
	var sessions int
	s.store.db.QueryRow(`SELECT count(*) FROM qd_http_sessions`).Scan(&sessions)
	if sessions != 1 {
		t.Fatal("rejected authorization established a session")
	}
}

func TestOIDCFailureRedirectIsRetryableAndDoesNotExposeProviderBody(t *testing.T) {
	s := testServer(t)
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(503)
		w.Write([]byte("private-provider-diagnostic"))
	}))
	defer provider.Close()
	s.auth.issuer = provider.URL
	s.auth.dev = ""
	result := request(s, "GET", "/login", "")
	if result.Code != 303 || result.Header().Get("Location") != "/?auth_error=discovery" || strings.Contains(result.Body.String(), "private-provider-diagnostic") {
		t.Fatal("failure was not safe and retryable")
	}
	var sessions int
	s.store.db.QueryRow(`SELECT count(*) FROM qd_http_sessions`).Scan(&sessions)
	if sessions != 0 {
		t.Fatal("failed discovery created a session")
	}
}
