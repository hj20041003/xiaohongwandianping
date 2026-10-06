# -*- coding: utf-8 -*-
"""
生成 nginx-1.18.0 目录下的两个启动脚本：
    start-nginx.bat   —— 双击启动前端（先清理重复实例，再启动，最后自检）
    stop-nginx.bat    —— 双击停止前端（清掉本目录下所有 nginx 进程）

为什么用脚本生成而不是直接写文件：
  中文 Windows 的 cmd 默认代码页是 936(GBK)，.bat 里的中文必须是 GBK 字节，
  否则双击后会乱码甚至被当成命令执行。用 Python 从一个 UTF-8 源码统一转码，
  保证整份文件只有一种编码，不会出现"半 GBK 半 UTF-8"的混编事故。
本脚本自身是 UTF-8（Python 3 源码默认），输出是 GBK + CRLF。

注意：.bat 用了 setlocal enabledelayedexpansion，
      所以正文里 **不能出现半角感叹号 !**，否则会被吃掉。
"""
import pathlib

HEADER_COMMON = r"""@echo off
chcp 936 >nul
"""

# ============================================================
#  start-nginx.bat
# ============================================================
START_BAT = HEADER_COMMON + r"""setlocal enabledelayedexpansion
title 小红碗 XHW 前端 nginx

REM ============================================================
REM  启动前端 nginx（小红碗 XHW）
REM
REM  用法：直接双击本文件
REM  必须在 nginx-1.18.0 目录下执行，nginx.conf 里的相对路径依赖于此
REM
REM  为什么这个脚本看起来啰嗦：nginx 在 Windows 上是 master + worker
REM  两个进程，**只有 worker 监听端口**，而 worker 被杀掉之后 master
REM  会立刻重新拉起一个新的（实测：杀 worker 后 2 秒内出现新 worker，
REM  端口始终不释放）。所以"杀 netstat 里那个 PID"对 nginx 是无效的，
REM  必须连 master 一起清，这一步交给同目录的 nginx-kill.ps1 精确完成。
REM  踩坑记录见 改造说明.md 第十五节。
REM ============================================================

cd /d "%~dp0"

REM nginx 依赖 logs 与 temp 目录，而 git 不跟踪空目录，首次运行需自动创建
if not exist "logs" mkdir "logs"
if not exist "temp" mkdir "temp"
if not exist "temp\client_body_temp" mkdir "temp\client_body_temp"
if not exist "temp\proxy_temp" mkdir "temp\proxy_temp"
if not exist "temp\fastcgi_temp" mkdir "temp\fastcgi_temp"
if not exist "temp\uwsgi_temp" mkdir "temp\uwsgi_temp"
if not exist "temp\scgi_temp" mkdir "temp\scgi_temp"

echo.
echo ============================================================
echo   小红碗 XHW 前端启动
echo ============================================================

REM ---------- 1. 检查 8080 ----------
echo.
echo [1/4] 检查 8080 端口 ...
call :SCAN8080
if not defined BUSY goto :NO_BUSY
if !BUSY_N! GTR 1 goto :PORT_MULTI
goto :PORT_ONE

:NO_BUSY
echo       [OK] 8080 空闲
goto :SWEEP

:PORT_ONE
set "BUSY_NAME=未知"
for /f "tokens=1 delims=," %%n in ('tasklist /FI "PID eq !BUSY!" /NH /FO CSV 2^>nul') do set "BUSY_NAME=%%~n"
echo.
echo ============================================================
echo   [占用] 8080 端口已经有程序在监听
echo.
echo     worker PID：!BUSY_SP!   进程：!BUSY_NAME!
echo.
echo   如果那已经是本项目的 nginx，就不必再启动一个了；
echo   想让最新的 nginx.conf 生效，重启一次是最省事的做法。
echo.
echo   注意：如果上面的进程名不是 nginx.exe，结束它可能影响别的程序，
echo         请先确认清楚再决定。
echo ============================================================
set "ANS="
set /p "ANS=要清理占用 8080 的 nginx 并重新启动吗？输入 y 回车继续，直接回车则退出 : "
if /i not "!ANS!"=="y" goto :CANCELLED
goto :SWEEP

:PORT_MULTI
echo.
echo ============================================================
echo   [占用] 8080 端口有多个 nginx worker 在监听
echo.
echo     worker PID：!BUSY_SP!
echo.
echo   这是本项目踩过的坑：同一个 nginx 被启动了两次，两个实例都绑在
echo   8080 上。此时请求会在两个实例之间来回乱窜，nginx -s reload 也
echo   只会重载其中一个，于是出现"改了的配置有时候生效、有时候不生效"，
echo   很容易被误判成"配置写错了"或"浏览器缓存"。
echo.
echo   本脚本会把本目录下所有 nginx 进程（含 master）一起清掉，再干净
echo   地启动一个。别的目录下的 nginx 不受影响。
echo ============================================================
set "ANS="
set /p "ANS=要清理并重新启动吗？输入 y 回车继续，直接回车则退出 : "
if /i not "!ANS!"=="y" goto :CANCELLED
goto :SWEEP

:CANCELLED
echo.
echo       已取消，没有做任何改动。
echo       提示：也可以双击 stop-nginx.bat 单独停掉 nginx。
pause
exit /b 1

REM ---------- 2. 清理本目录下的旧实例 ----------
:SWEEP
echo.
echo [2/4] 清理本目录下可能残留的 nginx 进程 ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0nginx-kill.ps1"
set "KC=!errorlevel!"
if "!KC!"=="0" goto :SWEEP_OK
if "!KC!"=="2" goto :SWEEP_NONE
if "!KC!"=="3" goto :NO_EXE
goto :KILL_WARN

:SWEEP_OK
echo       [OK] 已清理旧实例
goto :AFTER_SWEEP

:SWEEP_NONE
echo       [OK] 没有残留，无需清理
goto :AFTER_SWEEP

:NO_EXE
echo       [ERROR] 没找到 nginx.exe，请确认本文件就在 nginx-1.18.0 目录里。
pause
exit /b 1

:KILL_WARN
echo       [WARN] 有进程没能结束，可能是权限问题。
echo              如果接下来提示端口仍被占用，请右键以管理员身份重跑本文件。

:AFTER_SWEEP
ping -n 3 127.0.0.1 >nul
call :SCAN8080
if defined BUSY goto :STILL_BUSY

REM ---------- 3. 配置检查 ----------
echo.
echo [3/4] 检查 nginx 配置 ...
nginx.exe -t
if errorlevel 1 goto :CONF_BAD

REM ---------- 4. 启动 ----------
echo.
echo [4/4] 启动 nginx ...
start "" nginx.exe
ping -n 3 127.0.0.1 >nul
call :SCAN8080
if !BUSY_N! EQU 1 goto :STARTED
echo.
echo       [WARN] 启动后 8080 上的监听进程数是 !BUSY_N!，不正常。
echo              请双击 stop-nginx.bat 全部停掉，再重跑本文件。
goto :SUMMARY

:STARTED
echo       [OK] 已启动，8080 上的监听进程数：1

:SUMMARY
echo.
echo ============================================================
echo   nginx 已启动
echo.
echo   前端地址：http://localhost:8080
echo   登录入口：http://localhost:8080/login.html
echo   停止服务：双击 stop-nginx.bat
echo.
echo   提示：后端服务需另行启动（运行上级目录的 start.bat）
echo.
echo   本项目给 html/css/js 加了 Cache-Control: no-cache，浏览器每次
echo   都会回服务器校验，改完前端刷新即可看到，不会再拿到旧页面。
echo ============================================================
echo.
pause
exit /b 0

:STILL_BUSY
echo.
echo [ERROR] 清理之后 8080 仍然被占用（worker PID：!BUSY_SP!）。
echo         可能是权限不足，或者占用它的不是本项目的 nginx。
echo         请用管理员身份重试，或到任务管理器里手动结束。
pause
exit /b 1

:CONF_BAD
echo.
echo [ERROR] nginx 配置检查未通过，请查看上方错误信息。
echo         常见原因：nginx.conf 里多了个花括号、少了分号，
echo         或者 location 后面漏了空格。
pause
exit /b 1


REM ============================================================
REM  子过程：扫描 8080 上所有 LISTENING 的 PID
REM  nginx 只有 worker 监听端口，所以这里的个数 == 实例个数
REM    BUSY      第一个 PID
REM    BUSY_N    去重后的个数
REM    BUSY_KEY  逗号分隔（只用于去重判断，绝不能拿去跑 for）
REM    BUSY_SP   空格分隔（用于 for 循环和显示）
REM
REM  为什么要两个变量：netstat 对同一个进程可能同时输出 IPv4 和
REM  IPv6 两行，需要去重；而 for %%x in (!VAR!) 里的逗号会在
REM  **解析期**就把集合拆开，导致延迟展开的替换根本不会执行
REM  （实测报错：错误: 没有找到进程 "BUSY_LIST:"）。所以去重和
REM  遍历各用一个变量，互不干扰。
REM ============================================================
:SCAN8080
set "BUSY="
set "BUSY_N=0"
set "BUSY_KEY="
set "BUSY_SP="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING"') do call :ADD_PID %%p
exit /b

:ADD_PID
if "%1"=="0" exit /b
echo %BUSY_KEY% | findstr /c:",%1," >nul && exit /b
if not defined BUSY set "BUSY=%1"
set "BUSY_KEY=%BUSY_KEY%,%1,"
set "BUSY_SP=%BUSY_SP% %1"
set /a BUSY_N+=1
exit /b
"""

