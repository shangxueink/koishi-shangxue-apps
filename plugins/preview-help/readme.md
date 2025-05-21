
# koishi-plugin-preview-help

[![npm](https://img.shields.io/npm/v/koishi-plugin-preview-help?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-preview-help)

  <h3>功能介绍</h3>
  <p>本插件允许您以图片形式预览 Koishi 机器人的帮助菜单，提供多种模式和高度自定义选项，使您的帮助信息更生动直观。</p>

  <h3>主要特点</h3>
  <ul>
    <li><strong>多种菜单模式：</strong>
      <ul>
        <li><strong>文字菜单：</strong> 返回纯文本帮助菜单。</li>
        <li><strong>图片菜单：</strong> 返回预设图片的帮助菜单。</li>
        <li><strong>渲染图片菜单：</strong> 将文本菜单渲染成图片，更美观易读。
          <ul>
            <li><strong>自动获取：</strong> 自动从 Koishi 的 <code>help</code> 指令获取菜单内容。</li>
            <li><strong>手动输入：</strong> 手动输入文本菜单内容。</li>
            <li><strong>自定义 JSON 配置：</strong> 通过 JSON 文件高度自定义菜单样式和内容。</li>
          </ul>
        </li>
      </ul>
    </li>
    <li><strong>高度自定义：</strong> 通过编辑 HTML 模板和 JSON 配置文件，您可以自由调整菜单的样式、布局和内容。</li>
    <li><strong>灵活的图片支持：</strong> 支持本地文件和网络图片作为菜单背景。</li>
  </ul>
