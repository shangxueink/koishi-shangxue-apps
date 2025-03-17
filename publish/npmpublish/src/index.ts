import { Context, Schema, h } from "koishi";
import fs from "node:fs";
import path from "node:path";
import URL from "node:url";
import { Jimp } from "jimp";

export const reusable = true; // 声明此插件可重用

export const name = "bangbangcai";

export const inject = {
  required: ["database", "i18n", "http", "logger"],
  // optional: [""],
};

export const usage = `
<h1>邦多利猜猜看（邦邦猜）</h1>

<p>卡面图片来源于 <a href="https://bestdori.com" target="_blank">bestdori.com</a></p>

<div class="notice">
<h3>Notice</h3>
<p>在 Onebot 适配器下，偶尔发不出来图，Koishi 报错日志为 <code>retcode:1200</code> 时，

请查看协议端日志自行解决！</p>

<p>在 QQ 适配器下，偶尔发不出来图，Koishi 报错日志为 <code>bad request</code> 时，建议参见 论坛10257帖！ 

-> https://forum.koishi.xyz/t/topic/10257 </p>
</div>

<hr>

<div class="requirement">
<h3>Requirement</h3>
<p>1.1.0版本以前安装过的用户，请先使用 <code>bbcdrop</code> 指令 重置数据</p>
<p>卡面存放路径 可更改，默认值 在 koishi根目录 创建。</p>
</div>

<hr>

<div class="version">
<h3>Version</h3>
<p>1.3.0</p>
<ul>
<li>新增【重切片】指令，优化切片效果。</li>
<li>新增【数据表清除】指令，可清除数据表。</li>
<li>优化私聊环境，兼容特殊字符的频道ID。</li>
</ul>
</div>

<hr>

<div class="thanks">
<h3>Thanks</h3>
<p>灵感参考： <a href="/market?keyword=koishi-plugin-cck">koishi-plugin-cck</a></p>

<hr>

<h4>如果想继续开发优化本插件，<a href="https://github.com/xsjh/koishi-plugin-bangbangcai/pulls" target="_blank">欢迎 PR</a></h4>

</body>
`;

export const Config =
  Schema.intersect([
    Schema.object({
      bbc: Schema.string().default("邦邦猜").description("`父级指令`名称"),
      bbc_command: Schema.string().default("bbc").description("`游戏开始`的指令名称"),
      bbc_restart_command: Schema.string().default("bbc重开").description("`游戏重新开始`的指令名称"),
      bbc_bzd_command: Schema.string().default("bbcbzd").description("`不知道答案`的指令名称"),
      bbc_drop_command: Schema.string().default("bbcdrop").description("`清除bbc数据表`的指令名称（默认三级权限）"),
      bbc_recrop_command: Schema.string().default("bbc重切").description("`重新切片`的指令名称"),
    }).description('基础设置'),
    Schema.object({
      textMessage: Schema.string().description("`猜谜`提示语1").default("时间60秒~\n猜猜我是谁："),
      remind_Message: Schema.string().description("`猜谜`提示语2").default("(如遇到重复题目请输入 bbc重开 以清理数据库)"),
      phrase_timeout: Schema.array(String).role("table").description("`超时结束`时 提示：").default(["60秒到了~\n答案是："]),
      phrase_answered: Schema.array(String).role("table").description("`回答正确`时 提示：").default(["不赖，你还懂"]),
      phrase_bzd: Schema.array(String).role("table").description("触发`不知道`时 提示：").default(["游戏结束，这是："]),
    }).description('进阶设置'),
    Schema.object({
      bbctimeout: Schema.number().default(60).description("游戏持续(计时)的 时长（秒）"),
      nowtimers: Schema.boolean().default(false).description("开启后，触发【bbc】指令之后，立即进入60秒计时<br>关闭后，等待用户 `交互第一条消息后` 才进入计时。"),
      max_recrop_times: Schema.number().default(3).min(0).max(15).step(1).description("允许`重新切片`的最大次数").role("slider"),
      autocleantemp: Schema.boolean().default(true).description("开启后，自动清除`游戏结束的`频道数据。"),
    }).description('交互设置'),
    Schema.object({
      card_path: Schema.string().description("卡面图片数据 (临时)存放路径<br>请填入`文件夹绝对路径`，例如：`D:\\bbcimg\\card`<br>为空时，默认存到`koishi根目录/data/bangbangcai`"),
      cutWidth: Schema.number().default(200).description("卡片剪裁 宽度"),
      cutLength: Schema.number().default(150).description("卡片剪裁 高度"),
    }).description('高级设置'),
    Schema.object({
      logger_info: Schema.boolean().default(false).description("日志调试模式"),
    }).description('开发者设置'),
  ]);


