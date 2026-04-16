# Discourse 登录页二维码扫码集成指南

## 📋 概述

本指南说明如何将企微/Classin 二维码扫码登录集成到 Discourse 官方主题中。

## 🗂️ 文件结构

```
discourse-theme/
├── components/
│   └── discourse-qrcode-login.hbs        # Handlebars 模板组件
├── javascript/
│   └── components/
│       └── discourse-qrcode-login.js     # Ember.js 组件逻辑
├── stylesheets/
│   └── discourse-qrcode-login.scss       # 组件样式
└── about.json                             # 主题配置
```

## 🚀 集成步骤

### 1. 后端 API 配置

确保后端 `DiscourseQrcodeController` 已部署，提供以下端点：

```
GET /v1/api/discourse/qrcode/url?type=wecom
GET /v1/api/discourse/qrcode/url?type=classin
```

响应格式：
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

### 2. 在 Discourse 主题中添加文件

**方式 A：通过 Discourse Admin 界面（推荐）**

1. 登录 Discourse Admin 后台
2. 进入 **Customize → Themes**
3. 编辑你的主题
4. 添加以下文件：
   - `components/discourse-qrcode-login.hbs`
   - `javascript/components/discourse-qrcode-login.js`
   - `stylesheets/discourse-qrcode-login.scss`

**方式 B：通过 Git 仓库**

```bash
# 克隆主题仓库
git clone <theme-repo>

# 复制文件到对应目录
cp discourse-qrcode-login.hbs <theme>/components/
cp discourse-qrcode-login.js <theme>/javascript/components/
cp discourse-qrcode-login.scss <theme>/stylesheets/

# 提交并推送
git add .
git commit -m "Add qrcode login component"
git push origin main
```

### 3. 在登录模板中使用组件

编辑主题的登录模板（`templates/login.hbs`），添加组件调用：

```handlebars
{{!-- 在登录页合适位置插入二维码组件 --}}
{{discourse-qrcode-login}}
```

如果没有自定义登录模板，创建新文件：
`templates/connectors/below-login-buttons/discourse-qrcode-login.hbs`

内容：
```handlebars
{{discourse-qrcode-login}}
```

### 4. 注册组件

确保组件在 `about.json` 中注册（如果需要）：

```json
{
  "name": "Discourse QR Code Login",
  "about_url": "https://github.com/...",
  "components": [
    "discourse-qrcode-login"
  ]
}
```

## ⚙️ 配置说明

### application.yml 配置

```yaml
# 企业微信配置（已有）
wecom:
  corp-id: "your-corp-id"
  
# Classin 配置（待集成）
classin:
  oauth:
    url: "https://classin.com/oauth/authorize?..." # 后续填写
```

### 环境变量

无需额外环境变量，API 自动读取配置。

## 🔄 工作流程

1. **用户访问登录页**
   - 页面加载时，前端组件初始化
   - 自动加载 qrcode.js 库

2. **加载企微二维码**
   - 调用后端 API: `/v1/api/discourse/qrcode/url?type=wecom`
   - 返回企微 OAuth2 URL
   - 前端用 qrcode.js 生成二维码

3. **用户切换到 Classin Tab**
   - 调用后端 API: `/v1/api/discourse/qrcode/url?type=classin`
   - 如果未配置，显示"即将上线"占位符

4. **用户扫码登录**
   - 企微 App 或 Classin App 扫描二维码
   - 跳转到对应的 OAuth2 回调地址
   - 完成登录

## 📱 移动端优化

- **自动适配**：组件自动检测设备类型
- **响应式设计**：在小屏幕上采用单列布局
- **二维码尺寸**：自动缩小以适配手机屏幕

## 🐛 故障排除

### 二维码加载失败

**问题**：显示 "二维码库加载失败"

**解决**：
1. 检查网络连接
2. 确保 qrcode.js CDN 可访问
3. 在浏览器控制台查看错误日志

### API 调用失败

**问题**：显示 "获取二维码失败"

**解决**：
1. 检查后端 API 是否启动
2. 确保 CORS 配置正确
3. 检查浏览器网络请求（F12 → Network）

### Classin 按钮灰显

**问题**：Classin Tab 显示占位符

**解决**：
1. 在 `application.yml` 中配置 `classin.oauth.url`
2. 重启应用
3. 刷新浏览器

## 📝 自定义样式

编辑 `discourse-qrcode-login.scss` 修改：

- 颜色主题：修改 `#e74c3c`（红色）等颜色值
- 尺寸：修改 `.qrcode-box` 的 `max-width: 200px`
- 间距：调整 `gap` 和 `padding` 值

## 🔒 安全考虑

1. **CSRF 防护**：后端自动添加 `state` 参数
2. **HTTPS 必须**：生产环境必须使用 HTTPS
3. **API 限流**：建议在网关层添加限流

## 📚 相关文件

- [后端 Controller](../java/com/eeo/edu/controller/open/discourse/DiscourseQrcodeController.java)
- [Discourse 官方文档](https://meta.discourse.org/t/beginners-guide-to-creating-discourse-themes/91966)

## 🚀 后续计划

1. ✅ 企微二维码登录
2. ⏳ Classin 二维码登录（需集成另一个项目）
3. ⏳ 支持自定义二维码类型（如钉钉、飞书等）
4. ⏳ 二维码过期自动刷新

## 📞 联系方式

如有问题，请联系开发团队或提交 Issue。
