use super::*;

pub(super) fn call(c:&Value,v:&Value)->Result<Value,String>{
 let name=v["skill"].as_str().ok_or("skill id required")?;
 let spec=catalog::skill(c,name)?;
 let root=root(c)?;
 let effects=spec["effects"].as_str().unwrap_or("read");
 {
  let _lock=super::lifecycle(&root)?;
  let mut state=read(&root)?;
  if effects=="external"||effects=="write"{
   if state["approved_skill"]!=name||state["approved_source_sha256"]!=spec["sha256"]||state["phase"]!="ready"{
    return Err("agent.approval_required".into())
   }
   // The authority is single-use, even if the child exits with an unknown
   // effect. Never silently run it a second time after cancellation/timeouts.
   state["approved_skill"]=Value::Null;
   state["approved_source_sha256"]=Value::Null;
   state["phase"]=json!("running_skill");
   save(&root,&mut state)?;
  }
 }
 let source=Path::new(spec["path"].as_str().ok_or("installed path missing")?);
 let grants=match effects{
  "read"=>"fs.read",
  "model"=>"plugin,fs.read,process.exec,environment.read",
  "compute"=>"plugin,fs.read,process.exec,environment.read",
  "external"=>"plugin,fs.read,process.exec,environment.read,network.read",
  "write"=>"plugin,fs.read,fs.write,process.exec,environment.read,network.read,network.write",
  _=>return Err("unknown effects".into()),
 };
 let mut command=Command::new("marqdo");
 command.arg("call").arg(source).arg("run").args(["--args-json","-","--fs-root"])
  .arg(c["workspace"].as_str().ok_or("workspace required")?)
  .args(["--effects",grants,"--json"])
  .current_dir(c["workspace"].as_str().unwrap())
  .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
 command.env("QDAGENT_ACTIVE_DOCUMENT",source);
 let mut child=command.spawn().map_err(|e|e.to_string())?;
 let params="{}".to_string();
 child.stdin.take().ok_or("skill stdin missing")?.write_all(params.as_bytes()).map_err(|e|e.to_string())?;
 // Read both pipes concurrently. A large child output must never deadlock a
 // parent that is polling its process status.
 use std::io::Read;
 let stdout=child.stdout.take().ok_or("skill stdout missing")?;
 let stderr=child.stderr.take().ok_or("skill stderr missing")?;
 let captured=std::thread::spawn(move||{
  let mut data=Vec::new();let _=stdout.take(4*1024*1024+1).read_to_end(&mut data);data
 });
 let errors=std::thread::spawn(move||{
  let mut data=Vec::new();let _=stderr.take(65537).read_to_end(&mut data);data
 });
 let start=Instant::now();
 let status=loop{
  if let Some(status)=child.try_wait().map_err(|e|e.to_string())?{break status}
  if start.elapsed()>Duration::from_secs(240){let _=child.kill();let _=child.wait();return Err("agent.skill.timeout".into())}
  std::thread::sleep(Duration::from_millis(30));
 };
 let output=captured.join().map_err(|_|"skill stdout reader failed")?;
 let diagnostic=errors.join().map_err(|_|"skill stderr reader failed")?;
 if output.len()>4*1024*1024||diagnostic.len()>65536{return Err("agent.skill.output_budget".into())}
 if !status.success(){return Err(format!("agent.skill.failed: {}",String::from_utf8_lossy(&diagnostic).chars().take(500).collect::<String>()))}
 let envelope:Value=serde_json::from_slice(&output).map_err(|_|"agent.skill.invalid_marqdo_result")?;
 if envelope["ok"]!=true{return Err(format!("agent.skill.marqdo_error: {}",envelope["error"]))}
 if envelope["result"]["ok"]==false{return Err(format!("agent.skill.domain_failure: {}",envelope["result"]["error"]))}
 let value=if envelope["result"]["ok"]==true && !envelope["result"]["value"].is_null(){&envelope["result"]["value"]}else{&envelope["result"]};
 let observed=value["status"].as_str().unwrap_or("");
 let status=if matches!(observed,"waiting_model"|"waiting_input"|"needs_source_read"|"draft_needs_compiler_review"|"workflow_waiting_model"|"incomplete"|"blocked"|"uncertain"){
  "incomplete"
 }else{"succeeded"};
 if digest(&fs::read(source).map_err(|e|e.to_string())?)!=spec["sha256"].as_str().unwrap_or(""){
  return Err("agent.skill.source_changed_after_execution".into())
 }
 Ok(json!({"status":status,"result":envelope["result"],"skill":name,"source_sha256":spec["sha256"],"evidence":"marqdo_call"}))
}
