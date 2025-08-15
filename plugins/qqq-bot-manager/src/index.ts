import { Schema, Logger, h } from "koishi";
export const inject = {
    optional: ["qrcode"],
    required: ["i18n"]
};
export const name = 'qqq-bot-manager';
export const reusable = false; // 声明此插件不可重用
export const usage = `
---

<p>本插件使用<strong>派生式指令</strong>结构，所有功能均在父级指令 <code>qqqbot</code> 下。</p>

<table>
<thead>
<tr>
<th>父级指令</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr>
<td class="command"><code>qqqbot</code></td>
<td>qqbot管理</td>
</tr>
</tbody>
</table>

<table>
<thead>
<tr>
<th>子指令</th>
<th>描述</th>
<th>示例</th>
</tr>
</thead>
<tbody>
<tr>
<td class="command"><code>qqqbot 取消登录</code></td>
<td>取消当前正在进行的登录操作。</td>
<td><code>qqqbot 取消登录</code> 或 <code>qqqbot.取消登录</code></td>
</tr>
<tr>
<td class="command"><code>qqqbot 机器人数据 [天数]</code></td>
<td>查看机器人近日数据</td>
<td><code>qqqbot 机器人数据</code> 或 <code>qqqbot 机器人数据 3</code> (返回最近3天数据)</td>
</tr>
<tr>
<td class="command"><code>qqqbot 查看通知 [数量]</code></td>
<td>查看 QQ 开放平台站内通知信</td>
<td><code>qqqbot 查看通知</code> 或 <code>qqqbot 查看通知 5</code> (返回最近5条通知)</td>
</tr>
<tr>
<td class="command"><code>qqqbot 登录</code></td>
<td>登录 QQ 开放平台后台，用于后续数据查看功能。</td>
<td><code>qqqbot 登录</code> 或 <code>qqqbot.登录</code></td>
</tr>
</tbody>
</table>

<p><strong>注意：</strong>  请使用完整的指令形式，例如 <code>qqqbot.登录</code> 或 <code>qqqbot 机器人数据</code> 等来调用插件功能。</p>

---

<h2>服务依赖</h2>

<p>本插件依赖以下 Koishi 服务：</p>

<table class="dependency-table">
<thead>
<tr>
<th>服务类型</th>
<th>服务名称</th>
<th>说明</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>必须服务：</strong></td>
<td><code>i18n</code></td>
<td>Koishi 的国际化服务，用于插件文本的本地化支持。</td>
</tr>
<tr>
<td><strong>可选服务：</strong></td>
<td><code>qrcode</code></td>
<td>二维码服务。 <strong>如果需要使用二维码方式显示登录链接， <br>则必须安装并启用 <code>koishi-plugin-qrcode-service-null</code> 插件。<br></strong>  如果未安装或未启用，插件将默认使用文本链接形式提供登录地址。</td>
</tr>
</tbody>
</table>

---

<h2>功能特性</h2>

<ul class="feature-list">
<li><strong>登录 QQ 开放平台后台：</strong>  通过指令获取登录链接或二维码，用户使用手机 QQ 扫码或点击链接完成登录授权，插件将保存登录状态以便后续操作。</li>
<li><strong>查看站内信内容：</strong>  获取并显示 QQ 开放平台站内通知信，方便用户及时了解平台通知。可以指定查看最近的站内信数量。</li>
<li><strong>查看机器人近日数据：</strong>  获取并展示机器人的近日运营数据，包括消息量、用户数、留存率等关键指标。可以指定查看最近的天数。</li>
</ul>

---
`;
const logger = new Logger('qqq-bot-manager');

export const Config = Schema.intersect([
    Schema.object({
        commandName: Schema.string().default("qqqbot").description("父级指令的名称"),
        logincommandName: Schema.string().default("登录").description("`登录`的指令名称"),
        messagecommandName: Schema.string().default("查看通知").description("`查看站内通知信`的指令名称"),
        botdatacommandName: Schema.string().default("机器人数据").description("`查看机器人数据`的名称"),
        cancellogincommandName: Schema.string().default("取消登录").description("`取消登录`的指令名称"),
    }).description('基础设置'),

    Schema.object({
        onlysessiondirect: Schema.boolean().default(true).description("是否 仅允许私聊使用`登录指令`<br>因为涉及登录信息，私信可以确保数据不暴露给群友<br>请务必注意隐私安全！"),
        qrcodeservice: Schema.boolean().default(false).description("登录地址使用`文本链接` 还是`生成二维码`<br>默认使用文本链接。<br>如果使用二维码请确保`koishi-plugin-qrcode-service-null`插件已经安装并且开启"),
        expireTimeSec: Schema.number().default(180).description("登录链接的超时时间（秒）<br>`开放平台登录二维码默认是180秒失效，请勿随意改动。`"),
        resolvetime: Schema.number().default(3).description("登录状态轮询间隔时间（秒）"),
    }).description('进阶：登录设置'),

    Schema.object({
        isfigurebotdata: Schema.boolean().default(true).description("使用合并转发发送机器人数据，否则累加发送<br>`仅支持onebot适配器`").experimental(),
        botdatanumber: Schema.number().default(7).description("默认返回的最近几天的数据（天）"),
    }).description('进阶：机器人数据设置'),

    Schema.object({
        isfigureQQmessage: Schema.boolean().default(true).description("使用合并转发发送站内信，否则累加发送<br>`仅支持onebot适配器`").experimental(),
        QQmessagenumber: Schema.number().default(3).description("默认返回的站内信数量（条）"),
    }).description('进阶：站内信设置'),

    Schema.object({
        QQQ: Schema.boolean().default(true).description("启用域名大写 以绕过QQ的URL消息限制<br>关闭 则直接发送 原始链接。"),
        rawmarkdown: Schema.boolean().default(false).description("原生markdown回复"),
        consolelog: Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
    }).description('日志调试选项'),
])


