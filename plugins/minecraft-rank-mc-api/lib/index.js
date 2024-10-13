
"use strict";

const axios = require('axios').default;

module.exports = {
  name: 'minecraft-rank',
  apply(ctx) {
    ctx.command('MC雨花庭积分排行榜')
    ctx.command('MC雨花庭积分排行榜/bedwars-起床战争 [page:number]', '查询起床战争的积分排行榜')
  .option('sort', '-l <sortKey>', { type: 'string' }) // 添加排序选项
  .option('page', '-y [page:number]', { type: 'number' }) // 添加翻页选项
  .option('detail', '-d [rank:number]', { type: 'number' }) // 添加指定排名查看选项
  .action(async ({ options }) => {
    const page = options.page || 1; // 使用-y选项指定的页数，如果没有指定，默认为1
    const url = `https://mc-api.16163.com/search/info.html?key=bedwars&page=${page}`;
    const fieldMapping1 = {
      "总场次": "playNum",
      "胜率": "winRate",
      "破坏床数": "beddesNum",
      "KD值": "killDead",
      "等级分": "elo",
      "总积分": "score",
    };

    try {
      // 发起HTTP请求获取数据
      const response = await axios.get(url);
      let data = response.data;

      // 验证数据是否为数组
      if (!Array.isArray(data)) {
        return '查询到的数据不是有效格式，无法显示排行榜。';
      }

      // 如果使用了-d选项，查找指定排名的玩家并计算相关数据
if (options.detail) {
  const player = data.find(p => p.rank === options.detail);
  if (!player) {
    return `未找到排名为${options.detail}的玩家。`;
  }
  
  let additionalInfo = '';
  if ('playNum' in player && 'winRate' in player) {
    // 计算胜场数
    const wins = Math.round(player.playNum * player.winRate);
    // 计算负场数
    const losses = player.playNum - wins;
    additionalInfo = `胜场: ${wins} 负场: ${losses} \n`;
  }

  return `排名: ${player.rank} \n游戏昵称: ${player.name} \n总场次: ${player.playNum}` +
         ` 胜率: ${(player.winRate * 100).toFixed(2)}% \n` +
         additionalInfo +
         `破坏床数: ${player.beddesNum} K/D值: ${player.killDead.toFixed(2)} \n` +
         `等级分: ${Math.round(player.elo)} 总积分: ${Math.round(player.score)}\n` +
         `段位: ${player.duanwei}`;
}

      // 检查排序字段是否为中文，并映射到相应的API字段名
      const sortField = fieldMapping1[options.sort] || options.sort;

      // 如果排序字段在数据中存在，根据该选项对数据进行排序
      if (sortField && data.length > 0 && sortField in data[0]) {
        data.sort((a, b) => b[sortField] - a[sortField]);
      }

      // 获取指定页数的数据
      const start = (page - 1) * 10;
      const pageData = data.slice(start, start + 10);

      // 格式化输出字符串
      const output = pageData.map(player => {
        return `排名: ${player.rank} 游戏昵称: ${player.name} \n总场次: ${player.playNum} 胜率: ${(player.winRate * 100).toFixed(2)}% \n破坏床数: ${player.beddesNum} K/D值: ${player.killDead.toFixed(2)} \n等级分: ${Math.round(player.elo)} 总积分: ${Math.round(player.score)}\n段位: ${player.duanwei}`;
      }).join('\n\n');

      // 添加游戏类型标注
      return `起床战争排行榜:\n\n${output}`;
    } catch (error) {
      console.error(error);
      return '查询失败，请稍后再试。';
    }
  });

      ctx.command('MC雨花庭积分排行榜/bedwarsxp-无限火力 [page:number]', '查询无限火力的积分排行榜')
      .option('sort', '-l <sortKey>', { type: 'string' }) // 添加排序选项
      .option('page', '-y [page:number]', { type: 'number' }) // 添加翻页选项
      .option('detail', '-d [rank:number]', { type: 'number' }) // 添加指定排名查看选项
      .action(async ({ options }) => {
        const page = options.page || 1; // 使用-y选项指定的页数，如果没有指定，默认为1
        const url = `https://mc-api.16163.com/search/info.html?key=bedwarsxp&page=${page}`;
        const fieldMapping2 = {
          "总场次": "games",  
          "胜率": "winRate",
          "破坏床数": "dbed",
          "KD值": "killDead",
          "等级分": "elo",
          "总积分": "score",
          "段位": "duanwei",
        };
        try {
          // 发起HTTP请求获取数据
          const response = await axios.get(url);
          let data = response.data;

          // 验证数据是否为数组
          if (!Array.isArray(data)) {
            return '查询到的数据不是有效格式，无法显示排行榜。';
          }
          // 如果使用了-d选项，查找指定排名的玩家并计算相关数据
if (options.detail) {
  const player = data.find(p => p.rank === options.detail);
  if (!player) {
    return `未找到排名为${options.detail}的玩家。`;
  }
  
  let additionalInfo = '';
  if ('games' in player && 'winRate' in player) {
    // 计算胜场数
    const wins = Math.round(player.games * player.winRate);
    // 计算负场数
    const losses = player.games - wins;
    additionalInfo = `胜场: ${wins} 负场: ${losses} \n`;
  }

  return `排名: ${player.rank} \n游戏昵称: ${player.name} \n总场次: ${player.games}` +
         ` 胜率: ${(player.winRate * 100).toFixed(2)}% \n` +
         additionalInfo +
         `破坏床数: ${player.dbed} K/D值: ${player.killDead.toFixed(2)} \n` +
         `总积分: ${Math.round(player.score)}\n` +
         `段位: ${player.duanwei}`;
}

          // 检查排序字段是否为中文，并映射到相应的API字段名
          const sortField = fieldMapping2[options.sort] || options.sort;

          // 如果排序字段在数据中存在，根据该选项对数据进行排序
          if (sortField && data.length > 0 && sortField in data[0]) {
            data.sort((a, b) => b[sortField] - a[sortField]);
          }

          // 获取指定页数的数据
          const start = (page - 1) * 10;
          const pageData = data.slice(start, start + 10);

          // 格式化输出字符串
          const output = pageData.map(player => {
            return `排名: ${player.rank} 游戏昵称: ${player.name} \n总场次: ${player.games} 胜率: ${(player.winRate * 100).toFixed(2)}% \n破坏床数: ${player.dbed} K/D值: ${player.killDead.toFixed(2)} \n总积分: ${Math.round(player.score)} 段位: ${player.duanwei}`;
          }).join('\n\n');

          // 添加游戏类型标注
          return `无限火力排行榜:\n\n${output}`;
        } catch (error) {
          console.error(error);
          return '查询失败，请稍后再试。';
        }
      });


        ctx.command('MC雨花庭积分排行榜/uhc-极限生存 [page:number]', '查询极限生存的积分排行榜')
          .option('sort', '-l <sortKey>', { type: 'string' }) // 添加排序选项
          .option('page', '-y [page:number]', { type: 'number' }) // 添加翻页选项
          .option('detail', '-d [rank:number]', { type: 'number' }) // 添加指定排名查看选项
          .action(async ({ options }) => {
            const page = options.page || 1; // 使用-y选项指定的页数，如果没有指定，默认为1
            const url = `https://mc-api.16163.com/search/info.html?key=uhc&page=${page}`;
            const fieldMapping3 = {
              "总场次": "gamePlayed",  
              "得冠率": "winRate",
              "破坏床数": "dbed",
              "KD值": "killDead",
              "总击杀": "killNum",
              "总积分": "score",
              "段位": "duanwei",
            };
           try {
          // 发起HTTP请求获取数据
          const response = await axios.get(url);
          let data = response.data;

          // 验证数据是否为数组
          if (!Array.isArray(data)) {
            return '查询到的数据不是有效格式，无法显示排行榜。';
          }

          // 如果使用了-d选项，查找指定排名的玩家并计算相关数据
if (options.detail) {
  const player = data.find(p => p.rank === options.detail);
  if (!player) {
    return `未找到排名为${options.detail}的玩家。`;
  }
  
  let additionalInfo = '';
  if ('gamePlayed' in player && 'winRate' in player) {
    // 计算胜场数
    const wins = Math.round(player.gamePlayed * player.winRate);
    // 计算负场数
    const losses = player.gamePlayed - wins;
    additionalInfo = `胜场: ${wins} 负场: ${losses} \n`;
  }

  return `排名: ${player.rank} \n游戏昵称: ${player.name} \n总场次: ${player.gamePlayed}` +
         ` 得冠率: ${(player.winRate * 100).toFixed(2)}% \n` +
         additionalInfo +
         `总击杀: ${player.killNum} K/D值: ${player.killDead.toFixed(2)} \n` +
         `总积分: ${Math.round(player.score)}\n` +
         `段位: ${player.duanwei}`;
}

          // 检查排序字段是否为中文，并映射到相应的API字段名
          const sortField = fieldMapping3[options.sort] || options.sort;

          // 如果排序字段在数据中存在，根据该选项对数据进行排序
          if (sortField && data.length > 0 && sortField in data[0]) {
            data.sort((a, b) => b[sortField] - a[sortField]);
          }

          // 获取指定页数的数据
          const start = (page - 1) * 10;
          const pageData = data.slice(start, start + 10);

              // 格式化输出字符串
              const output = pageData.map(player => {
                return `排名: ${player.rank} 游戏昵称: ${player.name} \n总场次: ${player.gamePlayed} 得冠率: ${(player.winRate * 100).toFixed(2)}% \n总击杀: ${player.killNum} K/D值: ${player.killDead.toFixed(2)} \n总积分: ${Math.round(player.score)} 段位: ${player.duanwei}`;
              }).join('\n\n');
    
              // 添加游戏类型标注
              return `极限生存排行榜:\n\n${output}`;
            } catch (error) {
              console.error(error);
              return '查询失败，请稍后再试。';
            }
          });

          ctx.command('MC雨花庭积分排行榜/werewolf-狼人杀 [page:number]', '查询狼人杀的积分排行榜')
            .option('sort', '-l <sortKey>', { type: 'string' }) // 添加排序选项
            .option('page', '-y [page:number]', { type: 'number' }) // 添加翻页选项
            .option('detail', '-d [rank:number]', { type: 'number' }) // 添加指定排名查看选项
            .action(async ({ options }) => {
              const page = options.page || 1; // 使用-y选项指定的页数，如果没有指定，默认为1
              const url = `https://mc-api.16163.com/search/info.html?key=werewolf&page=${page}`;
              const fieldMapping4 = {
                "总场次": "play",
                "胜率": "winRate",
                "总击杀": "kills",
                "KD值": "killDead",
                "等级分": "elo",
                "总积分": "score"
              };
             try {
          // 发起HTTP请求获取数据
          const response = await axios.get(url);
          let data = response.data;

          // 验证数据是否为数组
          if (!Array.isArray(data)) {
            return '查询到的数据不是有效格式，无法显示排行榜。';
          }

          // 如果使用了-d选项，查找指定排名的玩家并计算相关数据
if (options.detail) {
  const player = data.find(p => p.rank === options.detail);
  if (!player) {
    return `未找到排名为${options.detail}的玩家。`;
  }
  
  let additionalInfo = '';
  if ('play' in player && 'winRate' in player) {
    // 计算胜场数
    const wins = Math.round(player.play * player.winRate);
    // 计算负场数
    const losses = player.play - wins;
    additionalInfo = `胜场: ${wins} 负场: ${losses} \n`;
  }

  return `排名: ${player.rank} \n游戏昵称: ${player.name} \n总场次: ${player.play}` +
         ` 胜率: ${(player.winRate * 100).toFixed(2)}% \n` +
         additionalInfo +
         `总击杀: ${player.kills} \n` +
         `总积分: ${Math.round(player.score)}\n` +
         `段位: ${player.duanwei}`;
}

          // 检查排序字段是否为中文，并映射到相应的API字段名
          const sortField = fieldMapping4[options.sort] || options.sort;

          // 如果排序字段在数据中存在，根据该选项对数据进行排序
          if (sortField && data.length > 0 && sortField in data[0]) {
            data.sort((a, b) => b[sortField] - a[sortField]);
          }

          // 获取指定页数的数据
          const start = (page - 1) * 10;
          const pageData = data.slice(start, start + 10);

                // 格式化输出字符串
                const output = pageData.map(player => {
                  return `排名: ${player.rank} 游戏昵称: ${player.name} \n总场次: ${player.play} 胜率: ${(player.winRate * 100).toFixed(2)}% \n总击杀: ${player.kills} 总积分: ${Math.round(player.score)} \n段位: ${player.duanwei}`;
                }).join('\n\n');

                // 添加游戏类型标注
                return `狼人杀排行榜:\n\n${output}`;
              } catch (error) {
                console.error(error);
                return '查询失败，请稍后再试。';
              }
            });

        
              ctx.command('MC雨花庭积分排行榜/kitbattle-职业战争 [page:number]', '查询职业战争的积分排行榜')
                .option('sort', '-l <sortKey>', { type: 'string' }) // 添加排序选项
                .option('page', '-y [page:number]', { type: 'number' }) // 添加翻页选项
                .option('detail', '-d [rank:number]', { type: 'number' }) // 添加指定排名查看选项
                .action(async ({ options }) => {
                  const page = options.page || 1; // 使用-y选项指定的页数，如果没有指定，默认为1
                  const url = `https://mc-api.16163.com/search/info.html?key=kitbattle&page=${page}`;
                  const fieldMapping5 = {
                    "总场次": "playNum",
                    "胜率": "winRate",
                    "KD值": "killDead",
                    "等级分": "elo",
                    "总积分": "score"
                  };
                  try {
          // 发起HTTP请求获取数据
          const response = await axios.get(url);
          let data = response.data;

          // 验证数据是否为数组
          if (!Array.isArray(data)) {
            return '查询到的数据不是有效格式，无法显示排行榜。';
          }

          // 如果使用了-d选项，查找指定排名的玩家并计算相关数据
if (options.detail) {
  const player = data.find(p => p.rank === options.detail);
  if (!player) {
    return `未找到排名为${options.detail}的玩家。`;
  }
  
  let additionalInfo = '';
  if ('playNum' in player && 'winRate' in player) {
    // 计算胜场数
    const wins = Math.round(player.playNum * player.winRate);
    // 计算负场数
    const losses = player.playNum - wins;
    additionalInfo = `胜场: ${wins} 负场: ${losses} \n`;
  }

  return `排名: ${player.rank} \n游戏昵称: ${player.name} \n击杀数: ${player.killNum}` +
         ` K/D值: ${player.killDead.toFixed(2)}\n` +
         additionalInfo +
         `总积分: ${Math.round(player.score)}\n` +
         `段位: ${player.duanwei}`;
}

          // 检查排序字段是否为中文，并映射到相应的API字段名
          const sortField = fieldMapping5[options.sort] || options.sort;

          // 如果排序字段在数据中存在，根据该选项对数据进行排序
          if (sortField && data.length > 0 && sortField in data[0]) {
            data.sort((a, b) => b[sortField] - a[sortField]);
          }

          // 获取指定页数的数据
          const start = (page - 1) * 10;
          const pageData = data.slice(start, start + 10);
          
                    // 格式化输出字符串
                    const output = pageData.map(player => {
                      return `排名: ${player.rank} 游戏昵称: ${player.name} \n击杀数: ${player.killNum} K/D值: ${player.killDead.toFixed(2)} \n总积分: ${Math.round(player.score)} 段位: ${player.duanwei}`;
                    }).join('\n\n');
          
                    // 添加游戏类型标注
                    return `职业战争排行榜:\n\n${output}`;
                  } catch (error) {
                    console.error(error);
                    return '查询失败，请稍后再试。';
                  }
                });

            
                  ctx.command('MC雨花庭积分排行榜/skywars-空岛战争 [page:number]', '查询空岛战争的积分排行榜')
                    .option('sort', '-l <sortKey>', { type: 'string' }) // 添加排序选项
                    .option('page', '-y [page:number]', { type: 'number' }) // 添加翻页选项
                    .option('detail', '-d [rank:number]', { type: 'number' }) // 添加指定排名查看选项
                    .action(async ({ options }) => {
                      const page = options.page || 1; // 使用-y选项指定的页数，如果没有指定，默认为1
                      const url = `https://mc-api.16163.com/search/info.html?key=skywars&page=${page}`;
                      const fieldMapping6 = {
                        "总场次": "playNum",
                        "胜率": "winRate",
                        "击杀数": "killNum",
                        "KD值": "killDead",
                        "总积分": "score"
                      };
                      try {
          // 发起HTTP请求获取数据
          const response = await axios.get(url);
          let data = response.data;

          // 验证数据是否为数组
          if (!Array.isArray(data)) {
            return '查询到的数据不是有效格式，无法显示排行榜。';
          }

          // 如果使用了-d选项，查找指定排名的玩家并计算相关数据
if (options.detail) {
  const player = data.find(p => p.rank === options.detail);
  if (!player) {
    return `未找到排名为${options.detail}的玩家。`;
  }
  
  let additionalInfo = '';
  if ('playNum' in player && 'winRate' in player) {
    // 计算胜场数
    const wins = Math.round(player.playNum * player.winRate);
    // 计算负场数
    const losses = player.playNum - wins;
    additionalInfo = `胜场: ${wins} 负场: ${losses} \n`;
  }

  return `排名: ${player.rank} \n游戏昵称: ${player.name} \n总场次: ${player.playNum}` +
         ` 胜率: ${(player.winRate * 100).toFixed(2)}% \n` +
         additionalInfo +
         `击杀数: ${player.killNum} K/D值: ${player.killDead.toFixed(2)} \n` +
         `总积分: ${Math.round(player.score)}\n` +
         `段位: ${player.duanwei}`;
}

          // 检查排序字段是否为中文，并映射到相应的API字段名
          const sortField = fieldMapping6[options.sort] || options.sort;

          // 如果排序字段在数据中存在，根据该选项对数据进行排序
          if (sortField && data.length > 0 && sortField in data[0]) {
            data.sort((a, b) => b[sortField] - a[sortField]);
          }

          // 获取指定页数的数据
          const start = (page - 1) * 10;
          const pageData = data.slice(start, start + 10);
              
                        // 格式化输出字符串
                        const output = pageData.map(player => {
                          return `排名: ${player.rank} 游戏昵称: ${player.name} \n总场次: ${player.playNum} 胜率: ${(player.winRate * 100).toFixed(2)}% \n击杀数: ${player.killNum} K/D值: ${player.killDead.toFixed(2)} \n总积分: ${Math.round(player.score)} 段位: ${player.duanwei}`;
                        }).join('\n\n');
              
                        // 添加游戏类型标注
                        return `空岛战争排行榜:\n\n${output}`;
                      } catch (error) {
                        console.error(error);
                        return '查询失败，请稍后再试。';
                      }
                    });
      
    ctx.command('MC雨花庭积分排行榜/pubgdouble-吃鸡双人 [page:number]', '查询吃鸡双人的积分排行榜')
      .option('sort', '-l <sortKey>', { type: 'string' }) // 添加排序选项
      .option('page', '-y [page:number]', { type: 'number' }) // 添加翻页选项
      .option('detail', '-d [rank:number]', { type: 'number' }) // 添加指定排名查看选项
      .action(async ({ options }) => {
        const page = options.page || 1; // 使用-y选项指定的页数，如果没有指定，默认为1
        const url = `https://mc-api.16163.com/search/info.html?key=pubgdouble&page=${page}`;
        const fieldMapping7 = {
          "总场次": "play",
          "总击杀": "killNum",

          "KD值": "killDead",
          "等级分": "elo",
          "总积分": "score"
        };
        try {
          // 发起HTTP请求获取数据
          const response = await axios.get(url);
          let data = response.data;

          // 验证数据是否为数组
          if (!Array.isArray(data)) {
            return '查询到的数据不是有效格式，无法显示排行榜。';
          }

          // 如果使用了-d选项，查找指定排名的玩家并计算相关数据
if (options.detail) {
  const player = data.find(p => p.rank === options.detail);
  if (!player) {
    return `未找到排名为${options.detail}的玩家。`;
  }
  
  let additionalInfo = '';
  if ('play' in player && 'winRate' in player) {
    // 计算胜场数
    const wins = Math.round(player.play * player.winRate);
    // 计算负场数
    const losses = player.play - wins;
    additionalInfo = `胜场: ${wins} 负场: ${losses} \n`;
  }

  return `排名: ${player.rank} \n游戏昵称: ${player.name} \n总场次: ${player.play}\n` +
         additionalInfo +
         `总击杀: ${player.killNum} K/D值: ${player.killDead.toFixed(2)} \n` +
         `总积分: ${Math.round(player.score)}\n` +
         `段位: ${player.duanwei}`;
}

          // 检查排序字段是否为中文，并映射到相应的API字段名
          const sortField = fieldMapping7[options.sort] || options.sort;

          // 如果排序字段在数据中存在，根据该选项对数据进行排序
          if (sortField && data.length > 0 && sortField in data[0]) {
            data.sort((a, b) => b[sortField] - a[sortField]);
          }

          // 获取指定页数的数据
          const start = (page - 1) * 10;
          const pageData = data.slice(start, start + 10);


          // 格式化输出字符串
          const output = pageData.map(player => {
            return `排名: ${player.rank} 游戏昵称: ${player.name} \n总场次: ${player.play} 总击杀: ${player.killNum} \nK/D值: ${player.killDead.toFixed(2)} 总积分: ${Math.round(player.score)} 段位: ${player.duanwei}`;
          }).join('\n\n');

          // 添加游戏类型标注
          return `吃鸡双人排行榜:\n\n${output}`;
        } catch (error) {
          console.error(error);
          return '查询失败，请稍后再试。';
        }
      });

      ctx.command('MC雨花庭积分排行榜/pubgsolo-吃鸡单人 [page:number]', '查询吃鸡单人的积分排行榜')
      .option('sort', '-l <sortKey>', { type: 'string' }) // 添加排序选项
      .option('page', '-y [page:number]', { type: 'number' }) // 添加翻页选项
      .option('detail', '-d [rank:number]', { type: 'number' }) // 添加指定排名查看选项
      .action(async ({ options }) => {
        const page = options.page || 1; // 使用-y选项指定的页数，如果没有指定，默认为1
        const url = `https://mc-api.16163.com/search/info.html?key=pubgsolo&page=${page}`;
        const fieldMapping7 = {
          "总场次": "play",
          "总击杀": "killNum",
          "KD值": "killDead",
          "等级分": "elo",
          "总积分": "score",
          "段位": "duanwei"
        };
        try {
          // 发起HTTP请求获取数据
          const response = await axios.get(url);
          let data = response.data;

          // 验证数据是否为数组
          if (!Array.isArray(data)) {
            return '查询到的数据不是有效格式，无法显示排行榜。';
          }

          // 如果使用了-d选项，查找指定排名的玩家并计算相关数据
if (options.detail) {
  const player = data.find(p => p.rank === options.detail);
  if (!player) {
    return `未找到排名为${options.detail}的玩家。`;
  }
  
  let additionalInfo = '';
  if ('play' in player && 'winRate' in player) {
    // 计算胜场数
    const wins = Math.round(player.play * player.winRate);
    // 计算负场数
    const losses = player.play - wins;
    additionalInfo = `胜场: ${wins} 负场: ${losses} \n`;
  }

  return `排名: ${player.rank} \n游戏昵称: ${player.name} \n总场次: ${player.play}\n` +
         additionalInfo +
         `总击杀: ${player.killNum}  K/D值: ${player.killDead.toFixed(2)} \n` +
         `总积分: ${Math.round(player.score)}\n` +
         `段位: ${player.duanwei}`;
}

          // 检查排序字段是否为中文，并映射到相应的API字段名
          const sortField = fieldMapping7[options.sort] || options.sort;

          // 如果排序字段在数据中存在，根据该选项对数据进行排序
          if (sortField && data.length > 0 && sortField in data[0]) {
            data.sort((a, b) => b[sortField] - a[sortField]);
          }

          // 获取指定页数的数据
          const start = (page - 1) * 10;
          const pageData = data.slice(start, start + 10);


          // 格式化输出字符串
          const output = pageData.map(player => {
            return `排名: ${player.rank} 游戏昵称: ${player.name} \n总场次: ${player.play} 总击杀: ${player.killNum} \nK/D值: ${player.killDead.toFixed(2)} 总积分: ${Math.round(player.score)} 段位: ${player.duanwei}`;
          }).join('\n\n');

          // 添加游戏类型标注
          return `吃鸡单人排行榜:\n\n${output}`;
        } catch (error) {
          console.error(error);
          return '查询失败，请稍后再试。';
        }
      });
   
//https://mc-api.16163.com/search/bedwars.html?uid=playerName
//https://mc-api.16163.com/search/bedwarsxp.html?uid=playerName
//https://mc-api.16163.com/search/uhc.html?uid=playerName
//https://mc-api.16163.com/search/werewolf.html?uid=playerName
//https://mc-api.16163.com/search/kitbattle.html?uid=playerName
//https://mc-api.16163.com/search/pubgdouble.html?uid=playerName
//https://mc-api.16163.com/search/pubgsolo.html?uid=playerName
//https://mc-api.16163.com/search/pubgteam.html?uid=playerName

// 定义不同游戏的API URL
const gameUrls = {
  "bedwars": "https://mc-api.16163.com/search/bedwars.html?uid=",
  "bedwarsxp": "https://mc-api.16163.com/search/bedwarsxp.html?uid=",
  "uhc": "https://mc-api.16163.com/search/uhc.html?uid=",
  "werewolf": "https://mc-api.16163.com/search/werewolf.html?uid=",
  "kitbattle": "https://mc-api.16163.com/search/kitbattle.html?uid=",
  "pubgdouble": "https://mc-api.16163.com/search/pubgdouble.html?uid=",
  "pubgsolo": "https://mc-api.16163.com/search/pubgsolo.html?uid=",
  "pubgteam": "https://mc-api.16163.com/search/pubgteam.html?uid="
};

ctx.command('sc-查询玩家的游戏数据 <playerName:string>', '查询玩家的游戏数据')
.action(async ({ session }, playerName) => {
  if (!playerName || playerName.trim() === '') {
    await session.send('请输入玩家名称。示例：sc 玩家名称');
    return;
  }

  await session.send('正在查询，请稍候...');
  let foundData = [];
  let notFoundGames = [];

  for (const [gameKey, baseUrl] of Object.entries(gameUrls)) {
    try {
      const playerUrl = `${baseUrl}${encodeURIComponent(playerName)}`;

      // 发起HTTP请求获取数据
      const response = await axios.get(playerUrl);

      // 假设API返回的数据是对象格式
      if (response.data && response.status === 200) {
        foundData.push({ game: gameKey, data: response.data });
      } else {
        notFoundGames.push(gameKey);
      }
    } catch (error) {
      // 如果是404错误，则标记未找到数据
      if (error.response && error.response.status === 404) {
        notFoundGames.push(gameKey);
      } else {
        console.error(`请求失败：${gameKey}`, error);
        await session.send(`无法检索游戏 ${gameKey} 的数据。`);
      }
    }
  }

 // 格式化输出玩家战绩的函数
const formatPlayerData = (gameKey, data) => {
  let output = [];

  // 如果存在胜率和总场次，计算胜场和负场
  if (data.winRate !== undefined && data.playNum !== undefined) {
    const wins = Math.round(data.playNum * data.winRate);
    const losses = data.playNum - wins;
    data.wins = wins; // 将胜场加入到数据中
    data.losses = losses; // 将负场加入到数据中
  }

  // 过滤并格式化数据
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'wins') {
      output.push(`胜场：${value}`);
    } else if (key === 'losses') {
      output.push(`负场：${value}`);
    } else if (gameNameMapping[key]) {
      output.push(`${gameNameMapping[key]}：${value}`);
    }
  });

  return `游戏模式：${gameNameMapping[gameKey]}\n${output.join('\n')}\n`;
};

  // 映射表
  const gameNameMapping = {
    "rank": "排名",
    "playNum": "总场次",
    "play": "总场次",
    "games": "总场次",
    "gamePlayed": "总场次",
    "killNum": "总击杀",
    "kills": "总击杀",
    "winRate": "胜率",
    "beddesNum": "破坏床数",
    "dbed": "破坏床数",
    "killDead": "K/D值",
    "elo": "等级分",
    "score": "总积分",
    "bedwars": "起床战争",
    "bedwarsxp": "无限火力",
    "uhc": "极限生存",
    "werewolf": "狼人杀",
    "kitbattle": "职业战争",
    "skywars": "空岛战争",
    "pubgdouble": "吃鸡双人",
    "pubgsolo": "吃鸡单人",
    "pubgteam": "吃鸡四人"
  };

  // 组合找到的数据
  let output = `玩家【${playerName}】的战绩如下：\n\n`;
  output += foundData.map(({ game, data }) => formatPlayerData(game, data)).join('\n');

  // 如果游戏模式未找到数据，就返回一句话
  const notFoundOutput = notFoundGames.length === Object.keys(gameUrls).length
    ? `该玩家没有其他数据哦~`
    : '';

  // 发送全部结果
  await session.send(`${output}${notFoundOutput ? '\n' + notFoundOutput : ''}`);
});


  }
};

