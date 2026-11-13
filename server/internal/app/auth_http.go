package app

import (
	"context"
	"crypto/x509"
	"errors"
	"log"
	"net"
	"net/http"
	"time"
)

// All OIDC requests share a bounded client. Only idempotent reads may retry;
// redeeming a single-use authorization code must never be retried here.
func newOIDCClient() *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.DialContext = (&net.Dialer{Timeout: 4 * time.Second, KeepAlive: 30 * time.Second}).DialContext
	transport.TLSHandshakeTimeout = 5 * time.Second
	transport.ResponseHeaderTimeout = 6 * time.Second
	transport.MaxIdleConnsPerHost = 4
	return &http.Client{Transport: oidcReadRetry{base: transport}, Timeout: 18 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 || req.URL.Scheme != via[0].URL.Scheme || req.URL.Host != via[0].URL.Host {
				return errors.New("OIDC endpoint redirect refused")
			}
			return nil
		},
	}
}

type oidcReadRetry struct{ base http.RoundTripper }

func (t oidcReadRetry) RoundTrip(req *http.Request) (*http.Response, error) {
	for attempt := 0; ; attempt++ {
		res, err := t.base.RoundTrip(req)
		retry := req.Method == http.MethodGet && attempt == 0 && req.Context().Err() == nil
		if err == nil {
			retry = retry && (res.StatusCode == 502 || res.StatusCode == 503 || res.StatusCode == 504)
		}
		if !retry {
			return res, err
		}
		if res != nil {
			res.Body.Close()
		}
		log.Printf("oidc read retry host=%s reason=%s", req.URL.Hostname(), oidcErrorClass(err))
		timer := time.NewTimer(180 * time.Millisecond)
		select {
		case <-req.Context().Done():
			timer.Stop()
			return nil, req.Context().Err()
		case <-timer.C:
		}
	}
}
func oidcErrorClass(err error) string {
	if err == nil {
		return "upstream_status"
	}
	if errors.Is(err, context.Canceled) {
		return "cancelled"
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "timeout"
	}
	var dns *net.DNSError
	if errors.As(err, &dns) {
		return "dns"
	}
	var cert x509.UnknownAuthorityError
	if errors.As(err, &cert) {
		return "tls_certificate"
	}
	var network net.Error
	if errors.As(err, &network) {
		if network.Timeout() {
			return "timeout"
		}
		return "network"
	}
	return "protocol"
}
func (a *auth) failure(w http.ResponseWriter, r *http.Request, stage string, err error) {
	// Neither raw OAuth response bodies nor callback codes/tokens enter logs or URLs.
	log.Printf("oidc failure stage=%s class=%s", stage, oidcErrorClass(err))
	w.Header().Set("Cache-Control", "no-store")
	http.Redirect(w, r, "/?auth_error="+stage, http.StatusSeeOther)
}
