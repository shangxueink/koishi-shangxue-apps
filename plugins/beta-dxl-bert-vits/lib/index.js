var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi3 = require("koishi");

// src/constants.ts
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var APISpeakerList = function() {
  const dir = import_path.default.resolve("data/bert-vits");
  const file = import_path.default.resolve(dir, "speakers.json");
  if (!import_fs.default.existsSync(file)) {
    const defaultPath = import_path.default.join(__dirname, "../resources/speakers.json");
    try {
      import_fs.default.mkdirSync(dir);
    } catch (e) {
    }
    import_fs.default.copyFileSync(defaultPath, file);
  }
  return JSON.parse(import_fs.default.readFileSync(file, "utf-8"));
}();
var baseSpeakId = 114514;
var SpeakerKeyIdMap = APISpeakerList.flatMap((apiSpeaker) => {
  const entries = Object.entries(apiSpeaker.speakers);
  const result = [];
  for (const [key, value] of entries) {
    if (value.language) {
      result.push(`${key}_${value.language}`);
      continue;
    }
    if (value.languages) {
      value.languages.forEach((l) => {
        result.push(`${key}_${l}`);
      });
    }
  }
  return result;
}).sort((a, b) => a < b ? 1 : -1).map((k, index) => [k, baseSpeakId++]).reduce(
  (acc, [k, v]) => {
    acc[v] = k;
    return acc;
  },
  {}
);
var SpeakerKeyMap = Object.fromEntries(
  Object.entries(SpeakerKeyIdMap).map(([k, v]) => [v, k])
);

