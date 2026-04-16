# 🚀 Discourse 二维码登录 - 快速开始

## 📦 已实现的文件

```
✅ 后端 API
   └─ DiscourseQrcodeController.java
      • GET /v1/api/discourse/qrcode/url?type=wecom
      • GET /v1/api/discourse/qrcode/url?type=classin

✅ 前端主题组件
   ├─ components/discourse-qrcode-login.hbs
   ├─ javascript/components/discourse-qrcode-login.js
   ├─ stylesheets/discourse-qrcode-login.scss
   └─ INTEGRATION_GUIDE.md
```

## ⚡ 5 分钟快速集成

### Step 1: 部署后端 API

1. 编译项目：
```bash
mvn clean package
```

2. 启动应用，确保可访问：
```
POST /v1/api/discourse/qrcode/url?type=wecom
```

3. 验证返回格式：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "type": "wecom",
    "url": "https://open.weixin.qq.com/connect/oauth2/authorize?..."
  }
}
```

### Step 2: 在 Discourse 主题中添加组件

**方式 A：通过 Admin 界面（最简单）**

1. 登录 Discourse Admin → Customize → Themes
2. 编辑你的主题
3. 依次添加以下文件：

**Components 标签页：**
```
新增组件文件：discourse-qrcode-login.hbs
内容：复制 src/main/discourse-theme/components/discourse-qrcode-login.hbs
```

**JavaScript 标签页：**
```
新增脚本：components/discourse-qrcode-login.js
内容：复制 src/main/discourse-theme/javascript/components/discourse-qrcode-login.js
```

**Stylesheets 标签页：**
```
新增样式：discourse-qrcode-login.scss
内容：复制 src/main/discourse-theme/stylesheets/discourse-qrcode-login.scss
```

### Step 3: 在登录页调用组件

编辑主题的登录模板，添加一行代码：

```handlebars
{{discourse-qrcode-login}}
```

通常添加位置：
- 编辑文件 `templates/connectors/below-login-buttons/qrcode-login.hbs`
- 内容：`{{discourse-qrcode-login}}`

### Step 4: 刷新并测试

1. 保存主题
2. 访问 Discourse 登录页
3. 应该能看到二维码区域

## ✅ 测试清单

- [ ] 访问登录页，能看到两个 Tab：企微 | Classin
- [ ] 企微 Tab 有二维码显示
- [ ] 点击 Classin Tab，显示"即将上线"占位符
- [ ] 用企微 App 扫企微二维码，能跳转登录
- [ ] 浏览器 F12 Console 没有 JS 错误

## 🔧 常见问题

### Q: 二维码不显示
**A:** 
1. 检查后端 API 是否启动：`curl http://localhost:8080/v1/api/discourse/qrcode/url?type=wecom`
2. 检查浏览器 Console（F12）是否有错误
3. 检查 qrcode.js 库是否加载：浏览器 Network 标签查看 CDN 请求

### Q: 如何自定义二维码大小
**A:** 编辑 `discourse-qrcode-login.scss`，修改：
```scss
.qrcode-box {
  canvas, img {
    max-width: 200px;  // 改这里
    max-height: 200px; // 改这里
  }
}
```

### Q: 如何改变红色 Tab 的颜色
**A:** 编辑 `discourse-qrcode-login.scss`，修改：
```scss
.qrcode-tab.active {
  border-color: #e74c3c;  // 改这里
  background: #e74c3c;    // 改这里
}
```

### Q: 如何启用 Classin 扫码
**A:** 
1. 获取 Classin 的 OAuth2 授权 URL
2. 填写配置文件 `application.yml`：
```yaml
classin:
  oauth:
    url: "https://classin.com/oauth/authorize?client_id=..."
```
3. 重启应用
4. 刷新浏览器，Classin Tab 自动启用

## 📚 详细文档

- 集成指南：[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- 实现总结：[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

## 🎯 核心功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 企微二维码 | ✅ 完成 | 完全可用 |
| Classin 二维码 | ⏳ 待配置 | 预留位置，配置后自动启用 |
| Tab 切换 | ✅ 完成 | 流畅的动画和交互 |
| 错误处理 | ✅ 完成 | 加载失败自动重试 |
| 响应式设计 | ✅ 完成 | 手机 / 平板 / 桌面完美适配 |

## 🚀 后续可选功能

- [ ] 二维码过期自动刷新（默认 5 分钟刷新一次）
- [ ] 支持钉钉、飞书等其他平台
- [ ] 二维码扫描成功后显示倒计时
- [ ] 记录二维码扫码统计

## 📞 遇到问题

1. 查看 Console（F12）错误日志
2. 查看服务器日志：`tail -f app.log | grep QRCode`
3. 确认后端 API 可访问
4. 参考 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) 故障排除章节

---

**🎉 完成集成后，你就拥有一个专业的二维码扫码登录界面了！**
