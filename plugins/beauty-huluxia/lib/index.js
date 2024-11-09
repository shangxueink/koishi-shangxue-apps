"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");
const logger = new Logger('beauty-huluxia');
exports.name = "beauty-huluxia";
exports.usage = "获取随机🥰葫芦侠美女、黑丝、白丝、淘宝买家秀、coser、jk、二次元色图、帅哥、风景、AI的 图片";

exports.usage = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron&display=swap');
body {
  background: #000;
  overflow: hidden;
  margin: 0;
  padding: 0;
  height: 100vh;
  perspective: 1000px;
}
.text.beauty-huluxia {
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Orbitron', sans-serif;
  color: #fff;
  position: relative;
  font-size: 4em;
  text-transform: uppercase;
  animation: floating 3s infinite;
}
.text.beauty-huluxia::before, .text.beauty-huluxia::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, #fff, transparent);
  mix-blend-mode: difference;
  animation: stripes 2s linear infinite;
}
.text.beauty-huluxia::after {
  animation-delay: 1s;
}
@keyframes floating {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-20px, -20px, 50px); }
}
@keyframes stripes {
  100% { background-position: 100vw 0; }
}
</style>

<div class="text beauty-huluxia">beauty-huluxia</div>


<h2>插件简介</h2>
<p><code>这是一个图片插件，可以随机获取各种好看的图片。</code></p>
<p>葫芦侠图片、黑丝、白丝、淘宝买家秀、各种coser、jk、帅哥、二次元、风景、AI的 图片</p>

<h2>使用提示</h2>
<p><code>似乎有些图发不出来哦，可能是404, 也可能是太色了哦~（被屏蔽 </code></p>
<p><code>如果用不了该插件，可以尝试更新gocq等插件。也很有可能是bot所在服务器的地域，API不支持访问哦\~</code></p>
<p><code>且用且珍惜</code></p>

