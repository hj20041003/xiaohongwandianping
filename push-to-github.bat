@echo off
chcp 936 >nul
setlocal
title 推送到 GitHub

cd /d "%~dp0"

echo ==================================================
echo   把 小红碗 推送到 GitHub
echo   目标：https://github.com/hj20041003/xiaohongwandianping
echo ==================================================
echo.
echo   第一次推送会弹出窗口让你登录 GitHub（浏览器授权）。
echo   登录一次之后 git 就记住了，以后不用再登。
echo.
echo   如果弹不出窗口、或者报 "could not read Username"，
echo   说明这台机器的凭据管理器没配好，看文末的备选方案。
echo.
pause

echo.
echo [1/3] 当前状态
git log --oneline -1
echo   远程：origin = 你自己的仓库，upstream = 原版黑马点评（保留着方便对比）
git remote -v
echo.

echo [2/3] 开始推送...
git push -u origin main

if errorlevel 1 goto failed

echo.
echo [3/3] 完成
echo ==================================================
echo   推好了。打开 https://github.com/hj20041003/xiaohongwandianping
echo   看一下文件在不在、README 有没有正常显示。
echo ==================================================
goto end

:failed
echo.
echo ==================================================
echo   推送失败
echo ==================================================
echo   常见原因和办法：
echo.
echo   A) 报 "could not read Username" / 弹不出登录窗口
echo      改用令牌推送（令牌只给这个仓库的 Contents 读写权，用完删掉）：
echo        git remote set-url origin https://^<你的用户名^>:^<令牌^>@github.com/hj20041003/xiaohongwandianping.git
echo        git push -u origin main
echo        git remote set-url origin https://github.com/hj20041003/xiaohongwandianping.git
echo      （最后一步记得把令牌从远程地址里去掉）
echo.
echo   B) 报 "rejected" / "non-fast-forward"
echo      说明远程仓库里已经有东西了（比如建仓库时勾了 Add a README）。
echo      先拉下来合并，或者确认远程真的可以覆盖之后用：
echo        git push -u origin main --force
echo      （只有确认远程没有你想要的东西时才用 --force）
echo.
echo   C) 报 "Repository not found"
echo      检查仓库名拼写，以及你的账号有没有这个仓库的写权限。
echo.
goto end

:end
echo.
pause
