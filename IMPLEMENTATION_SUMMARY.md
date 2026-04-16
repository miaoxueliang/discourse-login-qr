# Discourse 登录页二维码扫码登录实现方案

## 📌 需求总结

✅ **已实现**：
1. 二维码来源：返回 URL 让前端生成（不是 base64）
2. Classin 登录：先预留图片地方，后续需读取另一个项目
3. 前端形式：集成到 Discourse 官方主题中（不是独立 HTML）
4. 二维码 Tab 切换：企微 ↔ Classin

---

## 🏗️ 架构设计

### 系统流程图

```
用户访问登录页
    ↓
Discourse 主题加载组件 (discourse-qrcode-login)
    ↓
[前端] 调用后端 API /v1/api/discourse/qrcode/url?type=wecom
    ↓
[后端] DiscourseQrcodeController 返回 OAuth2 URL
    ↓
[前端] 用 qrcode.js 库生成二维码
    ↓
用户用手机 App 扫码
    ↓
跳转到 OAuth2 回调地址 → SSO 登录成功
```

---

## 📂 项目结构

```
eeo-edu/
├── src/main/java/com/eeo/edu/controller/open/discourse/
│   └── DiscourseQrcodeController.java          ✨ [新建] 后端 API
│
└── src/main/discourse-theme/
    ├── components/
    │   └── discourse-qrcode-login.hbs          ✨ [新建] Handlebars 模板
    ├── javascript/components/
    │   └── discourse-qrcode-login.js           ✨ [新建] Ember.js 组件
    ├── stylesheets/
    │   └── discourse-qrcode-login.scss         ✨ [新建] 组件样式
    └── INTEGRATION_GUIDE.md                    ✨ [新建] 集成指南
```

---

## 🔧 核心实现

### 1️⃣ 后端 API（Java）

**文件**：`DiscourseQrcodeController.java`

**端点**：
```
GET /v1/api/discourse/qrcode/url?type=wecom
GET /v1/api/discourse/qrcode/url?type=classin
```

**功能**：
- ✅ 返回企微 OAuth2 URL（从配置读取）
- ✅ 返回 Classin OAuth2 URL（支持后续配置）
- ✅ 错误处理和日志记录
- ✅ 占位符机制（Classin 未配置时返回占位符）

**响应示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "type": "wecom",
    "url": "https://open.weixin.qq.com/connect/oauth2/authorize?appid=..."
  }
}
```

### 2️⃣ 前端组件（Discourse 主题）

**模板**：`discourse-qrcode-login.hbs`

**特点**：
- ✅ 两个 Tab：企微 | Classin
- ✅ 动态加载二维码
- ✅ 加载状态、错误状态、占位符状态
- ✅ 响应式设计（桌面 + 手机）

**逻辑**：`discourse-qrcode-login.js`

**特点**：
- ✅ Ember.js 组件架构
- ✅ 动态加载 qrcode.js 库
- ✅ 缓存二维码 URL（避免重复请求）
- ✅ 错误重试机制
- ✅ 生命周期管理（didInsertElement / willDestroyElement）

**样式**：`discourse-qrcode-login.scss`

**特点**：
- ✅ 左右两栏布局（桌面）
- ✅ 响应式布局（手机）
- ✅ Tab 切换动画
- ✅ 加载动画（spinner）
- ✅ 错误提示样式

---

## 🚀 工作流程详解

### 用户端

1. 用户访问 Discourse 登录页
2. 页面加载组件 → 自动加载企微二维码
3. 用户可点击 "Classin扫码" Tab 切换
4. 用户用手机 App 扫二维码 → 跳转 OAuth2 流程
5. 登录成功

### 技术端

**初始化流程**：
```javascript
// 1. 组件挂载
didInsertElement() {
  loadQrcodeLibrary();      // 加载 qrcode.js
  loadQrcode("wecom");      // 加载企微二维码
}

// 2. 后端调用
loadQrcode(type) {
  ajax("/v1/api/discourse/qrcode/url?type=" + type)
    .then(response => {
      this.renderQrcode(type, response.data.url);
    })
}

// 3. 前端渲染
renderQrcode(type, content) {
  new QRCode(container, {
    text: content,      // OAuth2 URL
    width: 200,
    height: 200
  });
}
```

**Tab 切换流程**：
```javascript
selectQrcodeType(type) {
  this.selectedQrcodeType = type;  // 更新 UI
  this.loadQrcode(type);            // 加载对应二维码
}
```

---

## 📋 配置清单

### 后端配置（application.yml）

```yaml
# 企业微信（已有）
wecom:
  corp-id: "ww1234567890abcdef"
  corp-secret: "..."

# Classin（后续填写）
classin:
  oauth:
    url: "https://classin.com/oauth/authorize?client_id=..."
    # 当此配置存在时，Classin Tab 自动启用
