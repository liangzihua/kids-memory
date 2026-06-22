@echo off
chcp 65001 >nul
echo ====================================
echo  小记忆 Android 打包脚本
echo ====================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装：https://nodejs.org
    pause
    exit /b 1
)

:: 检查 npm 依赖
if not exist "node_modules" (
    echo [1/4] 安装 npm 依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] npm install 失败
        pause
        exit /b 1
    )
)

:: 检查 android 目录
if not exist "android" (
    echo [2/4] 初始化 Android 项目...
    call npx cap add android
    if %errorlevel% neq 0 (
        echo [错误] cap add android 失败，请检查 Android Studio 是否已安装
        pause
        exit /b 1
    )
) else (
    echo [2/4] Android 项目已存在，跳过初始化
)

:: 同步代码
echo [3/4] 同步代码到 Android 项目...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [错误] cap sync 失败
    pause
    exit /b 1
)

:: 打开 Android Studio
echo [4/4] 打开 Android Studio...
echo.
echo 在 Android Studio 中：
echo   调试 APK：Build -^> Build Bundle / APK -^> Build APK(s)
echo   发布 APK：Build -^> Generate Signed Bundle / APK
echo.
call npx cap open android

echo.
echo 完成！APK 生成后在 android\app\build\outputs\apk\ 目录中
pause
