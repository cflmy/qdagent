package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// This is an authenticated transport for task state and human effect approval.
// All domain policy is owned by the Marqdo agent session document.
type agentRuntime struct{ store *Store }

// Invoke a fixed Marqdo session member with an ephemeral host attestation.
func (r *agentRuntime) invoke(ctx context.Context, document, member string, c map[string]any, args map[string]any) (map[string]any, error) {
	args["context"] = c
	raw, _ := json.Marshal(args)
	command := exec.CommandContext(ctx, env("MARQDO_BIN", "marqdo"), "call", filepath.Join(r.store.root, "agent", document), member, "--args-json", "-", "--effects", "plugin,fs.read,fs.write,process.exec,environment.read", "--fs-root", c["workspace"].(string), "--json")
	command.Stdin = bytes.NewReader(raw)
    // Record the actual host-authenticated context in a private, one-call
    // attestation file. The native plugin refuses bare caller-supplied identity.
    actorFile, actorErr := os.CreateTemp("", "qdagent-agent-actor-*")
    if actorErr != nil { return nil, actorErr }
    defer os.Remove(actorFile.Name())
    if actorErr = json.NewEncoder(actorFile).Encode(c); actorErr != nil { actorFile.Close(); return nil, actorErr }
    if actorErr = actorFile.Close(); actorErr != nil { return nil, actorErr }
    command.Env = append(os.Environ(), "QDAGENT_ACTOR_FILE="+actorFile.Name())
	command.Dir = r.store.root
	command.Env = append(command.Env, "MARQDO_LIB="+filepath.Join(r.store.root, "lib"), "MARQDO_EXT="+filepath.Join(r.store.root, "ext"))
	var stderr bytes.Buffer
	command.Stderr = &stderr
	output, err := command.Output()
	if err != nil {
		detail := strings.TrimSpace(stderr.String())
		if detail != "" {
			if len(detail) > 300 {
				detail = detail[:300]
			}
			return nil, fmt.Errorf("智能体会话 调用失败：%s", detail)
		}
		return nil, errors.New("智能体会话调用失败，请检查已安装插件与源码诊断")
	}
	var envelope struct {
		OK     bool `json:"ok"`
		Result struct {
			OK    bool           `json:"ok"`
			Value map[string]any `json:"value"`
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		} `json:"result"`
	}
	if json.Unmarshal(output, &envelope) != nil || !envelope.OK {
		return nil, errors.New("智能体会话返回格式无效")
	}
	if !envelope.Result.OK {
		return nil, fmt.Errorf("%s：%s", envelope.Result.Error.Code, envelope.Result.Error.Message)
	}
	return envelope.Result.Value, nil
}
func (r *agentRuntime) snapshot(task string) (map[string]any, error) {
	if !validID(task) {
		return nil, errors.New("invalid task")
	}
	path := filepath.Join(r.store.root, "data/sessions", task, "data/dialogue/proj/agent-state.json")
	file, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer file.Close()
	var state map[string]any
	err = json.NewDecoder(io.LimitReader(file, 2<<20)).Decode(&state)
	return state, err
}
func (s *Server) agentStatus(w http.ResponseWriter, r *http.Request, i identity) {
	task, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	if s.supervisor.agent == nil {
		writeError(w, 503, "agent_unavailable", "能力智能体尚未准备好")
		return
	}
	state, err := s.supervisor.agent.snapshot(task.ID)
	if err != nil {
		writeError(w, 500, "agent_read", "智能体会话读取失败")
		return
	}
	writeJSON(w, 200, map[string]any{"agent": state})
}
// A human reply changes only a revision-pinned pending authorization.
// The domain skill and its effects are not parameters of this API.
func (s *Server) respondAgent(w http.ResponseWriter, r *http.Request, i identity) {
 task,ok:=s.owned(w,r,i)
 if !ok{return}
 if task.Archived!=0{writeError(w,409,"task_archived","任务已归档");return}
 if s.supervisor.agent==nil{writeError(w,503,"agent_unavailable","智能体不可用");return}
 var input struct {
  Revision int64 `json:"revision"`
  Action string `json:"action"`
  Answer string `json:"answer"`
  Choice string `json:"choice"`
  Model string `json:"model"`
 }
 if !decode(w,r,&input){return}
 if input.Action!="approve"&&input.Action!="deny"{
  writeError(w,400,"agent_reply","只能明确批准或拒绝本次效果");return
 }
 if input.Model==""{input.Model="builtin-local"}
 if _,err:=s.store.resolveModel(i.Principal,input.Model);err!=nil{
  writeError(w,400,"model_unavailable","模型不可用");return
 }
 s.supervisor.mu.Lock()
 var active int
 s.store.db.QueryRow(`SELECT count(*) FROM qd_runs WHERE task_id=? AND status='running'`,task.ID).Scan(&active)
 if active!=0{s.supervisor.mu.Unlock();writeError(w,409,"agent_busy","任务仍在执行");return}
 c,err:=s.store.taskContext(i.Principal,task.ID)
 if err!=nil{s.supervisor.mu.Unlock();writeError(w,500,"agent_context","任务状态不可用");return}
 ctx,cancel:=context.WithTimeout(r.Context(),35*time.Second)
 saved,err:=s.supervisor.agent.invoke(ctx,"session.mq.md","respond",c,map[string]any{
  "revision":input.Revision,"action":input.Action,"answer":input.Answer,"choice":input.Choice,
 })
 cancel();s.supervisor.mu.Unlock()
 if err!=nil{writeError(w,409,"agent_reply",err.Error());return}
 result:=map[string]any{"agent":saved}
 if saved["phase"]=="complete"{
  _,_=s.store.db.Exec(`UPDATE qd_runs SET status='incomplete' WHERE task_id=? AND status='waiting_user'`,task.ID)
  _,_=s.store.db.Exec(`UPDATE qd_tasks SET status='incomplete' WHERE id=?`,task.ID)
 }else{
  run,err:=s.supervisor.startInternal(i.Principal,task.ID,input.Model,"已批准本次能力效果","",true)
  if err!=nil{result["resume_error"]=err.Error()}else{result["run"]=run}
 }
 writeJSON(w,200,result)
}
