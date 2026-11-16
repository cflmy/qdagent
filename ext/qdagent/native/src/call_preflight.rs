//! Strict, side-effect-free argument checks using the official AST and external binder.
use std::{collections::HashMap,path::Path};
use marqdo::{ast::{Arg,Expr,Literal,Module,Stmt},value::Value as M};
use serde_json::{Value,json};

pub(super) fn check(module:&Module,allowed:&Module,api:&Path,cells:&[(String,String)])->Result<Vec<Value>,String>{
 let mut locals:HashMap<String,Option<M>>=HashMap::new();let mut checks=vec![];
 for statement in &module.functions[0].body{
  match statement{
   Stmt::Assign{name,value,..}=>{
    let known=if let Expr::Code(code)=value {Some(M::Text(cells.iter().find(|(token,_)|code.source.trim()==token).map(|(_,body)|body.clone()).unwrap_or_else(||code.source.clone())))}else{expression(value,allowed,api,&locals,&mut checks)?};
    locals.insert(name.clone(),known);
   },
   Stmt::Expr{value,..}|Stmt::Return{value,..}=>{expression(value,allowed,api,&locals,&mut checks)?;},
   _=>{},
  }
 }
 Ok(checks)
}
fn literal(value:&Literal)->M {match value{Literal::None=>M::None,Literal::Bool(v)=>M::Bool(*v),Literal::Int(v)=>M::Int(*v),Literal::Num(v)=>M::Num(*v),Literal::Text(v)=>M::Text(v.clone())}}
fn expression(expr:&Expr,module:&Module,api:&Path,locals:&HashMap<String,Option<M>>,checks:&mut Vec<Value>)->Result<Option<M>,String>{
 match expr{
  Expr::Literal(v)=>Ok(Some(literal(v))),
  Expr::Var(name)=>Ok(locals.get(name).cloned().flatten()),
  Expr::Occluded{label,payload:Some(value)}=>{let before=checks.len();let result=expression(value,module,api,locals,checks)?;if checks.len()>before&&!label.is_empty(){checks.last_mut().unwrap()["intent"]=json!(label)}Ok(result)},
  Expr::List(items)=>{let mut out=vec![];let mut complete=true;for item in items {if let Some(value)=expression(item,module,api,locals,checks)?{out.push(value)}else{complete=false}}Ok(if complete{Some(M::List(out))}else{None})},
  Expr::Map(items)=>{let mut out=vec![];let mut complete=true;for (key,item) in items {if let Some(value)=expression(item,module,api,locals,checks)?{out.push((key.clone(),value))}else{complete=false}}Ok(if complete{Some(M::Map(out))}else{None})},
  Expr::Code(code)=>Ok(Some(M::Code(marqdo::value::CodeBlock{lang:code.lang.clone(),source:code.source.clone()}))),
  Expr::Call(call)=>{
   let name=call.path.as_ref().and_then(|path|path.get(1)).ok_or("call target unavailable")?;
   let function=module.functions.iter().find(|function|&function.name==name).ok_or("function is outside the current document")?;
   let mut values=vec![];let mut parameters=vec![];let named=call.args.iter().filter_map(|arg|if let Arg::Named{name,..}=arg{Some(name.as_str())}else{None}).collect::<Vec<_>>();let mut position=0;
   for arg in &call.args {
    let (name,value)=match arg{
     Arg::Named{name,value}=>(name.clone(),value),
     Arg::Positional(value)=>{while position<function.params.len()&&named.contains(&function.params[position].name.as_str()){position+=1};let param=function.params.get(position).ok_or_else(||format!("too many positional arguments for api.{}",function.name))?;position+=1;(param.name.clone(),value)}
    };
    let known=expression(value,module,api,locals,checks)?;
    let actual=known.as_ref().map(marqdo::contract::type_of);
    let preview=known.as_ref().map(|value|value.as_display().chars().take(240).collect::<String>());
    parameters.push(json!({"name":name,"known":known.is_some(),"type":actual,"preview":preview}));
    values.push((name,known.unwrap_or(M::None)));
   }
   // Preserve the actual required/optional boundary. Replace optional defaults with
   // None so preflight cannot evaluate calls, imports, files, or other defaults.
   let mut signature=function.clone();for param in &mut signature.params{if param.default.is_some(){param.default=Some(Expr::Literal(Literal::None))}}
   let mut binder=marqdo::interp::Interpreter::with_capture(Some(api),false);
   binder.bind_external_args(module,&signature,&values).map_err(|error|{
    if let Some(diagnostic)=marqdo::diagnostics::Diagnostic::find(&error){diagnostic.to_json().to_string()}else{error.to_string()}
   })?;
   checks.push(json!({"function":format!("api.{}",function.name),"parameters":parameters,"required":function.params.iter().filter(|p|p.default.is_none()).map(|p|p.name.clone()).collect::<Vec<_>>(),"contract":function.contract.as_ref().map(|c|c.quote_text()),"anchor":function.contract.as_ref().map(|c|c.anchor(Some(api)))}));
   Ok(None)
  },
  Expr::Unary{expr,..}=>{expression(expr,module,api,locals,checks)?;Ok(None)},
  Expr::Binary{left,right,..}=>{expression(left,module,api,locals,checks)?;expression(right,module,api,locals,checks)?;Ok(None)},
  Expr::Index{base,..}=>{expression(base,module,api,locals,checks)?;Ok(None)},
  _=>Ok(None),
 }
}

