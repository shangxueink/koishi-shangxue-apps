import { defineConfig } from '@cordisjs/vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'koishi-shangxue-apps',
  description: '是小学基于 Koishi 开发的各种插件！',
  ignoreDeadLinks: true, // 忽略所有死链接
  head: [
    ['link', { rel: 'icon', href: 'https://koishi.chat/logo.png' }],
    ['meta', { name: 'theme-color', content: '#5546a3' }],
  ],

  themeConfig: {
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '项目介绍', link: '/' },
          { text: '开发者指南', link: '/markdown/PRrequest' },
        ],
      },
      {
        text: '仓库',
        items: [
          { text: '功能展示', link: '/markdown/pluginsbeshowed' },
          { text: '插件列表', link: '/markdown/plugins' },
          { text: '仓库工具', link: '/markdown/scripts' },
        ],
      },
      {
        text: '更多',
        items: [
          { text: '社区帮助', link: 'markdown/community' },
          { text: '贡献鸣谢', link: 'markdown/contributors' },
        ],
      },
      {
        text: '相关',
        items: [
          { text: '项目地址', link: 'https://github.com/shangxueink/koishi-shangxue-apps/tree/main' },
          { text: '许可证', link: 'https://github.com/shangxueink/koishi-shangxue-apps/blob/main/LICENSE' },
          { text: '支持作者', link: 'https://afdian.com/a/shangxue' },
          { text: '编辑此文档', link: 'https://github.com/shangxueink/koishi-shangxue-apps/tree/gh-pages' },
        ],
      }
    ],
  },
})
