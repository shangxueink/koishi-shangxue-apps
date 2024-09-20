import { Context, Schema, h } from 'koishi';

export const name = 'image-upscale-bigjpg';

export const usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Bigjpg 图片放大插件使用说明</title>
</head>
<body>
<h2>bigjpg 图片放大</h2>
<ul>
<li>支持将图片通过指定的风格进行放大，支持风格化和降噪处理</li>
<li>支持自动查询任务状态，根据配置返回放大后的图片链接、图片或者原始 JSON 数据</li>
<li>提供灵活的配置选项，包括超时时间、自动查询间隔、自定义提示信息等</li>
<li>提供日志调试功能，帮助用户追踪和解决问题</li>
</ul>

---

<h2>使用方法</h2>
<h3>图片放大指令</h3>
<p>用户可以通过 <code>放大图片</code> 命令来上传并放大图片。可以指定放大风格、降噪程度和放大倍数：</p>
<ul>
<li><strong>指令格式</strong>：</li>
</ul>
<pre><code>/放大图片 -s &lt;style&gt; -n &lt;noise&gt; -x &lt;x2&gt;</code></pre>
<ul>
<li><code>-s &lt;style&gt;</code>：指定放大风格，支持 <code>art</code>（卡通插画）和 <code>photo</code>（照片）。</li>
<li><code>-n &lt;noise&gt;</code>：指定降噪程度，支持 <code>-1</code>（无降噪）和 <code>0</code>（低降噪）。</li>
<li><code>-x &lt;x2&gt;</code>：指定放大倍数，支持 <code>1</code>（2x）、<code>2</code>（4x）、<code>3</code>（8x）、<code>4</code>（16x）。</li>
</ul>
<p>例子：</p>
<pre><code>/放大图片 -s art -n 0 -x 2</code></pre>

<h3>查询任务状态</h3>
<p>用户可以使用 <code>查询任务状态 &lt;taskIds...&gt;</code> 来查询已提交任务的状态。任务状态会根据配置返回图片、链接或者 JSON 数据。</p>
<p>例子：</p>
<pre><code>/查询任务状态 dfed390aaa154bf7a9e10dabf93fd7a9</code></pre>

---

<h2>获取 API 密钥</h2>
<p>在使用本插件之前，你需要前往 <a href="https://bigjpg.com/zh" target="_blank">Bigjpg 官网 https://bigjpg.com/zh</a> 注册并获取 API 密钥。此密钥是调用图片放大服务的必需参数。</p>
<p><a href="https://ghp.ci/https://raw.githubusercontent.com/shangxueink/koishi-shangxue-apps/main/koishi-plugin-image-upscale-bigjpg/2024-09-21_00-23-48.png" target="_blank">点击查看获取 API KEY 图解</a></p>

<p><a href="https://ghp.ci/https://raw.githubusercontent.com/shangxueink/koishi-shangxue-apps/main/koishi-plugin-image-upscale-bigjpg/2024-09-21_00-43-39.png" target="_blank">点击查看 Bigjpg 价格表</a></p>

<hr>
</body>
</html>

