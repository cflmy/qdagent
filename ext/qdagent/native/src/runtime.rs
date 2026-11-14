//! I/O and official-parser boundary. Agent policy and all prompts live in .mq.md.
use std::{collections::HashSet,fs,io::{BufRead,BufReader,Read,Write},path::{Path,PathBuf},process::{Command,Stdio},time::{Duration,Instant}};
use marqdo::ast::{Arg,Expr,Stmt};
use serde_json::{json,Value};
use sha2::{Digest,Sha256};
fn digest(raw:&[u8])->String{format!("{:x}",Sha256::digest(raw))}
fn id(text:&str)->Result<&str,String>{if text.is_empty()||text.len()>120||!text.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'_'||b==b'-'){Err("invalid identity".into())}else{Ok(text)}}
fn text<'a>(v:&'a Value,key:&str)->Result<&'a str,String>{v[key].as_str().ok_or_else(||format!("missing {key}"))}
fn context(v:&Value)->Result<&Value,String>{if v["context"].is_object(){Ok(&v["context"])}else{Err("trusted context required".into())}}
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
fn expression(e:&Expr,names:&HashSet<String>,locals:&HashSet<String>,calls:&mut Vec<String>)->Result<(),String>{
 match e{
  Expr::Literal(_)=>Ok(()),
  Expr::Var(n)=>if locals.contains(n){Ok(())}else{Err(format!("unbound value {n}"))},
  Expr::Interp(parts)=>{for part in parts{match part{marqdo::ast::InterpPart::Lit(_)=>{},marqdo::ast::InterpPart::Var(n)|marqdo::ast::InterpPart::Index{base:n,..}=>if !locals.contains(n){return Err(format!("unbound interpolation {n}"))}}}Ok(())},
  Expr::List(items)=>{for item in items{expression(item,names,locals,calls)?}Ok(())},
  Expr::Map(items)=>{for (_,item) in items{expression(item,names,locals,calls)?}Ok(())},
  Expr::Call(call)=>{
   if call.receiver.is_some()||!call.pre_modifiers.is_empty(){return Err("dynamic calls are not available in this call site".into())}
   let path=call.path.as_deref().unwrap_or(&[]);
   if path.len()!=2||path[0]!="api"||!names.contains(&path[1]){return Err("call is outside the supplied document".into())}
   calls.push(path.join("."));for arg in &call.args{match arg{Arg::Named{value,..}|Arg::Positional(value)=>expression(value,names,locals,calls)?}}Ok(())
  },
  Expr::Occluded{payload:Some(value),..}=>expression(value,names,locals,calls),
  Expr::Unary{expr,..}=>expression(expr,names,locals,calls),
  Expr::Binary{left,right,..}=>{expression(left,names,locals,calls)?;expression(right,names,locals,calls)},
  Expr::Index{base,label}=>{if let marqdo::ast::IndexKey::Var(n)=label{if !locals.contains(n){return Err("unbound index".into())}}expression(base,names,locals,calls)},
  Expr::Code(code)=>if matches!(code.lang.as_str(),"mq"|"marqdo"|"markdown"|"text"){Ok(())}else{Err("foreign code is not a Marqdo call argument".into())},
  _=>Err("unsupported expression in a restricted call document".into())
 }
}
fn validate(source:&str,api:&Path)->Result<Value,String>{
 let module=parser(source)?;let allowed=parser(&fs::read_to_string(api).map_err(|e|e.to_string())?)?;
 let names:HashSet<_>=allowed.functions.iter().map(|f|f.name.clone()).collect();
 if module.imports.len()!=1||module.imports[0].bind!="api"||Path::new(&module.imports[0].path)!=api||!module.uses.is_empty(){return Err("call imports do not match the supplied document".into())}
 if module.functions.len()!=1{return Err("one call entry required".into())}
 let fun=&module.functions[0];if fun.name!="act"||!fun.children.is_empty()||!fun.params.is_empty()||fun.level!=2{return Err("call entry signature cannot be changed".into())}
 let mut locals=HashSet::new();let mut calls=vec![];let mut returned=false;
 for stmt in &fun.body{
  if returned{return Err("executable statement after return".into())}
  match stmt{
   Stmt::Assign{name,value,..}=>{if name=="api"{return Err("document bind is immutable".into())}expression(value,&names,&locals,&mut calls)?;locals.insert(name.clone());},
   Stmt::Return{value,..}=>{expression(value,&names,&locals,&mut calls)?;returned=true},
   Stmt::Expr{value,..}=>expression(value,&names,&locals,&mut calls)?,
   Stmt::Call{..}|Stmt::Branch{..}|Stmt::While{..}|Stmt::ForEach{..}=>return Err("call-site control flow belongs to the root document".into()),
  }
 }
 if !returned||calls.is_empty(){return Err("an actual document function call and return are required".into())}
 Ok(json!({"calls":calls,"sha256":digest(source.as_bytes()),"parser":"marqdo::load::parse_source_auto"}))
}
fn execute(v:&Value)->Result<Value,String>{
 let c=context(v)?;private_request(c)?;let project=PathBuf::from(text(c,"project")?);
 let api=descendants(Path::new(text(v,"api")?),&project.join("ext/root-skill/calls"))?;
 let source=text(v,"source")?;if source.len()>128*1024{return Err("call document exceeds bound".into())}
 let dir=directory(c)?;let unit=id(c["unit_id"].as_str().unwrap_or("root"))?;let role=id(text(c,"role")?)?;let step=v["step"].as_u64().ok_or("step required")?;
 let own=dir.join("actors").join(unit).join(role);fs::create_dir_all(&own).map_err(|e|e.to_string())?;
 let entry=own.join(format!("turn-{step}.mq.md"));super::atomic(&entry,source)?;
 let checked=match validate(source,&api){Ok(value)=>value,Err(message)=>{event(c,"call_rejected",json!({"id":unit,"role":role,"step":step,"message":message,"source_sha256":digest(source.as_bytes())}))?;return Err(message)}};
 let actor=own.join("context.json");super::atomic(&actor,&c.to_string())?;
 let scratch=own.join("work");fs::create_dir_all(&scratch).map_err(|e|e.to_string())?;
 let argv=vec!["call".to_string(),entry.to_string_lossy().into_owned(),"act".into(),"--args-json".into(),"-".into(),"--fs-root".into(),scratch.to_string_lossy().into_owned(),"--effects".into(),"plugin,fs.read,fs.write,process.exec,environment.read".into(),"--session".into(),format!("{}-{unit}-{role}",text(c,"run_id")?),"--json".into()];
 let ident=format!("{unit}-{role}-{step}");let child=c["unit_id"].is_string();
 let kind=if child{"child_tool_start"}else{"tool_start"};let mut data=json!({"id":if child{unit}else{&ident},"name":checked["calls"].as_array().and_then(|x|x.first()).cloned().unwrap_or(json!("act")),"arguments":{"source":source},"command":"marqdo call","role":role,"source_sha256":checked["sha256"]});event(c,kind,data.clone())?;
 let started=Instant::now();let mut command=Command::new("marqdo");command.args(&argv).current_dir(&scratch).env("QDAGENT_ACTOR_FILE",&actor).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
 let mut process=command.spawn().map_err(|e|e.to_string())?;process.stdin.take().unwrap().write_all(b"{}").map_err(|e|e.to_string())?;
 let output=bounded_wait(process,Duration::from_secs(90))?;
 let outer:Value=serde_json::from_slice(&output.0).unwrap_or(Value::Null);
 let ok=output.2==0&&outer["ok"]==true;let result=if ok{outer["result"].clone()}else{json!({"ok":false,"error":{"message":outer["error"].as_object().and_then(|x|x.get("message")).and_then(Value::as_str).unwrap_or("Marqdo execution failed")}})};
 let success=ok&&result["ok"]!=false;
 data["status"]=json!(if success{"succeeded"}else{"failed"});data["result"]=result.clone();data["elapsed_ms"]=json!(started.elapsed().as_millis());data["evidence"]=json!({"call":argv,"exit_code":output.2,"source_sha256":checked["sha256"]});data.as_object_mut().unwrap().remove("arguments");
 event(c,if child{"child_tool_end"}else{"tool_end"},data)?;Ok(result)
}
fn bounded_wait(mut child:std::process::Child,timeout:Duration)->Result<(Vec<u8>,Vec<u8>,i32),String>{
 let stdout=child.stdout.take().ok_or("stdout unavailable")?;let stderr=child.stderr.take().ok_or("stderr unavailable")?;
 let out=std::thread::spawn(move||{let mut b=vec![];let _=stdout.take(4*1024*1024+1).read_to_end(&mut b);b});let err=std::thread::spawn(move||{let mut b=vec![];let _=stderr.take(64*1024+1).read_to_end(&mut b);b});
 let started=Instant::now();let status=loop{if let Some(s)=child.try_wait().map_err(|e|e.to_string())?{break s}if started.elapsed()>timeout{let _=child.kill();let _=child.wait();return Err("child process deadline exceeded".into())}std::thread::sleep(Duration::from_millis(10))};
 let o=out.join().map_err(|_|"stdout reader failed")?;let e=err.join().map_err(|_|"stderr reader failed")?;if o.len()>4*1024*1024||e.len()>64*1024{return Err("child output exceeded bound".into())}Ok((o,e,status.code().unwrap_or(-1)))
}
fn model(v:&Value)->Result<Value,String>{
 let c=context(v)?;let req=private_request(c)?;let selected=text(v,"model_id")?;
 let config=if selected=="inherit"||selected==text(&req["context"],"model_selection")?{req["model"].clone()}else{req["child_models"][selected].clone()};if !config.is_object(){return Err("model identity was not authorized by host".into())}
 let messages=v["messages"].as_array().ok_or("Marqdo messages required")?;if messages.is_empty()||messages.len()>12{return Err("invalid message packet".into())}
 let budget=v["max_context_bytes"].as_u64().ok_or("context budget required")?;if budget==0||budget>1024*1024||v["messages"].to_string().len() as u64>budget{return Err("role context exceeds document budget".into())}
 let project=PathBuf::from(text(c,"project")?);let mut origins=vec![];for item in v["sources"].as_array().ok_or("instruction sources required")?{
  let path=descendants(Path::new(item.as_str().ok_or("source path required")?),&project)?;if !path.to_string_lossy().ends_with(".mq.md"){return Err("instructions require Marqdo source".into())}origins.push(json!({"path":path,"sha256":digest(&fs::read(&path).map_err(|e|e.to_string())?)}));
 }
 if origins.is_empty(){return Err("instruction provenance missing".into())}
 let packet=directory(c)?.join("packets");fs::create_dir_all(&packet).map_err(|e|e.to_string())?;let unit=id(c["unit_id"].as_str().unwrap_or("root"))?;let role=id(text(c,"role")?)?;let step=v["step"].as_u64().ok_or("step required")?;
 super::atomic(&packet.join(format!("{unit}-{role}-{step}.json")),&json!({"messages":messages,"origins":origins,"role":role,"unit_id":c["unit_id"]}).to_string())?;
 let child=c["unit_id"].is_string();event(c,if child{"child_model_start"}else{"model_start"},json!({"id":unit,"step":step,"title":v["title"],"model":selected,"role":role,"sources":origins,"context_bytes":v["messages"].to_string().len()}))?;
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
     if child{event(c,"child_update",json!({"id":unit,"event":projected,"text":data["text"],"role":role}))?}else{event(c,projected,data.clone())?}
    }
   },
   Ok(Err(_))=>{failure=Some("provider event stream failed".into());break},
   Err(std::sync::mpsc::RecvTimeoutError::Disconnected)=>break,
   Err(std::sync::mpsc::RecvTimeoutError::Timeout)=>{},
  }
 }
 let status=process.wait().map_err(|e|e.to_string())?;let _=errors.join();if !status.success()&&failure.is_none(){failure=Some("provider process failed".into())}
 event(c,if child{"child_model_end"}else{"model_end"},json!({"id":unit,"step":step,"status":if failure.is_none(){"succeeded"}else{"failed"},"role":role}))?;
 if let Some(error)=failure{return Err(error)}if answer.len()>128*1024||answer.trim().is_empty(){return Err("empty or oversized Marqdo response".into())}Ok(json!({"text":answer,"sources":origins}))
}
pub fn dispatch(v:&Value)->Result<Value,String>{
 match v["operation"].as_str().unwrap_or(""){
  "runtime_context"=>{let p=std::env::var("QDAGENT_ACTOR_FILE").map_err(|_|"actor context unavailable")?;serde_json::from_slice(&fs::read(p).map_err(|e|e.to_string())?).map_err(|e|e.to_string())},
  "runtime_event"=>{event(context(v)?,text(v,"kind")?,v["data"].clone())?;Ok(json!(true))},
  "runtime_model"=>model(v),
  "runtime_execute"=>execute(v),
  "runtime_validate"=>validate(text(v,"source")?,Path::new(text(v,"api")?)),
  "runtime_intent"=>{let source=text(v,"source")?;let parsed=parser(source)?;if !parsed.imports.is_empty()||!parsed.uses.is_empty()||parsed.functions.iter().any(|f|!f.body.is_empty()||!f.children.is_empty()){return Err("intent projection contains executable content".into())}Ok(json!({"sha256":digest(source.as_bytes()),"executable_statements":0,"text":source}))},
  "runtime_suite"=>{
   let c=context(v)?;id(text(c,"unit_id")?)?;if c["role"]!="test"{return Err("only test actor can freeze a suite".into())}
   let suite=&v["suite"];let cases=suite["cases"].as_array().ok_or("case list required")?;
   if cases.is_empty()||cases.len()>6||cases.iter().any(|case|!case.is_object()||case.get("input").is_none()||case.get("expected").is_none()){return Err("one to six explicit input/expected cases required".into())}
   let raw=suite.to_string();if raw.len()>128*1024{return Err("test suite exceeds bound".into())}
   Ok(json!({"sha256":digest(raw.as_bytes()),"count":cases.len(),"spec_sha256":suite["spec_sha256"],"outline_sha256":suite["outline_sha256"],"suite":suite}))
  },
  "runtime_suite_verify"=>{let suite=&v["tests"]["suite"];let raw=suite.to_string();if digest(raw.as_bytes())!=text(&v["tests"],"sha256")?{return Err("frozen tests digest mismatch".into())}Ok(suite.clone())},
  "runtime_document"=>{let c=context(v)?;let requested=Path::new(text(v,"path")?);let base=Path::new(text(c,"project")?).join("ext/root-skill");let path=descendants(requested,&base.join("runtime")).or_else(|_|descendants(requested,&base.join("guides")))?;if !path.to_string_lossy().ends_with(".mq.md"){return Err("Marqdo instruction source required".into())}let source=fs::read_to_string(path).map_err(|e|e.to_string())?;Ok(json!({"source":source}))},
  "runtime_handbook"=>{let c=context(v)?;let path=descendants(Path::new(text(v,"path")?),&Path::new(text(c,"project")?).join("ext/root-skill/calls"))?;let source=fs::read_to_string(path).map_err(|e|e.to_string())?;let module=parser(&source)?;let mut excerpts=vec![];for function in &module.functions{let start=function.span.line.saturating_sub(1)as usize;let end=function.body.iter().map(marqdo::ast::stmt_line).min().unwrap_or(function.span.line).saturating_sub(1)as usize;excerpts.push(source.lines().skip(start).take(end-start).collect::<Vec<_>>().join("\n"))}Ok(json!({"source":excerpts.join("\n\n")}))},
  "runtime_library"=>{let c=context(v)?;let module=text(v,"module")?;if module.is_empty()||!module.bytes().all(|b|b.is_ascii_lowercase()||b==b'_'){return Err("invalid standard module".into())}let p=Path::new(text(c,"project")?).join(format!("lib/{module}.mq.md"));let source=fs::read_to_string(p).map_err(|e|e.to_string())?;let section=text(v,"section")?;let doc=if section.is_empty(){source}else{let m=parser(&source)?;let function=m.functions.iter().find(|f|f.name==section).ok_or("unknown library function")?;let start=function.span.line.saturating_sub(1) as usize;let next=m.functions.iter().filter(|f|f.span.line>function.span.line).map(|f|f.span.line.saturating_sub(1)as usize).min().unwrap_or(source.lines().count());source.lines().skip(start).take(next-start).collect::<Vec<_>>().join("\n")};Ok(json!({"source":doc.chars().take(12000).collect::<String>()}))},
  "runtime_material"=>{let c=context(v)?;let rel=text(v,"path")?;if !rel.starts_with("uploads/"){return Err("only supplied material is visible at this call site".into())}let root=Path::new(text(c,"workspace")?);let p=descendants(&root.join(rel),&root.join("uploads"))?;let bytes=fs::read(p).map_err(|e|e.to_string())?;if bytes.len()>64*1024{return Err("material exceeds text context bound".into())}let source=String::from_utf8(bytes).map_err(|_|"binary material requires a document plugin")?;Ok(json!({"source":source}))},
  "runtime_reference"=>{
   let c=context(v)?;if !matches!(c["role"].as_str(),Some("intent"|"outline")){return Err("reference is outside this role's context".into())}
   let rel=text(v,"path")?;if !rel.ends_with(".md"){return Err("knowledge document required".into())}
   let base=Path::new(text(c,"project")?).join("kb");let path=descendants(&base.join(rel),&base)?;
   let raw=fs::read(&path).map_err(|e|e.to_string())?;if raw.len()>16*1024{return Err("selected reference exceeds context budget".into())}
   let source=String::from_utf8(raw.clone()).map_err(|_|"text reference required")?;Ok(json!({"source":source,"sha256":digest(&raw),"path":rel}))
  },
  "runtime_reuse"=>{
   let c=context(v)?;private_request(c)?;if c["role"]!="outline"{return Err("reuse query is outside planning context".into())}
   let query=text(v,"query")?;if query.is_empty()||query.len()>4096{return Err("invalid reuse query size".into())}
   let root=Path::new(text(c,"project")?).join("lib");let out=directory(c)?.join("reuse");
   let mut command=Command::new("marqdo");command.args(["knowledge","preflight",query]).arg(root).arg("--out").arg(out).args(["--min-candidates","1","--json"]).stdout(Stdio::piped()).stderr(Stdio::piped());
   let output=bounded_wait(command.spawn().map_err(|e|e.to_string())?,Duration::from_secs(60))?;
   if output.2!=0&&output.2!=2{return Err("official knowledge preflight failed".into())}
   let result:Value=serde_json::from_slice(&output.0).map_err(|_|"invalid knowledge preflight result")?;
   event(c,"knowledge_preflight",json!({"query":query,"decision":result["decision"],"status":result["status"]}))?;Ok(result)
  },
  _=>Err("unknown runtime I/O operation".into())
 }
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn official_ast_rejects_host_calls_and_control_flow(){let dir=std::env::temp_dir().join(format!("qd-parser-{}",std::process::id()));fs::create_dir_all(&dir).unwrap();let api=dir.join("api.mq.md");fs::write(&api,"---\nmarkup: occlusion\n---\n## ask\n\nReturn *None*.\n").unwrap();let header=format!("---\nmarkup: occlusion\nimport:\n  api: {}\n---\n\n## act\n\n",api.display());assert!(validate(&(header.clone()+"Return *api.ask()* ."),&api).is_ok());for body in ["Return *sys.env_get(name=\"HOME\")*.","Return *api.respond()*.","1. True\n  Return *api.ask()*."]{assert!(validate(&(header.clone()+body),&api).is_err(),"{body}")}fs::remove_dir_all(dir).unwrap();}
 #[test]fn intent_cannot_carry_hidden_executable_statements(){assert!(dispatch(&json!({"operation":"runtime_intent","source":"## scope\n\n公开业务意图。\n"})).is_ok());assert!(dispatch(&json!({"operation":"runtime_intent","source":"## scope\n\nWe **secret = 8**.\n"})).is_err());}
}
