"use strict";
const koishi = require("koishi");
const koishi_1 = require("koishi");
const logger = new koishi_1.Logger('baidu-image-search');
exports.name = 'baidu-image-search';
//exports.usage = ``;
exports.Config = koishi_1.Schema.object({
  logModeChangeAPI: koishi_1.Schema.boolean().default(false).description('日志调试模式开关'),
}).description('基础设置');

var zh_CN_default = { 
  commands: { 
      "baidu-search": { 
          description: "进行百度图片搜索", 
          messages: {
              "expect_text": "请输入要搜索的关键词。",
              "searching": "正在搜索，请稍候...",
              "search_result": "搜索结果：",
              "search_nullresult": "搜索不到哦~",
              "search_failed": "图片获取失败，请稍后重试。",
              "search_backup": "接口错误。尝试备用接口搜索......"
          }
      },
      "sogou-search": { 
        description: "进行搜狗图片搜索", 
        messages: {
            "expect_text": "请输入要搜索的关键词。",
            "searching": "正在搜索，请稍候...",
            "search_result": "搜索结果：",
            "search_nullresult": "搜索不到哦~",
            "search_failed": "图片获取失败，请稍后重试。",
            "search_backup": "接口错误。尝试备用接口搜索......"
        }
    },
    "duitang-search": { 
      description: "进行堆糖图片搜索", 
      messages: {
          "expect_text": "请输入要搜索的关键词。",
          "searching": "正在搜索，请稍候...",
          "search_result": "搜索结果：",
          "search_nullresult": "搜索不到哦~",
          "search_failed": "图片获取失败，请稍后重试。",
          "search_backup": "接口错误。尝试备用接口搜索......"
        }
    } 

    /*,
    "360-search": { 
      description: "进行360图片搜索", 
      messages: {
          "expect_text": "请输入要搜索的关键词。",
          "searching": "正在搜索，请稍候...",
          "search_result": "搜索结果：",
          "search_nullresult": "搜索不到哦~",
          "search_failed": "图片获取失败，请稍后重试。",
          "search_backup": "接口错误。尝试备用接口搜索......"
      }
  },
  */
  } 
};


async function apply(ctx, config) {
  ctx.i18n.define("zh-CN", zh_CN_default);

  ctx.command('image-search/baidu-search [keyword]')
     .alias('百度搜图')
     .action(async ({ session }, keyword) => {
      if (!keyword) {
        // 如果没有提供关键词，生成一个两个字母的随机关键词
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        keyword = Array.from({ length: 2 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
      }

      const url1 = `https://api.suyanw.cn/api/baidu_image_search.php?msg=${encodeURIComponent(keyword)}&type=json`;
      try {
        const response1 = await ctx.http(url1);
        if (response1.status === 200 && response1.data.code === 1 && response1.data.data && response1.data.data.length > 0) {
          const images = response1.data.data;
          const imageIndex = Math.floor(Math.random() * images.length);
          const imageUrl = koishi.h.image(images[imageIndex].imageurl);
          await session.send(imageUrl);
        } else {
          if (config.logModeChangeAPI) {
            logger.error('目标地址url:  ', url1);
            logger.error('Error with default API:  ', error);
            logger.error(session.text(".search_backup"));
          }
          await tryBackupApi(session, keyword);
        }
      } catch (error) {
        if (config.logModeChangeAPI) {          
          logger.error('Error with default API:  ', error);
          logger.error(session.text(".search_backup"));
        }
        await tryBackupApi(session, keyword, config); // 将配置传递给备用API
      }
    });

  // 备用API逻辑
  async function tryBackupApi(session, keyword) {
    const url2 = `https://api.52vmy.cn/api/img/baidu?msg=${encodeURIComponent(keyword)}`;
    try {
      const response2 = await ctx.http(url2);
      if (response2.status === 200 && response2.data.code === 200) {
        const imageUrl = koishi.h.image(response2.data.data.url);
        await session.send(imageUrl);
      } else if (response2.status === 200 && response2.data.code === 201) {
        await session.send(session.text(".search_nullresult"));
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      if (config.logModeChangeAPI) { 
        logger.error('Error with backup API:', error);
      }
      await session.send(session.text(".search_failed"));
    }
  }



  ctx.command('image-search/sogou-search <keyword>').alias('搜狗搜图')
    .action(async ({ session }, keyword) => {
      const url = `https://api.lolimi.cn/API/sgst/api.php?msg=${encodeURIComponent(keyword)}`;

      try {
        const response = await ctx.http(url);
        if (response.status === 200 && response.data.code === 1 && response.data.data) {
          const imageUrl = response.data.data.url;
          return koishi.h.image(imageUrl);
        } else {
          await session.send(session.text(".search_failed"));
        }
      } catch (error) {
        if (config.logModeChangeAPI) { 
          logger.error('Error with backup API:', error);
        }
        await session.send(session.text(".search_failed"));
      }
    });

    
    ctx.command('image-search/duitang-search <keyword>').alias('堆糖搜图')
    .action(async ({ session }, keyword) => {
        const url = `https://api.suyanw.cn/api/duitang.php?msg=${encodeURIComponent(keyword)}`;
        try {
            const response = await ctx.http.get(url);
            if (config.logModeChangeAPI) { 
            logger.error('API response:', response);
            }
            const matchimageurl = response.match(/"images":\s*"([^"]+)"/);
            if (matchimageurl && matchimageurl[1]) {
                await session.send(koishi.h.image(matchimageurl[1]));
            } else {
                // 如果没有找到有效的图片URL
                await session.send(session.text(".search_nullresult"));
            }
        } catch (error) {
            logger.error('Error fetching image:', error);
            await session.send(session.text(".search_failed"));
        }
    });
    
    


/*  API失效
  ctx.command('image-search/360-search [keyword]')
    .action(async ({ session }, keyword) => {
      if (!keyword) {
        // 如果没有提供关键词，生成一个两个字母的随机关键词
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        keyword = Array.from({ length: 2 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
      }

      const url = `http://luck.klizi.cn/api/picsearch.php?type=360&msg=${encodeURIComponent(keyword)}`;

      try {
        const response = await ctx.http(url);
        if (response.status === 200 && response.data.code === "200" && response.data.list && response.data.list.length > 0) {
          // 从返回的图片列表中随机选择一张图片的URL进行返回
          const imageIndex = Math.floor(Math.random() * response.data.list.length);
          const imageUrl = koishi.h.image(response.data.list[imageIndex].url);
          await session.send(imageUrl);
        } else {
          // 如果没有找到图片或者其他原因导致获取图片失败
          await session.send('未找到相关图片，请尝试其他关键词搜索。');
        }
      } catch (error) {
        if (config.logModeChangeAPI) { // 使用配置项来决定是否输出日志
          logger.error('请求API失败:', error);
        }
        await session.send('图片获取失败，请稍后重试。');
      }
    });


*/

}




exports.apply = apply;