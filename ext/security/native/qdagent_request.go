// qdagent ABI extension: trusted identity and allowlisted dynamic login origins.
package httpx
import (
 "net/http"
 "net/url"
 "strings"
 "github.com/marqdo/marqdo/plugins/web/internal/session"
)
func(st *state) qdagentSubject(w http.ResponseWriter,r *http.Request,payload map[string]any)bool{
 if !st.oidcEnabled() || !strings.HasPrefix(r.URL.Path,"/api/"){return true}
 sid,ok:=session.IDFromCookie(r.Header.Get("Cookie"))
 subject,_:=session.GetValue(sid,"oidc_sub");sub,_:=subject.(string)
 if !ok||sub==""||session.RoleFromCookie(r.Header.Get("Cookie"))=="visitor"{jsonErr(w,http.StatusUnauthorized,"authentication required");return false}
 callback,resolveErr:=st.oidc.ResolveRedirectURI(r)
 expected,parseErr:=url.Parse(callback)
 if resolveErr!=nil || parseErr!=nil || expected.Scheme=="" || expected.Host=="" {
  jsonErr(w,http.StatusForbidden,"login origin not allowed");return false
 }
 if r.Method!=http.MethodGet && r.Method!=http.MethodHead {
  if !strings.EqualFold(r.Header.Get("Origin"),expected.Scheme+"://"+expected.Host) {
   jsonErr(w,http.StatusForbidden,"same-origin mutation required");return false
  }
 }
 // Always overwrite untrusted query/body values; never forward cookies or credentials.
 payload["principal"]=strings.TrimRight(st.oidc.Issuer,"/")+"\n"+sub
 return true
}
func(st *state) qdagentCookie(id,callback string)string{
 target,err:=url.Parse(callback)
 secure:=err==nil && strings.EqualFold(target.Scheme,"https")
 return session.SessionCookie(id,st.auth.sessionTTL,secure)
}
