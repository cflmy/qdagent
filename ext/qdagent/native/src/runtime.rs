//! I/O and official-parser boundary. Agent policy and all prompts live in .mq.md.
use std::{fs,io::{BufRead,BufReader,Read,Write},path::{Path,PathBuf},process::{Command,Stdio},time::{Duration,Instant}};
#[path="office_read.rs"] mod office_read;
#[path="office_image.rs"] mod office_image;
#[path="office_manifest.rs"] mod office_manifest;
#[path="knowledge.rs"] mod knowledge;
use serde_json::{json,Value};
use sha2::{Digest,Sha256};
fn digest(raw:&[u8])->String{format!("{:x}",Sha256::digest(raw))}
fn id(text:&str)->Result<&str,String>{if text.is_empty()||text.len()>120||!text.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'_'||b==b'-'){Err("invalid identity".into())}else{Ok(text)}}
fn text<'a>(v:&'a Value,key:&str)->Result<&'a str,String>{v[key].as_str().ok_or_else(||format!("missing {key}"))}
fn context(v:&Value)->Result<&Value,String>{
 crate::agent_runtime::trusted_context(v)
}
fn directory(c:&Value)->Result<PathBuf,String>{let r=super::root(c)?;let run=id(text(c,"run_id")?)?;let p=r.join("data/dialogue/proj/runtime").join(run);fs::create_dir_all(&p).map_err(|e|e.to_string())?;Ok(p)}
fn event(c:&Value,kind:&str,data:Value)->Result<(),String>{
 use std::os::fd::AsRawFd;
 let dir=directory(c)?;let lock=fs::OpenOptions::new().create(true).truncate(false).write(true).open(dir.join("events.lock")).map_err(|e|e.to_string())?;
 if unsafe{libc::flock(lock.as_raw_fd(),libc::LOCK_EX)}!=0{return Err("event lock failed".into())}
 let mut file=fs::OpenOptions::new().create(true).append(true).open(dir.join("events.ndjson")).map_err(|e|e.to_string())?;
 let line=json!({"kind":kind,"data":data}).to_string();if line.len()>2*1024*1024{return Err("event exceeded bound".into())}
 let written=file.write_all((line+"\n").as_bytes()).map_err(|e|e.to_string());unsafe{libc::flock(lock.as_raw_fd(),libc::LOCK_UN);}written
}
fn private_request(c:&Value)->Result<Value,String>{
 let file=std::env::var("QDAGENT_RUN_REQUEST_FILE").map_err(|_|"private request unavailable")?;
 let req:Value=serde_json::from_slice(&fs::read(file).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
 for key in ["project","workspace","root","owner","run_id"] {if c[key]!=req["context"][key]{return Err("request context mismatch".into())}}
 Ok(req)
}
fn descendants(file:&Path,root:&Path)->Result<PathBuf,String>{let p=file.canonicalize().map_err(|e|e.to_string())?;let r=root.canonicalize().map_err(|e|e.to_string())?;if !p.starts_with(r)||!p.is_file(){return Err("path escapes granted root".into())}Ok(p)}
fn parser(source:&str)->Result<marqdo::ast::Module,String>{marqdo::load::parse_source_auto(source).map_err(|e|e.to_string())}
fn bounded_wait(mut child:std::process::Child,timeout:Duration)->Result<(Vec<u8>,Vec<u8>,i32),String>{
 let stdout=child.stdout.take().ok_or("stdout unavailable")?;let stderr=child.stderr.take().ok_or("stderr unavailable")?;
 let out=std::thread::spawn(move||{let mut b=vec![];let _=stdout.take(4*1024*1024+1).read_to_end(&mut b);b});let err=std::thread::spawn(move||{let mut b=vec![];let _=stderr.take(64*1024+1).read_to_end(&mut b);b});
 let started=Instant::now();let status=loop{if let Some(s)=child.try_wait().map_err(|e|e.to_string())?{break s}if started.elapsed()>timeout{let _=child.kill();let _=child.wait();return Err("child process deadline exceeded".into())}std::thread::sleep(Duration::from_millis(10))};
 let o=out.join().map_err(|_|"stdout reader failed")?;let e=err.join().map_err(|_|"stderr reader failed")?;if o.len()>4*1024*1024||e.len()>64*1024{return Err("child output exceeded bound".into())}Ok((o,e,status.code().unwrap_or(-1)))
}
pub(crate) fn model(v:&Value)->Result<Value,String>{
 let c=context(v)?;let req=private_request(c)?;let selected=text(v,"model_id")?;
 let config=if selected=="inherit"||selected==text(&req["context"],"model_selection")?{req["model"].clone()}else{req["child_models"][selected].clone()};if !config.is_object(){return Err("model identity was not authorized by host".into())}
 let messages=v["messages"].as_array().ok_or("Marqdo messages required")?;if messages.is_empty()||messages.len()>12{return Err("invalid message packet".into())}
 let budget=v["max_context_bytes"].as_u64().ok_or("context budget required")?;if budget==0||budget>1024*1024||v["messages"].to_string().len() as u64>budget{return Err("role context exceeds document budget".into())}
 let project=PathBuf::from(text(c,"project")?);let mut origins=vec![];for item in v["sources"].as_array().ok_or("instruction sources required")?{
  let path=descendants(Path::new(item.as_str().ok_or("source path required")?),&project)?;if !path.to_string_lossy().ends_with(".mq.md"){return Err("instructions require Marqdo source".into())}origins.push(json!({"path":path,"sha256":digest(&fs::read(&path).map_err(|e|e.to_string())?)}));
 }
 if origins.is_empty(){return Err("instruction provenance missing".into())}
 let packet=directory(c)?.join("packets");fs::create_dir_all(&packet).map_err(|e|e.to_string())?;let unit=id(c["unit_id"].as_str().unwrap_or("root"))?;let role=id(text(c,"role")?)?;let step=v["step"].as_u64().ok_or("step required")?;
 super::atomic(&packet.join(format!("{unit}-{role}-{step}-{}.json",v["attempt"].as_u64().unwrap_or(1))),&json!({"messages":messages,"origins":origins,"role":role,"unit_id":c["unit_id"]}).to_string())?;
 let attempt=v["attempt"].as_u64().unwrap_or(1);let model_call_id=format!("model-{unit}-{role}-{step}-{attempt}");
 if let Some(helper)=req["quota_helper"].as_str(){
  let request_file=std::env::var("QDAGENT_RUN_REQUEST_FILE").map_err(|_|"private request unavailable")?;
  let mut command=Command::new(helper);command.arg("--authorize-model-request").env("QDAGENT_ROOT",&project).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
  let mut permit=command.spawn().map_err(|_|"模型额度服务不可用")?;
  let data=json!({"request_file":request_file,"model_id":selected,"unit":unit,"role":role,"step":step,"attempt":attempt}).to_string();
  permit.stdin.take().ok_or("quota input missing")?.write_all(data.as_bytes()).map_err(|e|e.to_string())?;
  let output=bounded_wait(permit,Duration::from_secs(10))?;let response:Value=serde_json::from_slice(&output.0).map_err(|_|"模型额度服务未返回有效授权")?;
  if output.2!=0||response["ok"]!=true{return Err(response["message"].as_str().unwrap_or("模型额度请求未获授权").into())}
  event(c,"model_usage",response)?;
 }else if config["selection_id"].is_string(){return Err("模型额度服务不可用，未发送请求".into())}
 let actual_model=config["model"].as_str().unwrap_or(&selected).to_string();
 let child=c["unit_id"].is_string();event(c,if child{"child_model_start"}else{"model_start"},json!({"id":unit,"call_id":model_call_id,"attempt":attempt,"step":step,"title":v["title"],"model":actual_model,"selection":selected,"role":role,"sources":origins,"context_bytes":v["messages"].to_string().len()}))?;
 let mut cmd=Command::new("python3");cmd.arg(project.join("worker/provider.py")).current_dir(&project).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());let mut process=cmd.spawn().map_err(|e|e.to_string())?;
 let body=json!({"model":config,"messages":messages}).to_string();if body.len()>2*1024*1024{return Err("model request exceeded bound".into())}process.stdin.take().unwrap().write_all(body.as_bytes()).map_err(|e|e.to_string())?;
 let stdout=process.stdout.take().unwrap();let stderr=process.stderr.take().unwrap();let errors=std::thread::spawn(move||{let mut b=vec![];let _=stderr.take(65536).read_to_end(&mut b);});
 let (sender,receiver)=std::sync::mpsc::channel();std::thread::spawn(move||{for line in BufReader::new(stdout).lines(){if sender.send(line).is_err(){break}}});
 let start=Instant::now();let mut answer=String::new();let mut failure=None;
 loop{
  if start.elapsed()>Duration::from_secs(240){let _=process.kill();failure=Some("provider deadline exceeded".to_string());break}
  match receiver.recv_timeout(Duration::from_millis(100)){
   Ok(Ok(line))=>{let event_value:Value=serde_json::from_str(&line).map_err(|_|"invalid provider event")?;let kind=event_value["kind"].as_str().unwrap_or("");let data=&event_value["data"];
    if kind=="response"{answer=data["text"].as_str().unwrap_or("").into()}
    else if kind=="transport_error"{failure=Some(data["message"].as_str().unwrap_or("provider failure").into())}
    else if matches!(kind,"text_delta"|"reasoning_delta"){
     let projected=if kind=="text_delta"{"program_delta"}else{kind};
     if child{event(c,"child_update",json!({"id":unit,"call_id":model_call_id,"attempt":attempt,"event":projected,"text":data["text"],"role":role}))?}else{event(c,projected,json!({"text":data["text"],"call_id":model_call_id,"step":step,"attempt":attempt,"role":role}))?}
    }
   },
   Ok(Err(_))=>{failure=Some("provider event stream failed".into());break},
   Err(std::sync::mpsc::RecvTimeoutError::Disconnected)=>break,
   Err(std::sync::mpsc::RecvTimeoutError::Timeout)=>{},
  }
 }
 let status=process.wait().map_err(|e|e.to_string())?;let _=errors.join();if !status.success()&&failure.is_none(){failure=Some("provider process failed".into())}
 if failure.is_none()&&(answer.len()>128*1024||answer.trim().is_empty()){failure=Some("empty or oversized Marqdo response".into())}
 event(c,if child{"child_model_end"}else{"model_end"},json!({"id":unit,"call_id":model_call_id,"attempt":attempt,"step":step,"status":if failure.is_none(){"succeeded"}else{"failed"},"role":role}))?;
 if let Some(error)=failure{return Err(error)}Ok(json!({"text":answer,"sources":origins}))
}
pub fn dispatch(v:&Value)->Result<Value,String>{
 match v["operation"].as_str().unwrap_or(""){
  "runtime_office_read"=>office_read::read(v),
  "runtime_office_image"=>office_image::inspect(v),
  "runtime_office_record"=>office_manifest::upsert(v),
  "runtime_knowledge_extract"=>knowledge::extract(v),
  "runtime_knowledge_publish"=>knowledge::publish(v),
  "runtime_knowledge_list"=>knowledge::list(v),
  "runtime_knowledge_document"=>knowledge::document(v),
  "runtime_knowledge_execute"=>knowledge::execute(v),
  "runtime_knowledge_writeback"=>knowledge::writeback(v),
  "runtime_knowledge_contract"=>knowledge::contract(v),
  "runtime_knowledge_verification"=>knowledge::verification(v),
  "runtime_knowledge_proof"=>knowledge::proof(v),
  "runtime_knowledge_prove"=>knowledge::prove(v),
  "runtime_knowledge_proof_job"=>knowledge::proof_job(v),
  "runtime_search"|"runtime_ocr_submit"|"runtime_ocr_poll"=>{
   let c=context(v)?;private_request(c)?;
   // A resource role is derived from the installed active document, never
   // from a model reply or caller-constructed context dictionary.
   let current=std::env::var("QDAGENT_ACTIVE_DOCUMENT").map_err(|_|"active Marqdo source required")?;
   let current=Path::new(&current).canonicalize().map_err(|e|e.to_string())?;
   let project=Path::new(text(c,"project")?).canonicalize().map_err(|e|e.to_string())?;
   let expected=project.join("skills/research/index.mq.md");
   if current!=expected{return Err("service restricted to installed research skill".into())}
   let operation=text(v,"operation")?.trim_start_matches("runtime_");
   let mut payload=json!({"operation":operation});
   match operation {
    "search"=>payload["query"]=json!(text(v,"query")?),
    "ocr_submit"=>{
     let rel=text(v,"path")?;
     if !rel.starts_with("uploads/"){return Err("only uploaded source material is readable".into())}
     let workspace=Path::new(text(c,"workspace")?);
     let file=descendants(&workspace.join(rel),&workspace.join("uploads"))?;
     if fs::metadata(&file).map_err(|e|e.to_string())?.len()>50*1024*1024{return Err("OCR source exceeds 50 MiB".into())}
     payload["file"]=json!(file);
    },
    "ocr_poll"=>payload["job_id"]=json!(id(text(v,"job_id")?)?),
    _=>return Err("unknown service operation".into())
   }
   let project=Path::new(text(c,"project")?);
   let mut process=Command::new("python3");
   process.arg(project.join("worker/services.py")).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
   let mut child=process.spawn().map_err(|e|e.to_string())?;
   child.stdin.take().ok_or("service stdin missing")?.write_all(payload.to_string().as_bytes()).map_err(|e|e.to_string())?;
   let (output,_,status)=bounded_wait(child,Duration::from_secs(50))?;
   if status!=0{return Err("service transport failed".into())}
   let answer:Value=serde_json::from_slice(&output).map_err(|_|"invalid service transport response")?;
   if answer["ok"]!=true{return Err(answer["message"].as_str().unwrap_or("service failed").into())}
   Ok(answer["value"].clone())
  },
  "runtime_browser_open"=>{
   let c=context(v)?;private_request(c)?;
   let current=std::env::var("QDAGENT_ACTIVE_DOCUMENT").map_err(|_|"active Marqdo source required")?;
   let current=Path::new(&current).canonicalize().map_err(|e|e.to_string())?;
   let project=Path::new(text(c,"project")?).canonicalize().map_err(|e|e.to_string())?;
   if current!=project.join("skills/research/index.mq.md"){return Err("browser requires installed research skill".into())}
   crate::browser::open(text(v,"url")?)
  },
  "runtime_context"=>{
   let path=std::env::var("QDAGENT_ACTOR_FILE").map_err(|_|"actor context unavailable")?;
   serde_json::from_slice(&fs::read(path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())
  },
  "runtime_event"=>{event(context(v)?,text(v,"kind")?,v["data"].clone())?;Ok(json!(true))},
  "runtime_model"=>Err("agent.model.use_marqdo_three_sources".into()),
  _=>Err("unsupported v3 runtime operation".into())
 }
}
