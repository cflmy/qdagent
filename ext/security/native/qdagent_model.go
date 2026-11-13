package main

/*
#cgo CFLAGS: -I${SRCDIR}/abi
#include "marqdo_abi_cgo.h"
*/
import "C"

import (
 "context"
 "crypto/aes"
 "crypto/cipher"
 "crypto/rand"
 "crypto/tls"
 "encoding/base64"
 "encoding/hex"
 "fmt"
 "io"
 "net"
 "net/http"
 "net/netip"
 "net/url"
 "os"
 "path/filepath"
 "strings"
 "time"
)

func modelCipher(key []byte) (cipher.AEAD,error) {
 block,err:=aes.NewCipher(key);if err!=nil{return nil,err};return cipher.NewGCM(block)
}
func modelSeal(key []byte,value,aad string)(string,error){
 g,err:=modelCipher(key);if err!=nil{return "",err}
 nonce:=make([]byte,g.NonceSize());if _,err=rand.Read(nonce);err!=nil{return "",err}
 out:=g.Seal(nonce,nonce,[]byte(value),[]byte(aad));return base64.StdEncoding.EncodeToString(out),nil
}
func modelOpen(key []byte,value,aad string)(string,error){
 g,err:=modelCipher(key);if err!=nil{return "",err}
 raw,err:=base64.StdEncoding.DecodeString(value);if err!=nil||len(raw)<g.NonceSize(){return "",fmt.Errorf("invalid encrypted credential")}
 plain,err:=g.Open(nil,raw[:g.NonceSize()],raw[g.NonceSize():],[]byte(aad))
 if err!=nil{return "",fmt.Errorf("credential authentication failed")};return string(plain),nil
}
func modelMasterKey()([]byte,error){
 path:=os.Getenv("QDAGENT_MODEL_KEY_FILE");if path==""{if ext:=os.Getenv("MARQDO_EXT");ext!=""{path=filepath.Join(filepath.Dir(ext),".marqdo/secrets/model_key")}else{path=".marqdo/secrets/model_key"}}
 raw,err:=os.ReadFile(path);if err!=nil{return nil,fmt.Errorf("model encryption key unavailable")}
 key,err:=hex.DecodeString(strings.TrimSpace(string(raw)));if err!=nil||len(key)!=32{return nil,fmt.Errorf("invalid model encryption key")};return key,nil
}

//export qdagent_model_secret
func qdagent_model_secret(argsJSON *C.char,outJSON **C.char,errMsg **C.char) C.int {
 args,err:=parseArgs(argsJSON);if err!=nil{return replyJSON(outJSON,errMsg,nil,err)}
 key,err:=modelMasterKey();if err!=nil{return replyJSON(outJSON,errMsg,nil,err)}
 op,_:=argStr(args,"operation");value,_:=argStr(args,"value");owner,_:=argStr(args,"owner");id,_:=argStr(args,"id")
 if owner==""||id==""||len(value)>16384{return replyJSON(outJSON,errMsg,nil,fmt.Errorf("invalid credential scope"))}
 var out string
 if op=="seal"{out,err=modelSeal(key,value,owner+"\n"+id)}else if op=="open"{out,err=modelOpen(key,value,owner+"\n"+id)}else{err=fmt.Errorf("unknown credential operation")}
 return replyJSON(outJSON,errMsg,out,err)
}

