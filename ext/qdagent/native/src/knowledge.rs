
fn functions(source:&str)->Result<Vec<String>,String>{
 fn visit(items:&[marqdo::ast::Function],names:&mut Vec<String>){for f in items{if f.level>=2{names.push(f.name.clone())}visit(&f.children,names)}}
 let mut names=vec![];visit(&super::parser(source)?.functions,&mut names);
 let mut unique=std::collections::HashSet::new();if names.iter().any(|n|!unique.insert(n.clone())){return Err("published function names must be unambiguous".into())}
 Ok(names)
}
fn find_function<'a>(items:&'a [marqdo::ast::Function],name:&str)->Option<&'a marqdo::ast::Function>{
 for function in items{if function.level>=2&&function.name==name{return Some(function)}if let Some(found)=find_function(&function.children,name){return Some(found)}}None
}
fn copy_modules(v:&Value,dir:&Path)->Result<Value,String>{
 let Some(rel)=v["source_path"].as_str() else{return Ok(json!({}))};
 let c=super::context(v)?;let root=Path::new(super::text(c,"workspace")?);
 let path=super::descendants(&root.join(rel),root)?;
 let bundle=super::super::document_bundle::Bundle::collect(root,&path)?;
 if bundle.dependencies()!=v["reviewed_modules"]{return Err("knowledge modules changed after review; verify and review again".into())}
 let parent=bundle.entry.parent().ok_or("knowledge source parent missing")?;
 let mut dependencies=serde_json::Map::new();
 for (path,source) in &bundle.files{
  if *path==bundle.entry{continue}
  let rel=path.strip_prefix(parent).map_err(|_|"knowledge imports must remain inside the delivery directory")?;
  let target=dir.join(rel);fs::create_dir_all(target.parent().ok_or("module parent missing")?).map_err(|e|e.to_string())?;
  fs::write(target,source).map_err(|e|e.to_string())?;
  dependencies.insert(rel.to_string_lossy().into_owned(),json!(super::digest(source.as_bytes())));
 }
 Ok(Value::Object(dependencies))
}
fn check_modules(dir:&Path,record:&Value)->Result<(),String>{
 if let Some(items)=record["dependencies"].as_object(){for (rel,hash) in items{
  if Path::new(rel).components().any(|c|!matches!(c,std::path::Component::Normal(n) if !n.to_string_lossy().starts_with('.'))){return Err("invalid knowledge module path".into())}
  let file=super::descendants(&dir.join(rel),dir)?;
  if super::digest(&read(&file,1024*1024)?)!=*hash{return Err("knowledge module changed; review and republish".into())}
 }}
 Ok(())
}

