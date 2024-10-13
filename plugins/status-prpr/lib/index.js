"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.logger = exports.Config = exports.name = void 0;
const koishi_1 = require("koishi");

//const utils_1 = require("./utils");
const os_1 = require("os");
const si = require("systeminformation");
const ErrorInfo = "N / A";
const url_1 = require("node:url");
const fs = require('node:fs');
const path_1 = require("node:path");

exports.name = 'status-prpr';
exports.inject = {
    required: ['puppeteer'],
  };
exports.Config = 
koishi_1.Schema.intersect([  

koishi_1.Schema.object({  
    command: koishi_1.Schema.string().default('prprstatus').description("指令自定义"),
    authority: koishi_1.Schema.number().default(1).description("指令权限设置"),

    botName: koishi_1.Schema.string().default('Bot of Koishi').description("机器人名称"),

    BackgroundURL: koishi_1.Schema.array(String).description("背景图片，可以写`txt路径（网络图片URL写进txt里）` 或者 `文件夹路径` 或者 `网络图片URL` ").role('table')
    .default([
        path_1.join(__dirname, '/htmlmaterial/白圣女.txt'),
        path_1.join(__dirname, '/htmlmaterial/ba.txt'),
    
    ]),
}),

koishi_1.Schema.object({
    HTML_setting: koishi_1.Schema.object({
        botNameColorful: koishi_1.Schema.boolean().description("`开启后`机器人名称使用彩虹色").default(false),
        botNameColor: koishi_1.Schema.string().default("rgba(85,70,163,0.8)").role('color').description('自定义机器人名称的颜色'),


        botProfileblurs: koishi_1.Schema.number().role('slider').min(0).max(1).step(0.1).default(0.8).description('机器人头像透明度` 1 为不透明 `'),
        logoblurs: koishi_1.Schema.number().role('slider').min(0).max(1).step(0.1).default(0.5).description('Koishi LOGO透明度` 1 为不透明 `'),
        
        Backgroundblurs: koishi_1.Schema.number().role('slider').min(0).max(100).step(1).default(15).description('背景模糊半径'),  
        Backgroundcolor: koishi_1.Schema.string().default("rgba(230, 215, 235, 0.692)").role('color').description('背景模糊色'),
    
        dashboardTextColor1: koishi_1.Schema.string().default("rgba(29,131,190,1)").role('color').description('`性能面板`元素1`CPU`的颜色'),
        dashboardTextColor2: koishi_1.Schema.string().default("rgba(149,40,180,1)").role('color').description('`性能面板`元素2`RAM`的颜色'),
        dashboardTextColor3: koishi_1.Schema.string().default("rgba(77,166,12,1)").role('color').description('`性能面板`元素3`SWAP`的颜色'),
        dashboardTextColor4: koishi_1.Schema.string().default("rgba(56,91,119,1)").role('color').description('`性能面板`元素4`DISK`的颜色'),    
        //const dashboardColor = ["#1d83be", "#9528b4", "#4da60c", "#385b77"];      //HTML默认面板元素颜色
    
        systeminformationTextColor: koishi_1.Schema.string().default("rgba(25,99,160,1)").role('color').description('`系统信息面板`的文字颜色'),
        // 默认color: #1963a0; /*系统信息的颜色*/

        DashedboxThickn: koishi_1.Schema.number().role('slider').min(0).max(20).step(1).default(3).description('`虚线框`的粗细'),  
        Dashedboxcolor:  koishi_1.Schema.string().default("rgba(183,168,158,1)").role('color').description('`虚线框`的颜色'),        

        textfont1: koishi_1.Schema.string().description("系统面板信息的文字字体`请填写.ttf 字体文件的绝对路径`").default(path_1.join(__dirname, '/font/Gugi-Regular.ttf')).role('table'),
        textfont2: koishi_1.Schema.string().description("机器人信息的文字字体`请填写.ttf 字体文件的绝对路径`").default(path_1.join(__dirname, '/font/HachiMaruPop-Regular.ttf')).role('table'),
    
    }).collapse().description('可自定义各种颜色搭配和字体'),
}).description('面板元素调节'),

koishi_1.Schema.object({  
    consoleinfo: koishi_1.Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
}).description('日志调试输出'), 

])

