/**
 * Discourse 登录页二维码组件 JavaScript
 * 位置: theme/javascript/components/discourse-qrcode-login.js
 * 
 * 功能:
 * 1. 动态加载企微/Classin 二维码 URL
 * 2. 前端使用 qrcode.js 生成二维码
 * 3. 处理 Tab 切换
 * 4. 错误重试机制
 */

import Component from "@glimmer/component";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { ajax } from "discourse/lib/ajax";

export default class DiscourseQrcodeLoginComponent extends Component {
  @service router;
  
  // 状态追踪
  @tracked selectedQrcodeType = "wecom"; // 当前选中的二维码类型
  @tracked isLoadingQrcode = false;
  @tracked qrcodeError = null;
  @tracked qrcodeUrls = {}; // { wecom: "...", classin: "..." }
  @tracked classinAvailable = false;

  // QRCode.js 库实例
  qrcodeInstances = {};

  // 组件挂载时的初始化
  constructor() {
    super(...arguments);
    this.qrcodeUrls = {};
    this.qrcodeInstances = {};
  }

  willInsertElement() {
    super.willInsertElement(...arguments);
    
    // 加载 qrcode.js 库
    this.loadQrcodeLibrary();
  }

  didInsertElement() {
    super.didInsertElement(...arguments);
    
    // 初始化加载企微二维码
    this.loadQrcode("wecom");
  }

  /**
   * 动态加载 qrcode.js 库
   */
  loadQrcodeLibrary() {
    if (window.QRCode) {
      return; // 库已加载
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => {
      console.log("[Discourse QRCode] qrcode.js 库已加载");
    };
    script.onerror = () => {
      console.error("[Discourse QRCode] qrcode.js 库加载失败");
      this.qrcodeError = "二维码库加载失败，请刷新页面重试";
    };
    document.head.appendChild(script);
  }

  /**
   * 从后端获取二维码 URL 并生成二维码
   */
  @action
  async loadQrcode(type) {
    if (this.qrcodeUrls[type]) {
      // 如果已缓存，直接使用
      this.renderQrcode(type, this.qrcodeUrls[type]);
      return;
    }

    this.isLoadingQrcode = true;
    this.qrcodeError = null;

    try {
      // 调用后端 API 获取二维码 URL
      const response = await ajax("/v1/api/discourse/qrcode/url", {
        data: { type },
      });

      if (response.code === 0 && response.data && response.data.url) {
        const qrcodeUrl = response.data.url;
        this.qrcodeUrls[type] = qrcodeUrl;

        // 检查 Classin 是否可用（不是占位符 URL）
        if (
          type === "classin" &&
          !qrcodeUrl.startsWith("classin://login?state=discourse")
        ) {
          this.classinAvailable = true;
        }

        // 渲染二维码
        this.renderQrcode(type, qrcodeUrl);
      } else {
        this.qrcodeError =
          response.message || "获取二维码失败，请稍后重试";
        console.error("[Discourse QRCode] 后端返回错误:", response);
      }
    } catch (error) {
      console.error("[Discourse QRCode] 获取二维码 URL 失败:", error);
      this.qrcodeError = `获取二维码失败: ${error.statusText || error.message}`;
    } finally {
      this.isLoadingQrcode = false;
    }
  }

  /**
   * 使用 QRCode.js 库渲染二维码
   */
  renderQrcode(type, content) {
    // 确保库已加载
    if (!window.QRCode) {
      console.warn("[Discourse QRCode] QRCode 库未加载，稍后重试...");
      setTimeout(() => this.renderQrcode(type, content), 500);
      return;
    }

    const containerId = `qrcode-${type}`;
    const container = document.getElementById(containerId);

    if (!container) {
      console.warn(`[Discourse QRCode] 找不到容器: ${containerId}`);
      return;
    }

    // 清空之前的二维码
    container.innerHTML = "";

    // 销毁旧实例
    if (this.qrcodeInstances[type]) {
      delete this.qrcodeInstances[type];
    }

    // 生成新的二维码
    try {
      this.qrcodeInstances[type] = new QRCode(container, {
        text: content,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });

      console.log(`[Discourse QRCode] ${type} 二维码已生成`);
    } catch (error) {
      console.error(`[Discourse QRCode] 生成 ${type} 二维码失败:`, error);
      this.qrcodeError = `生成二维码失败: ${error.message}`;
    }
  }

  /**
   * 处理 Tab 切换
   */
  @action
  selectQrcodeType(type) {
    this.selectedQrcodeType = type;

    // 异步加载对应类型的二维码
    this.loadQrcode(type);
  }

  /**
   * 重试加载二维码
   */
  @action
  retryLoadQrcode() {
    this.loadQrcode(this.selectedQrcodeType);
  }

  /**
   * 组件卸载时清理
   */
  willDestroyElement() {
    super.willDestroyElement(...arguments);
    
    // 销毁所有 QRCode 实例
    Object.keys(this.qrcodeInstances).forEach((key) => {
      delete this.qrcodeInstances[key];
    });
  }
}