use serde_json::{json,Value};
use std::{fs,io::{Read,Write},path::{Path,PathBuf},process::{Command,Stdio},os::{fd::AsRawFd,unix::fs::OpenOptionsExt}};
fn scope(c:&Value)->Result<PathBuf,String>{let root=Path::new(super::text(c,"project")?).join("data/knowledge/public");fs::create_dir_all(&root).map_err(|e|e.to_string())?;Ok(root)}
fn manager(c:&Value)->Result<(),String>{if matches!(c["admin_role"].as_str(),Some("super_admin"|"operator")){Ok(())}else{Err("administrator_required: 只有管理员可以创建、发布或写回公用知识".into())}}
fn valid(id:&str)->bool{id.len()==36&&id.bytes().all(|b|b.is_ascii_hexdigit()||b==b'-')}
fn entry(c:&Value,id:&str)->Result<PathBuf,String>{if !valid(id){return Err("invalid knowledge identity".into())}let base=scope(c)?;let path=base.join(id).join("index.mq.md");super::descendants(&path,&base)}
fn read(path:&Path,max:usize)->Result<Vec<u8>,String>{let f=fs::OpenOptions::new().read(true).custom_flags(libc::O_NOFOLLOW).open(path).map_err(|e|e.to_string())?;let mut bytes=vec![];f.take(max as u64+1).read_to_end(&mut bytes).map_err(|e|e.to_string())?;if bytes.len()>max{return Err("knowledge material exceeds bound".into())}Ok(bytes)}
fn process(mut cmd:Command,stdin:Option<&[u8]>,max:usize)->Result<Vec<u8>,String>{cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());let mut p=cmd.spawn().map_err(|e|e.to_string())?;if let Some(input)=stdin{p.stdin.take().ok_or("missing stdin")?.write_all(input).map_err(|e|e.to_string())?;}else{drop(p.stdin.take());}let mut out=vec![];p.stdout.take().ok_or("missing stdout")?.take(max as u64+1).read_to_end(&mut out).map_err(|e|e.to_string())?;if out.len()>max{let _=p.kill();let _=p.wait();return Err("knowledge output exceeds bound".into())}if !p.wait().map_err(|e|e.to_string())?.success(){if let Ok(report)=serde_json::from_slice::<Value>(&out){if let Some(message)=report["error"]["message"].as_str(){return Err(format!("{}: {}",report["error"]["code"].as_str().unwrap_or("knowledge.execution"),message.chars().take(1200).collect::<String>()))}}return Err("knowledge command failed or timed out".into())}Ok(out)}
fn lock(base:&Path)->Result<fs::File,String>{let f=fs::OpenOptions::new().create(true).truncate(false).read(true).write(true).custom_flags(libc::O_NOFOLLOW).open(base.join("execution.lock")).map_err(|e|e.to_string())?;if unsafe{libc::flock(f.as_raw_fd(),libc::LOCK_EX)}!=0{return Err("knowledge lock failed".into())}Ok(f)}
pub(super) fn extract(v:&Value)->Result<Value,String>{let c=super::context(v)?;manager(c)?;let root=Path::new(super::text(c,"workspace")?);let rel=super::text(v,"path")?;if !rel.starts_with("uploads/"){return Err("only supplied uploads can be compiled".into())}let path=super::descendants(&root.join(rel),&root.join("uploads"))?;let bytes=read(&path,50*1024*1024)?;let hash=super::digest(&bytes);
 let (text,format)=if path.extension().is_some_and(|x|x.eq_ignore_ascii_case("pdf")){if !bytes.starts_with(b"%PDF-"){return Err("invalid PDF signature".into())}let mut cmd=Command::new("timeout");cmd.args(["-s","KILL","35","pdftotext","-layout","-enc","UTF-8"]).arg(&path).arg("-");(String::from_utf8(process(cmd,None,1024*1024)?).map_err(|_|"PDF text is not UTF-8")?,"pdf") }else{if bytes.len()>1024*1024{return Err("source text exceeds 1 MiB".into())}(String::from_utf8(bytes).map_err(|_|"upload PDF or UTF-8 source text")?,"source")};
 if text.trim().is_empty(){return Err("No readable PDF text. Run the OCR skill for scanned pages before compiling; no knowledge was invented.".into())}
 let mut chunks=vec![];let mut index=0;for (page,content) in text.split('\u{c}').enumerate(){let chars=content.chars().collect::<Vec<_>>();for part in chars.chunks(12000){index+=1;if index>96{return Err("split the source into at most 96 compilation chunks".into())}let chunk=part.iter().collect::<String>();if chunk.trim().is_empty(){continue}let output=format!("uploads/knowledge-{}-{:03}.txt",&hash[..16],index);let stored=format!("Source: {rel}\nSHA256: {hash}\nPage: {}\nFragment: {index}\n\n{chunk}",page+1);fs::write(root.join(&output),&stored).map_err(|e|e.to_string())?;chunks.push(json!({"path":output,"page":page+1,"fragment":index,"sha256":super::digest(chunk.as_bytes()),"file_sha256":super::digest(stored.as_bytes())}));}}
 Ok(json!({"path":rel,"format":format,"sha256":hash,"chunks":chunks,"characters":text.chars().count()}))}