declare module "koishi" {
  interface Tables {
    bangguess_user: Bangguess_user;
  }
}


export interface Bangguess_user {
  id: number;
  platform: string;
  userId: string;
  channelId: string;
  time: Date;
  img_url: string;
  card: Buffer;
  gaming: boolean; //  gaming 字段 用于标记游戏状态，取代原本的全局变量
  nicknames: string[]; // nicknames 字段，存储昵称数组
  recrop_count: number; //  标记重切次数
}

export async function apply(ctx: Context, config) {
  // 存储每个群聊的计时器
  const timers: any = {};

  ctx.on('ready', async () => {

    try {
      ctx.model.extend("bangguess_user",
        {
          // 各字段类型
          id: "unsigned",
          platform: "string",
          userId: "string",
          channelId: "string",
          time: "timestamp",
          img_url: "string",
          card: "binary",
          gaming: "boolean",
          nicknames: "json",
          recrop_count: "integer",
        },
        {
          // 使用自增的主键值
          autoInc: true,
          unique: [["platform", "channelId"]],
        }
      );
    } catch (error) {
      ctx.logger.error("数据表创建出错", error);
    }

    ctx.i18n.define("zh-CN",
      {
        commands: {
          [config.bbc]: {
            description: `邦多利猜猜看（邦邦猜）`,
            messages: {
            }
          },
          [config.bbc_command]: {
            description: `BanG Dream猜猜卡面！`,
            messages: {
              "aleadygaming": "当前已有游戏进行中~输入\"{0}\" 可以结束当前游戏\n(如遇到故障可输入 \"{1}\" 以清理数据库)",
              "errorstart": "游戏启动失败，请稍后重试。",
              "jsonreaderror": "读取角色数据失败，请检查 JSON 文件",
              "failedtocachedata": "存储图片 URL 到数据库失败，请稍后重试。",
              "nowloading": "图片加载中请稍等...",
              "downloaderror": "图片下载失败，请检查网络或重新开始游戏！",
              "dataerror": "数据库出错，请输入 \"{0}\" 清理数据库后即可重新开始游戏！",
              "imagedataerror": "未找到图片数据，若有需要请输入 \"{0}\" 以清理数据库，之后重新开始游戏即可！",
              "imgfailedtosend": "答案图片发送失败",
              "runtimeerror": "执行游戏时出错，请查看日志",
            }
          },
          [config.bbc_restart_command]: {
            description: `bbc数据清理，重开！`,
            messages: {
              "restartplz": "群聊 {0} 数据已清理，请重开游戏！",
              "restarterror": "清理数据失败，请稍后再试",
            }
          },
          [config.bbc_bzd_command]: {
            description: "不知道答案",
            messages: {
              "nogame": "当前没有正在进行的游戏哦~",
            }
          },
          [config.bbc_recrop_command]: {
            description: "重新切片",
            messages: {
              "nogame": "当前没有正在进行的游戏哦~",
              "recroperror": "重切片失败，请稍后重试",
              "recrop_times_exhausted": "重切片次数已经用尽哦~",
              "recrop_success": "重切片成功！",
            }
          },
          [config.bbc_drop_command]: {
            description: "清除 bbc 数据表",
            messages: {
              "drop_success": "数据表 bangguess_user 已成功删除。",
              "drop_error": "删除数据表时发生错误，请稍后重试。",
            }
          },
        }
      }
    );

    ctx.command(`${config.bbc}`);
    ctx.command(`${config.bbc}/${config.bbc_drop_command}`, { authority: 3 })
      .action(async ({ session }) => {
        try {
          await ctx.model.drop('bangguess_user');
          await session.send(session.text(`.drop_success`));
          logInfo(`数据表 bangguess_user 已被删除`);
        } catch (error) {
          ctx.logger.error("删除数据表时出错", error);
          await session.send(session.text(`.drop_error`));
        }
      });

    // 故障重启指令
    ctx.command(`${config.bbc}/${config.bbc_restart_command}`)
      .action(async ({ session }) => {
        const channelId = session.channelId;
        const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId; // 私聊频道ID处理;
        try {
          await ctx.database.remove("bangguess_user", { channelId: sanitizedChannelId }); // 清理整个 channelId 的数据，包括 gaming 为 true 的;
          await session.send(session.text(".restartplz", [channelId]));
          logInfo(`群聊 ${channelId} 的数据已被清理 (包括正在进行的游戏)`);
        } catch (error) {
          ctx.logger.error(`清理群聊 ${channelId} 数据时出错`, error);
          await session.send(session.text(".restarterror"));
        }
      });

    // 不知道答案指令
    ctx.command(`${config.bbc}/${config.bbc_bzd_command}`)
      .action(async ({ session }) => {
        const channelId = session.channelId;
        const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId; // 私聊频道ID处理;
        const userId = session.userId;
        try {
          const gameRecord = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true }); // 使用 sanitizedChannelId 查询;
          if (gameRecord.length === 0) {
            await session.send(session.text(`commands.${config.bbc_bzd_command}.messages.nogame`));
            return;
          }
          const record = gameRecord[0];
          const imageData = record.card; // 获得图片二进制数据;
          const nicknames = record.nicknames;
          try {
            const message = [
              `${config.phrase_bzd}${nicknames[7]}`,
              h.image(imageData, "image/png"), // 使用 h.image() 发送图片;
            ].join("\n");
            await session.send(message);
          } catch (e) {
            ctx.logger.error("答案图片发送失败:", e);
            await session.send(session.text(`commands.${config.bbc_command}.messages.imgfailedtosend`));
          }
          logInfo("bzd游戏结束消息发给了", userId, channelId);
          await clearGameSession(channelId, userId, session.isDirect); // 结束游戏 session, 传入 userId 和 isDirect;
        } catch (error) {
          ctx.logger.error("处理不知道答案指令时出错:", error);
          await session.send(session.text(".runtimeerror")); // 可以发送一个错误提示;
        }
      });

    // 重切片指令
    ctx.command(`${config.bbc}/${config.bbc_recrop_command}`)
      .action(async ({ session }) => {
        const channelId = session.channelId;
        const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId; // 私聊频道ID处理;
        const userId = session.userId;
        try {
          const gameRecord = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true }); // 使用 sanitizedChannelId 查询;
          if (gameRecord.length === 0) {
            await session.send(session.text(`commands.${config.bbc_recrop_command}.messages.nogame`));
            return;
          }
          const record = gameRecord[0];
          let recrop_count = record.recrop_count;
          if (recrop_count <= 0) {
            await session.send(session.text(`commands.${config.bbc_recrop_command}.messages.recrop_times_exhausted`));
            return;
          }

          recrop_count--; // 减少重切片次数;
          await ctx.database.set("bangguess_user", { channelId: sanitizedChannelId, gaming: true }, { recrop_count: recrop_count }); // 更新数据库中的重切片次数; // 使用 sanitizedChannelId 更新;

          const card_path = config.card_path || path.join(ctx.baseDir, 'data', 'bangbangcai');
          const folderPath = path.join(card_path, "images"); // 图片保存路径;
          const cutWidth = config.cutWidth; // 裁剪宽度;
          const cutLength = config.cutLength; // 裁剪高度;
          try {
            await randomCropImage(
              userId,
              sanitizedChannelId, // 使用处理后的 channelId;
              cutWidth,
              cutLength,
              folderPath
            );
            //             const imageSegments: any = [[session.text(".recrop_success")]]; // 发送重切片成功提示;
            const imageSegments = [];
            imageSegments.push(h.text(session.text(".recrop_success")));
            for (let i = 1; i <= 3; i++) {
              const croppedImagePath = path.join(
                folderPath,
                `${userId}_${sanitizedChannelId}`, // 使用处理后的 channelId;
                `cropped_image_${i}.png`
              );
              if (fs.existsSync(croppedImagePath)) {
                imageSegments.push(h.image(URL.pathToFileURL(croppedImagePath).href));// 类型“Element”的参数不能赋给类型“string[]”的参数。;

              } else {
                ctx.logger.error(`裁剪后的图片不存在: ${croppedImagePath}`);
                return "图片截取出错，请稍后再试"
              }
            }
            imageSegments.push(config.remind_Message);
            await session.send(imageSegments);
            logInfo("重新裁剪图片发往：", userId, channelId);
          } catch (error) {
            ctx.logger.error("重新裁剪失败:", error);
            await session.send(session.text(`commands.${config.bbc_recrop_command}.messages.recroperror`));
            return;
          }

        } catch (error) {
          ctx.logger.error("处理重切片指令时出错:", error);
          await session.send(session.text(".runtimeerror")); // 可以发送一个错误提示;
        }
      });


    async function clearGameSession(channelId: string, userId?: string, isDirect?: boolean) {
      try {
        if (channelId) {
          const sanitizedChannelId = isDirect ? sanitizeChannelId(channelId) : channelId; // 私聊频道ID处理;
          // 先获取当前游戏状态
          const gameRecord = await ctx.database.get("bangguess_user", {
            channelId: sanitizedChannelId,
            gaming: true
          });

          // 只有存在有效游戏记录时才执行清理
          if (gameRecord.length > 0) {
            // 移除监听器（如果存在）
            if (timers[channelId]?.unregisterListener) {
              timers[channelId].unregisterListener();
              logInfo(`[clearGameSession] 已移除群聊 ${channelId} 的监听器`);
            }

            // 移除监听器和计时器 **先于** 数据库操作
            if (timers[channelId]) {
              if (timers[channelId].unregisterListener) {
                timers[channelId].unregisterListener();
                logInfo(`[clearGameSession] 已移除群聊 ${channelId} 的监听器`);
              }
              clearTimeout(timers[channelId].timer);
              delete timers[channelId];
              logInfo(`[clearGameSession] 已清除群聊 ${channelId} 的计时器`);
            }

            const gameRecord = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true }); // 使用 sanitizedChannelId 查询;
            if (config.autocleantemp && gameRecord.length > 0) { // 检查配置项和游戏记录是否存在;
              const currentUserId = userId || gameRecord[0].userId; // 优先使用传入的 userId，否则从数据库记录中获取;
              const card_path = config.card_path || path.join(ctx.baseDir, 'data', 'bangbangcai');
              const userFolder = path.join(card_path, "images", `${currentUserId}_${sanitizedChannelId}`); // 使用 sanitizedChannelId;

              try {
                if (fs.existsSync(userFolder)) {
                  logInfo(`[clearGameSession] 准备删除用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹: ${userFolder}`);
                  await fs.promises.rm(userFolder, { recursive: true, force: true }); // force: true to avoid errors if files are read-only;
                  logInfo(`[clearGameSession] 已删除用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹: ${userFolder}`);
                } else {
                  logInfo(`[clearGameSession] 未找到用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹，无需删除`);
                }
              } catch (folderDeletionError) {
                ctx.logger.error(`[clearGameSession] 删除用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹时出错:`, folderDeletionError);
              }

              await ctx.database.remove("bangguess_user", { channelId: sanitizedChannelId, gaming: true }); // 删除 gaming 为 true 的记录; // 使用 sanitizedChannelId 删除;
              logInfo(`[clearGameSession] 已删除群聊 ${channelId} 的游戏数据 (autocleantemp enabled)`);

            } else {
              await ctx.database.set("bangguess_user", { channelId: sanitizedChannelId, gaming: true }, { gaming: false }); // 更新 gaming 状态为 false; // 使用 sanitizedChannelId 更新;
              logInfo(`[clearGameSession] 已结束群聊 ${channelId} 的游戏 (autocleantemp disabled, data kept)`);
            }
          }

        }
      } catch (error) {
        ctx.logger.error("[clearGameSession] 更新数据库记录时出错:", error);
      }
    }


    // 定义 "开始游戏" 命令
    ctx.command(`${config.bbc}/${config.bbc_command}`)
      .action(async ({ session }) => {
        const channelId = session.channelId;
        const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId;
        const userId = session.userId;

        try {
          // 判断是否重复进行
          try {
            const existingGame = await ctx.database.get("bangguess_user", {
              channelId: sanitizedChannelId, gaming: true
            });
            if (existingGame.length > 0) {
              await session.send(session.text(".aleadygaming", [config.bbc_bzd_command, config.bbc_restart_command]));
              return;
            } else {
              // 创建新的游戏记录
              const data = {
                platform: session.platform,
                userId: session.userId,
                channelId: sanitizedChannelId,
                time: new Date(),
                gaming: true,
                recrop_count: config.max_recrop_times,
              };
              await ctx.database.create("bangguess_user", data);
            }
          } catch (error) {
            ctx.logger.error("插入数据时出错：", error);
            await session.send(session.text(".errorstart"));
            return; // 确保在出错时返回，避免后续代码执行
          }

          // 读取 JSON 文件，获取随机角色信息
          const jsonFilePath = path.join(__dirname, "./../resource/all5_2.json");
          logInfo("读取的json文件位置：", jsonFilePath);
          const jsonData = await readJson(jsonFilePath);
          if (!jsonData) {
            await session.send(session.text(".jsonreaderror"));
            return;
          }
          const { resourceSetName, characterId } = jsonData;
          const nicknameFilePath = path.join(__dirname, "./../resource/nickname.json");
          let nicknames = await readJson_nickname(nicknameFilePath, characterId);
          logInfo(`角色ID: ${characterId} 的所有昵称:`, nicknames);

          // 构造图片 URL
          const imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`;
          logInfo(`选中的角色ID: ${characterId}`);
          logInfo(`图片链接: ${imageUrl}`);

          // 更新数据库中的图片 URL 和 昵称
          try {
            await ctx.database.set(
              "bangguess_user",
              { channelId: sanitizedChannelId, gaming: true },
              { img_url: imageUrl, nicknames: nicknames }
            );
            logInfo("图片 URL 和 昵称 已成功更新到数据库");
          } catch (error) {
            ctx.logger.error("更新图片 URL 和 昵称 到数据库时出错:", error);
            await session.send(session.text(".failedtocachedata"));
            return;
          }

          // 下载图片
          await session.send(session.text(".nowloading"));
          const imageBuffer = await downloadImage(imageUrl); // 修改变量名以区分Buffer类型
          if (!imageBuffer) {
            await session.send(session.text(".downloaderror"));
            return;
          }

          // 将二进制编码 存储到数据库的 card 字段
          try {
            await ctx.database.set(
              "bangguess_user",
              { channelId: sanitizedChannelId, gaming: true },
              { card: imageBuffer } // 使用 imageBuffer
            );
            logInfo("图片 二进制数据 已成功更新到数据库");
          } catch (error) {
            ctx.logger.error("更新图片 二进制数据 到数据库时出错:", error);
            await session.send(session.text(".failedtocachedata"));
            return;
          }

          // 调用 randomCropImage 进行裁剪并发送图片
          const imageSegments = [];
          try {
            const card_path = config.card_path || path.join(ctx.baseDir, 'data', 'bangbangcai');
            const folderPath = path.join(card_path, "images");
            const cutWidth = config.cutWidth;
            const cutLength = config.cutLength;

            await randomCropImage(
              userId,
              sanitizedChannelId,
              cutWidth,
              cutLength,
              folderPath
            );
            imageSegments.push(config.textMessage);
            for (let i = 1; i <= 3; i++) {
              const croppedImagePath = path.join(
                folderPath,
                `${userId}_${sanitizedChannelId}`,
                `cropped_image_${i}.png`
              );
              if (fs.existsSync(croppedImagePath)) {
                imageSegments.push(h.image(URL.pathToFileURL(croppedImagePath).href));
              } else {
                ctx.logger.error(`裁剪后的图片不存在: ${croppedImagePath}`);
              }
            }
            imageSegments.push(config.remind_Message);
            await delay(1000);
          } catch (error) {
            ctx.logger.error("裁剪失败:", error);
            return "裁剪失败，请检查日志。";
          }

          try {
            await session.send(imageSegments);
            logInfo("裁剪图片发往：", userId, channelId);
          } catch (error) {
            ctx.logger.error("发送图片消息时出错:", error);
          }

          logInfo("游戏已启动，等待用户输入...");

          // 启动计时器 (只有当 config.nowtimers 为 false 时才启动，否则在 middleware 中启动)
          if (!config.nowtimers) {
            timers[channelId] = timers[channelId] || {};
            timers[channelId].timer = ctx.setTimeout(async () => {
              await handleTimeout(ctx, config, session, sanitizedChannelId, timers); // 提取超时处理函数
            }, config.bbctimeout * 1000);
          }


        } catch (error) {
          ctx.logger.error("游戏执行过程中出错:", error);
          await session.send(session.text(".runtimeerror"));
        }
      });

    ctx.middleware(async (session, next) => {
      const channelId = session.channelId;
      const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId;
      const userId = session.userId;
      const userInput = session.stripped.content.trim();

      try {
        const gameRecord = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true });
        if (gameRecord.length > 0 && gameRecord[0].gaming === true) {
          // 游戏正在进行中
          const record = gameRecord[0];
          const nicknames = record.nicknames;

          /*if (userInput === config.bbc_bzd_command) {
            // 用户输入了 "不知道答案" 指令
            logInfo(`用户 ${userId} 在频道 ${channelId} 输入了 ${config.bbc_bzd_command}`);
            await handleBzdCommand(ctx, config, session, sanitizedChannelId, record, timers); // 提取不知道答案处理函数
            return; // 阻止消息传递到下一个中间件
          }*/

          if (nicknames.some((nickname) => userInput.includes(nickname))) {
            // 用户回答正确
            logInfo(`用户 ${userId} 在频道 ${channelId} 回答正确: ${userInput}`);
            await handleCorrectAnswer(ctx, config, session, sanitizedChannelId, record, userInput, timers); // 提取正确答案处理函数
            return; // 阻止消息传递到下一个中间件
          }

          // 检查是否是游戏开始后第一次用户输入，并且 config.nowtimers 为 true
          if (config.nowtimers && !timers[channelId]?.timer) { // 确保计时器只启动一次
            timers[channelId] = timers[channelId] || {};
            timers[channelId].timer = ctx.setTimeout(async () => {
              await handleTimeout(ctx, config, session, sanitizedChannelId, timers); // 提取超时处理函数
            }, config.bbctimeout * 1000);
            logInfo(`[nowtimers] 启动群聊 ${channelId} 的计时器，等待超时`);
          }


          logInfo(`用户 ${userId} 在频道 ${channelId} 输入了错误答案或无关消息: ${userInput}`);
          // 用户输入了错误答案或者无关消息，但游戏继续进行，不阻止消息传递
          return next();

        } else {
          // 当前频道没有游戏进行，直接传递给下一个中间件
          return next();
        }
      } catch (error) {
        ctx.logger.error("中间件处理消息时出错:", error);
        return next(); // 发生错误也传递给下一个中间件，避免阻塞
      }
    }, config.middleware);

    async function handleTimeout(ctx: Context, config: any, session: any, sanitizedChannelId: string, timers: any) {
      const channelId = session.channelId;
      const userId = session.userId;

      // 检查当前计时器是否仍然有效
      const currentTimer = timers[channelId];
      if (!currentTimer?.timer) {
        logInfo("[倒计时] 计时器已被清除，跳过处理");
        return;
      }

      try {
        const records = await ctx.database.get('bangguess_user', {
          channelId: sanitizedChannelId,
          gaming: true
        });

        // 确保游戏状态仍然有效
        if (records.length === 0 || records[0].gaming !== true) {
          logInfo("[倒计时] 游戏已提前结束，跳过超时处理");
          return;
        }

        if (!records[0].card) {
          ctx.logger.error("[倒计时] 倒计时结束方法未找到二进制数据");
          await session.send(session.text(`commands.${config.bbc_command}.messages.dataerror`, [config.bbc_restart_command]));
          return;
        }

        const record = records[0];
        const message = [
          `${config.phrase_timeout}${record.nicknames[7]}`,
          record.img_url,
          h.image(record.card, 'image/png'),
        ].join('\n');

        await session.send(message);
        logInfo('[超时] 超时游戏结束消息发给了', channelId, userId);
      } catch (error) {
        ctx.logger.error('[超时] 发送消息或图片时出错:', error);
      } finally {
        // 确保只清理当前游戏的计时器
        if (timers[channelId]?.timer === currentTimer.timer) {
          logInfo('[超时] 清理当前游戏会话');
          await clearGameSession(channelId, userId, session.isDirect);
          clearTimeout(timers[channelId]?.timer);
          delete timers[channelId];
        } else {
          logInfo('[超时] 检测到新游戏已开始，跳过清理');
        }
      }
    }

    // 提取 "回答正确" 处理函数
    async function handleCorrectAnswer(ctx: Context, config: any, session: any, sanitizedChannelId: string, record: Bangguess_user, userInput: string, timers: any) {
      const channelId = session.channelId;
      const userId = session.userId;
      const img_url = record.img_url;
      const imageData = record.card;
      const nicknames = record.nicknames;

      // 立即结束游戏会话，防止多次触发
      await clearGameSession(channelId, userId, session.isDirect);

      // 再次检查游戏是否还在进行中，以防 clearGameSession 出现问题或其他竞态条件
      const currentGameRecord = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true });
      if (currentGameRecord.length > 0 && currentGameRecord[0].gaming) {
        logInfo('[回答正确] 游戏会话清理后，仍然检测到 gaming 为 true，可能存在竞态条件或错误');
        // 即使出现异常，也应该继续发送回答正确的消息，但需要记录日志进行排查
      }

      const message_y = [`正确，${nicknames[7]} : `, img_url];
      await session.send(message_y);
      try {
        const message = [
          `${h.at(session.userId)} ${config.phrase_answered}${userInput}`,
          h.image(imageData, 'image/png'),
          '游戏结束',
        ].join('\n');
        await session.send(message);
      } catch {
        await session.send(session.text(`commands.${config.bbc_command}.messages.imgfailedtosend`));
      }
      logInfo('[回答正确] 回答正确消息发送至：', userId, userInput);

      if (timers[channelId]?.timer) {
        clearTimeout(timers[channelId].timer);
        delete timers[channelId].timer;
      }
    }



    // 延迟等待方法
    async function delay(ms: number): Promise<void> {
      return new Promise((resolve) => ctx.setTimeout(resolve, ms));
    }

    // 下载图片并存储二进制数据到数据库
    async function downloadImage(
      imageUrl: string,
      maxRetries = 2, // 下载图片的最大重试次数;
      retryDelay = 2000 // 重试间隔时间;
    ): Promise<Buffer | null> {
      let attempt = 0; // 下载尝试次数;;
      while (attempt <= maxRetries) {
        try {
          /*
          // 使用ctx.http获取图片的二进制数据，返回ArrayBuffer
          const responseData = await ctx.http.get<ArrayBuffer>(imageUrl, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
              Referer: "https://bestdori.com/",
            },
          });
          logInfo(`图片: ${imageUrl}`);
          logInfo(`图片请求成功，大小: ${responseData.byteLength} 字节`);
          logInfo(`图片二进制数据的前10个字节:`, new Uint8Array(responseData, 0, 10)
          ); // 输出前10个字节进日志查看;
          */
          const responseData = await ctx.http.file(imageUrl)
          logInfo(`图片: ${imageUrl}`);
          logInfo(responseData);
          const buffer = Buffer.from(responseData.data); // 将 ArrayBuffer 转换为 Buffer

          return buffer;
        } catch (error) {
          ctx.logger.error(`第 ${attempt + 1} 次下载图片失败:`, error);
          attempt++;
          if (attempt > maxRetries) {
            ctx.logger.error(`下载图片失败，已达到最大重试次数 (${maxRetries} 次)`);
            return null;
          }
          // 等待重试间隔时间
          logInfo(`等待 ${retryDelay / 1000} 秒后重试...`);
          await new Promise((resolve: any) => ctx.setTimeout(resolve, retryDelay));
        }
      }
      return null; // 所有重试都失败返回null
    }

    async function randomCropImage(
      userId: string,
      channelId: string | null,
      cutWidth: number,
      cutLength: number,
      folderPath: string
    ): Promise<void> {
      const sanitizedChannelId = channelId || "sandbox"; // 默认值 sandbox;
      try {
        const records = await ctx.database.get("bangguess_user", {
          channelId: sanitizedChannelId, gaming: true // 使用 sanitizedChannelId 查询;
        });
        if (records.length === 0) {
          ctx.logger.error("未找到游戏记录");
          return;
        }
        if (!records[0].card) {
          ctx.logger.error("未找到图片数据");
          return; // 提前返回，避免后续错误;
        }
        const imageData = records[0].card; // 获取图片二进制数据;
        logInfo(`从数据库获取到图片数据，大小: ${imageData.byteLength} 字节`); // 打印图片数据大小;
        const imageBuffer = Buffer.from(imageData); // 确保是 Buffer 类型;
        // 创建文件夹路径
        const userFolder = path.join(folderPath, `${userId}_${sanitizedChannelId}`); // 文件路径也使用 sanitizedChannelId;
        if (!fs.existsSync(userFolder)) {
          fs.mkdirSync(userFolder, { recursive: true });
        }
        // 保存原始图片到文件夹中
        const originalImagePath = path.join(userFolder, "res.png");
        await fs.promises.writeFile(originalImagePath, imageBuffer);
        logInfo(`原始图片已保存到: ${originalImagePath}`);
        // 使用 Jimp 读取图片
        const image = await Jimp.read(imageBuffer);
        for (let i = 1; i <= 3; i++) {
          // 随机计算矩形的起始坐标
          const x = Math.floor(Math.random() * (image.bitmap.width - cutWidth));
          const y = Math.floor(Math.random() * (image.bitmap.height - cutLength));
          // 裁剪图片
          const croppedImage = image
            .clone()
            .crop({ x: x, y: y, w: cutWidth, h: cutLength });
          // 强制转换为模板字符串类型（否则write方法无法使用）
          const croppedImagePath = path.join(userFolder, `cropped_image_${i}.png`) as `${string}.${string}`;
          await croppedImage.write(croppedImagePath); // 保存文件
          logInfo(`图像裁剪完成，保存为：${croppedImagePath}`);
        }
        logInfo("所有裁切图片已成功保存");
      } catch (error) {
        ctx.logger.error("裁剪图像时出错:", error);
        return;
      }
    }


    // 随机读取卡面json的方法
    async function readJson(filePath) {
      try {
        const data = await fs.promises.readFile(filePath, "utf8"); // 异步读取文件;
        const parsedData = JSON.parse(data); // 解析 JSON 数据;
        const keys = Object.keys(parsedData); // 获取所有键;
        // 随机选择一个键并返回相应的资源数据
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const characterData = parsedData[randomKey];
        logInfo("json随机键:", randomKey);
        logInfo("获得的随机characterData:", characterData);
        // 获取 resourceSetName 和 characterId
        const resourceSetName = characterData.resourceSetName;
        const characterId = characterData.characterId;
        logInfo("此键resourceSetName:", resourceSetName);
        logInfo("此键characterId:", characterId);
        return { resourceSetName, characterId }; // 返回相关数据;
      } catch (error) {
        ctx.logger.error("读取 JSON 文件时出错:", error);
        return null; // 如果出错，返回 null;
      }
    }

    // 读取 nickname.json 文件并根据 characterId 获取对应的昵称列表方法
    async function readJson_nickname(nick_filePath, characterId) {
      try {
        // 异步读取 JSON 文件
        const data = await fs.promises.readFile(nick_filePath, "utf8");
        const parsedData = JSON.parse(data); // 解析 JSON 数据;
        // 查找对应的 characterId
        const nicknames = parsedData[characterId]; // 通过 characterId 查找对应的昵称;
        // logInfo('角色名', nicknames);
        // 如果找到了该 ID 对应的昵称数组，返回该数组，否则返回一个空数组
        if (nicknames) {
          return nicknames; // 返回该 characterId 对应的所有昵称;
        } else {
          ctx.logger.error(`未找到对应的 characterId: ${characterId} 的昵称`);
          return []; // 如果没有找到对应的昵称，返回一个空数组;
        }
      } catch (error) {
        ctx.logger.error("读取 JSON 文件时出错:", error);
        return [];
      }
    }

    function logInfo(...args: any[]) {
      if (config.logger_info) {
        (ctx.logger.info as (...args: any[]) => void)(...args);
      }
    }

    // 安全地处理 channelId，移除特殊字符，用于文件路径
    function sanitizeChannelId(channelId: string): string {
      return channelId.replace(/[^a-zA-Z0-9_-]/g, "_"); // 移除所有非字母数字、下划线和短横线的字符;
    }

  });
}