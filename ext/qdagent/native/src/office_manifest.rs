use serde_json::{json,Value};
use std::{fs,io::Read,path::Path,os::unix::fs::OpenOptionsExt,os::fd::AsRawFd};
pub(super) fn upsert(v:&Value)->Result<Value,String>{
 let root=Path::new(super::text(super::context(v)?,"workspace")?).canonicalize().map_err(|e|e.to_string())?;
 let dir=root.join(".agent");fs::create_dir_all(&dir).map_err(|e|e.to_string())?;let dir=dir.canonicalize().map_err(|e|e.to_string())?;if !dir.starts_with(&root)||!dir.is_dir(){return Err("manifest directory escapes workspace".into())}
 let entry=&v["entry"];let id=entry["id"].as_str().filter(|s|!s.is_empty()&&s.len()<=128).ok_or("record identity required")?;
 if !entry.is_object()||serde_json::to_vec(entry).map_err(|e|e.to_string())?.len()>65536{return Err("record too large".into())}
 let lock=fs::OpenOptions::new().create(true).truncate(false).read(true).write(true).custom_flags(libc::O_NOFOLLOW).open(dir.join("artifacts.lock")).map_err(|e|e.to_string())?;
 if unsafe{libc::flock(lock.as_raw_fd(),libc::LOCK_EX)}!=0{return Err("manifest lock failed".into())}
 let file=dir.join("artifacts.json");let mut entries=vec![];
 match fs::OpenOptions::new().read(true).custom_flags(libc::O_NOFOLLOW).open(&file){Ok(f)=>{let mut raw=vec![];f.take(2097153).read_to_end(&mut raw).map_err(|e|e.to_string())?;if raw.len()>2097152{return Err("manifest too large".into())}entries=serde_json::from_slice::<Vec<Value>>(&raw).map_err(|e|e.to_string())?;},Err(e) if e.kind()==std::io::ErrorKind::NotFound=>{},Err(e)=>return Err(e.to_string())}
 if let Some(i)=entries.iter().position(|x|x["id"].as_str()==Some(id)){entries[i]=entry.clone()}else{entries.push(entry.clone())}
 let raw=serde_json::to_string(&entries).map_err(|e|e.to_string())?;if raw.len()>2097152{return Err("manifest too large".into())}super::super::atomic(&file,&raw)?;drop(lock);Ok(json!({"saved":true}))
}
