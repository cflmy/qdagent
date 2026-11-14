//! Private browser transport. Public operations and persistence live in .mq.md.
use std::{io::{Read,Write},net::{TcpStream,ToSocketAddrs},time::Duration};
use serde_json::{Value,json};
pub fn open(url:&str)->Result<Value,String>{
 if url.len()>4096{return Err("browser URL exceeds bound".into())}
 let endpoint=std::env::var("QDAGENT_BROWSER_URL").unwrap_or_else(|_|"http://browser-sandbox:7318".into());
 let host=endpoint.strip_prefix("http://").ok_or("private browser HTTP endpoint required")?.trim_end_matches('/');
 if host.contains('/')||host.contains('@')||host.contains('\r')||host.contains('\n'){return Err("invalid private browser endpoint".into())}
 let address=host.to_socket_addrs().map_err(|e|e.to_string())?.next().ok_or("browser service address unavailable")?;
 let key_path=std::env::var("QDAGENT_BROWSER_KEY_FILE").map_err(|_|"browser service secret is not configured")?;
 let key=std::fs::read_to_string(key_path).map_err(|_|"browser service secret unavailable")?;let key=key.trim();
 if key.len()<32||!key.bytes().all(|b|b.is_ascii_hexdigit()){return Err("invalid browser service credential".into())}
 let body=json!({"url":url}).to_string();
 let mut stream=TcpStream::connect_timeout(&address,Duration::from_secs(5)).map_err(|_|"browser sandbox is not available")?;
 stream.set_read_timeout(Some(Duration::from_secs(65))).map_err(|e|e.to_string())?;stream.set_write_timeout(Some(Duration::from_secs(10))).map_err(|e|e.to_string())?;
 let header=format!("POST /open HTTP/1.1\r\nHost: {host}\r\nAuthorization: Bearer {key}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",body.len());
 stream.write_all(header.as_bytes()).and_then(|_|stream.write_all(body.as_bytes())).map_err(|_|"browser request failed")?;
 let mut bytes=vec![];stream.take(5*1024*1024+1).read_to_end(&mut bytes).map_err(|_|"browser response failed")?;
 if bytes.len()>5*1024*1024{return Err("browser response exceeds bound".into())}
 let split=bytes.windows(4).position(|x|x==b"\r\n\r\n").ok_or("invalid browser response")?;
 let response:Value=serde_json::from_slice(&bytes[split+4..]).map_err(|_|"invalid browser response body")?;
 if response["ok"]!=true{return Err(response["message"].as_str().unwrap_or("browser operation failed").to_string())}
 Ok(response)
}
