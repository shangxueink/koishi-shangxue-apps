"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { Schema, Logger, h } = require("koishi");
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const logger = new Logger('image-save-path');
//exports.usage = ` `;
exports.usage = ` 
<p><strong>配置项说明：</strong></p>
<p><strong>交互保存图片 指令：</strong>用于触发后接收图片来保存。</p>
<p><strong>回复保存图片 指令：</strong>用于保存被回复的图片（机器人未接收到的图片就存不了）。</p>
<p><code>defaultImageExtension</code>无需填写<code>点</code>，只需要写<code>png</code>或者<code>jpg</code>等。</p>
<p><code>imageSaveMode</code>控制是否启用<code>多路径选择</code>的功能。开启后仅会保存到<code>savePaths</code>的第一行的路径</p>
<p><code>savePaths</code>用于映射路径，控制台填写名称和对应的具体路径。请仿照默认的路径<code>E:\\Music\\nums</code>来填写</p>
<p>用户交互时，仅需输入左侧的<code>name</code>，而无需输入完整的<code>path</code>内容。</p>
<p>两个指令都有<code>-e</code>和<code>-n</code>选项，使用示例<code>指令名称 路径序号 -n 文件名 -e webp</code></p>
<p>你也可以直接使用<code>指令名称 路径序号 文件名</code>来快速触发保存</p>
<p>不支持同时保存多张图片</p>
</div>

<p>详细使用方法请参考 <a href="https://www.npmjs.com/package/koishi-plugin-image-save-path">本项目的README说明（点我查看）</a></p>
<p>目前经测试支持Windows操作系统，其他的不知道呢~</p>

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
    imageSaveMode: Schema.boolean().description("开启后不进行路径选择交互，而直接保存到下方配置项的`savePaths`的第一行映射路径").default(false),
    showSavePath: Schema.boolean().description("保存成功后，告知具体文件保存路径，关闭后只会回复`图片已成功保存。`").default(false),
    checkDuplicate: Schema.boolean().description("开启后将检查重名文件，避免覆盖，若同名，则在文件名后加`(1)`,`(2)`... ...").default(true),
    savePaths: Schema.array(Schema.object({
      name: Schema.string(),
      path: Schema.string(),
    })).role('table').description('用于设置图片保存路径的名称和地址映射').default([{ name: "1", path: "C:\\Program Files" }, { name: "2", path: "E:\\Music\\nums" }]),

  }).description('基础设置'),

  Schema.object({
    autosavePics: Schema.boolean().description("自动保存 的总开关 `如需查看详情日志，请开启consoleinfo配置项`").default(false),
    count: Schema.number().default(2).description('触发自动保存的重复阈值。`某个图片重复出现该次数后，自动保存`'),
    groupListmapping: Schema.array(Schema.object({
      enable: Schema.boolean().description('勾选后才启用该群 的自动保存'),
      groupList: Schema.string().description('开启自动保存图片的群组ID').pattern(/^\S+$/),
      defaultsavepath: Schema.string().description('保存到的文件夹的绝对路径'),
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
    consoleinfo: Schema.boolean().default(false).description('日志调试模式')
  }).description('进阶设置'),
])


async function saveImages(urls, selectedPath, safeFilename, imageExtension, config, session, ctx) {
  for (let i = 0; i < urls.length; i++) {
    let url = urls[i];
    let fileRoot = path.join(selectedPath, safeFilename);
    let fileExt = `.${imageExtension}`;
    let targetPath = `${fileRoot}${fileExt}`;
    let index = 0; // 用于记录尝试的文件序号

    if (config.consoleinfo) {
      logger.info('提取到的图片链接：' + url);
    }

    if (config.checkDuplicate) {
      while (fs.existsSync(targetPath)) {
        index++; // 文件存在时，序号递增
        targetPath = `${fileRoot}(${index})${fileExt}`; // 更新目标文件路径
      }
    }
    // 下载并保存图片
    try {
      const buffer = await ctx.http.get(url);
      //logger.info('Downloaded ArrayBuffer size:', buffer.byteLength);
      if (buffer.byteLength === 0) throw new Error('下载的数据为空');
      await fs.promises.writeFile(targetPath, Buffer.from(buffer));

      // 根据是否存在重名文件发送不同消息
      if (index > 0) {
        // 文件名有修改，包含序号
        await session.send(`出现同名文件，已保存为 ${safeFilename}(${index})${fileExt}`);
      } else {
        // 未发现重名，直接保存
        if (config.showSavePath) {
          await session.send(`图片已保存到：${targetPath}`);
        } else {
          await session.send(`图片已成功保存。`);
        }

      }
    } catch (error) {
      logger.info('保存图片时出错： ' + error.message);
      await session.send(`保存图片时出错：${error.message}`);
    }
  }
}


function apply(ctx, config) {
  ctx.command('image-save-path')
  ctx.command('image-save-path/交互保存图片 [name:string] [filename:string]', '交互性地保存图片到指定路径')
    .alias('save-path')
    .option('ext', '-e <ext:string>', '指定图片后缀名')
    .option('name', '-n <name:string>', '严格指定文件重命名')
    .action(async ({ session, options }, name, filename) => {
      let selectedPath;
      // 如果开启快速保存，则直接使用第一个保存路径
      if (config.imageSaveMode) {
        // 开启快速保存
        selectedPath = config.savePaths[0]?.path;
        if (!selectedPath)
          return '没有设置默认保存路径。';

        // 开启了快速保存还想指定路径，行为逻辑不合的提醒词
        if (name) {
          return '路径指定无效。请关闭 imageSaveMode 配置项。';
        }
      } else {
        // 选择或验证路径
        if (!name) {
          await session.send('请选择路径的序号：\n' + config.savePaths.map(item => `${item.name}: ${item.path}`).join('\n'));
          const input = await session.prompt(30000);
          const selected = config.savePaths.find(p => p.name === input);
          if (!selected) return '请选择正确的路径。';
          selectedPath = selected.path;
        } else {
          const selected = config.savePaths.find(p => p.name === name);
          if (!selected) return '不存在的路径，请重新选择。';
          selectedPath = selected.path;
        }
      }
      // 文件名处理
      let safeFilename;
      if (options.name) {
        // 如果启用了 -n 选项，则使用用户提供的文件名
        safeFilename = options.name;
      } else if (!filename) {
        // 如果未指定文件名，则生成默认文件名，是【年-月-日-小时-分】
        const date = new Date();
        safeFilename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
      } else {
        // 使用用户指定的文件名
        safeFilename = filename;
      }
      // 处理中文文件名，之前搞错了
      const imageExtension = options.ext || config.defaultImageExtension;
      safeFilename = safeFilename.replace(/[\u0000-\u001f\u007f-\u009f\/\\:*?"<>|]/g, '_'); // 移除不安全字符
      // 获取图片
      await session.send('请发送图片：');
      const image = await session.prompt(30000);

      if (config.consoleinfo) {
        logger.info('用户输入： ' + image);
      }
      const urlhselect = h.select(image, 'img').map(item => item.attrs.src);
      // 新增的逻辑检查
      if (urlhselect.length > 1 && !config.checkDuplicate) {
        return '未开启重名检查时不允许一次性输入多张图片。';
      }
      if (!urlhselect)
        return '无法提取图片URL。';
      // 调用 saveImages 函数保存图片
      try {
        await saveImages(urlhselect, selectedPath, safeFilename, imageExtension, config, session, ctx);
      } catch (error) {
        return `保存图片时出错：${error.message}`;
      }
    });

  ctx.command('image-save-path/回复保存图片 [pathName] [filename] ', '回复图片以保存到指定路径', { authority: 2 }) //回复保存图片
    .alias('save-card')
    .option('ext', '-e <ext:string>', '指定图片后缀名')
    .option('name', '-n <name:string>', '严格指定文件重命名')
    .usage('示例：回复一条含有图片的消息并保存“save-card [pathName] [filename]”')
    .action(async ({ session, options }, pathName, filename) => {
      const quotemessage = session.quote.content;
      const urlhselect = h.select(quotemessage, 'img').map(item => item.attrs.src);
      const imageExtension = options.ext || config.defaultImageExtension;
      if (!quotemessage) {
        return '请回复带有图片的消息（可能是图片发出在本次启动机器人之前哦~）';
      }
      if (config.consoleinfo) {
        logger.info('触发回复的目标消息内容： ' + session.quote.content);
      }
      // 选择保存路径
      let selectedPath;
      if (config.imageSaveMode) {
        // 如果开启了快速保存模式，则直接使用第一个设置的映射路径
        selectedPath = config.savePaths[0]?.path;
        if (!selectedPath)
          return '没有设置默认保存路径。';
        // 开启了快速保存还想指定路径，行为逻辑不合的提醒词
        if (pathName && !pathName.includes(urlhselect[0])) {
          return '路径指定无效。请关闭 imageSaveMode 配置项。';
        }
      } else if (pathName) {
        // 如果提供了路径名称，则查找对应的路径                    
        if (pathName.includes(urlhselect[0])) {
          // 选择或验证路径
          await session.send('请选择路径的序号：\n' + config.savePaths.map(item => `${item.name}: ${item.path}`).join('\n'));
          const input = await session.prompt(30000);
          const selected = config.savePaths.find(p => p.name === input);
          if (!selected) return '请选择正确的路径。';
          selectedPath = selected.path;
        } else {
          const selected = config.savePaths.find(p => p.name === pathName);
          if (!selected) return '请选择正确的路径。';
          selectedPath = selected.path;
        }
      } else {
        await session.send('缺失路径选择！请输入pathName重试，或开启 imageSaveMode 配置项。');
      }
      let safeFilename;
      // 处理文件名                
      if (options.name) {
        // 如果启用了 -n 选项，则使用用户提供的文件名
        safeFilename = options.name;
      } else if (!filename || filename.includes(urlhselect[0])) {
        // 如果未指定文件名，则生成默认文件名，是【年-月-日-小时-分】
        const date = new Date();
        safeFilename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
      } else {
        // 使用用户指定的文件名
        safeFilename = filename;
      }
      safeFilename = safeFilename.replace(/[\u0000-\u001f\u007f-\u009f\/\\:*?"<>|]/g, '_'); // 移除不安全字符
      // 新增的逻辑检查
      if (urlhselect.length > 1 && !config.checkDuplicate) {
        return '未开启重名检查时不允许一次性输入多张图片。';
      }

      if (!urlhselect)
        return '无法提取图片消息。';
      // 调用 saveImages 函数保存图片
      try {
        await saveImages(urlhselect, selectedPath, safeFilename, imageExtension, config, session, ctx);
      } catch (error) {
        logger.info('保存图片时出错： ' + error.message);
        return `保存图片时出错：${error.message}`;
      }
    });



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
      logger.error(`读取或解析哈希记录文件失败: ${error.message}`);
    }
    return {};
  }


  function saveHashRecords(filePath, records) {
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
  }

  //const hashRecordPath = path.join(__dirname, 'image-hash-records.json');
  const root = path.join(ctx.baseDir, 'data', 'image-save-path');
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (error) {
    logger.error(`Error creating directory: ${error}`);
  }
  //const hashRecordPath = path.join(__dirname, 'image-hash-records.json');
  const hashRecordPath = path.join(ctx.baseDir, 'data', 'image-save-path', 'image-hash-records.json');

  async function downloadAndSaveImage(url, outputPath, ctx, hashRecords) {
    try {
      const buffer = await downloadImageBuffer(url, ctx);
      const tempPath = `${outputPath}.tmp`; // 创建临时文件路径
      await fs.promises.writeFile(tempPath, buffer); // 先写入临时文件
      const hash = await calculateHash(tempPath); // 计算哈希值
      if (!hashRecords[hash]) {
        hashRecords[hash] = { count: 0, path: "", saved: false };
      }
      hashRecords[hash].count++;
      if (hashRecords[hash].count >= config.count && !hashRecords[hash].saved) {
        const date = new Date();
        const preciseFilename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}-${String(date.getMilliseconds()).padStart(3, '0')}.png`;
        const finalPath = path.join(outputPath, preciseFilename); // 确定最终文件路径
        fs.renameSync(tempPath, finalPath); // 重命名临时文件为最终文件
        if (config.consoleinfo) {
          logger.info(`图片已保存到：${finalPath}`);
        }
        hashRecords[hash].path = finalPath;
        hashRecords[hash].saved = true; // 标记为已保存
      } else {
        fs.unlinkSync(tempPath); // 删除临时文件
      }
      saveHashRecords(hashRecordPath, hashRecords); // 更新记录
    } catch (error) {
      logger.error(`处理图片失败：${error}`);
    }
  }


  async function downloadImageBuffer(url, ctx) {
    const response = await ctx.http.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response);
  }

  if (config.autosavePics && config.groupListmapping.length) {
    // 中间件
    ctx.middleware(async (session, next) => {
      const channelId = session.channelId;
      let groupConfig = config.groupListmapping.find(group => group.groupList === channelId && group.enable);
      if (!groupConfig) {
        return next();
      }
      const userMessagePic = session.content;
      const imageLinks = h.select(userMessagePic, 'img').map(item => item.attrs.src);
      if (config.consoleinfo && imageLinks.length > 0) {
        logger.info(`收到图片消息：  \n${userMessagePic}\n提取到链接：  \n${imageLinks}`);
      }
      if (!imageLinks.length) {
        return next();
      }

      const hashRecords = loadHashRecords(hashRecordPath);
      for (const link of imageLinks) {
        await downloadAndSaveImage(link, groupConfig.defaultsavepath, ctx, hashRecords);
      }
      return next();
    });
  }

}

exports.apply = apply;