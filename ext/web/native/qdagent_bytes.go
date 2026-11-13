package httpx

// Generic ABI transport only: owner checks and file reads stay in Marqdo.
import (
 "encoding/base64"
 "mime"
 "net/http"
 "strings"
)

func writeQdagentBytes(w http.ResponseWriter, value any) {
 record,ok:=value.(map[string]any)
 if !ok || record["ok"]!=true {jsonErr(w,http.StatusNotFound,"artifact unavailable");return}
 data,ok:=record["data"].(map[string]any)
 if !ok || data["_type"]!="bytes" {jsonErr(w,http.StatusBadGateway,"invalid bytes record");return}
 encoded,ok:=data["base64"].(string)
 if !ok || len(encoded)>1400000 {jsonErr(w,http.StatusBadGateway,"artifact exceeds response limit");return}
 body,err:=base64.StdEncoding.Strict().DecodeString(encoded)
 if err!=nil || len(body)>1048576 {jsonErr(w,http.StatusBadGateway,"invalid artifact bytes");return}
 ct,_:=record["content_type"].(string)
 typ,params,err:=mime.ParseMediaType(ct)
 if err!=nil || strings.ContainsAny(ct,"\r\n") {jsonErr(w,http.StatusBadGateway,"invalid artifact content type");return}
 name,_:=record["filename"].(string)
 if name=="" || len(name)>200 || strings.ContainsAny(name,"/\\\r\n\x00") {jsonErr(w,http.StatusBadGateway,"invalid artifact filename");return}
 w.Header().Set("Content-Type",mime.FormatMediaType(typ,params))
 w.Header().Set("Content-Disposition",mime.FormatMediaType("attachment",map[string]string{"filename":name}))
 w.Header().Set("Cache-Control","private, no-store")
 w.Header().Set("X-Content-Type-Options","nosniff")
 w.Header().Set("Content-Security-Policy","sandbox")
 w.WriteHeader(http.StatusOK)
 _,_=w.Write(body)
}
