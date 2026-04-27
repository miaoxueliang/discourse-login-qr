import Component from "@glimmer/component";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";

let qrcodeLibraryPromise;
const TARGET_PATH = "/login";
const WECOM_POLL_INTERVAL = 2000;
const WECOM_POLL_TIMEOUT = 5 * 60 * 1000;
const WECOM_WIDGET_RENDER_TIMEOUT = 2500;
const CLASSIN_POLL_INTERVAL = 2000;
const CLASSIN_POLL_TIMEOUT = 5 * 60 * 1000;
const DEFAULT_API_PATH_PREFIX = "/eeo";
const WECOM_WIDGET_IMPL_VERSION = "2026-04-19.3";

function normalizePathPrefix(pathPrefix) {
  const raw = String(pathPrefix || "").trim();
  if (!raw) {
    return "";
  }

  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/$/, "");
}

function buildQrcodeApiUrl() {
  const baseUrl = (settings.qrcode_api_base_url || window.location.origin || "").replace(
    /\/$/, ""
  );
  let pathPrefix = normalizePathPrefix(
    settings.qrcode_api_path_prefix || DEFAULT_API_PATH_PREFIX
  );

  if (pathPrefix && baseUrl.toLowerCase().endsWith(pathPrefix.toLowerCase())) {
    pathPrefix = "";
  }

  return `${baseUrl}${pathPrefix}/v1/api/discourse/qrcode/url`;
}

async function fetchJson(url, params = null) {
  const requestUrl = new URL(url, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        requestUrl.searchParams.set(key, value);
      }
    });
  }

  const response = await window.fetch(requestUrl.toString(), {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    const error = new Error(responseText || response.statusText || "request failed");
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }

  return response.json();
}

function nextAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForContainerRender() {
  await nextAnimationFrame();
  await nextAnimationFrame();
}

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

function buildWecomWidgetUrl(payload) {
  const query = new URLSearchParams({
    login_type: "CorpApp",
    appid: String(payload?.appId || ""),
    agentid: String(payload?.agentId || ""),
    redirect_uri: String(payload?.redirectUri || ""),
    state: String(payload?.state || ""),
    lang: "zh",
  });

  return `https://login.work.weixin.qq.com/wwlogin/sso/login?${query.toString()}`;
}

export default class DiscourseQrcodeLoginComponent extends Component {
  @tracked selectedQrcodeType = "wecom";
  @tracked isLoadingQrcode = false;
  @tracked qrcodeError = null;
  @tracked qrcodePayloads = {};
  @tracked classinAvailable = false;
  @tracked wecomStatusText = "请使用企业微信扫描二维码";
  @tracked classinStatusText = "请使用 ClassIn App 扫描二维码";

  qrcodeInstances = {};
  wecomPollTimer = null;
  wecomRenderFallbackTimer = null;
  wecomWidgetFitTimer = null;
  wecomPollStartedAt = 0;
  wecomWidgetEnabled = true;
  classinPollTimer = null;
  classinPollStartedAt = 0;

  get useWecomOfficialWidget() {
    return !!settings.wecom_use_official_widget;
  }

  get shouldRender() {
    if (typeof window === "undefined") {
      return false;
    }

    const { pathname } = window.location;
    return pathname === TARGET_PATH;
  }

  @action
  async setup() {
    if (!this.shouldRender) {
      return;
    }

    try {
      await this.loadQrcode("wecom");
    } catch (error) {
      this.qrcodeError = error.message || "二维码组件加载失败，请刷新页面重试";
    }
  }

  @action
  teardown() {
    this.stopWecomPolling();
    this.clearWecomRenderFallbackTimer();
    this.clearWecomWidgetFitTimer();
    this.stopClassInPolling();
    this.qrcodeInstances = {};
  }

