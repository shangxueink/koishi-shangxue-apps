# koishi-plugin-minecraft-rank-mc-api

[![npm](https://www.npmjs.com/package/koishi-plugin-minecraft-rank-mc-api)](https://www.npmjs.com/package/koishi-plugin-minecraft-rank-mc-api)

这是一个用于查询Minecraft花雨庭积分排行榜的工具。你可以使用该工具查询不同游戏模式的积分排名，并支持排序和翻页选项。

## 安装
在使用之前，请确保已经安装了koishi。
在koishi插件市场搜索并安装 minecraft-rank-mc-api 插件即可


## 使用

### 查询不同游戏模式的积分排行榜

本插件支持用户通过指定的命令查询以下游戏模式的积分排行榜：

- 起床战争 (bedwars)
- 无限火力 (bedwarsxp)
- 极限生存 (uhc)
- 狼人杀 (werewolf)
- 职业战争 (kitbattle)
- 空岛战争 (skywars)
- 吃鸡双人 (pubgdouble)

用户可以通过指定排序字段和页码来定制查询结果。（稍后说明）

下面是基础的查询指令：

```
bedwars-起床战争
bedwarsxp-无限火力
uhc-极限生存
werewolf-狼人杀
kitbattle-职业战争
skywars-空岛战争
pubgdouble-吃鸡双人
pubgsolo-吃鸡单人
```
### 查询玩家的游戏数据
```
sc-查询玩家的游戏数据 <playerName>
```
- `playerName`: 玩家的Minecraft游戏名称。


## 关于查询排序依据和翻页选项的命令格式
我们设定了`-d` `-l`和`-y`选项 

具体的用法格式是这样的：

```
[游戏模式查询指令] -l [排序字段] -y [页码] 
```
```
[游戏模式查询指令] -d [排名] 
```


- `[游戏模式查询指令]`：指定查询的游戏模式，例如`bedwars-起床战争`。
- `-y [页码]`：指定要查询的页码，默认为1，也就是首页。
- `-l [排序字段]`：指定排序的字段，例如`总积分`或者`胜率`。
- `-d [排名]`：指定排名的数据，例如`1`就是查看第一名的数据。

当然了，用户也不必完全输入完整
您也可以这样输入
```
bedwars -l 总场次
```
```
uhc -y 2
```
```
pubgdouble-吃鸡双人  -d 10
```
值得注意的是
 `-l`、`-d`和`-y`选项在【sc-查询玩家的游戏数据】指令下不生效。

 查询某玩家的数据应该是这样的：
```
sc-查询玩家的游戏数据 <playerName>
```



## 注意事项
- 请确保网络畅通，此插件功能需要联网查询。

