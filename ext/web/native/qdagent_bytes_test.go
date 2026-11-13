package httpx
import ("encoding/base64";"net/http/httptest";"strings";"testing")
func TestQdagentBytes(t *testing.T){
 good:=func()map[string]any{return map[string]any{"ok":true,"filename":"document.docx","content_type":"application/octet-stream","data":map[string]any{"_type":"bytes","base64":base64.StdEncoding.EncodeToString([]byte{0,1,255,80,75})}}}
 w:=httptest.NewRecorder();writeQdagentBytes(w,good())
 if w.Code!=200 || w.Body.String()!=string([]byte{0,1,255,80,75}) || !strings.Contains(w.Header().Get("Content-Disposition"),"attachment"){t.Fatal(w)}
 for _,change:=range []func(map[string]any){
 func(m map[string]any){m["ok"]=false},
 func(m map[string]any){m["filename"]="../secret"},
 func(m map[string]any){m["filename"]="a\r\nX: y"},
 func(m map[string]any){m["content_type"]="text/plain\r\nX: y"},
 func(m map[string]any){m["data"]=map[string]any{"_type":"bytes","base64":"%%%"}},
 func(m map[string]any){m["data"]=map[string]any{"_type":"bytes","base64":strings.Repeat("A",1400001)}},
 } {m:=good();change(m);w:=httptest.NewRecorder();writeQdagentBytes(w,m);if w.Code==200 {t.Fatal("invalid bytes accepted")}}
}