pub(super) fn diagnostic(value:&Value,depth:usize)->Option<Value>{
 if depth>10{return None}
 if let Some(text)=value.as_str(){if text.len()<262144{if let Ok(parsed)=serde_json::from_str::<Value>(text){return diagnostic(&parsed,depth+1)}}return None}
 if let Some(list)=value.as_array(){return list.iter().take(20).find_map(|item|diagnostic(item,depth+1))}
 let object=value.as_object()?;
 for key in ["error","diagnostics","diagnostic"]{if let Some(item)=object.get(key){if let Some(found)=diagnostic(item,depth+1){return Some(found)}}}
 if let Some(message)=object.get("message"){
  if let Some(found)=diagnostic(message,depth+1){return Some(found)}
  if message.is_string(){return Some(json!({"code":object.get("code"),"message":message,"span":object.get("span"),"suggestion":object.get("suggestion"),"doc_anchor":object.get("doc_anchor"),"doc_quote":object.get("doc_quote")}))}
 }
 for key in ["value","result","syntax","check"]{if let Some(item)=object.get(key){if let Some(found)=diagnostic(item,depth+1){return Some(found)}}}
 None
}

pub(super) fn cache(v:&Value)->Result<Value,String>{
 use std::fs;
 let c=super::context(v)?;super::private_request(c)?;
 let root=Path::new(super::text(c,"workspace")?).canonicalize().map_err(|e|e.to_string())?;
 let relative=super::text(v,"path")?;let name=relative.strip_prefix(".agent/recovery/").and_then(|s|s.strip_suffix(".json")).ok_or("invalid recovery cache path")?;
 if name.len()!=64||!name.bytes().all(|b|b.is_ascii_hexdigit()){return Err("invalid recovery cache identity".into())}
 let parent=root.join(".agent/recovery");let path=parent.join(format!("{name}.json"));let writing=v["operation"]=="runtime_recovery_write";
 if writing{fs::create_dir_all(&parent).map_err(|e|e.to_string())?;}else if !parent.exists(){return Ok(json!([]))}
 if !parent.canonicalize().map_err(|e|e.to_string())?.starts_with(&root){return Err("recovery cache escapes workspace".into())}
 if let Ok(meta)=fs::symlink_metadata(&path){if meta.file_type().is_symlink(){return Err("recovery cache cannot follow a symlink".into())}}
 if writing{
  let value=&v["records"];let records=value.as_array().ok_or("recovery records must be a list")?;if records.len()>6{return Err("recovery record count exceeds bound".into())}
  let raw=value.to_string();if raw.len()>128*1024{return Err("recovery cache exceeds bound".into())}
  super::super::atomic(&path,&raw)?;
  use std::os::unix::fs::PermissionsExt;fs::set_permissions(&path,fs::Permissions::from_mode(0o600)).map_err(|e|e.to_string())?;
  Ok(json!(true))
 }else{
  let raw=match fs::read(&path){Ok(v)=>v,Err(e) if e.kind()==std::io::ErrorKind::NotFound=>return Ok(json!([])),Err(e)=>return Err(e.to_string())};
  if raw.len()>128*1024{return Err("recovery cache exceeds bound".into())}
  let parsed:Value=serde_json::from_slice(&raw).map_err(|e|e.to_string())?;if !parsed.is_array(){return Err("invalid recovery records".into())}Ok(parsed)
 }
}
