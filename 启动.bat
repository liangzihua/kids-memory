@echo off
echo 启动小记忆本地服务器...
cd /d "%~dp0"
start http://localhost:3000
node serve.js
pause
