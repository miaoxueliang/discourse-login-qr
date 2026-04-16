# Discourse QR Code Login  Implementation Summary

## 实现概览

本方案以 **Discourse 主题组件** 形式实现扫码登录，无需修改 Discourse 核心代码。

## 核心文件说明

### `javascripts/discourse/components/discourse-qrcode-login.js`
- Glimmer 组件，负责：
  - 调用后端接口生成二维码
  - 定时轮询扫码状态
  - 登录成功后重定向

### `javascripts/discourse/components/discourse-qrcode-login.hbs`
- 渲染二维码图片及状态提示文案
- 通过 `{{this.qrUrl}}` 绑定动态数据

### `javascripts/discourse/connectors/below-login-buttons/qrcode-login.hbs`
- 将 `<DiscourseQrcodeLogin />` 组件插入登录表单下方
- 利用 Discourse outlet 机制，零侵入接入

### `common/common.scss`
- 二维码容器、加载动画、错误提示样式
- 自适应深色模式

## 技术选型

| 项目 | 选型 |
|------|------|
| 组件框架 | Glimmer / Ember.js |
| 二维码生成 | 后端返回图片 URL |
| 状态同步 | 短轮询（2s 间隔，30s 超时） |
| 样式 | SCSS，BEM 命名 |