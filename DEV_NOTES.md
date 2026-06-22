# 小记忆 开发沟通记录

## 项目概述
- 项目名称：小记忆（Kids Memory）
- 项目路径：`C:\SAPDevelop\SAPLearning\kids-memory\`
- 技术栈：纯 Vanilla JS + HTML5 SPA，IndexedDB，Capacitor 6.x（Android APK）
- 包名：`com.kidsmemory.app`

---

## 主要功能模块

### 已完成功能
1. **多档案管理**：支持多个学习档案，语音切换
2. **闪卡学习**：SM-2 间隔复习算法，支持语文/英语/数学
3. **古诗文背诵**：小学33首+唐宋66首，含白话文翻译、词语注释、创作背景
4. **英语短文背诵**：100篇（小学40篇+初中60篇），含译文、关键词、背诵评分
5. **词库商店**：11个词库，支持下载（ECDICT/HSK/四六级等）
6. **全局查询**：搜索所有题库+古诗词
7. **语音功能**：TTS朗读、STT语音识别、跟读评分
8. **AI生题**：支持 DeepSeek/通义千问/豆包/OpenAI
9. **图片OCR**：拍照/上传图片解析题目
10. **音节着色**：英文单词按音节显示不同颜色辅助拼读
11. **本地服务器**：`启动.bat` 解决 Chrome file:// 限制

### 数据文件
- 小学古诗：`data/builtin/chinese/primary/primary_poems_full.json`（33首，含翻译+注释）
- 唐宋诗词：`data/builtin/chinese/tangpoems_full.json`（66首，含翻译+注释）
- 英语短文：`data/builtin/english/passages/primary_passages.json`（40篇）
- 英语短文：`data/builtin/english/passages/middle_passages.json`（60篇）

---

## Android APK 信息
- 签名文件：`android/kids-memory-release.jks`
- 签名密码：`KidsMemory2024!`
- KeyAlias：`kids-memory`
- Release APK：`小记忆-v1.0.apk`（3.2MB）

---

## 华为上架信息
- 开发者ID：80086000144626687
- 应用名称：小记忆
- 包名：com.kidsmemory.app
- 隐私政策：https://liangzihua.github.io/kids-memory-privacy/
- 官网：https://liangzihua.github.io/kids-memory-privacy/
- 图标：`store-assets/icon-216-A.png`（216×216，推荐阳光小孩方案）
- 截图：`store-assets/screenshot-*-450x800.png`（3张，450×800）

---

## GitHub 信息
- 用户名：liangzihua
- 隐私政策仓库：https://github.com/liangzihua/kids-memory-privacy
- 主项目仓库：https://github.com/liangzihua/kids-memory

---

## 关键技术决策

### 为什么用本地服务器而不是直接打开 index.html
Chrome 在 `file://` 协议下禁止 `fetch()` 读取本地文件，导致题库无法加载。
解决方案：双击 `启动.bat`，通过 `http://localhost:3000` 访问。

### bundle.js 打包
所有 JS 模块用 esbuild 打包成单文件，解决 `file://` 协议下 ES module 限制：
```bash
npx esbuild app/ui.js --bundle --outfile=bundle.js --format=iife --platform=browser --target=es2020
```

### 古诗词搜索（window._recitationTexts）
esbuild 打包后模块作用域隔离，`getRecitationTexts()` 在 `buildSearchIndex` 里不可见。
解决方案：`recitation.js` 加载完后挂到 `window._recitationTexts`，`ui.js` 通过 window 访问。

### Capacitor Android 签名
`android/app/build.gradle` 已配置 release 签名，`./gradlew assembleRelease` 直接生成签名 APK。

---

## 常用命令

```bash
# 启动本地服务器
node serve.js

# 重新打包 JS
npx esbuild app/ui.js --bundle --outfile=bundle.js --format=iife --platform=browser --target=es2020

# 同步到 Android
npx cap sync android

# 构建 Release APK
cd android && ./gradlew assembleRelease

# 复制 APK
cp android/app/build/outputs/apk/release/app-release.apk 小记忆-v1.0.apk

# 生成上架图片素材
node tools/capture-store-assets.js
```

---

## 待完善事项
- [ ] 初中文言文数据（middle_texts_full.json 待创建）
- [ ] 唐宋诗词扩展到 100-150 首
- [ ] 小学词语题库词语注释补全
- [ ] 华为上架版权证书（可通过易版权平台申请）
- [ ] Gitee 实名认证通过后开启 Pages（备用隐私政策地址）
