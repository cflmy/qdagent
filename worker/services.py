"""Bounded service wire adapters. No model prompts, tools or workflow decisions."""
import hashlib
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import ssl
import sys
from urllib.parse import urlencode, urlsplit

JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
MAX_FILE = 50 * 1024 * 1024
MAX_RESULT = 1024 * 1024


def exchange(url, method="GET", body=None, headers=None, maximum=MAX_RESULT):
    parsed = urlsplit(url)
    if parsed.username or parsed.password or parsed.fragment:
        raise ValueError("Invalid service URL")
    if parsed.scheme == "https":
        connection = http.client.HTTPSConnection(parsed.hostname, parsed.port or 443, timeout=20)
    elif parsed.scheme == "http" and parsed.hostname == "search" and parsed.port == 8080:
        connection = http.client.HTTPConnection("search", 8080, timeout=20)
    else:
        raise ValueError("Unsupported service destination")
    try:
        connection.request(method, parsed.path + ("?" + parsed.query if parsed.query else ""), body, headers or {})
        response = connection.getresponse()
        data = response.read(maximum + 1)
        if len(data) > maximum:
            raise ValueError("Service response exceeds size limit")
        if response.status != 200:
            # Never forward signed URLs, credentials or arbitrary provider bodies.
            raise ValueError("Service HTTP " + str(response.status))
        return data
    finally:
        connection.close()


def api(path="", body=None, headers=None):
    token = Path(os.environ["QDAGENT_OCR_TOKEN_FILE"]).read_text().strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,256}", token):
        raise ValueError("OCR credential is unavailable")
    response = json.loads(exchange(JOB_URL + path, "POST" if body is not None else "GET", body,
                                  {**(headers or {}), "Authorization": "Bearer " + token}))
    if response.get("code") != 0 or not isinstance(response.get("data"), dict):
        raise ValueError("OCR provider rejected the request (code " + str(response.get("code"))[:20] + ")")
    return response["data"]


def result_bytes(url):
    """Only Baidu BOS result objects, with pinned public IP and NO authorization."""
    parsed = urlsplit(url)
    if (parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".bcebos.com")
            or parsed.port not in (None, 443) or parsed.username or parsed.password or parsed.fragment):
        raise ValueError("Untrusted OCR result destination")
    addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(row[4][0]).is_global for row in addresses):
        raise ValueError("OCR result resolved to a non-public destination")
    family, socktype, proto, _, address = addresses[0]
    # Pin the checked address, preserving TLS hostname and certificate validation.
    connection = http.client.HTTPSConnection(parsed.hostname, timeout=20)
    raw = socket.socket(family, socktype, proto)
    raw.settimeout(20)
    try:
        raw.connect(address)
    except Exception:
        raw.close()
        raise
    connection.sock = ssl.create_default_context().wrap_socket(raw, server_hostname=parsed.hostname)
    try:
        connection.request("GET", parsed.path + ("?" + parsed.query if parsed.query else ""))
        response = connection.getresponse()
        if response.status != 200:
            raise ValueError("OCR result HTTP " + str(response.status))
        body = response.read(MAX_RESULT + 1)
        if len(body) > MAX_RESULT:
            raise ValueError("OCR result exceeds size limit")
        return body
    finally:
        connection.close()


