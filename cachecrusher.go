package main

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type JunkFile struct {
	Path     string  `json:"path"`
	SizeMB   float64 `json:"sizeMB"`
	Category string  `json:"category"`
}

type CacheCrusherService struct {
	totalSaved float64
	mu         sync.Mutex
}

func NewCacheCrusherService() *CacheCrusherService {
	return &CacheCrusherService{}
}

var dangerousPaths = []string{
	"system32",
	"windows",
	"winnt",
	"program files",
	"program files (x86)",
	"programdata",
	"boot",
	"system volume information",
	"recovery",
	"config.msi",
}

func isDangerousPath(path string) bool {
	lower := strings.ToLower(path)
	for _, dp := range dangerousPaths {
		if strings.Contains(lower, dp) {
			return true
		}
	}
	return false
}

var safeExtensions = []string{
	".tmp", ".temp", ".log", ".cache", ".bak", ".old",
	".dmp", ".chk", ".gid", ".fts", ".ftg",
}

func isSafeExtension(ext string) bool {
	ext = strings.ToLower(ext)
	for _, se := range safeExtensions {
		if ext == se {
			return true
		}
	}
	return false
}

func getDirSize(path string) (int64, error) {
	var size int64
	err := filepath.WalkDir(path, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if !d.IsDir() {
			info, err := d.Info()
			if err == nil {
				size += info.Size()
			}
		}
		return nil
	})
	return size, err
}

func (c *CacheCrusherService) ScanJunkFiles() []JunkFile {
	var junkFiles []JunkFile
	dirs := []string{
		os.TempDir(),
		filepath.Join(os.Getenv("WINDIR"), "Temp"),
		filepath.Join(os.Getenv("LOCALAPPDATA"), "Temp"),
	}

	seen := make(map[string]bool)

	for _, dir := range dirs {
		if dir == "" {
			continue
		}
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			continue
		}

		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}

		for _, entry := range entries {
			if seen[entry.Name()] {
				continue
			}
			info, err := entry.Info()
			if err != nil {
				continue
			}
			name := info.Name()
			path := filepath.Join(dir, name)
			seen[name] = true

			var mb float64
			category := "Safe"

			if info.IsDir() {
				size, err := getDirSize(path)
				if err != nil || size == 0 {
					continue
				}
				mb = float64(size) / 1024 / 1024
			} else {
				ext := filepath.Ext(name)
				if !isSafeExtension(ext) {
					continue
				}
				mb = float64(info.Size()) / 1024 / 1024
			}

			if mb < 0.001 {
				continue
			}
			if isDangerousPath(path) {
				category = "Dangerous"
			}

			junkFiles = append(junkFiles, JunkFile{
				Path:     path,
				SizeMB:   mb,
				Category: category,
			})
		}
	}

	return junkFiles
}

func (c *CacheCrusherService) CrushFile(filePath string) bool {
	// Safety guard: never delete anything inside a dangerous/system path.
	// The UI marks these as Dangerous, but the guard must be enforced here
	// too so a buggy or tampered frontend can't wipe system directories.
	if isDangerousPath(filePath) {
		return false
	}
	info, err := os.Stat(filePath)
	if err != nil {
		return false
	}
	var size int64
	if info.IsDir() {
		size, _ = getDirSize(filePath)
		if size <= 0 {
			size = 1
		}
		err = os.RemoveAll(filePath)
	} else {
		size = info.Size()
		err = os.Remove(filePath)
	}
	if err != nil {
		return false
	}
	c.mu.Lock()
	mb := float64(size) / 1024 / 1024
	c.totalSaved += mb
	c.mu.Unlock()
	return true
}

func (c *CacheCrusherService) GetTotalSpaceSaved() float64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.totalSaved
}
