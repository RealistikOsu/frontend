package main

import (
	"github.com/RealistikOsu/frontend/modules/locale"
	"github.com/gin-gonic/gin"
)

// T translates a string into the language specified by the request.
func T(c *gin.Context, s string, args ...interface{}) string {
	return locale.Get(getLang(c), s, args...)
}

func (b *baseTemplateData) T(s string, args ...interface{}) string {
	return T(b.Gin, s, args...)
}

func getLang(_ *gin.Context) []string {
	// s, _ := c.Cookie("language")
	// if s != "" {
	// 	return []string{s}
	// }
	//return locale.ParseHeader(c.Request.Header.Get("Accept-Language"))
	return []string{"en"}
}
