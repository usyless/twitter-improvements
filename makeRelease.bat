@echo off
setlocal

:: set cwd as batch file directory
cd /d "%~dp0"

:: Config file name
set "releaseDirectory=releases\"
set "srcDirectory=src\"
set "buildDirectory=build\"

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

:: remove build directory if exists, then copy src
if exist "%buildDirectory%" (
    rmdir /S /Q "%buildDirectory%"
)
xcopy /E /I /H /Y "%srcDirectory%" "%buildDirectory%" >nul 2>&1

:: iterate through all files in build directory
for /r "%buildDirectory%" %%f in (*.js) do (
    :: remove jsdoc comments
    powershell -Command "$content = Get-Content '%%f' -Raw; $content = $content -replace '(?s)/\*\*.*?\*/', ''; Set-Content '%%f' -Value $content"

    echo Removed JSDoc comments from %%f
)

:: Change to build directory
pushd %buildDirectory%

:: move chrome manifest outside
move manifest_chrome.json ..
7z a "..\%releaseDirectory%%firefox_zip%" %fileList%

:: delete firefox manifest and move chrome one in
del manifest.json
move ..\manifest_chrome.json manifest.json

7z a "..\%releaseDirectory%%chromium_zip%" %fileList%

:: Return to original directory
popd

:: delete build directory
rmdir /S /Q "%buildDirectory%"

echo Built: %firefox_zip%, %chromium_zip%
pause
