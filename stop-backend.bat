@echo off
chcp 936 >nul
setlocal enabledelayedexpansion
title 结束占用端口的进程

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8081"

echo ==================================================
echo  释放端口 %PORT%
echo  用法：双击 = 释放 8081
echo        stop-backend.bat 8080   释放其它端口
echo ==================================================
echo.

set "HIT="

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    if not "%%p"=="0" (
        set "HIT=1"
        set "PNAME=未知"
        for /f "tokens=1 delims=," %%n in ('tasklist /FI "PID eq %%p" /NH /FO CSV 2^>nul') do (
            set "PNAME=%%~n"
        )

        echo   发现 PID %%p  ^(!PNAME!^) 正在监听 %PORT%

        taskkill /PID %%p /F >nul 2>&1
        if errorlevel 1 (
            echo     [失败] 结束不了，可能需要以管理员身份运行
        ) else (
            echo     [完成] 已结束
        )
    )
)

echo.
if not defined HIT (
    echo 端口 %PORT% 上没有监听进程，不需要处理。
) else (
    echo 端口 %PORT% 已释放，可以去 IDEA 里点 Run 了。
)
echo.
pause
