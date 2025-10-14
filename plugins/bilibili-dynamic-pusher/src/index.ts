import { Context, h, Schema, Universal } from 'koishi'

// import { DynamicEventData, LiveEventData } from 'koishi-plugin-adapter-bilibili-dm'

type DynamicEventData = any
type LiveEventData = any

import path from 'node:path'
import fs from 'node:fs'

export const name = 'bilibili-dynamic-pusher'

export const usage = `
---

此插件需要使用 adapter-bilibili-dm 实现接口


[➣点我前往插件市场安装](/market?keyword=adapter-bilibili-dm+email:1919892171@qq.com+email:2596628651@qq.com)

---

开启插件后，可以在其他平台（例如onebot）等支持主动消息的平台 使用指令订阅动态和直播推送。

## 功能特性

- 🔄 **动态推送**: 监听关注UP主的动态更新（视频、图片、专栏等）
- 🔴 **直播推送**: 监听关注UP主的直播状态变化（开播、下播、信息更新）
- 📋 **订阅管理**: 支持按频道订阅特定UP主

## 操作步骤

1. 使用【bili-push.测试】指令，测试能否正常推送。

2. 确保bot已经关注了对应的up主。

3. 触发【bili-push.订阅 123456789】以在某一频道订阅一个指定UID用户的动态和直播推送（可多次）。

4. 触发【bili-push.查看订阅】确定订阅列表

5. 更多操作请触发【bili-push】查看全部指令

---

本插件订阅数据存放于 ./data/bilibili-dynamic-pusher/subscriptionsv2.json 

---
`

// 订阅信息接口
export interface SubscriptionInfo {
  id: string // 唯一标识符
  selfId: string // 机器人ID
  channelId: string // 频道ID
  platform: string // 平台名称
  guildId?: string // 群组ID（如果有）
  subscribedUids: string[] // 订阅的UP主UID列表 (使用字符串避免精度问题)
  pushTypes: string[] // 推送的动态类型
  createTime: number // 创建时间
  updateTime: number // 更新时间
}

// 全局订阅数据结构
export interface GlobalSubscriptionData {
  subscribed: SubscriptionInfo[] // 所有订阅信息
  UPNames: Record<string, string> // UP主UID到名称的全局映射
}

// 定义动态类型的联合类型
type DynamicType =
  | '视频动态 (DYNAMIC_TYPE_AV)'
  | '图片动态 (DYNAMIC_TYPE_DRAW)'
  | '文字动态 (DYNAMIC_TYPE_WORD)'
  | '专栏动态 (DYNAMIC_TYPE_ARTICLE)'
  | '直播动态 (DYNAMIC_TYPE_LIVE_RCMD)'
  | '转发动态 (DYNAMIC_TYPE_FORWARD)'
  | '番剧动态 (DYNAMIC_TYPE_PGC)'
  | '合集动态 (DYNAMIC_TYPE_UGC_SEASON)'

export interface Config {
  // 是否启用自动推送
  enableAutoPush: boolean
  // 推送的动态类型过滤
  pushTypes: DynamicType[]
  // 消息模板设置
  messageTemplate: {
    // 是否显示封面图
    showCover: boolean
    // 是否显示完整文本
    showFullText: boolean
    // 文本截断长度
    textLimit: number
  }
}