// 存储登录信息的对象，使用 userId 作为 key
const loginStatus = {};

export function apply(ctx, config) {

    function logInfo(...args) {
        if (config.consolelog) {
            ctx.logger.info(...args);
        }
    }

    ctx.i18n.define("zh-CN",
        {
            commands: {
                [config.commandName]: {
                    description: `qqbot管理`,
                    messages: {}
                },
                [config.logincommandName]: {
                    description: `登录q.qq.com后台`,
                    messages: {
                        "loginplease": `请使用手机QQ 点击链接登录：（{0}秒后过期）\n{1}\n开始验证登录状态...\n如需取消登录请使用指令:\n ${config.commandName}.${config.cancellogincommandName}`,
                        "loginerror": "登录失败：{0}",
                        "logintimeout": "登录超时，请重新登录。",
                        "loginSuccess": "登录成功！\n请使用其他指令以查看后台数据。",
                        "loginSuccess2": "登录成功！\n请使用上方按钮 查看后台数据。",
                        "loginInProgress": "您已经有一个登录请求正在进行中，请稍后重试或使用 {0} 指令取消当前登录。",
                        "loginCancelled": "已取消当前登录请求。",
                    }
                },
                [config.cancellogincommandName]: {
                    description: `取消当前登录q.qq.com后台的操作`,
                },
                [config.messagecommandName]: {
                    description: `查看qqbot站内通知 [数量]`,
                    messages: {
                        "noLogin": "请先登录后再使用此功能。",
                        "fetchMessageError": "获取站内信失败: {0}",
                        "noMessages": "暂无站内信。",
                        "messageList": "站内信列表:\n{0}",
                        "messageItem": "站内信:\n  标题: {0}\n  时间: {1}\n  内容: {2}",
                    }
                },
                [config.botdatacommandName]: {
                    description: `查看qqbot数据 [天数]`,
                    messages: {
                        "noLogin": "请先登录后再使用此功能。",
                        "fetchDataError": "获取机器人数据失败: {0}",
                        "noData": "暂无数据。",
                        "dataDisplay": "机器人数据（{0}）:\n{1}",
                    }
                }
            }
        }
    );

    ctx.command(`${config.commandName}`)
        .action(async ({ session }) => {
            if (config.rawmarkdown) {
                await sendsomeMessage(
                    {
                        "msg_type": 2,
                        "msg_id": `${session.messageId}`,
                        // "event_id": "${INTERACTION_CREATE}",
                        "markdown": {
                            "content": "请使用手机QQ 点击 登录按钮："
                        },
                        "keyboard": {
                            "content": {
                                "rows": [
                                    {
                                        "buttons": [
                                            {
                                                "render_data": {
                                                    "label": `${config.logincommandName}`,
                                                    "style": 2
                                                },
                                                "action": {
                                                    "type": 2,
                                                    "permission": {
                                                        "type": 2
                                                    },
                                                    "data": `${config.commandName} ${config.logincommandName}`,
                                                    "enter": true
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        "buttons": [
                                            {
                                                "render_data": {
                                                    "label": `${config.botdatacommandName}`,
                                                    "style": 2
                                                },
                                                "action": {
                                                    "type": 2,
                                                    "permission": {
                                                        "type": 2
                                                    },
                                                    "data": `${config.commandName} ${config.botdatacommandName}`,
                                                    "enter": true
                                                }
                                            },
                                            {
                                                "render_data": {
                                                    "label": `${config.messagecommandName}`,
                                                    "style": 2
                                                },
                                                "action": {
                                                    "type": 2,
                                                    "permission": {
                                                        "type": 2
                                                    },
                                                    "data": `${config.commandName} ${config.messagecommandName}`,
                                                    "enter": true
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }, session)
            } else {
                await session.execute(`${config.commandName} -h`)
                return
            }
        })

    ctx.command(`${config.commandName}.${config.logincommandName}`)
        .action(async ({ session }) => {
            if (config.onlysessiondirect && !session.isDirect) {
                return '请在私聊中使用此指令';
            }
            const userId = session.userId;

            if (loginStatus[userId] && loginStatus[userId].loginTime) {
                if (!config.rawmarkdown) {
                    return session.text(`commands.${config.logincommandName}.messages.loginInProgress`, [config.commandName + " " + config.cancellogincommandName]);
                } else {
                    await sendsomeMessage(
                        {
                            "msg_type": 2,
                            "msg_id": `${session.messageId}`,
                            // "event_id": "${INTERACTION_CREATE}",
                            "markdown": {
                                "content": session.text(`commands.${config.logincommandName}.messages.loginInProgress`, [config.commandName + " " + config.cancellogincommandName])
                            },
                            "keyboard": {
                                "content": {
                                    "rows": [
                                        {
                                            "buttons": [
                                                {
                                                    "render_data": {
                                                        "label": `${config.cancellogincommandName}`,
                                                        "style": 2
                                                    },
                                                    "action": {
                                                        "type": 2,
                                                        "permission": {
                                                            "type": 2
                                                        },
                                                        "data": `${config.commandName} ${config.cancellogincommandName}`,
                                                        "enter": true
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }, session)
                    return
                }
            }

            loginStatus[userId] = { loginTime: Date.now() }; // 标记登录开始时间

            const getLoginUrl = "https://q.qq.com/qrcode/create";
            const postData = { "type": "777" };
            const headers = {
                'Content-Type': 'application/json',
            };

            try {
                logInfo(`[${userId}] 开始请求登录二维码`);
                const loginResponse = await fetchData(getLoginUrl, headers, postData, 'POST');
                if (loginResponse.data && loginResponse.data.QrCode) {
                    const qrcode = loginResponse.data.QrCode;
                    let loginUrl = `https://q.qq.com/login/applist?client=qq&code=${qrcode}&ticket=null`;
                    if (config.QQQ) {
                        loginUrl = loginUrl.replace("q.qq.com", "Q.QQ.COM"); // 应用域名大写转换
                    }
                    const expireTimeSec = config.expireTimeSec;
                    if (!config.qrcodeservice) {
                        if (!config.rawmarkdown) {
                            const loginpleasemessage = session.text(`commands.${config.logincommandName}.messages.loginplease`, [expireTimeSec, loginUrl])
                            await session.send(loginpleasemessage);
                        } else {
                            await sendsomeMessage(
                                {
                                    "msg_type": 2,
                                    "msg_id": `${session.messageId}`,
                                    // "event_id": "${INTERACTION_CREATE}",
                                    "markdown": {
                                        "content": "请使用手机QQ 点击 登录按钮：\n---\n登录完成后，请点击下方功能按钮以查询数。"
                                    },
                                    "keyboard": {
                                        "content": {
                                            "rows": [
                                                {
                                                    "buttons": [
                                                        {
                                                            "render_data": {
                                                                "label": "点击登录",
                                                                "style": 1
                                                            },
                                                            "action": {
                                                                "type": 0,
                                                                "permission": {
                                                                    "type": 2
                                                                },
                                                                "data": `${loginUrl}`,
                                                                "enter": true
                                                            }
                                                        },
                                                    ]
                                                },
                                                {
                                                    "buttons": [
                                                        {
                                                            "render_data": {
                                                                "label": `${config.cancellogincommandName}`,
                                                                "style": 2
                                                            },
                                                            "action": {
                                                                "type": 2,
                                                                "permission": {
                                                                    "type": 2
                                                                },
                                                                "data": `${config.commandName} ${config.cancellogincommandName}`,
                                                                "enter": true
                                                            }
                                                        }
                                                    ]
                                                },
                                                {
                                                    "buttons": [
                                                        {
                                                            "render_data": {
                                                                "label": `${config.botdatacommandName}`,
                                                                "style": 2
                                                            },
                                                            "action": {
                                                                "type": 2,
                                                                "permission": {
                                                                    "type": 2
                                                                },
                                                                "data": `${config.commandName} ${config.botdatacommandName}`,
                                                                "enter": true
                                                            }
                                                        },
                                                        {
                                                            "render_data": {
                                                                "label": `${config.messagecommandName}`,
                                                                "style": 2
                                                            },
                                                            "action": {
                                                                "type": 2,
                                                                "permission": {
                                                                    "type": 2
                                                                },
                                                                "data": `${config.commandName} ${config.messagecommandName}`,
                                                                "enter": true
                                                            }
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }, session)
                        }
                    } else {
                        const qrcodeimage = await ctx.qrcode.generateQRCode(loginUrl, 'Text')
                        const loginpleasemessage = h.text(session.text(`commands.${config.logincommandName}.messages.loginplease`, [expireTimeSec])) + qrcodeimage
                        await session.send(loginpleasemessage);
                    }
                    logInfo(`[${userId}] 已发送登录链接，等待用户扫码或点击登录，链接: ${loginUrl}`);

                    const startTime = Date.now();
                    const timeout = expireTimeSec * 1000;

                    // delay here
                    logInfo(`[${userId}] 等待 ${config.resolvetime} 秒后开始验证登录状态...`);
                    await new Promise(resolve => setTimeout(resolve, config.resolvetime * 1000)); // Wait for config.resolvetime seconds

                    const checkLoginStatus = async () => {
                        const verifyUrl = "https://q.qq.com/qrcode/get";
                        const verifyPostData = { "qrcode": qrcode };
                        try {
                            logInfo(`[${userId}] 正在验证登录状态...`);
                            const verifyResponse = await fetchData(verifyUrl, headers, verifyPostData, 'POST');
                            logInfo(`[${userId}] 登录验证 API 响应: ${JSON.stringify(verifyResponse)}`); // 调试日志，可以查看详细响应
                            logInfo("verifyResponse的内容是：");
                            logInfo(verifyResponse);

                            if (verifyResponse.code === 0 && verifyResponse.message === '授权成功' && verifyResponse.data && verifyResponse.data.data) {
                                const loginData = verifyResponse.data.data; // 直接使用 verifyResponse.data.data
                                logInfo("loginData的内容是：", loginData);
                                if (loginData.uin && loginData.developerId && loginData.ticket && loginData.appId) {
                                    loginStatus[userId] = {
                                        uin: loginData.uin,
                                        quid: loginData.developerId,
                                        ticket: loginData.ticket,
                                        appid: loginData.appId,
                                        loginTime: Date.now() // 保存登录成功时间
                                    };
                                    logInfo(`[${userId}] 登录成功，用户信息: uin=${loginData.uin}, quid=${loginData.developerId}`);
                                    return true; // 登录成功
                                } else {
                                    logInfo(`[${userId}] 登录成功，但是返回数据不完整: ${JSON.stringify(loginData)}`);
                                    return false; // 登录数据不完整，视为失败
                                }
                            }
                            if (verifyResponse.code !== -1) { //  `code: -1`  表示等待扫码,  其他code可能是失败或已扫码但未授权
                                logInfo(`[${userId}] 登录验证 API 返回非 -1 状态码: ${verifyResponse.code}, message: ${verifyResponse.message}`);
                                return false; // 登录失败或异常
                            }
                            return null; // 继续轮询 (code === -1, 等待扫码)
                        } catch (error) {
                            logger.error(`[${userId}] 登录验证过程中发生错误:`, error);
                            return false; // 登录失败
                        }
                    };

                    let loginResult = null;
                    while (Date.now() - startTime < timeout) {
                        if (!loginStatus[userId] || !loginStatus[userId].loginTime) { // 检查是否被取消登录
                            logInfo(`[${userId}] 登录已被取消`);
                            return; // 提前退出轮询
                        }
                        loginResult = await checkLoginStatus();
                        if (loginResult === true) {
                            if (!config.rawmarkdown) {
                                await session.send(session.text(`commands.${config.logincommandName}.messages.loginSuccess`));
                            } else {
                                /*await sendsomeMessage(
                                  {
                                    "msg_type": 2,
                                    "msg_id": `${session.messageId}`,
                                    // "event_id": "${INTERACTION_CREATE}",
                                    "markdown": {
                                      "content": "登录成功！\n请使用其他指令以查看后台数据。"
                                    },
                                    "keyboard": {
                                      "content": {
                                        "rows": [
                                          {
                                            "buttons": [
                                              {
                                                "render_data": {
                                                  "label": `${config.botdatacommandName}`,
                                                  "style": 2
                                                },
                                                "action": {
                                                  "type": 2,
                                                  "permission": {
                                                    "type": 2
                                                  },
                                                  "data": `${config.commandName} ${config.botdatacommandName}`,
                                                  "enter": true
                                                }
                                              },
                                              {
                                                "render_data": {
                                                  "label": `${config.messagecommandName}`,
                                                  "style": 2
                                                },
                                                "action": {
                                                  "type": 2,
                                                  "permission": {
                                                    "type": 2
                                                  },
                                                  "data": `${config.commandName} ${config.messagecommandName}`,
                                                  "enter": true
                                                }
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    }
                                  }, session)*/
                                /*这里这样回复markdown会导致{ response: { data: { message: '消息被去重，请检查请求msgseq', code: 40054005, err_code: 40054005, trace_id: '3c90532b4e79b552c5065d0ef901452a' }, url: 'https://api.sgroup.qq.com/v2/groups/A54255ACA3D13E2B36D0E4997A35466D/messages', status: 400, statusText: 'Bad Request', headers: Headers { date: 'Sat, 31 May 2025 19:32:50 GMT', 'content-type': 'application/json', 'content-length': '135', connection: 'keep-alive', 'x-tps-trace-id': '3c90532b4e79b552c5065d0ef901452a', server: 'TAPISIX/2.2.2', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,authorization' } }, code: undefined, [Symbol(cordis.http.error)]: true } */
                                await session.send(session.text(`commands.${config.logincommandName}.messages.loginSuccess2`));
                            }
                            return;
                        } else if (loginResult === false) {
                            await session.send(session.text(`commands.${config.logincommandName}.messages.loginerror`, ["验证失败，请重试"]));
                            logInfo(`[${userId}] 登录验证失败`);
                            delete loginStatus[userId]; // 移除登录状态
                            return;
                        }
                        await new Promise(resolve => setTimeout(resolve, config.resolvetime * 1000)); // 每3秒轮询一次
                    }

                    await session.send(session.text(`commands.${config.logincommandName}.messages.logintimeout`));
                    logInfo(`[${userId}] 登录超时`);
                    delete loginStatus[userId]; // 移除登录状态


                } else {
                    await session.send(session.text(`commands.${config.logincommandName}.messages.loginerror`, [loginResponse.message || "获取登录链接失败"]));
                    logger.error(`[${userId}] 获取登录二维码失败:`, loginResponse);
                    delete loginStatus[userId]; // 移除登录状态
                }

            } catch (error) {
                await session.send(session.text(`commands.${config.logincommandName}.messages.loginerror`, [error.message]));
                logger.error(`[${userId}] 登录过程中发生异常:`, error);
                delete loginStatus[userId]; // 移除登录状态
            } finally {
                if (loginStatus[userId] && !loginStatus[userId].uin) {
                    delete loginStatus[userId]; // 确保在任何情况下，失败或超时都清除 loginTime 如果没有成功设置 uin
                }
            }
        });

    ctx.command(`${config.commandName}.${config.cancellogincommandName}`) // 取消登录指令
        .action(async ({ session }) => {
            if (config.onlysessiondirect && !session.isDirect) {
                return '请在私聊中使用此指令';
            }
            const userId = session.userId;
            if (loginStatus[userId] && loginStatus[userId].loginTime) {
                delete loginStatus[userId]; // 清除登录状态，取消登录
                await session.send(session.text(`commands.${config.logincommandName}.messages.loginCancelled`));
                logInfo(`[${userId}] 用户取消了登录`);
            } else {
                await session.send("当前没有正在进行的登录请求。");
            }
        });


    ctx.command(`${config.commandName}.${config.messagecommandName} [innumber:number]`)
        .action(async ({ session }, innumber) => {
            if (config.onlysessiondirect && !session.isDirect) {
                return '请在私聊中使用此指令';
            }
            const userId = session.userId;
            const userLoginInfo = loginStatus[userId];

            if (!userLoginInfo || !userLoginInfo.uin) { // 检查 uin 确保登录成功
                if (!config.rawmarkdown) {
                    return session.text(`commands.${config.messagecommandName}.messages.noLogin`);
                } else {
                    await sendsomeMessage(
                        {
                            "msg_type": 2,
                            "msg_id": `${session.messageId}`,
                            // "event_id": "${INTERACTION_CREATE}",
                            "markdown": {
                                "content": "请使用手机QQ 点击 登录按钮："
                            },
                            "keyboard": {
                                "content": {
                                    "rows": [
                                        {
                                            "buttons": [
                                                {
                                                    "render_data": {
                                                        "label": `${config.logincommandName}`,
                                                        "style": 2
                                                    },
                                                    "action": {
                                                        "type": 2,
                                                        "permission": {
                                                            "type": 2
                                                        },
                                                        "data": `${config.commandName} ${config.logincommandName}`,
                                                        "enter": true
                                                    }
                                                }
                                            ]
                                        },
                                        {
                                            "buttons": [
                                                {
                                                    "render_data": {
                                                        "label": `${config.botdatacommandName}`,
                                                        "style": 2
                                                    },
                                                    "action": {
                                                        "type": 2,
                                                        "permission": {
                                                            "type": 2
                                                        },
                                                        "data": `${config.commandName} ${config.botdatacommandName}`,
                                                        "enter": true
                                                    }
                                                },
                                                {
                                                    "render_data": {
                                                        "label": `${config.messagecommandName}`,
                                                        "style": 2
                                                    },
                                                    "action": {
                                                        "type": 2,
                                                        "permission": {
                                                            "type": 2
                                                        },
                                                        "data": `${config.commandName} ${config.messagecommandName}`,
                                                        "enter": true
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }, session)
                    return
                }
            }

            const messageUrl = "https://q.qq.com/pb/AppFetchPrivateMsg";
            const headers = {
                'Content-Type': 'application/json',
                'Cookie': `quin=${userLoginInfo.uin}; quid=${userLoginInfo.quid}; qticket=${userLoginInfo.ticket}; developerId=${userLoginInfo.quid}`
            };
            const postData = {
                "page_num": 0,
                "page_size": 9999,
                "receiver": userLoginInfo.quid,
                "appType": 2
            };

            try {
                logInfo(`[${userId}] 开始获取站内信`);
                const messageResponse = await fetchData(messageUrl, headers, postData, 'POST');
                logInfo("站内信数据内容：", messageResponse);
                if (messageResponse.code === 0 && messageResponse.data && messageResponse.data.privateMsgs) {
                    const messages = messageResponse.data.privateMsgs;
                    if (messages.length > 0) {
                        const number = innumber || config.QQmessagenumber || 3; // 使用配置的默认值
                        const count = Math.min(number, messages.length);

                        let textContent = ''; // 存储累加的文本内容
                        let figureContent = h('figure'); // 存储合并转发的内容
                        const attrs = {
                            userId: session.userId,
                            nickname: session.author?.nickname || session.username,
                        };

                        for (let i = 0; i < count; i++) {
                            const msg = messages[i];
                            let contentText = session.text(`commands.${config.messagecommandName}.messages.messageItem`, [msg.title, new Date(parseInt(msg.send_time) * 1000).toLocaleString(), msg.content]);
                            if (config.QQQ) {
                                // 移除所有 URL
                                const urlRegex = /(https?:\/\/[^\s]+)/g; // 匹配 http 或 https 开头的 URL
                                contentText = contentText.replace(urlRegex, '');
                            }
                            if (config.isfigureQQmessage && session.platform === "onebot") {
                                figureContent.children.push(h('message', attrs, contentText));
                            } else {
                                textContent += contentText + '\n\n\n'; // 累加文本，添加换行符分隔
                            }
                        }

                        if (config.isfigureQQmessage && session.platform === "onebot") {
                            logInfo(`[${userId}] 使用合并转发发送站内信`);
                            await session.send(figureContent);
                        } else {
                            logInfo(`[${userId}] 使用累加拼接发送站内信`);
                            if (!config.rawmarkdown) {
                                await session.send(textContent.trim()); // 发送累加文本消息，去除尾部可能的换行符
                            } else {
                                await sendsomeMessage(
                                    {
                                        "msg_type": 2,
                                        "msg_id": `${session.messageId}`,
                                        // "event_id": "${INTERACTION_CREATE}",
                                        "markdown": {
                                            "content": `\`\`\`\n${textContent}\n\`\`\``
                                        },
                                        "keyboard": {
                                            "content": {
                                                "rows": [
                                                    {
                                                        "buttons": [
                                                            {
                                                                "render_data": {
                                                                    "label": `${config.botdatacommandName}`,
                                                                    "style": 2
                                                                },
                                                                "action": {
                                                                    "type": 2,
                                                                    "permission": {
                                                                        "type": 2
                                                                    },
                                                                    "data": `${config.commandName} ${config.botdatacommandName}`,
                                                                    "enter": true
                                                                }
                                                            },
                                                            {
                                                                "render_data": {
                                                                    "label": `${config.messagecommandName}`,
                                                                    "style": 2
                                                                },
                                                                "action": {
                                                                    "type": 2,
                                                                    "permission": {
                                                                        "type": 2
                                                                    },
                                                                    "data": `${config.commandName} ${config.messagecommandName}`,
                                                                    "enter": true
                                                                }
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    }, session)
                            }
                        }


                        logInfo(`[${userId}] 成功获取站内信，共 ${messages.length} 条，显示 ${count} 条`);
                    } else {
                        await session.send(session.text(`commands.${config.messagecommandName}.messages.noMessages`));
                        logInfo(`[${userId}] 暂无站内信`);
                    }
                } else {
                    await session.send(session.text(`commands.${config.messagecommandName}.messages.fetchMessageError`, [messageResponse.error || messageResponse.message || "未知错误"]));
                    logger.error(`[${userId}] 获取站内信 API 错误:`, messageResponse);
                }
            } catch (error) {
                await session.send(session.text(`commands.${config.messagecommandName}.messages.fetchMessageError`, [error.message]));
                logger.error(`[${userId}] 获取站内信过程中发生异常:`, error);
            }
        });


    ctx.command(`${config.commandName}.${config.botdatacommandName} [days:number]`)
        .action(async ({ session }, days) => {
            const userId = session.userId;
            const userLoginInfo = loginStatus[userId];

            if (!userLoginInfo || !userLoginInfo.uin) { // 检查 uin 确保登录成功
                return session.text(`commands.${config.botdatacommandName}.messages.noLogin`);
            }

            // 确定显示天数，优先级：指令参数 > 配置 > 默认值7天
            let displayDays = days || config.botdatanumber || 7;
            if (displayDays <= 0) displayDays = 1; // 至少查1天，防止错误
            if (displayDays > 30) displayDays = 30; // 限制最大显示天数

            const data_range = 2; // 强制请求30天数据
            const botDataUrl = `https://bot.q.qq.com/cgi-bin/datareport/read?bot_appid=${userLoginInfo.appid}&data_type=1&data_range=${data_range}&scene_id=1`;

            const headers = {
                'Content-Type': 'application/json',
                'Cookie': `quin=${userLoginInfo.uin}; quid=${userLoginInfo.quid}; qticket=${userLoginInfo.ticket}; developerId=${userLoginInfo.quid}`
            };

            try {
                logInfo(`[${userId}] 开始获取机器人数据，请求30天数据，显示天数: ${displayDays}`); // 使用 displayDays
                const dataResponse = await fetchData(botDataUrl, headers);
                logInfo(dataResponse)
                if (dataResponse.retcode === 0 && dataResponse.data && dataResponse.data.msg_data && dataResponse.data.msg_data.length > 0) {
                    const msgData = dataResponse.data.msg_data; // 获取30天数据
                    if (msgData.length === 0) {
                        return session.text(`commands.${config.botdatacommandName}.messages.noData`);
                    }

                    let textContent = ''; // 存储累加的文本内容
                    let figureContent = h('figure'); // 存储合并转发的内容
                    const attrs = {
                        userId: session.userId,
                        nickname: session.author?.nickname || session.username,
                    };

                    // 计算平均数据
                    const actualDisplayDays = Math.min(displayDays, msgData.length);
                    const dataToCalculate = msgData.slice(0, actualDisplayDays);

                    let totalUpMsgCnt = 0;
                    let totalUpMsgUv = 0;
                    let totalDownMsgCnt = 0;
                    let totalDownPassiveMsgCnt = 0;
                    let totalDownInitiativeMsgCnt = 0;
                    let totalInlineMsgCnt = 0;
                    let totalBotMsgCnt = 0;
                    let totalRetention = 0;
                    let retentionCount = 0;

                    dataToCalculate.forEach(botData => {
                        totalUpMsgCnt += parseInt(botData['up_msg_cnt']) || 0;
                        totalUpMsgUv += parseInt(botData['up_msg_uv']) || 0;
                        totalDownMsgCnt += parseInt(botData['down_msg_cnt']) || 0;
                        totalDownPassiveMsgCnt += parseInt(botData['down_passive_msg_cnt']) || 0;
                        totalDownInitiativeMsgCnt += parseInt(botData['down_initiative_msg_cnt']) || 0;
                        totalInlineMsgCnt += parseInt(botData['inline_msg_cnt']) || 0;
                        totalBotMsgCnt += parseInt(botData['bot_msg_cnt']) || 0;

                        if (botData['next_day_retention'] !== undefined && botData['next_day_retention'] !== 0 && botData['next_day_retention'] !== '-') {
                            totalRetention += parseFloat(botData['next_day_retention']) || 0;
                            retentionCount++;
                        }
                    });

                    const avgUpMsgCnt = Math.round(totalUpMsgCnt / actualDisplayDays);
                    const avgUpMsgUv = Math.round(totalUpMsgUv / actualDisplayDays);
                    const avgDownMsgCnt = Math.round(totalDownMsgCnt / actualDisplayDays);
                    const avgDownPassiveMsgCnt = Math.round(totalDownPassiveMsgCnt / actualDisplayDays);
                    const avgDownInitiativeMsgCnt = Math.round(totalDownInitiativeMsgCnt / actualDisplayDays);
                    const avgInlineMsgCnt = Math.round(totalInlineMsgCnt / actualDisplayDays);
                    const avgBotMsgCnt = Math.round(totalBotMsgCnt / actualDisplayDays);
                    const avgRetention = retentionCount > 0 ? (totalRetention / retentionCount).toFixed(8) : '-';

                    const firstDate = dataToCalculate[actualDisplayDays - 1]['report_date'];
                    const lastDate = dataToCalculate[0]['report_date'];
                    const sceneName = dataToCalculate[0]['scene_name'] || '全部';

                    // 生成平均数据内容
                    const avgData = [
                        `报告日期: ${firstDate} - ${lastDate}`,
                        `平均上行消息量: ${avgUpMsgCnt}`,
                        `平均上行消息人数: ${avgUpMsgUv}`,
                        `平均下行消息量: ${avgDownMsgCnt}`,
                        `平均被动消息数: ${avgDownPassiveMsgCnt}`,
                        `平均主动消息数: ${avgDownInitiativeMsgCnt}`,
                        `平均内联消息数: ${avgInlineMsgCnt}`,
                        `平均总消息量: ${avgBotMsgCnt}`,
                        `平均对话用户次日留存: ${avgRetention}`,
                        `场景名称: ${sceneName}`,
                    ].join('\n');
                    const avgContent = session.text(`commands.${config.botdatacommandName}.messages.dataDisplay`, ['以下平均数据', avgData]);

                    // 先添加平均数据
                    if (config.isfigurebotdata && session.platform === "onebot") {
                        figureContent.children.push(h('message', attrs, avgContent));
                    } else {
                        textContent += avgContent + '\n\n\n';
                    }

                    // 然后添加每日数据
                    for (let i = 0; i < actualDisplayDays; i++) {
                        const botData = msgData[i];
                        const dailyData = [
                            `报告日期: ${botData['report_date']}`,
                            `上行消息量: ${botData['up_msg_cnt']}`,
                            `上行消息人数: ${botData['up_msg_uv']}`,
                            `下行消息量: ${botData['down_msg_cnt']}`,
                            `被动消息数: ${botData['down_passive_msg_cnt']}`,
                            `主动消息数: ${botData['down_initiative_msg_cnt']}`,
                            `内联消息数: ${botData['inline_msg_cnt']}`,
                            `总消息量: ${botData['bot_msg_cnt']}`,
                            `对话用户次日留存: ${botData['next_day_retention'] !== undefined && botData['next_day_retention'] !== 0 ? botData['next_day_retention'] : '-'}`,
                            `场景名称: ${botData['scene_name']}`,
                        ].join('\n');
                        const content = session.text(`commands.${config.botdatacommandName}.messages.dataDisplay`, [`${botData['report_date']}`, dailyData]);

                        if (config.isfigurebotdata && session.platform === "onebot") {
                            figureContent.children.push(h('message', attrs, content))
                        } else {
                            textContent += content + '\n\n\n'; // 累加文本，添加换行符分隔
                        }
                    }

                    if (config.isfigurebotdata && session.platform === "onebot") {
                        logInfo(`[${userId}] 使用合并转发发送机器人数据`);
                        await session.send(figureContent); // 一次性发送合并转发消息
                    } else {
                        logInfo(`[${userId}] 发送累加文本机器人数据`);
                        if (!config.rawmarkdown) {
                            await session.send(textContent.trim()); // 一次性发送累加文本消息，去除尾部可能的换行符
                        } else {
                            await sendsomeMessage(
                                {
                                    "msg_type": 2,
                                    "msg_id": `${session.messageId}`,
                                    // "event_id": "${INTERACTION_CREATE}",
                                    "markdown": {
                                        "content": `\`\`\`\n${textContent}\n\`\`\``
                                    },
                                    "keyboard": {
                                        "content": {
                                            "rows": [
                                                {
                                                    "buttons": [
                                                        {
                                                            "render_data": {
                                                                "label": `${config.botdatacommandName}`,
                                                                "style": 2
                                                            },
                                                            "action": {
                                                                "type": 2,
                                                                "permission": {
                                                                    "type": 2
                                                                },
                                                                "data": `${config.commandName} ${config.botdatacommandName}`,
                                                                "enter": true
                                                            }
                                                        },
                                                        {
                                                            "render_data": {
                                                                "label": `${config.messagecommandName}`,
                                                                "style": 2
                                                            },
                                                            "action": {
                                                                "type": 2,
                                                                "permission": {
                                                                    "type": 2
                                                                },
                                                                "data": `${config.commandName} ${config.messagecommandName}`,
                                                                "enter": true
                                                            }
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }, session)
                        }

                    }


                    logInfo(`[${userId}] 成功获取机器人数据，共30天数据，显示 ${displayDays} 天`);

                } else {
                    await session.send(session.text(`commands.${config.botdatacommandName}.messages.fetchDataError`, [dataResponse.msg || "未知错误"]));
                    logger.error(`[${userId}] 获取机器人数据 API 错误:`, dataResponse);
                }


            } catch (error) {
                await session.send(session.text(`commands.${config.botdatacommandName}.messages.fetchDataError`, [error.message]));
                logger.error(`[${userId}] 获取机器人数据过程中发生异常:`, error);
            }

        });


    async function fetchData(url, headers = {}, postData = null, method = 'GET') {
        const options: RequestInit = {
            method: method,
            headers: headers,
        };
        if (postData) {
            options.body = JSON.stringify(postData);
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            const message = `HTTP error! status: ${response.status}`;
            logger.error(message);
            throw new Error(message);
        }
        return await response.json();
    }
    async function sendsomeMessage(message, session) {
        try {
            const { guild, user } = session.event;
            const { qq, qqguild, channelId } = session;
            if (guild?.id) {
                if (qq) {
                    await qq.sendMessage(channelId, message);
                } else if (qqguild) {
                    await qqguild.sendMessage(channelId, message);
                }
            } else if (user?.id && qq) {
                await qq.sendPrivateMessage(user.id, message);
            }
        } catch (error) {
            ctx.logger.error(`发送markdown消息时出错:`, error);
        }
    }
}
