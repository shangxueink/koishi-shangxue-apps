"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi = require("koishi");
const fs = require('node:fs');
const path_1 = require("node:path");
const express = require('express');

const app = express();

exports.name = 'publish-by-shangxue';

exports.usage = `
<div class="shangxuepub-container">
  <p>
    <br>这是一个由上学发布的插件，它可以让插件市场的插件看起来都是上学开发的</br>
    <h3>修改 'market' 插件中的 'search.endpoint' 设置</h3>
    在默认端口的情况下，使用<span class="shangxuepub-command" onClick="navigator.clipboard.writeText('http://localhost:13579/')">这个search.endpoint</span>，作为'market' 插件中的 'search.endpoint'就可以啦
    <h2>点击上方标签，就成功复制了地址，现在去粘贴吧~</h2>
    <h3>填入，重载market插件，可以了！</h3>
    <h4>---</h4>
    <h4>请注意，由于端口占用问题，每次重载插件 都需要重启koishi才能生效</h4>
    <h4>---</h4>
    <br>我们还在这里收录了一些十分好用的，可用于'market' 插件中的 'search.endpoint'的地址：（点击 即复制！）</br>
    <br><span class="shangxuepub-command" onClick="navigator.clipboard.writeText('https://registry.koishi.t4wefan.pub/index.json')">https://registry.koishi.t4wefan.pub/index.json</span></br>
    <br><span class="shangxuepub-command" onClick="navigator.clipboard.writeText('https://koi.nyan.zone/registry/index.json')">https://koi.nyan.zone/registry/index.json</span></br>
    <br><span class="shangxuepub-command" onClick="navigator.clipboard.writeText('https://koishi.itzdrli.com')">https://koishi.itzdrli.com</span></br>
    <br>如果你哪天不想用了，可以改回官方源：</br>
    <br><span class="shangxuepub-command" onClick="navigator.clipboard.writeText('https://registry.koishi.chat/index.json')">https://registry.koishi.chat/index.json</span></br>
  </p>
  <style>
    .shangxuepub-command {
      cursor: pointer;
      color: white;
      background-color: #4CAF50;
      padding: 5px 10px;
      border-radius: 4px;
      font-family: 'Arial', sans-serif;
    }
    .shangxuepub-command:hover {
      background-color: #45a049;
    }
  </style>
</div>
`;

exports.Config = koishi.Schema.object({
  MarketSearchEndpoint: koishi.Schema.string().description('一个你可以访问的插件市场源').role('link').default('https://registry.koishi.chat/index.json'),
  autoUpdateInterval: koishi.Schema.number().description('自动更新时间间隔（分钟）').default(30),
  serverport: koishi.Schema.number().description('运行端口').default('13579'),
  maintainer: koishi.Schema.array(koishi.Schema.object({
    name: koishi.Schema.string(),
    email: koishi.Schema.string()    
    })).default([
      //{ email: "", name: "" }, 
      //{ email: "thoe9008@outlook.com", name: "sparkuix" }, 
      { email: "1919892171@qq.com", name: "shangxue" },
    ]).description('在这里填入你想要的作者们的用户名和邮箱`邮箱对应即可，昵称随意`').role('table'),
  
  verified: koishi.Schema.boolean().description("`开启后`全部标记为`官方认证`,`关闭后`全部标记为`非官方认证`   若要取消应用，请恢复默认值"),
  insecure: koishi.Schema.boolean().description("`开启后`全部标记为`不安全`,`关闭后`全部标记为`安全`  若要取消应用，请恢复默认值"),
  
  preview: koishi.Schema.boolean().description("`开启后`全部标记为`开发中`,`关闭后`全部不标记为开发中  若要取消应用，请恢复默认值"),
  newcreated: koishi.Schema.boolean().description("`开启后`全部标记为`最近新增`,`关闭后`全部不标记为最近新增  若要取消应用，请恢复默认值"),

  rating: koishi.Schema.number().role('slider').min(-0.1).max(5).step(0.1).default(-0.1)
  .description("全部插件的分数 `取 -0.1 ，则取消应用`"),

});