pub(super) fn publish(v:&Value)->Result<Value,String>{let c=super::context(v)?;manager(c)?;let source=super::text(v,"source")?;super::parser(source)?;if source.len()>1024*1024{return Err("knowledge document too large".into())}if v["verification"].to_string().len()>4*1024*1024||v["interfaces"].to_string().len()>1024*1024||super::text(v,"abstract")?.len()>16384{return Err("split the knowledge specification into smaller reviewed versions".into())}let id=super::text(v,"id")?;if !valid(id){return Err("invalid publication identity".into())}let base=scope(c)?;let dir=base.join(id);fs::create_dir(&dir).map_err(|e|e.to_string())?;let path=dir.join("index.mq.md");fs::write(&path,source).map_err(|e|e.to_string())?;fs::write(dir.join("decisions.mq.md"),super::text(v,"journal")?).map_err(|e|e.to_string())?;
 let dependencies=copy_modules(v,&dir)?;
 let workspace=Path::new(super::text(c,"workspace")?);for rel in v["attachments"].as_array().ok_or("attachments required")?{let rel=rel.as_str().ok_or("attachment path required")?;if !(rel.starts_with("uploads/")||rel.starts_with(".agent/children/")||rel.starts_with("solution/documents/")){return Err("attachment is outside supplied or verified content".into())}let input=super::descendants(&workspace.join(rel),workspace)?;let data=read(&input,50*1024*1024)?;let target=dir.join(rel);if Path::new(rel).components().any(|x|!matches!(x,std::path::Component::Normal(_))){return Err("attachment path escapes library".into())}fs::create_dir_all(target.parent().ok_or("attachment parent")?).map_err(|e|e.to_string())?;fs::write(target,data).map_err(|e|e.to_string())?;}
 let mut check=Command::new("timeout");check.args(["35","marqdo","check"]).arg(&path).args(["--narrative-ratio","--json"]);let diagnostics=process(check,None,65536)?;if !String::from_utf8_lossy(&diagnostics).trim().is_empty(){return Err("knowledge publication has compiler diagnostics".into())}
 let mut compiler=Command::new("timeout");compiler.args(["35","marqdo","knowledge","compile"]).arg(&path).arg("-o").arg(dir.join(".knowledge")).arg("--json");let projection=process(compiler,None,131072)?;
 let record=json!({"id":format!("compiled/{id}/index.mq.md"),"key":id,"name":super::text(v,"title")?,"task":c["id"],"status":v["status"],"sha256":super::digest(source.as_bytes()),"sources":v["provenance"],"journal_sha256":super::digest(super::text(v,"journal")?.as_bytes()),"interfaces_sha256":super::digest(v["interfaces"].to_string().as_bytes()),"abstract_sha256":super::digest(super::text(v,"abstract")?.as_bytes()),"verification_sha256":super::digest(v["verification"].to_string().as_bytes()),"compiled_at":std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64,"dependencies":dependencies,"functions":functions(source)?,"assurance":v["assurance"]});
 fs::write(dir.join("verification.json"),v["verification"].to_string()).map_err(|e|e.to_string())?;fs::create_dir_all(dir.join("contracts")).map_err(|e|e.to_string())?;for(function,body)in v["interfaces"].as_object().ok_or("frozen interfaces required")?{if !function.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'_'){return Err("invalid contract symbol".into())}fs::write(dir.join("contracts").join(format!("{function}.intent.md")),body.as_str().ok_or("intent text required")?).map_err(|e|e.to_string())?;}fs::write(dir.join("interfaces.json"),v["interfaces"].to_string()).map_err(|e|e.to_string())?;fs::write(dir.join("abstract.mq.md"),super::text(v,"abstract")?).map_err(|e|e.to_string())?;fs::write(dir.join("compiler.json"),projection).map_err(|e|e.to_string())?;fs::write(dir.join("record.json"),record.to_string()).map_err(|e|e.to_string())?;Ok(record)}
