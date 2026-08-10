@echo off
REM Windows helper: folder path with spaces can break npm on this machine.
REM Syncs src to a short-path install and starts the Next.js dev server.

set "SRC=%~dp0"
set "APP=%USERPROFILE%\rems-app"

if not exist "%APP%\package.json" (
  mkdir "%APP%" 2>nul
  copy /Y "%SRC%package.json" "%APP%\package.json" >nul
  copy /Y "%SRC%tsconfig.json" "%APP%\tsconfig.json" >nul
  copy /Y "%SRC%next.config.ts" "%APP%\next.config.ts" >nul
  copy /Y "%SRC%vercel.json" "%APP%\vercel.json" >nul
  xcopy /E /I /Y /Q "%SRC%src" "%APP%\src" >nul
  xcopy /E /I /Y /Q "%SRC%public" "%APP%\public" >nul
  pushd "%APP%"
  call npm install --no-fund --no-audit
  popd
)

robocopy "%SRC%src" "%APP%\src" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
copy /Y "%SRC%package.json" "%APP%\package.json" >nul
copy /Y "%SRC%next.config.ts" "%APP%\next.config.ts" >nul

echo Starting Estate Progress at http://localhost:3000
pushd "%APP%"
call npm run dev
popd