exports.logger = new koishi_1.Logger("status-prpr");

function apply(ctx, config) {

    ctx.command(config.command || "自检", "检查机器人状态", { authority: config.authority || 1 })
        .action(async ({ session }) => {

        const systemInfo =  await getSystemInfo(ctx.registry.size);

        let page;
        try {

            page = await ctx.puppeteer.page();
            await page.setViewport({ width: 1920 , height: 1080  });   

            const templatePath = path_1.resolve(__dirname, "./template.html");  
            const templateURL = url_1.pathToFileURL(templatePath).href;   

            let backgroundImage = getRandomBackground(config);            
            let BackgroundURL = backgroundImage.replace(/\\/g, '/');

            const dashboardColor = [
                rgbaToHex(config.HTML_setting.dashboardTextColor1),
                rgbaToHex(config.HTML_setting.dashboardTextColor2),
                rgbaToHex(config.HTML_setting.dashboardTextColor3),
                rgbaToHex(config.HTML_setting.dashboardTextColor4)
            ];


            const textfont1 = config.HTML_setting.textfont1.replace(/\\/g, '/');
            const textfont2 = config.HTML_setting.textfont2.replace(/\\/g, '/');

            let insertHTML = ` `;
            if (["onebot", "red", "satori"].includes(session.platform)) {
                const imagePath = path_1.resolve(__dirname, `htmlmaterial/${session.selfId}.jpg`);
                if (!fs.existsSync(imagePath)) {
                await downloadImage(`http://q1.qlogo.cn/g?b=qq&nk=${session.selfId}&s=100`, imagePath);   
                }

                insertHTML = `<img class="__title-image" src="./htmlmaterial/${session.selfId}.jpg" />`;
            }

            let Networkstatus = await getNetworkSpeed()

            let botnametitletext =`
#background-page .__title-text {
    font-family: "HachiMaruPop";
    font-size: 60px;
    line-height: 58px;
    /* 设置文字填充为透明 */
    color: transparent;
    /* 应用彩虹色渐变 */
    background: linear-gradient(to right, 
                                #fcb5b5, 
                                #fcd6ae, 
                                #fde8a6,
                                #c3f7b1, 
                                #aed6fa, 
                                #c4aff5, 
                                #f1afcc);
    /* 将背景裁切为文字形状 */
    -webkit-background-clip: text;
    /* 确保渐变仅填充文字 */
    background-clip: text;
    -webkit-text-stroke: 1px var(--main-color);
    margin-left: 18px; /* 在文本和图片之间添加一些间隔 */
    order: 1; /* 确保文本在图片后面显示 */
}
            `;
            if (!config.HTML_setting.botNameColorful) {
                botnametitletext =`
#background-page .__title-text {
    font-family: "HachiMaruPop";
    font-size: 50px;
    line-height: 58px;
    color: ${(config.HTML_setting.botNameColor)};
    -webkit-text-stroke: 1px var(--main-color);
    margin-left: 18px; /* 在文本和图片之间添加一些间隔 */
    order: 1; /* 确保文本在图片后面显示 */
}
                `;
            }
  
            

            let source = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
<style>
.circle-progress {
    --progress: 0;
    --color: black;
    position: relative; /* 使内部的圆可以相对定位 */
}
.circle-progress .circle-progress-bar {
    stroke-dasharray: 612.3, 612.3;
    stroke-dashoffset: calc(612.3 * (1 - var(--progress)));
    stroke: var(--color);
    stroke-linecap: round;
}

.circle-progress .circle-background {
    fill: none;
    stroke: #e4e2e163; /* 灰色作为背景 */
    stroke-width: 12; /* 笔触宽度与前景一致 */
}



@font-face {
    font-family: "HachiMaruPop";
    src: url("${textfont2}") format("truetype");
}
@font-face {
    font-family: "Gugi";
    src: url("${textfont1}") format("truetype");
}
* {
    margin: 0;
    padding: 0;
    border: 0;
}
:root {
    --main-color: #5546a3;
}

#background-page {
    width: 963px; /* 保持原有宽度 */
    height: 1872px; /* 保持原有高度 */
    background-image: url('${BackgroundURL}'); /* 图片 */
    background-size: 100% auto; /* 使图片宽度与容器宽度一致，高度自动调整 */
    background-repeat: no-repeat;  /*防止图片重复 */
    background-position: top center; /* 图片置顶对齐 */
    padding: 636px 64px 65px;
    box-sizing: border-box;
    position: relative; 
}
#background-page:before {
    content: "";
    position: absolute;
    top: 520px;
    left: 0;
    right: 0;
    bottom: 0;
    backdrop-filter: blur(${config.HTML_setting.Backgroundblurs}px); /* 设置模糊半径 */
    background: ${config.HTML_setting.Backgroundcolor}; /* 毛玻璃背景色 */ /*这个不错 202, 140, 221, 0.247*/
    z-index: 1;
    pointer-events: none;
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
    mask-image: linear-gradient(to bottom, transparent, black 8%, black 100%, transparent);
}
#background-page .__title {
    display: flex;
    flex-direction: row;
    align-items: center;/* 垂直居中对齐所有子元素 */
    position: relative; /* 确保title在遮罩之上 */
    justify-content: flex-start; /* 从行的开始位置对齐子元素 */
    z-index: 2;
}
#background-page .__title-image {
    margin-left: 10px;
    height: 85px; /* 保持图像大小 */
    order: 0; /* 设置更小的order值，让图片在文字前面显示 */
    opacity: ${config.HTML_setting.botProfileblurs}; /* 调整透明度 */
    border-radius: 50%; /* 将图片的边框半径设置为50%，使其呈现圆形 */
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); /* 添加一圈阴影，参数分别为水平偏移、垂直偏移、模糊半径和颜色 */
    margin-right: 20px; /* 在图片和文本之间添加一些间隔 */
}