pub(super) fn list(v:&Value)->Result<Value,String>{let base=scope(super::context(v)?)?;let mut out=vec![];for d in fs::read_dir(base).map_err(|e|e.to_string())?.take(300){let d=d.map_err(|e|e.to_string())?;if d.file_type().map_err(|e|e.to_string())?.is_dir(){if let Ok(raw)=read(&d.path().join("record.json"),65536){if let Ok(record)=serde_json::from_slice::<Value>(&raw){out.push(record)}}}}out.sort_by(|a,b|b["compiled_at"].as_u64().cmp(&a["compiled_at"].as_u64()));Ok(json!(out))}
pub(super) fn document(v:&Value)->Result<Value,String>{let c=super::context(v)?;let path=entry(c,super::text(v,"id")?)?;let _guard=lock(path.parent().ok_or("entry parent")?)?;let raw=read(&path,1024*1024)?;let record:Value=serde_json::from_slice(&read(&path.with_file_name("record.json"),65536)?).map_err(|e|e.to_string())?;if record["sha256"]!=super::digest(&raw){return Err("knowledge source changed; review and republish".into())}for (file,key) in [("abstract.mq.md","abstract_sha256"),("verification.json","verification_sha256"),("decisions.mq.md","journal_sha256")]{if super::digest(&read(&path.with_file_name(file),4*1024*1024)?)!=record[key]{return Err("knowledge evidence changed; review and republish".into())}}check_evidence(path.parent().ok_or("entry parent")?,&record)?;Ok(json!({"source":String::from_utf8(raw).map_err(|_|"text knowledge required")?,"record":record,"root":path.parent().ok_or("entry parent")?}))}
pub(super) fn reference(c:&Value,rel:&str)->Result<Value,String>{let parts=rel.split('/').collect::<Vec<_>>();if parts.len()!=3||parts[0]!="compiled"||parts[2]!="index.mq.md"{return Err("invalid compiled knowledge reference".into())}let path=entry(c,parts[1])?;let raw=read(&path.with_file_name("abstract.mq.md"),16384)?;Ok(json!({"source":String::from_utf8(raw.clone()).map_err(|_|"text reference required")?,"sha256":super::digest(&raw),"path":rel}))}
// K1: read-only official knowledge projections. The official CLI is the only
// parser; this boundary adds bounds, a private receipt cache and JSON framing.
pub(super) fn proof(v:&Value)->Result<Value,String>{
 let c=super::context(v)?;let kind=super::text(v,"kind")?;
 let project=Path::new(super::text(c,"project")?).to_path_buf();
 let root=match v["target"].as_str(){
  Some(rel)=>{let joined=project.join(rel);let path=joined.canonicalize().map_err(|e|e.to_string())?;if !path.starts_with(project.canonicalize().map_err(|e|e.to_string())?){return Err("knowledge projection target escapes the project".into())}path}
  None=>project.clone(),
 };
 let mut command=Command::new("timeout");command.args(["-s","KILL","90","marqdo","knowledge","--json"]);
 match kind{
  "inspect"=>{command.arg("inspect").arg(super::text(v,"symbol")?).arg(&root);}
  "proof_deps"=>{let cache=Path::new(super::text(c,"workspace")?).join(".knowledge-projections");fs::create_dir_all(&cache).map_err(|e|e.to_string())?;command.arg("proof-deps").arg(&root).arg("-o").arg(cache);}
  "impact"=>{let query=super::text(v,"query")?;if query.is_empty()||query.chars().count()>200{return Err("invalid impact query".into())}command.arg("impact").arg(query).arg(&root);}
  _=>return Err("unknown knowledge projection kind".into()),
 }
 let raw=process(command,None,262144)?;
 let report:Value=serde_json::from_slice(&raw).map_err(|e|e.to_string())?;
 Ok(json!({"kind":kind,"report":report}))
}
// Compare the official AST while ignoring only source locations and map iteration order.
// Managed writeback blocks move subsequent statements without changing behavior.
fn program_identity(mut module:marqdo::ast::Module)->String{
 use marqdo::{ast::{Function,Stmt},diagnostics::Span};
 fn statements(body:&mut [Stmt]){for s in body{match s{
  Stmt::Assign{span,end_line,..}=>{*span=Span::new(0,0);*end_line=0},
  Stmt::Return{span,..}|Stmt::Call{span,..}|Stmt::Expr{span,..}=>*span=Span::new(0,0),
  Stmt::Branch{arms,span}=>{*span=Span::new(0,0);for arm in arms{statements(&mut arm.body)}},
  Stmt::While{body,span,..}|Stmt::ForEach{body,span,..}=>{*span=Span::new(0,0);statements(body)}
 }}}
 fn functions(items:&mut [Function],contracts:&mut Vec<String>){for f in items{
  f.span=Span::new(0,0);for p in &mut f.params{p.span=Span::new(0,0)}
  if let Some(c)=&mut f.contract{c.start_line=0;c.end_line=0}
  for claim in &mut f.claims{claim.line=0}
  let mut vars=std::collections::BTreeMap::new();for (key,mut c) in f.var_contracts.drain(){c.start_line=0;c.end_line=0;vars.insert(key,c);}
  contracts.push(format!("{}:{vars:?}",f.name));statements(&mut f.body);functions(&mut f.children,contracts)
 }}
 let mut contracts=vec![];functions(&mut module.functions,&mut contracts);
 format!("{:?}:{:?}:{:?}:{:?}:{contracts:?}",module.imports,module.uses,module.metadata_raw,module.functions)
}
fn check_evidence(dir:&Path,record:&Value)->Result<(),String>{check_modules(dir,record)?;let mut contracts=serde_json::Map::new();for function in record["functions"].as_array().ok_or("function facts missing")?{let name=function.as_str().ok_or("function name missing")?;if !name.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'_'){return Err("invalid contract symbol".into())}let raw=read(&dir.join("contracts").join(format!("{name}.intent.md")),1024*1024)?;contracts.insert(name.into(),json!(String::from_utf8(raw).map_err(|_|"contract text required")?));}if super::digest(Value::Object(contracts).to_string().as_bytes())!=record["interfaces_sha256"]{return Err("knowledge contracts changed; review and republish".into())}for(file,key)in[("abstract.mq.md","abstract_sha256"),("verification.json","verification_sha256"),("decisions.mq.md","journal_sha256")]{if super::digest(&read(&dir.join(file),4*1024*1024)?)!=record[key]{return Err("knowledge evidence changed; review and republish".into())}}Ok(())}
pub(super) fn execute(v:&Value)->Result<Value,String>{let c=super::context(v)?;let id=super::text(v,"id")?;let path=entry(c,id)?;let dir=path.parent().ok_or("entry parent")?;let _guard=lock(dir)?;let before=read(&path,1024*1024)?;let mut record:Value=serde_json::from_slice(&read(&dir.join("record.json"),65536)?).map_err(|e|e.to_string())?;if record["sha256"]!=super::digest(&before){return Err("knowledge source changed; review and republish".into())}
 check_evidence(dir,&record)?;let function=super::text(v,"function")?;let source=std::str::from_utf8(&before).map_err(|_|"UTF-8 source required")?;let module=super::parser(source)?;if !functions(source)?.iter().any(|name|name==function){return Err("unknown knowledge function".into())}let writeback=false;
 let mut cmd=Command::new("timeout");cmd.args(["-s","KILL","35","marqdo","call"]).arg(&path).arg(function).args(["--args-json","-","--json","--fs-root"]).arg(dir).args(["--effects","fs.read"]).current_dir(dir);
 let result=process(cmd,Some(json!({"input":v["input"]}).to_string().as_bytes()),262144);let after=read(&path,1024*1024)?;
 if after!=before{let same=super::parser(std::str::from_utf8(&after).map_err(|_|"UTF-8 source required")?).map(|m|program_identity(m)==program_identity(module.clone())).unwrap_or(false);if !writeback||!same{fs::write(&path,&before).map_err(|e|e.to_string())?;return Err("execution attempted to change reviewed control flow".into())}record["sha256"]=json!(super::digest(&after));super::super::atomic(&dir.join("record.json"),&record.to_string())?;}
 let envelope:Value=serde_json::from_slice(&result?).map_err(|e|e.to_string())?;if envelope["ok"]!=true{return Err("knowledge function failed".into())}Ok(json!({"result":envelope["result"],"write_back":writeback,"sha256":record["sha256"],"function":function}))}