func modelPublicIP(ip net.IP)bool{
 a,ok:=netip.AddrFromSlice(ip);if !ok{return false};a=a.Unmap()
 if !a.IsGlobalUnicast()||a.IsPrivate()||a.IsLoopback()||a.IsLinkLocalUnicast(){return false}
 blocked:=[]string{"0.0.0.0/8","100.64.0.0/10","192.0.0.0/24","192.0.2.0/24","198.18.0.0/15","198.51.100.0/24","203.0.113.0/24","240.0.0.0/4","2001:db8::/32","2001::/32","2002::/16","64:ff9b::/96"}
 for _,p:=range blocked{if netip.MustParsePrefix(p).Contains(a){return false}};return true
}
func modelEndpoint(raw string)(*url.URL,error){
 u,err:=url.Parse(raw)
 if err!=nil||u.Scheme!="https"||u.Hostname()==""||u.User!=nil||u.RawQuery!=""||u.Fragment!=""||(u.Port()!=""&&u.Port()!="443"){
  return nil,fmt.Errorf("custom endpoint requires public HTTPS on port 443, without userinfo, query or fragment")
 }
 if ip:=net.ParseIP(u.Hostname());ip!=nil&&!modelPublicIP(ip){return nil,fmt.Errorf("private model endpoint forbidden")}
 return u,nil
}
func modelDial(ctx context.Context,network,address string)(net.Conn,error){
 host,port,err:=net.SplitHostPort(address);if err!=nil{return nil,fmt.Errorf("invalid model address")}
 ips,err:=net.DefaultResolver.LookupIP(ctx,"ip",host);if err!=nil||len(ips)==0{return nil,fmt.Errorf("model DNS unavailable")}
 for _,ip:=range ips{if !modelPublicIP(ip){return nil,fmt.Errorf("private model address forbidden")}}
 // Resolve once, validate every answer, and dial that exact validated address.
 // HTTP proxies and redirects are disabled; TLS still verifies the URL hostname.
 dialer:=net.Dialer{Timeout:15*time.Second}
 for _,ip:=range ips{conn,e:=dialer.DialContext(ctx,network,net.JoinHostPort(ip.String(),port));if e==nil{return conn,nil}}
 return nil,fmt.Errorf("model connection failed")
}
func modelHTTPClient()*http.Client{
 return &http.Client{
  Timeout:180*time.Second,
  Transport:&http.Transport{Proxy:nil,DialContext:modelDial,TLSClientConfig:&tls.Config{MinVersion:tls.VersionTLS12},TLSHandshakeTimeout:15*time.Second,ResponseHeaderTimeout:150*time.Second,DisableKeepAlives:true},
  CheckRedirect:func(req *http.Request,via []*http.Request)error{return http.ErrUseLastResponse},
 }
}

//export qdagent_model_http
func qdagent_model_http(argsJSON *C.char,outJSON **C.char,errMsg **C.char) C.int{
 args,err:=parseArgs(argsJSON);if err!=nil{return replyJSON(outJSON,errMsg,nil,err)}
 address,_:=argStr(args,"url");body,_:=argStr(args,"body");key,_:=argStr(args,"api_key")
 u,err:=modelEndpoint(address);if err!=nil{return replyJSON(outJSON,errMsg,nil,err)}
 if len(body)>1<<20||len(key)>8192||strings.ContainsAny(key,"\r\n"){return replyJSON(outJSON,errMsg,nil,fmt.Errorf("model request too large or invalid credential"))}
 req,err:=http.NewRequest("POST",u.String(),strings.NewReader(body));if err!=nil{return replyJSON(outJSON,errMsg,nil,fmt.Errorf("invalid model request"))}
 req.Header.Set("Content-Type","application/json");if key!=""{req.Header.Set("Authorization","Bearer "+key)}
 response,err:=modelHTTPClient().Do(req);if err!=nil{return replyJSON(outJSON,errMsg,nil,fmt.Errorf("model HTTPS request failed"))};defer response.Body.Close()
 raw,err:=io.ReadAll(io.LimitReader(response.Body,(4<<20)+1));if err!=nil||len(raw)>4<<20{return replyJSON(outJSON,errMsg,nil,fmt.Errorf("model response exceeds four MiB"))}
 // Provider bodies can echo request data. Error responses never enter logs.
 if response.StatusCode!=200{return replyJSON(outJSON,errMsg,map[string]any{"status":response.StatusCode,"body":""},nil)}
 return replyJSON(outJSON,errMsg,map[string]any{"status":response.StatusCode,"body":string(raw)},nil)
}
