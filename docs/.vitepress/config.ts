import { defineConfig } from '@cordisjs/vitepress'

export default defineConfig(
  {
    "lang": 'zh-CN',
    "title": 'koishi-shangxue-apps',
    "description": '是小学基于 Koishi 开发的各种插件！',
    "ignoreDeadLinks": true, // 死链接 来自插件描述内容
    "base": '/koishi-shangxue-apps/',
    "head": [
      ['link', { "rel": 'icon', "href": 'https://avatars.githubusercontent.com/u/138397030?v=4' }],
      ['meta', { "name": 'theme-color', "content": '#5546a3' }],
    ],
    "themeConfig": {
      "sidebar": [
        {
          "text": "指南",
          "items": [
            {
              "text": "项目介绍",
              "link": "/"
            },
            {
              "text": "开发者指南",
              "link": "/markdown/PRrequest"
            }
          ]
        },
        {
          "text": "插件与工具",
          "items": [
            {
              "text": "插件效果展示",
              "link": "/markdown/pluginsbeshowed"
            },
            {
              "text": "脚本效果展示",
              "link": "/markdown/scriptsbeshowed"
            },
            {
              "text": "插件列表",
              "link": "/markdown/plugins"
            },
            {
              "text": "仓库工具",
              "link": "/markdown/scripts"
            }
          ]
        },
        {
          "text": "社区与贡献",
          "items": [
            {
              "text": "遇到问题",
              "link": "/markdown/FAQ"
            },
            {
              "text": "社区帮助",
              "link": "/markdown/community"
            },
            {
              "text": "编辑文档",
              "link": "/markdown/gh-pages"
            },
            {
              "text": "贡献鸣谢",
              "link": "/markdown/contributors"
            }
          ]
        },
        {
          "text": "其他",
          "items": [
            {
              "text": "MeMe Downloader",
              "link": "https://shangxueink.github.io/MemeDownloader/"
            },
            {
              "text": "许可证",
              "link": "https://github.com/shangxueink/koishi-shangxue-apps/blob/main/LICENSE"
            },
            {
              "text": "支持作者",
              "link": "https://afdian.com/a/shangxue"
            }
          ]
        }
      ],
      "socialLinks": {
        "github": "https://github.com/shangxueink/koishi-shangxue-apps"
      },
    },
  }
)
