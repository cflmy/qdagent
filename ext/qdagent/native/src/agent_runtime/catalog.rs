use super::*;

fn valid_slug(s:&str)->bool{!s.is_empty()&&s.len()<=48&&s.bytes().all(|b|b.is_ascii_lowercase()||b.is_ascii_digit()||b==b'-')&&!s.starts_with('-')&&!s.ends_with('-')}
fn scalar(src:&str,key:&str)->Option<String>{
 let front=src.strip_prefix("---\n")?.split("\n---").next()?;
 for line in front.lines(){
  if let Some(v)=line.strip_prefix(key).and_then(|s|s.strip_prefix(':')){
   let value=v.trim().trim_matches('"').to_string();
   if value.len()<=240&&!value.contains('\r')&&!value.contains('\n'){return Some(value)}
  }
 }
 None
}
pub(super) fn skill(c:&Value,id:&str)->Result<Value,String>{
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
 if !matches!(effects.as_str(),"read"|"model"|"compute"|"external"|"write"){return Err("agent.catalog.invalid_effects".into())}
 Ok(json!({"id":id,"description":purpose,"effects":effects,"sha256":digest(source.as_bytes()),"path":path.to_string_lossy()}))
}
pub(super) fn catalog(c:&Value)->Result<Value,String>{
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
