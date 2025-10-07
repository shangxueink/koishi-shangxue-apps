import { Context, Logger, Schema, Session, h } from 'koishi'
import { } from 'koishi-plugin-puppeteer'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const name = 'mahoshojo-generator'
export const reusable = false
export const filter = true

export const inject = {
  // optional: [''],
  required: ['logger', 'http', 'i18n', 'puppeteer']
}

export const usage = `
---

<img alt="Mahogen Logo" loading="lazy" width="320" height="160" decoding="async" data-nimg="1" src="https://masagen.colanns.me/mahogen-logo.svg" style="color: transparent;">

在魔裁世界观里，你将会是一个什么样的魔女...

通过回答一系列问题，生成更具深度的、包含魔力构装、奇境规则和繁开状态的详细角色设定。

---

## 依赖/服务

使用puppeteer渲染图片！

但还暂未支持源网站的字体渲染捏。

本插件来自以下项目：
- https://masagen.colanns.me/
- https://github.com/colasama/MahoShojo-Generator/tree/master

欢迎前往体验~~~

---
`;

const logger = new Logger(`DEV:${name}`);

interface QuestionnaireResponse {
  questions: string[];
}

interface CharacterData {
  name: string;
  appearance: {
    outfit: string;
    accessories: string;
    colorScheme: string;
    overallLook: string;
  };
  magic: string;
  habits: string;
  analysis: {
    personalityAnalysis: string;
    abilityReasoning: string;
    predictionBasis: string;
  };
  originalSin: string;
  reason: string;
  howto: string;
  death: string;
  background: string;
}

export interface Config {
  defaultPromptTime: number
  commandName: string
  commandName1: string
  commandName2: string
  responseTimeout: number
  privateOnly?: boolean;
  loggerinfo?: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    commandName: Schema.string().default("魔女审判").description("插件父级指令"),
    commandName1: Schema.string().default("生成").description("`开始生成`的指令名称"),
    commandName2: Schema.string().default("取消").description("`取消生成`的指令名称"),
  }).description("指令设置"),

  Schema.object({
    privateOnly: Schema.boolean().default(true).description("开启后 仅允许私聊触发。<br>为优化交互体验，推荐开启。"),
    defaultPromptTime: Schema.number().default(30).description("用户问答输入的超时时间。（单位：秒）<br>超时自动取消生成。"),
    responseTimeout: Schema.number().default(120).description("API请求的超时时间。（单位：秒）"),
  }).description("进阶设置"),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试模式").experimental(),
  }).description("调试设置"),
])

