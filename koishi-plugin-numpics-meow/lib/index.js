'use strict';
const fs_1 = require("fs");
const path_1 = require("path");
const koishi_1 = require("koishi");
exports.name = 'numpics-meow';
exports.using = ['puppeteer'];
function apply(ctx) {
  ctx.command('numpics-meow <number:string>', '举数字牌')
    .usage('numpics-meow 数字串，例如：numpics-meow 1234567890')
    .example('numpics-meow 356')
    .action(async (_, number) => {
      if (!number) return '请输入一串数字。';
      if (!/^\d+$/.test(number)) return '请输入有效的正整数。示例：【numpics-meow 356】';
      if (number.length > 28) return '不要输入超过28位的数字哦~'; // 添加检查长度的条件
      const imgWidth = calculateImageWidth(number.length);
      const htmlContent = generateHTML(number, imgWidth);
      return await ctx.puppeteer.render(htmlContent);
  });
}

// 根据数字长度计算图片宽度
function calculateImageWidth(length) {
  const maxWidth = 2000; // 定义最大宽度
  return Math.round(maxWidth / length); // 返回四舍五入的结果
}

// 生成包含数字图片的 HTML 字符串
function generateHTML(number, imgWidth) {
  const imgDir = path_1.resolve(__dirname, './numpics');
  let imagesHTML = '';
  for (const digit of number) {
    const imgPath = path_1.resolve(imgDir, `${digit}.png`);
    if (!fs_1.existsSync(imgPath)) continue;
    const imgData = fs_1.readFileSync(imgPath).toString('base64');
    imagesHTML += `<img src="data:image/png;base64,${imgData}" style="width: ${imgWidth}px;" />`;
  }
  return `
  <head>
  <style>
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0; /* 确保没有额外的空间 */
  }
  img {
    /* 设置图片高度 */
    height: 1000 px; /* 可以根据需要调整高度 */
    /* 图片宽度在HTML中设置 */
  }
  </style>
  </head>
  <body>${imagesHTML}</body>
  `;
}
exports.apply = apply;