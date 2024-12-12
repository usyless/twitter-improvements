@echo off
setlocal enabledelayedexpansion

:: Config file name
set configFile=build_include.txt
set releaseDirectory=releases\
set srcDirectory=src\

:: Check if configFile exists
if not exist "%configFile%" (
    echo Configuration file %configFile% not found!
    echo List files line by line, directories end in a backslash
    pause
    exit /b 1
)

:: Check 7z exists
where 7z >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo 7z is not installed or not in the PATH.
    pause
    exit /b 1
)

:: Extract values from JSON
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content -Path '%srcDirectory%manifest.json' | ConvertFrom-Json).version"') do (
    set "version=%%i"
)

:: Get the current folder name
for %%F in ("%cd%") do set "currentFolder=%%~nF"

:: Zip filenames
set firefox_zip=%currentFolder% firefox v%version%.zip
set chromium_zip=%currentFolder% chromium v%version%.zip

:: Read file names and directories from config file
set fileList=
for /f "usebackq delims=" %%f in ("%configFile%") do (
    set fileList=!fileList! "%%f"
)

:: Add manifest.json to file list if not included already
set fileList=!fileList! "manifest.json"

:: Change to src directory
pushd %srcDirectory%

7z a "..\%releaseDirectory%%firefox_zip%" !fileList!

:: Make manifest_chrome into just manifest
rename manifest.json manifest_firefox.json
rename manifest_chrome.json manifest.json

7z a "..\%releaseDirectory%%chromium_zip%" !fileList!

:: Revert manifest changes
rename manifest.json manifest_chrome.json
rename manifest_firefox.json manifest.json

:: Return to original directory
popd

echo Built: %firefox_zip%, %chromium_zip%
pause