export function apply(ctx: Context, config: Config) {
  const generationSessions = new Map<string, {
    questions: string[];
    answers: string[];
    currentIndex: number;
  }>();

  ctx.i18n.define("zh-CN", {
    commands: {
      [`${config.commandName}.${config.commandName1}`]: {
        description: "通过回答问题生成魔法少女人设",
        messages: {
          "private_only": "此功能仅支持私聊使用。",
          "welcome": "欢迎来到魔法少女生成器！\n请回答以下问题来生成您的专属角色设定。\n问题生成中...\n注：问答过程中可以使用【{0}】指令以退出。",
          "question_progress": "问题 {0}/{1}：\n{2}",
          "timeout": "回答超时，生成已取消。",
          "generating": "问答完成！正在生成您的魔法少女人设，请稍候...\n\n⚠️ 生成过程可能需要1-2分钟，请耐心等待。",
          "get_questions_failed": "获取问题列表失败，请稍后重试。",
          "generation_failed": "角色生成失败，请稍后重试。",
          "render_failed": "图片生成失败，请稍后重试。",
          "error": "生成过程中发生错误，请稍后重试。",
          "already_generating": "您已经在生成过程中，请先完成当前生成 或使用【{0}】指令以取消生成。",
          "generation_complete": "魔法少女人设生成完成！"
        }
      },
      [`${config.commandName}.${config.commandName2}`]: {
        description: "取消当前的人设生成过程",
        messages: {
          "no_generation": "您当前没有进行中的生成任务，请先使用【{0}】指令开始生成。",
          "cancelled": "生成已取消。"
        }
      }
    }
  });

  ctx
    .command(`${config.commandName}.${config.commandName1}`)
    .action(async ({ session }) => {
      try {
        // 仅允许私聊
        if (config.privateOnly && !session.isDirect) {
          return session.text('.private_only');
        }

        const userId = session.userId;

        // 已经在生成过程中
        if (generationSessions.has(userId)) {
          return session.text('.already_generating', [`${config.commandName}.${config.commandName2}`]);
        }

        await session.send(session.text('.welcome', [`${config.commandName}.${config.commandName2}`]));

        // 获取问题列表
        const questions = await getQuestions(ctx);
        if (!questions) {
          return session.text('.get_questions_failed');
        }

        // 初始化生成会话
        generationSessions.set(userId, {
          questions,
          answers: [],
          currentIndex: 0
        });

        // 问答
        const answers = await conductQuestionnaire(session, questions);
        if (!answers) {
          generationSessions.delete(userId);
          return; // 已在函数内处理消息
        }

        // 生成
        const characterData = await generateCharacter(ctx, answers);
        if (!characterData) {
          generationSessions.delete(userId);
          return session.text('.generation_failed');
        }

        const imageBuffer = await renderCharacterCard(ctx, characterData);
        if (!imageBuffer) {
          generationSessions.delete(userId);
          return session.text('.render_failed');
        }

        // 清理
        generationSessions.delete(userId);
        logInfo('魔法少女人设生成完成');
        await session.send(session.text('.generation_complete'));
        await session.send(h.image(imageBuffer, 'image/png'));
        return

      } catch (error) {
        generationSessions.delete(session.userId);
        ctx.logger.error('生成过程中发生错误:', error);
        return session.text('.error');
      }
    })

  ctx
    .command(`${config.commandName}.${config.commandName2}`)
    .action(async ({ session }) => {
      const userId = session.userId;

      if (!generationSessions.has(userId)) {
        return session.text('.no_generation', [`${config.commandName}.${config.commandName1}`]);
      }

      generationSessions.delete(userId);
      return session.text('.cancelled');
    })

  // 获取问题列表
  async function getQuestions(ctx: Context): Promise<string[] | null> {
    try {
      logInfo('正在获取问题列表...');
      const response = await ctx.http.get('https://masagen.colanns.me/locales/zh/questionnaire.json');
      const data = response as QuestionnaireResponse;
      logInfo(`获取到 ${data.questions.length} 个问题`);
      return data.questions;
    } catch (error) {
      ctx.logger.error('获取问题列表失败:', error);
      return null;
    }
  }

  // 交互式问答
  async function conductQuestionnaire(session: Session, questions: string[]): Promise<string[] | null> {
    const userId = session.userId;
    const sessionData = generationSessions.get(userId);
    if (!sessionData) return null;

    try {

      for (let i = 0; i < questions.length; i++) {
        // 检查会话是否还存在（可能被取消了）
        if (!generationSessions.has(userId)) {
          return null;
        }

        const question = questions[i];
        await session.send(`问题 ${i + 1}/${questions.length}：\n${question}`);

        const answer = await session.prompt(config.defaultPromptTime * 1000);

        // 再次检查会话是否还存在
        if (!generationSessions.has(userId)) {
          return null;
        }

        if (!answer) {
          await session.send(session.text('.timeout'));
          return null;
        }

        // 检查是否是取消指令
        if (answer.includes(`${config.commandName}.${config.commandName2}`)) {
          generationSessions.delete(userId);
          await session.send(session.text(`commands.${config.commandName}.${config.commandName2}.messages.cancelled`));
          return null;
        }

        sessionData.answers.push(answer.trim() || '不想回答');
        sessionData.currentIndex = i + 1;
        logInfo(`问题 ${i + 1} 回答: ${answer.trim()}`);
      }

      await session.send(session.text('.generating'));
      return sessionData.answers;

    } catch (error) {
      ctx.logger.error('问答过程出错:', error);
      return null;
    }
  }

  async function generateCharacter(ctx: Context, answers: string[]): Promise<CharacterData | null> {
    try {
      logInfo('正在调用角色生成API...');

      const requestData = {
        answers: answers,
        language: 'zh'
      };

      const response = await ctx.http.post('https://masagen.colanns.me/api/generate-majo', requestData, {
        timeout: config.responseTimeout * 1000
      });

      logInfo('角色生成成功');
      return response as CharacterData;

    } catch (error) {
      ctx.logger.error('角色生成失败:', error);
      return null;
    }
  }

  // 渲染卡片
  async function renderCharacterCard(ctx: Context, characterData: CharacterData): Promise<Buffer | null> {
    try {
      const htmlContent = generateHTML(characterData);
      const page = await ctx.puppeteer.page();

      await page.setContent(htmlContent);
      await page.setViewport({ width: 900, height: 1200 });

      // 等待完全加载
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 精准截取fade-in元素
      const element = await page.$('.fade-in');
      if (!element) {
        logInfo('未找到fade-in元素，使用全页截图');
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: true
        });
        await page.close();
        return screenshot as Buffer;
      }

      const screenshot = await element.screenshot({
        type: 'png'
      });

      await page.close();
      logInfo('角色卡片生成完成');

      return screenshot as Buffer;

    } catch (error) {
      ctx.logger.error('角色卡片生成失败:', error);
      return null;
    }
  }

  function generateHTML(data: CharacterData): string {
    try {
      // 读取HTML模板文件
      const templatePath = resolve(__dirname, '../data/template.html');
      let htmlContent = readFileSync(templatePath, 'utf-8');

      // 处理外观描述，将对象转换为多行文本
      const appearanceText = [
        data.appearance.outfit,
        data.appearance.accessories,
        data.appearance.colorScheme,
        data.appearance.overallLook
      ].filter(text => text && text.trim()).join('<br>');

      // 处理分析内容
      const analysisText = [
        data.analysis.personalityAnalysis,
        data.analysis.abilityReasoning,
        data.analysis.predictionBasis
      ].filter(text => text && text.trim()).join('<br><br>');

      // 正则替换占位符
      htmlContent = htmlContent
        .replace(/在这里输入姓名/g, escapeHtml(data.name))
        .replace(/在这里输入外貌/g, appearanceText)
        .replace(/在这里输入魔法/g, escapeHtml(data.magic))
        .replace(/在这里输入故事/g, escapeHtml(data.background))
        .replace(/在这里输入性格/g, escapeHtml(data.habits))
        .replace(/在这里输入原罪/g, escapeHtml(data.originalSin))
        .replace(/在这里输入死亡原因/g, escapeHtml(data.death))
        .replace(/在这里输入犯罪手法/g, escapeHtml(data.howto))
        .replace(/在这里输入处刑/g, escapeHtml(data.reason));

      return htmlContent;

    } catch (error) {
      ctx.logger.error('读取HTML模板失败:', error);
      // 如果读取模板失败，返回简单的HTML
      return `
<!DOCTYPE html>
<html>
<head><title>魔法少女人设</title></head>
<body>
  <h1>${escapeHtml(data.name)}</h1>
  <p>外观：${escapeHtml(JSON.stringify(data.appearance))}</p>
  <p>魔法：${escapeHtml(data.magic)}</p>
  <p>习惯：${escapeHtml(data.habits)}</p>
  <p>分析：${escapeHtml(JSON.stringify(data.analysis))}</p>
  <p>原罪：${escapeHtml(data.originalSin)}</p>
  <p>原因：${escapeHtml(data.reason)}</p>
  <p>契约：${escapeHtml(data.howto)}</p>
  <p>死亡：${escapeHtml(data.death)}</p>
  <p>背景：${escapeHtml(data.background)}</p>
</body>
</html>`;
    }
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function logInfo(...args: any[]) {
    if (config.loggerinfo) {
      (logger.info as (...args: any[]) => void)(...args);
    }
  }
}