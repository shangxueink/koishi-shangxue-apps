import { Context, h, Schema, Universal } from 'koishi'

import { DynamicEventData, LiveEventData } from 'koishi-plugin-adapter-bilibili-dm'

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

本插件订阅数据存放于 ./data/bilibili-dynamic-pusher/subscriptions.json 

---
`

// 订阅信息接口
export interface SubscriptionInfo {
  id: string // 唯一标识符
  selfId: string // 机器人ID
  channelId: string // 频道ID
  platform: string // 平台名称
  guildId?: string // 群组ID（如果有）
  subscribedUids: number[] // 订阅的UP主UID列表
  pushTypes: string[] // 推送的动态类型
  createTime: number // 创建时间
  updateTime: number // 更新时间
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
  ctx.logger.info('Bilibili 动态推送插件已启动')

  // 数据文件路径
  const dataFilePath = path.resolve(ctx.baseDir, 'data', name, 'subscriptions.json')

  // 确保目录存在
  function ensureDataDir() {
    const dir = path.dirname(dataFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // 加载订阅数据
  function loadSubscriptions(): SubscriptionInfo[] {
    try {
      ensureDataDir()
      if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8')
        return JSON.parse(data) || []
      }
    } catch (error) {
      ctx.logger.error('加载订阅数据失败:', error)
    }
    return []
  }

  // 保存订阅数据
  function saveSubscriptions(subscriptions: SubscriptionInfo[]) {
    try {
      ensureDataDir()
      fs.writeFileSync(dataFilePath, JSON.stringify(subscriptions, null, 2))
    } catch (error) {
      ctx.logger.error('保存订阅数据失败:', error)
    }
  }

  // 获取订阅数据
  let subscriptions = loadSubscriptions()

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
    return subscriptions.find(sub => sub.id === id)
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
    let subscription = subscriptions.find(sub => sub.id === id)

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
        pushTypes: actualPushTypes.slice(), // 复制默认推送类型
        createTime: now,
        updateTime: now
      }
      subscriptions.push(subscription)
    }

    saveSubscriptions(subscriptions)
    return subscription
  }

  /**
   * 删除订阅
   */
  function removeSubscription(selfId: string, channelId: string): boolean {
    const id = generateSubscriptionId(selfId, channelId)
    const index = subscriptions.findIndex(sub => sub.id === id)

    if (index !== -1) {
      subscriptions.splice(index, 1)
      saveSubscriptions(subscriptions)
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

    // 基础信息
    message += `🔔 ${author.name} ${author.action || '发布了动态'}\n`
    message += `⏰ ${new Date(author.timestamp * 1000).toLocaleString()}\n`

    // 根据动态类型添加特定信息
    switch (type) {
      case 'DYNAMIC_TYPE_AV':
        if (content.video) {
          message += `🎬 ${content.video.title}\n`
          message += `🔗 ${content.video.url}\n`
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
        for (const subscription of subscriptions) {
          // 检查动态类型是否在订阅的推送类型中
          if (!subscription.pushTypes.includes(data.type)) {
            continue
          }

          // 检查UP主是否在订阅列表中（如果订阅了特定UP主）
          if (subscription.subscribedUids.length > 0 && !subscription.subscribedUids.includes(data.author.uid)) {
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
        ctx.logger.info(`[直播事件] 检测到直播事件: ${data.type} - ${data.user.uname} (${data.user.mid})`)

        const message = formatLiveMessage(data)
        const coverUrl = data.user.face // 使用UP主头像作为封面

        // 推送到所有匹配的订阅
        for (const subscription of subscriptions) {
          // 检查UP主是否在订阅列表中
          if (subscription.subscribedUids.length > 0 && !subscription.subscribedUids.includes(data.user.mid)) {
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

      if (!subscription.subscribedUids.includes(Number(uid))) {
        subscription.subscribedUids.push(Number(uid))
        saveSubscriptions(subscriptions)
      }

      return `已订阅UP主 ${uid} 到当前频道`
    })

  // 取消订阅UP主动态
  ctx.command('bili-push.取消订阅 <uid:string>', '取消订阅UP主动态')
    .action(async ({ session }, uid) => {
      if (!session) return '无法获取会话信息'
      if (!uid) return '请提供UP主UID'

      const subscription = findSubscription(session.selfId, session.channelId)

      if (subscription) {
        const index = subscription.subscribedUids.indexOf(Number(uid))
        if (index !== -1) {
          subscription.subscribedUids.splice(index, 1)
          saveSubscriptions(subscriptions)
          return `已取消订阅UP主 ${uid} 的动态`
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

      let result = `当前频道订阅的UP主 (${subscription.subscribedUids.length}个):\n`
      subscription.subscribedUids.forEach((uid, index) => {
        result += `${index + 1}. ${uid}\n`
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
            // 获取用户信息以显示用户名
            try {
              const userInfo = await bilibiliBot.internal.getUserInfo(uid)
              return `✅ 成功关注UID为 ${uid} 的UP主：${userInfo.name || '未知用户'}`
            } catch {
              return `✅ 成功关注UID为 ${uid} 的UP主`
            }
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
            try {
              const userInfo = await bilibiliBot.internal.getUserInfo(uid)
              return `✅ 成功取消关注UID为 ${uid} 的UP主：${userInfo.name || '未知用户'}`
            } catch {
              return `✅ 成功取消关注UID为 ${uid} 的UP主`
            }
          }
        } catch (unfollowError: any) {
          // 检查是否是未关注的错误（可能的错误码，需要根据实际情况调整）
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
        const totalSubs = subscriptions.length
        const totalUids = subscriptions.reduce((sum, sub) => sum + sub.subscribedUids.length, 0)
        result += `\n📋 订阅统计:\n`
        result += `  总订阅数: ${totalSubs}\n`
        result += `  总UP主数: ${totalUids}\n`

        return result

      } catch (error) {
        ctx.logger.error('获取监听状态失败:', error)
        return `获取状态失败: ${error.message}`
      }
    })

  ctx.logger.info(`[动态推送] 插件初始化完成，已加载 ${subscriptions.length} 个订阅`)

  // 设置推送类型
  /*
  ctx.command('bili-push.设置推送类型 <types:text>', '设置当前频道的推送类型')
    .action(async ({ session }, types) => {
      if (!session) return '无法获取会话信息'
      if (!types) return '请提供推送类型，用逗号分隔'

      const typeList = types.split(',').map(t => t.trim())
      const validTypes = extractDynamicTypes(typeList)

      const subscription = addOrUpdateSubscription(
        session.selfId,
        session.channelId,
        session.platform,
        session.guildId
      )

      subscription.pushTypes = validTypes
      saveSubscriptions(subscriptions)

      return `已设置推送类型: ${validTypes.join(', ')}`
    })
    */

  // 手动推送最新动态
  /*
  ctx.command('bili-push.最新动态 [uid:string]', '手动推送最新动态')
    .action(async ({ session }, uid) => {
      if (!session) return '无法获取会话信息'

      try {
        const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
        if (!bilibiliBot) {
          return '未找到 Bilibili 机器人实例'
        }

        await session.send('正在获取最新动态...')

        let dynamics
        if (uid) {
          dynamics = await bilibiliBot.internal.getPersonalDynamics(uid)
        } else {
          dynamics = await bilibiliBot.internal.getAllFollowedDynamics()
        }

        if (dynamics.length === 0) {
          return '未获取到任何动态'
        }

        const latestDynamic = dynamics[0]
        const author = latestDynamic.modules.module_author
        const content = latestDynamic.modules.module_dynamic

        // 构建事件数据格式
        const eventData = {
          dynamicId: latestDynamic.id_str,
          type: latestDynamic.type,
          author: {
            uid: author.mid,
            name: author.name,
            face: author.face,
            action: author.pub_action,
            timestamp: author.pub_ts
          },
          content: {
            text: content.desc?.text || '',
            type: content.major?.type || 'unknown',
            video: content.major?.archive ? {
              aid: content.major.archive.aid,
              bvid: content.major.archive.bvid,
              title: content.major.archive.title,
              desc: content.major.archive.desc,
              cover: content.major.archive.cover,
              url: content.major.archive.jump_url
            } : undefined,
            images: content.major?.draw?.items.map(item => item.src),
            article: content.major?.article ? {
              id: content.major.article.id,
              title: content.major.article.title,
              desc: content.major.article.desc,
              covers: content.major.article.covers,
              url: content.major.article.jump_url
            } : undefined,
            live: content.major?.live ? {
              id: content.major.live.id,
              title: content.major.live.title,
              cover: content.major.live.cover,
              url: content.major.live.jump_url,
              isLive: content.major.live.live_state === 1
            } : undefined
          },
          rawData: latestDynamic
        }

        const message = formatDynamicMessage(eventData)
        let coverUrl: string | undefined

        // 获取封面图
        if (eventData.content.video?.cover) {
          coverUrl = eventData.content.video.cover
        } else if (eventData.content.article?.covers?.[0]) {
          coverUrl = eventData.content.article.covers[0]
        } else if (eventData.content.images?.[0]) {
          coverUrl = eventData.content.images[0]
        } else if (eventData.content.live?.cover) {
          coverUrl = eventData.content.live.cover
        }

        const success = await sendToChannel(session.selfId, session.channelId, message, coverUrl)

        return success ? '动态推送成功' : '动态推送失败，请查看日志'

      } catch (error) {
        ctx.logger.error('手动推送动态失败:', error)
        return `推送失败: ${error.message}`
      }
    })
*/


  // 查看所有订阅统计
  /*
  ctx.command('bili-push.查看订阅统计', '查看订阅统计信息')
    .action(async ({ session }) => {
      if (!session) return '无法获取会话信息'

      const totalSubs = subscriptions.length
      const totalUids = subscriptions.reduce((sum, sub) => sum + sub.subscribedUids.length, 0)

      let result = `📊 订阅统计信息:\n`
      result += `总订阅数: ${totalSubs}\n`
      result += `总UP主数: ${totalUids}\n`
      result += `数据文件: ${dataFilePath}\n`

      if (totalSubs > 0) {
        result += `\n最近更新: ${new Date(Math.max(...subscriptions.map(s => s.updateTime))).toLocaleString()}`
      }

      return result
    })
*/

  // 搜索用户
  /*ctx.command('bili-push.搜索 <username:text>', '搜索用户信息')
    .action(async ({ session }, username) => {
      if (!session) return '无法获取会话信息'
      if (!username) return '请提供要搜索的用户名'

      try {
        const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
        if (!bilibiliBot) {
          return '未找到 Bilibili 机器人实例'
        }

        await session.send(`正在搜索用户: ${username}...`)

        const users = await bilibiliBot.internal.searchUsersByName(username)

        if (users.length === 0) {
          return `未找到用户名包含 "${username}" 的用户`
        }

        let result = `找到如下用户:\n`

        // 最多显示前10个结果
        const displayUsers = users.slice(0, 10)

        for (let i = 0; i < displayUsers.length; i++) {
          const user = displayUsers[i]
          result += `${i + 1}. 用户名：${user.uname}\n`
          result += `   UID：${user.mid}\n`
          result += `   签名：${user.usign || '无'}\n`
          result += `   粉丝数：${user.fans}\n`
          result += `   视频数：${user.videos}\n`

          if (user.official_verify && user.official_verify.desc) {
            result += `   认证：${user.official_verify.desc}\n`
          }

          result += `\n`
        }

        if (users.length > 10) {
          result += `... 还有 ${users.length - 10} 个结果未显示\n`
        }

        result += `\n使用 "关注 <UID>" 来关注指定用户`

        return result

      } catch (error) {
        ctx.logger.error('搜索用户失败:', error)
        return `搜索失败: ${error.message}`
      }
    })*/

  // 获取用户信息
  /*
  ctx.command('bili-push.用户信息 <uid:string>', '获取指定UID的用户详细信息')
    .alias('bili-push.userinfo')
    .example('bili-push.用户信息 299913678')
    .example('bili-push.userinfo 299913678')
    .action(async ({ session }, uid) => {
      if (!session) return '无法获取会话信息'
      if (!uid) return '请提供要查看的用户UID'

      // 验证UID格式
      if (!/^\d+$/.test(uid)) {
        return 'UID格式错误，请提供纯数字的UID'
      }

      try {
        const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
        if (!bilibiliBot) {
          return '未找到 Bilibili 机器人实例'
        }

        await session.send(`正在获取UID为 ${uid} 的用户信息...`)

        let userInfo: any = null
        let isFollowing: boolean = false
        let getUserInfoError: string | null = null

        // 获取用户信息
        try {
          userInfo = await bilibiliBot.internal.getUserInfo(uid)
        } catch (error) {
          ctx.logger.error('获取用户信息失败:', error)
        }

        // 获取关注状态
        try {
          isFollowing = await bilibiliBot.internal.isFollowing(uid)
        } catch (error) {
          ctx.logger.error('获取关注状态失败:', error)
        }

        // 如果用户信息获取失败，返回错误信息
        if (!userInfo) {
          let errorMsg = `获取用户 ${uid} 的信息失败`
          if (getUserInfoError) {
            errorMsg += `：${getUserInfoError}`
          }

          const status = isFollowing ? '✅ 已关注' : '❌ 未知'
          errorMsg += `\n关注状态：${status}`

          return errorMsg
        }

        // 构建详细的用户信息
        let result = `👤 用户详细信息\n`

        // 发送头像（如果有的话）
        if (userInfo.face) {
          result += `${h.image(userInfo.face)}\n`
        }

        result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`

        // 基本信息
        result += `📝 基本信息:\n`
        result += `  用户名：${userInfo.name || '未知'}\n`
        result += `  UID：${uid}\n`
        result += `  性别：${userInfo.sex || '保密'}\n`
        result += `  等级：Lv.${userInfo.level || '未知'}\n`
        result += `  签名：${userInfo.sign || '无个性签名'}\n`

        // 关注状态
        result += `\n🔗 关注状态:\n`

        result += `  ${isFollowing ? '✅ 已关注' : '❌ 未未知'}\n`


        // 认证信息
        if (userInfo.official && (userInfo.official.desc || userInfo.official.title)) {
          result += `\n🏆 认证信息:\n`
          if (userInfo.official.title) {
            result += `  认证类型：${userInfo.official.title}\n`
          }
          if (userInfo.official.desc) {
            result += `  认证描述：${userInfo.official.desc}\n`
          }
        }

        // VIP信息
        if (userInfo.vip && userInfo.vip.status === 1) {
          result += `\n💎 会员信息:\n`
          result += `  会员类型：${userInfo.vip.label?.text || '大会员'}\n`
          if (userInfo.vip.due_date) {
            const dueDate = new Date(userInfo.vip.due_date)
            result += `  到期时间：${dueDate.toLocaleDateString()}\n`
          }
        }

        // 粉丝勋章信息
        if (userInfo.fans_medal && userInfo.fans_medal.show && userInfo.fans_medal.medal) {
          const medal = userInfo.fans_medal.medal
          result += `\n🏅 粉丝勋章:\n`
          result += `  勋章名称：${medal.medal_name}\n`
          result += `  勋章等级：${medal.level}级\n`
          result += `  亲密度：${medal.intimacy}/${medal.next_intimacy}\n`
        }

        // 头像挂件
        if (userInfo.pendant && userInfo.pendant.name) {
          result += `\n🎭 头像挂件:\n`
          result += `  挂件名称：${userInfo.pendant.name}\n`
        }

        // 勋章信息
        if (userInfo.nameplate && userInfo.nameplate.name) {
          result += `\n🎖️ 勋章信息:\n`
          result += `  勋章名称：${userInfo.nameplate.name}\n`
          result += `  勋章等级：${userInfo.nameplate.level}\n`
          if (userInfo.nameplate.condition) {
            result += `  获得条件：${userInfo.nameplate.condition}\n`
          }
        }

        result += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        return result

      } catch (error) {
        ctx.logger.error('获取用户信息失败:', error)
        return `获取用户信息失败: ${error.message}`
      }
    })
    */

  // 查看当前直播状态
  /**ctx.command('bili-push.直播状态 [uid:string]', '查看指定UP主或所有关注UP主的直播状态')
    .action(async ({ session }, uid) => {
      if (!session) return '无法获取会话信息'

      try {
        const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
        if (!bilibiliBot) {
          return '未找到 Bilibili 机器人实例'
        }

        await session.send('正在获取直播状态...')

        if (uid) {
          // 查看指定UP主的直播状态
          const isLive = await bilibiliBot.internal.isUserLive(Number(uid))
          if (isLive) {
            const liveStatus = await bilibiliBot.internal.getUserLiveStatus(Number(uid))
            if (liveStatus) {
              let result = `🔴 UP主 ${liveStatus.uname} 正在直播\n`
              result += `📺 ${liveStatus.title}\n`
              result += `🏠 房间号：${liveStatus.room_id}\n`
              result += `🔗 ${liveStatus.jump_url}`
              return result
            }
          } else {
            return `⚫ UP主 ${uid} 当前未在直播`
          }
        } else {
          // 查看所有正在直播的UP主
          const liveUsers = await bilibiliBot.internal.getLiveUsers()
          if (liveUsers.length === 0) {
            return '当前没有关注的UP主在直播'
          }

          let result = `🔴 当前正在直播的UP主 (${liveUsers.length}个):\n\n`
          liveUsers.forEach((user, index) => {
            result += `${index + 1}. ${user.uname} (${user.mid})\n`
            result += `   📺 ${user.title}\n`
            result += `   🏠 房间号：${user.room_id}\n`
            result += `   🔗 ${user.jump_url}\n\n`
          })

          return result.trim()
        }

      } catch (error) {
        ctx.logger.error('获取直播状态失败:', error)
        return `获取直播状态失败: ${error.message}`
      }
    })
    */

  // 手动检查直播状态
  /*ctx.command('bili-push.检查直播', '手动触发一次直播状态检查')
    .action(async ({ session }) => {
      if (!session) return '无法获取会话信息'

      try {
        const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili')
        if (!bilibiliBot) {
          return '未找到 Bilibili 机器人实例'
        }

        await session.send('正在手动检查直播状态变化...')

        await bilibiliBot.internal.manualLiveCheck()

        return '✅ 直播状态检查完成，如有变化将自动推送'

      } catch (error) {
        ctx.logger.error('手动检查直播状态失败:', error)
        return `检查失败: ${error.message}`
      }
    })*/

  // 查看关注状态
  /*ctx.command('bili-push.关注状态 <uid:string>', '查看指定UID的关注状态')
    .action(async ({ session }, uid) => {
      if (!session) return '无法获取会话信息'
      if (!uid) return '请提供要查看的UP主UID'

      // 验证UID格式
      if (!/^\d+$/.test(uid)) {
        return 'UID格式错误，请提供纯数字的UID'
      }

      try {
        const bilibiliBot = ctx.bots.find(bot => bot.platform === 'bilibili') as any
        if (!bilibiliBot) {
          return '未找到 Bilibili 机器人实例'
        }

        // 分别处理关注状态检查和用户信息获取
        let isFollowing: boolean | null = null
        let userInfo: any = null
        let followingError: string | null = null
        let userInfoError: string | null = null

        // 检查关注状态
        try {
          isFollowing = await bilibiliBot.internal.isFollowing(uid)
        } catch (error) {
          followingError = error instanceof Error ? error.message : String(error)
          ctx.logger.error('检查关注状态失败:', error)
        }

        // 获取用户信息
        try {
          userInfo = await bilibiliBot.internal.getUserInfo(uid)
        } catch (error) {
          userInfoError = error instanceof Error ? error.message : String(error)
          ctx.logger.warn('获取用户信息失败:', error)
        }

        // 构建返回信息
        let result = ''

        if (userInfo) {
          result += `用户：${userInfo.name || '未知用户'} (UID: ${uid})\n`
        } else {
          result += `UID: ${uid}\n`
          if (userInfoError) {
            result += `用户信息：获取失败 (${userInfoError})\n`
          }
        }

        if (isFollowing !== null) {
          const status = isFollowing ? '✅ 已关注' : '❌ 未关注'
          result += `关注状态：${status}`
        } else {
          result += `关注状态：检查失败`
          if (followingError) {
            result += ` (${followingError})`
          }
        }

        return result

      } catch (error) {
        ctx.logger.error('查看关注状态失败:', error)
        return `查看关注状态失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
    */

}
