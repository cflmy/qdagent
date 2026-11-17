//! Bounded, data-only copies of document imports, resolved by the official parser.
use std::{collections::{BTreeMap,HashSet},fs,io::Read,path::{Component,Path,PathBuf},process::{Command,Stdio}};
use serde_json::{json,Value};
use sha2::{Digest,Sha256};
use std::os::unix::fs::{OpenOptionsExt,PermissionsExt};
const FILE_LIMIT:usize=1024*1024;
const TOTAL_LIMIT:usize=4*1024*1024;
fn read(path:&Path)->Result<String,String>{
 let file=fs::OpenOptions::new().read(true).custom_flags(libc::O_NOFOLLOW).open(path).map_err(|e|e.to_string())?;
 if !file.metadata().map_err(|e|e.to_string())?.is_file(){return Err("document import must be a regular file".into())}
 let mut bytes=Vec::new();file.take(FILE_LIMIT as u64+1).read_to_end(&mut bytes).map_err(|e|e.to_string())?;
 if bytes.len()>FILE_LIMIT{return Err("document module exceeds one MiB".into())}
 String::from_utf8(bytes).map_err(|_|"document module must be UTF-8".into())
}
fn relative(base:&Path,path:&Path)->Result<PathBuf,String>{
 let rel=path.strip_prefix(base).map_err(|_|"document import escapes its granted root")?;
 if rel.components().any(|c|!matches!(c,Component::Normal(_))){
  return Err("private or non-normal document path is unavailable".into())
 }
 if !rel.to_string_lossy().ends_with(".mq.md"){return Err("only Marqdo document imports are available".into())}
 Ok(rel.to_path_buf())
}
fn installed(path:&str)->bool{
 (path.starts_with("lib/")||path.starts_with("std/")||path.starts_with("ext/"))
 &&path.ends_with(".mq.md")
 &&Path::new(path).components().all(|c|matches!(c,Component::Normal(n) if !n.to_string_lossy().starts_with('.')))
}
pub(crate) struct Bundle{pub files:BTreeMap<PathBuf,String>,pub entry:PathBuf}
impl Bundle{
 pub(crate) fn collect(root:&Path,entry:&Path)->Result<Self,String>{
  let root=root.canonicalize().map_err(|e|e.to_string())?;
  let path=entry.canonicalize().map_err(|e|e.to_string())?;
  let mut bundle=Self{files:BTreeMap::new(),entry:relative(&root,&path)?};
  bundle.visit(&root,&path,&mut HashSet::new(),0,&mut 0)?;
  Ok(bundle)
 }
 fn visit(&mut self,root:&Path,path:&Path,visiting:&mut HashSet<PathBuf>,depth:usize,total:&mut usize)->Result<(),String>{
  let rel=relative(root,path)?;
  if rel!=self.entry&&rel.components().any(|c|matches!(c,Component::Normal(n) if n.to_string_lossy().starts_with('.'))){return Err("private document import is unavailable".into())}
  if visiting.contains(&rel){return Err("circular document import".into())}
  if self.files.contains_key(&rel){return Ok(())}
  if depth>12||self.files.len()>=48{return Err("split the document into smaller import bundles".into())}
  let source=read(path)?;*total+=source.len();if *total>TOTAL_LIMIT{return Err("document import bundle exceeds four MiB".into())}
  let module=marqdo::load::parse_source_auto(&source).map_err(|e|e.to_string())?;
  visiting.insert(rel.clone());self.files.insert(rel.clone(),source);
  for import in module.imports{
   let value=&import.path;
   if installed(value){continue}
   if value.contains('\\')||value.contains(':')||Path::new(value).is_absolute(){return Err("absolute or remote document import is unavailable".into())}
   let target=path.parent().ok_or("document parent missing")?.join(value).canonicalize().map_err(|_|format!("document import is unavailable: {value}"))?;
   self.visit(root,&target,visiting,depth+1,total)?;
  }
  visiting.remove(&rel);Ok(())
 }
 pub(crate) fn dependencies(&self)->Value{
  let mut out=serde_json::Map::new();
  for (path,source) in &self.files{if *path!=self.entry{out.insert(path.to_string_lossy().into_owned(),json!(format!("{:x}",Sha256::digest(source.as_bytes()))));}}
  Value::Object(out)
 }
 pub(crate) fn write(&self,root:&Path)->Result<(),String>{
  for (path,source) in &self.files{
   let target=root.join(path);fs::create_dir_all(target.parent().ok_or("document parent missing")?).map_err(|e|e.to_string())?;
   fs::write(target,source).map_err(|e|e.to_string())?;
  }Ok(())
 }
}
pub(crate) struct Temporary(pub PathBuf);
impl Temporary{
 pub(crate) fn new()->Result<Self,String>{
  let name=format!("qd-document-{}-{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos());
  let path=std::env::temp_dir().join(name);fs::create_dir(&path).map_err(|e|e.to_string())?;
  let guard=Self(path);fs::set_permissions(&guard.0,fs::Permissions::from_mode(0o700)).map_err(|e|e.to_string())?;Ok(guard)
 }
}
impl Drop for Temporary{fn drop(&mut self){let _=fs::remove_dir_all(&self.0);}}
pub(crate) fn view(v:&Value)->Result<Value,String>{
 let root=Path::new(v["workspace"].as_str().ok_or("granted workspace required")?);
 let path=Path::new(v["path"].as_str().ok_or("relative document path required")?);
 if path.is_absolute(){return Err("relative document path required".into())}
 let bundle=Bundle::collect(root,&root.join(path))?;
 let temporary=Temporary::new()?;bundle.write(&temporary.0)?;
 let mut child=Command::new("timeout").args(["-s","KILL","20","marqdo","view","document","--project"]).arg(&temporary.0)
  .arg("--document").arg(&bundle.entry).arg("--json").current_dir(&temporary.0)
  .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e|e.to_string())?;
 let stdout=child.stdout.take().ok_or("reader stdout missing")?;
 let stderr=child.stderr.take().ok_or("reader stderr missing")?;
 let out=std::thread::spawn(move||{let mut data=vec![];let _=stdout.take(2097153).read_to_end(&mut data);data});
 let err=std::thread::spawn(move||{let mut data=vec![];let _=stderr.take(65537).read_to_end(&mut data);data});
 let status=child.wait().map_err(|e|e.to_string())?;
 let bytes=out.join().map_err(|_|"reader output failed")?;let errors=err.join().map_err(|_|"reader diagnostics failed")?;
 if bytes.len()>2097152||errors.len()>65536{return Err("document render exceeds its output budget".into())}
 if !status.success(){return Err(format!("View could not parse this document: {}",String::from_utf8_lossy(&errors)))}
 let view:Value=serde_json::from_slice(&bytes).map_err(|e|e.to_string())?;
 if view["render"]["format"]!="sanitized_html"||view["capabilities"]["executed"]!=false{return Err("read-only native document view required".into())}
 Ok(view)
}
#[cfg(test)]mod tests{
 use super::*;
 fn document(import:&str)->String{format!("---\nmarkup: occlusion\n{import}---\n\n## value\n\nReturn *3*.\n")}
 #[test]fn local_closure_keeps_relative_tree_and_rejects_private_escape_cycles(){
  let temp=Temporary::new().unwrap();let root=&temp.0;
  fs::create_dir(root.join("implementation")).unwrap();
  fs::write(root.join("index.mq.md"),document("import:\n  inner: implementation/kernel.mq.md\n")).unwrap();
  fs::write(root.join("implementation/kernel.mq.md"),document("import:\n  shared: ../shared.mq.md\n")).unwrap();
  fs::write(root.join("shared.mq.md"),document("")).unwrap();
  let bundle=Bundle::collect(root,&root.join("index.mq.md")).unwrap();assert_eq!(bundle.files.len(),3);assert_eq!(bundle.dependencies().as_object().unwrap().len(),2);
  let copy=Temporary::new().unwrap();bundle.write(&copy.0).unwrap();assert_eq!(fs::read_to_string(copy.0.join("shared.mq.md")).unwrap(),document(""));
  fs::write(root.join("shared.mq.md"),document("import:\n  again: index.mq.md\n")).unwrap();
  assert!(matches!(Bundle::collect(root,&root.join("index.mq.md")),Err(e) if e.contains("circular")));
 }
 #[test]fn links_cannot_read_private_or_external_sources(){
  let temp=Temporary::new().unwrap();let outside=Temporary::new().unwrap();
  fs::create_dir(temp.0.join(".agent")).unwrap();fs::write(temp.0.join(".agent/secret.mq.md"),document("")).unwrap();
  fs::write(outside.0.join("secret.mq.md"),document("")).unwrap();
  for import in [".agent/secret.mq.md","/etc/passwd","lib/../.agent/secret.mq.md","https://example.org/x.mq.md"]{
   fs::write(temp.0.join("index.mq.md"),document(&format!("import:\n  private: {import}\n"))).unwrap();
   assert!(Bundle::collect(&temp.0,&temp.0.join("index.mq.md")).is_err(),"{import}");
  }
  std::os::unix::fs::symlink(outside.0.join("secret.mq.md"),temp.0.join("escape.mq.md")).unwrap();
  fs::write(temp.0.join("index.mq.md"),document("import:\n  external: escape.mq.md\n")).unwrap();
  assert!(Bundle::collect(&temp.0,&temp.0.join("index.mq.md")).is_err());
 }
 #[test]fn reader_does_not_run_the_document(){
  let temp=Temporary::new().unwrap();
  fs::write(temp.0.join("index.mq.md"),"---\nmarkup: occlusion\ntitle: 只读\nimport:\n  fs: lib/fs.mq.md\n---\n\n## run\n\nReturn *fs.write_text(path=\"must-not-exist.txt\",text=\"unsafe\")*.\n").unwrap();
  let view=view(&json!({"workspace":temp.0,"path":"index.mq.md"})).unwrap();assert_eq!(view["capabilities"]["executed"],false);
  assert!(!temp.0.join("must-not-exist.txt").exists());
 }
}
