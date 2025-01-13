# koishi-plugin-music-link

[![npm](https://img.shields.io/npm/v/koishi-plugin-music-link?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-music-link)

🎵 **音乐下载** - 搜索并提供QQ音乐和网易云音乐平台的歌曲下载链接，🤩付费的也可以欸！？

## 特点

- **搜索歌曲**：🤩 支持QQ音乐和网易云音乐平台的歌曲搜索。
- **下载歌曲**：🎶 QQ平台支持以不同音质下载歌曲，满足不同的音乐体验需求。提供免费以及付费音乐的下载链接。
- **歌曲详情**：🎧 获取包括音质、大小和下载链接在内的歌曲详细信息。
- **友好交互**：📱 简单易用的指令，快速获取你喜欢的音乐。

## 安装

在koishi插件市场搜索并安装`music-link`



<h2>使用方法</h2>

<p>安装并配置插件后，使用下述命令搜索和下载音乐：</p>
<hr>

<h3>使用星之阁API搜索QQ、网易云音乐</h3>
<pre><code>下载音乐 [...keywords]</code></pre>
<hr>

<h3>使用龙珠API搜索QQ、网易云音乐</h3>
<pre><code>搜索歌曲 [...keywords]</code></pre>
<hr>

<h3>如果需要让歌曲链接返回为语音消息/视频消息</h3>
<p>可以修改对应指令的返回字段表中的下载链接对应的 <code>type</code> 字段，把 <code>text</code> 更改为 <code>audio</code> 就是返回语音，改为 <code>video</code> 就是返回视频消息。</p>
<hr>

<p>需要注意的是，当配置返回格式为音频/视频的时候，请自行检查是否安装了 <code>silk</code>、<code>ffmpeg</code> 等服务。</p>
<hr>

<h3>使用 <code>-n 1</code> 直接返回内容</h3>
<p>在使用命令时，可以通过添加 <code>-n 1</code> 选项直接返回指定序号的歌曲内容。这对于快速获取特定歌曲非常有用。</p>
<p>例如，使用以下命令可以直接获取第一首歌曲的详细信息：</p>
<pre><code>搜索歌曲 -n 1 [...keywords]</code></pre>
