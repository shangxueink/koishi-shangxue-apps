"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { Schema, h } = require("koishi");
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
exports.name = "image-save-path";
exports.inject = {
  required: ['http']
};
exports.usage = ` 
---
<p><strong>配置项说明：</strong></p>
<p><strong>保存图片 指令：</strong>用于触发后接收图片来保存。也可以用于保存被回复的图片（机器人未接收到的图片就存不了）。</p>

---

效果预览：
<li><a href="https://i0.hdslb.com/bfs/article/a2780975ccbf74c422dd7f0333af0172312276085.png" target="_blank" referrerpolicy="no-referrer">交互保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/144dac10d99a911648b9016c620fa49a312276085.png" target="_blank" referrerpolicy="no-referrer">回复保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/a3f0844195795fc7e51f947e689fd744312276085.png" target="_blank" referrerpolicy="no-referrer">批量保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/23e26c25d805e0d5d5d76958e5950d56312276085.png" target="_blank" referrerpolicy="no-referrer">中间件批量保存图片</a></li>

---

多种指令交互模式预览：

<li><a href="https://i0.hdslb.com/bfs/article/a3d7513782fcd223fc02cc1b107aba2b312276085.png" target="_blank" referrerpolicy="no-referrer">1.【保存图片 [图片重命名] [文件夹备注] [图片]】</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/7caf059b2874c2e3201669d51e614d35312276085.png" target="_blank" referrerpolicy="no-referrer">2.【保存图片 [文件夹备注] [图片重命名] [图片]】</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/fa61465af2ed31f85c537ddf598d6b3a312276085.png" target="_blank" referrerpolicy="no-referrer">3.【保存图片 [图片重命名] [图片]】（仅存到第一个文件夹路径里）</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/1309846507b81c4d0fa755553feebce6312276085.png" target="_blank" referrerpolicy="no-referrer">4.【保存图片 [文件夹备注] [图片]】（自动为图片重命名）</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/4342e979dd9fac9a77fa519baa2a7c49312276085.png" target="_blank" referrerpolicy="no-referrer">5.【保存图片 [图片]】（自动为图片重命名，并且保存到第一个文件夹路径）</a></li>


---


<h2>💡 使用示例</h2>
<h3>快速保存</h3>
<pre><code>保存图片 我的图片 -e jpg</code></pre>
<p>👉 将图片保存为 <code>我的图片.jpg</code>。</p>

<h3>路径选择</h3>
<pre><code>保存图片 我的图片 表情包</code></pre>
<p>👉 将图片保存到 <code>E:\\Images\\Memes</code>。</p>

<h3>回复保存</h3>
<pre><code>回复带图片的消息 + 保存图片 我的回复图片</code></pre>
<p>👉 将回复消息中的图片保存为 <code>我的回复图片</code>。</p>


---


<details>
<summary>点击此处————查看完整使用方法说明</summary>

<h2>🚀 使用方法</h2>
<h3>1️⃣ 交互保存（默认路径，无需指定路径）</h3>
<p>将 <code>Interaction_mode</code> 配置项选择到 <code>3</code>。</p>
<pre><code>保存图片 图片名称</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>插件会自动保存图片到默认路径，并以指定的图片名称保存。</li>
<li>如果未设置默认路径，插件会提示错误：<code>没有设置默认保存路径</code>。</li>
</ul>

<h3>2️⃣ 交互保存（指定路径）</h3>
<p>将 <code>Interaction_mode</code> 配置项选择到 <code>1</code>。</p>
<pre><code>保存图片 图片名称 表情包</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>插件会检查 <code>savePaths</code> 中是否存在路径备注为 <code>表情包</code> 的配置。</li>
<li>如果匹配成功，图片将保存到对应路径。</li>
<li>如果匹配失败，插件会提示用户重新输入路径备注。</li>
</ul>

<h3>3️⃣ 回复交互保存</h3>
<pre><code>回复一条图片消息，并发送：保存图片 图片名称</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>插件会提取回复消息中的图片，并保存为指定文件名。</li>
<li>默认保存到第一个路径或用户指定路径。</li>
</ul>

<h3>4️⃣ 批量保存图片</h3>
<pre><code>保存图片 批量保存 -e png</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>插件会自动处理多张图片，避免文件重名冲突。</li>
<li>若未启用 <code>checkDuplicate</code>，仅允许保存一张图片。</li>
</ul>

<h3>5️⃣ 中间件监听保存</h3>
<pre><code>{
"groupListmapping": 
[    
{
"groupList": "123456",
"enable": true,
"defaultsavepath": "E:\\Images\\GroupChat",
"count": 3
}
]
}</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>自动保存指定群聊/频道中的图片消息。</li>
<li>支持自定义保存路径与触发条件。</li>
</ul>

<hr>

<h2>🔧 高级功能</h2>
<h3>1️⃣ 图片自动命名</h3>
<p>插件会根据当前时间生成安全的文件名：</p>
<pre><code>YYYY-MM-DD-HH-MM.png</code></pre>

<h3>2️⃣ 重名检查</h3>
<p>当启用 <code>checkDuplicate</code> 时，插件会自动为重名文件生成唯一文件名：</p>
<pre><code>图片名称(1).png
图片名称(2).png</code></pre>

<h3>3️⃣ 自定义路径映射</h3>
<pre><code>{
"savePaths": [
{ "name": "默认路径", "path": "E:\\Images\\Default" },
{ "name": "表情包", "path": "E:\\Images\\Memes" }
]
}</code></pre>

<h3>4️⃣ 配合中间件监听群聊/频道</h3>
<p>实时保存符合条件的图片消息到指定路径。</p>

<hr>


</details>

---

</body>
</html>
<p></p>
<p>推荐搭配一些从本地发图的插件使用哦\~</p>
<ul>
<li><a href="/market?keyword=emojihub-bili">emojihub-bili（这个可以自动发送本地表情包，与本插件组合实现“表情包小偷”）</a></li>
<li><a href="/market?keyword=smmcat-photodisk">smmcat-photodisk（这个可以可视化选图，很好用~）</a></li>
<li><a href="/market?keyword=booru-local">booru-local</a></li>
<li><a href="/market?keyword=local-pic-selecter">local-pic-selecter</a></li>
<li><a href="/market?keyword=get-images-from-local-path">get-images-from-local-path</a></li>
</ul>
`;

