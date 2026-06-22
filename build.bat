@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 打包 JS 文件...
call npx esbuild app/ui.js --bundle --outfile=bundle.js --format=iife --platform=browser --target=es2020 --log-level=warning
if %errorlevel% neq 0 (
    echo 打包失败！
    pause
    exit /b 1
)
echo bundle.js 已更新（%~dpnx0 执行完成）

:: 如果需要同时构建 APK，取消下面注释
:: echo 同步到 Android...
:: call npx cap sync android
:: cd android
:: call gradlew assembleDebug
:: cd ..
:: copy /y android\app\build\outputs\apk\debug\app-debug.apk 小记忆-debug.apk
:: echo APK 已更新

echo.
echo 现在可以直接打开 index.html 测试，或运行 start.bat 启动服务器。
