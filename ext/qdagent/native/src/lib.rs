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
fn stop(r:&Path)->Result<(),String>{
 let d=r.join("data/dialogue/proj");
 atomic(&d.join("transport.id"),"stopped")?;
 if let Ok(raw)=fs::read_to_string(d.join("transport.pid")){
  let pid:u32=raw.trim().parse().map_err(|_|"invalid transport pid")?;
  let cmd=fs::read(format!("/proc/{pid}/cmdline")).unwrap_or_default();
  let expected=d.join("_stream_raw.ndjson").to_string_lossy().into_owned();
  let executable=cmd.split(|b|*b==0).next().unwrap_or_default();
  let is_curl=Path::new(std::str::from_utf8(executable).unwrap_or("")).file_name().is_some_and(|n|n=="curl");
  let entry=fs::read_to_string(d.join("transport.entry")).unwrap_or_default();
  let is_task=Path::new(std::str::from_utf8(executable).unwrap_or("")).file_name().is_some_and(|n|n=="marqdo")
   && !entry.is_empty() && cmd.split(|b|*b==0).any(|a|a==entry.as_bytes())
   && cmd.split(|b|*b==0).any(|a|a==r.to_string_lossy().as_bytes());
  if is_task {
   #[cfg(unix)] unsafe {libc::kill(-(pid as i32),libc::SIGTERM);}
   for _ in 0..100 {if !Path::new(&format!("/proc/{pid}")).exists(){break;}std::thread::sleep(Duration::from_millis(10));}
   if Path::new(&format!("/proc/{pid}")).exists(){
    #[cfg(unix)] unsafe{libc::kill(-(pid as i32),libc::SIGKILL);}
   }
  }
  if is_curl && cmd.split(|b|*b==0).any(|a|a==expected.as_bytes()) {
   #[cfg(unix)] unsafe {libc::kill(pid as i32,libc::SIGTERM);}
   for _ in 0..100 {if !Path::new(&format!("/proc/{pid}")).exists(){break;}std::thread::sleep(Duration::from_millis(10));}
  }
 }
 atomic(&d.join("done.flag"),"stopped")?;Ok(())
}
fn control(r:&Path,v:&Value)->Result<Value,String>{
 use std::{os::fd::AsRawFd,io::Write,sync::mpsc};
 let entry=v["entry"].as_str().ok_or("entry required")?;
 let member=v["member"].as_str().ok_or("member required")?;
 if !["begin","poll","stop","view","manual"].contains(&member){return Err("unknown session control member".into())}
 if !Path::new(entry).is_file()||!entry.ends_with("/agent/runner.mq.md"){return Err("installed runner entry required".into())}
 let lock=fs::OpenOptions::new().create(true).truncate(false).read(true).write(true).open(r.join("data/dialogue/proj/control.lock")).map_err(|e|e.to_string())?;
 if unsafe{libc::flock(lock.as_raw_fd(),libc::LOCK_EX)}!=0{return Err("control lock failed".into())}
 let mut command=Command::new("marqdo");
 command.args(["call",entry,member,"--args-json","-","--fs-root"]).arg(r)
  .args(["--effects","plugin,fs.read,fs.write,process.exec,network.read,network.write,time.read,random.read,environment.read","--json"])
  .current_dir(r).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
 #[cfg(unix)]{use std::os::unix::process::CommandExt;command.process_group(0);}
 let mut child=command.spawn().map_err(|e|e.to_string())?;let pid=child.id();
 let payload=v.get("arguments").cloned().unwrap_or_else(||json!({})).to_string();
 if let Some(mut input)=child.stdin.take(){input.write_all(payload.as_bytes()).map_err(|e|e.to_string())?;}
 let (send,recv)=mpsc::channel();
 std::thread::spawn(move||{let _=send.send(child.wait_with_output());});
 let output=match recv.recv_timeout(Duration::from_secs(60)){
  Ok(value)=>value.map_err(|e|e.to_string())?,
  Err(_)=>{#[cfg(unix)]unsafe{libc::kill(-(pid as i32),libc::SIGKILL);}return Err("session control exceeded 60 seconds".into())}
 };
 if output.stdout.len()>4*1024*1024{return Err("session response exceeded four MiB".into())}
 if !output.status.success(){return Err(format!("Marqdo control failed: {} {}",String::from_utf8_lossy(&output.stdout),String::from_utf8_lossy(&output.stderr)))}
 let outer:Value=serde_json::from_slice(&output.stdout).map_err(|e|e.to_string())?;
 if outer["ok"]!=true{return Err(outer.to_string())}
 Ok(outer["result"].clone())
}

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
 if v["operation"].as_str().is_some_and(|op|op.starts_with("agent_")){return agent_runtime::dispatch(v)}
 if v["operation"]=="document_view"{return document_bundle::view(v)}
 if v["operation"].as_str().is_some_and(|op|op.starts_with("runtime_")){return runtime::dispatch(v)}
 if v["operation"]=="call"{return invocation(v)}
 let r=root(v)?;
 if v["operation"]=="control"{return control(&r,v)}
 let _lifecycle=lifecycle(&r)?;let d=r.join("data/dialogue/proj");
 match v["operation"].as_str().unwrap_or("") {
 "stop"=>{stop(&r)?;Ok(json!({"stopped":true}))}
 "begin"=>{
  let url=v["url"].as_str().ok_or("url required")?;
  if !url.starts_with("http://")&&!url.starts_with("https://"){return Err("HTTP URL required".into())}
  let worker=r.join("ext/native/qdagent-worker");
  if !worker.is_file(){return Err("install qdagent-worker before begin".into())}
  stop(&r)?;
  let token=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos().to_string();
  atomic(&d.join("transport.id"),&token)?;
  let _=fs::remove_file(d.join("done.flag"));
  let _=fs::remove_file(d.join("transport.result.json"));
  let mut command=Command::new(worker);
  command.arg(&r).arg(url).arg(&token).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
  #[cfg(unix)] { use std::os::unix::process::CommandExt; command.process_group(0); }
  let child=command.spawn().map_err(|e|e.to_string())?;
  let pid=child.id();
  std::thread::spawn(move||{let mut child=child;let _=child.wait();});
  Ok(json!({"worker_pid":pid,"started":true,"token":token}))
 }
 "task"=>{
  let entry=v["entry"].as_str().ok_or("entry required")?;
  let entry_path=Path::new(entry);
  if !entry_path.is_absolute() || !entry_path.is_file() || !entry.ends_with(".mq.md"){return Err("installed Marqdo entry required".into())}
  let worker=r.join("ext/native/qdagent-worker");
  if !worker.is_file(){return Err("install qdagent-worker before begin".into())}
  stop(&r)?;
  let token=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos().to_string();
  atomic(&d.join("transport.id"),&token)?;
  atomic(&d.join("transport.entry"),entry)?;
  let _=fs::remove_file(d.join("done.flag"));let _=fs::remove_file(d.join("transport.result.json"));
  let mut command=Command::new(worker);
  command.arg(&r).arg("workflow").arg(entry).arg(&token).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
  #[cfg(unix)] {use std::os::unix::process::CommandExt;command.process_group(0);}
  let mut child=command.spawn().map_err(|e|e.to_string())?;let pid=child.id();
  std::thread::spawn(move||{let _=child.wait();});
  Ok(json!({"worker_pid":pid,"started":true,"token":token,"kind":"marqdo_call"}))
 }
 _=>Err("unknown operation".into())
 }
}
pub fn worker(r:PathBuf,url:String,token:String)->Result<(),String>{
 let d=r.join("data/dialogue/proj");
 let spawn_lock=lifecycle(&r)?;
 if fs::read_to_string(d.join("transport.id")).ok().as_deref()!=Some(&token){return Ok(())}
 let err=fs::File::create(d.join("transport.error")).map_err(|e|e.to_string())?;
 let mut child=Command::new("curl").args(["--fail-with-body","--silent","--show-error","--no-buffer","--connect-timeout","10","--max-time","300","--url",&url,"--header","Content-Type: application/json","--data-binary"])
 .arg(format!("@{}",d.join("_stream_payload.json").display())).arg("--output").arg(d.join("_stream_raw.ndjson")).stdin(Stdio::null()).stdout(Stdio::null()).stderr(err).spawn().map_err(|e|e.to_string())?;
 atomic(&d.join("transport.pid"),&child.id().to_string())?;
 if fs::read_to_string(d.join("transport.id")).ok().as_deref()!=Some(&token){let _=child.kill();let _=child.wait();return Ok(())}
 drop(spawn_lock);
 let status=child.wait().map_err(|e|e.to_string())?;
 let _finish_lock=lifecycle(&r)?;
 if fs::read_to_string(d.join("transport.id")).ok().as_deref()==Some(&token){
  atomic(&d.join("transport.result.json"),&json!({"ok":status.success(),"code":status.code()}).to_string())?;
  atomic(&d.join("done.flag"),&status.code().unwrap_or(-1).to_string())?;
 }
 Ok(())
}
pub fn workflow(r:PathBuf,entry:String,token:String)->Result<(),String>{
 let d=r.join("data/dialogue/proj");let spawn_lock=lifecycle(&r)?;
 if fs::read_to_string(d.join("transport.id")).ok().as_deref()!=Some(&token){return Ok(())}
 let out=fs::File::create(d.join("worker.stdout")).map_err(|e|e.to_string())?;
 let err=fs::File::create(d.join("transport.error")).map_err(|e|e.to_string())?;
 let mut command=Command::new("marqdo");
 command.args(["call",&entry,"run","--fs-root"]).arg(&r)
  .args(["--effects","plugin,fs.read,fs.write,process.exec,network.read,network.write,time.read,random.read,environment.read","--json"])
  .stdin(Stdio::null()).stdout(out).stderr(err).current_dir(&r);
 #[cfg(unix)] {use std::os::unix::process::CommandExt;command.process_group(0);}
 let mut child=command.spawn().map_err(|e|e.to_string())?;
 atomic(&d.join("transport.pid"),&child.id().to_string())?;
 drop(spawn_lock);
 let started=std::time::Instant::now();
 let status=loop {
  if let Some(status)=child.try_wait().map_err(|e|e.to_string())?{break status;}
  if started.elapsed()>Duration::from_secs(900){
   #[cfg(unix)] unsafe{libc::kill(-(child.id() as i32),libc::SIGKILL);}
   let _=child.wait();return record_failure(&r,&token,"Marqdo task exceeded 900 seconds")
  }
  std::thread::sleep(Duration::from_millis(25));
 };
 let _finish=lifecycle(&r)?;
 if fs::read_to_string(d.join("transport.id")).ok().as_deref()==Some(&token){
  atomic(&d.join("transport.result.json"),&json!({"ok":status.success(),"code":status.code(),"kind":"marqdo_call"}).to_string())?;
  atomic(&d.join("done.flag"),&status.code().unwrap_or(-1).to_string())?;
 }
 Ok(())
}
pub fn record_failure(r:&Path,token:&str,error:&str)->Result<(),String>{
 let _lock=lifecycle(r)?;let d=r.join("data/dialogue/proj");
 if fs::read_to_string(d.join("transport.id")).ok().as_deref()==Some(token){
  atomic(&d.join("transport.result.json"),&json!({"ok":false,"error":error}).to_string())?;
  atomic(&d.join("done.flag"),"failed")?;
 }
 Ok(())
}
unsafe extern "C" fn request(args:*const c_char,out:*mut *mut c_char,err:*mut *mut c_char)->i32{
 let args=match parse_args(args){Ok(v)=>v,Err(e)=>{set_err(err,&e);return 1}};
 let v=args.get("request").unwrap_or(&args);
 let result=match dispatch(v){Ok(value)=>json!({"ok":true,"value":value,"error":null}),Err(message)=>json!({"ok":false,"value":null,"error":{"code":"qdagent.transport","message":message}})};
 set_out(out,&result.to_string());0
}
marqdo_plugin!(2,[("qdagent_transport","request",request)]);

