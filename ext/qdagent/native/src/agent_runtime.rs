//! Host adapter for the document-native capability agent.
//! Only identities, bounded storage, compiler-backed discovery and OS execution
//! live here. Business decisions, prompts and workflows belong to .mq.md.
use std::{fs,io::Write,path::{Path,PathBuf},process::{Command,Stdio},time::{Duration,Instant}};
use serde_json::{json,Value};
use sha2::{Digest,Sha256};

fn digest(s:&[u8])->String{format!("{:x}",Sha256::digest(s))}
fn context(v:&Value)->Result<&Value,String>{v["context"].as_object().map(|_|&v["context"]).ok_or("agent trusted context required".into())}
fn project(c:&Value)->Result<PathBuf,String>{
 let raw=c["project"].as_str().ok_or("project path missing")?;
 let p=Path::new(raw).canonicalize().map_err(|e|e.to_string())?;
 if !p.join("agent/index.mq.md").is_file(){return Err("installed agent entry missing".into())}Ok(p)
}
fn root(c:&Value)->Result<PathBuf,String>{super::root(c)}
fn state_path(r:&Path)->PathBuf{r.join("data/dialogue/proj/agent-state.json")}
fn read(r:&Path)->Result<Value,String>{
 match fs::read_to_string(state_path(r)){
  Ok(raw)=>serde_json::from_str(&raw).map_err(|e|e.to_string()),
  Err(e) if e.kind()==std::io::ErrorKind::NotFound=>Ok(json!({"revision":0,"phase":"idle","goal":"","pending":null,"selected_skill":null,"approved_skill":null})),
  Err(e)=>Err(e.to_string())
 }
}
fn save(r:&Path,s:&mut Value)->Result<Value,String>{
 let revision=s["revision"].as_u64().ok_or("missing revision")?+1;
 s["revision"]=json!(revision);
 let raw=s.to_string();if raw.len()>1024*1024{return Err("agent session exceeds one MiB".into())}
 super::atomic(&state_path(r),&raw)?;Ok(s.clone())
}
fn valid_slug(s:&str)->bool{!s.is_empty()&&s.len()<=48&&s.bytes().all(|b|b.is_ascii_lowercase()||b.is_ascii_digit()||b==b'-')&&!s.starts_with('-')&&!s.ends_with('-')}
fn scalar(src:&str,key:&str)->Option<String>{
 let front=src.strip_prefix("---\n")?.split("\n---").next()?;
 for line in front.lines(){
  if let Some(v)=line.strip_prefix(key).and_then(|s|s.strip_prefix(':')){
   let value=v.trim().trim_matches('"').to_string();
   if value.len()<=240&&!value.contains(['\r','\n']){return Some(value)}
  }
 }
 None
}
fn skill(c:&Value,id:&str)->Result<Value,String>{
 if !valid_slug(id){return Err("agent.catalog.invalid_id".into())}
 let project=project(c)?;
 let base=project.join("skills").canonicalize().map_err(|e|e.to_string())?;
 let path=base.join(id).join("index.mq.md").canonicalize().map_err(|_|"agent.catalog.unknown_skill".to_string())?;
 if !path.starts_with(&base)||!path.is_file(){return Err("agent.catalog.path_escape".into())}
 let source=fs::read_to_string(&path).map_err(|e|e.to_string())?;
 if source.len()>128*1024{return Err("agent.catalog.source_budget".into())}
 // The official Marqdo parser, not our string heuristics, determines callable exports.
 let module=marqdo::load::parse_source_auto(&source).map_err(|e|format!("agent.catalog.parse: {e}"))?;
 if !module.functions.iter().any(|f|f.name=="run"){return Err("agent.catalog.no_run".into())}
 let purpose=scalar(&source,"description").ok_or("agent.catalog.description_required")?;
 let effects=scalar(&source,"agent_effects").unwrap_or("model".into());
 if !matches!(effects.as_str(),"read"|"model"|"external"|"write"){return Err("agent.catalog.invalid_effects".into())}
 Ok(json!({"id":id,"description":purpose,"effects":effects,"sha256":digest(source.as_bytes()),"path":path.to_string_lossy()}))
}
fn catalog(c:&Value)->Result<Value,String>{
 let base=project(c)?.join("skills");let mut out=vec![];
 for entry in fs::read_dir(base).map_err(|e|e.to_string())?{
  let entry=entry.map_err(|e|e.to_string())?;
  if !entry.file_type().map_err(|e|e.to_string())?.is_dir(){continue}
  let name=entry.file_name().to_string_lossy().to_string();
  if !valid_slug(&name){continue}
  if let Ok(v)=skill(c,&name){out.push(json!({"id":name,"description":v["description"],"effects":v["effects"],"sha256":v["sha256"]}));}
 }
 out.sort_by(|a,b|a["id"].as_str().cmp(&b["id"].as_str()));
 if out.len()>64{return Err("agent.catalog.too_many".into())}
 Ok(json!(out))
}
fn call(c:&Value,v:&Value)->Result<Value,String>{
 let name=v["skill"].as_str().ok_or("skill id required")?;
 let spec=skill(c,name)?;
 let root=root(c)?;
 let state={let _lock=super::lifecycle(&root)?;read(&root)?};
 let effects=spec["effects"].as_str().unwrap_or("read");
 if effects=="external"||effects=="write"{
  if state["approved_skill"]!=name||state["phase"]!="ready"{return Err("agent.approval_required".into())}
 }
 let source=Path::new(spec["path"].as_str().ok_or("installed path missing")?);
 let grants=match effects{
  "read"=>"fs.read",
  "model"=>"plugin,fs.read,process.exec,environment.read",
  "external"=>"plugin,fs.read,process.exec,environment.read,network.read",
  "write"=>"plugin,fs.read,fs.write,process.exec,environment.read,network.read,network.write",
  _=>return Err("unknown effects".into()),
 };
 let mut command=Command::new("marqdo");
 command.arg("call").arg(source).arg("run").args(["--args-json","-","--fs-root"])
  .arg(c["workspace"].as_str().ok_or("workspace required")?)
  .args(["--effects",grants,"--json"])
  .current_dir(c["workspace"].as_str().unwrap())
  .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
 let mut child=command.spawn().map_err(|e|e.to_string())?;
 let params=json!({"context":c,"goal":v["goal"]}).to_string();
 child.stdin.take().ok_or("skill stdin missing")?.write_all(params.as_bytes()).map_err(|e|e.to_string())?;
 let start=Instant::now();
 loop {
  if let Some(status)=child.try_wait().map_err(|e|e.to_string())? {
   // Do not invent success from a process status; inspect official result envelope.
   let output=child.wait_with_output().map_err(|e|e.to_string())?;
   if output.stdout.len()>4*1024*1024||output.stderr.len()>65536{return Err("agent.skill.output_budget".into())}
   if !status.success(){return Err(format!("agent.skill.failed: {}",String::from_utf8_lossy(&output.stderr).chars().take(500).collect::<String>()))}
   let envelope:Value=serde_json::from_slice(&output.stdout).map_err(|_|"agent.skill.invalid_marqdo_result")?;
   if envelope["ok"]!=true{return Err(format!("agent.skill.marqdo_error: {}",envelope["error"]))}
   return Ok(json!({"status":"succeeded","result":envelope["result"],"skill":name,"source_sha256":spec["sha256"],"evidence":"marqdo_call"}))
  }
  if start.elapsed()>Duration::from_secs(240){let _=child.kill();let _=child.wait();return Err("agent.skill.timeout".into())}
  std::thread::sleep(Duration::from_millis(30));
 }
}
pub fn dispatch(v:&Value)->Result<Value,String>{
 let c=context(v)?;
 match v["operation"].as_str().ok_or("operation missing")?{
  "agent_catalog_list"=>catalog(c),
  "agent_catalog_resolve"=>skill(c,v["skill"].as_str().ok_or("skill required")?),
  "agent_skill_call"=>call(c,v),
  "agent_session_read"=>{let r=root(c)?;let _lock=super::lifecycle(&r)?;read(&r)},
  "agent_session_begin"=>{
   let message=v["message_id"].as_str().ok_or("message id missing")?;
   let input=v["user_input"].as_str().ok_or("user text missing")?;
   if input.trim().is_empty()||input.len()>16000||message.len()>128||!message.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'-'||b==b'_'){return Err("agent.session.invalid_input".into())}
   let r=root(c)?;let _lock=super::lifecycle(&r)?;let mut s=read(&r)?;
   if s["last_message_id"]==message{return Ok(s)}
   s["goal"]=json!(input);s["phase"]=json!("ready");s["status"]=json!("running");
   s["pending"]=Value::Null;s["selected_skill"]=Value::Null;s["approved_skill"]=Value::Null;
   s["answer"]=json!("");s["last_message_id"]=json!(message);save(&r,&mut s)
  },
  "agent_session_propose"=>{
   let name=v["skill"].as_str().ok_or("skill required")?;
   let _spec=skill(c,name)?;
   let r=root(c)?;let _lock=super::lifecycle(&r)?;let mut s=read(&r)?;
   if s["phase"]!="ready"{return Err("agent.session.not_ready".into())}
   if s["pending"]["skill"]==name{return Ok(s)}
   s["pending"]=json!({"kind":"effect_approval","skill":name,"question":v["question"],"options":["approve","deny"],"freeform":false});
   s["phase"]=json!("waiting_user");save(&r,&mut s)
  },
  "agent_session_respond"=>{
   let r=root(c)?;let _lock=super::lifecycle(&r)?;let mut s=read(&r)?;
   if s["revision"].as_u64()!=v["revision"].as_u64(){return Err("agent.session.stale_revision".into())}
   if s["phase"]!="waiting_user"||s["pending"]["kind"]!="effect_approval"{return Err("agent.session.no_pending_approval".into())}
   match v["action"].as_str().ok_or("action required")?{
    "approve"=>{s["approved_skill"]=s["pending"]["skill"].clone();s["phase"]=json!("ready");s["pending"]=Value::Null;},
    "deny"=>{s["phase"]=json!("complete");s["status"]=json!("incomplete");s["answer"]=json!("用户拒绝授权该外部操作");s["pending"]=Value::Null;},
    _=>return Err("agent.session.invalid_confirmation".into()),
   }
   save(&r,&mut s)
  },
  "agent_session_finish"=>{
   let status=v["status"].as_str().ok_or("status required")?;
   if !matches!(status,"succeeded"|"incomplete"|"failed"){return Err("agent.session.invalid_status".into())}
   let r=root(c)?;let _lock=super::lifecycle(&r)?;let mut s=read(&r)?;
   if s["phase"]=="waiting_user"{return Err("agent.session.pending_human".into())}
   s["phase"]=json!("complete");s["status"]=json!(status);s["answer"]=v["answer"].clone();
   s["selected_skill"]=v["skill"].clone();s["approved_skill"]=Value::Null;save(&r,&mut s)
  },
  _=>Err("unknown agent operation".into()),
 }
}
