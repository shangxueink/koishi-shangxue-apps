"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");
exports.reusable = true; // 声明此插件可重用
exports.name = "automation-console";
exports.inject = {
    required: ['puppeteer']
};
exports.usage = `
<p><strong>Automation Console</strong> 是一个 Koishi 插件，

用于通过指令来自动化操作 Koishi 的 Web 控制台界面。

通过此插件，用户可以启动、控制、截图和管理控制台页面。</p>

<h2>功能列表</h2>

<ul>
<li>启动和登录控制台页面</li>
<li>控制台页面截图功能</li>
<li>关闭控制台页面</li>
<li>重启 Koishi 控制台</li>
<li>插件配置和管理功能</li>
<li>刷新插件市场</li>
<li>更新依赖管理</li>
<li>查看日志截图</li>
</ul>

<h2>使用说明</h2>

<p>该插件主要通过指令来控制 Koishi 的 Web UI 界面，具体使用步骤如下：</p>

<ol>
<li>使用 <code>打开UI控制</code> 打开并登录控制台页面。</li>
<li>使用 <code>查看UI控制</code> 查看页面截图，确保操作完成。</li>
<li>可根据需要使用其他指令如 <code>配置插件</code>、<code>刷新插件市场</code>、<code>查看日志</code> 等操作。</li>
<li>完成操作后，可使用 <code>退出UI控制</code> 关闭控制台页面。</li>
</ol>

<h2>注意事项</h2>

<ul>
<li>确保 <code>puppeteer</code> 已正确配置并可用。</li>
<li>当 <code>enable_auth</code> 配置为 <code>true</code> 时，请确保用户名和密码正确。</li>
<li>使用指令前请确认权限等级 与<code>command_authority</code>是否匹配。</li>
</ul>

<h2>日志调试</h2>

<p>启用 <code>loggerinfo</code> 配置项后，插件将会记录调试日志，帮助排查问题。</p>


`;
const defaulttable2 = [
    {
        "command": "automation-console",
        "commandname": "automation-console",
        "command_authority": 1
    },
    {
        "command": "打开UI控制",
        "commandname": "打开UI控制"
    },
    {
        "command": "查看UI控制",
        "commandname": "查看UI控制"
    },
    {
        "command": "退出UI控制",
        "commandname": "退出UI控制"
    },
    {
        "command": "软重启",
        "commandname": "软重启"
    },
    {
        "command": "配置插件",
        "commandname": "配置插件"
    },
    {
        "command": "刷新插件市场",
        "commandname": "刷新插件市场",
        "command_authority": 1
    },
    {
        "command": "小火箭更新依赖",
        "commandname": "小火箭更新依赖"
    },
    {
        "command": "查看日志",
        "commandname": "查看日志",
        "command_authority": 3
    }
]
exports.Config = Schema.intersect([
    Schema.object({
        link: Schema.string().role('link').default('http://127.0.0.1:5140').description("需要控制的koishi控制台地址<br>必须可用访问哦，预期的地址是koishi的【欢迎】页面"),
        command_authority: Schema.number().default(4).description('允许使用指令的权限等级').experimental(),
        table2: Schema.array(Schema.object({
            command: Schema.string().description("备注指令").disabled(),
            commandname: Schema.string().description("实际注册的指令名称"),
            command_authority: Schema.number().default(4).description('允许使用指令的权限等级').experimental(),
        })).role('table').default(defaulttable2),
    }).description('基础设置'),

    Schema.object({
        enable_auth: Schema.boolean().description("是否开启了auth插件").default(false),
        text: Schema.string().default("admin").description("auth插件的用户名"),
        secret: Schema.string().role('secret').default('password').description("auth插件的登录密码"),
    }).description('auth登录设置'),


    Schema.object({
        auto_execute: Schema.boolean().default(false).description("开启后，在【UI控制台未打开】时，自动执行【打开UI控制】").experimental(),
        wait_for_prompt: Schema.number().default(30).description("等待用户输入内容的超时时间（单位：秒）"), // await session.prompt(config.wait_for_prompt * 1000);
    }).description('进阶设置'),

    Schema.object({
        maxlist: Schema.number().default(5).description("【找到多个匹配的插件】时，返回的最大数量"),
    }).description('【插件配置】相关指令设置'),

    Schema.object({
        resolvetimeout: Schema.number().default(10).description("【刷新】依赖后需要等待的时间（单位：秒）"),
    }).description('【依赖管理】相关指令设置'),

    Schema.object({
        loggerinfo: Schema.boolean().default(false).description("日志调试模式").experimental(),
    }).description('调试设置'),
]);

