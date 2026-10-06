@echo off
chcp 65001 >nul
title XHW 后端日志 - 实时
cd /d "%~dp0"

if not exist "_boot.log" (
    echo.
    echo   没有找到 _boot.log
    echo.
    echo   这个文件只有在后端被"后台方式"启动时才会写。
    echo   如果你是双击 start.bat 启动的后端，日志就在那个窗口里，
    echo   不需要这个脚本。
    echo.
    pause
    exit /b 1
)

echo ============================================================
echo   实时显示后端日志   _boot.log
echo.
echo   按 Ctrl+C 退出查看（不会停掉后端）
echo   登录验证码长这样：
echo     [登录验证码] 手机号: 13800000000  验证码: 123456
echo ============================================================
echo.

powershell -NoProfile -Command "Get-Content -Path '_boot.log' -Wait -Tail 40 -Encoding UTF8"
pause
