@echo off
chcp 936 >nul
title 小红碗 XHW 停止 nginx

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
