fn main() {
 let args:Vec<String>=std::env::args().collect();
 let result=match args.len() {
  4=>qdagent_transport::worker(args[1].clone().into(),args[2].clone(),args[3].clone()),
  5 if args[2]=="workflow"=>qdagent_transport::workflow(args[1].clone().into(),args[3].clone(),args[4].clone()),
  _=>std::process::exit(2)
 };
 if let Err(error)=result {
  let token=args.last().unwrap();
  let _=qdagent_transport::record_failure(std::path::Path::new(&args[1]),token,&error);
  std::process::exit(1)
 }
}
