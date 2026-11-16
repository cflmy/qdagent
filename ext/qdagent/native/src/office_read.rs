//! Bounded, read-only OOXML decoding. It never loads Office, evaluates macros or follows relationships over a network.
use std::{collections::{HashMap,HashSet},fs,io::{Read,Seek},path::{Component,Path}};
use quick_xml::{events::Event,name::ResolveResult,reader::NsReader};
use serde_json::{json,Value};
use zip::ZipArchive;
const WORD:&[u8]=b"http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DRAW:&[u8]=b"http://schemas.openxmlformats.org/drawingml/2006/main";
const PRES:&[u8]=b"http://schemas.openxmlformats.org/presentationml/2006/main";
const REL:&[u8]=b"http://schemas.openxmlformats.org/package/2006/relationships";
fn err(e:impl std::fmt::Display)->String{e.to_string()}
fn part<R:Read+Seek>(zip:&mut ZipArchive<R>,name:&str)->Result<String,String>{
 let mut file=zip.by_name(name).map_err(err)?;if file.size()>4*1024*1024{return Err("Office XML part exceeds 4 MiB".into())}
 let mut raw=vec![];file.by_ref().take(4*1024*1024+1).read_to_end(&mut raw).map_err(err)?;
 if raw.len()>4*1024*1024{return Err("Office XML part exceeds bound".into())}String::from_utf8(raw).map_err(|_|"Only UTF-8 Office XML is supported".into())
}
fn checked_archive<R:Read+Seek>(reader:R)->Result<ZipArchive<R>,String>{
 let mut zip=ZipArchive::new(reader).map_err(err)?;if zip.len()>2048{return Err("Office package has too many parts".into())}
 let(mut total,mut seen)=(0u64,HashSet::new());
 for i in 0..zip.len(){let file=zip.by_index(i).map_err(err)?;let name=file.name();
  if name.contains('\\')||Path::new(name).components().any(|v|!matches!(v,Component::Normal(_)))||!seen.insert(name.to_string())||file.unix_mode().map(|m|m&0o170000==0o120000).unwrap_or(false){return Err("Unsafe or duplicate Office package path".into())}
  total=total.checked_add(file.size()).ok_or("Office package size overflow")?;if total>16*1024*1024{return Err("Office package expanded size exceeds 16 MiB".into())}
 }
 Ok(zip)
}
fn attribute(element:&quick_xml::events::BytesStart<'_>,name:&[u8])->Result<Option<String>,String>{
 for attr in element.attributes(){let attr=attr.map_err(err)?;if attr.key.local_name().as_ref()==name{return Ok(Some(attr.unescape_value().map_err(err)?.into_owned()))}}
 Ok(None)
}
fn namespace(ns:ResolveResult<'_>)->Result<Vec<u8>,String>{match ns{ResolveResult::Bound(ns)=>Ok(ns.as_ref().to_vec()),ResolveResult::Unbound=>Ok(vec![]),ResolveResult::Unknown(_)=>Err("Unbound Office XML namespace".into())}}
fn xml_text(source:&str,root_ns:&[u8],root:&[u8],text_ns:&[u8])->Result<String,String>{
 let mut reader=NsReader::from_str(source);let(mut active,mut output,mut seen_root,mut depth)=(false,String::new(),false,0usize);
 loop{let(ns,event)=reader.read_resolved_event().map_err(err)?;let ns=namespace(ns)?;
  match event{
   Event::Start(ref e)|Event::Empty(ref e)=>{let local=e.local_name();let name=local.as_ref();if depth==0&&seen_root{return Err("Multiple Office XML roots".into())}if matches!(event,Event::Start(_)){depth+=1;if depth>128{return Err("Office XML nesting exceeds bound".into())}}if !seen_root{if ns!=root_ns||name!=root{return Err("Unexpected Office XML root".into())}seen_root=true}
    if ns==text_ns {if name==b"t"{active=matches!(event,Event::Start(_))}if name==b"tab"{output.push('\t')}if name==b"br"{output.push('\n')}}
   },
   Event::Text(e) if active=>output.push_str(&e.xml_content().map_err(err)?),
   Event::CData(e) if active=>output.push_str(&e.xml_content().map_err(err)?),
   Event::GeneralRef(e) if active=>{if let Some(ch)=e.resolve_char_ref().map_err(err)?{output.push(ch)}else{let reference=e.decode().map_err(err)?;output.push_str(match reference.as_ref(){"amp"=>"&","lt"=>"<","gt"=>">","apos"=>"'","quot"=>"\"",_=>return Err("Custom XML entities are not supported".into())})}},
   Event::End(e)=>{if depth==0{return Err("Unexpected Office XML closing tag".into())}depth-=1;if ns==text_ns{if e.local_name().as_ref()==b"t"{active=false}if e.local_name().as_ref()==b"p"{output.push('\n')}}},
   Event::DocType(_)=>return Err("Office XML DTDs are not supported".into()),
   Event::Eof=>{if depth!=0{return Err("Unclosed Office XML element".into())}break},_=>{}
  }
  if output.len()>1200000{return Err("Office text exceeds 300000 characters".into())}
 }
 if !seen_root{return Err("Missing Office XML root".into())}if output.chars().count()>300000{return Err("Office text exceeds 300000 characters".into())}Ok(output)
}
fn slide_ids(source:&str)->Result<Vec<String>,String>{
 let mut reader=NsReader::from_str(source);let mut ids=vec![];
 loop{let(ns,event)=reader.read_resolved_event().map_err(err)?;let ns=namespace(ns)?;match event{Event::Start(e)|Event::Empty(e) if ns==PRES&&e.local_name().as_ref()==b"sldId"=>ids.push(relationship_id(&reader,&e)?),Event::DocType(_)=>return Err("Office XML DTDs are not supported".into()),Event::Eof=>break,_=>{}}}
 if ids.is_empty()||ids.len()>200{return Err("Presentation must contain 1 to 200 slides".into())}Ok(ids)
}
fn slide_targets(source:&str)->Result<HashMap<String,String>,String>{
 let mut reader=NsReader::from_str(source);let mut targets=HashMap::new();
 loop{let(ns,event)=reader.read_resolved_event().map_err(err)?;let ns=namespace(ns)?;match event{
 Event::Start(e)|Event::Empty(e) if ns==REL&&e.local_name().as_ref()==b"Relationship"=>{
  if attribute(&e,b"Type")?.as_deref()!=Some("http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"){continue}
  if attribute(&e,b"TargetMode")?.as_deref()==Some("External"){return Err("External slide relationship is not supported".into())}
  let id=attribute(&e,b"Id")?.ok_or("Missing relationship identity")?;let target=attribute(&e,b"Target")?.ok_or("Missing slide target")?;
  let path=if target.starts_with('/'){target.trim_start_matches('/').to_string()}else{format!("ppt/{target}")};
  if !path.starts_with("ppt/slides/")||!path.ends_with(".xml")||path.contains('\\')||Path::new(&path).components().any(|v|!matches!(v,Component::Normal(_))){return Err("Unsafe slide relationship".into())}
  if targets.insert(id,path).is_some(){return Err("Duplicate slide relationship".into())}
 },Event::DocType(_)=>return Err("Office XML DTDs are not supported".into()),Event::Eof=>break,_=>{}}}Ok(targets)
}
fn decode<R:Read+Seek>(reader:R,kind:&str)->Result<(String,usize),String>{
 let mut zip=checked_archive(reader)?;
 if kind=="docx"{return Ok((xml_text(&part(&mut zip,"word/document.xml")?,WORD,b"document",WORD)?,0))}
 let ids=slide_ids(&part(&mut zip,"ppt/presentation.xml")?)?;let targets=slide_targets(&part(&mut zip,"ppt/_rels/presentation.xml.rels")?)?;let mut output=String::new();
 for (i,id) in ids.iter().enumerate(){let path=targets.get(id).ok_or("Slide relationship is missing")?;let xml=part(&mut zip,path)?;
  // Slide root uses PresentationML; text paragraphs use DrawingML.
  let mut check=NsReader::from_str(&xml);loop{let(ns,event)=check.read_resolved_event().map_err(err)?;match event{Event::Start(e)|Event::Empty(e)=>{if namespace(ns)?!=PRES||e.local_name().as_ref()!=b"sld"{return Err("Unexpected slide XML root".into())}break},Event::DocType(_)=>return Err("Office XML DTDs are not supported".into()),Event::Eof=>return Err("Missing slide XML root".into()),_=>{}}}
  output.push_str(&format!("## 幻灯片 {}\n\n{}\n",i+1,xml_text_slide(&xml)?));
  if output.chars().count()>300000{return Err("Office text exceeds 300000 characters".into())}
 }
 Ok((output,ids.len()))
}
fn xml_text_slide(source:&str)->Result<String,String>{xml_text(source,PRES,b"sld",DRAW)}
fn relationship_id(reader:&NsReader<&[u8]>,element:&quick_xml::events::BytesStart<'_>)->Result<String,String>{
 for attr in element.attributes(){let attr=attr.map_err(err)?;let (ns,local)=reader.resolve_attribute(attr.key);if namespace(ns)?==b"http://schemas.openxmlformats.org/officeDocument/2006/relationships"&&local.as_ref()==b"id"{return Ok(attr.unescape_value().map_err(err)?.into_owned())}}
 Err("Missing slide relationship".into())
}
pub(super) fn read(v:&Value)->Result<Value,String>{
 let c=super::context(v)?;super::private_request(c)?;
 if !matches!(c["role"].as_str(),Some("intent"|"outline"|"implement"|"deliver")){return Err("Office material is outside this role's context".into())}
 let relative=super::text(v,"path")?;let workspace=Path::new(super::text(c,"workspace")?);let input=Path::new(relative);
 if input.is_absolute()||input.components().any(|v|!matches!(v,Component::Normal(_)))||relative.contains('\\'){return Err("Invalid Office material path".into())}
 let file=super::descendants(&workspace.join(input),workspace)?;
 if fs::metadata(&file).map_err(err)?.len()>50*1024*1024{return Err("Office input exceeds 50 MiB".into())}
 if !relative.starts_with("uploads/"){
  let manifest:Value=serde_json::from_slice(&fs::read(workspace.join(".agent/artifacts.json")).map_err(|_|"Only uploads or registered artifacts can be read")?).map_err(err)?;
  let record=manifest.as_array().and_then(|items|items.iter().find(|record|record["path"]==relative)).ok_or("Office file is not a registered artifact")?;
  if record["sha256"].as_str()!=Some(&super::digest(&fs::read(&file).map_err(err)?)){return Err("Office artifact changed after verification".into())}
 }
 if fs::metadata(&file).map_err(err)?.len()>50*1024*1024{return Err("Office input exceeds 50 MiB".into())}
 let kind=input.extension().and_then(|v|v.to_str()).unwrap_or("").to_ascii_lowercase();if !matches!(kind.as_str(),"docx"|"pptx"){return Err("Only DOCX and PPTX text reading is supported".into())}
 let offset=v["offset"].as_u64().ok_or("Nonnegative text offset required")? as usize;let(content,slides)=decode(fs::File::open(file).map_err(err)?,&kind)?;let total=content.chars().count();if offset>total{return Err("Office text offset exceeds length".into())}
 let excerpt=content.chars().skip(offset).take(8000).collect::<String>();let end=offset+excerpt.chars().count();
 Ok(json!({"kind":"office_text","format":kind,"file":relative,"offset":offset,"content":excerpt,"total_chars":total,"next_offset":if end<total{Some(end)}else{None},"truncated":end<total,"slides":slides,"verification":"read_only_ooxml_text; images, layout, embedded objects and notes are not extracted"}))
}
#[cfg(test)]mod tests{
 use super::*;use std::io::{Cursor,Write};
 fn package(parts:&[(&str,&str)])->Cursor<Vec<u8>>{let mut zip=zip::ZipWriter::new(Cursor::new(vec![]));for(name,body)in parts{zip.start_file(*name,zip::write::FileOptions::default()).unwrap();zip.write_all(body.as_bytes()).unwrap()}zip.finish().unwrap()}
 #[test]fn decodes_entities_and_rejects_dtd_without_extraction(){let doc=format!("<w:document xmlns:w=\"{}\"><w:body><w:p><w:r><w:t>真实 &amp; &#x4E2D; &lt;文字&gt;</w:t></w:r></w:p></w:body></w:document>",String::from_utf8_lossy(WORD));assert_eq!(decode(package(&[("word/document.xml",&doc)]),"docx").unwrap().0,"真实 & 中 <文字>\n");assert!(xml_text("<!DOCTYPE test [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><document/>",WORD,b"document",WORD).is_err());assert!(decode(package(&[("../escape","bad")]),"docx").is_err());assert!(xml_text(&doc.replace("</w:document>",""),WORD,b"document",WORD).is_err())}
 #[test]fn presentation_follows_relationship_order_not_zip_names(){let pres=format!("<p:presentation xmlns:p=\"{}\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><p:sldIdLst><p:sldId id=\"256\" r:id=\"rId9\"/><p:sldId id=\"257\" r:id=\"rId2\"/></p:sldIdLst></p:presentation>",String::from_utf8_lossy(PRES));let rel=format!("<Relationships xmlns=\"{}\"><Relationship Id=\"rId9\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide\" Target=\"slides/slide9.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide\" Target=\"slides/slide2.xml\"/></Relationships>",String::from_utf8_lossy(REL));let slide=|text:&str|format!("<p:sld xmlns:p=\"{}\" xmlns:a=\"{}\"><p:cSld><a:p><a:r><a:t>{text}</a:t></a:r></a:p></p:cSld></p:sld>",String::from_utf8_lossy(PRES),String::from_utf8_lossy(DRAW));let a=slide("第一张");let b=slide("第二张");let(out,n)=decode(package(&[("ppt/presentation.xml",&pres),("ppt/_rels/presentation.xml.rels",&rel),("ppt/slides/slide2.xml",&b),("ppt/slides/slide9.xml",&a)]),"pptx").unwrap();assert_eq!(n,2);assert!(out.find("第一张")<out.find("第二张"));assert!(slide_targets(&rel.replace("slides/slide9.xml","../../escape.xml")).is_err())}
}
