# Discourse QR Code Login  Checklist

## 部署前

- [ ] 后端已实现 `/api/qr/generate`、`/api/qr/status`、`/api/qr/confirm` 接口
- [ ] Discourse SSO 已正确配置（`sso_url`、`sso_secret`）
- [ ] HTTPS 已启用（扫码登录要求安全上下文）

## 主题组件文件

- [ ] `javascripts/discourse/components/discourse-qrcode-login.hbs` 已上传
- [ ] `javascripts/discourse/components/discourse-qrcode-login.js` 已上传
- [ ] `javascripts/discourse/connectors/below-login-buttons/qrcode-login.hbs` 已上传
- [ ] `common/common.scss` 已上传

## 组件配置

- [ ] 组件已添加到激活主题
- [ ] 后端 API 地址已在组件设置中填写
- [ ] 轮询超时时间已按需调整

## 功能验证

- [ ] 登录页显示二维码
- [ ] 手机扫码后页面自动跳转
- [ ] 二维码过期后显示刷新提示
- [ ] 深色模式样式正常

## 上线后

- [ ] 监控接口错误率
- [ ] 确认日志中无异常 SSO payload