exports.Config = Schema.intersect([

  Schema.object({
    Interaction_mode: Schema.union([
      Schema.const('1').description('1.【保存图片 [图片重命名] [文件夹备注] [图片]】'),
      Schema.const('2').description('2.【保存图片 [文件夹备注] [图片重命名] [图片]】'),
      Schema.const('3').description('3.【保存图片 [图片重命名] [图片]】（仅存到第一个文件夹路径里）'),
      Schema.const('4').description('4.【保存图片 [文件夹备注] [图片]】（自动为图片重命名）'),
      Schema.const('5').description('5.【保存图片 [图片]】（自动为图片重命名，并且保存到第一个文件夹路径）'),
    ]).role('radio').description("交互模式选择：指令输入的参数规则<br>每个选项的效果图 请见`Preview`配置项展示的内容"),
  }).description('交互模式设置'),

  Schema.union([
    Schema.object({
      Interaction_mode: Schema.const("1").required(),
      Preview: Schema.array(Schema).role('checkbox').description(`<h3><a href="https://i0.hdslb.com/bfs/article/a3d7513782fcd223fc02cc1b107aba2b312276085.png" target="_blank" referrerpolicy="no-referrer">选项1 - 效果预览图（点我 以查看效果预览图）</a></h3>`),
    }),
    Schema.object({
      Interaction_mode: Schema.const("2").required(),
      Preview: Schema.array(Schema).role('checkbox').description(`<h3><a href="https://i0.hdslb.com/bfs/article/7caf059b2874c2e3201669d51e614d35312276085.png" target="_blank" referrerpolicy="no-referrer">选项2 - 效果预览图（点我 以查看效果预览图）</a></h3>`),
    }),
    Schema.object({
      Interaction_mode: Schema.const("3").required(),
      Preview: Schema.array(Schema).role('checkbox').description(`<h3><a href="https://i0.hdslb.com/bfs/article/fa61465af2ed31f85c537ddf598d6b3a312276085.png" target="_blank" referrerpolicy="no-referrer">选项3 - 效果预览图（点我 以查看效果预览图）</a></h3>`),
    }),
    Schema.object({
      Interaction_mode: Schema.const("4").required(),
      Preview: Schema.array(Schema).role('checkbox').description(`<h3><a href="https://i0.hdslb.com/bfs/article/1309846507b81c4d0fa755553feebce6312276085.png" target="_blank" referrerpolicy="no-referrer">选项4 - 效果预览图（点我 以查看效果预览图）</a></h3>`),
    }),
    Schema.object({
      Interaction_mode: Schema.const("5").required(),
      Preview: Schema.array(Schema).role('checkbox').description(`<h3><a href="https://i0.hdslb.com/bfs/article/4342e979dd9fac9a77fa519baa2a7c49312276085.png" target="_blank" referrerpolicy="no-referrer">选项5 - 效果预览图（点我 以查看效果预览图）</a></h3>`),
    }),
  ]),


  Schema.object({
    defaultImageExtension: Schema.string().description("默认图片后缀名").default("png"),
    showSavePath: Schema.boolean().description("保存成功后，告知具体文件保存路径，关闭后只会回复`图片已成功保存。`").default(false),
    checkDuplicate: Schema.boolean().description("开启后将检查重名文件，避免覆盖，若同名，则在文件名后加`(1)`,`(2)`... ...").default(true),
    imageSaveMode: Schema.boolean().description("开启后，默认选择了第一个路径，可以缺省路径参数<br>当然也支持输入路径参数<br>[此配置项效果图](https://i0.hdslb.com/bfs/article/1d34ae45de7e3c875eec0caee5444149312276085.png)").default(false),
    savePaths: Schema.array(Schema.object({
      name: Schema.string().description("备注名称"),
      path: Schema.string().description("文件夹路径"),
    })).role('table').description('用于设置图片保存路径的名称和地址映射').default([{ name: "第一个", path: "C:\\Program Files" }, { name: "第二个", path: "E:\\Music\\nums" }]),
  }).description('基础设置'),

  Schema.object({
    autosavePics: Schema.boolean().description("自动保存 的总开关 `如需查看详情日志，请开启consoleinfo配置项`").default(false),
    groupListmapping: Schema.array(Schema.object({
      enable: Schema.boolean().description('勾选后启用自动保存'),
      groupList: Schema.string().description('需要监听的群组ID').pattern(/^\S+$/),
      count: Schema.number().default(2).description('触发自动保存的重复次数'),
      defaultsavepath: Schema.string().description('保存到的文件夹路径'),
    }))
      .role('table')
      .description('各群组自动保存的路径映射 `注意不要多空格什么的（私信频道有private前缀）`')
      .default([
        {
          "enable": true,
          "groupList": "114514",
          "defaultsavepath": "C:\\Program Files"
        },
        {
          "groupList": "private:1919810",
          "enable": true,
          "defaultsavepath": "C:\\Program Files"
        }
      ]),
  }).description('进阶设置'),

  Schema.object({
    consoleinfo: Schema.boolean().default(false).description('日志调试模式'),
    command_of_get_link: Schema.boolean().default(false).description('是否开启【获取链接】的调试指令').experimental(),
  }).description('调试设置'),
])



