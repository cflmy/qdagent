// qdagent ABI extension: strict OIDC validation; no application business logic.
package oidc

import (
 "crypto"
 "crypto/rsa"
 "crypto/sha256"
 "crypto/subtle"
 "encoding/base64"
 "encoding/json"
 "fmt"
 "io"
 "math/big"
 "net/http"
 "strings"
 "time"
)
type qdClaims struct {
 Issuer string `json:"iss"`
 Subject string `json:"sub"`
 Audience any `json:"aud"`
 AuthorizedParty string `json:"azp"`
 Expires int64 `json:"exp"`
 Issued int64 `json:"iat"`
 NotBefore int64 `json:"nbf"`
 Nonce string `json:"nonce"`
}
func FreshLogin(value any) bool {
 var issued int64
 switch v:=value.(type) {case int64:issued=v;case int:issued=int64(v);case float64:issued=int64(v);case json.Number:issued,_=v.Int64()}
 age:=time.Now().Unix()-issued
 return issued>0 && age>=-60 && age<=600
}
func(c Config) VerifyIDToken(client *http.Client, token, nonce string)(string,error){
 bad:=func(s string)(string,error){return "",fmt.Errorf("oidc id_token: %s",s)}
 if len(token)>65536 || nonce=="" {return bad("missing or excessive token/nonce")}
 parts:=strings.Split(token,".");if len(parts)!=3{return bad("invalid JWT")}
 decode:=base64.RawURLEncoding.DecodeString
 headerBytes,err:=decode(parts[0]);if err!=nil{return bad("invalid header")}
 var header struct{Alg string `json:"alg"`;Kid string `json:"kid"`}
 if json.Unmarshal(headerBytes,&header)!=nil || header.Alg!="RS256" || header.Kid=="" {return bad("only identified RS256 signing keys accepted")}
 payload,err:=decode(parts[1]);if err!=nil{return bad("invalid claims")}
 var claims qdClaims
 if json.Unmarshal(payload,&claims)!=nil{return bad("invalid claims")}
 now:=time.Now().Unix()
 if claims.Issuer!=strings.TrimRight(c.Issuer,"/") || claims.Subject=="" {return bad("issuer/subject mismatch")}
 if claims.Expires<=now || claims.Issued<=0 || claims.Issued>now+60 || claims.NotBefore>now+60{return bad("expired or invalid token time")}
 audiences:=[]string{}
 switch v:=claims.Audience.(type) {case string:audiences=append(audiences,v);case []any:for _,a:=range v {if s,ok:=a.(string);ok {audiences=append(audiences,s)}else{return bad("invalid audience")}};default:return bad("missing audience")}
 found:=false;for _,a:=range audiences {if a==c.ClientID{found=true}}
 if !found || len(audiences)>1&&claims.AuthorizedParty!=c.ClientID || claims.AuthorizedParty!=""&&claims.AuthorizedParty!=c.ClientID {return bad("audience/authorized party mismatch")}
 if subtle.ConstantTimeCompare([]byte(claims.Nonce),[]byte(nonce))!=1 {return bad("nonce mismatch")}
 if client==nil {client=&http.Client{Timeout:15*time.Second}}
 response,err:=client.Get(strings.TrimRight(c.Issuer,"/")+"/.well-known/jwks.json")
 if err!=nil{return bad("signing keys unavailable")}
 defer response.Body.Close()
 if response.StatusCode!=200{return bad("signing keys unavailable")}
 raw,err:=io.ReadAll(io.LimitReader(response.Body,1<<20));if err!=nil{return bad("invalid signing keys")}
 var jwks struct {Keys []struct {Kty string `json:"kty"`;Kid string `json:"kid"`;Use string `json:"use"`;Alg string `json:"alg"`;N string `json:"n"`;E string `json:"e"` } `json:"keys"`}
 if json.Unmarshal(raw,&jwks)!=nil{return bad("invalid signing keys")}
 var key *rsa.PublicKey
 for _,j:=range jwks.Keys {
  if j.Kid!=header.Kid || j.Kty!="RSA" || j.Use!=""&&j.Use!="sig" || j.Alg!=""&&j.Alg!="RS256" {continue}
  n,ne:=decode(j.N);e,ee:=decode(j.E)
  if ne!=nil||ee!=nil||len(e)==0||len(e)>4{return bad("invalid RSA key")}
  exponent:=0;for _,b:=range e{exponent=exponent*256+int(b)}
  modulus:=new(big.Int).SetBytes(n)
  if modulus.BitLen()<2048||exponent<3||exponent%2==0||exponent>2147483647||key!=nil{return bad("unsafe or ambiguous RSA key")}
  key=&rsa.PublicKey{N:modulus,E:exponent}
 }
 if key==nil{return bad("unknown signing key")}
 signature,err:=decode(parts[2]);if err!=nil{return bad("invalid signature")}
 digest:=sha256.Sum256([]byte(parts[0]+"."+parts[1]))
 if rsa.VerifyPKCS1v15(key,crypto.SHA256,digest[:],signature)!=nil{return bad("signature mismatch")}
 return claims.Subject,nil
}