`;


export interface Config {
  timeout: number;
  apiKey: string;
  auto_query: boolean;
  auto_query_time: number;
  query_response_mode: 'text' | 'image' | 'raw';
  loggerinfo: boolean;
  wait_text_tip: string;
  bigjpg_style: 'art' | 'photo';
  bigjpg_noise: '-1' | '0';
  bigjpg_x2: '1' | '2' | '3' | '4';
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    apiKey: Schema.string().description('API 密钥').required(),
    timeout: Schema.number().description('等待上传图片的超时时间（单位：秒）').default(30).min(5).max(90),
    wait_text_tip: Schema.string().description('提交任务后返回的 文字提示').default('已经提交任务咯\~ 任务ID为： '),
  }).description('基础设置'),
  Schema.object({
    bigjpg_style: Schema.union([
      Schema.const('art').description('卡通插画'),
      Schema.const('photo').description('照片'),
    ]).role('radio').default('art').description('指定放大风格'),
    bigjpg_noise: Schema.union([
      Schema.const('-1').description('无降噪'),
      Schema.const('0').description('低降噪'),
    ]).role('radio').default('0').description('指定降噪程度'),
    bigjpg_x2: Schema.union([
      Schema.const('1').description('2x'),
      Schema.const('2').description('4x'),
      Schema.const('3').description('8x'),
      Schema.const('4').description('16x'),
    ]).role('radio').default('2').description('指定放大倍数'),
  }).description('默认请求设置'),
  Schema.object({
    auto_query: Schema.boolean().default(true).description('开启后，提交放大任务后，自动检查任务，返回图片'),
    auto_query_time: Schema.number().description('自动检查任务的时间间隔（单位：秒）').default(10).min(1).max(600),
    query_response_mode: Schema.union([
      Schema.const('text').description('仅返回放大后的图片链接（这个可能安全点）'),
      Schema.const('image').description('直接为发送放大后的图片（可能会被平台压缩等）'),
      Schema.const('raw').description('返回API的原始json数据（不是人用的）'),
    ]).role('radio').default('text'),
  }).description('返回设置'),
  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('日志调试模式'),
  }).description('调试设置'),
]);

export function apply(ctx: Context, config: Config) {
  const API_KEY = config.apiKey;
  const UPSCALE_URL = 'https://bigjpg.com/api/task/';

  function logInfo(message: string) {
    if (config.loggerinfo) {
      ctx.logger.info(message);
    }
  }

  // 放大图片函数
  async function upscaleImage(style: 'art' | 'photo', noise: '-1' | '0', x2: '1' | '2' | '3' | '4', input: string) {
    logInfo(`开始放大图片，参数: style=${style}, noise=${noise}, x2=${x2}, input=${input}`);
    try {
      const response = await fetch(UPSCALE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
        body: JSON.stringify({
          style,
          noise,
          x2,
          input,
        }),
      });
      const result = await response.json();
      logInfo(`放大图片响应: ${JSON.stringify(result)}`);
      if (response.ok && result.tid) {
        return `任务提交成功！任务ID：${result.tid}`;
      } else {
        return `提交失败：${result.error || '未知错误'}`;
      }
    } catch (error) {
      logInfo(`放大图片请求失败: ${error.message}`);
      return `请求失败：${error.message}`;
    }
  }

  // 查询任务状态函数
  async function queryTaskStatus(taskIds: string[]) {
    logInfo(`查询任务状态，任务ID: ${taskIds.join(',')}`);
    try {
      const url = `${UPSCALE_URL}${taskIds.join(',')}`;
      const response = await fetch(url);
      const result = await response.json();
      logInfo(`查询任务状态响应: ${JSON.stringify(result)}`);
      if (response.ok) {
        return result;
      } else {
        return `查询失败：${result.error || '未知错误'}`;
      }
    } catch (error) {
      logInfo(`查询任务状态请求失败: ${error.message}`);
      return `查询失败：${error.message}`;
    }
  }

  // 定义 koishi 指令
  ctx.command('bigjpg', '图片放大相关指令') // 父级指令
  ctx.command('bigjpg/放大图片', '放大图片')
    .option('style', '-s <style:string> 指定放大风格。参数有 art, photo 分别表示 卡通插画, 照片', {
      fallback: config.bigjpg_style,
    })
    .option('noise', '-n <noise:string> 指定降噪程度。参数有 -1, 0, 1, 2, 3 分别表示降噪程度 无, 低, 中, 高, 最高', {
      fallback: config.bigjpg_noise,
    })
    .option('x2', '-x <x2:string> 指定放大倍数。参数有 1, 2, 3, 4 分别表示 2x, 4x, 8x, 16x', {
      fallback: config.bigjpg_x2,
    })
    .action(async ({ session, options }) => {
      logInfo('等待用户发送图片...');
      await session.send('请发送一个图片');
      const inputImage = await session.prompt(config.timeout * 1000);
      const input = h.select(inputImage, 'img').map(item => item.attrs.src)[0]; // 把上传的图片链接赋值给 input
      if (!input) {
        logInfo('未检测到有效的图片');
        return '未检测到有效的图片，请重新发送。';
      }
      logInfo(`用户发送的图片链接: ${input}`);
      logInfo(`放大参数：风格：${options.style}，降噪程度：${options.noise}，放大倍数：${options.x2}`);
      const response = await upscaleImage(
        options.style as 'art' | 'photo',
        options.noise as '-1' | '0',
        options.x2 as '1' | '2' | '3' | '4',
        input
      );
      if (response.startsWith('任务提交成功')) {
        const taskId = response.split('：')[1];
        logInfo(`自动查询任务状态，任务ID：${taskId}`);
        await session.send(`${config.wait_text_tip}${taskId}`);
        if (config.auto_query) {
          let taskStatus;
          let attempts = 0;
          do {
            await new Promise((resolve) => setTimeout(resolve, config.auto_query_time * 1000));
            taskStatus = await queryTaskStatus([taskId]);
            attempts++;
          } while (taskStatus[taskId]?.status !== 'success' && attempts < 10);

          if (taskStatus[taskId]?.status === 'success') {
            const imageUrl = taskStatus[taskId].url;
            if (config.query_response_mode === 'text') {
              return `放大后的图片链接：${imageUrl}`;
            } else if (config.query_response_mode === 'image') {
              await session.send(h.image(imageUrl));
              return;
            } else if (config.query_response_mode === 'raw') {
              return JSON.stringify(taskStatus, null, 2);
            }
          } else {
            return `任务查询失败或超时，请稍后重试。任务ID：${taskId}`;
          }
        } else {
          return response;
        }
      } else {
        return response;
      }
    });

  // 查询任务状态指令
  ctx.command('bigjpg/查询任务状态 <taskIds...>', '查询任务状态')
    .action(async ({ session }, ...taskIds) => {
      if (taskIds.length === 0) {
        return '请提供至少一个任务ID。';
      }
      const response = await queryTaskStatus(taskIds);
      if (Object.keys(response).length === 0) {
        return '未找到对应的任务，请检查任务ID是否正确。';
      }
      for (const taskId in response) {
        if (response[taskId].status === 'success') {
          const imageUrl = response[taskId].url;
          if (config.query_response_mode === 'text') {
            await session.send(`任务ID：${taskId}，放大后的图片链接：${imageUrl}`);
          } else if (config.query_response_mode === 'image') {
            await session.send(h.image(imageUrl));
          } else if (config.query_response_mode === 'raw') {
            await session.send(JSON.stringify(response, null, 2));
          }
        } else {
          await session.send(`任务ID：${taskId}，状态：${response[taskId].status}`);
        }
      }
    });
}
