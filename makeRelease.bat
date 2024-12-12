@echo off
setlocal enabledelayedexpansion

rem Config file name
set configFile=build_include.txt
set releaseDirectory=releases\
set srcDirectory=src\

rem Check if configFile exists
if not exist "%configFile%" (
    echo Configuration file %configFile% not found!
    echo List files line by line, directories end in a backslash
    pause
    exit /b 1
)

rem Extract values from JSON
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content -Path '%srcDirectory%manifest.json' | ConvertFrom-Json).version"') do (
    set "version=%%i"
)

rem Get the current folder name
for %%F in ("%cd%") do set "currentFolder=%%~nF"

rem Zip filenames
set firefox_zip=%currentFolder% firefox v%version%.zip
set chromium_zip=%currentFolder% chromium v%version%.zip

rem Read file names and directories from config file
set fileList=
for /f "usebackq delims=" %%f in ("%configFile%") do (
    set fileList=!fileList! "%%f"
)

rem Add manifest.json to file list if not included already
set fileList=!fileList! "manifest.json"

rem Change to src directory
pushd src

7z a "..\%releaseDirectory%%firefox_zip%" !fileList!

rem Make manifest_chrome into just manifest
rename manifest.json manifest_firefox.json
rename manifest_chrome.json manifest.json

7z a "..\%releaseDirectory%%chromium_zip%" !fileList!

rem Revert manifest changes
rename manifest.json manifest_chrome.json
rename manifest_firefox.json manifest.json

rem Return to original directory
popd

echo Built: %firefox_zip%, %chromium_zip%
pause