#background-page .__footer-image {
    border-radius: 50%; /* 将图片的边框半径设置为50%，使其呈现圆形 */
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); /* 添加一圈阴影，参数分别为水平偏移、垂直偏移、模糊半径和颜色 */
    margin-left: 20px; /* 调整左侧间距 */
    margin-top: -38px; /* 保持原有的垂直间距 */
    height: 58px;
    opacity: ${config.HTML_setting.logoblurs}; /* 设置透明度 */
    z-index: 2;
    align-items: center; /* 垂直居中对齐 */
}


#background-page .__dashboard, #background-page .__information, #background-page .__footer, #background-page .__footer-image {
    position: relative; /* 确保这些元素在遮罩之上 */
    z-index: 2;
}

${botnametitletext}

#background-page .__dashboard {
    margin-top: 30px;
    list-style: none;
    display: flex;
    flex-direction: row; /* 水平排列 */
    flex-wrap: wrap; /* 允许项目自动换行 */
    gap: 0px;
}

#background-page .__dashboard-block {
    --block-color: block;
    display: flex;
    flex-direction: column; /* 保持垂直排列 */
    align-items: center; /* 在水平方向上居中对齐 */
    text-align: center; /* 文本水平居中对齐 */
    width: calc(50% - 25px); /* 计算宽度为容器宽度的一半减去间隙的一部分，假设间隙是50px */
    gap: 20px;
}

#background-page .__dashboard-block__info {
    margin-left: 0px;
    flex: 1;
}

#background-page .__dashboard-block__info__value {
    margin-top: 10px;
    font-size: 35px; /*圆圈旁边的字的大小*/
    font-family: "Gugi";
    line-height: 56px;
    color: var(--block-color);
}
#background-page .__information {
    margin-top: 55px;
    padding: 0 30px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
}
#background-page .__information-block {
    display: flex;
    flex-direction: row;
}
#background-page .__information-block__key {
    width: 185px;
}


#background-page .__information-block__value {
    flex: 1;
}


