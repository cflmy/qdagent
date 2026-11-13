//! OS and compiler adapter for the document-native root skill.
//! The stage machine and authoring templates live in ext/root-skill/*.mq.md.
use std::{fs,io::{Read,Write},path::{Path,PathBuf},process::{Command,Stdio},time::{Duration,Instant}};
use serde_json::{json,Value};
use sha2::{Digest,Sha256};

fn digest(data:&[u8])->String {format!("{:x}",Sha256::digest(data))}
fn workspace(v:&Value)->Result<PathBuf,String>{
 let root=PathBuf::from(v["workspace"].as_str().ok_or("workspace required")?).canonicalize().map_err(|e|e.to_string())?;
 if !root.is_dir(){return Err("workspace is not a directory".into())}Ok(root)
}
fn source(root:&Path,rel:&str)->Result<PathBuf,String>{
 if rel.is_empty()||rel.starts_with('/')||rel.split('/').any(|p|p.is_empty()||p=="."||p=="..")||!rel.ends_with(".mq.md"){return Err("relative Marqdo source required".into())}
 let path=root.join(rel).canonicalize().map_err(|e|e.to_string())?;
 if !path.starts_with(root)||!path.is_file(){return Err("source escapes workspace".into())}
 if fs::metadata(&path).map_err(|e|e.to_string())?.len()>128*1024{return Err("source exceeds 128 KiB".into())}Ok(path)
}
fn run(args:&[String],input:&str,cwd:&Path)->Result<Value,String>{
 let mut cmd=Command::new("marqdo");cmd.args(args).current_dir(cwd).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
 let mut child=cmd.spawn().map_err(|e|e.to_string())?;
 child.stdin.take().unwrap().write_all(input.as_bytes()).map_err(|e|e.to_string())?;
 let stdout=child.stdout.take().unwrap();let stderr=child.stderr.take().unwrap();
 let out=std::thread::spawn(move||{let mut data=vec![];let _=stdout.take(2*1024*1024+1).read_to_end(&mut data);data});
 let err=std::thread::spawn(move||{let mut data=vec![];let _=stderr.take(256*1024+1).read_to_end(&mut data);data});
 let start=Instant::now();let status=loop{if let Some(s)=child.try_wait().map_err(|e|e.to_string())?{break s}if start.elapsed()>Duration::from_secs(25){let _=child.kill();let _=child.wait();return Err("Marqdo compiler/trial exceeded 25 seconds".into())}std::thread::sleep(Duration::from_millis(10))};
 let output=out.join().map_err(|_|"stdout reader failed")?;let errors=err.join().map_err(|_|"stderr reader failed")?;
 if output.len()>2*1024*1024||errors.len()>256*1024{return Err("compiler/trial output exceeded bound".into())}
 Ok(json!({"exit_code":status.code().unwrap_or(-1),"stdout":String::from_utf8_lossy(&output),"stderr":String::from_utf8_lossy(&errors),"elapsed_ms":start.elapsed().as_millis()}))
}
fn validate(root:&Path,path:&Path)->Result<Value,String>{
 let raw=fs::read(path).map_err(|e|e.to_string())?;
 let mlsp=run(&["mlsp".into()],&(json!({"id":1,"method":"validate","params":{"path":path}}).to_string()+"\n"),root)?;
 let parsed:Value=serde_json::from_str(mlsp["stdout"].as_str().unwrap_or("").lines().next().unwrap_or("")).unwrap_or(Value::Null);
 let check=run(&["check".into(),path.to_string_lossy().into_owned(),"--narrative-ratio".into(),"--json".into()],"",root)?;
 let labels=run(&["labels".into(),path.to_string_lossy().into_owned(),"--json".into()],"",root)?;
 let pending:Value=serde_json::from_str(labels["stdout"].as_str().unwrap_or("[]")).unwrap_or(Value::Null);
 let valid=parsed["ok"]==true&&parsed["result"]["ok"]==true&&check["exit_code"]==0&&labels["exit_code"]==0&&pending.is_array();
 Ok(json!({"valid":valid,"sha256":digest(&raw),"syntax":parsed,"contract":check,"pending_labels":pending}))
}
pub fn dispatch(v:&Value)->Result<Value,String>{
 let operation=v["operation"].as_str().unwrap_or("");
 if operation=="root_read"||operation=="root_cas"{
  let root=super::root(v)?;let _lock=super::lifecycle(&root)?;let path=root.join("data/dialogue/proj/root-skill.json");
  let mut state:Value=match fs::read_to_string(&path){Ok(raw)=>serde_json::from_str(&raw).map_err(|e|e.to_string())?,Err(e) if e.kind()==std::io::ErrorKind::NotFound=>json!({"revision":0}),Err(e)=>return Err(e.to_string())};
  if operation=="root_read"{return Ok(state)}
  let expected=v["revision"].as_u64().ok_or("expected revision required")?;
  if state["revision"].as_u64().unwrap_or(0)!=expected{return Err("root_skill.conflict: reload the latest state and retry".into())}
  state=v["state"].clone();let object=state.as_object_mut().ok_or("state must be a record")?;object.insert("revision".into(),json!(expected+1));
  let raw=state.to_string();if raw.len()>2*1024*1024{return Err("root skill state exceeds two MiB".into())}
  super::atomic(&path,&raw)?;return Ok(state)
 }
 if operation=="root_schema"{
  let project=PathBuf::from(v["project"].as_str().ok_or("project required")?).canonicalize().map_err(|e|e.to_string())?;
  let member=v["function"].as_str().ok_or("function required")?;
  if !["clarify_intent","outline","refine","integrate","status","author_unit","author_text","author_select","trial_unit"].contains(&member){return Err("unknown root skill contract".into())}
  let file=project.join("ext/root-skill/index.mq.md");
  let output=run(&["mlsp".into()],&(json!({"id":1,"method":"schema","params":{"path":file,"unit":member}}).to_string()+"\n"),&project)?;
  let parsed:Value=serde_json::from_str(output["stdout"].as_str().unwrap_or("").lines().next().unwrap_or("")).map_err(|e|e.to_string())?;
  if parsed["ok"]!=true{return Err(parsed.to_string())}return Ok(parsed["result"].clone())
 }
 let root=workspace(v)?;let path=source(&root,v["path"].as_str().ok_or("path required")?)?;
 let checked=validate(&root,&path)?;
 if operation=="root_check"{return Ok(checked)}
 if operation!="root_trial"&&operation!="root_smoke"{return Err("unknown root skill operation".into())}
 if checked["valid"]!=true{return Ok(json!({"passed":false,"check":checked}))}
 if checked["sha256"]!=v["sha256"]{return Err("source changed after validation".into())}
 let member=v["function"].as_str().ok_or("function required")?;
 if !member.starts_with("unit_")&&member!="run"{return Err("trial must call a generated function".into())}
 let cases=v["cases"].as_array().ok_or("cases must be an array")?;
 if cases.is_empty()||cases.len()>6{return Err("one to six explicit trial cases required".into())}
 let sandbox=root.join(".agent/root-trials").join(format!("{}-{}",member,std::process::id()));fs::create_dir_all(&sandbox).map_err(|e|e.to_string())?;
 let mut results=vec![];let mut passed=true;
 for case in cases{
  if !case.is_object()||case.get("input").is_none()||(operation!="root_smoke"&&case.get("expected").is_none()){return Err("each case needs input and expected, including explicit null".into())}
  let arguments=json!({"input":case["input"]});
  let output=run(&["call".into(),path.to_string_lossy().into_owned(),member.into(),"--args-json".into(),"-".into(),"--fs-root".into(),sandbox.to_string_lossy().into_owned(),"--effects".into(),"fs.read,fs.write".into(),"--json".into()],&arguments.to_string(),&sandbox)?;
  let envelope:Value=serde_json::from_str(output["stdout"].as_str().unwrap_or("")).unwrap_or(Value::Null);
  let matched=output["exit_code"]==0&&envelope["ok"]==true&&(operation=="root_smoke"||envelope["result"]==case["expected"]);
  passed&=matched;results.push(json!({"passed":matched,"input":case["input"],"expected":case["expected"],"actual":envelope,"evidence":output}));
 }
 if digest(&fs::read(&path).map_err(|e|e.to_string())?)!=checked["sha256"].as_str().unwrap_or(""){passed=false}
 Ok(json!({"passed":passed,"sha256":checked["sha256"],"cases":results,"pending_labels":checked["pending_labels"],"assurance":if operation=="root_smoke"{"integration_smoke"}else{"declared_cases"}}))
}

#[cfg(test)]mod tests{
 use super::*;
 #[test]fn authority_uses_compare_and_swap(){
  let root=std::env::temp_dir().join(format!("qd-root-cas-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
  let initial=dispatch(&json!({"operation":"root_read","root":root})).unwrap();assert_eq!(initial["revision"],0);
  let next=dispatch(&json!({"operation":"root_cas","root":root,"revision":0,"state":{"phase":"intent"}})).unwrap();assert_eq!(next["revision"],1);
  assert!(dispatch(&json!({"operation":"root_cas","root":root,"revision":0,"state":{"phase":"complete"}})).is_err());fs::remove_dir_all(root).unwrap();
 }
 #[test]fn source_paths_cannot_escape(){let root=std::env::temp_dir();assert!(source(&root,"../secret.mq.md").is_err());assert!(source(&root,"/secret.mq.md").is_err());}
}
