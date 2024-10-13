"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
const fs = require("fs");
const path = require("path");
const logger = new koishi_1.Logger('weather-qq-rainbowsky');
exports.name = "weather-qq-rainbowsky";
exports.usage = `
[推荐搭配定时插件使用哦](/market?keyword=schedule)
`;

exports.Config = koishi_1.Schema.object({
  defaultDatenumber: koishi_1.Schema.number()
    .description('多日天气查询时 返回的天气天数。请填入1到15的正整数。')
    .default(3),
});
async function queryWeatherPrimary(city, config, ctx) {
  const cityidMap = {};
  const cityidLines = fs.readFileSync(path.join(__dirname, "cityid.txt"), "utf-8").split(/\r?\n/);
  cityidLines.forEach(line => {
    const [id, name] = line.split('=');
    cityidMap[name] = id;
  });
  const cityid = cityidMap[city];
  if (!cityid) {
    return "无法找到该城市的cityid，请输入正确的城市名称。";
  }
  const url = `http://t.weather.itboy.net/api/weather/city/${cityid}`;
  try {
    const response = await ctx.http(url);
    //logger.error(response);
    if (response.status === 200) {
      const { cityInfo, data } = response.data;
      const updateTime = cityInfo.updateTime;
      let weatherReport = `地区：${cityInfo.city}\n (更新时间：${updateTime})\n`;
      const days = config.defaultDatenumber || 3;
      for (let i = 0; i < Math.min(data.forecast.length, days); i++) {
        const forecast = data.forecast[i];
        weatherReport += `☁️==================\n` +
          `日期：${forecast.ymd} (周${forecast.week.replace('星期', '')})\n` +
          `天气：${forecast.type}\n` +
          `温度：${forecast.low.replace('低温 ', '')} - ${forecast.high.replace('高温 ', '')}\n` +
          `风向：${forecast.fx}\n` +
          `风力：${forecast.fl}\n`;
      }
      return weatherReport;
    } else {
      return "获取天气信息失败，请检查输入的城市名称是否正确。";
    }
  } catch (error) {
    logger.error("查询天气信息时发生错误:", error.message);
    return `查询天气信息时出错: ${error.message}，请稍后重试。`;
  }
}
const adcodeMap = {};
const adcodeLines = fs.readFileSync(path.join(__dirname, "adcode.txt"), "utf-8").split(/\r?\n/);
adcodeLines.forEach(line => {
  const [name, adcode] = line.split(/\t/);
  adcodeMap[name] = adcode;
});
function findAdcode(cityName) {
  let foundAdcode = null;
  Object.keys(adcodeMap).forEach(name => {
    if (name.includes(cityName)) {
      foundAdcode = adcodeMap[name];
    }
  });
  return foundAdcode;
}
async function queryWeatherSecondary(city, ctx) {
  const adcode = findAdcode(city);
  if (!adcode) {
    return "无法找到该城市的adcode，请输入正确的城市名称。";
  }
  const url = `https://www.haotechs.cn/ljh-wx/weather?adcode=${adcode}`;
  try {
    const response = await ctx.http(url);
    if (response.status === 200) {
      const data = response.data;
      if (data.code === 0 && data.message === '操作成功！' && data.result) {
        const { province, city, weather, temperature, winddirection, windpower, humidity, reporttime } = data.result;
        let weatherInfo = `地区：${province}${city}\n报告时间：\n${reporttime}\n☁️==================\n天气：${weather}\n温度：${temperature}℃\n风向：${winddirection}风\n风力：${windpower}级\n湿度：${humidity}%`;
        return weatherInfo;
      } else {
        return "获取天气信息失败，请检查输入的城市名称是否正确。";
      }
    } else {
      return "查询天气信息时出错，服务器返回状态码：" + response.status;
    }
  } catch (error) {
    return "查询天气信息时出错，请稍后重试。";
  }
}
async function apply(ctx, config) {
  ctx.command("weather-qq-rainbowsky")
  ctx.command("weather-qq-rainbowsky/weather-未来天气 <city>")
    .action(async ({ session }, city) => {
      const weatherInfo = await queryWeatherPrimary(city, config, ctx);
      await session.send(weatherInfo);
    });
  ctx.command("weather-qq-rainbowsky/weather-当日天气 <city>")
    .action(async ({ session }, city) => {
      const weatherInfo = await queryWeatherSecondary(city, ctx);
      await session.send(weatherInfo);
    });
}
exports.apply = apply;