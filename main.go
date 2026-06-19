package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := application.New(application.Options{
		Name:        "Cache Crushers",
		Description: "A disk-cleaning arcade shooter",
		Services: []application.Service{
			application.NewService(NewCacheCrusherService()),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:             "Cache Crushers",
		Width:             1280,
		Height:            800,
		MinWidth:          1024,
		MinHeight:         600,
		BackgroundColour:  application.NewRGB(11, 12, 16),
		DevToolsEnabled:   true,
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
