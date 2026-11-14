import http.server
import json
import threading
import time
import unittest
from unittest.mock import patch
import provider as agent

class AgentTests(unittest.TestCase):
    def test_custom_model_cannot_access_local_network(self):
        for address in ('http://example.com','https://127.0.0.1','https://localhost','https://224.0.0.1'):
            with self.assertRaises(RuntimeError):
                agent.connection({'protocol':'openai','endpoint':address})

    def test_ollama_passes_document_messages_verbatim_and_streams_text(self):
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                length=int(self.headers['Content-Length']);body=json.loads(self.rfile.read(length))
                self.server.payload=body
                self.send_response(200);self.send_header('Content-Type','application/x-ndjson');self.end_headers()
                for part in ({'message':{'content':'第一段'}},{'message':{'content':'第二段'}}):
                    self.wfile.write((json.dumps(part)+'\n').encode());self.wfile.flush();time.sleep(.08)
            def log_message(self,*args): pass
        server=http.server.HTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();events=[]
        try:
            with patch.object(agent,'emit',side_effect=lambda kind,**data:events.append((kind,data,time.monotonic()))):
                result=agent.stream_model({'protocol':'ollama','model':'fixture','builtin':True,'endpoint':f'http://127.0.0.1:{server.server_port}'},[{'role':'user','content':'wire fixture'}])
            self.assertEqual(server.payload['messages'],[{'role':'user','content':'wire fixture'}]);self.assertEqual(result[0],'第一段第二段');self.assertNotIn('tools',server.payload)
            self.assertEqual(server.payload['options']['num_ctx'],32768);self.assertTrue(server.payload['stream']);self.assertGreaterEqual(len([x for x in events if x[0]=='text_delta']),2)
        finally: server.shutdown();server.server_close();thread.join()


if __name__=='__main__':unittest.main()
