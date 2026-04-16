# Discourse QR Code Login  Quick Start

## 1. 文件清单

| 文件 | 说明 |
|------|------|
| `javascripts/discourse/components/discourse-qrcode-login.hbs` | 组件模板 |
| `javascripts/discourse/components/discourse-qrcode-login.js` | 组件逻辑 |
| `javascripts/discourse/connectors/below-login-buttons/qrcode-login.hbs` | 登录按钮插槽 |
| `common/common.scss` | 样式 |

## 2. 安装步骤

1. 登录 Discourse 管理后台  **主题**  新建主题组件。
2. 将上表四个文件按对应路径上传到组件中。
3. 在 **设置  插件** 页启用 SSO 相关配置。
4. 将组件添加到当前激活主题并刷新页面。

## 3. 验证

- 登录页出现「扫码登录」按钮即表示安装成功。
- 扫码后应在 5 秒内完成跳转。