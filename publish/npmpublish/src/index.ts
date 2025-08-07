import { Schema, h, Context, Session } from "koishi"

export const name = "change-auth-callme"

export const inject = ["database"]

export const usage = `
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
`

export const Config = Schema.intersect([
  Schema.object({
    Command: Schema.boolean().description("是否注册指令").default(true),
    Command_Name: Schema.string().description("注册的指令名称").default('changeauth'),
    MAX_authority_Limit: Schema.number().default(5).description("允许修改为的最大权限值"),
    enableAutoAuth: Schema.boolean().description("中间件自动授权。`开启后`，根据用户`role`自动授权。")
  }).description('指令设置'),

  Schema.union([
    Schema.object({
      enableAutoAuth: Schema.const(true).required(),
      middleware_true: Schema.boolean().description("使用前置中间件").default(false),
      roleAuthorityMapping: Schema.array(Schema.object({
        role: Schema.string().description("身份名称"),
        authority: Schema.number().description("授权值").default(1),
      })).role('table').description('授权值映射表<br>填入`role`和权限值，比如onebot协议：管理员：`admin`、群主：`owner`、群员：`member`<hr style="border: 2px solid red;">▶例：此功能`可能`会导致你手动指定人的授权，被恢复为表中权限值：比如授权给一个群主5级，结构表中写的`owner`是4级，那么他发言时会从5 ->   4')
        .default([
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
      roleAuthorityRange: Schema.union([
        Schema.const('1').description('取消限制，严格按照上表授权。'),
        Schema.const('2').description('权限为`正`的变化值时（提升）修改'),
        Schema.const('3').description('权限为`负`的变化值时（下降）修改'),
        Schema.const('4').description('指定权限值以下的用户变化权限时才修改。'),
      ]).role('radio').description("自动授权范围。<br>▶可以防止上例的`恢复为表中权限值`的情况").default('2'),
    }).description('自动授权设置'),
    Schema.object({}),
  ]),
  Schema.union([
    Schema.object({
      enableAutoAuth: Schema.const(true).required(),
      roleAuthorityRange: Schema.const('4').required(),
      roleAuthorityRange_limit: Schema.number().description('请输入一个权限数值。此权限值以上，都不进行自动修改。').default(2),
    }),
    Schema.object({}),
  ]),

  Schema.object({
    delayTime: Schema.number().description("延迟执行时间（毫秒）<br>用于`在前置中间件内部等待user属性加载`").default(1000).min(100).step(100).max(10000),
    consoleinfo: Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
  }).description('调试选项'),
])

export function apply(ctx: Context, config: any) {
  // 声明需要的用户字段
  ctx.on('before-attach-user', (_, fields) => {
    fields.add('id')
    fields.add('authority')
  })
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
    ctx.command(`${config.Command_Name} [authority:text]`, `自定义权限等级`)
      .userFields(["id", "authority"])
      .action(async ({ session }: { session: Session<'id' | 'authority'> }, authority) => {
        const { user } = session;
        if (!authority) {
          logInfo(`用户 ${user.id} 未提供权限值，返回空值错误。`);
          return session.text(".empty");
        }
        authority = h.transform(authority, {
          text: true,
          default: false
        }).trim();

        // 验证是否为纯数字
        if (!/^\d+$/.test(authority)) {
          logInfo(`用户 ${user.id} 提供的权限值 ${authority} 不是纯数字，返回无效错误。`);
          return session.text(".invalid");
        }

        // 转换为整数并验证范围
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

        // const result = ctx.bail("common/changeauth", authorityValue, session);
        // if (result) {
        //   logInfo(`用户 ${user.id} 的权限修改被拦截，返回结果: ${result}`);
        //   return result;
        // }

        try {
          logInfo(`用户 ${user.id} 的权限值从 ${user.authority} 更新为 ${authorityValue}。`);
          user.authority = authorityValue;
          await user.$update();
          return session.text(".updated", [authorityValue]);
        } catch (error: any) {
          logInfo(`用户 ${user.id} 的权限更新失败，错误信息: ${error.message}`);
          ctx.logger("common").warn(error);
          return session.text(".failed");
        }
      });
  }

  // 调试日志函数
  function logInfo(message: string) {
    if (config.consoleinfo) {
      ctx.logger.info(message);
    }
  }


  // 中间件监听
  if (config.enableAutoAuth) {
    ctx.middleware(async (session: Session<'id' | 'authority'>, next) => {
      if (config.middleware_true) { logInfo("使用前置中间件。") }
      const sessionRoles = session.event?.member?.roles;
      if (!sessionRoles) {
        // 延迟执行，等待用户字段加载完成
        setTimeout(async () => {
          try {
            const { user } = session;
            if (!user || user.id === undefined) {
              logInfo(`延迟检查：用户字段仍未加载，跳过权限检查。`);
              return;
            }
            logInfo(`延迟检查：用户 ${user.id} 无角色信息，跳过权限检查。`);
          } catch (error) {
            logInfo(`延迟检查时发生错误: ${error}`);
          }
        }, config.delayTime || 1000);
        return next();
      }

      // 延迟执行涉及用户字段的代码，不等待执行结果
      setTimeout(async () => {
        try {
          const { user } = session;

          // 检查用户字段是否已加载
          if (!user || user.id === undefined || user.authority === undefined) {
            logInfo(`延迟执行：用户字段未正确加载，跳过权限检查。`);
            return;
          }

          logInfo(`用户 ${user.id} 的角色列表: ${sessionRoles.join(', ')}`);

          for (const mapping of config.roleAuthorityMapping) {
            if (sessionRoles.includes(mapping.role)) {
              logInfo(`用户 ${user.id} 拥有角色 ${mapping.role}，权限值应为 ${mapping.authority}。`);

              // 根据 roleAuthorityRange 判断是否覆盖权限
              let shouldUpdate = false;
              switch (config.roleAuthorityRange) {
                case '1': // 取消限制，严格按照上表授权
                  shouldUpdate = true;
                  break;
                case '2': // 权限为`正`的变化值时（提升）修改
                  shouldUpdate = mapping.authority > user.authority;
                  break;
                case '3': // 权限为`负`的变化值时（下降）修改
                  shouldUpdate = mapping.authority < user.authority;
                  break;
                case '4': // 指定权限值以下的用户变化权限时才修改
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
      }, config.delayTime || 1000); // 延迟执行，时间可配置

      return next();
    }, config.middleware_true);
  }


}
