
@echo off
chcp 936 >nul
setlocal enabledelayedexpansion
title 小红碗 XHW 后端启动

REM ============================================================
REM  小红碗  一键启动脚本（改造版：H2 免装 MySQL）
REM
REM  用法：直接双击本文件
REM  前提：Redis 已在 127.0.0.1:6379 运行（无密码）
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   小红碗 XHW 一键启动
echo ============================================================
echo.

REM ---------- 0. 修正 JAVA_HOME ----------
REM  有些机器上系统级 JAVA_HOME 指向了不存在的路径，这里自动纠正。
if not exist "%JAVA_HOME%\bin\javac.exe" (
    set "JAVA_HOME="
    for /d %%d in ("C:\Program Files\Java\jdk*") do set "JAVA_HOME=%%d"
    if not exist "!JAVA_HOME!\bin\javac.exe" (
        set "JAVA_HOME="
        for /d %%d in ("C:\Program Files\Eclipse Adoptium\jdk*") do set "JAVA_HOME=%%d"
    )
)
if exist "!JAVA_HOME!\bin\javac.exe" (
    set "PATH=!JAVA_HOME!\bin;!PATH!"
    echo [0/5] JDK 已就绪：!JAVA_HOME!
) else (
    echo [0/5] [WARN] 未自动找到 JDK，将沿用系统 JAVA_HOME=!JAVA_HOME!
    echo       若后面报 JAVA_HOME 错误，请手动执行：
    echo           set JAVA_HOME=C:\Program Files\Java\jdk-11
)
echo.

REM ---------- 1. 检查 Redis ----------
echo [1/5] 检查 Redis ...
where redis-cli >nul 2>nul
if !errorlevel! equ 0 (
    redis-cli -h 127.0.0.1 -p 6379 ping >nul 2>nul
    if !errorlevel! equ 0 (
        echo       [OK] Redis 正常响应
        for /f "tokens=2 delims=:" %%v in ('redis-cli -h 127.0.0.1 -p 6379 info server ^| findstr /b "redis_version"') do set REDIS_VER=%%v
        set REDIS_VER=!REDIS_VER: =!
        echo       版本：!REDIS_VER!
        set "REDIS_MAJOR=0"
        for /f "tokens=1,2 delims=." %%a in ("!REDIS_VER!") do set REDIS_MAJOR=%%a%%b
        if "!REDIS_MAJOR!"=="" set "REDIS_MAJOR=0"
        if !REDIS_MAJOR! LSS 50 (
            echo.
            echo       [WARN] 当前 Redis 低于 5.0，不支持 Stream，秒杀下单不可用。
            echo              请升级到 Redis 6.2+ 以获得完整体验。
            echo.
        )
    ) else (
        echo       [ERROR] Redis 无法连接！请先启动 Redis（Redis 服务是否在运行？）
    )
) else (
    echo       [WARN] 未找到 redis-cli，跳过检查。请确认 Redis 已在 127.0.0.1:6379 运行。
    echo            本项目自带的 redis-cli 在 D:\tools\redis-7.2.16\redis-cli.exe
)
echo.

REM ---------- 2. 检查 Maven ----------
echo [2/5] 检查 Maven ...
set "MVN_CMD=mvn"
where mvn >nul 2>nul
if not !errorlevel! equ 0 (
    if exist "D:\tools\apache-maven-3.9.9\bin\mvn.cmd" (
        set "MVN_CMD=D:\tools\apache-maven-3.9.9\bin\mvn.cmd"
        echo       [OK] 使用内置 Maven：D:\tools\apache-maven-3.9.9
    ) else (
        echo       [ERROR] 未找到 mvn。请安装 Maven，或用 IDEA 打开本项目直接运行。
        pause
        exit /b 1
    )
) else (
    echo       [OK] mvn 已找到
)
echo.

REM ---------- 3. 检查 8081 是否已被占用 ----------
REM  这是最常见的失败原因：IDEA 里已经有一个实例在跑，这里又起一个。
REM  此时应用会在绑定端口时退出（exit code 1），而 Maven 只会报一句
REM      Failed to execute goal ... spring-boot-maven-plugin...:run
REM      ... Application finished with exit code: 1
REM  真正的死因（Port 8081 was already in use）藏在上面几十行里，很容易看漏，
REM  所以这里先拦一道，把话说清楚，别让人去猜 Maven 那句是什么意思。
echo [3/5] 检查端口 8081 ...
set "BUSY="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    if not "%%p"=="0" (
        if not defined BUSY set "BUSY=%%p"
    )
)
if defined BUSY (
    set "BUSY_NAME=未知"
    for /f "tokens=1 delims=," %%n in ('tasklist /FI "PID eq !BUSY!" /NH /FO CSV 2^>nul') do set "BUSY_NAME=%%~n"
    echo.
    echo ============================================================
    echo   [占用] 8081 端口已经有程序在监听
    echo.
    echo     PID !BUSY!   ^(!BUSY_NAME!^)
    echo.
    echo   如果那是 IDEA 里正在跑的实例，去 IDEA 里点红色方块停掉；
    echo   也可以直接在这里结束它。两个实例不能同时占 8081。
    echo ============================================================
    echo.
    set "ANS="
    set /p "ANS=要结束 PID !BUSY! 吗？输入 y 回车继续，直接回车则退出 : "
    if /i "!ANS!"=="y" (
        taskkill /PID !BUSY! /F
        echo.
        echo       [OK] 已结束，继续启动...
        ping -n 3 127.0.0.1 >nul
    ) else (
        echo.
        echo       已取消，没有做任何改动。
        echo       提示：也可以用 stop-backend.bat 释放端口。
        pause
        exit /b 1
    )
) else (
    echo       [OK] 8081 空闲
)
echo.

REM ---------- 4. 启动后端 ----------
echo [4/5] 启动后端服务...
echo.
echo   后端地址：http://localhost:8081
echo   H2 控制台：仅当用 --spring.profiles.active=h2 启动时才有，
echo             地址 http://localhost:8081/h2-console
echo   默认数据源是 MySQL（xhw 库），要看数据用 Workbench 或 db-console.bat
echo.
echo   启动成功后，另开一个窗口进入 nginx-1.18.0 目录执行 start-nginx.bat
echo   前端地址：http://localhost:8080
echo.
echo   登录说明：登录页点「获取验证码」后，验证码会直接显示在页面上并自动填入
echo             （由 xhw.dev-login-code 控制，详见改造说明.md 第十三节）
echo.
echo ============================================================
echo   [提示] 本窗口保持打开。按 Ctrl+C 可停止后端。
echo ============================================================
echo.

REM ---- 清掉可能来自宿主/IDE 的端口类环境变量 ----
REM  某些宿主环境会注入 SERVER__PORT / SERVER_PORT，Spring Boot 的宽松绑定
REM  会把它们当成 server.port，从而覆盖 application.yaml 里的 8081，
REM  导致端口冲突甚至启动失败。这里主动清空，并用命令行参数强制端口。
set "SERVER__PORT="
set "SERVER_PORT="
set "SERVER__HOST="

call "!MVN_CMD!" spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"

echo.
echo 后端已停止。
pause
