# koishi-plugin-idiom-dictionary

[![npm](https://img.shields.io/npm/v/koishi-plugin-idiom-dictionary?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-idiom-dictionary)

## 成语字典查询插件

### 概述

成语字典查询插件，为您提供精准、迅速的四字成语解释服务，拥有丰富的成语资源库。

### 功能特色

- **直观查询**：仅需输入四字成语，即可快速获得其详尽释义。
- **智能提示**：对于输入错误或格式不符的查询，系统将给出友好的提示，引导用户正确使用。
- **灵活应对**：面对不完全记得的成语，用户可以通过替换未知字为【？】，插件将智能匹配并返回可能的成语列表。
- **详细解读**：每个成语的查询结果，都会包含其释义、出处等详细信息，让用户对每个成语有更深入的了解。


### 使用说明

1. **安装**：从插件市场将本插件加入到Koishi中

2. **查询成语**：通过发送命令 `成语查询 <四字输入>` 来触发查询，例如：`成语查询 一帆风顺`

3. **智能提示**：若输入格式不正确，将自动回复帮助提示，指导您进行正确的查询操作。

4. **查询未知成语**：对于部分遗忘的成语，您可以使用【？】代替未知字，如：`成语查询 ？？所有`。

## 交互示例
以下是使用成语字典查询插件的交互示例：

### 示例1：直接查询

**输入：** 
```
成语查询 一帆风顺
```  

**输出：** 
```
“一帆风顺”
一帆风顺，常用汉语成语，读音是（yī fán fēng shùn ）。ABCD式组合，紧缩式结构，一帆风顺意思是：船满帆；一路顺风行驶。比喻境遇非常顺利；没有任何阻碍、挫折。出自唐・孟郊《送崔爽之湖南》。一般作谓语、定语、宾语，含褒义。
```

### 示例2：模糊查询
**输入：** 
```
成语查询 ?帆??
```  

**输出：** 
```
“?帆?？”的搜索结果：
一帆风顺  yī fán fēng shùn
布帆无恙  bù fán wú yàng
一帆顺风  yī fān shùn fēng
千帆竞发  qiān fāng jìng fā
```

### 示例3：近义词查询
**输入：** 
```
近义词查询 为所欲为
```  

**输出：** 
```
近义词 [为所欲为] 查询结果：
随心所欲 (suí xīn suǒ yù): 完全按照自己的意愿去行事。

暴戾恣睢 (bào lì zì suī): 戾：残忍。恣睢：横暴的样子。凶暴恶戾，恣性怒目对人。

横行霸道 (héng xíng bà dào): ①.倚仗权势，胡作非为。②.行使专横权力。

作威作福 (zuò wēi zuò fú): 恃仗权势，欺凌弱小，滥施淫威。

为非作歹 (wéi fēi zuò dăi): ①.做违法的事，做令人痛恨的事。②.亦作“生非作歹”
```

### 示例4：反义词查询
**输入：** 
```
反义词查询 为所欲为
```  

**输出：** 
```
反义词 [为所欲为] 查询结果：
谨小慎微 (jǐn xiăo shèn wēi): 凡事谨慎小心，以至前怕狼、后怕虎，缺乏敢说敢为的气质。

循规蹈矩 (xún guī dăo jǔ): ①.适合常规和习俗。②.也用于形容拘守成规，不敢有所变动。

安分守己 (ān fèn shǒu jǐ): ①.安于命定的本分，只做自己分内的事情。②.为人规矩老实，做事不敢越轨。

力所不及 (lì suǒ bù jí): 及：达到。凭自己的力量不能做到。

规行矩步 (guī xíng jǔ bù): ①.循规的行为与蹈矩的举止。比喻品行方正。②.比喻墨守旧法，不知变通。
```

### 配置项

- **默认返回的最多成语数量**：用户可以通过配置项来设定在含有未知字的查询中，返回的成语数量上限。默认为至多10个。

- **输入错误时的文字提示**：自定义错误输入时，系统反馈给用户的提示信息。

### 更新日志

- **0.2.2** i18n本地化支持

- **0.2.1** 完善文档

- **0.2.0** 优化算法匹配

- **0.1.7** 近义词查询

- **0.1.6** 图片输出支持。

- **0.1.5** 干什么了来着？

- **0.1.4** 加入日志调试模式。

- **0.1.3** 1.修改package.json内容说明 2.index.js注释更正【如果当前位置是未知字，且其之后有已知字，则用'?'，否则用'*'】

- **0.1.2** 1.更正index.js展示内容【模犊查询】为【模糊查询】 2.package.json内容说明文字加入emoji

- **0.1.1** 1.优化控制台展示页内容 2.修改readme.md小细节

- **0.1.0** 基本实现基础功能
