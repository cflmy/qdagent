"""Provider wire transport only. Messages arrive verbatim from a Marqdo document.
No prompts, tool descriptions, function selection or business transitions live here.
"""
import http.client
import ipaddress
import json
import re
import socket
import ssl
import sys
import time
from urllib.parse import urlsplit
MAX_REPLY=512*1024

def emit(kind,**data):
 print(json.dumps({'kind':kind,'data':data},ensure_ascii=False),flush=True)

class PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, hostname: str, address: str):
        super().__init__(hostname, port=443, timeout=180)
        self.address = address

    def connect(self):
        raw = socket.create_connection((self.address, 443), timeout=self.timeout)
        self.sock = ssl.create_default_context().wrap_socket(raw, server_hostname=self.host)


def connection(config: dict):
    endpoint = config['endpoint'].rstrip('/')
    protocol = config['protocol']
    suffix = '/api/chat' if protocol == 'ollama' else '/chat/completions'
    if not endpoint.endswith(suffix):
        endpoint += suffix
    url = urlsplit(endpoint)
    if config.get('builtin'):
        # Only the administrator-selected Ollama address can use an internal network.
        if protocol != 'ollama' or url.scheme not in ('http', 'https') or url.username or url.password:
            raise RuntimeError('内置模型地址无效')
        cls = http.client.HTTPSConnection if url.scheme == 'https' else http.client.HTTPConnection
        conn = cls(url.hostname, url.port, timeout=180)
    else:
        if url.scheme != 'https' or not url.hostname or url.port not in (None, 443) or url.username or url.password or url.query or url.fragment:
            raise RuntimeError('自定义模型必须使用公开 HTTPS 地址')
        addresses = list(dict.fromkeys(x[4][0] for x in socket.getaddrinfo(url.hostname, 443, type=socket.SOCK_STREAM)))
        if not addresses or any(not ipaddress.ip_address(x).is_global or ipaddress.ip_address(x).is_multicast or ipaddress.ip_address(x).is_reserved for x in addresses):
            raise RuntimeError('自定义模型地址不能指向内网或保留地址')
        conn = PinnedHTTPS(url.hostname, addresses[0])
    return conn, url.path or '/'


def stream_model(config, messages, emit_event=None):
    """Use provider-native SSE/NDJSON. No intermediary simulated typing."""
    output_event = emit_event or emit
    conn, path = connection(config)
    payload = {'model': config['model'], 'messages': messages, 'stream': True}
    if config['protocol'] == 'ollama':
        payload['think'] = bool(config.get('thinking'))
        # Root guides, contracts and real tool receipts exceed Ollama's 4K default.
        payload['options'] = {'num_ctx':32768}
    headers = {'Content-Type': 'application/json', 'Accept': 'text/event-stream'}
    if config.get('api_key'):
        headers['Authorization'] = 'Bearer ' + config['api_key']
    content, reasoning, calls, buffered, last_flush = '', '', {}, '', 0.0
    try:
        conn.request('POST', path, json.dumps(payload).encode(), headers)
        response = conn.getresponse()
        if response.status != 200:
            # Do not publish arbitrary provider bodies that may echo a credential.
            detail = ''
            try:
                problem = json.loads(response.read(16384))
                error = problem.get('error', {})
                message = error.get('message', '') if isinstance(error, dict) else error if isinstance(error, str) else ''
                if not message and isinstance(problem.get('message'), str):
                    message = problem['message']
                if isinstance(message, str):
                    if 'ExceededBudget' in message: message = '模型服务预算已用尽，请选择其他模型或联系服务管理员。'
                    secret = config.get('api_key', '')
                    if secret: message = message.replace(secret, '[redacted]')
                    message = re.sub(r'(?i)bearer\s+\S+|sk-[a-zA-Z0-9_-]{8,}', '[redacted]', message)
                    # Publish the selected diagnostic only, never request/body/header objects.
                    detail = '（' + message[:300] + '）' if message else ''
            except (ValueError, OSError, AttributeError):
                pass
            raise RuntimeError('模型接口 HTTP ' + str(response.status) + detail)
        while True:
            raw = response.readline(1 << 20)
            if not raw:
                break
            if len(raw) >= 1 << 20:
                raise RuntimeError('模型事件过大')
            line = raw.decode('utf-8', errors='replace').strip()
            if not line or line.startswith(':') or line == 'data: [DONE]':
                continue
            if line.startswith('data:'):
                line = line[5:].strip()
            try:
                item = json.loads(line)
            except ValueError:
                continue
            if item.get('error'):
                raise RuntimeError('模型接口返回错误')
            delta = item.get('message', {})
            if config['protocol'] != 'ollama':
                choices = item.get('choices', [])
                if not choices:
                    continue
                delta = choices[0].get('delta') or choices[0].get('message') or {}
            text = delta.get('content') or ''
            thought = delta.get('reasoning_content') or delta.get('reasoning') or delta.get('thinking') or ''
            if isinstance(thought, str) and thought:
                reasoning += thought
                if len(reasoning) > MAX_REPLY:
                    raise RuntimeError('模型解释文本超过上限')
                output_event('reasoning_delta', text=thought)
            if isinstance(text, str) and text:
                content += text
                buffered += text
                if len(content) > MAX_REPLY:
                    raise RuntimeError('模型输出超过上限')
                if len(buffered) >= 128 or time.monotonic() - last_flush >= .035:
                    output_event('text_delta', text=buffered)
                    buffered, last_flush = '', time.monotonic()
            if delta.get('tool_calls'):
                raise RuntimeError('unexpected provider tool_calls; Marqdo source response required')
        if buffered:
            output_event('text_delta', text=buffered)
    finally:
        conn.close()
    return content, reasoning


if __name__=='__main__':
 try:
  request=json.load(sys.stdin)
  text,reasoning=stream_model(request['model'],request['messages'])
  emit('response',text=text)
 except Exception as error:
  public=str(error) if isinstance(error,RuntimeError) else 'provider transport failed'
  emit('transport_error',message=public[:400]);sys.exit(1)