#[cfg(test)]
mod tests {
 use super::*;
 fn fixture()->PathBuf {
  let r=std::env::temp_dir().join(format!("qdagent-transport-{}-{}",std::process::id(),SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
  fs::create_dir_all(r.join("data/dialogue/proj")).unwrap();r
 }
 #[test]
 fn superseded_worker_cannot_publish_failure() {
  let r=fixture();let d=r.join("data/dialogue/proj");
  atomic(&d.join("transport.id"),"current").unwrap();
  record_failure(&r,"old","failure from superseded worker").unwrap();
  assert!(!d.join("done.flag").exists());
  assert!(!d.join("transport.result.json").exists());
  record_failure(&r,"current","visible failure").unwrap();
  let output:Value=serde_json::from_str(&fs::read_to_string(d.join("transport.result.json")).unwrap()).unwrap();
  assert_eq!(output["ok"],false);assert_eq!(output["error"],"visible failure");
  assert_eq!(fs::read_to_string(d.join("done.flag")).unwrap(),"failed");
  fs::remove_dir_all(r).unwrap();
 }
 #[test]
 fn lifecycle_lock_serializes_publication() {
  let r=fixture();let first=lifecycle(&r).unwrap();
  let (sent,received)=std::sync::mpsc::channel();let worker_root=r.clone();
  let t=std::thread::spawn(move||{let _second=lifecycle(&worker_root).unwrap();sent.send(()).unwrap();});
  assert!(received.recv_timeout(Duration::from_millis(30)).is_err());
  drop(first);
  received.recv_timeout(Duration::from_secs(2)).unwrap();
  t.join().unwrap();fs::remove_dir_all(r).unwrap();
 }
}
