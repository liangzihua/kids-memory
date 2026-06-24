# 小记忆 开发沟通记录

## 项目概述
- 项目名称：小记忆（Kids Memory）
- 项目路径：`C:\SAPDevelop\SAPLearning\kids-memory\`
- 技术栈：纯 Vanilla JS + HTML5 SPA，IndexedDB，Capacitor 6.x（Android APK）
- 包名：`com.kidsmemory.app`
- 当前版本：v1.1（2026-06-23）

---

## 主要功能模块

### 已完成功能
1. **多档案管理**：支持多个学习档案，语音切换
2. **闪卡学习**：SM-2 间隔复习算法，支持语文/英语/数学
3. **古诗文背诵**：小学33首+唐宋66首，含白话文翻译、词语注释、创作背景
4. **英语短文背诵**：100篇（小学40篇+初中60篇），含译文、关键词、背诵评分
5. **词库商店**：11个词库，支持下载（ECDICT/HSK/四六级等）
6. **全局查询**：搜索所有题库+古诗词（含古诗文内嵌搜索）
7. **语音功能**：TTS朗读、STT语音识别、跟读评分
8. **图片OCR**：拍照/上传图片自动解析题目（本地识别）
9. **音节着色**：英文单词按音节显示不同颜色辅助拼读
11. **本地服务器**：`启动.bat` 解决 Chrome file:// 限制
12. **拼音学习**：声母韵母表、四声、多音字、看拼音写词语、看词语写拼音
13. **语文学习中心**：古诗背诵/拼音/生字词语/成语/古诗题库，全部内嵌显示不跳页
14. **统一页面返回**：历史栈导航，所有页面返回上一页，header 右侧有🏠返回主页按钮

### 数据文件
- 小学古诗：`data/builtin/chinese/primary/primary_poems_full.json`（33首，含翻译+注释）
- 唐宋诗词：`data/builtin/chinese/tangpoems_full.json`（66首，含翻译+注释）
- 英语短文：`data/builtin/english/passages/primary_passages.json`（40篇）
- 英语短文：`data/builtin/english/passages/middle_passages.json`（60篇）
- 拼音数据：`data/builtin/chinese/pinyin.json`（声母/韵母/多音字48个/看拼音写词语84条/看词语写拼音50条）

---

## UI 设计要点
- 主页：渐变橙色 header，4张学科卡片横向铺满（1行4列），下方英语/语文快捷按钮行
- 语文快捷区：🏮古诗背诵 / 🔡拼音 / 📝生字词语 / 📜成语，点击直接定位到语文学习中心对应Tab
- 英语快捷区：🎤口语练习 / 🔤音标课程 / 📖语法要点
- 所有页面 header 彩色渐变（语文红/英语蓝/数学紫/主橙）
- 页面返回：统一历史栈，返回按钮回上一页，🏠按钮回主页

---

## Android APK 信息
- 签名文件：`android/kids-memory-release.jks`
- 签名密码：`KidsMemory2024!`
- KeyAlias：`kids-memory`
- Release APK：`小记忆-v1.1.apk`（3.2MB）
- 版本code：2，版本名：1.1.0

---

## 华为上架信息
- 开发者ID：80086000144626687
- 应用名称：小记忆
- 包名：com.kidsmemory.app
- 隐私政策：https://liangzihua.github.io/kids-memory-privacy/
- 官网：https://liangzihua.github.io/kids-memory-privacy/
- 图标：`store-assets/icon-216-A.png`（216×216）
- 截图：`store-assets/screenshot-*-450x800.png`（3张，450×800）
- **v1.0 被拒原因**：未勾选隐私标签，需在"隐私标签信息录入"→"是"→"应用功能"→添加语音数据和图片数据项
- **v1.1 修复**：隐私标签已正确填写，重新提交

---

## GitHub / Gitee 信息
- GitHub 用户名：liangzihua
- Gitee 用户名：liangzihua1986
- 隐私政策仓库：https://github.com/liangzihua/kids-memory-privacy
- GitHub 主仓库：https://github.com/liangzihua/kids-memory
- Gitee 主仓库：https://gitee.com/liangzihua1986/kids-memory
- 同时推送命令：`git push origin main && git push gitee main`

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

### 跨模块页面路由（window._showPage / window._goBack）
esbuild 打包后模块作用域隔离，其他模块（recitation.js/passages.js/pinyin.js/english.js）
无法直接调用 ui.js 里的 showPage/goBack。
解决方案：在 ui.js 里挂 `window._showPage = showPage` 和 `window._goBack = goBack`，
其他模块通过 `window._showPage('page-id')` 统一走历史栈。

### 历史栈导航
- `_pageHistory` 数组记录导航路径，`_isGoingBack` 标志防止返回时再次记录
- `showPage()` 自动记录来源页（排除 profiles 页）
- 所有模块调 `window._showPage()` 而非直接操作 DOM，保证历史栈完整

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

# 复制 APK（更新版本号）
cp android/app/build/outputs/apk/release/app-release.apk 小记忆-v1.1.apk

# 生成上架图片素材
node tools/capture-store-assets.js

# 同步代码到两个仓库
git add . && git commit -m "更新说明" && git push origin main && git push gitee main
```

---

## 待完善事项
- [ ] 初中文言文数据（middle_texts_full.json 待创建）
- [ ] 唐宋诗词扩展到 100-150 首
- [ ] 华为上架版权证书（可通过易版权平台申请）
- [ ] Gitee 实名认证通过后开启 Pages（备用隐私政策地址）
- [ ] iOS 版本（需要 Mac + Xcode）
- [ ] 发布到更多国内应用市场（小米、OPPO、vivo）
