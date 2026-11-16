use std::{fs,io::{Cursor,Read},path::{Component,Path}};
use serde_json::{json,Value};
pub(super) fn inspect(v:&Value)->Result<Value,String>{
 let c=super::context(v)?;let root=Path::new(super::text(c,"workspace")?);
 let relative=super::text(v,"path")?;let path=Path::new(relative);
 if !relative.starts_with("uploads/")||relative.contains('\\')||path.is_absolute()||path.components().any(|c|!matches!(c,Component::Normal(_))){return Err("Image must be a relative file inside task uploads".into())}
 let file=super::descendants(&root.join(path),&root.join("uploads"))?;
 if fs::metadata(&file).map_err(|e|e.to_string())?.len()>4*1024*1024{return Err("PNG input exceeds 4 MiB".into())}
 let mut raw=vec![];fs::File::open(file).map_err(|e|e.to_string())?.take(4*1024*1024+1).read_to_end(&mut raw).map_err(|e|e.to_string())?;
 if raw.len()>4*1024*1024{return Err("PNG input exceeds 4 MiB".into())}
 let mut decoder=png::Decoder::new(Cursor::new(&raw));decoder.ignore_checksums(false);decoder.set_limits(png::Limits{bytes:64*1024*1024});
 let mut reader=decoder.read_info().map_err(|e|format!("Invalid PNG: {e}"))?;
 if reader.info().animation_control.is_some(){return Err("Animated PNG is not supported".into())}
 let size=reader.output_buffer_size();if size>64*1024*1024{return Err("Decoded PNG exceeds bound".into())}
 let mut pixels=vec![0;size];let frame=reader.next_frame(&mut pixels).map_err(|e|format!("Invalid PNG pixels: {e}"))?;
 reader.finish().map_err(|e|format!("Invalid PNG end: {e}"))?;
 Ok(json!({"path":relative,"format":"png","width":frame.width,"height":frame.height,"bytes":raw.len(),"sha256":super::digest(&raw)}))
}
