@echo off
REM Full reset + reseed: cleanup, resolve live reference data, generate 3 rolling months of
REM data, apply -- all handled by seed.js itself. Safe to run repeatedly at any time.
REM Requires Node.js and sqlcmd on PATH.

setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%seed.js"
if errorlevel 1 (
  echo Seed run FAILED.
  exit /b 1
)
endlocal