// src/service.ts
var import_koishi = require("koishi");
var import_vits = __toESM(require("@initencounter/vits"));
var betavits = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.logger = ctx.logger("bert-vits");
  }
  static {
    __name(this, "betavits");
  }
  logger;
  _cacheSpeakers = {};
  async say(input, options) {
    const option = fallback(options, this.config);
    const [api, speaker, lang] = this.findSpeaker(option.speaker);
    option.speaker = speaker.speaker ?? option.speaker;
    option.language = lang ?? option.language ?? "ZH";
    input = await this.checkLanguage(input, option);
    const payload = this._generatePlayLoad(input, option);
    try {
      return await this._request(payload, api, speaker);
    } catch (error) {
      this.logger.error("ERROR:", error);
      throw error;
    }
  }
  async checkLanguage(input, options) {
    try {
      const franc = await importFranc();
      const sourceLanguage = francLanguageMapping[franc.franc(input)] ?? options.language;
      if (sourceLanguage === options.language || !this.config.autoTranslate) {
        return input;
      }
      return this.ctx.translator.translate({
        input,
        source: sourceLanguage.toLocaleLowerCase(),
        target: options.language.toLocaleLowerCase()
      });
    } catch (error) {
      return input;
    }
  }
  findSpeaker(rawSpeaker) {
    if (this._cacheSpeakers[rawSpeaker]) {
      return this._cacheSpeakers[rawSpeaker];
    }
    let [speaker, lang] = rawSpeaker.split("_");
    if (!lang) {
      lang = "ZH";
    }
    for (const apiSpeakers of APISpeakerList) {
      for (const [currentSpeaker, value] of Object.entries(
        apiSpeakers.speakers
      )) {
        if (speaker === currentSpeaker) {
          const result = [
            apiSpeakers.api,
            value,
            lang
          ];
          this._cacheSpeakers[speaker] = result;
          return result;
        }
      }
    }
  }
  _generatePlayLoad(input, options) {
    const {
      sdp_ratio,
      language,
      speaker,
      noise,
      noisew,
      length,
      prompt,
      weight
    } = options;
    return {
      data: [
        input,
        speaker,
        sdp_ratio,
        noise,
        noisew,
        length,
        language,
        null,
        prompt,
        "Text prompt",
        "",
        weight
      ],
      event_data: null,
      fn_index: 0,
      dataType: [
        "textbox",
        "dropdown",
        "slider",
        "slider",
        "slider",
        "slider",
        "dropdown",
        "audio",
        "textbox",
        "radio",
        "textbox",
        "slider"
      ],
      session_hash: "kg71r7fv3e8"
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _request(payload, api, speaker) {
    let requestUrl = `${api.base.replace("{version}", speaker.version)}${api.endpoint}`;
    const urlParams = new URLSearchParams();
    if (api.params) {
      Object.entries(api.params).forEach(([key, value]) => {
        urlParams.append(
          key,
          value.replace("{version}", speaker.version).replace("{date}", String(Date.now()))
        );
      });
      requestUrl = `${requestUrl}?${urlParams}`;
    }
    if (api.is_gradio) {
      delete payload.session_hash;
    }
    let audioUrl;
    const res = await this.ctx.http.post(requestUrl, payload);
    if (res.event_id) {
      const gradioUrl = `${api.base.replace(
        "{version}",
        speaker.version
      )}${api.endpoint}/${res.event_id}`;
      const gradioEvents = await this.ctx.http.get(gradioUrl, {
        responseType: "text",
        headers: {
          "Content-Type": "text/event-stream"
        }
      });
      const dataSource = gradioEvents.split("\n");
      for (const data of dataSource) {
        if (data.startsWith("data:")) {
          const dataJson = JSON.parse(data.substring(5));
          if (dataJson[0] === "Success") {
            audioUrl = dataJson[1].url;
          } else {
            this.logger.error("ERROR(gradio):", dataJson);
          }
        }
      }
    } else {
      audioUrl = `${api.base.replace(
        "{version}",
        speaker.version
      )}/file=${res.data[1].name}`;
    }
    const buffer = await this.ctx.http(audioUrl, {
      responseType: "arraybuffer"
    });
    return import_koishi.h.audio(buffer.data, "wav");
  }
};
var betavitsService = class extends import_vits.default {
  constructor(ctx, impl) {
    super(ctx);
    this.impl = impl;
  }
  static {
    __name(this, "betavitsService");
  }
  say(options) {
    return this.impl.say(options.input, {
      speaker: SpeakerKeyIdMap[options.speaker_id]
    });
  }
};
function fallback(options, defaultValues) {
  if (!options) {
    return defaultValues;
  }
  const result = Object.assign({}, defaultValues);
  for (const key in options) {
    if (options[key] && options[key] !== "") {
      result[key] = options[key];
    }
  }
  return result;
}
__name(fallback, "fallback");
async function importFranc() {
  try {
    return await import("franc-min");
  } catch (e) {
    throw new Error(
      "Please install franc-min as a dependency with, e.g. `npm install -S franc-min`"
    );
  }
}
__name(importFranc, "importFranc");
var francLanguageMapping = {
  jpn: "jp",
  zho: "zh",
  eng: "en",
  spa: "es",
  fra: "fr",
  deu: "de",
  ita: "it",
  por: "pt",
  rus: "ru",
  kor: "ko",
  ara: "ar",
  heb: "he",
  hin: "hi",
  tur: "tr",
  vie: "vi",
  cmn: "zh",
  ell: "el"
};

// src/config.ts
var import_koishi2 = require("koishi");
var usage = `
<h2>🌈 使用</h2>
<ul>
<li>建议自行添加别名。</li>
</ul>

---

<h2>🌼 指令</h2>

<h3>betavits</h3>
<p>显示语音合成使用帮助。</p>
<pre><code>betavits</code></pre>

<h3>betavits -s 东雪莲|塔菲|坏女人星瞳...</h3>
<p>将输入的文本转换为东雪莲|塔菲|坏女人星瞳...的语音。</p>
<pre><code>betavits -s 东雪莲|塔菲|坏女人星瞳... 你好</code></pre>

---

<h2>兼容原始 vits 指令</h2>
<p>下表为每个讲者对应的 speaker_id，如果某个使用了 vits 插件的插件需要这个数字的 speaker_id，你可以根据下表来获取实际的 id。</p>


---
目前可以直接使用的speaker列表
<code>下方列表并不是实时生成的，如有误差，还请谅解。</code>

<details>
<summary>点击展开/折叠  [讲者--speaker_id] 列表</summary>
<table>
<thead>
<tr>
<th>讲者</th>
<th>speaker_id</th>
</tr>
</thead>
<tbody>
<tr><td>黑桃影-Echo_ZH</td><td>5</td></tr>
<tr><td>黑桃影-Echo_MIX</td><td>6</td></tr>
<tr><td>黑桃影-Echo_JP</td><td>7</td></tr>
<tr><td>黑桃影-Echo_EN</td><td>8</td></tr>
<tr><td>黑桃影-Echo_AUTO</td><td>9</td></tr>
<tr><td>鹿鸣-yoyo_ZH</td><td>10</td></tr>
<tr><td>鹿鸣-yoyo_MIX</td><td>11</td></tr>
<tr><td>鹿鸣-yoyo_JP</td><td>12</td></tr>
<tr><td>鹿鸣-yoyo_EN</td><td>13</td></tr>
<tr><td>鹿鸣-yoyo_AUTO</td><td>14</td></tr>
<tr><td>鹿鸣-Lumi_ZH</td><td>15</td></tr>
<tr><td>鹿鸣-Lumi_MIX</td><td>16</td></tr>
<tr><td>鹿鸣-Lumi_JP</td><td>17</td></tr>
<tr><td>鹿鸣-Lumi_EN</td><td>18</td></tr>
<tr><td>鹿鸣-Lumi_AUTO</td><td>19</td></tr>
<tr><td>露早_ZH</td><td>20</td></tr>
<tr><td>露早_MIX</td><td>21</td></tr>
<tr><td>露早_JP</td><td>22</td></tr>
<tr><td>露早_EN</td><td>23</td></tr>
<tr><td>露早_AUTO</td><td>24</td></tr>
<tr><td>陈泽_ZH</td><td>35</td></tr>
<tr><td>陈泽_MIX</td><td>36</td></tr>
<tr><td>陈泽_JP</td><td>37</td></tr>
<tr><td>陈泽_EN</td><td>38</td></tr>
<tr><td>陈泽_AUTO</td><td>39</td></tr>
<tr><td>贝拉_ZH</td><td>45</td></tr>
<tr><td>贝拉_MIX</td><td>46</td></tr>
<tr><td>贝拉_JP</td><td>47</td></tr>
<tr><td>贝拉_EN</td><td>48</td></tr>
<tr><td>贝拉_AUTO</td><td>49</td></tr>
<tr><td>艾许_ZH</td><td>50</td></tr>
<tr><td>艾许_MIX</td><td>51</td></tr>
<tr><td>艾许_JP</td><td>52</td></tr>
<tr><td>艾许_EN</td><td>53</td></tr>
<tr><td>艾许_AUTO</td><td>54</td></tr>
<tr><td>罗芭_ZH</td><td>55</td></tr>
<tr><td>罗芭_MIX</td><td>56</td></tr>
<tr><td>罗芭_JP</td><td>57</td></tr>
<tr><td>罗芭_EN</td><td>58</td></tr>
<tr><td>罗芭_AUTO</td><td>59</td></tr>
<tr><td>皮特174_ZH</td><td>70</td></tr>
<tr><td>皮特174_MIX</td><td>71</td></tr>
<tr><td>皮特174_JP</td><td>72</td></tr>
<tr><td>皮特174_EN</td><td>73</td></tr>
<tr><td>皮特174_AUTO</td><td>74</td></tr>
<tr><td>疯玛吉_ZH</td><td>75</td></tr>
<tr><td>疯玛吉_MIX</td><td>76</td></tr>
<tr><td>疯玛吉_JP</td><td>77</td></tr>
<tr><td>疯玛吉_EN</td><td>78</td></tr>
<tr><td>疯玛吉_AUTO</td><td>79</td></tr>
<tr><td>瓦尔基里_ZH</td><td>90</td></tr>
<tr><td>瓦尔基里_MIX</td><td>91</td></tr>
<tr><td>瓦尔基里_JP</td><td>92</td></tr>
<tr><td>瓦尔基里_EN</td><td>93</td></tr>
<tr><td>瓦尔基里_AUTO</td><td>94</td></tr>
<tr><td>珈乐2_ZH</td><td>95</td></tr>
<tr><td>珈乐2_MIX</td><td>96</td></tr>
<tr><td>珈乐2_JP</td><td>97</td></tr>
<tr><td>珈乐2_EN</td><td>98</td></tr>
<tr><td>珈乐2_AUTO</td><td>99</td></tr>
<tr><td>沃特森_ZH</td><td>110</td></tr>
<tr><td>沃特森_MIX</td><td>111</td></tr>
<tr><td>沃特森_JP</td><td>112</td></tr>
<tr><td>沃特森_EN</td><td>113</td></tr>
<tr><td>沃特森_AUTO</td><td>114</td></tr>
<tr><td>永雏小菲_ZH</td><td>115</td></tr>
<tr><td>永雏小菲_MIX</td><td>116</td></tr>
<tr><td>永雏小菲_JP</td><td>117</td></tr>
<tr><td>永雏小菲_EN</td><td>118</td></tr>
<tr><td>永雏小菲_AUTO</td><td>119</td></tr>
<tr><td>永雏塔菲2.3_ZH</td><td>125</td></tr>
<tr><td>永雏塔菲2.3_MIX</td><td>126</td></tr>
<tr><td>永雏塔菲2.3_JP</td><td>127</td></tr>
<tr><td>永雏塔菲2.3_EN</td><td>128</td></tr>
<tr><td>永雏塔菲2.3_AUTO</td><td>129</td></tr>
<tr><td>永雏塔菲1.2_ZH</td><td>130</td></tr>
<tr><td>永雏塔菲1.2_MIX</td><td>131</td></tr>
<tr><td>永雏塔菲1.2_JP</td><td>132</td></tr>
<tr><td>永雏塔菲1.2_EN</td><td>133</td></tr>
<tr><td>永雏塔菲1.2_AUTO</td><td>134</td></tr>
<tr><td>星瞳2_ZH</td><td>155</td></tr>
<tr><td>星瞳2_MIX</td><td>156</td></tr>
<tr><td>星瞳2_JP</td><td>157</td></tr>
<tr><td>星瞳2_EN</td><td>158</td></tr>
<tr><td>星瞳2_AUTO</td><td>159</td></tr>
<tr><td>星瞳2.3_ZH</td><td>160</td></tr>
<tr><td>星瞳2.3_MIX</td><td>161</td></tr>
<tr><td>星瞳2.3_JP</td><td>162</td></tr>
<tr><td>星瞳2.3_EN</td><td>163</td></tr>
<tr><td>星瞳2.3_AUTO</td><td>164</td></tr>
<tr><td>文静_ZH</td><td>165</td></tr>
<tr><td>文静_MIX</td><td>166</td></tr>
<tr><td>文静_JP</td><td>167</td></tr>
<tr><td>文静_EN</td><td>168</td></tr>
<tr><td>文静_AUTO</td><td>169</td></tr>
<tr><td>播音员_ZH</td><td>170</td></tr>
<tr><td>播音员_MIX</td><td>171</td></tr>
<tr><td>播音员_JP</td><td>172</td></tr>
<tr><td>播音员_EN</td><td>173</td></tr>
<tr><td>播音员_AUTO</td><td>174</td></tr>
<tr><td>探路者2.0_ZH</td><td>180</td></tr>
<tr><td>探路者2.0_MIX</td><td>181</td></tr>
<tr><td>探路者2.0_JP</td><td>182</td></tr>
<tr><td>探路者2.0_EN</td><td>183</td></tr>
<tr><td>探路者2.0_AUTO</td><td>184</td></tr>
<tr><td>扇宝_ZH</td><td>185</td></tr>
<tr><td>扇宝_MIX</td><td>186</td></tr>
<tr><td>扇宝_JP</td><td>187</td></tr>
<tr><td>扇宝_EN</td><td>188</td></tr>
<tr><td>扇宝_AUTO</td><td>189</td></tr>
<tr><td>懒羊羊_ZH</td><td>190</td></tr>
<tr><td>懒羊羊_MIX</td><td>191</td></tr>
<tr><td>懒羊羊_JP</td><td>192</td></tr>
<tr><td>懒羊羊_EN</td><td>193</td></tr>
<tr><td>懒羊羊_AUTO</td><td>194</td></tr>
<tr><td>恬豆2_ZH</td><td>200</td></tr>
<tr><td>恬豆2_MIX</td><td>201</td></tr>
<tr><td>恬豆2_JP</td><td>202</td></tr>
<tr><td>恬豆2_EN</td><td>203</td></tr>
<tr><td>恬豆2_AUTO</td><td>204</td></tr>
<tr><td>恬豆2.3_ZH</td><td>205</td></tr>
<tr><td>恬豆2.3_MIX</td><td>206</td></tr>
<tr><td>恬豆2.3_JP</td><td>207</td></tr>
<tr><td>恬豆2.3_EN</td><td>208</td></tr>
<tr><td>恬豆2.3_AUTO</td><td>209</td></tr>
<tr><td>弹道_ZH</td><td>210</td></tr>
<tr><td>弹道_MIX</td><td>211</td></tr>
<tr><td>弹道_JP</td><td>212</td></tr>
<tr><td>弹道_EN</td><td>213</td></tr>
<tr><td>弹道_AUTO</td><td>214</td></tr>
<tr><td>寻血猎犬_ZH</td><td>235</td></tr>
<tr><td>寻血猎犬_MIX</td><td>236</td></tr>
<tr><td>寻血猎犬_JP</td><td>237</td></tr>
<tr><td>寻血猎犬_EN</td><td>238</td></tr>
<tr><td>寻血猎犬_AUTO</td><td>239</td></tr>
<tr><td>密客_ZH</td><td>240</td></tr>
<tr><td>密客_MIX</td><td>241</td></tr>
<tr><td>密客_JP</td><td>242</td></tr>
<tr><td>密客_EN</td><td>243</td></tr>
<tr><td>密客_AUTO</td><td>244</td></tr>
<tr><td>向晚_ZH</td><td>280</td></tr>
<tr><td>向晚_MIX</td><td>281</td></tr>
<tr><td>向晚_JP</td><td>282</td></tr>
<tr><td>向晚_EN</td><td>283</td></tr>
<tr><td>向晚_AUTO</td><td>284</td></tr>
<tr><td>卖卖_ZH</td><td>285</td></tr>
<tr><td>卖卖_MIX</td><td>286</td></tr>
<tr><td>卖卖_JP</td><td>287</td></tr>
<tr><td>卖卖_EN</td><td>288</td></tr>
<tr><td>卖卖_AUTO</td><td>289</td></tr>
<tr><td>动力小子_ZH</td><td>290</td></tr>
<tr><td>动力小子_MIX</td><td>291</td></tr>
<tr><td>动力小子_JP</td><td>292</td></tr>
<tr><td>动力小子_EN</td><td>293</td></tr>
<tr><td>动力小子_AUTO</td><td>294</td></tr>
<tr><td>剑魔_ZH</td><td>300</td></tr>
<tr><td>剑魔_MIX</td><td>301</td></tr>
<tr><td>剑魔_JP</td><td>302</td></tr>
<tr><td>剑魔_EN</td><td>303</td></tr>
<tr><td>剑魔_AUTO</td><td>304</td></tr>
<tr><td>亡灵_ZH</td><td>315</td></tr>
<tr><td>亡灵_MIX</td><td>316</td></tr>
<tr><td>亡灵_JP</td><td>317</td></tr>
<tr><td>亡灵_EN</td><td>318</td></tr>
<tr><td>亡灵_AUTO</td><td>319</td></tr>
<tr><td>乃琳_ZH</td><td>320</td></tr>
<tr><td>乃琳_MIX</td><td>321</td></tr>
<tr><td>乃琳_JP</td><td>322</td></tr>
<tr><td>乃琳_EN</td><td>323</td></tr>
<tr><td>乃琳_AUTO</td><td>324</td></tr>
<tr><td>万蒂奇_ZH</td><td>340</td></tr>
<tr><td>万蒂奇_MIX</td><td>341</td></tr>
<tr><td>万蒂奇_JP</td><td>342</td></tr>
<tr><td>万蒂奇_EN</td><td>343</td></tr>
<tr><td>万蒂奇_AUTO</td><td>344</td></tr>
<tr><td>七海2_ZH</td><td>345</td></tr>
<tr><td>七海2_MIX</td><td>346</td></tr>
<tr><td>七海2_JP</td><td>347</td></tr>
<tr><td>七海2_EN</td><td>348</td></tr>
<tr><td>七海2_AUTO</td><td>349</td></tr>
<tr><td>丁真-dingzhen_ZH</td><td>355</td></tr>
<tr><td>丁真-dingzhen_MIX</td><td>356</td></tr>
<tr><td>丁真-dingzhen_JP</td><td>357</td></tr>
<tr><td>丁真-dingzhen_EN</td><td>358</td></tr>
<tr><td>丁真-dingzhen_AUTO</td><td>359</td></tr>
<tr><td>丁真-DZhen_ZH</td><td>360</td></tr>
<tr><td>丁真-DZhen_MIX</td><td>361</td></tr>
<tr><td>丁真-DZhen_JP</td><td>362</td></tr>
<tr><td>丁真-DZhen_EN</td><td>363</td></tr>
<tr><td>丁真-DZhen_AUTO</td><td>364</td></tr>

</tbody>
</table>
</details>

---

`;
var Config = import_koishi2.Schema.intersect([
  import_koishi2.Schema.object({
    speaker: import_koishi2.Schema.union(Object.values(SpeakerKeyIdMap)).description(
      "全局默认讲者`有一些可能失效了`<br>可以输入speaker_id匹配查找"
    ).default("向晚_ZH"),
    sdp_ratio: import_koishi2.Schema.number().min(0).max(1).step(0.1).role("slider").description("SDP/DP混合比").default(0.5),
    noise: import_koishi2.Schema.number().min(0.1).max(2).step(0.1).role("slider").description("感情").default(0.6),
    noisew: import_koishi2.Schema.number().min(0.1).max(2).step(0.1).role("slider").description("音素长度").default(0.9),
    length: import_koishi2.Schema.number().min(0.1).max(2).step(0.1).role("slider").description("语速").default(1),
    prompt: import_koishi2.Schema.string().description("用文字描述生成风格。注意只能使用英文且首字母大写单词").default("Happy"),
    weight: import_koishi2.Schema.number().min(0).max(1).step(0).role("slider").description("主文本和辅助文本的混合比率").default(0.7)
  }).description("基础设置"),
  import_koishi2.Schema.object({
    groupListmapping: import_koishi2.Schema.array(
      import_koishi2.Schema.object({
        groupList: import_koishi2.Schema.string().description("群组ID（不要多空格哦）").pattern(/^\S+$/),
        defaultspeaker: import_koishi2.Schema.union(Object.values(SpeakerKeyIdMap)).description("默认讲者 （有一些可能失效了）").default("向晚_ZH")
      })
    ).role("table").description("分群配置默认讲者").default([
      { groupList: "114514", defaultspeaker: "永雏塔菲2.3_AUTO" }
    ]),
    autoTranslate: import_koishi2.Schema.boolean().default(false).description("自动翻译到目标语言（需要翻译服务，并且确保已安装可选依赖`franc-min`)")
  }).description("进阶设置"),
  import_koishi2.Schema.object({
    loggerinfo: import_koishi2.Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`")
  }).description("调试设置")
]);

// src/index.ts
var logger = new import_koishi3.Logger("beta-dxl-bert-vits");
function apply(ctx, config) {
  const vits = new betavits(ctx, config);
  ctx.plugin(betavitsService, vits);
  ctx.command("betavits <text:text>", "AIbetavits语音合成帮助").option("speaker", "-s [speaker:string] 语音合成的讲者", {
    fallback: config.speaker
  }).option("sdp_ratio", "-sr [sdp_ratio:nubmer] 语音合成的SDP/DP混合比", {
    fallback: config.sdp_ratio
  }).option("noise", "-n [noise:number] 语音合成的感情强度", {
    fallback: config.noise
  }).option("noisew", "-nw [noisew:number] 语音合成的音素长度", {
    fallback: config.noisew
  }).option("length", "-l [length:number] 语音合成语速", {
    fallback: config.length
  }).option("prompt", "-p [prompt:string] 辅助语音合成的情感文本", {
    fallback: config.prompt
  }).option("weight", "-w [weight:number] 主文本和辅助文本的混合比率", {
    fallback: config.weight
  }).action(async ({ session, options }, text) => {
    if (!text) {
      await session.execute("betavits -h");
      return null;
    }
    const groupConfig = config.groupListmapping.find(
      (group) => group.groupList === session.channelId
    );
    const finalSpeaker = options.speaker ?? (groupConfig ? groupConfig.defaultspeaker : config.speaker);
    if (config.loggerinfo) {
      logger.info(`当前频道: ${session.channelId}`);
      if (groupConfig) {
        logger.info(
          `找到的群组配置: ${JSON.stringify(groupConfig)}`
        );
      } else {
        logger.info("未找到当前频道的群组配置。");
      }
      logger.info(`最终确定的讲者: ${finalSpeaker}`);
    }
    const version = SpeakerKeyMap[finalSpeaker] ?? SpeakerKeyMap[finalSpeaker + "_ZH"];
    if (!version) {
      return `找不到这个 ${finalSpeaker} 讲者，请检查你的输入。`;
    }
    return await vits.say(
      text,
      Object.assign(options, {
        speaker: finalSpeaker
      })
    );
  });
}
__name(apply, "apply");
var inject = {
  optional: ["translator"]
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  usage
});