# ============================================================
#  stop-nginx.bat
# ============================================================
STOP_BAT = HEADER_COMMON + r"""title 小红碗 XHW 停止 nginx

REM ============================================================
REM  停止前端 nginx（小红碗 XHW）
REM
REM  nginx.exe -s stop 只认 logs\nginx.pid 里记录的那一个 master，
REM  如果之前不小心启动了多个实例（各有一份 master+worker），
REM  它只能停掉其中一个，剩下的继续占着 8080。
REM  所以这里统一交给 nginx-kill.ps1 按目录精确清理。
REM ============================================================

cd /d "%~dp0"

echo.
echo 正在停止本目录下的所有 nginx 进程 ...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0nginx-kill.ps1"
set "KC=%errorlevel%"

if "%KC%"=="0" echo   [OK] 已全部停止。
if "%KC%"=="2" echo   [OK] 本来就没有 nginx 在跑，什么都没做。
if "%KC%"=="3" echo   [ERROR] 没找到 nginx.exe，请确认本文件就在 nginx-1.18.0 目录里。
if "%KC%"=="1" echo   [WARN] 有进程没能结束，请右键以管理员身份重跑本文件。

echo.
echo 注意：别的目录下的 nginx（比如 D:\nginx-1.20.2）不会被停掉。
echo.
pause
"""


def emit(path: str, text: str) -> None:
    p = pathlib.Path(path)
    data = text.replace("\r\n", "\n").replace("\n", "\r\n")
    p.write_bytes(data.encode("gbk"))
    raw = p.read_bytes()
    body = raw.decode("gbk")
    bad = [c for c in body if c in "蠖ǘ觯╡"]
    print("---", p.name)
    print("   字节数:", len(raw))
    print("   CRLF:", raw.count(b"\r\n"), " 裸LF:", raw.count(b"\n") - raw.count(b"\r\n"))
    print("   GBK 解码: OK   乱码:", bad if bad else "无")


emit(r"D:\xhw\nginx-1.18.0\start-nginx.bat", START_BAT)
emit(r"D:\xhw\nginx-1.18.0\stop-nginx.bat", STOP_BAT)
