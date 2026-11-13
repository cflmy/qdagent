package main
import("bytes";"net";"net/http";"net/url";"testing")
func TestModelCredentialEncryption(t *testing.T){
 key:=bytes.Repeat([]byte{7},32);c,err:=modelSeal(key,"fixture-key","owner\nprofile")
 if err!=nil||c=="fixture-key"{t.Fatal("seal failed")}
 plain,err:=modelOpen(key,c,"owner\nprofile");if err!=nil||plain!="fixture-key"{t.Fatal("roundtrip failed")}
 if _,err=modelOpen(key,c,"other\nprofile");err==nil{t.Fatal("cross-owner credential opened")}
 c2,_:=modelSeal(key,"fixture-key","owner\nprofile");if c2==c{t.Fatal("nonce reused")}
}
func TestModelEndpointBoundary(t *testing.T){
 for _,s:=range []string{"http://api.example.com/v1","https://127.0.0.1/v1","https://169.254.169.254/x","https://[::1]/v1","https://user:secret@api.example.com/v1","https://api.example.com:8443/v1","https://api.example.com/v1?token=x"}{
  if _,err:=modelEndpoint(s);err==nil{t.Fatal("unsafe endpoint accepted",s)}
 }
 for _,s:=range []string{"10.0.0.1","172.16.0.1","192.168.0.1","100.64.0.1","198.18.0.1","::ffff:127.0.0.1","fc00::1","fe80::1","2002:7f00:1::"}{if modelPublicIP(net.ParseIP(s)){t.Fatal("nonpublic address accepted",s)}}
 if !modelPublicIP(net.ParseIP("8.8.8.8")){t.Fatal("public address denied")}
 if _,err:=modelEndpoint("https://api.example.com/v1");err!=nil{t.Fatal(err)}
 client:=modelHTTPClient();if client.CheckRedirect(&http.Request{URL:&url.URL{}},nil)!=http.ErrUseLastResponse{t.Fatal("redirects allowed")}
}
