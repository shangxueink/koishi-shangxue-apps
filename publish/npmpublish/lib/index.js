var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "change-auth-callme";
var inject = ["database"];
var usage = `
---

<p>开启插件后，使用<code>changeauth 5</code>即可将自己的权限提升至5。</p>
<p>注： 根据 <a href="https://koishi.chat/zh-CN/manual/usage/customize.html#%E6%9D%83%E9%99%90%E7%AE%A1%E7%90%86" target="_blank">Koishi权限管理文档</a>，建议设置的最高权限不大于<code>5</code>。</p>
<ul>
<li>温馨提示，请在使用时注意：</li>
<li>强烈建议为本插件配置 <strong>过滤器</strong>为 <strong>用户ID 等于 你的ID</strong> ，以防止其他无关用户使用本插件，避免潜在隐患。</li>
<li>本插件仅适用于提升自身权限，若需要为他人提升权限，<a href="https://koishi.chat/zh-CN/plugins/common/admin.html#%E6%8C%87%E4%BB%A4-authorize" target="_blank">请参考 这里</a>。</li>
</ul>

[本插件参考自callme插件](/market?keyword=callme)

---
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    Command: import_koishi.Schema.boolean().description("是否注册指令").default(true),
    Command_Name: import_koishi.Schema.string().description("注册的指令名称").default("changeauth"),
    MAX_authority_Limit: import_koishi.Schema.number().default(5).description("允许修改为的最大权限值"),
    enableAutoAuth: import_koishi.Schema.boolean().description("中间件自动授权。`开启后`，根据用户`role`自动授权。")
  }).description("指令设置"),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      enableAutoAuth: import_koishi.Schema.const(true).required(),
      middleware_true: import_koishi.Schema.boolean().description("使用前置中间件").default(false),
      roleAuthorityMapping: import_koishi.Schema.array(import_koishi.Schema.object({
        role: import_koishi.Schema.string().description("身份名称"),
        authority: import_koishi.Schema.number().description("授权值").default(1)
      })).role("table").description('授权值映射表<br>填入`role`和权限值，比如onebot协议：管理员：`admin`、群主：`owner`、群员：`member`<hr style="border: 2px solid red;">▶例：此功能`可能`会导致你手动指定人的授权，被恢复为表中权限值：比如授权给一个群主5级，结构表中写的`owner`是4级，那么他发言时会从5 ->   4').default([
        {
          "role": "owner",
          "authority": 4
        },
        {
          "role": "admin",
          "authority": 3
        },
        {
          "role": "member",
          "authority": 1
        }
      ]),
      roleAuthorityRange: import_koishi.Schema.union([
        import_koishi.Schema.const("1").description("取消限制，严格按照上表授权。"),
        import_koishi.Schema.const("2").description("权限为`正`的变化值时（提升）修改"),
        import_koishi.Schema.const("3").description("权限为`负`的变化值时（下降）修改"),
        import_koishi.Schema.const("4").description("指定权限值以下的用户变化权限时才修改。")
      ]).role("radio").description("自动授权范围。<br>▶可以防止上例的`恢复为表中权限值`的情况").default("2")
    }).description("自动授权设置"),
    import_koishi.Schema.object({})
  ]),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      enableAutoAuth: import_koishi.Schema.const(true).required(),
      roleAuthorityRange: import_koishi.Schema.const("4").required(),
      roleAuthorityRange_limit: import_koishi.Schema.number().description("请输入一个权限数值。此权限值以上，都不进行自动修改。").default(2)
    }),
    import_koishi.Schema.object({})
  ]),
  import_koishi.Schema.object({
    delayTime: import_koishi.Schema.number().description("延迟执行时间（毫秒）<br>用于`在前置中间件内部等待user属性加载`").default(1e3).min(100).step(100).max(1e4),
    consoleinfo: import_koishi.Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`")
  }).description("调试选项")
]);
function apply(ctx, config) {
  ctx.on("before-attach-user", (_, fields) => {
    fields.add("id");
    fields.add("authority");
  });
  if (config.Command) {
    const zh_CN_default = {
      commands: {
        [config.Command_Name]: {
          description: "定义自己的权限",
          messages: {
            current: "authority{0}！",
            unnamed: "暂无authority",
            unchanged: "authority未发生变化。",
            empty: "authority不能为空。",
            invalid: "权限值必须为纯数字。",
            toolarge: "您输入的权限值过高，最大值为：{0}。",
            toosmall: "您输入的权限值过低，最小值为：1。",
            updated: "您的权限已改为：{0}",
            failed: "修改authority失败。"
          }
        }
      }
    };
    ctx.i18n.define("zh-CN", zh_CN_default);
    ctx.command(`${config.Command_Name} [authority:text]`, `自定义权限等级`).userFields(["id", "authority"]).action(async ({ session }, authority) => {
      const { user } = session;
      if (!authority) {
        logInfo(`用户 ${user.id} 未提供权限值，返回空值错误。`);
        return session.text(".empty");
      }
      authority = import_koishi.h.transform(authority, {
        text: true,
        default: false
      }).trim();
      if (!/^\d+$/.test(authority)) {
        logInfo(`用户 ${user.id} 提供的权限值 ${authority} 不是纯数字，返回无效错误。`);
        return session.text(".invalid");
      }
      const authorityValue = parseInt(authority);
      if (authorityValue < 1) {
        logInfo(`用户 ${user.id} 提供的权限值 ${authorityValue} 小于 1，返回过小错误。`);
        return session.text(".toosmall");
      }
      if (authorityValue > config.MAX_authority_Limit) {
        logInfo(`用户 ${user.id} 提供的权限值 ${authorityValue} 超过最大值 ${config.MAX_authority_Limit}，返回过大错误。`);
        return session.text(".toolarge", [config.MAX_authority_Limit]);
      }
      if (authorityValue === user.authority) {
        logInfo(`用户 ${user.id} 的权限值未发生变化，仍为 ${authorityValue}。`);
        return session.text(".unchanged");
      }
      try {
        logInfo(`用户 ${user.id} 的权限值从 ${user.authority} 更新为 ${authorityValue}。`);
        user.authority = authorityValue;
        await user.$update();
        return session.text(".updated", [authorityValue]);
      } catch (error) {
        logInfo(`用户 ${user.id} 的权限更新失败，错误信息: ${error.message}`);
        ctx.logger("common").warn(error);
        return session.text(".failed");
      }
    });
  }
  function logInfo(message) {
    if (config.consoleinfo) {
      ctx.logger.info(message);
    }
  }
  __name(logInfo, "logInfo");
  if (config.enableAutoAuth) {
    ctx.middleware(async (session, next) => {
      if (config.middleware_true) {
        logInfo("使用前置中间件。");
      }
      const sessionRoles = session.event?.member?.roles;
      if (!sessionRoles) {
        setTimeout(async () => {
          try {
            const { user } = session;
            if (!user || user.id === void 0) {
              logInfo(`延迟检查：用户字段仍未加载，跳过权限检查。`);
              return;
            }
            logInfo(`延迟检查：用户 ${user.id} 无角色信息，跳过权限检查。`);
          } catch (error) {
            logInfo(`延迟检查时发生错误: ${error}`);
          }
        }, config.delayTime || 1e3);
        return next();
      }
      setTimeout(async () => {
        try {
          const { user } = session;
          if (!user || user.id === void 0 || user.authority === void 0) {
            logInfo(`延迟执行：用户字段未正确加载，跳过权限检查。`);
            return;
          }
          logInfo(`用户 ${user.id} 的角色列表: ${sessionRoles.join(", ")}`);
          for (const mapping of config.roleAuthorityMapping) {
            if (sessionRoles.includes(mapping.role)) {
              logInfo(`用户 ${user.id} 拥有角色 ${mapping.role}，权限值应为 ${mapping.authority}。`);
              let shouldUpdate = false;
              switch (config.roleAuthorityRange) {
                case "1":
                  shouldUpdate = true;
                  break;
                case "2":
                  shouldUpdate = mapping.authority > user.authority;
                  break;
                case "3":
                  shouldUpdate = mapping.authority < user.authority;
                  break;
                case "4":
                  shouldUpdate = user.authority < (config.roleAuthorityRange_limit || 2);
                  break;
              }
              if (shouldUpdate && user.authority !== mapping.authority) {
                logInfo(`用户 ${user.id} 的权限值从 ${user.authority} 更新为 ${mapping.authority}。`);
                user.authority = mapping.authority;
                await user.$update();
              }
              break;
            }
          }
        } catch (error) {
          logInfo(`延迟执行权限检查时发生错误: ${error}`);
        }
      }, config.delayTime || 1e3);
      return next();
    }, config.middleware_true);
  }
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  usage
});
