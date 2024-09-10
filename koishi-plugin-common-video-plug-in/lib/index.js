"use strict";
const koishi = require("koishi");
const axios = require('axios');
const { h } = require('koishi');
exports.name = "common-video-plug-in";
exports.usage = "获取随机视频";
const logger = new koishi.Logger('common-video-plug-in');

exports.usage = `随手搓一个视频插件玩玩，确认当前的adapter-red版本可以发送视频哦~确保当前系统有ffmpeg的系统环境~
`;

const https = require('https');
const httpsAgent = new https.Agent({
  rejectUnauthorized: false 
});


async function apply(ctx) {
// 辅助函数，用于从特定格式的响应文本中提取视频URL
function extractVideoUrl(responseText, startMarker) {
  const startIndex = responseText.indexOf(startMarker);
  if (startIndex === -1) return null;
  
  // 提取URL的开始位置和结束位置
  const urlStart = startIndex + startMarker.length;
  const urlEnd = responseText.indexOf('±', urlStart);
  return responseText.substring(urlStart, urlEnd !== -1 ? urlEnd : undefined).trim();
}


ctx.command("common-video-plug-in/随机短视频系列")
ctx.command("common-video-plug-in/精选短视频系列")

ctx.command("随机短视频系列/随机帅哥视频")
.action(async ({ session }) => {
  await session.send('那我去找视频啦\~');

  try {
    // 发送请求到API
    const response = await axios.get('https://api.52vmy.cn/api/video/boy', { httpsAgent });
    
    // 验证响应状态和内容
    if (response.status === 200 && response.data && response.data.code === "200" && response.data.data && response.data.data.url) {
      // 提取视频URL并发送
      const videoUrl = response.data.data.url;
      return koishi.segment.video(videoUrl);
    } else {
      return '获取视频失败：API未返回有效数据';
    }
  } catch (error) {
    // 网络错误或其他异常
    logger.error(error);
    return '获取视频失败：网络请求异常，请稍后重试。';
  }
});

ctx.command("随机短视频系列/随机cos视频")
.action(async ({ session }) => {
    await session.send('正在获取cos视频\~');
    try {
        // 发送请求到API
        const response = await axios.get('https://api.qvqa.cn/api/cos/?type=json', { httpsAgent });
        
        // 验证响应状态和内容
        if (response.status === 200 && response.data && response.data.code === 200 && response.data.data && response.data.data.url) {
            // 提取视频URL并发送
            const videoUrl = response.data.data.url;
            return koishi.segment.video(videoUrl);
        } else {
            return '获取视频失败：API未返回有效数据';
        }
    } catch (error) {
        // 网络错误或其他异常
        logger.error(error);
        return '获取视频失败：网络请求异常，请稍后重试。';
    }
});


ctx.command("随机短视频系列/随机美女视频")
.action(async ({ session }) => {
  await session.send('那我去找视频啦\~');

  try {
    // 发送请求到API
    const response = await axios.get('https://api.52vmy.cn/api/video/girl', { httpsAgent });
    
    // 验证响应状态和内容
    if (response.status === 200 && response.data && response.data.code === "200" && response.data.data && response.data.data.url) {
      // 提取视频URL并发送
      const videoUrl = response.data.data.url;
      return koishi.segment.video(videoUrl);
    } else {
      return '获取视频失败：API未返回有效数据';
    }
  } catch (error) {
    // 网络错误或其他异常
    logger.error(error);
    return '获取视频失败：网络请求异常，请稍后重试。';
  }
});

ctx.command("随机短视频系列/随机性感小姐姐视频")
.action(async ({ session }) => {
  await session.send('那我去找视频啦\~');

  // 生成1到8615之间的随机数，包括1和8615
  const randomNumber = Math.floor(Math.random() * 8615) + 1;
  
  // 构建视频URL
  const videoUrl = `https://api.qqsuu.cn/xjj/${randomNumber}.mp4`;

  try {
    // 检查视频URL是否有效
    const response = await axios.head(videoUrl, { httpsAgent });
    if (response.status === 200) {
      // 发送视频
      return koishi.segment.video(videoUrl);
    } else {
      return '获取视频失败：视频URL无效';
    }
  } catch (error) {
    logger.error(error);
    return '获取视频失败：网络请求异常';
  }
});

// 增加随机游戏视频指令
ctx.command("随机短视频系列/随机游戏视频")
.action(async ({ session }) => {
  await session.send('那我去找视频啦\~');
  try {
    const response = await axios.get('https://api.suyanw.cn/api/jingxuanshipin.php?type=%E6%B8%B8%E6%88%8F', { httpsAgent });
    const videoUrl = extractVideoUrl(response.data, '播放链接：');
    if (videoUrl) {
      return koishi.segment.video(videoUrl);
    } else {
      return '获取视频失败：未找到合适的视频URL';
    }
  } catch (error) {
    logger.error(error);
    return '获取视频失败：网络请求异常';
  }
});




// 增加随机萌宠视频指令
ctx.command("随机短视频系列/随机萌宠视频")
.action(async ({ session }) => {
  await session.send('那我去找视频啦\~');
  try {
    const response = await axios.get('https://api.suyanw.cn/api/jxsp.php?lx=%E8%90%8C%E5%AE%A0', { httpsAgent });
    const videoUrl = extractVideoUrl(response.data, '视频：');
    if (videoUrl) {
      return koishi.segment.video(videoUrl);
    } else {
      return '获取视频失败：未找到合适的视频URL';
    }
  } catch (error) {
    logger.error(error);
    return '获取视频失败：网络请求异常';
  }
});


ctx.command("精选短视频系列/随机精选短视频")
.action(async ({ session }) => {
  await session.send('那我去找视频啦\~');
  try {
    const response = await axios.get('https://api.suyanw.cn/api/jxsp.php', { httpsAgent });
    const videoUrl = extractVideoUrl(response.data, '视频：');
    if (videoUrl) {
      return koishi.segment.video(videoUrl);
    } else {
      return '获取视频失败：未找到合适的视频URL';
    }
  } catch (error) {
    logger.error(error);
    return '获取视频失败：网络请求异常';
  }
});

// 定义支持的类型列表
const supportedTypes = ['网红', '明星', '热舞', '风景', '游戏', '动物'];
ctx.command("精选短视频系列/精选短视频 <type>", { type: 'string' })
.action(async ({ session }, type) => {
  if (!type || type.trim() === '') {
    await session.send('请输入类型参数。[网红、明星、热舞、风景、游戏、动物] 示例：精选短视频 明星');
    return;
  }
  
  // 检查输入的类型是否在支持的列表中
  if (!supportedTypes.includes(type)) {
    await session.send(`不支持的类型：${type}。\n支持的类型包括：${supportedTypes.join('、')}。示例：精选短视频 明星`);
    return;
  }

  await session.send(`正在获取${type}视频...`);

  // 请求API的代码
  try {
    const response = await axios.get(`https://api.suyanw.cn/api/jingxuanshipin.php?type=${type}`, { httpsAgent });
    const videoUrl = extractVideoUrl(response.data, '播放链接：');
    if (videoUrl) {
      return koishi.segment.video(videoUrl);
    } else {
      return '获取视频失败：未找到合适的视频URL';
    }
  } catch (error) {
    logger.error(error);
    return '获取视频失败：网络请求异常';
  }
});


ctx.command("随机短视频系列/随机性感小姐姐视频2")
.action(async ({ session }) => {
  await session.send('那我去找视频啦\~');
  const videoUrljx = `https://jx.iqfk.top/api/sjsp.php`;
  try {
    const response = await axios.head(videoUrljx, { httpsAgent });
    if (response.status === 200) {
    
      return koishi.segment.video(videoUrljx);
    } else {
      return '获取视频失败：视频URL无效';
    }
  } catch (error) {
    logger.error(error);
    return '获取视频失败：网络请求异常';
  }
});

ctx.command("随机短视频系列/随机懒羊羊翻唱")
.action(async ({ session }) => {
  await session.send('那我去找视频啦\~');
  const videoUrljx = `https://jx.iqfk.top/api/yyfc.php`;
  try {
    const response = await axios.head(videoUrljx, { httpsAgent });
    if (response.status === 200) {
    
      return koishi.segment.video(videoUrljx);
    } else {
      return '获取视频失败：视频URL无效';
    }
  } catch (error) {
    logger.error(error);
    return '获取视频失败：网络请求异常';
  }
});




    
    
  
}

exports.apply = apply;