def perform(request):
    operation = request["operation"]
    if operation == "search":
        query = request["query"].strip()
        if not query or len(query) > 500:
            raise ValueError("Search query must contain 1–500 characters")
        data = json.loads(exchange("http://search:8080/search?" + urlencode({"q": query, "format": "json", "safesearch": 1, "language": "zh-CN"})))
        results = []
        for row in data.get("results", []):
            url = str(row.get("url", ""))[:4096]
            parsed = urlsplit(url)
            if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
                continue
            results.append({"url": url, "title": str(row.get("title", ""))[:240],
                            "excerpt": re.sub("<[^>]*>", "", str(row.get("content", "")))[:800],
                            "engines": row.get("engines", [])[:5]})
            if len(results) == 8:
                break
        return {"query": query, "results": results, "unresponsive_engines": data.get("unresponsive_engines", [])[:8],
                "read": False, "provider": "self-hosted-searxng"}
    if operation == "ocr_submit":
        path = Path(request["file"])
        raw = path.read_bytes()
        if not raw or len(raw) > MAX_FILE:
            raise ValueError("OCR file must be nonempty and at most 50 MB")
        boundary = "qd-" + os.urandom(24).hex()
        # The untrusted original name never enters multipart headers.
        suffix = path.suffix.lower()
        if suffix not in (".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"):
            raise ValueError("OCR accepts PDF or image material")
        fields = {"model": "PaddleOCR-VL-1.5", "optionalPayload": '{"useDocOrientationClassify":false,"useDocUnwarping":false}'}
        chunks = []
        for key, value in fields.items():
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
        chunks.extend([f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="material{suffix}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode(), raw, f'\r\n--{boundary}--\r\n'.encode()])
        data = api(body=b"".join(chunks), headers={"Content-Type": "multipart/form-data; boundary=" + boundary})
        job = data.get("jobId", "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,160}", job):
            raise ValueError("Invalid OCR job identity")
        return {"job_id": job, "state": "pending", "sha256": hashlib.sha256(raw).hexdigest()}
    if operation == "ocr_poll":
        job = request["job_id"]
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,160}", job):
            raise ValueError("Invalid OCR job identity")
        data = api("/" + job)
        state = data.get("state")
        if state not in ("pending", "running", "done", "failed"):
            raise ValueError("Unknown OCR job state")
        result = {"job_id": job, "state": state}
        if state == "failed":
            # Provider error can contain material; bounded and never a model instruction.
            result["message"] = str(data.get("errorMsg", "OCR failed"))[:500]
        if state == "done":
            url = data.get("resultUrl", {}).get("jsonUrl")
            if not isinstance(url, str):
                raise ValueError("OCR result link is missing")
            raw = result_bytes(url).decode("utf-8")
            lines = [json.loads(line) for line in raw.splitlines() if line.strip()]
            pages = []
            for line in lines:
                if line.get("errorCode", 0) != 0:
                    raise ValueError("OCR page failed")
                value = line.get("result", line)
                if not isinstance(value, dict):
                    raise ValueError("Invalid OCR page result")
                pages.extend(value.get("layoutParsingResults", [value]))
            texts = []
            # Official async JSONL: one page result per line, prunedResult carries OCR fields.
            for page in pages:
                value = page
                if isinstance(value.get("markdown"), dict) and isinstance(value["markdown"].get("text"), str):
                    texts.append(value["markdown"]["text"])
                else:
                    value = value.get("prunedResult", value)
                    if isinstance(value.get("parsing_res_list"), list):
                        texts.append("\n\n".join(str(block.get("block_content", "")) for block in value["parsing_res_list"]))
                    elif isinstance(value.get("rec_texts"), list):
                        texts.append("\n".join(str(text) for text in value["rec_texts"]))
                    else:
                        raise ValueError("Unsupported OCR page result shape")
            text = "\n\n---\n\n".join(texts)
            if not text.strip() or len(text.encode()) > MAX_RESULT:
                raise ValueError("OCR returned empty or oversized text")
            result.update(text=text, pages=len(pages), raw=raw)
        return result
    raise ValueError("Unknown service transport")


if __name__ == "__main__":
    try:
        value = perform(json.loads(sys.stdin.buffer.read(8192)))
        print(json.dumps({"ok": True, "value": value}, ensure_ascii=False))
    except Exception as error:
        # Do not dump exception request objects, paths or API bodies.
        message = str(error) if isinstance(error, ValueError) else type(error).__name__ + ": service transport failed"
        print(json.dumps({"ok": False, "message": message[:600]}, ensure_ascii=False))
