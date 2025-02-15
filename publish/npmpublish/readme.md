
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

### 更新日志

- **1.2.3**：
  - 修复自定义字体元素选择bug

- **1.2.2**：
  - 修复json文件中 图标url记录重复问题
  - 修复部分bug
  - webUI修复导入json之后，上传图标无法旋转新图标的bug

- **1.2.0**：
  - 支持 web UI交互
  - 修复部分bug
  - 修复配置项


- **1.1.5**：
  - 修复字体支持
  - 修复HTML的字体支持
  - 修复字体导入bug
  - 修复`help_text_json`不显示
  - 取消侧边栏页面，改为推荐本地HTML文件（除了打开麻烦，其他优点多多


- **1.1.0**：
  - 增加控制台页面
  - 修复HTML的bug
  - 修复图标导入bug
  - 好多好多反正好多

- **1.0.5**：
  - 优化HTML毛玻璃效果。增加css蒙版
  - 新增缓存图片功能，配置菜单一致的情况下，使用缓存菜单
  - 优化说明文档说明内容
  - 尝试png毛玻璃，无果

- **1.0.1**：修复配置项bug

- **1.0.0**：初步更新