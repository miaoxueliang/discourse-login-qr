import { withPluginApi } from "discourse/lib/plugin-api";
import I18n from "I18n";

export default {
  name: "eeo-login-overrides",
  initialize() {
    withPluginApi("1.0.0", () => {
      // 去掉登录框 placeholder 中的"/用户名"
      const patch = (locale) => {
        const t = I18n.translations?.[locale]?.js;
        if (t?.login) {
          t.login.email_placeholder = "\u7535\u5b50\u90ae\u4ef6";
        }
      };
      ["zh_CN", "zh_TW", "zh", "en"].forEach(patch);
    });
  },
};