`;
// exports.usage = ``;
exports.Config = Schema.intersect([
  Schema.object({
    helptipkey: Schema.boolean().description("文字提示开关").default(false),
    helptip: Schema.string().default('那我去找图啦~').description('找图的文字提示'),
    consoleinfo: Schema.boolean().description("日志调试模式").default(false),
  }).description('基础设置'),
]);

async function apply(ctx, Config) {
  ctx.command('beauty-huluxia');
  ctx.command('beauty-huluxia/mihoyo-pics');
  //ctx.command('beauty-huluxia/huluxia图片内容');
  ctx.command('beauty-huluxia/随机图片内容');

  ctx.command("随机图片内容/葫芦侠-清凉一夏")
    .action(async ({ session }) => {
      const apiUrl = 'http://lx.linxi.icu/API/meitui.php';
      return sendImageByAPI(session, apiUrl, Config);
    });
  ctx.command("随机图片内容/随机风景图")
    .action(async ({ session }) => {
      const apiUrl = 'http://api.sakura.gold/ksfjtp';
      return sendImageByAPI(session, apiUrl, Config);
    });
  ctx.command("随机图片内容/随机帅哥")
    .action(async ({ session }) => {
      const apiUrl = 'https://api.lolimi.cn/API/boy/api.php';
      return sendImageByAPI(session, apiUrl, Config);
    });
  /*
ctx.command("随机图片内容/二次元")
  .action(async ({ session }) => {
      const apiUrl = 'https://moe.jitsu.top/img/?sort=setu&size=mw1024';
      return sendImageByAPI(session, apiUrl, Config);
  })
      */
  ctx.command("随机图片内容/葫芦侠-三坑少女")
    .action(async ({ session }) => {
      const url = 'https://api.pearktrue.cn/api/beautifulgirl/?type=image';
      return sendImageByAPI(session, url, Config);
    });
  ctx.command("随机图片内容/随机jk图片")
    .action(async ({ session }) => {
      const url = 'https://api.suyanw.cn/api/jk';
      return sendImageByAPI(session, url, Config);
    });
  /*
  ctx.command("随机图片内容/随机美腿")
    .action(async ({ session }) => {
      const url = 'https://jkyapi.top/API/sjmtzs.php';
      return sendImageByAPI(session, url, Config);
    });      
    */
  ctx.command("随机图片内容/随机jk图片")
    .action(async ({ session }) => {
      const url = 'https://api.suyanw.cn/api/jk';
      return sendImageByAPI(session, url, Config);
    });

  ctx.command("随机图片内容/随机黑丝")
    .action(async ({ session }) => {
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      // 备用API
      const backupApiBaseUrl = 'https://api.sdbj.top/assets/api/heisi/';
      // 生成随机数，从001到259
      const randomNum = Math.floor(Math.random() * 259) + 1;
      // 将随机数格式化为三位字符串，例如：001, 010, 100
      const formattedNum = randomNum.toString().padStart(3, '0');
      const backupApiUrl = `${backupApiBaseUrl}${formattedNum}.jpg`;
      const urls = ['https://api.suyanw.cn/api/hs', backupApiUrl];
      for (const url of urls) {
        try {
          await ctx.http.get(url);
          if (Config.consoleinfo) {
            logger.info(url);
          }
          return h.image(url);
        } catch (error) {
          logger.error('API Error:', error.message);
        }
      }
      // 如果两个API都失败，返回错误消息
      return '接口无法访问，请稍后再试。';
    });
  ctx.command("随机图片内容/coser")
    .action(async ({ session }) => {
      const apiUrl = 'https://api.suyanw.cn/api/cos.php?type=json';
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      try {
        const responseString = await ctx.http.get(apiUrl);
        const imageUrlMatch = responseString.match(/"text":"(.*?)"/);
        if (imageUrlMatch && imageUrlMatch[1]) {
          const imageUrl = imageUrlMatch[1].replace(/\\/g, '').replace(/"$/, '');
          if (Config.consoleinfo) {
            logger.info(imageUrl);
          }
          return h.image(imageUrl);
        } else {
          return '获取coser图片失败，请稍后重试。';
        }
      } catch (error) {
        logger.error('Error fetching coser image URL:', error);
        return '获取coser图片失败，请稍后重试。';
      }
    });

  ctx.command('随机图片内容/pix-nyan [keyword:text]')
    .action(async ({ session }, keyword) => {
      let url = 'https://api.lolicon.app/setu/v2/';
      if (keyword) {
        // 如果用户提供了关键词，则在url中添加keyword查询参数
        url += `?keyword=${keyword}`;
      }
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      try {
        const response = await ctx.http.get(url);
        if (response.error || !response.data || !response.data.length) {
          return '没有找到图片，试试别的关键词吧。';
        }
        const imageData = response.data[0];
        const imageUrl = imageData.urls.original;
        const pid = imageData.pid;
        const tags = imageData.tags.join(', ');
        const author = imageData.author;
        if (Config.consoleinfo) {
          logger.info(imageUrl);
        }
        const imageSegment = h.image(imageUrl);
        const textSegment = `pid: ${pid}\nTags: ${tags}\nAuthor: ${author}`;
        return `${imageSegment}\n${textSegment}`;
      } catch (error) {
        logger.error('Error fetching image URL:', error);
        return '获取图片失败，请稍后重试。';
      }
    });

  /*
  ctx.command("随机图片内容/二次元-猫耳")
    .action(async ({ session }) => {
      if (Config.helptipkey) {
        await session.send(Config.helptip);
        }
    try {
    const responseString = await ctx.http.get('https://moe.jitsu.top/img/?sort=furry&type=json');
    const response = JSON.parse(responseString); // 将字符串解析为JSON对象
    if(response.code === 200 && response.pics.length > 0) {
      const imageUrl = response.pics[0].replace(/\\/g, ''); // 删除URL中的转义字符
      if (Config.consoleinfo) {
        logger.info(imageUrl);
        } 
      return h.image(imageUrl);
    } else {
      throw new Error('未找到有效的图片URL，请稍后重试。');
    }
    } catch (error) {
    logger.error('Error fetching image:', error.message);
    return '获取猫耳图片失败，请稍后重试。';
    }
  });
  */
  ctx.command("随机图片内容/随机白丝")
    .action(async ({ session }) => {
      const primaryUrl = 'https://acg.suyanw.cn/whitesilk/random.php';
      const backupUrl = 'https://api.asxe.vip/whitesilk.php';
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      try {
        const response = await ctx.http(primaryUrl, { responseType: 'arraybuffer' });
        if (Config.consoleinfo) {
          logger.info('API Response: ', response);
        }
        if (response.status === 200) {
          if (Config.consoleinfo) {
            logger.info(primaryUrl);
          }
          return h.image(primaryUrl);
        } else {
          throw new Error('Non-200 status code');
        }
      } catch (error) {
        logger.error('Primary API Error:', error.message);
        logger.error('主接口错误或不可访问。尝试备用接口搜索ing......');
        if (Config.consoleinfo) {
          logger.info(backupUrl);
        }
        return h.image(backupUrl);
      }
    });
  ctx.command("随机图片内容/随机ai图片")
    .action(async ({ session }) => {
      const primaryUrl = 'http://lx.linxi.icu/API/aitu.php';
      const backupUrl = 'http://shanhe.kim/api/tu/aiv1.php';
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      try {
        const response = await ctx.http.get(primaryUrl, { responseType: 'arraybuffer' });
        if (response.status === 200) {
          if (Config.consoleinfo) {
            logger.info(primaryUrl);
          }
          return h.image(primaryUrl);
        } else {
          throw new Error('Non-200 status code');
        }
      } catch (error) {
        logger.error('Primary API Error:', error.message);
        logger.error('主接口错误或不可访问。尝试备用接口搜索ing......');
        if (Config.consoleinfo) {
          logger.info(backupUrl);
        }
        return h.image(backupUrl);
      }
    });
  ctx.command("随机图片内容/淘宝买家秀")
    .action(async ({ session }) => {
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      const urls = ['https://api.suxun.site/api/tao', 'https://api.suyanw.cn/api/tbmjx'];
      for (const url of urls) {
        try {
          await ctx.http.get(url);
          // 如果请求成功，直接返回这个图片
          if (Config.consoleinfo) {
            logger.info(url);
          }
          return h.image(url);
        } catch (error) {
          logger.error('API Error:', error.message);
        }
      }
      // 如果两个API都失败，返回错误消息
      return '接口无法访问，请稍后再试。';
    });

  ctx.command('mihoyo-pics/米游社搜索')
  ctx.command('米游社搜索/coser搜索 <type> <character>')
    .action(async ({ session, args }, type, character) => {
      // 检查用户是否输入了类型和角色名
      if (!type || !character) {
        return '您还没有输入完整的搜索内容，类型请输入 "原神"、"星铁"、"绝区零" 或 "大别野"\~\n示例【coser搜索 原神 芭芭拉】\\~';
      }
      // 添加原神的别名
      const aliases = {
        '原神': ['原神', 'genshin', '原', 'yuanshen', '⚪神'],
        '星铁': ['星铁', '星穹铁道', '星穹', '崩铁'],
        '绝区零': ['区零', 'zzz', '绝区零', '绝区'],
        '大别野': ['大别野', '大别墅', '米游社'],
        //'崩坏3': ['bh3', '崩坏三', '崩崩崩', '崩坏3'],
      };
      // 查找输入类型对应的实际类型
      let actualType = Object.keys(aliases).find(key => aliases[key].includes(type));
      // 确保输入的类型是有效的
      if (!actualType) {
        return '无效的搜索类型, 请输入 "原神"、"星铁"、"绝区零" 或 "大别野"\~';
      }
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      // 调用 searchCos 函数并传入角色名和实际类型
      return searchCos(character, actualType);
    });
  async function searchCos(character, type) {
    let url = '';
    let postUrl = '';
    // 根据类型设置不同的 API URL 和帖子链接
    switch (type) {
      case '星铁':
        url = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=62&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl = 'https://www.miyoushe.com/sr/article/';
        break;
      case '原神':
        url = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=49&gids=2&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl = 'https://www.miyoushe.com/ys/article/';
        break;
      //case '崩坏3':
      //url = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=4&keyword=${encodeURIComponent(character)}&size=2000`;        //这个板块乱投帖子严重，cos搜出的很多都是同人图
      //postUrl = 'https://www.miyoushe.com/bh3/article/';
      //break;
      case '绝区零':
        url = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=65&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl = 'https://www.miyoushe.com/zzz/article/';
        break;
      case '大别野':
        url = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=47&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl = 'https://www.miyoushe.com/dby/article/';
        break;
      default:
        return '搜索类型错误，请输入 "原神"、"星铁"、"绝区零" 或 "大别野".';
    }
    // 执行 API 请求并处理返回的图片
    try {
      const response = await ctx.http.get(url);
      // 直接使用响应对象
      const data = response;
      // 调用 processImages 处理图片并返回结果
      return await processImages(data, postUrl, ctx);
    } catch (error) {
      logger.error('Error fetching images:', error.message);
      logger.error('Error details:', error);
      return '获取图片失败，请稍后重试。';
    }
  }

  ctx.command('米游社搜索/同人图搜索 <type> <character>')
    .action(async ({ session, args }, type, character) => {
      // 检查用户是否输入了类型和角色名
      if (!type || !character) {
        return '您还没有输入完整的搜索内容，类型请输入 "原神"、"星铁"、"崩坏3"、"绝区零"、"崩坏2"、"未定事件簿" 或 "大别野"~\n，例【同人图搜索 原神 芭芭拉】\~';
      }
      // 添加原神的别名
      const aliases = {
        '原神': ['原神', 'genshin', '原', 'yuanshen', '⚪神'],
        '星铁': ['星铁', '星穹铁道', '星穹', '崩铁'],
        '大别野': ['大别野', '大别墅', '米游社', 'dby'],
        '崩坏3': ['bh3', '崩坏三', '崩崩崩', '崩坏3'],
        '崩坏学院2': ['bh2', '崩坏二', '崩崩', '崩坏学院2'],
        '未定事件簿': ['未定事件', '未定', '事件簿', '未定事件簿'],
        '绝区零': ['区零', 'zzz', '绝区零', '绝区'],
      };
      // 查找输入类型对应的实际类型
      let actualType = Object.keys(aliases).find(key => aliases[key].includes(type));
      // 确保输入的类型是有效的
      if (!actualType) {
        return '无效的搜索类型, 请输入 "原神"、"星铁"、"崩坏3"、"绝区零"、"崩坏2"、"未定事件簿" 或 "大别野"~';
      }
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      // 调用 searchTrt 函数并传入角色名和实际类型
      return searchTrt(character, actualType);
    });
  async function searchTrt(character, type) {
    let url2 = '';
    let postUrl2 = '';
    // 根据类型设置不同的 API URL 和帖子链接
    switch (type) {
      case '星铁':
        url2 = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=56&gids=6&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl2 = 'https://www.miyoushe.com/sr/article/';
        break;
      case '原神':
        url2 = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=29&gids=2&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl2 = 'https://www.miyoushe.com/ys/article/';
        break;
      case '大别野':
        url2 = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=39&gids=5&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl2 = 'https://www.miyoushe.com/dby/article/';
        break;
      case '崩坏2':
        url2 = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=40&gids=3&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl2 = 'https://www.miyoushe.com/bh2/article/';
        break;
      case '未定事件簿':
        url2 = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=38&gids=4&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl2 = 'https://www.miyoushe.com/wd/article/';
        break;
      case '崩坏3':
        url2 = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=4&gids=1&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl2 = 'https://www.miyoushe.com/bh3/article/';
        break;
      case '绝区零':
        url2 = `https://bbs-api.mihoyo.com/post/wapi/searchPosts?forum_id=59&gids=8&keyword=${encodeURIComponent(character)}&size=2000`;
        postUrl2 = 'https://www.miyoushe.com/zzz/article/';
        break;
      default:
        return '搜索类型错误，请输入 "原神"、"星铁"、"崩坏3"、"绝区零"、"崩坏2"、"未定事件簿" 或 "大别野".';
    }
    try {
      const response = await ctx.http.get(url2);
      const data = response;
      // 调用 processImages 处理图片并返回结果
      return await processImages(data, postUrl2, ctx);
    } catch (error) {
      logger.error('Error fetching images:', error.message);
      logger.error('Error details:', error);
      return '获取图片失败，请稍后重试。';
    }
  }



  ctx.command('mihoyo-pics/米游社热榜')
  ctx.command('米游社热榜/coser热榜 <type>')
    .action(async ({ session, args }, type) => {
      // 添加别名
      const aliases = {
        '原神': ['原神', 'genshin', '原', 'yuanshen', '⚪神'],
        '星铁': ['星铁', '星穹铁道', '星穹', '崩铁'],
        '大别野': ['大别野', '大别墅', '米游社'],
        '崩坏3': ['bh3', '崩坏三', '崩崩崩', '崩坏3'],
        '绝区零': ['zzz', '绝区零', '加起来', '捡起来'],
      };
      // 查找输入类型对应的实际类型
      let actualType = Object.keys(aliases).find(key => aliases[key].includes(type));
      // 确保输入的类型是有效的
      if (!actualType) {
        return '请输入 "原神"、"星铁"、"崩坏3"、"绝区零" 或 "大别野" 中的一项。示例【coser热榜  原神】';
      }
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      return getHotCoserPhotos(actualType);
    });

  // 创建一个对象来保存每种类型的最近三个帖子的ID
  const recentPostscoser = {
    '原神': [],
    '星铁': [],
    '崩坏3': [],
    '绝区零': [],
    '大别野': []
  };
  async function getHotCoserPhotos(type) {
    let url = '';
    let postUrl = '';
    // 设置不同类型的 API URL 和帖子链接
    switch (type) {
      case '星铁':
        url = `https://bbs-api.mihoyo.com/post/wapi/getForumPostList?forum_id=62&gids=2&is_hot=true&page_size=20`;
        postUrl = 'https://www.miyoushe.com/sr/article/';
        break;
      case '原神':
        url = 'https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=49&gids=2&page_size=20&type=1';
        postUrl = 'https://www.miyoushe.com/ys/article/';
        break;
      case '大别野':
        url = 'https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=47&gids=2&page_size=20&type=1';
        postUrl = 'https://www.miyoushe.com/dby/article/';
        break;
      case '绝区零':
        url = 'https://bbs-api.miyoushe.com/post/wapi/getForumPostList?forum_id=65&gids=8&is_good=false&is_hot=false&page_size=20&sort_type=3';
        postUrl = 'https://www.miyoushe.com/zzz/article/';
        break;
      case '崩坏3':
        url = 'https://bbs-api.miyoushe.com/post/wapi/getImagePostList?cate_id=17&forum_id=4&gids=1&page_size=21&type=1';
        postUrl = 'https://www.miyoushe.com/bh3/article/';
        break;
      default:
        return '类型错误，请输入 "原神"、"星铁"、"崩坏3"、"绝区零" 或 "大别野".';
    }
    // 执行 API 请求
    try {
      const response = await ctx.http.get(url);
      // 调用 processHotPhotos 处理响应数据并返回结果
      return await processHotPhotos(response, type, postUrl, ctx, recentPostscoser);
    } catch (error) {
      logger.error('Error fetching hot coser images:', error.message);
      return '获取热榜图片失败，请稍后重试。';
    }
  }
  ctx.command('米游社热榜/米游社同人图热榜 <type>')
  ctx.command('米游社同人图热榜/同人漫画榜 <type>')
    .action(async ({ session, args }, type) => {
      // 添加别名
      const aliases = {
        '原神': ['原神', 'genshin', '原', 'yuanshen', '⚪神'],
        '星铁': ['星铁', '星穹铁道', '星穹', '崩铁'],
        '崩坏3': ['bh3', '崩坏三', '崩崩崩', '崩坏3'],
      };
      // 查找输入类型对应的实际类型
      let actualType = Object.keys(aliases).find(key => aliases[key].includes(type));
      // 确保输入的类型是有效的
      if (!actualType) {
        return '请输入 "原神"、"星铁"、或"崩坏3" 中的一项。示例【同人漫画榜   原神】';
      }
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      // 调用 getHottrtmhbPhotos 函数并传入实际类型
      return getHottrtmhbPhotos(actualType);
    });
  // 创建一个对象来保存每种类型的最近三个帖子的ID
  const recentPoststrtmhb = {
    '原神': [],
    '星铁': [],
    '崩坏3': []
  };


  async function getHottrtmhbPhotos(type) {
    let url = '';
    let postUrl = '';
    // 设置不同类型的 API URL 和帖子链接
    switch (type) {
      case '星铁':
        url = `https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=56&type=1&page_size=20000&cate_id=3`;//同人图-漫画榜-日榜     
        postUrl = 'https://www.miyoushe.com/sr/article/';
        break;
      case '原神':
        url = 'https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=29&type=1&page_size=20000&cate_id=3';//同人图-漫画榜-日榜      
        postUrl = 'https://www.miyoushe.com/ys/article/';
        break;
      case '崩坏3':
        url = 'https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=4&page_size=20&type=1&cate_id=3';   //崩坏3 同人图-漫画榜  日榜
        postUrl = 'https://www.miyoushe.com/bh3/article/';
        break;

      default:
        return '类型错误，请输入 "原神"、"星铁"、或"崩坏3".';
    }

    // 执行 API 请求
    try {
      const response = await ctx.http.get(url);
      // 调用 processHotPhotos 处理响应数据并返回结果
      return await processHotPhotos(response, type, postUrl, ctx, recentPoststrtmhb);
    } catch (error) {
      logger.error('Error fetching hot coser images:', error.message);
      return '获取热榜图片失败，请稍后重试。';
    }
  }

  ctx.command('米游社同人图热榜/同人插画榜 <type>')
    .action(async ({ session, args }, type) => {
      // 添加别名
      const aliases = {
        '原神': ['原神', 'genshin', '原', 'yuanshen', '⚪神'],
        '星铁': ['星铁', '星穹铁道', '星穹', '崩铁'],
        '大别野': ['大别野', '大别墅', '米游社'],
        '崩坏3': ['bh3', '崩坏三', '崩崩崩', '崩坏3'],
        '崩坏2': ['bh2', '崩坏二', '崩崩', '崩坏2'],
        '绝区零': ['zzz', '绝区零', '加起来', '捡起来'],
        '未定事件簿': ['未定事件', '未定', '事件簿', '未定事件簿'],
      };
      // 查找输入类型对应的实际类型
      let actualType = Object.keys(aliases).find(key => aliases[key].includes(type));
      // 确保输入的类型是有效的
      if (!actualType) {
        return '请输入 "原神"、"星铁"、"绝区零"、"未定事件簿"、"崩坏2"、"崩坏3" 或 "大别野" 中的一项。示例【同人插画榜  原神】';
      }
      if (Config.helptipkey) {
        await session.send(Config.helptip);
      }
      // 调用 getHottrtchbPhotos 函数并传入实际类型
      return getHottrtchbPhotos(actualType);
    });

  // 创建一个对象来保存每种类型的最近三个帖子的ID
  const recentPoststrtchb = {
    '原神': [],
    '星铁': [],
    '崩坏3': [],
    '崩坏2': [],
    '绝区零': [],
    '未定事件簿': [],
    '大别野': []
  };
  async function getHottrtchbPhotos(type) {
    let url = '';
    let postUrl = '';

    // 设置不同类型的 API URL 和帖子链接
    switch (type) {
      case '星铁':
        url = `https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=56&type=1&page_size=20000&cate_id=4`;//同人图-插画榜-日榜
        postUrl = 'https://www.miyoushe.com/sr/article/';
        break;
      case '原神':
        url = 'https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=29&type=1&page_size=20000&cate_id=4';
        postUrl = 'https://www.miyoushe.com/ys/article/';
        break;
      case '大别野':
        url = 'https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=39&gids=2&page_size=20&type=1';   //同人图-日榜
        postUrl = 'https://www.miyoushe.com/dby/article/';
        break;
      case '崩坏3':
        url = 'https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=4&page_size=20&type=1&cate_id=4';   //同人图崩坏3 插画榜  日榜
        postUrl = 'https://www.miyoushe.com/bh3/article/';
        break;
      case '崩坏2':
        url = `https://bbs-api.mihoyo.com/post/wapi/getImagePostList?forum_id=40&gids=3&page_size=20&type=3`;//同人图-周榜  //这个只有周榜和月榜啊（悲
        postUrl = 'https://www.miyoushe.com/bh2/article/';
        break;
      case '绝区零':
        url = `https://bbs-api.mihoyo.com/post/wapi/getImagePostList?cate_id=0&forum_id=59&gids=8&page_size=21&type=1`;//同人图-日榜  
        postUrl = 'https://www.miyoushe.com/zzz/article/';
        break;
      case '未定事件簿':
        url = `https://bbs-api.miyoushe.com/post/wapi/getImagePostList?cate_id=0&forum_id=38&gids=4&page_size=21&type=1`;//同人图-日榜  
        postUrl = 'https://www.miyoushe.com/wd/article/';
        break;
      default:
        return '类型错误，请输入 "原神"、"星铁"、"绝区零"、"未定事件簿"、"崩坏2"、"崩坏3" 或 "大别野"';
    }
    // 执行 API 请求
    try {
      const response = await ctx.http.get(url);
      // 调用 processHotPhotos 处理响应数据并返回结果
      return await processHotPhotos(response, type, postUrl, ctx, recentPoststrtchb);
    } catch (error) {
      logger.error('Error fetching hot coser images:', error.message);
      return '获取热榜图片失败，请稍后重试。';
    }
  }
}

