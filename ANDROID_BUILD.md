# 小记忆 — Android 打包指南

## 方式一：Capacitor（推荐）

### 前置条件

| 工具 | 下载地址 | 说明 |
|------|----------|------|
| Node.js 18+ | https://nodejs.org | 选 LTS 版本 |
| Android Studio | https://developer.android.com/studio | 含 Android SDK |
| JDK 17+ | Android Studio 自带 | 无需单独安装 |

### 步骤

```bash
# 1. 进入项目目录
cd C:\SAPDevelop\SAPLearning\kids-memory

# 2. 安装依赖（只需一次）
npm install

# 3. 初始化 Capacitor Android 项目（只需一次）
npx cap add android

# 4. 每次修改代码后同步
npx cap sync android

# 5. 用 Android Studio 打开（打包/调试）
npx cap open android
```

在 Android Studio 中：
- 等待 Gradle 同步完成
- `Build → Generate Signed Bundle / APK → APK`
- 选择调试版本（Debug APK）直接安装测试
- 发布用 Release APK（需要签名密钥）

### 生成 Debug APK（快速测试）

在 Android Studio 中：
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```
APK 路径：`android/app/build/outputs/apk/debug/app-debug.apk`

用数据线传到手机，或通过 ADB 安装：
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 方式二：Android WebView 直接打包（无需 Node.js）

如果不想安装 Node.js，可以用纯 Android 项目包装。

1. 下载 Android Studio
2. 新建项目：`Empty Activity`（Java，API 21+）
3. 修改 `app/src/main/java/.../MainActivity.java`：

```java
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = new WebView(this);
        setContentView(webView);
        
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);          // localStorage
        settings.setDatabaseEnabled(true);            // IndexedDB
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false); // 语音自动播放
        settings.setAllowFileAccess(true);
        
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
    }
}
```

4. 将 `kids-memory/` 下所有文件复制到 `app/src/main/assets/`
5. `Build → Build APK`

---

## 权限配置（AndroidManifest.xml）

Capacitor 会自动添加，手动项目需确认包含：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

---

## 常见问题

**Q: 麦克风/相机权限被拒绝？**  
A: 在 Android 设置 → 应用 → 小记忆 → 权限，手动开启

**Q: 语音识别不工作？**  
A: Web Speech API 需要网络（使用 Google 服务），确保设备联网

**Q: AI 生成提示"网络错误"？**  
A: 国内访问 OpenAI 需要代理；DeepSeek/豆包/千问直接访问

**Q: IndexedDB 数据丢失？**  
A: Capacitor 模式下数据持久化，不清除应用数据不会丢失

---

## 发布到应用商店

生成 Release APK 需要签名：
```bash
# 生成签名密钥（一次性）
keytool -genkey -v -keystore kids-memory-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kids-memory

# 在 Android Studio 中：
# Build → Generate Signed Bundle / APK → APK → 选择密钥文件 → Release
```

国内可发布到：华为应用市场、小米应用商店、OPPO 软件商店等

---

## 发布到华为应用市场（AppGallery）& 荣耀应用市场

### 前置准备

| 材料 | 说明 |
|------|------|
| 华为开发者账号 | 注册地址：https://developer.huawei.com |
| 实名认证 | 个人或企业均可，国内身份证实名 |
| 签名 Release APK | 见上方签名步骤，必须用正式签名 |
| App 图标 | 512×512 PNG（无圆角，华为会自动添加圆角） |
| 截图 | 手机截图 2-5张，建议 1080×1920 |
| 应用简介 | 中文简介 30-500字 |
| 隐私政策 URL | 需要有可访问的隐私政策页面（可用 GitHub Pages 托管） |

---

### 步骤一：生成 Release APK

```bash
# 项目根目录执行
keytool -genkey -v -keystore kids-memory-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias kids-memory

# 填写：CN=开发者姓名, OU=, O=公司, L=城市, ST=省份, C=CN
```

在 Android Studio 中：
```
Build → Generate Signed Bundle / APK → APK
→ 选择 kids-memory-release.jks
→ 输入 alias 和密码
→ 选择 Release
→ V1 + V2 签名都勾选
```

生成路径：`android/app/build/outputs/apk/release/app-release.apk`

---

### 步骤二：配置 App ID

在 `capacitor.config.json` 中确保：
```json
{
  "appId": "com.kidsmemory.app",
  "appName": "小记忆"
}
```

App ID 必须唯一（不同应用商店使用同一个 ID），格式为反向域名。

---

### 步骤三：发布到华为 AppGallery

1. 登录 [华为开发者联盟](https://developer.huawei.com/consumer/cn/) → 我的应用 → 新建
2. 填写应用信息：
   - 应用名称：`小记忆 - 儿童英语语文学习`
   - 分类：`教育`→`儿童教育`
   - 语言：中文简体
3. 上传 Release APK
4. 填写应用简介（建议）：
   ```
   小记忆是一款专为中小学生和成人设计的智能记忆助手。
   采用科学记忆算法（Leitner + SM-2间隔复习），帮助高效背诵：
   • 小学/初中英语词汇、古诗词、数学公式
   • 成人英语：职场词汇、口语训练、发音纠错、IPA音标课程
   • 支持文件导入（Excel/Word/图片OCR）和AI智能生题
   • 完全离线可用，支持多个学习档案
   ```
5. 上传截图（在 Chrome DevTools 手机模拟中截图）
6. 填写隐私政策 URL（无服务器收集用户数据时可用简单声明）
7. 提交审核（通常 3-7 个工作日）

---

### 步骤四：发布到荣耀应用市场

荣耀（HONOR）从华为独立后有自己的应用市场：

1. 注册账号：https://developer.honor.com
2. 流程与华为 AppGallery 基本相同
3. 可用同一个签名 APK 和同一个 App ID

**注意**：华为和荣耀是两个独立平台，需要分别提交审核。APK 文件完全相同。

---

### 简单隐私政策模板

可以在 GitHub 创建 `privacy-policy.md` 并通过 GitHub Pages 发布：

```markdown
# 小记忆 隐私政策

本应用（小记忆）不收集任何个人信息，所有学习数据仅保存在用户设备本地。

- 不上传任何用户数据到服务器
- 不收集设备标识符、位置等个人信息
- AI 生题功能需用户自行配置第三方 AI 服务的 API Key，本应用不存储该 Key 到任何服务器
- 录音数据仅用于本地发音评分，不保存录音文件

如有疑问，请联系：[your-email@example.com]

最后更新：2024年
```

---

### 各大安卓应用商店汇总

| 应用市场 | 适合机型 | 开发者注册 |
|----------|----------|------------|
| 华为 AppGallery | 华为/麒麟芯片 | developer.huawei.com |
| 荣耀应用市场 | 荣耀手机 | developer.honor.com |
| 小米 GetApps | 小米/Redmi | dev.mi.com |
| OPPO 软件商店 | OPPO/一加/realme | open.oppomobile.com |
| vivo 应用商店 | vivo/iQOO | dev.vivo.com.cn |
| 应用宝（腾讯） | 全安卓 | open.tencent.com |
| 360手机助手 | 全安卓 | dev.360.cn |

