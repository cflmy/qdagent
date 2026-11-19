//! Host adapter for the document-native capability agent.
//! Only identities, bounded storage, compiler-backed discovery and OS execution
//! live here. Business decisions, prompts and workflows belong to .mq.md.
use std::{fs,io::Write,path::{Path,PathBuf},process::{Command,Stdio},time::{Duration,Instant}};
use serde_json::{json,Value};
use sha2::{Digest,Sha256};

mod catalog;
mod execute;

fn digest(s:&[u8])->String{format!("{:x}",Sha256::digest(s))}
pub(super) fn trusted_context(v:&Value)->Result<&Value,String>{
 let c=v["context"].as_object().map(|_|&v["context"]).ok_or("agent trusted context required".to_string())?;
 // The caller may supply a context map, but it never establishes authority.
 // Only the Go host writes this actor attestation for a specific run/call.
 let path=std::env::var("QDAGENT_ACTOR_FILE").map_err(|_|"agent.actor.host_attestation_required")?;
 let raw=fs::read(path).map_err(|_|"agent.actor.attestation_unavailable")?;
 if raw.len()>65536{return Err("agent.actor.attestation_too_large".into())}
 let verified:Value=serde_json::from_slice(&raw).map_err(|_|"agent.actor.invalid_attestation")?;
 for field in ["root","project","workspace","owner","id"]{
  let expected=verified[field].as_str().ok_or_else(||format!("agent.actor.missing_{field}"))?;
  if c[field].as_str()!=Some(expected){return Err(format!("agent.actor.identity_mismatch:{field}"))}
 }
 Ok(c)
}
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
pub fn dispatch(v:&Value)->Result<Value,String>{
 let c=trusted_context(v)?;
 match v["operation"].as_str().ok_or("operation missing")?{
  "agent_user_input"=>{
   let root=root(c)?;let _lock=super::lifecycle(&root)?;let state=read(&root)?;
   let goal=state["goal"].as_str().ok_or("agent.input.no_current_turn")?;
   if goal.is_empty(){return Err("agent.input.empty".into())}
   Ok(json!(goal))
  },
  "agent_model_turn"=>{
   // The *only* visible language-model contents are the exact current
   // input, the inert memory document and the active executable Marqdo source.
   // No caller-supplied prompt, messages, tool descriptions, or history.
   if v.get("messages").is_some()||v.get("prompt").is_some()||v.get("sources").is_some()||v.get("context_pack").is_some(){
    return Err("agent.model.extra_context_forbidden".into())
   }
   let role=v["role"].as_str().unwrap_or("chat");
   if !matches!(role,"route"|"chat"){return Err("agent.model.invalid_role".into())}
   let document=std::env::var("QDAGENT_ACTIVE_DOCUMENT").map_err(|_|"agent.model.active_document_required")?;
   let doc=Path::new(&document).canonicalize().map_err(|e|e.to_string())?;
   let project=project(c)?;
   let is_root=doc==project.join("agent/index.mq.md");
   let is_skill=doc.starts_with(project.join("skills"))&&doc.file_name().and_then(|x|x.to_str())==Some("index.mq.md");
   if !(is_root||is_skill)||!doc.is_file(){return Err("agent.model.active_document_not_installed".into())}
   let source=fs::read_to_string(&doc).map_err(|e|e.to_string())?;
   let root=root(c)?;let state={let _lock=super::lifecycle(&root)?;read(&root)?};
   let input=state["goal"].as_str().ok_or("agent.model.input_missing")?;
   let workspace=Path::new(c["workspace"].as_str().ok_or("workspace required")?).canonicalize().map_err(|e|e.to_string())?;
   let memory_path=workspace.join("memory.mq.md");
   let memory=fs::read_to_string(&memory_path).map_err(|_|"agent.model.memory_missing")?;
   if !memory.starts_with("# 任务关键事实")||memory.len()>8192{return Err("agent.model.memory_invalid".into())}
   if source.len()>65536||input.len()>16000{return Err("agent.model.source_or_input_budget".into())}
   let packet=json!({
    "operation":"runtime_model_internal",
    "context":c,
    "model_id":"inherit",
    "role":role,
    "step":v["step"].as_u64().unwrap_or(1),
    "title":"Marqdo document execution",
    "messages":[
      {"role":"system","content":source},
      {"role":"user","content":memory},
      {"role":"user","content":input}
    ],
    "sources":[doc.to_string_lossy()],
    "max_context_bytes":100000
   });
   crate::runtime::model(&packet)
  },
  "agent_catalog_list"=>catalog::catalog(c),
  "agent_catalog_resolve"=>catalog::skill(c,v["skill"].as_str().ok_or("skill required")?),
  "agent_source_check"=>{
   let source=v["source"].as_str().ok_or("Marqdo source required")?;
   if source.len()>65536{return Err("agent.source.too_large".into())}
   let module=marqdo::load::parse_source_auto(source).map_err(|e|format!("agent.source.compiler_diagnostic: {e}"))?;
   Ok(json!({"valid":true,"source_sha256":digest(source.as_bytes()),"functions":module.functions.iter().map(|f|f.name.clone()).collect::<Vec<_>>()}))
  },
  "agent_source_revision"=>{
   let rel=v["path"].as_str().ok_or("relative source required")?;
   if !rel.starts_with("workflows/")||!rel.ends_with(".mq.md")||rel.split('/').any(|s|s==".."||s=="."||s.is_empty()){
    return Err("agent.source.invalid".into())
   }
   let project=project(c)?;
   let base=project.join("workflows").canonicalize().map_err(|e|e.to_string())?;
   let file=project.join(rel).canonicalize().map_err(|e|e.to_string())?;
   if !file.starts_with(base)||!file.is_file(){return Err("agent.source.outside_project".into())}
   Ok(json!(digest(&fs::read(file).map_err(|e|e.to_string())?)))
  },
  "agent_skill_call"=>execute::call(c,v),
  "agent_session_read"=>{let r=root(c)?;let _lock=super::lifecycle(&r)?;read(&r)},
  "agent_memory_sync"=>{
   let r=root(c)?;let _lock=super::lifecycle(&r)?;let s=read(&r)?;
   let rev=v["revision"].as_u64().ok_or("agent.memory.revision_required")?;
   if s["revision"].as_u64()!=Some(rev){return Err("agent.memory.stale".into())}
   let source=v["memory"].as_str().ok_or("agent.memory.document_required")?;
   if source.len()>8*1024||source.lines().any(|l|l.starts_with("## ")||l.starts_with("### "))
      ||!source.starts_with("# 任务关键事实"){return Err("agent.memory.inert_budget_required".into())}
   let workspace=Path::new(c["workspace"].as_str().ok_or("workspace required")?).canonicalize().map_err(|e|e.to_string())?;
   if !workspace.is_dir(){return Err("agent.memory.invalid_workspace".into())}
   let target=workspace.join("memory.mq.md");
   if let Ok(m)=fs::symlink_metadata(&target){if m.file_type().is_symlink()||!m.is_file(){return Err("agent.memory.invalid_target".into())}}
   super::atomic(&target,source)?;
   Ok(json!(source))
  },
  "agent_session_begin"=>{
   let message=v["message_id"].as_str().ok_or("message id missing")?;
   let input=v["user_input"].as_str().ok_or("user text missing")?;
   if input.trim().is_empty()||input.len()>16000||message.len()>128||!message.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'-'||b==b'_'){return Err("agent.session.invalid_input".into())}
   let r=root(c)?;let _lock=super::lifecycle(&r)?;let mut s=read(&r)?;
   if s["last_message_id"].as_str()==Some(message){return Ok(s)}
   s["goal"]=json!(input);s["phase"]=json!("ready");s["status"]=json!("running");
   s["pending"]=Value::Null;s["selected_skill"]=Value::Null;s["approved_skill"]=Value::Null;
   s["answer"]=json!("");s["last_message_id"]=json!(message);s["approved_source_sha256"]=Value::Null;save(&r,&mut s)
  },
  "agent_session_propose"=>{
   let name=v["skill"].as_str().ok_or("skill required")?;
   let spec=catalog::skill(c,name)?;
   let r=root(c)?;let _lock=super::lifecycle(&r)?;let mut s=read(&r)?;
   if s["phase"]!="ready"{return Err("agent.session.not_ready".into())}
   if s["pending"]["skill"].as_str()==Some(name){return Ok(s)}
   s["pending"]=json!({"kind":"effect_approval","skill":name,"source_sha256":spec["sha256"],"question":v["question"],"options":["approve","deny"],"freeform":false});
   s["phase"]=json!("waiting_user");save(&r,&mut s)
  },
  "agent_session_respond"=>{
   let r=root(c)?;let _lock=super::lifecycle(&r)?;let mut s=read(&r)?;
   if s["revision"].as_u64()!=v["revision"].as_u64(){return Err("agent.session.stale_revision".into())}
   if s["phase"]!="waiting_user"||s["pending"]["kind"]!="effect_approval"{return Err("agent.session.no_pending_approval".into())}
   match v["action"].as_str().ok_or("action required")?{
    "approve"=>{s["approved_skill"]=s["pending"]["skill"].clone();s["approved_source_sha256"]=s["pending"]["source_sha256"].clone();s["phase"]=json!("ready");s["pending"]=Value::Null;},
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
   s["selected_skill"]=v["skill"].clone();s["approved_skill"]=Value::Null;s["approved_source_sha256"]=Value::Null;save(&r,&mut s)
  },
  _=>Err("unknown agent operation".into()),
 }
}
