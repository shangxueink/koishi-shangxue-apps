"use strict";
const koishi = require("koishi");

exports.name = 'bmi-calculator';
exports.usage = 'bmi-calculator 身高（cm） 体重（斤）';

exports.Config = koishi.Schema.intersect([      

          koishi.Schema.object({
            underweight: koishi.Schema.array(String).role('table').description('【低体重】的提示语').default([
              '您的体重稍轻，请适度增加营养摄入。',
              '为了更好的健康，可以尝试多食用一些富含营养的食物。',
              '多摄入一些蛋白质和健康脂肪，有助于提升身体素质。',
              '健康增重需要时间，可以根据自身状况，合理适当增重。',
              '请适当增加饮食量吧，这会更有助于身体的发展哦\~',
              ]),
              normal: koishi.Schema.array(String).role('table').description('【正常体重】的提示语').default([
              '您的体重很标准，继续保持健康的生活方式吧！',
              '正常体重是身体健康的一项标志，继续保持良好的生活习惯。',
              '恭喜您保持了理想的体重，坚持下去会更加健康。',
              '继续维持正常体重吧！有益于心血管和全身健康哦\~',
              '加油！继续保持正常体重！有效预防慢性疾病。',
              ]),
            overweight: koishi.Schema.array(String).role('table').description('【超重】的提示语').default([
              '注意啦，您的体重是健康的，但身体已经不苗条了唔，适当锻炼很重要哦~' ,
              '控制饮食，适度运动，是改善体重的有效途径。' ,
              '每天保持适量的运动，有助于控制体重。' ,
              '建议逐渐减少高热量食物的摄入。' ,
              '合理的饮食结构对控制超重非常重要。' ,
              // ... 还有更多提示语
            ]),
            moderately_obese: koishi.Schema.array(String).role('table').description('【肥胖（一级）】的提示语').default([
               '建议调整饮食，并开始健康的锻炼计划。' ,
               '适度的有氧运动对减轻体重有积极的影响。' ,
               '控制每餐的食量，有助于逐渐减轻体重。' ,
               '定期测量体重，可以更好地掌握减肥的效果。' ,
               '保持心情愉快，对减肥效果也有积极作用。' ,
              // ... 还有更多提示语
            ]),
            severely_obese: koishi.Schema.array(String).role('table').description('【肥胖（二级）】的提示语').default([
              '请重视您的健康，定期咨询医生和制定减重计划。' ,
              '建议您了解适合自己的减肥方式，这会更有助于提高成功率哦~' ,
              '慢慢来，稳步减肥比急功近利更有益。' ,
              '注重饮食的多样性，有助于提高减肥效果。' ,
              '每天保持充足的水分摄入，对减肥有一定帮助。' ,
              // ... 还有更多提示语
            ]),
            very_severely_obese: koishi.Schema.array(String).role('table').description('【肥胖（三级）】的提示语').default([
               '非常建议您咨询医生，制定科学的饮食和锻炼方案。' ,
               '非常建议您逐渐减轻体重，您需要全方位的合理调整生活习惯。' ,
               '非常建议您寻找减肥的合适方式，这可以更好地保持身体健康。' ,
               '非常建议您与医生合作，制定个性化的减肥计划更为有效。'  ,
               '请积极参与健康社群，非常建议您向他人学习减肥经验。' ,
            ]),
          }), 
   
]);


function calculateBMI(height, weight) {
  const weightInKg = weight * 0.5; // 斤转千克
  const heightInMeters = height / 100; // 厘米转米
  return weightInKg / (heightInMeters ** 2); // 计算BMI
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getHealthStatus(bmi, messages) {
  if (bmi < 18.5) {
  return getRandomElement(messages.underweight);
  } else if (bmi >= 18.5 && bmi < 24.9) {
  return getRandomElement(messages.normal);
  } else if (bmi >= 25 && bmi < 29.9) {
  return getRandomElement(messages.overweight);
  } else if (bmi >= 30 && bmi < 34.9) {
  return getRandomElement(messages.moderately_obese);
  } else if (bmi >= 35 && bmi < 39.9) {
  return getRandomElement(messages.severely_obese);
  } else {
  return getRandomElement(messages.very_severely_obese);
  }
}

async function apply(ctx ,Config) {
  ctx.command('bmi-calculator [身高] [体重]', '计算BMI和健康建议')
  .action(async ({ session }, heightStr, weightStr) => {
      // 检查输入是否为空或格式不正确
      if (!heightStr || !weightStr) {
        await session.send('请输入正确的身高（cm）和体重（斤），如：bmi 175 145。');
        return;
      }
      
      // 检查输入是否为数字
      if (!/^\d+$/.test(heightStr) || !/^\d+$/.test(weightStr)) {
        await session.send('身高（cm）和体重（斤）应该输入数字，如：bmi 175 145。');
        return;
      }
      
      const height = parseInt(heightStr);
      const weight = parseInt(weightStr);
      
      // 检查身高（cm）和体重（斤）是否为0
      if (height === 0 || weight === 0) {
        await session.send('身高（cm）和体重（斤）都不能为0，请输入有效的数值。');
        return;
      }
      
      // 检查数值是否超过设定的可能极限
      if (height > 300 || weight > 1200) {
        await session.send('您输入的身高（cm）和体重（斤）数值似乎不太正常，请输入人类可能的数值范围内的数据，例如：bmi 170 120。');
        return;
      }
      
      // 计算BMI
      const bmi = calculateBMI(height, weight); 
      
      // 对于不正常的BMI数值，同样返回一个提示信息
      if (bmi < 10 || bmi > 100 || isNaN(bmi)) {
        await session.send('计算出的BMI数值异常，请检查输入的身高（cm）和体重（斤）数值是否准确。');
        return;
      }
      
      // 获取配置项中的消息
    // 获取配置项中的消息
const messages = Config;
const status = getHealthStatus(bmi, messages);

    await session.send(`您的BMI指数为${bmi.toFixed(1)}。\n${status}`);
  });
}

exports.apply =  apply ;