function apply(ctx, config) {
  const loggerinfo = (message) => {
    if (config.consoleinfo) {
      ctx.logger.info(message);
    }
  };
  // 本地化支持
  const applyI18nresult = {
    commands: {
      "保存图片": {
        description: "保存图片到指定路径",
        messages: {
          "image_save_notfound_image": "请回复带有图片的消息。",
          "image_save_waitinput": "请发送图片：",
          "image_save_invalidimage": "输入的图片无效。",
          "image_save_path_select_prompt": "未开启重名检查时不允许一次性输入多张图片。",
          "image_save_path_invalid": "路径名称无效，请选择路径的名称（冒号左侧为名称）：",
          "image_save_notselected": "请选择正确的路径名称。",
          "image_save_no_defaultpath": "没有设置默认保存路径。",
          "image_save_success": "图片已成功保存。",
          "image_save_error": "保存图片时出错：{0}",
          "image_save_location": "图片已保存到：{0}",
          "image_save_rename": "出现同名文件，已保存为 {0}({1}){2}",
        }
      },
      "获取链接": {
        description: "获取图片链接",
        messages: {
          "image_save_notfound_image": "请回复带有图片的消息。",
          "image_save_waitinput": "请发送图片：",
          "image_save_invalidimage": "输入的图片无效。",
          "image_save_path_select_prompt": "未开启重名检查时不允许一次性输入多张图片。",
          "image_save_path_invalid": "路径名称无效，请选择路径的名称（冒号左侧为名称）：",
          "image_save_notselected": "请选择正确的路径名称。",
          "image_save_no_defaultpath": "没有设置默认保存路径。",
          "image_save_success": "图片已成功保存。",
          "image_save_error": "保存图片时出错：{0}",
          "image_save_location": "图片已保存到：{0}",
          "image_save_rename": "出现同名文件，已保存为 {0}({1}){2}",
        }
      }
    }
  };
  ctx.i18n.define("zh-CN", applyI18nresult);

  const interactionMode = config.Interaction_mode || '1';
  // 提取 URL 的函数
  const extractUrl = (content) => {
    let urls = h.select(content, 'img').map(item => item.attrs.src);
    if (urls.length > 0) {
      return urls;
    }
    urls = h.select(content, 'mface').map(item => item.attrs.url);
    return urls.length > 0 ? urls : null;
  };
  ctx.command('保存图片 [参数...]')
    .option('ext', '-e <ext:string> 指定图片后缀名')
    .option('name', '-n <name:string> 严格指定图片重命名')
    .action(async ({ session, options }, ...args) => {
      let 文件名, 路径名称, 图片;

      switch (interactionMode) {
        case '1':
          [文件名, 路径名称, 图片] = args;
          break;
        case '2':
          [路径名称, 文件名, 图片] = args;
          break;
        case '3':
          [文件名, 图片] = args;
          break;
        case '4':
          [路径名称, 图片] = args;
          break;
        case '5':
          [图片] = args;
          break;
        default:
          [文件名, 路径名称, 图片] = args;
      }

      const quotemessage = session.quote?.content;
      let urlhselect;
      loggerinfo('session.content： ');
      loggerinfo(session.content);
      // 处理图片源
      if (quotemessage) {
        // 回复保存图片
        urlhselect = extractUrl(quotemessage);
        if (!urlhselect) {
          await session.send(session.text(".image_save_notfound_image"))
          return;
        }
        loggerinfo('触发回复的目标消息内容： ');
        loggerinfo(quotemessage);
      } else if (图片) {
        // 用户直接输入图片
        urlhselect = extractUrl(图片);
        if (!urlhselect) {
          await session.send(session.text(".image_save_notfound_image"))
          return;
        }
        loggerinfo('用户直接输入的图片内容为： ');
        loggerinfo(urlhselect);
      } else {
        // 交互保存图片
        await session.send(session.text(".image_save_waitinput"))
        const image = await session.prompt(30000);
        urlhselect = extractUrl(image);
        if (!urlhselect) {
          //return '无法提取图片URL。';
          await session.send(session.text(".image_save_invalidimage"))
          return;
        }
        loggerinfo('用户输入： ');
        loggerinfo(image);
      }

      const imageExtension = options.ext || config.defaultImageExtension;
      if (urlhselect.length > 1 && !config.checkDuplicate) {
        // return '未开启重名检查时不允许一次性输入多张图片。';
        await session.send(session.text(".image_save_path_select_prompt"))
        return;
      }

      // 处理名称
      if (文件名) {
        // 移除尖括号及其内容
        文件名 = 文件名.replace(/<.*?>/g, '').trim(); // adapter-onebot 特性，可能会把回复的内容当做输入参数，跟在输入最后面
        if (文件名.length <= 0) {
          // 如果长度小于等于 1，认为路径名称无效
          文件名 = undefined;
        } else {
          loggerinfo('文件名： ');
          loggerinfo(文件名);
        }
      }
      if (路径名称) {
        // 移除尖括号及其内容
        路径名称 = 路径名称.replace(/<.*?>/g, '').trim(); // adapter-onebot 特性，可能会把回复的内容当做输入参数，跟在输入最后面
        if (路径名称.length <= 0) {
          // 如果长度小于等于 1，认为路径名称无效
          路径名称 = undefined;
        } else {
          loggerinfo('路径名称： ');
          loggerinfo(路径名称);
        }
      }

      // 选择保存路径
      let selectedPath;
      if (interactionMode === '3' || interactionMode === '5' || (config.imageSaveMode && !路径名称)) {
        selectedPath = config.savePaths[0]?.path;
        if (!selectedPath) return session.text(".image_save_no_defaultpath");
      } else if (interactionMode === '4') {
        const selected = config.savePaths.find(item => item.name === 路径名称);
        if (!selected) {
          await session.send(session.text(".image_save_path_invalid") + '\n' + config.savePaths.map(item => `${item.name}: ${item.path}`).join('\n'));
          const input = await session.prompt(30000);
          const selected = config.savePaths.find(item => item.name === input);
          if (!selected) return session.text(".image_save_notselected");
          selectedPath = selected.path;
        } else {
          selectedPath = selected.path;
        }
      } else {
        if (路径名称) {
          const selected = config.savePaths.find(item => item.name === 路径名称);
          if (!selected) {
            await session.send(session.text(".image_save_path_invalid") + '\n' + config.savePaths.map(item => `${item.name}: ${item.path}`).join('\n'));
            const input = await session.prompt(30000);
            const selected = config.savePaths.find(item => item.name === input);
            if (!selected) return session.text(".image_save_notselected");
            selectedPath = selected.path;
          } else {
            selectedPath = selected.path;
          }
        } else {
          await session.send(session.text(".image_save_path_invalid") + '\n' + config.savePaths.map(item => `${item.name}: ${item.path}`).join('\n'));
          const input = await session.prompt(30000);
          const selected = config.savePaths.find(item => item.name === input);
          if (!selected) return session.text(".image_save_notselected");
          selectedPath = selected.path;
        }
      }

      // 处理文件名
      let safeFilename;
      if (options.name) {
        safeFilename = options.name;
      } else if (!文件名) {
        // 如果文件名未指定，生成默认文件名
        const date = new Date();
        safeFilename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
      } else {
        safeFilename = 文件名;
      }
      safeFilename = safeFilename.replace(/[\u0000-\u001f\u007f-\u009f\/\\:*?"<>|]/g, '_');

      // 保存图片
      try {
        await saveImages(urlhselect, selectedPath, safeFilename, imageExtension, config, session, ctx);
      } catch (error) {
        ctx.logger.error('保存图片时出错： ' + error.message);
        //return `保存图片时出错：${error.message}`;
        await session.send(session.text(`.image_save_error`, [error.message]));
        return;
      }
    });


  if (config.command_of_get_link) {
    ctx.command('获取链接 [图片]')
      .action(async ({ session }, 图片) => {

        const quotemessage = session.quote?.content;
        let urlhselect;

        // 处理图片源
        if (quotemessage) {
          urlhselect = extractUrl(quotemessage);

          loggerinfo('触发回复的目标消息内容： ');
          loggerinfo(quotemessage);
          if (!urlhselect) {
            await session.send(session.text(".image_save_notfound_image"));
            return;
          } else {
            await session.send(urlhselect);
            return;
          }
        } else if (图片) {
          urlhselect = extractUrl(图片);

          loggerinfo('用户直接输入的图片内容为： ');
          loggerinfo(urlhselect);
          if (!urlhselect) {
            await session.send(session.text(".image_save_notfound_image"));
            return;
          } else {
            await session.send(urlhselect);
            return;
          }
        } else {
          await session.send(session.text(".image_save_waitinput"));
          const image = await session.prompt(30000);
          urlhselect = extractUrl(image);

          loggerinfo('用户输入： ');
          loggerinfo(image);
          if (!urlhselect) {
            await session.send(session.text(".image_save_invalidimage"));
            return;
          } else {
            await session.send(urlhselect);
            return;
          }
        }
      });

  }


  async function saveImages(urls, selectedPath, safeFilename, imageExtension, config, session, ctx) {
    let firstMessageSent = false;
    let duplicateMessages = [];

    for (let i = 0; i < urls.length; i++) {
      let url = urls[i];
      let fileRoot = path.join(selectedPath, safeFilename);
      let fileExt = `.${imageExtension}`;
      let targetPath = `${fileRoot}${fileExt}`;
      let index = 0;

      loggerinfo('提取到的图片链接：');
      loggerinfo(url);
      if (config.checkDuplicate) {
        while (fs.existsSync(targetPath)) {
          index++;
          targetPath = `${fileRoot}(${index})${fileExt}`;
        }
      }

      try {
        const buffer = await ctx.http.get(url);
        if (buffer.byteLength === 0) throw new Error('下载的数据为空');
        await fs.promises.writeFile(targetPath, Buffer.from(buffer));

        if (index > 0) {
          duplicateMessages.push(session.text(`.image_save_rename`, [safeFilename, index, fileExt]));
        } else {
          if (!firstMessageSent) {
            if (config.showSavePath) {
              await session.send(session.text(`.image_save_location`, [targetPath]));
            } else {
              await session.send(session.text(`.image_save_success`));
            }
            firstMessageSent = true;
          }
        }
      } catch (error) {
        ctx.logger.error('保存图片时出错： ' + error.message);
        await session.send(session.text(`.image_save_error`, [error.message]));
      }
    }

    if (duplicateMessages.length > 0) {
      await session.send(duplicateMessages.join('\n'));
    }
  }



  async function calculateHash(filename) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filename);
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', err => reject(err));
    });
  }

  function loadHashRecords(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (fileContent) {
          return JSON.parse(fileContent);
        }
      }
    } catch (error) {
      ctx.logger.error(`读取或解析哈希记录文件失败: ${error.message}`);
    }
    return {};
  }


  function saveHashRecords(filePath, records) {
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
  }

  const root = path.join(ctx.baseDir, 'data', 'image-save-path');
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (error) {
    ctx.logger.error(`Error creating directory: ${error}`);
  }
  const hashRecordPath = path.join(ctx.baseDir, 'data', 'image-save-path', 'image-hash-records.json');

  async function downloadAndSaveImage(url, outputPath, ctx, hashRecords, count) {
    try {
      const buffer = await downloadImageBuffer(url, ctx);
      const tempPath = `${outputPath}.tmp`;
      await fs.promises.writeFile(tempPath, buffer);
      const hash = await calculateHash(tempPath);

      if (!hashRecords[hash]) {
        hashRecords[hash] = { count: 0, path: "", saved: false };
      }
      hashRecords[hash].count++;

      if (hashRecords[hash].count >= count && !hashRecords[hash].saved) {
        const date = new Date();
        const preciseFilename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}-${String(date.getMilliseconds()).padStart(3, '0')}.png`;
        const finalPath = path.join(outputPath, preciseFilename);
        fs.renameSync(tempPath, finalPath);
        loggerinfo(`图片已保存到：${finalPath}`);
        hashRecords[hash].path = finalPath;
        hashRecords[hash].saved = true;
      } else {
        fs.unlinkSync(tempPath);
      }

      saveHashRecords(hashRecordPath, hashRecords);
    } catch (error) {
      ctx.logger.error(`处理图片失败：${error}`);
    }
  }

  async function downloadImageBuffer(url, ctx) {
    const response = await ctx.http.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response);
  }

  if (config.autosavePics && config.groupListmapping.length) {
    ctx.middleware(async (session, next) => {
      const channelId = session.channelId;
      const groupConfig = config.groupListmapping.find(group => group.groupList === channelId && group.enable);

      if (!groupConfig) {
        return next();
      }

      const userMessagePic = session.content;
      const imageLinks = h.select(userMessagePic, 'img').map(item => item.attrs.src);

      if (imageLinks.length > 0) {
        loggerinfo(`收到图片消息，提取到链接：\n${imageLinks}`);
      }

      if (!imageLinks.length) {
        return next();
      }

      const hashRecords = loadHashRecords(hashRecordPath);
      for (const link of imageLinks) {
        await downloadAndSaveImage(link, groupConfig.defaultsavepath, ctx, hashRecords, groupConfig.count);
      }

      return next();
    });
  }

}

exports.apply = apply;