pub(super) fn contract(v:&Value)->Result<Value,String>{let c=super::context(v)?;let id=super::text(v,"id")?;let function=super::text(v,"function")?;let observed=document(&json!({"context":c,"id":id}))?;let dir=Path::new(observed["root"].as_str().ok_or("knowledge root missing")?);if !function.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'_')||!observed["record"]["functions"].as_array().ok_or("function facts missing")?.iter().any(|n|n.as_str()==Some(function)){return Err("unknown published knowledge contract".into())}let contract=String::from_utf8(read(&dir.join("contracts").join(format!("{function}.intent.md")),16384)?).map_err(|_|"contract text required")?;if contract.len()>16384{return Err("function contract exceeds context budget; split the specification".into())}Ok(json!({"function":function,"contract":contract,"document":id}))}
// Apply a computed output using the official writeback function on a private copy.
// Reviewed business code is never granted write access by the service.
pub(super) fn writeback(v:&Value)->Result<Value,String>{
 let c=super::context(v)?;let path=entry(c,super::text(v,"id")?)?;let dir=path.parent().ok_or("entry parent")?;let _guard=lock(dir)?;let before=read(&path,1024*1024)?;
 manager(c)?;
 let mut record:Value=serde_json::from_slice(&read(&dir.join("record.json"),65536)?).map_err(|e|e.to_string())?;
 if record["sha256"]!=super::digest(&before)||v["expected_sha256"]!=record["sha256"]{return Err("knowledge changed after calculation; run again".into())}
 check_evidence(dir,&record)?;
 let source=std::str::from_utf8(&before).map_err(|_|"UTF-8 source required")?;let module=super::parser(source)?;
 let replay=find_function(&module.functions,"replay").ok_or("replay function missing")?;
 let anchor=replay.body.last().map(|s|match s{marqdo::ast::Stmt::Return{span,..}=>span.line,_=>0}).unwrap_or(0);if anchor==0{return Err("replay anchor missing".into())}
 let name=format!("qd_record_{}_{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
 let temp=std::env::temp_dir().join(&name);fs::create_dir(&temp).map_err(|e|e.to_string())?;
 struct Cleanup(PathBuf);impl Drop for Cleanup{fn drop(&mut self){let _=fs::remove_dir_all(&self.0);}}let _cleanup=Cleanup(temp.clone());
 use std::os::unix::fs::PermissionsExt;fs::set_permissions(&temp,fs::Permissions::from_mode(0o700)).map_err(|e|e.to_string())?;
 super::super::document_bundle::Bundle::collect(dir,&path)?.write(&temp)?;
 let input=temp.join("index.mq.md");let wrapper=format!("{source}\n\n## {name}\n\nUse `value`。\nWe **saved = writeback.record(value=`value`,key=\"verification\",line={anchor})**.\nReturn *value*.\n");fs::write(&input,wrapper).map_err(|e|e.to_string())?;
 let mut cmd=Command::new("timeout");cmd.args(["-s","KILL","20","marqdo","call"]).arg(&input).arg(&name).args(["--args-json","-","--json","--fs-root"]).arg(&temp).args(["--effects","fs.read,fs.write"]).current_dir(&temp);
 process(cmd,Some(json!({"value":v["value"]}).to_string().as_bytes()),262144)?;
 let candidate=fs::read_to_string(&input).map_err(|e|e.to_string())?;let parsed=super::parser(&candidate)?;let helper=find_function(&parsed.functions,&name).ok_or("recording helper missing")?;
 let next=candidate.lines().take(helper.span.line.saturating_sub(1)as usize).collect::<Vec<_>>().join("\n")+"\n";
 if program_identity(super::parser(&next)?)!=program_identity(module){return Err("writeback changed reviewed function structure".into())}
 super::super::atomic(&path,&next)?;record["sha256"]=json!(super::digest(next.as_bytes()));super::super::atomic(&dir.join("record.json"),&record.to_string())?;
 Ok(json!({"result":v["value"]["result"],"input":v["value"]["input"],"write_back":true,"sha256":record["sha256"],"function":v["value"]["function"]}))
}

pub(super) fn verification(v:&Value)->Result<Value,String>{let data=document(v)?;let root=Path::new(data["root"].as_str().ok_or("knowledge root missing")?);serde_json::from_slice(&read(&root.join("verification.json"),4*1024*1024)?).map_err(|e|e.to_string())}
#[cfg(test)]
mod proof_tests{
 use super::*;
 #[test]fn knowledge_projections_are_official_read_only(){
  let temp=crate::document_bundle::Temporary::new().unwrap();
  let project=temp.0.join("proj");fs::create_dir_all(&project).unwrap();
  fs::write(project.join("tiny.mq.md"),"---\nmarkup: occlusion\ntitle: t\n---\n\n## add\n\n| 参数 | 类型 | 默认 | 说明 |\n|---|---|---|---|\n| a | integer | required | 加数 |\n| b | integer | required | 被加数 |\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | integer | 和 |\n\nUse `a`, `b`。\n\n固定纯函数示例。\n\nReturn *`a` + `b`*.\n").unwrap();
  let workspace=temp.0.join("ws");fs::create_dir_all(&workspace).unwrap();
  let ctx=json!({"id":"knowledge","owner":"tester","admin_role":"admin","knowledge_scope":"public","project":project.to_string_lossy(),"workspace":workspace.to_string_lossy()});
  let inspected=proof(&json!({"context":ctx,"kind":"inspect","symbol":"add"})).unwrap();
  let symbol=&inspected["report"]["symbols"][0];
  assert_eq!(symbol["id"],"mq://proj/tiny/function/add");
  assert_eq!(symbol["kind"],"function");
  let deps=proof(&json!({"context":ctx,"kind":"proof_deps"})).unwrap();
  assert_eq!(deps["report"]["schema_version"],1);
  assert!(deps["report"]["proof_completion"].as_str().unwrap().contains("not_established"));
  assert!(proof(&json!({"context":ctx,"kind":"inspect","symbol":"add","target":"../../escape"})).is_err());
  assert!(proof(&json!({"context":ctx,"kind":"astral"})).is_err());
 }
}
