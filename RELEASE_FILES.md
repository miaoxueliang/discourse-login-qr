# Discourse QR Code Login  Release Files

## 发布文件列表

以下文件需打包并上传到 Discourse 主题组件：

```
discourse-login-qr/
 javascripts/
    discourse/
        components/
           discourse-qrcode-login.hbs
           discourse-qrcode-login.js
        connectors/
            below-login-buttons/
                qrcode-login.hbs
 common/
     common.scss
```

## 文件描述

| 路径 | 类型 | 说明 |
|------|------|------|
| `javascripts/discourse/components/discourse-qrcode-login.hbs` | 模板 | 二维码组件 UI |
| `javascripts/discourse/components/discourse-qrcode-login.js` | 脚本 | 二维码组件逻辑 |
| `javascripts/discourse/connectors/below-login-buttons/qrcode-login.hbs` | 插槽 | 注入登录页 |
| `common/common.scss` | 样式 | 组件样式 |

## 版本记录

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2025-01-01 | 初始发布 |
| 1.1.0 |  | 迁移至标准组件目录结构 |