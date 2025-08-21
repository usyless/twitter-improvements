@echo off
setlocal

:: set cwd as batch file directory
cd /d "%~dp0"

cd src

if exist manifest_chrome.json (
    ren manifest.json manifest_firefox.json
    ren manifest_chrome.json manifest.json
) else (
    if exist manifest_firefox.json (
        ren manifest.json manifest_chrome.json
        ren manifest_firefox.json manifest.json
    )
)