async function processImages(data, postUrl, ctx) {
  if (data.retcode === 0) {
    const posts = data.data.posts;
    const imagesArray = posts.map(post => ({
      post_id: post.post.post_id,
      images: post.post.images,
      subject: post.post.subject
    })).filter(images => images.images.length > 0);

    if (imagesArray.length === 0) {
      return '没有找到任何图片，可能输入的角色名有误\~';
    }

    const randomImages = imagesArray[Math.floor(Math.random() * imagesArray.length)];
    const finalPostUrl = postUrl + randomImages.post_id;
    const finalSubject = randomImages.subject;
    const imagesMessage = randomImages.images.map(imageUrl => h.image(imageUrl)).join('\n');

    return `${finalSubject}\n${finalPostUrl}\n${imagesMessage}`;
  } else {
    throw new Error('获取图片失败，请稍后重试。');
  }
}

async function processHotPhotos(response, type, postUrl, ctx, recentPosts) {
  if (response.retcode === 0 && response.data && response.data.list) {
    const list = response.data.list;
    // 过滤出包含图片的帖子
    const postsWithImages = list.filter(post => post.post && post.post.images && post.post.images.length > 0);
    if (postsWithImages.length === 0) {
      return '没有找到任何图片。';
    }
    // 随机选择一个帖子
    const randomPost = postsWithImages[Math.floor(Math.random() * postsWithImages.length)];
    const postId = randomPost.post.post_id;
    // 检查帖子是否已经被发送过
    if (recentPosts[type].includes(postId)) {
      return '抽到最近发过的重复帖子了哦\~ 榜单内容较少，不如去别处看看吧？';
    }
    // 更新最近的帖子列表
    recentPosts[type].push(postId);
    if (recentPosts[type].length > 3) {
      recentPosts[type].shift();
    }
    // 构造一个到原帖的链接
    const finalPostUrl = `${postUrl}${postId}`;
    const finalsubject = randomPost.post.subject;
    // 构造图片消息
    const imagesMessage = randomPost.post.images.map(imageUrl => h.image(imageUrl)).join('\n');
    // 返回图片消息和链接
    return `${finalsubject}\n${finalPostUrl}\n${imagesMessage}`;
  } else {
    throw new Error('获取热榜图片失败，请稍后重试。');
  }
}

async function sendImageByAPI(session, apiUrl, Config) {
  try {
    if (Config.helptipkey) {
      await session.send(Config.helptip);
    }
    if (Config.consoleinfo) {
      logger.info(apiUrl);
    }
    return h.image(apiUrl);
  } catch (error) {
    logger.error('Failed to send image:', error);
    await session.send('图片发送失败，请检查日志。');
  }
}


exports.apply = apply;