async function apply(ctx, config) {
    let page;

    const log = (message) => {
        if (config.loggerinfo) {
            ctx.logger.info(message);
        }
    };
    async function ensureUIControl(page, config, session) {
        if (!page) {
            if (config.auto_execute) {
                await session.execute("打开UI控制");
                //await new Promise(resolve => setTimeout(resolve, 1500));// 停顿 1.5 秒 // 因为 这个指令执行需要截图 可能反应不过来 // 好像也不需要
            } else {
                await session.send("UI控制台未打开，请先使用【打开UI控制】指令。");
                return false;
            }
        }
        return true;
    }
    function getCommandName(command) {
        const entry = config.table2.find(item => item.command === command);
        return entry ? entry.commandname : null;
    }

    function getCommandAuthority(command) {
        const entry = config.table2.find(item => item.command === command);
        return entry ? entry.command_authority : null;
    }
    ctx.command(`${getCommandName("automation-console")}`, "通过指令操作控制台")
    // 打开UI控制 打开puppeteer
    ctx.command(`automation-console/${getCommandName("打开UI控制")}`, "打开UI控制台", { authority: getCommandAuthority("打开UI控制") })
        .action(async ({ session }) => {
            if (page) {
                await session.send("你已经打开了UI控制页面，请勿重复打开。若要退出，请发送【退出UI控制】");
                return;
            }

            try {
                page = await ctx.puppeteer.page();
                await page.goto(config.link, { waitUntil: 'networkidle2' });

                if (config.enable_auth) {
                    const isLoggedIn = await page.evaluate(() => {
                        return !!document.querySelector('a[href^="/logs"]'); // 匹配所有以 /logs 开头的链接
                    });

                    if (!isLoggedIn) {
                        await page.click('a[href^="/login"]');   // 匹配所有以 /login 开头的链接
                        await page.evaluate(() => {
                            document.querySelector('input[placeholder="用户名"]').value = '';
                            document.querySelector('input[placeholder="密码"]').value = '';
                        });

                        await page.type('input[placeholder="用户名"]', config.text);
                        await page.type('input[placeholder="密码"]', config.secret);

                        await page.evaluate(() => {
                            document.querySelectorAll('button.k-button.primary')[1].click();
                        });

                        await page.waitForSelector('a[href^="/logs"]');  // 匹配所有以 /logs 开头的链接
                    }
                }
                await page.click('a[href="/"]');
                await session.execute("查看UI控制");
                await session.send("UI控制台已打开并登录。");
            } catch (error) {
                ctx.logger.error('打开UI控制台时出错:', error);
                await session.send("打开UI控制台时出错，请重试。");
            }
        });

    // 查看UI控制  就是截图啦~
    ctx.command(`automation-console/${getCommandName("查看UI控制")}`, "查看UI控制台当前页面", { authority: getCommandAuthority("查看UI控制") })
        .action(async ({ session }) => {
            if (!await ensureUIControl(page, config, session)) return; // 打开UI控制
            try {
                const screenshot = await page.screenshot();
                await session.send(h.image("data:image/jpeg;base64," + screenshot.toString('base64')));
            } catch (error) {
                ctx.logger.error('查看UI控制台时出错:', error);
                await session.send("查看UI控制台时出错，请重试。");
            }
        });

    // 退出UI控制 关闭puppeteer
    ctx.command(`automation-console/${getCommandName("退出UI控制")}`, "关闭UI控制台", { authority: getCommandAuthority("退出UI控制") })
        .action(async ({ session }) => {
            if (!await ensureUIControl(page, config, session)) return; // 打开UI控制

            try {
                await page.close();
                page = null;
                await session.send("UI控制台已关闭。");
            } catch (error) {
                ctx.logger.error('关闭UI控制台时出错:', error);
                await session.send("关闭UI控制台时出错，请重试。");
            }
        });

    // 软重启Koishi 并且 关闭puppeteer
    ctx.command(`automation-console/${getCommandName("软重启")}`, "重启Koishi控制台", { authority: getCommandAuthority("软重启") })
        .action(async ({ session }) => {
            if (!await ensureUIControl(page, config, session)) return; // 打开UI控制

            try {
                await page.click('a[href^="/plugins/"]');// 匹配所有以 /plugins/ 开头的链接

                // 点击【全局设置】
                await page.waitForSelector('.item .label[title="全局设置"]');
                await page.click('.item .label[title="全局设置"]');

                // 提示重启
                await session.send("正在【退出UI控制】并且【重启Koishi】...");

                // 点击重载按钮
                await page.evaluate(() => {
                    const buttons = document.querySelectorAll('.right .menu-item:not(.disabled)');
                    if (buttons.length >= 3) {
                        buttons[0].click(); // 点击第一个可用按钮【重载插件】
                    }
                });

                // 重启后关闭页面实例
                await page.close();
                page = null;
            } catch (error) {
                ctx.logger.error('重启Koishi时出错:', error);
                await session.send("重启Koishi时出错，请重试。");
            }
        });

    //配置插件
    ctx.command(`automation-console/${getCommandName("配置插件")} [commandname]`, "搜索插件", { authority: getCommandAuthority("配置插件") })
        .action(async ({ session }, commandname) => {
            if (!await ensureUIControl(page, config, session)) return; // 打开UI控制
            try {
                // 进入插件页面
                await page.click('a[href^="/plugins/"]'); // 匹配所有以 /plugins/ 开头的链接

                // 获取所有插件的名称
                const plugins = await page.evaluate(() => {
                    const elements = document.querySelectorAll('.label[title]');
                    return Array.from(elements).map(el => el.getAttribute('title'));
                });

                let keyword;
                // 如果没有提供插件名称关键词，则请求用户输入
                if (!commandname) {
                    await session.send("请输入要操作的插件关键词：");
                    keyword = await session.prompt(config.wait_for_prompt * 1000);
                } else {
                    keyword = commandname;
                }
                log(keyword);

                // 找到匹配的插件
                const matches = plugins.filter(name => name.includes(keyword));
                if (matches.length === 0) {
                    await session.send("没有找到匹配的插件。");
                    return;
                }

                // 使用配置项限制返回的插件数量
                const limitedMatches = matches.slice(0, config.maxlist);

                // 列出匹配的插件
                let message = "找到多个匹配的插件，请选择：\n";
                limitedMatches.forEach((name, index) => {
                    message += `${index + 1}. ${name}\n`;
                });
                await session.send(message);

                // 接收用户选择
                const choice = parseInt(await session.prompt(config.wait_for_prompt * 1000), 10);
                if (isNaN(choice) || choice < 1 || choice > limitedMatches.length) {
                    await session.send("无效的选择。");
                    return;
                }

                const selectedPlugin = limitedMatches[choice - 1];

                // 操作插件
                await page.click(`.label[title="${selectedPlugin}"]`);
                await session.execute("查看UI控制"); // 反馈状态

                // 检查可用按钮数量
                const buttonCount = await page.evaluate(() => {
                    return document.querySelectorAll('.right .menu-item:not(.disabled)').length;
                });

                if (buttonCount < 6) {
                    await session.send("可用按钮不足6个，非普通插件，请前往控制台操作！");
                    return;
                }

                await session.send("请选择操作的按钮序号：\n1.【启用插件/停用插件】\n2.【保存配置/重载配置】\n3.【重命名】\n4.【移除插件】\n5.【克隆配置】");

                // 接收用户选择的操作序号
                const operation = parseInt(await session.prompt(config.wait_for_prompt * 1000), 10);
                if (isNaN(operation) || operation < 1 || operation > 5) {
                    await session.send("无法操作此插件。");
                    return;
                }

                if ([1, 2, 5].includes(operation)) {
                    // 执行简单操作
                    await page.evaluate((operation) => {
                        const buttons = document.querySelectorAll('.right .menu-item:not(.disabled)');
                        buttons[operation - 1].click();
                    }, operation);

                    await session.send("操作已完成。");
                    await session.execute("查看UI控制"); // 反馈状态
                    return;
                } else if (operation === 3) {
                    // 重命名
                    await page.evaluate(() => {
                        const buttons = document.querySelectorAll('.right .menu-item:not(.disabled)');
                        buttons[2].click(); // 点击重命名
                    });

                    await session.send("请发送重命名的插件名称：");
                    const newName = await session.prompt(config.wait_for_prompt * 1000);

                    await page.evaluate((newName) => {
                        const input = document.querySelector('.el-dialog .el-input__inner');
                        input.value = newName;
                        const event = new Event('input', { bubbles: true });
                        input.dispatchEvent(event);
                        const confirmButton = document.querySelector('.el-dialog__footer .el-button--primary');
                        confirmButton.click();
                    }, newName);

                    await session.send("重命名操作已完成。");
                    await session.execute("查看UI控制"); // 反馈状态
                    return;
                } else if (operation === 4) {
                    // 移除插件
                    await page.evaluate(() => {
                        const buttons = document.querySelectorAll('.right .menu-item:not(.disabled)');
                        buttons[3].click(); // 点击移除插件
                    });

                    await page.evaluate(() => {
                        const confirmButton = document.querySelector('.el-dialog__footer .el-button--danger');
                        confirmButton.click();
                    });

                    await session.send("移除插件操作已完成。");
                    await session.execute("查看UI控制"); // 反馈状态
                    return;
                }

            } catch (error) {
                ctx.logger.error('操作插件时出错:', error);
                await session.send("操作插件时出错，请重试。");
            }
        });

    // 刷新插件市场
    ctx.command(`automation-console/${getCommandName("刷新插件市场")}`, "刷新插件市场", { authority: getCommandAuthority("刷新插件市场") })
        .action(async ({ session }) => {
            if (!await ensureUIControl(page, config, session)) return; // 打开UI控制

            try {
                // 切换到 /market 页面
                await page.click('a[href^="/market"]');

                // 在页面上下文中执行脚本，查找并点击按钮
                await page.evaluate(() => {
                    const buttons = document.querySelectorAll('.right .menu-item');
                    if (buttons && buttons.length > 1) {
                        buttons[1].click(); // 点击第二个按钮（刷新按钮）
                    } else {
                        throw new Error("未找到刷新按钮");
                    }
                });

                // 反馈状态
                //await session.execute("查看UI控制"); // 无需了 因为插件市场更新内容不会立即显示出来
                await session.send("插件市场已点击刷新按钮");
            } catch (error) {
                ctx.logger.error("刷新插件市场时出错:", error);
                await session.send("刷新插件市场失败，请重试。");
            }
        });

    //小火箭更新
    ctx.command(`automation-console/${getCommandName("小火箭更新依赖")}`, "小火箭更新", { authority: getCommandAuthority("小火箭更新依赖") })
        .action(async ({ session }) => {
            if (!await ensureUIControl(page, config, session)) return; // 打开UI控制

            try {
                // 切换到 /dependencies 页面
                await page.click('a[href^="/dependencies"]');

                // 在页面上下文中执行脚本，查找按钮
                const canUpdate = await page.evaluate(() => {
                    const buttons = document.querySelectorAll('.right .menu-item');
                    const updateButton = buttons[0]; // 假设第一个是【全部更新】按钮
                    const refreshButton = buttons[3]; // 假设第四个是【刷新】按钮

                    if (!updateButton || updateButton.classList.contains('disabled')) {
                        return false; // 【全部更新】按钮不可按
                    }

                    refreshButton.click(); // 点击【刷新】按钮
                    return true; // 【全部更新】按钮可用
                });

                if (!canUpdate) {
                    await session.send("当前已经全部是最新依赖了，无需更新");
                    return;
                }

                // 等待3秒
                await new Promise(resolve => setTimeout(resolve, config.resolvetimeout * 1000));

                // 点击【全部更新】按钮
                await page.evaluate(() => {
                    const buttons = document.querySelectorAll('.right .menu-item');
                    const updateButton = buttons[0];
                    updateButton.click();
                });

                // 点击【应用更改】按钮
                await page.evaluate(() => {
                    const buttons = document.querySelectorAll('.right .menu-item');
                    const applyChangesButton = buttons[1]; // 假设第二个是【应用更改】按钮
                    applyChangesButton.click();
                });

                // 等待确认安装弹窗并点击【确认安装】
                await page.waitForSelector('.el-button--primary', { visible: true });
                await page.evaluate(() => {
                    const confirmButton = document.querySelector('.el-button--primary');
                    confirmButton.click();
                });

                await session.send("已确认安装");
            } catch (error) {
                ctx.logger.error("小火箭更新依赖时出错:", error);
                await session.send("更新依赖失败，请重试。");
            }
        });

    // 查看日志
    ctx.command(`automation-console/${getCommandName("查看日志")}`, "查看日志截图", { authority: getCommandAuthority("查看日志") })
        .action(async ({ session }) => {
            if (!await ensureUIControl(page, config, session)) return; // 打开UI控制
            // 切换到 /logs 页面
            await page.click('a[href^="/logs"]');
            // 反馈状态
            await session.execute("查看UI控制");
        });



}

exports.apply = apply;
