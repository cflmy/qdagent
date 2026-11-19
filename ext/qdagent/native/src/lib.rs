//! ABI-only OS gap: persistent NDJSON transfer across independent HTTP calls.
//! Prompt assembly, content accumulation and rendering remain in .mq.md.
use std::{ffi::c_char, fs, path::{Path,PathBuf},process::{Command,Stdio},time::{SystemTime,UNIX_EPOCH,Duration}};
use serde_json::{json,Value};
use marqdo_plugin_sdk::*;
mod agent_runtime;
mod document_bundle;
mod runtime;
mod browser;
fn root(args:&Value)->Result<PathBuf,String>{
 let r=PathBuf::from(args["root"].as_str().ok_or("root required")?).canonicalize().map_err(|e|e.to_string())?;
 fs::create_dir_all(r.join("data/dialogue/proj")).map_err(|e|e.to_string())?;Ok(r)
}
struct LifecycleLock(fs::File);
impl Drop for LifecycleLock {
 fn drop(&mut self){use std::os::fd::AsRawFd;unsafe {libc::flock(self.0.as_raw_fd(),libc::LOCK_UN);}}
}
fn lifecycle(r:&Path)->Result<LifecycleLock,String>{
 use std::os::fd::AsRawFd;
 let f=fs::OpenOptions::new().create(true).truncate(false).read(true).write(true).open(r.join("data/dialogue/proj/transport.lock")).map_err(|e|e.to_string())?;
 if unsafe {libc::flock(f.as_raw_fd(),libc::LOCK_EX)}!=0{return Err(std::io::Error::last_os_error().to_string())}
 Ok(LifecycleLock(f))
}
fn atomic(p:&Path,s:&str)->Result<(),String>{let tmp=p.with_extension(format!("pending.{}",std::process::id()));fs::write(&tmp,s).map_err(|e|e.to_string())?;fs::rename(tmp,p).map_err(|e|e.to_string())}
fn invocation(v:&Value)->Result<Value,String>{
 use std::{io::Write,sync::mpsc};
 let entry=v["entry"].as_str().ok_or("entry required")?;
 let member=v["member"].as_str().ok_or("member required")?;
 let root=PathBuf::from(v["root"].as_str().ok_or("root required")?).canonicalize().map_err(|e|e.to_string())?;
 let cwd=PathBuf::from(v["cwd"].as_str().ok_or("cwd required")?).canonicalize().map_err(|e|e.to_string())?;
 if !Path::new(entry).is_absolute()||!Path::new(entry).is_file()||!entry.ends_with(".mq.md"){return Err("installed Marqdo source required".into())}
 let effects=v["effects"].as_str().ok_or("trusted effects required")?;
 let argv=vec!["call".to_string(),entry.into(),member.into(),"--args-json".into(),"-".into(),"--fs-root".into(),root.to_string_lossy().into_owned(),"--effects".into(),effects.into(),"--json".into()];
 let mut command=Command::new("marqdo");
 command.args(&argv).current_dir(cwd).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
 // Inherit the workflow process group so cancellation reaches all nested calls.
 let mut child=command.spawn().map_err(|e|e.to_string())?;let pid=child.id();
 let args=v.get("arguments").cloned().unwrap_or_else(||json!({})).to_string();
 if let Some(mut stdin)=child.stdin.take(){stdin.write_all(args.as_bytes()).map_err(|e|e.to_string())?;}
 let (send,recv)=mpsc::channel();std::thread::spawn(move||{let _=send.send(child.wait_with_output());});
 let output=match recv.recv_timeout(Duration::from_secs(900)){Ok(value)=>value.map_err(|e|e.to_string())?,Err(_)=>{#[cfg(unix)]unsafe{libc::kill(pid as i32,libc::SIGKILL);}return Err("Marqdo call timeout".into())}};
 if output.stdout.len()>4*1024*1024||output.stderr.len()>1024*1024{return Err("Marqdo output exceeded limit".into())}
 Ok(json!({"argv":argv,"code":output.status.code().unwrap_or(-1),"stdout":String::from_utf8_lossy(&output.stdout),"stderr":String::from_utf8_lossy(&output.stderr)}))
}

fn dispatch(v:&Value)->Result<Value,String>{
 let op=v["operation"].as_str().ok_or("operation required")?;
 if op.starts_with("agent_"){return agent_runtime::dispatch(v)}
 if op.starts_with("runtime_"){return runtime::dispatch(v)}
 match op{
  "document_view"=>document_bundle::view(v),
  "call"=>invocation(v),
  _=>Err("unsupported agent v3 ABI operation".into())
 }
}
unsafe extern "C" fn request(args:*const c_char,out:*mut *mut c_char,err:*mut *mut c_char)->i32{
 let args=match parse_args(args){Ok(v)=>v,Err(e)=>{set_err(err,&e);return 1}};
 let v=args.get("request").unwrap_or(&args);
 let result=match dispatch(v){Ok(value)=>json!({"ok":true,"value":value,"error":null}),Err(message)=>json!({"ok":false,"value":null,"error":{"code":"qdagent.transport","message":message}})};
 set_out(out,&result.to_string());0
}
marqdo_plugin!(2,[("qdagent_transport","request",request)]);