#background-page .__information {
    border: ${config.HTML_setting.DashedboxThickn}px dashed ${rgbaToHex(config.HTML_setting.Dashedboxcolor)}; /* 设置边框为深色(#333)的虚线，宽度为2px */
    padding: 30px; /* 添加内边距，使文本不紧贴边框 */
    margin-bottom: 14px; /* 保持元素之间的间隔 */
    border-radius: 10px; /* 添加圆角效果 */
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
/*  __dashboard 类样式 */
#background-page .__dashboard {
    border: ${config.HTML_setting.DashedboxThickn}px dashed ${rgbaToHex(config.HTML_setting.Dashedboxcolor)}; /* 设置边框为虚线 */
    padding: 45px; /* 添加内边距，使文本不紧贴边框 */
    margin-bottom: 14px; /* 保持元素之间的间隔 */
    border-radius: 10px; /* 添加圆角效果 */
    list-style: none;
    display: flex;
    flex-direction: row; /* 保持原有的行排列 */
    flex-wrap: wrap; /* 允许项目自动换行 */
    gap: 35px; /* 保持原有的间隙设置 */
}
#background-page .__information-block__key,
#background-page .__information-block__key, #background-page .__information-block__value {
    line-height: 42px;
    font-size: 28px;
    font-family: "Gugi";
    color: ${rgbaToHex(config.HTML_setting.systeminformationTextColor)}; /*系统信息的颜色*/
}

#background-page .__footer {
    margin-top: 50px;
    font-family: "HachiMaruPop";
    font-size: 22px;
    text-align: right;
    color: #b7a89e;/*已持续运行*/
    -webkit-text-stroke: 0.5px #ff000091;  /*已持续运行*/
}