// 更新市场数据
async function updateMarketData(ctx, Config) {
  try {
    const response = await ctx.http.get(Config.MarketSearchEndpoint);
    response.objects.forEach(obj => {
      if (Config.verified !== undefined ) obj.verified = Config.verified;
      if (Config.insecure !== undefined ) obj.insecure = Config.insecure;
        if (Config.newcreated !== undefined) {
            const timePart = obj.createdAt.slice(11);  
            if (Config.newcreated) {
                const currentDate = new Date().toISOString().slice(0, 10);  // 当前日期
                obj.createdAt = currentDate + timePart; 
            } else {
                const lastYearDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10);  // 一年前的日期
                obj.createdAt = lastYearDate + timePart;  
            }
        }
      if (Config.rating !== undefined && Config.rating >= 0 && Config.rating <= 5) { obj.rating = Config.rating; }
      if (Config.preview !== undefined) {
          obj.preview = Config.preview; 
          // 确保 manifest 对象存在，且同步更新 manifest 下的 preview 属性
          if (!obj.manifest) {
              obj.manifest = {};
          }
          obj.manifest.preview = Config.preview;
      }
      if (Array.isArray(obj.package.maintainers)) {        
        obj.package.maintainers = updateMaintainers(obj.package.maintainers, Config.maintainer);
      }
  });

    //ctx.logger.error('插件市场获取数据成功');
    return JSON.stringify(response);
  } catch (err) {
    ctx.logger.error('无法从市场源获取数据', err);
  }
}


/*
// 测试时使用
// 从本地 JSON 文件读取插件市场数据
async function updateMarketData(ctx, Config) {
  try {
      // 使用 fs.readFileSync 从本地文件系统读取数据
      const filePath = path_1.join(__dirname, 'market.json');
      const data = fs.readFileSync(filePath, 'utf8'); 
      const response = JSON.parse(data);

      response.objects.forEach(obj => {
          if (Config.verified !== undefined ) obj.verified = Config.verified;
          if (Config.insecure !== undefined ) obj.insecure = Config.insecure;
            if (Config.newcreated !== undefined) {
                const timePart = obj.createdAt.slice(11);  
                if (Config.newcreated) {
                    const currentDate = new Date().toISOString().slice(0, 10);  // 当前日期
                    obj.createdAt = currentDate + timePart;  // 组合当前日期和原有时间部分
                } else {
                    const lastYearDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10);  // 一年前的日期
                    obj.createdAt = lastYearDate + timePart;  // 组合一年前的日期和原有时间部分
                }
            }
          if (Config.rating !== undefined && Config.rating >= 0 && Config.rating <= 5) { obj.rating = Config.rating; }
          if (Config.preview !== undefined) {
              obj.preview = Config.preview; 
              // 确保 manifest 对象存在，且同步更新 manifest 下的 preview 属性
              if (!obj.manifest) {
                  obj.manifest = {};
              }
              obj.manifest.preview = Config.preview;
          }
          if (Array.isArray(obj.package.maintainers)) {        
            obj.package.maintainers = updateMaintainers(obj.package.maintainers, Config.maintainer);
          }
      });

      ctx.logger.info('插件市场获取数据成功');
      return JSON.stringify(response);
  } catch (err) {
      ctx.logger.error('无法从市场源获取数据', err);
  }
}

*/

function updateMaintainers(maintainers, configMaintainers) {
  const configMaintainerMap = new Map(configMaintainers.map(m => [m.email, m.name]));
  const currentMaintainerMap = new Map(maintainers.map(m => [m.email, m.username]));

  maintainers = maintainers.filter(m => configMaintainerMap.has(m.email));

  configMaintainers.forEach(maintainer => {
    if (!currentMaintainerMap.has(maintainer.email)) {
      maintainers.push({ username: maintainer.name, email: maintainer.email });
    } else if (currentMaintainerMap.get(maintainer.email) !== maintainer.name) {
      const foundIndex = maintainers.findIndex(m => m.email === maintainer.email);
      maintainers[foundIndex].username = maintainer.name;
    }
  });

  return maintainers;
}


async function apply(ctx, Config) {
  app.get('/', async (req, res) => {
    try {
      const data = await updateMarketData(ctx, Config);
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    } catch (err) {
      res.status(500).send('无法从市场源获取数据');
    }
  });

  const port = Config.serverport;
  app.listen(port, () => {
    ctx.logger.info(`Market Server is running on http://localhost:${port}`);

    setInterval(() => {
      updateMarketData(ctx, Config).catch(err => {
        ctx.logger.error('定时更新失败', err);
      });
    }, Config.autoUpdateInterval * 60 * 1000); 
  }).on('error', (error) => {
    ctx.logger.error(`Market Server failed to start on http://localhost:${port}`, error);
  });
}

exports.apply = apply;