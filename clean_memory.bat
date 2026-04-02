@echo off
setlocal enabledelayedexpansion

:: Change the current directory to the location of this batch file
cd /d "%~dp0"

:: Check if the memory folder exists
if not exist "memory" (
    echo [ERROR] The 'memory' folder could not be found.
    pause
    exit /b
)

:: Move into the memory folder
pushd "memory"

echo =========================================
echo       Freai Memory Detox Program
echo =========================================
echo.

:: Loop through all files in the folder
for %%F in (*) do (
    set "DELETE_OK=true"
    
    :: Check for files to keep
    if /I "%%~nxF"==".gitignore" set "DELETE_OK=false"
    if /I "%%~nxF"=="InportantLog.txt" set "DELETE_OK=false"
    
    :: Execute deletion
    if "!DELETE_OK!"=="true" (
        echo [Deleting] %%~nxF
        del /f /q "%%F"
    ) else (
        echo [Keeping]  %%~nxF
    )
)

popd

echo.
echo -----------------------------------------
echo Cleanup complete.
echo -----------------------------------------
pause