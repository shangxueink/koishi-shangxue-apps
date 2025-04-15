import { defineConfig } from '@cordisjs/vitepress'
import sidebar from "./config/sidebar.json"
import configjson from "./config/config.json"

const config = {
  ...configjson,
  themeConfig: {
    ...configjson.themeConfig,
    sidebar: sidebar,
  },
}

export default defineConfig(config as any)