  @action
  async loadQrcode(type, options = {}) {
    const { forceRefresh = false } = options;
    this.qrcodeError = null;

    if (type === "wecom") {
      this.wecomStatusText = "正在加载企微二维码...";
      this.stopWecomPolling();
      this.clearWecomRenderFallbackTimer();
      this.clearWecomWidgetFitTimer();
    }

    if (!forceRefresh && this.qrcodePayloads[type]) {
      await waitForContainerRender();
      await this.renderPayload(type, this.qrcodePayloads[type]);
      return;
    }

    this.isLoadingQrcode = true;

    const apiUrl = buildQrcodeApiUrl();

    try {
      if (type === "wecom") {
        this.wecomWidgetEnabled = this.useWecomOfficialWidget;
        if (!this.wecomWidgetEnabled) {
          await ensureQrcodeLibrary();
        }
      } else {
        await ensureQrcodeLibrary();
      }

      const response = await fetchJson(apiUrl, { type });

      if (response?.code === 0 && response?.data) {
        const payload = response.data;
        this.qrcodePayloads = { ...this.qrcodePayloads, [type]: payload };

        if (
          type === "classin" &&
          payload.url &&
          !payload.url.startsWith("classin://login?state=discourse")
        ) {
          this.classinAvailable = true;
        }
        // Switch out of loading state first, then wait one frame so QR containers exist in DOM.
        this.isLoadingQrcode = false;
        await waitForContainerRender();
        await this.renderPayload(type, payload);
      } else {
        this.qrcodeError = response?.message || "获取二维码失败，请稍后重试";
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[QRCode] API error:", apiUrl, error);
      const status = error?.status;
      const msg = error?.statusText || error?.message;
      this.qrcodeError = status
        ? `获取二维码失败 (HTTP ${status})，请检查后端 API 是否可访问`
        : `获取二维码失败: ${msg || "请检查 qrcode_api_base_url 与 qrcode_api_path_prefix 设置"}`;
    } finally {
      if (this.isLoadingQrcode) {
        this.isLoadingQrcode = false;
      }
    }
  }

  async renderPayload(type, payload) {
    if (type === "wecom") {
      this.renderWecomQrcode(payload);
      this.startWecomPolling(payload);
      return;
    }

    if (type === "classin") {
      this.renderQrcode(type, payload?.url);
      this.startClassInPolling(payload);
      return;
    }

    this.renderQrcode(type, payload?.url);
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

  renderWecomQrcode(payload) {
    const shouldUseWidget = this.wecomWidgetEnabled;

    const container = document.getElementById("qrcode-wecom");
    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (!shouldUseWidget) {
      ensureQrcodeLibrary()
        .then(() => {
          this.renderQrcode("wecom", payload?.url);
          this.wecomStatusText = "请使用企业微信扫码（兼容模式）";
        })
        .catch(() => {
          this.qrcodeError = "企微二维码加载失败，请稍后重试";
        });
      return;
    }

    try {
      const widgetUrl = buildWecomWidgetUrl(payload);
      let redirectOrigin = "";
      try {
        redirectOrigin = new URL(payload.redirectUri).origin;
      } catch (_error) {
        redirectOrigin = "invalid-url";
      }

      // eslint-disable-next-line no-console
      console.info("[WwLogin] init widget", {
        implVersion: WECOM_WIDGET_IMPL_VERSION,
        appId: payload.appId,
        agentId: payload.agentId,
        redirectUri: payload.redirectUri,
        redirectOrigin,
        state: payload.state,
        widgetUrl,
      });

      const iframe = document.createElement("iframe");
      iframe.src = widgetUrl;
      iframe.width = "300";
      iframe.height = "360";
      iframe.scrolling = "no";
      iframe.frameBorder = "0";
      iframe.style.border = "0";
      iframe.style.display = "block";
      iframe.style.margin = "0 auto";
      container.appendChild(iframe);

      this.wecomStatusText = "请使用企业微信扫描二维码";
      this.scheduleWecomWidgetFit(container);

      // If third-party iframe is blocked by CSP/network, fall back to a regular QR image.
      this.wecomRenderFallbackTimer = window.setTimeout(async () => {
        const hasWidget = !!container.querySelector("iframe, img, canvas");
        if (hasWidget) {
          return;
        }

        try {
          await ensureQrcodeLibrary();
          this.renderQrcode("wecom", payload?.url);
          this.wecomStatusText = "请使用企业微信扫码（兼容模式）";
          this.clearWecomWidgetFitTimer();
        } catch (_error) {
          this.qrcodeError = "企微二维码加载失败，请稍后重试";
        }
      }, WECOM_WIDGET_RENDER_TIMEOUT);
    } catch (error) {
      this.qrcodeError = `企微二维码加载失败: ${error?.message || "未知错误"}`;
    }
  }

  clearWecomRenderFallbackTimer() {
    if (this.wecomRenderFallbackTimer) {
      window.clearTimeout(this.wecomRenderFallbackTimer);
      this.wecomRenderFallbackTimer = null;
    }
  }

  clearWecomWidgetFitTimer() {
    if (this.wecomWidgetFitTimer) {
      window.clearTimeout(this.wecomWidgetFitTimer);
      this.wecomWidgetFitTimer = null;
    }
  }

  scheduleWecomWidgetFit(container, attempt = 0) {
    this.clearWecomWidgetFitTimer();
    this.wecomWidgetFitTimer = window.setTimeout(() => {
      const iframe = container?.querySelector("iframe");
      if (!iframe) {
        if (attempt < 10) {
          this.scheduleWecomWidgetFit(container, attempt + 1);
        }
        return;
      }

      // Enterprise WeChat official widget native dimensions
      const WIDGET_W = 300;
      const WIDGET_H = 360;

      // Inner width of .qrcode-box (clientWidth includes padding 8px*2=16px)
      const innerWidth = (container.clientWidth || WIDGET_W + 16) - 16;
      // Only scale down when the container is narrower than the widget.
      // Never scale up (max 1.0). Use floor to stay within bounds.
      const scale = innerWidth >= WIDGET_W ? 1.0 : Math.floor((innerWidth / WIDGET_W) * 1000) / 1000;
      const fitW = Math.floor(WIDGET_W * scale);
      const fitH = Math.floor(WIDGET_H * scale);

      // IMPORTANT: always keep the iframe at its NATIVE 300×360.
      // Setting iframe width/height smaller than native just shrinks the
      // iframe's own viewport, which CROPS the widget content — it does NOT
      // scale it. The correct approach is:
      //   1. iframe stays at 300×360 (full widget renders correctly)
      //   2. transform:scale() visually shrinks it
      //   3. A wrapper div with width=fitW / height=fitH + overflow:hidden
      //      clips the transform overhang and provides the correct layout footprint
      iframe.style.width = `${WIDGET_W}px`;
      iframe.style.height = `${WIDGET_H}px`;
      iframe.style.maxWidth = "none";
      iframe.style.border = "0";
      iframe.style.display = "block";

      if (scale < 1.0) {
        // Move iframe into a clip-wrapper that has the scaled layout footprint
        let wrapper = container.querySelector(".wecom-scale-wrapper");
        if (!wrapper) {
          wrapper = document.createElement("div");
          wrapper.className = "wecom-scale-wrapper";
          // insertBefore moves the iframe node into the wrapper
          container.insertBefore(wrapper, iframe);
          wrapper.appendChild(iframe);
        }
        wrapper.style.width = `${fitW}px`;
        wrapper.style.height = `${fitH}px`;
        wrapper.style.overflow = "hidden";
        wrapper.style.position = "relative";
        wrapper.style.margin = "0 auto";

        // scale from top-left so the wrapper clips the bottom/right correctly
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = "top left";
        iframe.style.position = "absolute";
        iframe.style.top = "0";
        iframe.style.left = "0";
      } else {
        // No scaling needed — container is wide enough for the full widget
        iframe.style.transform = "none";
        iframe.style.position = "static";
        iframe.style.margin = "0 auto";
      }

      // Let container height be driven by the wrapper/iframe natural height
      container.style.minHeight = `${fitH}px`;
    }, 200);
  }

  startWecomPolling(payload) {
    if (!payload?.sessionId || !payload?.statusUrl || !payload?.loginUrl) {
      this.qrcodeError = "企微扫码配置不完整，请检查后端接口返回";
      return;
    }

    this.stopWecomPolling();
    this.wecomPollStartedAt = Date.now();

    const poll = async () => {
      if (this.selectedQrcodeType !== "wecom") {
        return;
      }

      if (Date.now() - this.wecomPollStartedAt >= WECOM_POLL_TIMEOUT) {
        this.stopWecomPolling();
        this.qrcodePayloads = { ...this.qrcodePayloads, wecom: null };
        this.qrcodeError = "二维码已过期，请重新生成";
        this.wecomStatusText = "二维码已过期";
        return;
      }

      try {
        const response = await fetchJson(payload.statusUrl);
        const status = response?.data?.status || response?.status;

        if (status === "confirmed") {
          this.stopWecomPolling();
          this.wecomStatusText = "已扫码，正在登录...";
          window.location.href = payload.loginUrl;
        } else if (status === "expired") {
          this.stopWecomPolling();
          this.qrcodePayloads = { ...this.qrcodePayloads, wecom: null };
          this.qrcodeError = "二维码已过期，请重新生成";
          this.wecomStatusText = "二维码已过期";
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[WwLogin] poll status failed", error);
      }
    };

    poll();
    this.wecomPollTimer = window.setInterval(poll, WECOM_POLL_INTERVAL);
  }

  stopWecomPolling() {
    if (this.wecomPollTimer) {
      window.clearInterval(this.wecomPollTimer);
      this.wecomPollTimer = null;
    }
  }

  startClassInPolling(payload) {
    if (!payload?.sessionId || !payload?.statusUrl || !payload?.loginUrl) {
      // No polling config (e.g. placeholder URL) — skip silently
      return;
    }

    this.stopClassInPolling();
    this.classinPollStartedAt = Date.now();

    const poll = async () => {
      if (this.selectedQrcodeType !== "classin") {
        return;
      }

      if (Date.now() - this.classinPollStartedAt >= CLASSIN_POLL_TIMEOUT) {
        this.stopClassInPolling();
        this.qrcodePayloads = { ...this.qrcodePayloads, classin: null };
        this.qrcodeError = "二维码已过期，请重新生成";
        this.classinStatusText = "二维码已过期";
        return;
      }

      try {
        const response = await fetchJson(payload.statusUrl);
        const status = response?.data?.status || response?.status;

        if (status === "confirmed") {
          this.stopClassInPolling();
          this.classinStatusText = "已扫码，正在登录...";
          window.location.href = payload.loginUrl;
        } else if (status === "scanned") {
          this.classinStatusText = "已扫码，请在 ClassIn App 中确认登录...";
        } else if (status === "expired") {
          this.stopClassInPolling();
          this.qrcodePayloads = { ...this.qrcodePayloads, classin: null };
          this.qrcodeError = "二维码已过期，请重新生成";
          this.classinStatusText = "二维码已过期";
        } else if (status === "error") {
          this.stopClassInPolling();
          this.qrcodeError = "ClassIn 扫码授权失败，请重试";
          this.classinStatusText = "授权失败";
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[ClassIn] poll status failed", error);
      }
    };

    poll();
    this.classinPollTimer = window.setInterval(poll, CLASSIN_POLL_INTERVAL);
  }

  stopClassInPolling() {
    if (this.classinPollTimer) {
      window.clearInterval(this.classinPollTimer);
      this.classinPollTimer = null;
    }
  }

  @action
  async selectQrcodeType(type) {
    this.selectedQrcodeType = type;
    if (type !== "wecom") {
      this.stopWecomPolling();
      this.clearWecomRenderFallbackTimer();
      this.clearWecomWidgetFitTimer();
    }
    if (type !== "classin") {
      this.stopClassInPolling();
    }
    await waitForContainerRender();
    await this.loadQrcode(type);
  }

  @action
  retryLoadQrcode() {
    this.qrcodeError = null;
    this.classinStatusText = "\u8bf7\u4f7f\u7528 ClassIn App \u626b\u63cf\u4e8c\u7ef4\u7801";
    this.loadQrcode(this.selectedQrcodeType, { forceRefresh: true });
  }
}
