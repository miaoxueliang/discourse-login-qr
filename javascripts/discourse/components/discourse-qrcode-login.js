import Component from "@glimmer/component";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { ajax } from "discourse/lib/ajax";

let qrcodeLibraryPromise;

function ensureQrcodeLibrary() {
  if (window.QRCode) {
    return Promise.resolve();
  }

  if (qrcodeLibraryPromise) {
    return qrcodeLibraryPromise;
  }

  qrcodeLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("二维码库加载失败"));
    document.head.appendChild(script);
  });

  return qrcodeLibraryPromise;
}

export default class DiscourseQrcodeLoginComponent extends Component {
  @tracked selectedQrcodeType = "wecom";
  @tracked isLoadingQrcode = false;
  @tracked qrcodeError = null;
  @tracked qrcodeUrls = {};
  @tracked classinAvailable = false;

  qrcodeInstances = {};

  @action
  async setup() {
    try {
      await ensureQrcodeLibrary();
      await this.loadQrcode("wecom");
    } catch (error) {
      this.qrcodeError = error.message || "二维码库加载失败，请刷新页面重试";
    }
  }

  @action
  teardown() {
    this.qrcodeInstances = {};
  }

  @action
  async loadQrcode(type) {
    if (this.qrcodeUrls[type]) {
      this.renderQrcode(type, this.qrcodeUrls[type]);
      return;
    }

    this.isLoadingQrcode = true;
    this.qrcodeError = null;

    try {
      const response = await ajax("/v1/api/discourse/qrcode/url", {
        data: { type },
      });

      if (response?.code === 0 && response?.data?.url) {
        const qrcodeUrl = response.data.url;
        this.qrcodeUrls = { ...this.qrcodeUrls, [type]: qrcodeUrl };

        if (
          type === "classin" &&
          !qrcodeUrl.startsWith("classin://login?state=discourse")
        ) {
          this.classinAvailable = true;
        }

        this.renderQrcode(type, qrcodeUrl);
      } else {
        this.qrcodeError = response?.message || "获取二维码失败，请稍后重试";
      }
    } catch (error) {
      this.qrcodeError = `获取二维码失败: ${error?.statusText || error?.message || "未知错误"}`;
    } finally {
      this.isLoadingQrcode = false;
    }
  }

  renderQrcode(type, content) {
    const QRCodeClass = window.QRCode;
    if (!QRCodeClass) {
      this.qrcodeError = "二维码库未加载完成，请稍后重试";
      return;
    }

    const container = document.getElementById(`qrcode-${type}`);
    if (!container) {
      return;
    }

    container.innerHTML = "";

    try {
      this.qrcodeInstances[type] = new QRCodeClass(container, {
        text: content,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCodeClass.CorrectLevel.H,
      });
    } catch (error) {
      this.qrcodeError = `生成二维码失败: ${error?.message || "未知错误"}`;
    }
  }

  @action
  selectQrcodeType(type) {
    this.selectedQrcodeType = type;
    this.loadQrcode(type);
  }

  @action
  retryLoadQrcode() {
    this.loadQrcode(this.selectedQrcodeType);
  }
}
