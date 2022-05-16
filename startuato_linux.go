//go:build !windows
// +build !windows

package main

import (
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rcrowley/goagain"
	schiavo "zxq.co/ripple/schiavolib"
)

var l net.Listener

func startuato(engine *gin.Engine) bool {

	returnCh := make(chan bool)
	// whether it was from this very thing or not
	var iZingri bool
	hs := func(l net.Listener, h http.Handler) {
		err := http.Serve(l, h)
		if f, ok := err.(*net.OpError); ok && f.Err.Error() == "use of closed network connection" && !iZingri {
			returnCh <- true
		}
	}

	var err error
	// Inherit a net.Listener from our parent process or listen anew.
	l, err = goagain.Listener()
	if err != nil {

		// Listen on a TCP or a UNIX domain socket (TCP here).
		if config.Unix {
			l, err = net.Listen("unix", config.ListenTo)
		} else {
			l, err = net.Listen("tcp", config.ListenTo)
		}
		if err != nil {
			schiavo.Bunker.Send(err.Error())
			log.Fatalln(err)
		}

		schiavo.Bunker.Send(fmt.Sprint("LISTENINGU STARTUATO ON ", l.Addr()))

		// Accept connections in a new goroutine.
		go hs(l, engine)

	} else {

		// Resume accepting connections in a new goroutine.
		schiavo.Bunker.Send(fmt.Sprint("LISTENINGU RESUMINGU ON ", l.Addr()))
		go hs(l, engine)

		// Kill the parent, now that the child has started successfully.
		if err := goagain.Kill(); err != nil {
			schiavo.Bunker.Send(err.Error())
			log.Fatalln(err)
		}

	}

	go func() {
		// Block the main goroutine awaiting signals.
		if _, err := goagain.Wait(l); err != nil {
			schiavo.Bunker.Send(err.Error())
			log.Fatalln(err)
		}

		// Do whatever's necessary to ensure a graceful exit like waiting for
		// goroutines to terminate or a channel to become closed.
		//
		// In this case, we'll simply stop listening and wait one second.
		iZingri = true
		if err := l.Close(); err != nil {
			schiavo.Bunker.Send(err.Error())
			log.Fatalln(err)
		}
		if err := db.Close(); err != nil {
			schiavo.Bunker.Send(err.Error())
			log.Fatalln(err)
		}
		returnCh <- false
	}()

	return <-returnCh
}
