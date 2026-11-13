package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"qdagent/server/internal/app"
	"syscall"
	"time"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--healthcheck" {
		c := http.Client{Timeout: 3 * time.Second}
		r, e := c.Get("http://127.0.0.1:7964/healthz")
		if e != nil {
			os.Exit(1)
		}
		r.Body.Close()
		if r.StatusCode != 200 {
			os.Exit(1)
		}
		return
	}

	root := os.Getenv("QDAGENT_ROOT")
	if root == "" {
		root = "."
	}
	front := os.Getenv("QDAGENT_FRONTEND")
	if front == "" {
		front = filepath.Join(root, "frontend/dist")
	}
	addr := os.Getenv("QDAGENT_ADDR")
	if addr == "" {
		addr = ":7964"
	}
	if os.Getenv("QDAGENT_DEV_OWNER") != "" {
		host, _, _ := net.SplitHostPort(addr)
		ip := net.ParseIP(host)
		if ip == nil || !ip.IsLoopback() {
			log.Fatal("development identity requires an explicit loopback listener")
		}
	}
	a, err := app.New(root, front)
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Addr: addr, Handler: a.Handler(), ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 90 * time.Second, MaxHeaderBytes: 1 << 20}
	done := make(chan struct{})
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		defer close(done)
		<-stop
		a.Close()
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
	}()
	log.Printf("qdagent Go server listening on %s", addr)
	if err = server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
	<-done
}
