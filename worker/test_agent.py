import http.server
import json
import threading
import time
import unittest
from unittest.mock import patch
import agent

class AgentTests(unittest.TestCase):
    def test_arguments_are_objects(self):
        self.assertEqual(agent.parse_arguments('{"path":"a.md"}'), {'path':'a.md'})
        for raw in ('[]','null','"command"'):
            with self.assertRaises(ValueError): agent.parse_arguments(raw)

    def test_custom_model_cannot_access_local_network(self):
        for address in ('http://example.com','https://127.0.0.1','https://localhost','https://224.0.0.1'):
            with self.assertRaises(RuntimeError):
                agent.connection({'protocol':'openai','endpoint':address})

    def test_ollama_incremental_text_and_tool_arguments(self):
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                length=int(self.headers['Content-Length']);body=json.loads(self.rfile.read(length))
                self.server.payload=body
                self.send_response(200);self.send_header('Content-Type','application/x-ndjson');self.end_headers()
                for part in ({'message':{'content':'第一段'}},{'message':{'content':'第二段','tool_calls':[{'function':{'name':'read_file','arguments':{'path':'a.md'}}}]}}):
                    self.wfile.write((json.dumps(part)+'\n').encode());self.wfile.flush();time.sleep(.08)
            def log_message(self,*args): pass
        server=http.server.HTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();events=[]
        try:
            with patch.object(agent,'emit',side_effect=lambda kind,**data:events.append((kind,data,time.monotonic()))):
                result=agent.stream_model({'protocol':'ollama','model':'fixture','builtin':True,'endpoint':f'http://127.0.0.1:{server.server_port}'},[{'role':'user','content':'hi'}],[])
            self.assertEqual(result[0],'第一段第二段');self.assertEqual(result[2][0]['function']['name'],'read_file')
            self.assertEqual(json.loads(result[2][0]['function']['arguments']),{'path':'a.md'})
            self.assertTrue(server.payload['stream']);self.assertGreaterEqual(len([x for x in events if x[0]=='text_delta']),2)
        finally: server.shutdown();server.server_close();thread.join()


class ProviderProjectionTests(unittest.TestCase):
    def test_ollama_arguments_are_objects_and_tool_name_is_preserved(self):
        original=[{'role':'assistant','content':None,'tool_calls':[{'id':'call-1','type':'function','function':{'name':'read_file','arguments':'{"path":"a.md"}'}}]}, {'role':'tool','name':'read_file','tool_call_id':'call-1','content':'observed'}]
        wire=agent.provider_messages('ollama',original)
        self.assertEqual(wire[0]['content'],'')
        self.assertEqual(wire[0]['tool_calls'][0]['function']['arguments'],{'path':'a.md'})
        self.assertEqual(wire[1]['tool_name'],'read_file')
        self.assertIsInstance(original[0]['tool_calls'][0]['function']['arguments'],str)
    def test_provider_array_items_do_not_modify_executor_contract(self):
        spec={'id':'plan_task','description':'plan','input_schema':{'type':'object','properties':{'steps':{'type':'array'}}}}
        projection=agent.tool_descriptors([spec])
        self.assertEqual(projection[0]['function']['parameters']['properties']['steps']['items'],{'type':'string'})
        self.assertNotIn('items',spec['input_schema']['properties']['steps'])


class CompletionTests(unittest.TestCase):
    def test_failed_tools_never_report_success(self):
        from tempfile import TemporaryDirectory
        from pathlib import Path
        with TemporaryDirectory() as folder:
            plan = Path(folder) / 'plan.json'
            self.assertEqual(agent.completion_status(3, {'write_file'}, plan), 'incomplete')
            self.assertEqual(agent.completion_status(2, set(), plan), 'succeeded')
            self.assertEqual(agent.completion_status(0, set(), plan), 'answer_only')
            plan.write_text('{"steps":[{"status":"pending"}]}')
            self.assertEqual(agent.completion_status(2, set(), plan), 'incomplete')

if __name__=='__main__': unittest.main()
