# Discourse QR Code Login  Integration Guide

## 目录
1. [前置条件](#前置条件)
2. [主题组件结构](#主题组件结构)
3. [后端对接](#后端对接)
4. [轮询流程](#轮询流程)

---

## 前置条件

- Discourse 3.x+
- 已启用 **DiscourseConnect (SSO)**
- 后端提供以下接口：
  - `POST /api/qr/generate`  生成二维码 token
  - `GET  /api/qr/status?token=xxx`  查询扫码状态
  - `POST /api/qr/confirm`  确认登录并返回 SSO payload

---

## 主题组件结构

```
discourse-login-qr/
 javascripts/discourse/
    components/
       discourse-qrcode-login.hbs   # 组件模板
       discourse-qrcode-login.js    # 组件逻辑
    connectors/
        below-login-buttons/
            qrcode-login.hbs         # 登录按钮插槽
 common/
     common.scss                      # 全局样式
```

---

## 后端对接

### 生成二维码

```js
// discourse-qrcode-login.js
async generateQr() {
  const res = await fetch('/api/qr/generate', { method: 'POST' });
  const { token, url } = await res.json();
  this.token = token;
  this.qrUrl = url;
}
```

### 轮询状态

```js
async pollStatus() {
  const res = await fetch(`/api/qr/status?token=${this.token}`);
  const { status, redirect } = await res.json();
  if (status === 'confirmed') window.location.href = redirect;
}
```

---

## 轮询流程

```
浏览器                  后端
   POST /api/qr/generate ▶
  ◀ { token, qrUrl } 
    渲染二维码                
   GET  /api/qr/status ▶  (每 2s 轮询)
  ◀ { status: "pending" } 
    用户手机扫码              
   GET  /api/qr/status ▶
  ◀ { status: "confirmed",  
        redirect: "/session/"}
    跳转完成登录              
```