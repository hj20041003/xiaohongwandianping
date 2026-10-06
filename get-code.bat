@echo off
chcp 936 >nul
rem 必须开延迟展开：下面 if/else 括号块里赋值的变量，用 %VAR% 会在整块
rem 解析时就展开成空值（那时候还没赋值），只能用 !VAR!。
setlocal enabledelayedexpansion
title 取登录验证码（从 Redis 读）

rem 后端不接短信网关，验证码只写进 Redis 的 login:code:<手机号>（2 分钟有效）。
rem 这个脚本就是把它读出来，省得在一堆 MyBatis 日志里翻。
rem 如果 redis-cli 不在下面这个位置，改这里就行。
set "REDIS_CLI=D:\tools\redis-7.2.16\redis-cli.exe"
set "PHONE=%~1"

set "TMPC=%TEMP%\xhw_code.txt"
set "TMPT=%TEMP%\xhw_ttl.txt"
set "TMPP=%TEMP%\xhw_ping.txt"

if not exist "%REDIS_CLI%" (
    echo [错误] 找不到 redis-cli.exe
    echo        脚本顶部 REDIS_CLI 指向：%REDIS_CLI%
    echo        改成你的实际路径即可。
    echo.
    pause
    exit /b 1
)

if "%PHONE%"=="" (
    echo 后端不接短信网关，验证码只存在 Redis 里。
    echo 先在登录页点「获取验证码」，再回来用手机号取。
    echo.
    set /p "PHONE=手机号（11 位）: "
)

if "%PHONE%"=="" (
    echo.
    echo [错误] 手机号不能为空。
    echo.
    pause
    exit /b 1
)

echo.
echo   手机号 %PHONE%
echo.

rem 先确认 Redis 活着，否则下面的"没取到"会误导人
"%REDIS_CLI%" -h 127.0.0.1 -p 6379 --raw ping > "%TMPP%" 2>nul
set "PONG="
set /p PONG=<"%TMPP%"
if /i not "%PONG%"=="PONG" (
    echo   [错误] 连不上 Redis ^(127.0.0.1:6379^)。
    echo          后端和验证码都依赖它，先把 Redis 起起来再试。
    del "%TMPP%" >nul 2>&1
    echo.
    pause
    exit /b 1
)

rem 用临时文件 + set /p 读，不用 for /f——
rem for /f 里执行带引号的 exe 路径会报"文件名、目录名或卷标语法不正确"
"%REDIS_CLI%" -h 127.0.0.1 -p 6379 --raw get "login:code:%PHONE%" > "%TMPC%" 2>nul
set "CODE="
set /p CODE=<"%TMPC%"

if "%CODE%"=="" (
    echo   [没取到] Redis 里没有这个手机号的验证码。
    echo.
    echo   按顺序排查：
    echo     1. 登录页点过「获取验证码」没有？点了才会生成。
    echo     2. 手机号是不是输错了？
    echo     3. 验证码只有 2 分钟有效期，是不是过期了？
) else (
    "%REDIS_CLI%" -h 127.0.0.1 -p 6379 --raw ttl "login:code:%PHONE%" > "%TMPT%" 2>nul
    set "LEFT="
    set /p LEFT=<"%TMPT%"
    echo   ============================================
    echo       验证码：   !CODE!
    echo   ============================================
    echo.
    echo   还剩 !LEFT! 秒有效（总共 2 分钟）
)

del "%TMPC%" "%TMPT%" "%TMPP%" >nul 2>&1
echo.
pause
