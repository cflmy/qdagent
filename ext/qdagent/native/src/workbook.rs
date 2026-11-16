//! Atomic edits of AST-selected sections. Workflow and instructions stay in MQ.
use std::{fs,io::Write,ops::Range,path::Path};
use marqdo::ast::{Function,Module};
use serde_json::{json,Value};
use super::{digest,source,workspace};

fn parse(raw:&str)->Result<Module,String>{marqdo::load::parse_source_auto(raw).map_err(|e|e.to_string())}
fn functions<'a>(items:&'a [Function],out:&mut Vec<&'a Function>){for item in items{out.push(item);functions(&item.children,out)}}
fn range(raw:&str,name:&str)->Result<Range<usize>,String>{
 let module=parse(raw)?;let mut all=vec![];functions(&module.functions,&mut all);
 let found=all.iter().filter(|f|f.name==name&&f.level==2).collect::<Vec<_>>();
 if found.len()!=1{return Err("approved function section is missing or ambiguous".into())}
 let function=found[0];if !function.children.is_empty(){return Err("nested implementations are outside a function section".into())}
 let start=function.span.line.saturating_sub(1) as usize;
 let end=all.iter().filter(|f|f.span.line>function.span.line&&f.level<=2).map(|f|f.span.line.saturating_sub(1)as usize).min().unwrap_or(raw.lines().count());
 let offsets=std::iter::once(0).chain(raw.match_indices('\n').map(|(i,_)|i+1)).collect::<Vec<_>>();
 Ok(*offsets.get(start).ok_or("section line is invalid")?..*offsets.get(end).unwrap_or(&raw.len()))
}
fn fragment(raw:&str,name:&str)->Result<String,String>{Ok(raw[range(raw,name)?].trim_end().to_string()+"\n")}
fn imports_match(raw:&str,header:&str)->Result<(),String>{
 if !raw.starts_with(header){return Err("shared workbook header changed".into())}
 let actual=parse(raw)?;let trusted=parse(header)?;
 if actual.imports.len()!=trusted.imports.len()||!actual.uses.is_empty()||actual.imports.iter().zip(trusted.imports.iter()).any(|(a,b)|a.bind!=b.bind||a.path!=b.path){return Err("shared workbook imports changed".into())}Ok(())
}
fn identity(v:&Value)->Result<(String,String),String>{
 let id=v["unit_id"].as_str().ok_or("function identity required")?;
 if id.is_empty()||id.len()>32||!id.bytes().all(|b|b.is_ascii_lowercase()||b.is_ascii_digit()||b==b'_'){return Err("invalid function identity".into())}
 Ok((id.into(),format!("unit_{id}")))
}
fn meta(root:&Path)->Result<Value,String>{serde_json::from_slice(&fs::read(root.join(".agent/workbook.json")).map_err(|e|e.to_string())?).map_err(|e|e.to_string())}
fn record(raw:&str,metadata:&Value,id:&str,name:&str)->Result<Value,String>{
 let header=metadata["header"].as_str().ok_or("workbook header missing")?;imports_match(raw,header)?;
 if !metadata["functions"].as_array().ok_or("approved sections missing")?.iter().any(|f|f==name){return Err("function is outside the approved workbook".into())}
 let part=fragment(raw,name)?;let canonical=header.to_string()+&part;
 Ok(json!({"id":id,"function":name,"path":"solution/index.mq.md","fragment":part,"source":canonical,"sha256":digest(canonical.as_bytes())}))
}
fn atomic(path:&Path,raw:&str)->Result<(),String>{
 let tmp=path.with_extension(format!("pending.{}",std::process::id()));
 let mut file=fs::OpenOptions::new().create(true).truncate(true).write(true).open(&tmp).map_err(|e|e.to_string())?;
 file.write_all(raw.as_bytes()).and_then(|_|file.sync_all()).map_err(|e|e.to_string())?;
 fs::rename(tmp,path).map_err(|e|e.to_string())
}
pub fn dispatch(v:&Value)->Result<Value,String>{
 use std::os::fd::AsRawFd;
 let root=workspace(v)?;fs::create_dir_all(root.join(".agent")).map_err(|e|e.to_string())?;
 let lock=fs::OpenOptions::new().create(true).truncate(false).write(true).open(root.join(".agent/workbook.lock")).map_err(|e|e.to_string())?;
 if unsafe{libc::flock(lock.as_raw_fd(),libc::LOCK_EX)}!=0{return Err("workbook lock failed".into())}
 // The descriptor releases the lock on all return/error paths.
 let target=root.join("solution/index.mq.md");
 let operation=v["operation"].as_str().unwrap_or("");
 if operation=="root_workbook_init"{
  let plan=fs::read_to_string(source(&root,"solution/plan.mq.md")?).map_err(|e|e.to_string())?;
  let expected=v["outline_sha256"].as_str().ok_or("approved outline digest required")?;
  if digest(plan.as_bytes())!=expected{return Err("approved outline source changed".into())}
  let header=v["header"].as_str().ok_or("trusted header required")?;
  let parsed=parse(header)?;if !parsed.functions.is_empty()||!parsed.uses.is_empty(){return Err("invalid workbook header".into())}
  let old=meta(&root).ok();
  if let Some(metadata)=old.as_ref(){if metadata["outline_sha256"]==expected&&metadata["generation"]==v["generation"]&&target.exists(){
   let raw=fs::read_to_string(source(&root,"solution/index.mq.md")?).map_err(|e|e.to_string())?;
   let mut records=vec![];for unit in v["units"].as_array().ok_or("approved units required")?{let id=unit["id"].as_str().ok_or("unit identity required")?;records.push(record(&raw,metadata,id,&format!("unit_{id}"))?)}
   return Ok(json!({"path":"solution/index.mq.md","sections":records}));
  }}
  let mut raw=header.to_string();raw.push_str(v["preamble"].as_str().ok_or("workbook narration required")?);raw.push_str("\n\n");
  let mut names=vec![];let mut published=vec![];
  for unit in v["units"].as_array().ok_or("approved units required")?{
   let id=unit["id"].as_str().ok_or("unit identity required")?;let name=format!("unit_{id}");let mut part=fragment(&plan,&name)?;
   // Retain readable legacy implementations only when their recorded bytes match.
   if old.is_none(){if let (Some(path),Some(sha))=(unit["path"].as_str(),unit["sha256"].as_str()){
    if path.starts_with("solution/units/"){if let Ok(path)=source(&root,path){let candidate=fs::read_to_string(path).map_err(|e|e.to_string())?;
     if digest(candidate.as_bytes())==sha&&imports_match(&candidate,header).is_ok(){part=fragment(&candidate,&name)?;published.push(id.to_string())}
    }}
   }}
   raw.push_str(&part);raw.push('\n');names.push(name);
  }
  if raw.len()>1024*1024{return Err("shared workbook exceeds one MiB".into())}parse(&raw)?;
  let metadata=json!({"header":header,"outline_sha256":expected,"generation":v["generation"],"functions":names});
  atomic(&target,&raw)?;atomic(&root.join(".agent/workbook.json"),&metadata.to_string())?;
  let mut records=vec![];for unit in v["units"].as_array().unwrap(){let id=unit["id"].as_str().unwrap();let mut item=record(&raw,&metadata,id,&format!("unit_{id}"))?;item["migrated"]=json!(published.iter().any(|x|x==id));records.push(item)}
  return Ok(json!({"path":"solution/index.mq.md","sections":records}));
 }
 let metadata=meta(&root)?;let raw=fs::read_to_string(source(&root,"solution/index.mq.md")?).map_err(|e|e.to_string())?;
 let (id,name)=identity(v)?;
 let existing=record(&raw,&metadata,&id,&name)?;
 if operation=="root_section_read"{return Ok(existing)}
 if operation!="root_section_write"{return Err("unknown section I/O operation".into())}
 if let Ok(actor)=std::env::var("QDAGENT_ACTOR_FILE"){
  let actor:Value=serde_json::from_slice(&fs::read(actor).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
  if actor["unit_id"].is_string()&&(actor["unit_id"]!=id||actor["role"]!="implement"||actor["workspace"]!=v["workspace"]){return Err("author can only fill its assigned function section".into())}
 }
 let candidate=fs::read_to_string(source(&root,v["candidate"].as_str().ok_or("checked candidate required")?)?).map_err(|e|e.to_string())?;
 let parsed=parse(&candidate)?;
 if parsed.functions.len()!=1||parsed.functions[0].name!=name||parsed.functions[0].level!=2||!parsed.functions[0].children.is_empty()||parsed.functions[0].params.iter().any(|p|p.name!="input"){return Err("candidate must implement exactly its assigned function and input contract".into())}
 let next=record(&candidate,&metadata,&id,&name)?;
 if let Some(expected)=v["expected_sha256"].as_str(){if existing["sha256"]!=expected&&existing["sha256"]!=next["sha256"]{return Err("assigned function changed since the last observation".into())}}
 let mut updated=raw.clone();updated.replace_range(range(&raw,&name)?,&(next["fragment"].as_str().unwrap().to_string()+"\n"));
 if updated.len()>1024*1024{return Err("shared workbook exceeds one MiB".into())}parse(&updated)?;
 atomic(&target,&updated)?;record(&updated,&metadata,&id,&name)
}

#[cfg(test)]mod tests{
 use super::*;
 #[test]fn official_ast_preserves_neighbor_sections_and_fenced_headings(){
  let raw="## unit_a\n\nReturn *1*.\n\n## unit_b\n\n`note` =\n```markdown\n## not_a_function\n```\nReturn *2*.\n";
  let a=range(raw,"unit_a").unwrap();let mut next=raw.to_string();next.replace_range(a,"## unit_a\n\nReturn *3*.\n\n");
  assert_eq!(fragment(raw,"unit_b").unwrap(),fragment(&next,"unit_b").unwrap());assert!(range(raw,"not_a_function").is_err());
 }
}