</style>
<title>status</title>
</head>
<body>
<div id="app">
    <div id="background-page">
        <div class="__title">
            <span class="__title-text" id="config_name">${config.botName}</span>
            ${insertHTML}
        </div>
        <ul class="__dashboard" id="config_dashboard">
            <!--  -->
                        
            <!-- 第一个圆 -->
            <li
                class="__dashboard-block __cpu"
                style="--block-color: ${dashboardColor[0]}"
            >
            <!-- 圆的大小 -->
            <svg
                width="112"
                height="112"
                viewBox="0 0 200 200"
                class="__dashboard-block__progress circle-progress"
                style="--progress: ${systemInfo.dashboard[0].progress}; --color: var(--block-color)"
            >
                <!-- 背景圆 -->
                <circle class="circle-shadow" cx="100" cy="100" r="98" fill="none" stroke="rgba(0, 0, 0, 0.15)" stroke-width="3"/>
                <circle
                class="circle-background"
                cx="100"
                cy="100"
                r="94"
                />
                <!-- 进度条 -->
                <circle
                class="circle-progress-bar"
                stroke-linecap="round"
                cx="100"
                cy="100"
                r="94"
                fill="none"
                transform="rotate(-93.8 100 100)"
                stroke-width="12"
                />
                <!-- 中心文字 -->
                <text
                x="50%"
                y="52%"
                font-family="Gugi"
                font-size="52"
                text-anchor="middle"
                fill="#647394"
                dy=".3em"
                >
                CPU
                </text>
            </svg>
            <div class="__dashboard-block__info">
                <p class="__dashboard-block__info__value">${systemInfo.dashboard[0].title}</p>
            </div>
            </li>
    
            <!-- 第二个圆 -->
            <li
                class="__dashboard-block __cpu"
                style="--block-color: ${dashboardColor[1]}"
            >
            <!-- 圆的大小 -->
            <svg
                width="112"
                height="112"
                viewBox="0 0 200 200"
                class="__dashboard-block__progress circle-progress"
                style="--progress: ${systemInfo.dashboard[1].progress}; --color: var(--block-color)"
            >
                <!-- 背景圆 -->
                <circle class="circle-shadow" cx="100" cy="100" r="98" fill="none" stroke="rgba(0, 0, 0, 0.15)" stroke-width="3"/>
                <circle
                class="circle-background"
                cx="100"
                cy="100"
                r="94"
                />
                <!-- 进度条 -->
                <circle
                class="circle-progress-bar"
                stroke-linecap="round"
                cx="100"
                cy="100"
                r="94"
                fill="none"
                transform="rotate(-93.8 100 100)"
                stroke-width="12"
                />
                <!-- 中心文字 -->
                <text
                x="50%"
                y="52%"
                font-family="Gugi"
                font-size="52"
                text-anchor="middle"
                fill="#647394"
                dy=".3em"
                >
                RAM
                </text>
            </svg>
            <div class="__dashboard-block__info">
                <p class="__dashboard-block__info__value">${systemInfo.dashboard[1].title}</p>
            </div>
            </li>
    
            <!-- 第三个圆 -->
            <li
                class="__dashboard-block __cpu"
                style="--block-color: ${dashboardColor[2]}"
            >
            
            <svg
                width="112"
                height="112"
                viewBox="0 0 200 200"
                class="__dashboard-block__progress circle-progress"
                style="--progress: ${systemInfo.dashboard[2].progress}; --color: var(--block-color)"
            >
                <!-- 背景圆 -->
                <circle class="circle-shadow" cx="100" cy="100" r="98" fill="none" stroke="rgba(0, 0, 0, 0.15)" stroke-width="3"/>
                <circle
                class="circle-background"
                cx="100"
                cy="100"
                r="94"
                />
                <!-- 进度条 -->
                <circle
                class="circle-progress-bar"
                stroke-linecap="round"
                cx="100"
                cy="100"
                r="94"
                fill="none"
                transform="rotate(-93.8 100 100)"
                stroke-width="12"
                />
                <!-- 中心文字 -->
                <text
                x="50%"
                y="52%"
                font-family="Gugi"
                font-size="52"
                text-anchor="middle"
                fill="#647394"
                dy=".3em"
                >
                SWAP
                </text>
            </svg>
            <div class="__dashboard-block__info">
                <p class="__dashboard-block__info__value">${systemInfo.dashboard[2].title}</p>
            </div>
            </li>
    
            <!-- 第四个圆 -->
            <li
                class="__dashboard-block __cpu"
                style="--block-color: ${dashboardColor[3]}"
            >
            <!-- 圆的大小 -->
            <svg
                width="112"
                height="112"
                viewBox="0 0 200 200"
                class="__dashboard-block__progress circle-progress"
                style="--progress: ${systemInfo.dashboard[3].progress}; --color: var(--block-color)"
            >
                <!-- 背景圆 -->
                <circle class="circle-shadow" cx="100" cy="100" r="98" fill="none" stroke="rgba(0, 0, 0, 0.15)" stroke-width="3"/>
                <circle
                class="circle-background"
                cx="100"
                cy="100"
                r="94"
                />
                <!-- 进度条 -->
                <circle
                class="circle-progress-bar"
                stroke-linecap="round"
                cx="100"
                cy="100"
                r="94"
                fill="none"
                transform="rotate(-93.8 100 100)"
                stroke-width="12"
                />
                <!-- 中心文字 -->
                <text
                x="50%"
                y="52%"
                font-family="Gugi"
                font-size="52"
                text-anchor="middle"
                fill="#647394"
                dy=".3em"
                >
                DISK
                </text>
            </svg>
            <div class="__dashboard-block__info">
                <p class="__dashboard-block__info__value">${systemInfo.dashboard[3].title}</p>
            </div>
            </li>
            <!--  -->
        </ul>
        <ul class="__information" id="config_information">
            <!--  -->
            <!-- 系统信息 -->
            
            <li class="__information-block">
                <span class="__information-block__key">${systemInfo.information[0].key}</span>
                <span class="__information-block__value">${systemInfo.information[0].value}</span>
            </li>

            <li class="__information-block">
                <span class="__information-block__key">${systemInfo.information[1].key}</span>
                <span class="__information-block__value">${systemInfo.information[1].value}</span>
            </li>

            <li class="__information-block">
                <span class="__information-block__key">${systemInfo.information[2].key}</span>
                <span class="__information-block__value">${systemInfo.information[2].value}</span>
            </li>

            <li class="__information-block">
                <span class="__information-block__key">Platform</span>
                <span class="__information-block__value">${session.platform}</span>
            </li>

            <li class="__information-block">
                <span class="__information-block__key">Network</span>
                <span class="__information-block__value">${Networkstatus.text}</span>
            </li>

            <li class="__information-block">
                <span class="__information-block__key">${systemInfo.information[3].key}</span>
                <span class="__information-block__value">${systemInfo.information[3].value}</span>
            </li>
            
            </ul>      
        <p class="__footer" id="config_footer">${durationTime(uptime)}</p>
        <img class="__footer-image" src="./htmlmaterial/logo.png" />
    </div>
