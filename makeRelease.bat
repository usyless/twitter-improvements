@echo off
setlocal

:: set cwd as batch file directory
cd /d "%~dp0"

:: Config file name
set "releaseDirectory=releases\"
set "srcDirectory=src\"

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
set "firefox_zip=%currentFolder% firefox v%version%.zip"
set "chromium_zip=%currentFolder% chromium v%version%.zip"

:: Add manifest.json to file list if not included already
set "fileList=* manifest.json"

:: switch to src directory
pushd %srcDirectory%

:: move chrome manifest outside
move manifest_chrome.json ..
7z a "..\%releaseDirectory%%firefox_zip%" %fileList%

:: move firefox manifest out and move chrome one in
move manifest.json ..
move ..\manifest_chrome.json manifest.json

7z a "..\%releaseDirectory%%chromium_zip%" %fileList%

:: rename chrome manifest and bring firefox one back in
ren manifest.json manifest_chrome.json
move ..\manifest.json .

:: Return to original directory
popd

echo Built: %firefox_zip%, %chromium_zip%
pause