```

### 前端配置

无需额外配置，组件自动读取后端 API。

---

## ✨ 功能特点

### 1. 动态加载 qrcode.js

```javascript
// 从 CDN 动态加载库，避免主线程阻塞
loadQrcodeLibrary() {
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  document.head.appendChild(script);
}
```

### 2. URL 缓存机制

```javascript
// 避免重复请求相同的二维码 URL
if (this.qrcodeUrls[type]) {
  // 从缓存获取
  this.renderQrcode(type, this.qrcodeUrls[type]);
  return;
}
// 调用 API 获取 URL
```

### 3. 错误恢复

```javascript
// 自动重试加载失败的二维码
@action
retryLoadQrcode() {
  this.loadQrcode(this.selectedQrcodeType);
}
```

### 4. 占位符机制

```javascript
// Classin 未配置时显示占位符
if (!classinAvailable) {
  // 显示 "即将上线" 提示
}
```

---

## 🔄 后续集成 Classin

当需要集成 Classin 时，只需：

1. **填写配置**：
   ```yaml
   classin:
     oauth:
       url: "https://classin.com/oauth/authorize?client_id=..."
   ```

2. **后端自动识别**：
   ```java
   // DiscourseQrcodeController 自动读取配置
   String classinUrl = environment.getProperty("classin.oauth.url");
   if (StringUtils.isNotBlank(classinUrl)) {
       return classinUrl;  // 启用 Classin Tab
   }
   ```

3. **前端自动启用**：
   ```javascript
   if (classinUrl && !classinUrl.startsWith("classin://")) {
       this.classinAvailable = true;  // Tab 可点击
   }
   ```

---

## 📊 数据流

```
┌─────────────────────────────────────────────────────────┐
│  Discourse 登录页 (主题组件)                             │
│  ┌──────────────────────────────────────────────────────┐
│  │ 模板 (Handlebars)                                     │
│  │ - Tab 切换按钮                                        │
│  │ - 二维码容器                                          │
│  └──────────────────────────────────────────────────────┘
│         │ 组件交互
│         ↓
│  ┌──────────────────────────────────────────────────────┐
│  │ 逻辑 (Ember.js Component)                             │
│  │ - loadQrcode(type)                                    │
│  │ - renderQrcode(type, url)                             │
│  │ - selectQrcodeType(type)                              │
│  └──────────────────────────────────────────────────────┘
│         │ API 调用
│         ↓
├──────────── 网络 ────────────────────────────────────────┤
│         ↓ HTTP GET
│  ┌──────────────────────────────────────────────────────┐
│  │ 后端 API (Spring Boot)                                │
│  │ /v1/api/discourse/qrcode/url?type=wecom              │
│  │ - DiscourseQrcodeController                           │
│  │ - buildWecomOauth2Url()                               │
│  │ - buildClassinQrcodeUrl()                             │
│  └──────────────────────────────────────────────────────┘
│         │ 返回 JSON
│         ↓
│  前端接收 { type, url } 
│         │
│         ↓
│  用 qrcode.js 生成二维码
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 安全机制

1. **CSRF 防护**：
   - 后端自动添加 `state=discourse` 参数
   - OAuth2 回调时验证 state 参数

2. **HTTPS 强制**：
   - 生产环境必须 HTTPS
   - 避免中间人攻击

3. **URL 编码**：
   - 所有参数自动 URL 编码
   - 防止参数注入

---

## 📈 性能优化

1. **LazyLoading**：qrcode.js 动态加载，不阻塞页面渲染
2. **缓存**：二维码 URL 缓存，切换 Tab 不重复请求
3. **组件卸载**：及时清理 QRCode 实例，防止内存泄漏

---

## 🧪 测试建议

### 单元测试

```java
// DiscourseQrcodeControllerTest.java
@Test
public void testGetWecomQrcodeUrl() {
    ResponseEntity<?> response = controller.getQrcodeUrl("wecom");
    assertEquals(200, response.getStatusCodeValue());
    assertTrue(response.getBody().toString().contains("url"));
}

@Test
public void testGetClassinQrcodeUrl_NotConfigured() {
    ResponseEntity<?> response = controller.getQrcodeUrl("classin");
    // 应返回占位符 URL
    assertTrue(response.getBody().toString().contains("classin://"));
}
```

### 集成测试

1. 访问 Discourse 登录页
2. 验证企微二维码成功加载
3. 点击 Classin Tab
4. 验证错误重试机制

### 功能测试

1. 用真实企微 App 扫二维码
2. 验证跳转到正确的 OAuth2 回调地址
3. 验证 Classin 占位符显示

---

## 📞 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 二维码不显示 | qrcode.js 库未加载 | 检查 CDN 连接 |
| API 返回 500 | 后端异常 | 查看服务器日志 |
| Classin Tab 灰显 | 配置未填写 | 填写 `classin.oauth.url` |
| 扫码后未登录 | OAuth2 回调错误 | 检查回调 URL 配置 |

---

## 📝 总结

✅ **已完成**：
- 后端 API（支持多种二维码类型）
- 前端主题组件（Tab 切换、错误处理）
- 样式美化（响应式设计）
- 文档（集成指南、故障排除）

⏳ **待完成**：
- Classin OAuth2 URL（需另一个项目提供）
- 二维码过期自动刷新（可选）
- 自定义二维码大小/颜色（可选）

🚀 **可以立即使用**：
- 企微二维码登录完全可用
- Classin Tab 会显示"即将上线"占位符
