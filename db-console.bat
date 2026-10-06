@echo off
REM ============================================================
REM  Open a MySQL console on the xhw database.
REM
REM  Usage:
REM    db-console.bat                      interactive prompt
REM    db-console.bat <file.sql>            run a .sql file and exit
REM
REM  ASCII only, on purpose: a .bat with non-ASCII text turns into
REM  mojibake depending on the machine's code page. Same trap that
REM  _gen_startnginx.py exists for - but there the Nginx scripts must
REM  be GBK because humans read them; this one simply has no Chinese
REM  in it at all, so plain ASCII is enough.
REM
REM  Credentials come from init-mysql.bat. Override without editing:
REM    set DB_USER=xxx
REM    set DB_PASSWORD=xxx
REM    db-console.bat
REM ============================================================

set "MYSQL=C:/Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

if not exist "%MYSQL%" (
  echo [x] mysql.exe not found. Edit the MYSQL line above.
  pause
  exit /b 1
)

if "%DB_USER%"=="" set "DB_USER=xhw"
if "%DB_PASSWORD%"=="" set "DB_PASSWORD=xhw123456"
if "%DB_NAME%"=="" set "DB_NAME=xhw"

REM 65001 = UTF-8 console. Without it the emoji in tb_blog.title
REM (the blog titles really do contain them) come out as ???.
chcp 65001 >nul

if not "%~1"=="" (
  echo === running %~1 ===
  "%MYSQL%" -h 127.0.0.1 -u %DB_USER% -p%DB_PASSWORD% ^
    --default-character-set=utf8mb4 --database=%DB_NAME% ^< "%~1"
  echo.
  echo [done]
  pause
  exit /b 0
)

"%MYSQL%" -h 127.0.0.1 -u %DB_USER% -p%DB_PASSWORD% ^
  --default-character-set=utf8mb4 --database=%DB_NAME%
