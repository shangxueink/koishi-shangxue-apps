import type Puppeteer from "koishi-plugin-puppeteer"
import type { FFmpeg } from "koishi-plugin-ffmpeg"
import type Monetary from "koishi-plugin-monetary"

// 当前工作区的 koishi 与插件类型声明分属不同 node_modules，这里做本地模块增强
declare module "koishi" {
  interface Context {
    monetary: Monetary
    puppeteer: Puppeteer
    ffmpeg: FFmpeg
  }

  interface Tables {
    monetary: {
      uid: number
      currency: string
      value: number
    }
  }
}
