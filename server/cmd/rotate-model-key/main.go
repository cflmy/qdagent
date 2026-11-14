package main

import (
	"flag"
	"fmt"
	"log"
	"qdagent/server/internal/app"
)

func main() {
	db := flag.String("db", "", "offline SQLite file")
	old := flag.String("old-key", "", "old secret file")
	next := flag.String("new-key", "", "new secret file")
	flag.Parse()
	if *db == "" || *old == "" || *next == "" {
		log.Fatal("explicit database, old-key and new-key paths required")
	}
	n, e := app.RotateModelCredentials(*db, *old, *next)
	if e != nil {
		log.Fatal(e)
	}
	fmt.Printf("Verified and rotated %d encrypted profiles; no credential values emitted.\n", n)
}