</div>
</body>
</html>
            `;

            // 写回修改的内容到文件
            fs.writeFileSync(templatePath, source);

            

            if (config.consoleinfo) {
                
            exports.logger.error(`使用背景URL: ${BackgroundURL}`);
            exports.logger.error(`背景模糊半径: ${config.HTML_setting.Backgroundblurs}`);
            exports.logger.error(`背景颜色: ${config.HTML_setting.Backgroundcolor}`);
            exports.logger.error(`HTML默认面板元素颜色: ${dashboardColor}`);
            exports.logger.error(`系统信息文字颜色: ${rgbaToHex(config.HTML_setting.systeminformationTextColor)}`);

            exports.logger.error(`机器人头像透明度: ${config.HTML_setting.botProfileblurs}`);
            exports.logger.error(`Koishi LOGO透明度: ${config.HTML_setting.logoblurs}`);

            exports.logger.error(`系统信息的文字字体: ${config.HTML_setting.textfont1}`);
            exports.logger.error(`机器人信息的文字字体: ${config.HTML_setting.textfont2}`);
            exports.logger.error(Networkstatus);
            exports.logger.error(`文件: ${templatePath}`);
            exports.logger.error(`渲染路径: ${templateURL}`);

            };

            await page.goto(templateURL); 
            
            await page.waitForNetworkIdle();
            //await page.evaluate(`action(${JSON.stringify(systemInfo)})`);
            const element = await page.$("#background-page");

            return (koishi_1.h.image(await element.screenshot({encoding: "binary"}), "image/png"));
        }
        catch (e) {
            exports.logger.error("状态渲染失败: ", e);
            return "渲染失败" + e.message;
        }
        finally {
            page?.close();
        }
    });

    async function downloadImage(url, outputPath) {
        const response = await ctx.http.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response);  
        await fs.promises.writeFile(outputPath, buffer);
    }
    
    function getRandomBackground(config) {
        let backgroundPath = config.BackgroundURL[Math.floor(Math.random() * config.BackgroundURL.length)];

        // 网络URL
        if (backgroundPath.includes('http://') || backgroundPath.includes('https://')) {
          return backgroundPath;
        } 
        // 文本文件路径
        else if (backgroundPath.includes('.txt')) {
          let lines = fs.readFileSync(backgroundPath, 'utf-8').split('\n').filter(Boolean);
          return lines[Math.floor(Math.random() * lines.length)].trim().replace(/\\/g, '/');
        } 
        // 本地文件夹路径
        else {
          const files = fs.readdirSync(backgroundPath)
            .filter(file => /\.(jpg|png|gif|bmp|webp)$/i.test(file));
          if (files.length === 0) {
            throw new Error("文件夹中未找到有效图片文件");
          }
          return path_1.join(backgroundPath, files[Math.floor(Math.random() * files.length)]).replace(/\\/g, '/');
        }
      }


    function rgbaToHex(rgba) {
        const rgbaArray = rgba.match(/(\d+)/g);
        // 提取RGB值
        const r = parseInt(rgbaArray[0]);
        const g = parseInt(rgbaArray[1]);
        const b = parseInt(rgbaArray[2]);
        // 将RGB值转换为十六进制格式
        const hex = "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
        return hex;
    }
        
/*
const utils_1 = require("./utils");
*/
    async function getSystemInfo(pluginSize) {
        const promisList = await Promise.all([
            getCPUUsage(),
            si.osInfo(),
            si.cpuCurrentSpeed(),
            si.mem(),
            getDiskUsage(),
        ]);
        //const { uptime } = si.time();
        const [{ cpuUsage, cpuInfo }, { distro }, { avg }, { total, used, swaptotal, swapused }, { disksize, diskused },] = promisList;
        // memory
        const memoryTotal = (total / 1024 / 1024 / 1024).toFixed(2) + " GB";
        const memoryUsed = (used / 1024 / 1024 / 1024).toFixed(2);
        const memoryUsage = (used / total).toFixed(2);
        // swap
        const swapTotal = (swaptotal / 1024 / 1024 / 1024).toFixed(2) + " GB";
        const swapUsed = (swapused / 1024 / 1024 / 1024).toFixed(2);
        const swapUsage = (swapused / swaptotal).toFixed(2);
        // disk
        const diskTotal = (disksize / 1024 / 1024 / 1024).toFixed(2) + " GB";
        const diskUsed = (diskused / 1024 / 1024 / 1024).toFixed(2);
        const diskUsage = (diskused / disksize).toFixed(2);
        const systemInfo = {
            
            dashboard: [
                {
                    progress: +cpuUsage,
                    title: `${(+cpuUsage * 100).toFixed(0)}% - ${avg}Ghz`,
                },
                {
                    progress: +memoryUsage || 0,
                    title: isNaN(+memoryUsed) ? ErrorInfo : `${memoryUsed} / ${memoryTotal}`,
                },
                {
                    progress: +swapUsage || 0,
                    title: isNaN(+swapUsed) ? ErrorInfo : `${swapUsed} / ${swapTotal}`,
                },
                {
                    progress: +diskUsage || 0,
                    title: isNaN(+diskUsed) ? ErrorInfo : `${diskUsed} / ${diskTotal}`,
                },
            ],
            information: [
                {
                    key: "CPU",
                    value: cpuInfo,
                },
                {
                    key: "System",
                    value: distro,
                },
                {
                    key: "Version",
                    value: `${koishi_1.version}`,
                },
                {
                    key: "Plugins",
                    value: `${pluginSize} loaded in total`,
                },
            ],        
        };
        return systemInfo;
    }

    async function getDiskUsage() {
        const disks = await si.fsSize();
        let disksize = 0, diskused = 0;
        disks.forEach((disk) => {
            disksize += disk.size;
            diskused += disk.used;
        });
        return {
            disksize,
            diskused,
        };
    }
    async function getCPUUsage() {
        const t1 = getCPUInfo();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const t2 = getCPUInfo();
        const idle = t2.idle - t1.idle;
        const total = t2.total - t1.total;
        const cpuUsage = (1 - idle / total).toFixed(2);
        const cpuInfo = os_1.cpus()[0].model;
        return {
            cpuUsage,
            cpuInfo,
        };
    }
    function getCPUInfo() {
        const cpus = os_1.cpus();
        let idle = 0;
        const total = cpus.reduce((acc, cpu) => {
            for (const type in cpu.times) {
                acc += cpu.times[type];
            }
            idle += cpu.times.idle;
            return acc;
        }, 0);
        return {
            idle,
            total,
        };
    }

    const { uptime } = si.time();
    function durationTime(time) {
        const day = Math.floor(time / 86400);
        const hour = Math.floor((time - day * 86400) / 3600);
        const minute = Math.floor((time - day * 86400 - hour * 3600) / 60);
        return `正在运行中. . . . . .已持续运行 ${day}天 ${hour}小时 ${minute}分钟`;
    }

        
    /**
     * 转换字节大小为更易读的格式（KB, MB, GB 等）
     * @param {number} bytes - 字节数
     * @return {string} 转换后的大小
     */
    function formatSizeUnits(bytes) {
        if (bytes >= 1073741824) {
            return (bytes / 1073741824).toFixed(2) + ' GB';
        } else if (bytes >= 1048576) {
            return (bytes / 1048576).toFixed(2) + ' MB';
        } else if (bytes >= 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else if (bytes > 1) {
            return bytes.toFixed(2) + ' B';
        } else if (bytes === 1) {
            return bytes + ' byte';
        } else {
            return '0 bytes';
        }
    }
    /**
     * 获取当前网络接口的上行下行速度
     * @return {Promise<Object>} 包含上行和下行速度的对象
     */
    async function getNetworkSpeed() {
        try {
        const info = await si.get({
            networkStats: "rx_sec,tx_sec",
        })
    
        if (!info.networkStats || info.networkStats.length === 0) {
            throw new Error('无法获取网络状态信息');
        }
    
        const primaryInterface = info.networkStats[0];
    
        return {
            text: `↑ ${formatSizeUnits(primaryInterface.tx_sec)}/s ↓ ${formatSizeUnits(primaryInterface.rx_sec)}/s`,
            progress: primaryInterface.tx_sec / (primaryInterface.tx_sec + primaryInterface.rx_sec)
        };
        } catch (error) {
        exports.logger.error('获取网络速度时出错:', error);
        return {
            text: '↑ 0 B/s ↓ 0 B/s',
            progress: 0
        };
        }
    }

}
exports.apply = apply;
