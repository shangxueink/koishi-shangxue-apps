"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi = require("koishi");
exports.name = 'huozi-generator';
const logger = new koishi.Logger('huozi-generator');
exports.usage = `
<h1>→ <a href="https://www.npmjs.com/package/koishi-plugin-huozi-generator" target="_blank">点击这里查看详细的文档说明✨</a></h1>
如何部署后端？
请前往 <a href="https://github.com/shangxueink/HUOZI_koi" target="_blank">HUOZI_koi 项目</a> 了解部署方法。
`;
exports.Config = koishi.Schema.intersect([
  koishi.Schema.object({
    waitTip_Switch: koishi.Schema.union([
      koishi.Schema.const().description('不返回文字提示'),
      koishi.Schema.string().description('返回文字提示（请在右侧填写文字内容）'),
    ]).description("是否返回等待提示。开启后，会发送`等待提示语`"),
    apiEndpoint: koishi.Schema.string().role('link').description("使用的apiEndpoint").default('http://127.0.0.1:8989/api/make'),
    default_inYsddMode: koishi.Schema.boolean().default(false).description(`匹配到特定文字时使用原声大碟`),
    default_norm: koishi.Schema.boolean().default(false).description(`统一音频的音量`),
    default_reverse: koishi.Schema.boolean().default(false).description(`倒放生成的音频`),
    default_speedMult: koishi.Schema.number().role('slider').min(0.5).max(2.0).step(0.1).default(1.0).description(`速度`),
    default_pitchMult: koishi.Schema.number().role('slider').min(0.5).max(2.0).step(0.1).default(1.0).description(`音调`),
  }).description("基础设置"),
  koishi.Schema.object({
    loggerinfo: koishi.Schema.boolean().default(false).description("日志调试输出 `日常使用无需开启`"),
  }).description("调试设置"),
]);

var zh_CN_default = {
  commands: {
    "huozi-generator": {
      description: "生成音频文件",
      messages: {
        "expect_text": "请输入要生成音频的文本。",
        "generation_failed": "音频生成失败，请稍后再试。"
      }
    }
  }
};

async function apply(ctx, config) {
  ctx.i18n.define("zh-CN", zh_CN_default);
  const apiEndpoint = config.apiEndpoint;
  const default_inYsddMode = config.default_inYsddMode;
  const default_norm = config.default_norm;
  const default_reverse = config.default_reverse;
  const default_speedMult = config.default_speedMult;
  const default_pitchMult = config.default_pitchMult;

  ctx.command('huozi-generator <content:text>')
    .alias('活字乱刷','活字印刷')
    .option("ysddMode", "-y 匹配到特定文字时使用原声大碟")
    .option("norm", "-n 统一音频的音量")
    .option("reverse", "-r 倒放生成的音频")
    .option("speedMult", "-s <speedMult> 语音速度")
    .option("pitchMult", "-p <pitchMult> 语音音调")
    .action(async ({ session, options }, content) => {
      if (!content || content.trim() === '') {
        await session.send(session.text(".expect_text"));
        return;
      }
      if (config.waitTip_Switch) {
        await session.send(session.text(config.waitTip_Switch));
      }
      try {
        const result = await generateAudio(ctx, config, content, options);
        if (config.loggerinfo) {
          logger.error(`result: ${result}`);
        }
        await session.send(koishi.h.audio(result));
      } catch (error) {
        logger.error('Audio generation failed:', error);
        await session.send(session.text(".generation_failed"));
      }
    });

  async function generateAudio(ctx, config, content, options) {
    const encodedContent = encodeURIComponent(content.replace(/\n/g, "\\n"));
    const inYsddMode = options.ysddMode ?? default_inYsddMode;
    const norm = options.norm ?? default_norm;
    const reverse = options.reverse ?? default_reverse;
    const speedMult = options.speedMult ?? default_speedMult;
    const pitchMult = options.pitchMult ?? default_pitchMult;
    
    const url = `${apiEndpoint}?text=${encodedContent}&inYsddMode=${inYsddMode}&norm=${norm}&reverse=${reverse}&speedMult=${speedMult}&pitchMult=${pitchMult}`;
    try {
      const response = await ctx.http.get(url);
      if (config.loggerinfo) {
        logger.error(`请求URL为\n${url}`);
        logger.error(`API 响应内容: \n${JSON.stringify(response)}`);
      }
      if (response.code === 200 && response.file_url) {
        return response.file_url;
      }
    } catch (error) {
      logger.error(`API request to ${url} failed:\n`, error);
    }
    throw new Error('Audio generation API failed.');
  }
}

exports.apply = apply;
