import { Context, h } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import type { Config } from './config'
import type { VideoParseService } from './parser-service'

export function applyPointCommand(ctx: Context, config: Config, service: VideoParseService) {
  if (!config.demand) return

  ctx.command('B站点播 [keyword]', '点播 B 站视频')
    .option('page', '-p <page:number> 指定分 P', { fallback: '1' })
    .example('B站点播 你的名字 -p 1')
    .action(async ({ session, options }, keyword) => {
      let searchKeyword = keyword
      if (!searchKeyword) {
        await session.send(h.text('告诉我你想点播的关键词吧~'))
        searchKeyword = await session.prompt(30 * 1000)
      }
      if (!searchKeyword) return

      const page = await ctx.puppeteer.page()
      try {
        const searchUrl = `https://search.bilibili.com/video?keyword=${encodeURIComponent(searchKeyword)}&page=${options.page}&o=30`
        await page.goto(searchUrl, { waitUntil: 'networkidle2' })
        await page.addStyleTag({
          content: `
div.bili-header,
div.login-tip,
div.v-popover,
div.right-entry__outside {
  display: none !important;
}
`,
        })

        const point = config.point ?? [50, 50]
        const videos = await page.evaluate((center: [number, number]) => {
          const items = Array.from(document.querySelectorAll('.video-list-item:not([style*="display: none"])'))
          return items.map((item, index) => {
            const link = item.querySelector('a')
            const href = link?.getAttribute('href') || ''
            const idMatch = href.match(/\/video\/(BV\w+)\//)
            const id = idMatch ? idMatch[1] : ''
            if (!id) {
              const htmlElement = item as HTMLElement
              htmlElement.style.display = 'none'
            } else {
              const videoElement = item as HTMLElement
              const overlay = document.createElement('div')
              overlay.style.position = 'absolute'
              overlay.style.top = `${center[0]}%`
              overlay.style.left = `${center[1]}%`
              overlay.style.transform = 'translate(-50%, -50%)'
              overlay.style.fontSize = '48px'
              overlay.style.fontWeight = 'bold'
              overlay.style.color = 'black'
              overlay.style.zIndex = '10'
              overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'
              overlay.style.padding = '10px'
              overlay.style.borderRadius = '8px'
              overlay.textContent = `${index + 1}`
              videoElement.style.position = 'relative'
              videoElement.appendChild(overlay)
            }
            return { id }
          }).filter((video) => Boolean(video.id))
        }, point)

        if (videos.length === 0) {
          await session.send(h.text('未找到相关视频。'))
          return
        }

        const viewportHeight = 200 + videos.length * 100
        await page.setViewport({ width: 1440, height: viewportHeight })
        const videoListElement = await page.$('.video-list.row')
        if (videoListElement) {
          const image = await videoListElement.screenshot({ captureBeyondViewport: false })
          const message = [h.image(image as Buffer, 'image/png'), h.text('请选择视频的序号：')]
          await session.send(message)
        } else {
          const message = videos.map((video, index) => `${index + 1}. ${video.id}`).join('\n')
          await session.send(`${message}\n请选择视频的序号：`)
        }

        const userChoice = await session.prompt((config.timeout ?? 60) * 1000)
        const choiceIndex = Number.parseInt(userChoice ?? '', 10) - 1
        if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= videos.length) {
          await session.send(h.text('输入无效，请重新点播。'))
          return
        }

        const chosenVideo = videos[choiceIndex]
        if (config.enable) {
          const pageNumber = Number.parseInt(String(options.page), 10) || 1
          await service.processTarget(session, {
            kind: 'video',
            bvid: chosenVideo.id,
            page: pageNumber,
          })
        }
      } finally {
        if (config.pageclose && !page.isClosed()) {
          await page.close()
        }
      }
    })
}
