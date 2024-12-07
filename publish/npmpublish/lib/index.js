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
效果预览：
<li><a href="https://i0.hdslb.com/bfs/article/a2780975ccbf74c422dd7f0333af0172312276085.png" target="_blank" referrerpolicy="no-referrer">交互保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/144dac10d99a911648b9016c620fa49a312276085.png" target="_blank" referrerpolicy="no-referrer">回复保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/a3f0844195795fc7e51f947e689fd744312276085.png" target="_blank" referrerpolicy="no-referrer">批量保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/23e26c25d805e0d5d5d76958e5950d56312276085.png" target="_blank" referrerpolicy="no-referrer">中间件批量保存图片</a></li>



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
<h3>1️⃣ 交互保存（不指定路径，\`imageSaveMode\` 开启时）</h3>
<p>在开启 <code>imageSaveMode</code> 的情况下，插件会自动保存图片到 <code>savePaths</code> 配置的第一个路径，无需用户额外指定路径。</p>
<p><strong>指令示例：</strong></p>
<pre><code>保存图片 文件名</code></pre>
<ul>
<li>用户发送图片后，插件会直接保存到默认路径。</li>
<li>如果没有设置默认路径，会提示错误 <strong>没有设置默认保存路径</strong>。</li>
</ul>

<h3>2️⃣ 交互保存（指定路径，\`imageSaveMode\` 开启时）</h3>
<p>在 <code>imageSaveMode</code> 开启时，用户仍可指定路径。如果路径无效，插件会提示重新选择。</p>
<p><strong>指令示例：</strong></p>
<pre><code>保存图片 文件名 路径名称</code></pre>
<ul>
<li>插件会检查路径名称是否匹配 <code>savePaths</code> 中的配置。</li>
<li>如果匹配成功，直接保存到对应路径。</li>
<li>如果匹配失败，与用户交互重新选择路径。</li>
</ul>

<h3>3️⃣ 回复交互保存</h3>
<p>当用户回复一条包含图片的消息，并使用 <code>保存图片</code> 指令时，插件会提取回复消息中的图片进行保存。</p>
<p><strong>指令示例：</strong></p>
<pre><code>保存图片 文件名</code></pre>
<ul>
<li>如果 <code>imageSaveMode</code> 开启，图片将保存到默认路径。</li>
<li>如果未开启，则与用户交互选择路径。</li>
</ul>

<h3>4️⃣ 批量保存</h3>
<p>插件支持批量保存多张图片，但需要在配置中启用 <code>checkDuplicate</code> 选项。</p>
<p><strong>指令示例：</strong></p>
<pre><code>保存图片 文件名 -e png</code></pre>
<ul>
<li>批量保存时，所有图片会被自动重命名，避免重复。</li>
<li>如果未启用 <code>checkDuplicate</code>，一次只允许保存一张图片。</li>
</ul>

<h3>5️⃣ 中间件监听保存</h3>
<p>通过配置中间件监听，插件可以实时保存满足条件的图片消息。</p>
<ul>
<li>自动提取图片消息并保存到默认路径。</li>
<li>适合监控群聊、频道等图片流量大的场景。</li>
</ul>

<h2>⚙️ 配置项说明</h2>

<h3><code>defaultImageExtension</code></h3>
<p><strong>说明：</strong>图片默认保存的格式后缀，不需要填写 <code>.</code>，例如 <code>png</code> 或 <code>jpg</code>。</p>
<p><strong>默认值：</strong> <code>png</code></p>

<h3><code>imageSaveMode</code></h3>
<p><strong>说明：</strong>是否启用多路径选择功能。</p>
<ul>
<li><strong>开启时：</strong>图片保存到 <code>savePaths</code> 的第一个路径。</li>
<li><strong>关闭时：</strong>用户可以交互选择保存路径。</li>
</ul>
<p><strong>默认值：</strong> <code>false</code></p>

<h3><code>savePaths</code></h3>
<p><strong>说明：</strong>配置路径映射关系。用户输入路径名称即可对应保存到指定路径。</p>
<pre><code>
[
{ "name": "默认路径", "path": "E:\\Images\\Default" },
{ "name": "表情包", "path": "E:\\Images\\Memes" }
]
</code></pre>

<h3><code>checkDuplicate</code></h3>
<p><strong>说明：</strong>是否启用重名检查。</p>
<ul>
<li><strong>启用时：</strong>自动为重名文件生成唯一名称。</li>
<li><strong>禁用时：</strong>仅允许保存一张图片。</li>
</ul>
<p><strong>默认值：</strong> <code>false</code></p>

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
    consoleinfo: Schema.boolean().default(false).description('日志调试模式')
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
      }
    }
  };
  ctx.i18n.define("zh-CN", applyI18nresult);
  ctx.command('保存图片 [文件名] [路径名称] [图片]')
    .option('ext', '-e <ext:string>', '指定图片后缀名')
    .option('name', '-n <name:string>', '严格指定文件重命名')
    .action(async ({ session, options }, 文件名, 路径名称, 图片) => {
      const quotemessage = session.quote?.content;
      let urlhselect;
      loggerinfo('session.content： ' + session.content);

      // 处理图片源
      if (quotemessage) {
        // 回复保存图片
        urlhselect = h.select(quotemessage, 'img').map(item => item.attrs.src);
        if (!urlhselect) {
          await session.send(session.text(".image_save_notfound_image"))
          return;
        }
        loggerinfo('触发回复的目标消息内容： ' + quotemessage);
      } else if (图片) {
        // 用户直接输入图片
        urlhselect = h.select(图片, 'img').map(item => item.attrs.src);
        if (!urlhselect) {
          await session.send(session.text(".image_save_notfound_image"))
          return;
        }
        loggerinfo('用户直接输入的图片内容为： ' + urlhselect);
      } else {
        // 交互保存图片
        await session.send(session.text(".image_save_waitinput"))
        const image = await session.prompt(30000);
        urlhselect = h.select(image, 'img').map(item => item.attrs.src);
        if (!urlhselect) {
          //return '无法提取图片URL。';
          await session.send(session.text(".image_save_invalidimage"))
          return;
        }
        loggerinfo('用户输入： ' + image);
      }

      const imageExtension = options.ext || config.defaultImageExtension;
      if (urlhselect.length > 1 && !config.checkDuplicate) {
        // return '未开启重名检查时不允许一次性输入多张图片。';
        await session.send(session.text(".image_save_path_select_prompt"))
        return;
      }

      // 选择保存路径
      let selectedPath;

      // 处理路径名称
      if (路径名称) {
        // 移除尖括号及其内容
        路径名称 = 路径名称.replace(/<.*?>/g, '').trim(); // adapter-onebot 特性，可能会把回复的内容当做输入参数，跟在输入最后面
        if (路径名称.length <= 1) {
          // 如果长度小于等于 1，认为路径名称无效
          路径名称 = undefined;
        } else {
          loggerinfo('路径名称： ' + 路径名称);
        }
      }

      if (config.imageSaveMode) {
        // 如果开启了 imageSaveMode
        if (路径名称) {
          // 查找路径名称是否匹配
          const selected = config.savePaths.find(item => item.name === 路径名称);
          if (!selected) {
            // 如果未找到匹配路径，与用户交互选择路径
            await session.send(session.text("image_save_path_invalid") + '\n' + config.savePaths.map(item => `${item.name}: ${item.path}`).join('\n'));
            const input = await session.prompt(30000);
            const selected = config.savePaths.find(item => item.name === input);
            if (!selected) return session.text(".image_save_notselected");
            selectedPath = selected.path;
          } else {
            // 如果找到匹配路径，使用用户指定的路径
            selectedPath = selected.path;
          }
        } else {
          // 路径名称无效，默认使用第一个路径
          selectedPath = config.savePaths[0]?.path;
          if (!selectedPath) return session.text(".image_save_no_defaultpath");
        }
      } else {
        // 如果未开启 imageSaveMode
        if (路径名称) {
          // 查找路径名称是否匹配
          const selected = config.savePaths.find(item => item.name === 路径名称);
          if (!selected) {
            // 如果未找到匹配路径，与用户交互选择路径
            await session.send(session.text(".image_save_path_invalid") + '\n' + config.savePaths.map(item => `${item.name}: ${item.path}`).join('\n'));
            const input = await session.prompt(30000);
            const selected = config.savePaths.find(item => item.name === input);
            if (!selected) return session.text(".image_save_notselected");
            selectedPath = selected.path;
          } else {
            // 如果找到匹配路径，使用用户指定的路径
            selectedPath = selected.path;
          }
        } else {
          // 路径名称无效，与用户交互选择路径
          await session.send(session.text("image_save_path_invalid") + '\n' + config.savePaths.map(item => `${item.name}: ${item.path}`).join('\n'));
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




  async function saveImages(urls, selectedPath, safeFilename, imageExtension, config, session, ctx) {
    let firstMessageSent = false;
    let duplicateMessages = [];

    for (let i = 0; i < urls.length; i++) {
      let url = urls[i];
      let fileRoot = path.join(selectedPath, safeFilename);
      let fileExt = `.${imageExtension}`;
      let targetPath = `${fileRoot}${fileExt}`;
      let index = 0;

      loggerinfo('提取到的图片链接：' + url);

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
          //duplicateMessages.push(`出现同名文件，已保存为 ${safeFilename}(${index})${fileExt}`);
          duplicateMessages.push(session.text(`.image_save_rename`, [safeFilename, index, fileExt]));
        } else {
          if (!firstMessageSent) {
            if (config.showSavePath) {
              //await session.send(`图片已保存到：${targetPath}`);
              await session.send(session.text(`.image_save_location`, [targetPath]));
            } else {
              //await session.send(`图片已成功保存。`);
              await session.send(session.text(`.image_save_success`));
            }
            firstMessageSent = true;
          }
        }
      } catch (error) {
        ctx.logger.error('保存图片时出错： ' + error.message);
        await session.send(session.text(`.image_save_error`, [error.message]));
        // await session.send(`保存图片时出错：${error.message}`);
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
    ctx(`Error creating directory: ${error}`);
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