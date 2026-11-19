package app

// The host owns process lifetime and bytes. The executed document owns all
// agent state, instructions and business decisions.
import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
)

func nativeEntry(ctx context.Context, project string, c map[string]any, payload map[string]any) (io.ReadCloser, func() error, error) {
	run, _ := c["run_id"].(string)
	if !validID(run) {
		return nil, nil, errors.New("invalid execution identity")
	}
	root, _ := c["root"].(string)
	workspace, _ := c["workspace"].(string)
	dir := filepath.Join(root, "data/dialogue/proj/runtime", run)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, nil, err
	}
	private := filepath.Join(dir, "request.json")
	file, err := os.OpenFile(private, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return nil, nil, err
	}
	err = json.NewEncoder(file).Encode(payload)
	closeErr := file.Close()
	if err != nil {
		return nil, nil, err
	}
	if closeErr != nil {
		return nil, nil, closeErr
	}
	actor := filepath.Join(dir, "actor.json")
	args, err := json.Marshal(map[string]any{"context": c})
	if err != nil {
		return nil, nil, err
	}
	identity, _ := json.Marshal(c)
	if err = os.WriteFile(actor, identity, 0600); err != nil {
		return nil, nil, err
	}
	cmd := exec.CommandContext(ctx, env("MARQDO_BIN", "marqdo"), "call", filepath.Join(project, "agent/index.mq.md"), "run", "--args-json", "-", "--fs-root", workspace, "--effects", "plugin,fs.read,fs.write,process.exec,environment.read,time.read,random.read", "--json")
	cmd.Dir = workspace
	cmd.Stdin = bytes.NewReader(args)
	cmd.Env = append(os.Environ(), "QDAGENT_RUN_REQUEST_FILE="+private, "QDAGENT_ACTOR_FILE="+actor, "MARQDO_LIB="+filepath.Join(project, "lib"), "MARQDO_EXT="+filepath.Join(project, "ext"))
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		if cmd.Process != nil {
			return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		}
		return nil
	}
	cmd.WaitDelay = 3 * time.Second
	output := &entryOutput{}
	cmd.Stdout = output
	cmd.Stderr = &boundedLog{}
	if err = cmd.Start(); err != nil {
		return nil, nil, err
	}
	reader, writer := io.Pipe()
	done := make(chan error, 1)
	go func() {
		defer writer.Close()
		encoder := json.NewEncoder(writer)
		emit := func(kind string, data any) error { return encoder.Encode(map[string]any{"kind": kind, "data": data}) }
		wait := make(chan error, 1)
		go func() { wait <- cmd.Wait() }()
		ticker := time.NewTicker(40 * time.Millisecond)
		defer ticker.Stop()
		var position int64
		relay := func() error {
			f, e := os.Open(filepath.Join(dir, "events.ndjson"))
			if os.IsNotExist(e) {
				return nil
			}
			if e != nil {
				return e
			}
			defer f.Close()
			if _, e = f.Seek(position, io.SeekStart); e != nil {
				return e
			}
			buffer := bufio.NewReader(io.LimitReader(f, 8<<20))
			for {
				line, e := buffer.ReadBytes('\n')
				if len(line) > 2<<20 {
					return errors.New("execution event exceeds bound")
				}
				if e == io.EOF {
					return nil
				}
				if e != nil {
					return e
				}
				position += int64(len(line))
				if !json.Valid(line) {
					return errors.New("invalid execution event")
				}
				if _, e = writer.Write(line); e != nil {
					return e
				}
			}
		}
		for {
			select {
			case <-ticker.C:
				if e := relay(); e != nil {
					_ = cmd.Cancel()
					done <- e
					return
				}
			case e := <-wait:
				for {
					previous := position
					if failure := relay(); failure != nil {
						done <- failure
						return
					}
					if previous == position {
						break
					}
				}
				body := output.data
				_ = os.WriteFile(filepath.Join(dir, "entry.stdout"), body, 0600)
				var envelope struct {
					OK     bool           `json:"ok"`
					Result map[string]any `json:"result"`
					Error  struct {
						Message string `json:"message"`
					} `json:"error"`
				}
				if len(body) <= 4<<20 && json.Unmarshal(body, &envelope) == nil && envelope.OK && e == nil {
					if _, ok := envelope.Result["status"].(string); ok {
						_ = emit("final", envelope.Result)
						done <- nil
						return
					}
				}
				message := "Marqdo 入口未正常完成"
				if envelope.Error.Message != "" {
					message = envelope.Error.Message
				}
				_ = emit("error", map[string]any{"message": message})
				_ = emit("final", map[string]any{"answer": message, "status": "failed"})
				done <- e
				return
			}
		}
	}()
	return reader, func() error { return <-done }, nil
}

// Stdout is read by os/exec's copy goroutine; Wait joins it before data is read.
type entryOutput struct{ data []byte }

func (b *entryOutput) Write(p []byte) (int, error) {
	n := len(p)
	remaining := (4 << 20) + 1 - len(b.data)
	if remaining > len(p) {
		remaining = len(p)
	}
	if remaining > 0 {
		b.data = append(b.data, p[:remaining]...)
	}
	return n, nil
}
