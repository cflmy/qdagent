package oidc
import (
 "crypto"
 "crypto/rand"
 "crypto/rsa"
 "crypto/sha256"
 "encoding/base64"
 "encoding/json"
 "net/http"
 "net/http/httptest"
 "strings"
 "testing"
 "time"
)
func TestQdagentIDTokenBoundary(t *testing.T){
 key,err:=rsa.GenerateKey(rand.Reader,2048);if err!=nil{t.Fatal(err)}
 enc:=base64.RawURLEncoding.EncodeToString
 server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.URL.Path!="/.well-known/jwks.json"{t.Errorf("unexpected key path %s",r.URL.Path)}
  _=json.NewEncoder(w).Encode(map[string]any{"keys":[]any{map[string]any{"kid":"test","kty":"RSA","use":"sig","alg":"RS256","n":enc(key.N.Bytes()),"e":"AQAB"}}})
 }));defer server.Close()
 c:=Config{Issuer:server.URL,ClientID:"app"}
 claims:=func()map[string]any{return map[string]any{"iss":server.URL,"sub":"owner-a","aud":"app","nonce":"nonce","iat":time.Now().Unix(),"exp":time.Now().Unix()+300}}
 sign:=func(m map[string]any)string{
  h,_:=json.Marshal(map[string]any{"alg":"RS256","kid":"test"});p,_:=json.Marshal(m)
  msg:=enc(h)+"."+enc(p);sum:=sha256.Sum256([]byte(msg));sig,e:=rsa.SignPKCS1v15(rand.Reader,key,crypto.SHA256,sum[:]);if e!=nil{t.Fatal(e)};return msg+"."+enc(sig)
 }
 if sub,err:=c.VerifyIDToken(server.Client(),sign(claims()),"nonce");err!=nil||sub!="owner-a"{t.Fatalf("valid token failed: %s %v",sub,err)}
 for _,tc:=range []struct{name,key string;value any}{
  {"issuer","iss","https://other.invalid"},{"audience","aud","other-app"},{"expired","exp",time.Now().Unix()-10},{"future","iat",time.Now().Unix()+1000},{"nonce","nonce","other"},{"subject","sub",""},
 }{t.Run(tc.name,func(t *testing.T){m:=claims();m[tc.key]=tc.value;if _,e:=c.VerifyIDToken(server.Client(),sign(m),"nonce");e==nil{t.Fatal("invalid token accepted")}})}
 token:=sign(claims());parts:=strings.Split(token,".");parts[1]=enc([]byte(`{"iss":"evil","sub":"owner-b"}`))
 if _,err:=c.VerifyIDToken(server.Client(),strings.Join(parts,"."),"nonce");err==nil{t.Fatal("tampered token accepted")}
 if _,err:=c.VerifyIDToken(server.Client(),"eyJhbGciOiJub25lIn0.e30.","nonce");err==nil{t.Fatal("unsigned token accepted")}
 if !FreshLogin(float64(time.Now().Unix()))||FreshLogin(float64(time.Now().Unix()-1000))||FreshLogin(nil){t.Fatal("login age not enforced")}
}
