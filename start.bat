@echo off
chcp 65001 >nul
echo 启动小记忆本地服务器...
echo.
echo 服务器启动后请在浏览器打开：
echo   http://localhost:3000
echo.
echo 手机访问（需同一WiFi）：
echo   http://[本机IP]:3000
echo.
echo 按 Ctrl+C 停止服务器
echo.

cd /d "%~dp0"

:: 优先用 npx serve
where npx >nul 2>&1
if %errorlevel%==0 (
    npx serve . --port 3000
    goto :eof
)

:: 备用：Python
where python >nul 2>&1
if %errorlevel%==0 (
    python -m http.server 3000
    goto :eof
)

where python3 >nul 2>&1
if %errorlevel%==0 (
    python3 -m http.server 3000
    goto :eof
)

echo 错误：未找到 Node.js 或 Python，请先安装其中一个。
echo 下载 Node.js: https://nodejs.org
pause