export const Config: Schema<Config> = Schema.object({
  enableAutoPush: Schema.boolean().default(true).description('启用自动推送'),
  pushTypes: Schema.array(Schema.union([
    Schema.const('视频动态 (DYNAMIC_TYPE_AV)' as const),
    Schema.const('图片动态 (DYNAMIC_TYPE_DRAW)' as const),
    Schema.const('文字动态 (DYNAMIC_TYPE_WORD)' as const),
    Schema.const('专栏动态 (DYNAMIC_TYPE_ARTICLE)' as const),
    Schema.const('直播动态 (DYNAMIC_TYPE_LIVE_RCMD)' as const),
    Schema.const('转发动态 (DYNAMIC_TYPE_FORWARD)' as const),
    Schema.const('番剧动态 (DYNAMIC_TYPE_PGC)' as const),
    Schema.const('合集动态 (DYNAMIC_TYPE_UGC_SEASON)' as const)
  ])).role('checkbox').default([
    "视频动态 (DYNAMIC_TYPE_AV)",
    "图片动态 (DYNAMIC_TYPE_DRAW)",
    "文字动态 (DYNAMIC_TYPE_WORD)",
    "专栏动态 (DYNAMIC_TYPE_ARTICLE)",
    "直播动态 (DYNAMIC_TYPE_LIVE_RCMD)"
  ] as DynamicType[]).description('推送的动态类型'),
  messageTemplate: Schema.object({
    showCover: Schema.boolean().default(true).description('显示封面图'),
    showFullText: Schema.boolean().default(false).description('显示完整文本'),
    textLimit: Schema.number().min(50).max(500).default(200).description('文本截断长度')
  }).description('消息模板设置')
})

