package httpx
import (
 "net/http"
 "net/http/httptest"
 "testing"
 "strings"
 "github.com/marqdo/marqdo/plugins/web/internal/oidc"
 "github.com/marqdo/marqdo/plugins/web/internal/session"
)
func TestQdagentTrustedPrincipalAndOrigin(t *testing.T){
 session.Configure(session.Config{TTLSec:3600});session.Reset(3600)
 st:=state{oidc:oidc.Config{Issuer:"https://id.example",ClientID:"app",ClientSecret:"fixture-only",RedirectURI:"http://127.0.0.1:7964/oidc/callback",AuthorizeURL:"https://id.example/authorize",TokenURL:"https://id.example/token",UserInfoURL:"https://id.example/userinfo"}}
 id:=session.NewID(3600);session.SetValue(id,"role","user");session.SetValue(id,"username","fixture");session.SetValue(id,"oidc_sub","owner-a")
 r:=httptest.NewRequest(http.MethodGet,"http://127.0.0.1:7964/api/state?principal=owner-b",nil)
 r.Header.Set("Cookie","marqdo_sid="+id);payload:=map[string]any{"principal":"owner-b"}
 if !st.qdagentSubject(httptest.NewRecorder(),r,payload)||payload["principal"]!="https://id.example\nowner-a"{t.Fatal("request identity was spoofed")}
 r=httptest.NewRequest(http.MethodPost,"http://127.0.0.1:7964/api/plugins",nil);r.Header.Set("Cookie","marqdo_sid="+id)
 w:=httptest.NewRecorder();if st.qdagentSubject(w,r,map[string]any{})||w.Code!=403{t.Fatal("missing origin accepted")}
 r.Header.Set("Origin","https://evil.example");if st.qdagentSubject(httptest.NewRecorder(),r,map[string]any{}){t.Fatal("cross-origin mutation accepted")}
 r.Header.Set("Origin","http://127.0.0.1:7964");if !st.qdagentSubject(httptest.NewRecorder(),r,map[string]any{}){t.Fatal("same-origin mutation rejected")}
 r.Header.Del("Cookie");w=httptest.NewRecorder();if st.qdagentSubject(w,r,map[string]any{})||w.Code!=401{t.Fatal("anonymous request accepted")}
}

func TestQdagentDynamicLoginOrigins(t *testing.T){
 session.Configure(session.Config{TTLSec:3600});session.Reset(3600)
 c:=oidc.Config{Issuer:"https://id.example",ClientID:"app",ClientSecret:"fixture-only",RedirectURI:"/oidc/callback",RedirectOrigins:"https://agent.qdqc.com,http://127.0.0.1:7964,http://localhost:7964",AuthorizeURL:"https://id.example/authorize",TokenURL:"https://id.example/token",UserInfoURL:"https://id.example/userinfo"}
 st:=state{oidc:c};st.auth.sessionTTL=3600
 id:=session.NewID(3600);session.SetValue(id,"role","user");session.SetValue(id,"username","fixture");session.SetValue(id,"oidc_sub","owner-a")
 for _,tc:=range []struct{name,address,proto,host,origin,want string;secure bool}{
  {"local","http://127.0.0.1:7964/login","","","http://127.0.0.1:7964","http://127.0.0.1:7964/oidc/callback",false},
  {"localhost","http://localhost:7964/login","","","http://localhost:7964","http://localhost:7964/oidc/callback",false},
  {"proxy","http://127.0.0.1:7964/login","https","agent.qdqc.com","https://agent.qdqc.com","https://agent.qdqc.com/oidc/callback",true},
  {"direct_tls","https://agent.qdqc.com/login","","","https://agent.qdqc.com","https://agent.qdqc.com/oidc/callback",true},
 }{
  t.Run(tc.name,func(t *testing.T){
   r:=httptest.NewRequest(http.MethodGet,tc.address,nil)
   if tc.proto!=""{r.Header.Set("X-Forwarded-Proto",tc.proto);r.Header.Set("X-Forwarded-Host",tc.host)}
   callback,err:=c.ResolveRedirectURI(r);if err!=nil||callback!=tc.want{t.Fatalf("callback %q %v",callback,err)}
   cookie:=st.qdagentCookie(id,callback)
   if strings.Contains(cookie,"; Secure")!=tc.secure||!strings.Contains(cookie,"HttpOnly")||!strings.Contains(cookie,"SameSite=Lax"){t.Fatalf("incorrect cookie policy %q",cookie)}
   r.Method=http.MethodPost;r.URL.Path="/api/plugins";r.Header.Set("Cookie","marqdo_sid="+id);r.Header.Set("Origin",tc.origin)
   payload:=map[string]any{"principal":"spoofed"}
   if !st.qdagentSubject(httptest.NewRecorder(),r,payload)||payload["principal"]!="https://id.example\nowner-a"{t.Fatal("valid origin/principal rejected")}
   r.Header.Set("Origin","https://evil.invalid")
   if st.qdagentSubject(httptest.NewRecorder(),r,map[string]any{}){t.Fatal("foreign origin accepted")}
  })
 }
 for _,address:=range []string{"https://evil.invalid/login","http://agent.qdqc.com/login"}{
  r:=httptest.NewRequest(http.MethodGet,address,nil)
  if _,err:=c.ResolveRedirectURI(r);err==nil{t.Fatal("unapproved callback origin accepted")}
 }
 r:=httptest.NewRequest(http.MethodPost,"http://127.0.0.1:7964/api/plugins",nil)
 r.Header.Set("Cookie","marqdo_sid="+id);r.Header.Set("Origin","https://agent.qdqc.com")
 if st.qdagentSubject(httptest.NewRecorder(),r,map[string]any{}){t.Fatal("another allowlisted entry is not the same origin")}
}