export function apply(ctx: Context, config: Config) {
  ctx.on('ready', () => {
    ctx.logger.info('Bilibili 动态推送插件已启动')

    // 数据文件路径
    const dataFilePath = path.resolve(ctx.baseDir, 'data', name, 'subscriptionsv2.json')

    // 确保目录存在
    function ensureDataDir() {
      const dir = path.dirname(dataFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }

    // 加载订阅数据
    function loadSubscriptions(): GlobalSubscriptionData {
      try {
        ensureDataDir()
        if (fs.existsSync(dataFilePath)) {
          const data = fs.readFileSync(dataFilePath, 'utf-8')
          return JSON.parse(data) || { subscribed: [], UPNames: {} }
        }
      } catch (error) {
        ctx.logger.error('加载订阅数据失败:', error)
      }
      return { subscribed: [], UPNames: {} }
    }

    // 保存订阅数据
    function saveSubscriptions(data: GlobalSubscriptionData) {
      try {
        ensureDataDir()
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
      } catch (error) {
        ctx.logger.error('保存订阅数据失败:', error)
      }
    }

    // 获取订阅数据
    let globalData = loadSubscriptions()

    /**
     * 从配置的描述字符串中提取实际的动态类型
     */
    function extractDynamicTypes(configTypes: string[]): string[] {
      return configTypes.map(type => {
        const match = type.match(/\(([^)]+)\)/)
        return match ? match[1] : type
      })
    }

    // 获取实际的动态类型列表
    const actualPushTypes = extractDynamicTypes(config.pushTypes)

    /**
     * 生成订阅ID
     */
    function generateSubscriptionId(selfId: string, channelId: string): string {
      return `${selfId}_${channelId}`
    }

    /**
     * 查找订阅信息
     */
    function findSubscription(selfId: string, channelId: string): SubscriptionInfo | undefined {
      const id = generateSubscriptionId(selfId, channelId)
      return globalData.subscribed.find(sub => sub.id === id)
    }

    /**
     * 添加或更新订阅
     */
    function addOrUpdateSubscription(
      selfId: string,
      channelId: string,
      platform: string,
      guildId?: string
    ): SubscriptionInfo {
      const id = generateSubscriptionId(selfId, channelId)
      let subscription = globalData.subscribed.find(sub => sub.id === id)

      const now = Date.now()

      if (subscription) {
        subscription.updateTime = now
      } else {
        subscription = {
          id,
          selfId,
          channelId,
          platform,
          guildId,
          subscribedUids: [],
          pushTypes: actualPushTypes.slice(),
          createTime: now,
          updateTime: now
        }
        globalData.subscribed.push(subscription)
      }

      saveSubscriptions(globalData)
      return subscription
    }

    /**
     * 删除订阅
     */
    function removeSubscription(selfId: string, channelId: string): boolean {
      const id = generateSubscriptionId(selfId, channelId)
      const index = globalData.subscribed.findIndex(sub => sub.id === id)

      if (index !== -1) {
        globalData.subscribed.splice(index, 1)
        saveSubscriptions(globalData)
        return true
      }

      return false
    }

    /**
     * 格式化动态消息
     */
    function formatDynamicMessage(data: any): string {
      const { author, content, type } = data
      let message = ''

      message += `🔔 ${author.name} ${author.action || '发布了动态'}\n`
      message += `⏰ ${new Date(author.timestamp * 1000).toLocaleString()}\n`

      switch (type) {
        case 'DYNAMIC_TYPE_AV':
          if (content.video) {
            message += `🎬 ${content.video.title}\n`
            message += `🔗 https:${content.video.url}\n`
            if (content.video.desc && config.messageTemplate.showFullText) {
              const desc = content.video.desc.length > config.messageTemplate.textLimit
                ? content.video.desc.substring(0, config.messageTemplate.textLimit) + '...'
                : content.video.desc
              message += `📝 ${desc}\n`
            }
          }
          break

        case 'DYNAMIC_TYPE_DRAW':
          message += `🖼️ 发布了图片动态\n`
          if (content.images && content.images.length > 0) {
            message += `📷 包含 ${content.images.length} 张图片\n`
          }
          break

        case 'DYNAMIC_TYPE_ARTICLE':
          if (content.article) {
            message += `📄 ${content.article.title}\n`
            message += `🔗 ${content.article.url}\n`
            if (content.article.desc && config.messageTemplate.showFullText) {
              const desc = content.article.desc.length > config.messageTemplate.textLimit
                ? content.article.desc.substring(0, config.messageTemplate.textLimit) + '...'
                : content.article.desc
              message += `📝 ${desc}\n`
            }
          }
          break

        case 'DYNAMIC_TYPE_LIVE_RCMD':
          if (content.live) {
            message += `🔴 ${content.live.isLive ? '正在直播' : '直播预告'}\n`
            message += `📺 ${content.live.title}\n`
            message += `🔗 ${content.live.url}\n`
          }
          break

        case 'DYNAMIC_TYPE_FORWARD':
          message += `🔄 转发了动态\n`
          break
      }

      // 添加文字内容
      if (content.text && content.text.trim()) {
        const text = config.messageTemplate.showFullText
          ? content.text
          : content.text.length > config.messageTemplate.textLimit
            ? content.text.substring(0, config.messageTemplate.textLimit) + '...'
            : content.text
        message += `💬 ${text}\n`
      }

      return message.trim()
    }

    /**
     * 发送消息到指定频道
     */
    async function sendToChannel(selfId: string, channelId: string, message: string, coverUrl?: string) {
      try {
        const bot = Object.values(ctx.bots).find(b => b.selfId === selfId || b.user?.id === selfId)

        if (!bot || bot.status !== Universal.Status.ONLINE) {
          ctx.logger.error(`[动态推送] 机器人离线或未找到: ${selfId}`)
          return false
        }

        let elements: any[] = []

        // 添加封面图
        if (coverUrl && config.messageTemplate.showCover) {
          elements.push(h.image(coverUrl))
        }

        // 添加文字消息
        elements.push(h.text(message))

        const finalMessage = elements.length > 0 ? elements : message

        // 判断是群聊还是私聊
        if (!channelId.includes("private")) {
          await bot.sendMessage(channelId, finalMessage)
        } else {
          const userId = channelId.replace("private:", "")
          await bot.sendPrivateMessage(userId, finalMessage)
        }

        ctx.logger.info(`[动态推送] 成功推送到 ${channelId}`)
        return true
      } catch (error) {
        ctx.logger.error(`[动态推送] 推送失败到 ${channelId}:`, error)
        return false
      }
    }

    /**
     * 格式化直播消息
     */
    function formatLiveMessage(data: any): string {
      const { user, room, type } = data
      let message = ''

      switch (type) {
        case 'live_start':
          message += `🔴 ${user.uname} 开始直播了！\n`
          message += `📺 ${room.title}\n`
          message += `🔗 ${room.jump_url}\n`
          message += `⏰ ${new Date(data.timestamp).toLocaleString()}`
          break

        case 'live_end':
          message += `⚫ ${user.uname} 结束了直播\n`
          message += `📺 ${room.title}\n`
          message += `⏰ ${new Date(data.timestamp).toLocaleString()}`
          break

        case 'live_update':
          message += `🔄 ${user.uname} 更新了直播信息\n`
          message += `📺 ${room.title}\n`
          message += `🔗 ${room.jump_url}\n`
          message += `⏰ ${new Date(data.timestamp).toLocaleString()}`
          break

        default:
          message += `📡 ${user.uname} 的直播状态发生变化\n`
          message += `📺 ${room.title}\n`
          message += `🔗 ${room.jump_url}\n`
          message += `⏰ ${new Date(data.timestamp).toLocaleString()}`
          break
      }

      return message.trim()
    }

    // 监听动态更新事件
    if (config.enableAutoPush) {
      ctx.on('bilibili/dynamic-update' as any, async (data: DynamicEventData) => {
        ctx.logger.info(`[动态事件] 检测到动态事件: ${data.type} - ${data.author.name} (${data.author.uid})`)
        try {
          // 检查动态类型是否在推送列表中
          if (!actualPushTypes.includes(data.type)) {
            return
          }

          const message = formatDynamicMessage(data)
          let coverUrl: string | undefined

          // 获取封面图
          if (data.content.video?.cover) {
            coverUrl = data.content.video.cover
          } else if (data.content.article?.covers?.[0]) {
            coverUrl = data.content.article.covers[0]
          } else if (data.content.images?.[0]) {
            coverUrl = data.content.images[0]
          } else if (data.content.live?.cover) {
            coverUrl = data.content.live.cover
          }

          // 推送到所有匹配的订阅
          for (const subscription of globalData.subscribed) {
            // 检查动态类型是否在订阅的推送类型中
            if (!subscription.pushTypes.includes(data.type)) {
              continue
            }

            // 检查UP主是否在订阅列表中（如果订阅了特定UP主）
            if (subscription.subscribedUids.length > 0 && !subscription.subscribedUids.includes(data.author.uid.toString())) {
              continue
            }

            await sendToChannel(subscription.selfId, subscription.channelId, message, coverUrl)

            // 添加延迟避免发送过快
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

        } catch (error) {
          ctx.logger.error('[动态推送] 处理动态更新时发生错误:', error)
        }
      })

      // 监听通用直播事件
      ctx.on('bilibili/live-update' as any, async (data: LiveEventData) => {
        try {
          ctx.logger.info(`[直播事件] 检测到直播事件: ${data.type} - ${data.user.uname} (${data.user.mid})`

          )

          const message = formatLiveMessage(data)
          const coverUrl = data.user.face // 使用UP主头像作为封面

          // 推送到所有匹配的订阅
          for (const subscription of globalData.subscribed) {
            // 检查UP主是否在订阅列表中
            if (subscription.subscribedUids.length > 0 && !subscription.subscribedUids.includes(data.user.mid.toString())) {
              continue
            }

            ctx.logger.info(`[直播推送] 推送直播通知到 ${subscription.channelId}: ${data.user.uname} - ${data.type}`)
            await sendToChannel(subscription.selfId, subscription.channelId, message, coverUrl)

            // 添加延迟避免发送过快
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

        } catch (error) {
          ctx.logger.error('[直播推送] 处理直播事件时发生错误:', error)
        }
      })
    }

    // 注册命令
    ctx.command('bili-push', 'Bilibili 动态推送管理')

    // 订阅UP主动态到当前频道
    ctx.command('bili-push.订阅 <uid:string>', '订阅UP主动态到当前频道')
      .action(async ({ session }, uid) => {
        if (!session) return '无法获取会话信息'
        if (!uid) return '请提供UP主UID'

        const subscription = addOrUpdateSubscription(
          session.selfId,
          session.channelId,
          session.platform,
          session.guildId
        )

        // 使用字符串存储UID避免精度问题
        if (!subscription.subscribedUids.includes(uid)) {
          subscription.subscribedUids.push(uid)

          try {
            const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
            if (bilibiliBot) {
              const userInfo = await bilibiliBot.internal.getUserInfo(uid)
              globalData.UPNames[uid] = userInfo.name || `UP主${uid}`
            }
          } catch (error) {
            // 默认名称
            globalData.UPNames[uid] = `UP主${uid}`
          }

          saveSubscriptions(globalData)
        }

        const displayName = globalData.UPNames[uid]
          ? `${globalData.UPNames[uid]}（${uid}）`
          : `UP主${uid}`

        return `已订阅UP主 ${displayName} 到当前频道`
      })

    // 取消订阅UP主动态
    ctx.command('bili-push.取消订阅 <uid:string>', '取消订阅UP主动态')
      .action(async ({ session }, uid) => {
        if (!session) return '无法获取会话信息'
        if (!uid) return '请提供UP主UID'

        const subscription = findSubscription(session.selfId, session.channelId)

        if (subscription) {
          const index = subscription.subscribedUids.indexOf(uid)
          if (index !== -1) {
            subscription.subscribedUids.splice(index, 1)

            // 获取显示名称（如果存在）
            const displayName = globalData.UPNames[uid]
              ? `${globalData.UPNames[uid]}（${uid}）`
              : uid

            saveSubscriptions(globalData)
            return `已取消订阅UP主 ${displayName} 的动态`
          }
        }

        return '未找到该UP主的订阅'
      })

    // 查看当前频道的订阅列表
    ctx.command('bili-push.查看订阅', '查看当前频道的订阅列表')
      .action(async ({ session }) => {
        if (!session) return '无法获取会话信息'

        const subscription = findSubscription(session.selfId, session.channelId)

        if (!subscription || subscription.subscribedUids.length === 0) {
          return '当前频道没有订阅任何UP主的动态'
        }

        // 查找没有名称的UID
        const uidsWithoutNames: string[] = []
        subscription.subscribedUids.forEach(uid => {
          if (!globalData.UPNames[uid]) {
            uidsWithoutNames.push(uid)
          }
        })

        // 尝试获取缺失的用户名
        if (uidsWithoutNames.length > 0) {
          const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
          if (bilibiliBot) {
            for (const uid of uidsWithoutNames) {
              try {
                const userInfo = await bilibiliBot.internal.getUserInfo(uid)
                globalData.UPNames[uid] = userInfo.name || `UP主${uid}`
              } catch (error) {
                // 获取失败则跳过，不存储默认名称
              }
            }
            // 保存更新后的订阅信息
            saveSubscriptions(globalData)
          }
        }

        let result = `当前频道订阅的UP主 (${subscription.subscribedUids.length}个):\n`
        subscription.subscribedUids.forEach((uid, index) => {
          const name = globalData.UPNames[uid] || `UP主${uid}`
          result += `${index + 1}. ${name}（${uid}）\n`
        })

        result += `\n推送类型: ${subscription.pushTypes.join(', ')}\n`
        result += `创建时间: ${new Date(subscription.createTime).toLocaleString()}\n`
        result += `更新时间: ${new Date(subscription.updateTime).toLocaleString()}`

        return result
      })

    // 删除当前频道的所有订阅
    ctx.command('bili-push.删除所有订阅', '删除当前频道的所有订阅', { authority: 4 })
      .action(async ({ session }) => {
        if (!session) return '无法获取会话信息'

        const success = removeSubscription(session.selfId, session.channelId)

        return success ? '已删除当前频道的所有订阅' : '当前频道没有任何订阅'
      })

    // 测试推送功能
    ctx.command('bili-push.测试', '测试推送功能')
      .action(async ({ session }) => {
        if (!session) return '无法获取会话信息'

        const testMessage = `🔔 测试推送消息\n⏰ ${new Date().toLocaleString()}\n💬 这是一条测试消息，用于验证推送功能是否正常工作。`

        const success = await sendToChannel(session.selfId, session.channelId, testMessage)

        return success ? '测试推送成功' : '测试推送失败，请查看日志'
      })

    // 关注UP主
    ctx.command('bili-push.关注 <uid:string>', '关注指定UID的UP主')
      .action(async ({ session }, uid) => {
        if (!session) return '无法获取会话信息'
        if (!uid) return '请提供要关注的UP主UID'

        // 验证UID格式
        if (!/^\d+$/.test(uid)) {
          return 'UID格式错误，请提供纯数字的UID'
        }

        try {
          const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
          if (!bilibiliBot) {
            return '未找到 Bilibili 机器人实例'
          }

          await session.send(`正在关注UID为 ${uid} 的UP主...`)

          try {
            const success = await bilibiliBot.internal.followUser(uid)

            if (success) {
              return `✅ 成功关注UID为 ${uid} 的UP主`
            }
          } catch (followError: any) {
            // 检查是否是已经关注的错误
            if (followError.biliCode === 22014) {
              return `ℹ️ 已经关注，无需重复关注`
            }

            // 其他错误
            ctx.logger.error('关注UP主失败:', followError)
            return `❌ 关注失败: ${followError.message}`
          }

        } catch (error) {
          ctx.logger.error('关注UP主失败:', error)
          return `关注失败: ${error.message}`
        }
      })

    // 取消关注UP主
    ctx.command('bili-push.取消关注 <uid:string>', '取消关注指定UID的UP主')
      .action(async ({ session }, uid) => {
        if (!session) return '无法获取会话信息'
        if (!uid) return '请提供要取消关注的UP主UID'

        // 验证UID格式
        if (!/^\d+$/.test(uid)) {
          return 'UID格式错误，请提供纯数字的UID'
        }

        try {
          const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
          if (!bilibiliBot) {
            return '未找到 Bilibili 机器人实例'
          }

          await session.send(`正在取消关注UID为 ${uid} 的UP主...`)

          try {
            const success = await bilibiliBot.internal.unfollowUser(uid)

            if (success) {
              // 获取用户信息以显示用户名
              return `✅ 成功取消关注UID为 ${uid} 的UP主`
            }
          } catch (unfollowError: any) {
            if (unfollowError.biliCode === 22015 || unfollowError.message.includes('未关注')) {
              return `ℹ️ 未关注该用户，无需取消关注`
            }

            // 其他错误
            ctx.logger.error('取消关注UP主失败:', unfollowError)
            return `❌ 取消关注失败: ${unfollowError.message}`
          }

        } catch (error) {
          ctx.logger.error('取消关注UP主失败:', error)
          return `取消关注失败: ${error.message}`
        }
      })

    // 查看直播监听状态
    ctx.command('bili-push.监听状态', '查看动态和直播监听状态')
      .action(async ({ session }) => {
        if (!session) return '无法获取会话信息'

        try {
          const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
          if (!bilibiliBot) {
            return '未找到 Bilibili 机器人实例'
          }

          let result = `📊 监听状态信息:\n\n`

          // 动态监听状态
          const isDynamicPolling = bilibiliBot.internal.isPollingActive()
          result += `🔄 动态监听: ${isDynamicPolling ? '✅ 运行中' : '❌ 已停止'}\n`

          // 直播监听状态
          const isLivePolling = bilibiliBot.internal.isLivePollingActive()
          result += `🔴 直播监听: ${isLivePolling ? '✅ 运行中' : '❌ 已停止'}\n`

          // 当前直播摘要
          if (isLivePolling) {
            const liveSummary = bilibiliBot.internal.getCurrentLiveUsersSummary()
            result += `\n📺 当前直播数量: ${liveSummary.length}个\n`
            if (liveSummary.length > 0) {
              result += `最近更新: ${new Date(Math.max(...liveSummary.map(s => s.timestamp))).toLocaleString()}\n`
            }
          }

          // 订阅统计
          const totalSubs = globalData.subscribed.length
          const totalUids = globalData.subscribed.reduce((sum, sub) => sum + sub.subscribedUids.length, 0)
          result += `\n📋 订阅统计:\n`
          result += `  总订阅数: ${totalSubs}\n`
          result += `  总UP主数: ${totalUids}\n`

          return result

        } catch (error) {
          ctx.logger.error('获取监听状态失败:', error)
          return `获取状态失败: ${error.message}`
        }
      })

    ctx.logger.info(`[动态推送] 插件初始化完成，已加载 ${globalData.subscribed.length} 个订阅`)
  })
}