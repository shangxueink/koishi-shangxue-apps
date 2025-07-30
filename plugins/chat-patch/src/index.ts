import { Context, Schema, Session, h } from 'koishi'
import { } from '@koishijs/plugin-console'

import path from 'node:path'
import fs from 'node:fs'

export const name = 'chat-patch'
export const reusable = false
export const filter = false
export const inject = {
  required: ['console']
}

export const usage = `

---

开启后，即可在koishi控制台操作机器人收发消息啦

暂时只支持接受图文消息 / 发送文字消息

---
`


export interface Config {
  loggerinfo: boolean
  maxMessagesPerChannel: number
  keepMessagesOnClear: number
  blockedPlatforms: Array<{
    platformName: string
    exactMatch: boolean
  }>
  chatContainerHeight: number
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    maxMessagesPerChannel: Schema.number().default(1000).description('每个群组最大保存消息数量').min(50).max(5000),
    keepMessagesOnClear: Schema.number().default(0).description('手动清理历史记录时保留的消息数量').min(0).max(1000),
    blockedPlatforms: Schema.array(Schema.object({
      platformName: Schema.string().description('平台名称或关键词'),
      exactMatch: Schema.boolean().default(false).description('完全匹配？如果关闭，包含关键词即屏蔽').default(true)
    })).role('table').description('屏蔽的平台列表').default([
      {
        "platformName": "qq",
        "exactMatch": true
      },
      {
        "platformName": "qqguild",
        "exactMatch": true
      },
      {
        "platformName": "sandbox",
        "exactMatch": false
      }
    ]),
  }).description('基础设置'),

  Schema.object({
    chatContainerHeight: Schema.number().default(80).description('手机端使用的视口高度（防止文本输入框被挡住）').min(50).max(100),
    loggerinfo: Schema.boolean().default(false).description('日志调试模式').experimental(),
  }).description('进阶设置'),
])


interface BotInfo {
  selfId: string
  platform: string
  username: string
  avatar?: string
  status: 'online' | 'offline'
}

interface ChannelInfo {
  id: string
  name: string
  type: number | string
  guildId?: string
  guildName?: string
}

interface QuoteInfo {
  messageId: string
  id: string
  content: string
  elements?: h[]
  user: {
    id: string
    name: string
    userId: string
    avatar?: string
    username: string
  }
  timestamp: number
}

interface MessageInfo {
  id: string
  content: string
  userId: string
  username: string
  avatar?: string
  timestamp: number
  channelId: string
  selfId: string
  elements?: h[]
  type: 'user' | 'bot'
  guildId?: string
  guildName?: string
  platform: string
  quote?: QuoteInfo
}

interface ChatData {
  bots: Record<string, BotInfo>
  channels: Record<string, Record<string, ChannelInfo>>
  messages: Record<string, MessageInfo[]>
  pinnedBots: string[]
  pinnedChannels: string[]
  lastSaveTime?: number
}

export async function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('chat-patch')
  const dataFilePath = path.resolve(ctx.baseDir, 'data', 'chat-patch', 'chat-data.json')

  // 初始化
  const initialData = readChatDataFromFile()
  const cleanedData = cleanExcessMessages(initialData)

  // 如果清理了数据，立即写回文件
  const originalCount = Object.values(initialData.messages).reduce((total, msgs) => total + msgs.length, 0)
  const cleanedCount = Object.values(cleanedData.messages).reduce((total, msgs) => total + msgs.length, 0)

  if (originalCount !== cleanedCount) {
    writeChatDataToFile(cleanedData)
  }

  logInfo('插件加载完成，数据统计:', {
    机器人数量: Object.keys(cleanedData.bots).length,
    频道数量: Object.keys(cleanedData.channels).reduce((total, botId) =>
      total + Object.keys(cleanedData.channels[botId] || {}).length, 0),
    消息频道数: Object.keys(cleanedData.messages).length,
    总消息数: Object.values(cleanedData.messages).reduce((total, msgs) => total + msgs.length, 0)
  })

  // 监听消息，直接广播给前端处理
  ctx.on('message', async (session) => {
    // 检查平台是否被屏蔽
    if (isPlatformBlocked(session.platform || 'unknown')) {
      logInfo(`忽略来自被屏蔽平台的消息: ${session.platform}`)
      return
    }

    // 直接广播消息事件给前端处理
    await broadcastMessageEvent(session)
  })

  // 插件启动时设置定期清理过期消息
  ctx.on('ready', async () => {
    logInfo('插件启动完成，开始监听消息')

    // 定期清理超量消息
    setInterval(() => {
      const data = readChatDataFromFile()
      const cleanedData = cleanExcessMessages(data)

      // 如果有消息被清理，写回文件
      const originalCount = Object.values(data.messages).reduce((total, msgs) => total + msgs.length, 0)
      const cleanedCount = Object.values(cleanedData.messages).reduce((total, msgs) => total + msgs.length, 0)

      if (originalCount !== cleanedCount) {
        writeChatDataToFile(cleanedData)
        logInfo('定期清理完成，清理了', originalCount - cleanedCount, '条超量消息')
      }
    }, 300000) // 每5分钟清理一次
  })

  // 获取所有聊天数据的 API
  ctx.console.addListener('get-chat-data' as any, async () => {
    try {
      const data = readChatDataFromFile()
      const cleanedData = cleanExcessMessages(data)

      logInfo('获取聊天数据:', {
        机器人数量: Object.keys(cleanedData.bots).length,
        频道数量: Object.keys(cleanedData.channels).reduce((total, botId) =>
          total + Object.keys(cleanedData.channels[botId] || {}).length, 0),
        消息频道数: Object.keys(cleanedData.messages).length,
        总消息数: Object.values(cleanedData.messages).reduce((total, msgs) => total + msgs.length, 0)
      })

      return {
        success: true,
        data: {
          ...cleanedData,
          pinnedBots: cleanedData.pinnedBots, // 包含置顶机器人
          pinnedChannels: cleanedData.pinnedChannels // 包含置顶频道
        }
      }
    } catch (error: any) {
      logger.error('获取聊天数据失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 获取历史消息的 API
  ctx.console.addListener('get-history-messages' as any, async (requestData: {
    selfId: string
    channelId: string
  }) => {
    try {
      const data = readChatDataFromFile()
      const channelKey = `${requestData.selfId}-${requestData.channelId}`
      const messages = data.messages[channelKey] || []

      // 按时间戳排序返回消息
      const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp)

      logInfo('获取历史消息:', channelKey, '共', sortedMessages.length, '条消息')

      return {
        success: true,
        messages: sortedMessages
      }
    } catch (error: any) {
      logger.error('获取历史消息失败:', error)
      return { success: false, error: error?.message || String(error), messages: [] }
    }
  })

  // 获取所有频道消息数量的 API
  ctx.console.addListener('get-all-channel-message-counts' as any, async () => {
    try {
      const data = readChatDataFromFile()
      const counts: Record<string, number> = {}

      // 统计每个频道的消息数量
      for (const [channelKey, messages] of Object.entries(data.messages)) {
        counts[channelKey] = messages.length
      }

      logInfo('获取所有频道消息数量:', {
        频道数: Object.keys(counts).length,
        总消息数: Object.values(counts).reduce((total, count) => total + count, 0)
      })

      return {
        success: true,
        counts: counts
      }
    } catch (error: any) {
      logger.error('获取频道消息数量失败:', error)
      return { success: false, error: error?.message || String(error), counts: {} }
    }
  })

  // 图片获取 API 
  // 返回base64数据
  ctx.console.addListener('fetch-image' as any, async (data: { url: string }) => {
    try {
      const response = await fetch(data.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': ''
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      return {
        success: true,
        base64: base64,
        contentType: contentType,
        dataUrl: `data:${contentType};base64,${base64}`
      }
    } catch (error: any) {
      // 无需打印错误
      // logger.error('获取图片失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 清理频道历史记录的 API
  ctx.console.addListener('clear-channel-history' as any, async (data: {
    selfId: string
    channelId: string
    keepCount?: number
  }) => {
    try {
      logInfo('收到清理历史记录请求:', data)

      const chatData = readChatDataFromFile()
      const channelKey = `${data.selfId}-${data.channelId}`

      if (!chatData.messages[channelKey]) {
        return { success: true, message: '频道没有历史消息' }
      }

      const messages = chatData.messages[channelKey]
      const originalCount = messages.length

      // 使用配置的保留数量，如果请求中没有指定则使用配置默认值
      const keepCount = data.keepCount || config.keepMessagesOnClear

      if (keepCount > 0 && originalCount <= keepCount) {
        return { success: true, message: `消息数量(${originalCount})未超过保留数量(${keepCount})，无需清理` }
      }

      // 按时间戳排序，保留最新的消息
      const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)
      const keptMessages = keepCount > 0 ? sortedMessages.slice(-keepCount) : []
      const clearedCount = originalCount - keptMessages.length

      // 更新数据
      chatData.messages[channelKey] = keptMessages

      // 写入文件
      writeChatDataToFile(chatData)

      logInfo(`频道 ${channelKey} 历史记录清理完成:`, {
        原始消息数: originalCount,
        保留消息数: keptMessages.length,
        清理消息数: clearedCount
      })

      return {
        success: true,
        message: `成功清理 ${clearedCount} 条历史消息，保留最新 ${keptMessages.length} 条`,
        clearedCount: clearedCount,
        keptCount: keptMessages.length
      }
    } catch (error: any) {
      logger.error('清理频道历史记录失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 发送消息的 API
  ctx.console.addListener('send-message' as any, async (data: {
    selfId: string
    channelId: string
    content: string
  }) => {
    try {
      logInfo('收到发送消息请求:', data)

      // 找到对应的机器人
      const bot = ctx.bots.find((bot: any) => bot.selfId === data.selfId)
      if (!bot) {
        logger.error('未找到机器人:', data.selfId)
        return { success: false, error: '未找到指定的机器人' }
      }

      // 使用 bot.sendMessage 发送消息
      const result = await bot.sendMessage(data.channelId, data.content)
      logInfo('消息发送成功:', result)

      const timestamp = Date.now()

      // 更新机器人信息到文件
      const chatData = readChatDataFromFile()
      const botInfo: BotInfo = {
        selfId: bot.selfId,
        platform: bot.platform || 'unknown',
        username: bot.user?.name || `Bot-${data.selfId}`,
        avatar: bot.user?.avatar,
        status: 'online'
      }
      chatData.bots[bot.selfId] = botInfo
      writeChatDataToFile(chatData)

      // 创建机器人消息信息对象并直接添加到文件
      const botMessageInfo: MessageInfo = {
        id: Array.isArray(result) ? result[0] : result || `bot-msg-${timestamp}`,
        content: data.content,
        userId: bot.selfId,
        username: bot.user?.name || `Bot-${data.selfId}`,
        avatar: bot.user?.avatar,
        timestamp: timestamp,
        channelId: data.channelId,
        selfId: data.selfId,
        type: 'bot',
        platform: bot.platform || 'unknown'
      }

      // 直接添加到文件
      addMessageToFile(botMessageInfo)

      // 发送成功后，广播机器人发送的消息事件给前端
      const sentMessageEvent = {
        type: 'bot-message-sent',
        selfId: data.selfId,
        channelId: data.channelId,
        messageId: Array.isArray(result) ? result[0] : result,
        content: data.content,
        timestamp: timestamp,
        botUsername: bot.user?.name || `Bot-${data.selfId}`,
        botAvatar: bot.user?.avatar
      }

      ctx.console.broadcast('bot-message-sent-event', sentMessageEvent)

      return { success: true, messageId: Array.isArray(result) ? result[0] : result }
    } catch (error: any) {
      logger.error('发送消息失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 删除机器人所有数据的 API
  ctx.console.addListener('delete-bot-data' as any, async (data: {
    selfId: string
  }) => {
    try {
      logInfo('收到删除机器人数据请求:', data)

      const chatData = readChatDataFromFile()
      let deletedChannels = 0
      let deletedMessages = 0

      // 删除该机器人的所有频道
      if (chatData.channels[data.selfId]) {
        deletedChannels = Object.keys(chatData.channels[data.selfId]).length
        delete chatData.channels[data.selfId]
      }

      // 删除该机器人的所有消息
      const channelsToDelete = Object.keys(chatData.messages).filter(key => key.startsWith(`${data.selfId}-`))
      for (const channelKey of channelsToDelete) {
        deletedMessages += chatData.messages[channelKey].length
        delete chatData.messages[channelKey]
      }

      // 删除机器人信息
      delete chatData.bots[data.selfId]

      // 写入文件
      writeChatDataToFile(chatData)

      logInfo(`机器人 ${data.selfId} 数据删除完成:`, {
        删除频道数: deletedChannels,
        删除消息数: deletedMessages
      })

      return {
        success: true,
        message: `成功删除机器人数据：${deletedChannels} 个频道，${deletedMessages} 条消息`,
        deletedChannels,
        deletedMessages
      }
    } catch (error: any) {
      logger.error('删除机器人数据失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 删除频道所有数据的 API
  ctx.console.addListener('delete-channel-data' as any, async (data: {
    selfId: string
    channelId: string
  }) => {
    try {
      logInfo('收到删除频道数据请求:', data)

      const chatData = readChatDataFromFile()
      const channelKey = `${data.selfId}-${data.channelId}`
      let deletedMessages = 0

      // 删除频道消息
      if (chatData.messages[channelKey]) {
        deletedMessages = chatData.messages[channelKey].length
        delete chatData.messages[channelKey]
      }

      // 删除频道信息
      if (chatData.channels[data.selfId] && chatData.channels[data.selfId][data.channelId]) {
        delete chatData.channels[data.selfId][data.channelId]
      }

      // 写入文件
      writeChatDataToFile(chatData)

      logInfo(`频道 ${channelKey} 数据删除完成:`, {
        删除消息数: deletedMessages
      })

      return {
        success: true,
        message: `成功删除频道数据：${deletedMessages} 条消息`,
        deletedMessages
      }
    } catch (error: any) {
      logger.error('删除频道数据失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 设置置顶机器人列表的 API
  ctx.console.addListener('set-pinned-bots' as any, async (data: {
    pinnedBots: string[]
  }) => {
    try {
      logInfo('收到设置置顶机器人请求:', data.pinnedBots)
      const chatData = readChatDataFromFile()
      chatData.pinnedBots = data.pinnedBots
      writeChatDataToFile(chatData)
      return { success: true }
    } catch (error: any) {
      logger.error('设置置顶机器人失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 设置置顶频道列表的 API
  ctx.console.addListener('set-pinned-channels' as any, async (data: {
    pinnedChannels: string[]
  }) => {
    try {
      logInfo('收到设置置顶频道请求:', data.pinnedChannels)
      const chatData = readChatDataFromFile()
      chatData.pinnedChannels = data.pinnedChannels
      writeChatDataToFile(chatData)
      return { success: true }
    } catch (error: any) {
      logger.error('设置置顶频道失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 获取插件配置的 API
  ctx.console.addListener('get-plugin-config' as any, async () => {
    try {
      return {
        success: true,
        config: {
          maxMessagesPerChannel: config.maxMessagesPerChannel,
          keepMessagesOnClear: config.keepMessagesOnClear,
          loggerinfo: config.loggerinfo,
          blockedPlatforms: config.blockedPlatforms || [],
          chatContainerHeight: config.chatContainerHeight
        }
      }
    } catch (error: any) {
      logger.error('获取插件配置失败:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  // 注册控制台页面
  ctx.console.addEntry({
    dev: path.resolve(__dirname, '../client/index.ts'),
    prod: path.resolve(__dirname, '../dist'),
  })

  // 日志调试
  function logInfo(...args: any[]) {
    if (config.loggerinfo) {
      (logger.info as (...args: any[]) => void)(...args)
    }
  }

  // 检查平台是否被屏蔽
  function isPlatformBlocked(platform: string): boolean {
    if (!config.blockedPlatforms || config.blockedPlatforms.length === 0) {
      return false
    }

    for (const blockedPlatform of config.blockedPlatforms) {
      if (blockedPlatform.exactMatch) {
        // 完全匹配
        if (platform === blockedPlatform.platformName) {
          logInfo(`平台 ${platform} 被屏蔽 (完全匹配: ${blockedPlatform.platformName})`)
          return true
        }
      } else {
        // 包含匹配
        if (platform.includes(blockedPlatform.platformName)) {
          logInfo(`平台 ${platform} 被屏蔽 (包含匹配: ${blockedPlatform.platformName})`)
          return true
        }
      }
    }

    return false
  }

  // 确保目录存在
  function ensureDataDir() {
    const dir = path.dirname(dataFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // 从JSON文件读取数据
  function readChatDataFromFile(): ChatData {
    try {
      if (fs.existsSync(dataFilePath)) {
        const jsonData = fs.readFileSync(dataFilePath, 'utf8')
        const data = JSON.parse(jsonData)
        return {
          bots: data.bots || {},
          channels: data.channels || {},
          messages: data.messages || {},
          pinnedBots: data.pinnedBots || [], // 读取置顶机器人
          pinnedChannels: data.pinnedChannels || [], // 读取置顶频道
          lastSaveTime: data.lastSaveTime
        }
      }
    } catch (error) {
      logger.error('读取聊天数据失败:', error)
    }
    return {
      bots: {},
      channels: {},
      messages: {},
      pinnedBots: [], // 默认空数组
      pinnedChannels: [] // 默认空数组
    }
  }

  // 写入数据到JSON文件
  function writeChatDataToFile(data: ChatData) {
    try {
      ensureDataDir()
      data.lastSaveTime = Date.now()
      const jsonData = JSON.stringify(data, null, 2)
      fs.writeFileSync(dataFilePath, jsonData, 'utf8')
    } catch (error) {
      logger.error('写入聊天数据失败:', error)
    }
  }

  // 清理超量消息
  // 保留最新的消息
  function cleanExcessMessages(data: ChatData): ChatData {
    let cleanedCount = 0
    const cleanedMessages: Record<string, MessageInfo[]> = {}

    for (const [channelKey, messages] of Object.entries(data.messages)) {
      if (messages.length > config.maxMessagesPerChannel) {
        // 按时间戳排序，保留最新的消息
        const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)
        const keptMessages = sortedMessages.slice(-config.maxMessagesPerChannel)
        cleanedCount += messages.length - keptMessages.length
        cleanedMessages[channelKey] = keptMessages
        logInfo(`频道 ${channelKey} 清理了 ${messages.length - keptMessages.length} 条旧消息，保留最新 ${keptMessages.length} 条`)
      } else {
        cleanedMessages[channelKey] = messages
      }
    }

    if (cleanedCount > 0) {
      logInfo('总共清理超量消息:', cleanedCount, '条')
    }

    return {
      ...data,
      messages: cleanedMessages
    }
  }

  // 添加消息到JSON文件
  function addMessageToFile(messageInfo: MessageInfo) {
    const data = readChatDataFromFile()
    const channelKey = `${messageInfo.selfId}-${messageInfo.channelId}`

    if (!data.messages[channelKey]) {
      data.messages[channelKey] = []
    }

    // 使用统一的时间戳
    messageInfo.timestamp = Date.now()
    data.messages[channelKey].push(messageInfo)

    // 限制消息数量 - 保留最新的消息
    if (data.messages[channelKey].length > config.maxMessagesPerChannel) {
      // 按时间戳排序，保留最新的消息
      data.messages[channelKey].sort((a, b) => a.timestamp - b.timestamp)
      const removedCount = data.messages[channelKey].length - config.maxMessagesPerChannel
      data.messages[channelKey] = data.messages[channelKey].slice(-config.maxMessagesPerChannel)
      logInfo(`频道 ${channelKey} 达到消息上限，清理了 ${removedCount} 条旧消息`)
    }

    // 立即写入文件
    writeChatDataToFile(data)
    logInfo('添加消息到文件:', channelKey, '当前消息数:', data.messages[channelKey].length)
  }

  // 更新机器人信息到JSON文件
  function updateBotInfoToFile(session: Session) {
    const data = readChatDataFromFile()

    const botInfo: BotInfo = {
      selfId: session.selfId,
      platform: session.platform || 'unknown',
      username: session.bot.user?.name || `Bot-${session.selfId}`,
      avatar: session.bot.user?.avatar,
      status: 'online'
    }

    data.bots[session.selfId] = botInfo
    writeChatDataToFile(data)
    logInfo('更新机器人信息到文件:', botInfo.username)
  }

  // 更新频道信息到JSON文件
  async function updateChannelInfoToFile(session: Session) {
    const data = readChatDataFromFile()

    // 获取群组名称，如果失败则使用频道ID作为备用
    let guildName = session.channelId
    try {
      if (session.guildId && session.bot.getGuild && typeof session.bot.getGuild === 'function') {
        const guild = await session.bot.getGuild(session.guildId)
        guildName = guild?.name || session.channelId
      }
    } catch (guildError) {
      logInfo('获取群组信息失败，使用频道ID作为备用:', guildError)
      guildName = session.channelId
    }

    if (!data.channels[session.selfId]) {
      data.channels[session.selfId] = {}
    }

    const channelInfo: ChannelInfo = {
      id: session.channelId,
      name: session.guildId
        ? `${guildName} (${session.channelId})`
        : `私信 ${session.channelId}`,
      type: session.type || 0,
      guildId: session.guildId,
      guildName: guildName
    }

    data.channels[session.selfId][session.channelId] = channelInfo
    writeChatDataToFile(data)
    logInfo('更新频道信息到文件:', channelInfo.name)

    return guildName
  }

  async function broadcastMessageEvent(session: Session) {
    try {
      // 更新机器人和频道信息到文件
      updateBotInfoToFile(session)
      const guildName = await updateChannelInfoToFile(session)

      const timestamp = Date.now()

      // 处理 quote 信息
      let quoteInfo: QuoteInfo | undefined = undefined
      if (session.quote) {
        quoteInfo = {
          messageId: session.quote.messageId || session.quote.id,
          id: session.quote.id,
          content: session.quote.content || '',
          elements: session.quote.elements,
          user: {
            id: session.quote.user?.id || session.quote.user?.userId || 'unknown',
            name: session.quote.user?.name || session.quote.user?.username || 'unknown',
            userId: session.quote.user?.userId || session.quote.user?.id || 'unknown',
            avatar: session.quote.user?.avatar,
            username: session.quote.user?.username || session.quote.user?.name || 'unknown'
          },
          timestamp: session.quote.timestamp || Date.now()
        }
      }

      // 创建消息信息对象
      const messageInfo: MessageInfo = {
        id: session.messageId || `msg-${timestamp}`,
        content: session.content || '',
        userId: session.userId || 'unknown',
        username: session.username || session.userId || 'unknown',
        avatar: session.author?.avatar,
        timestamp: timestamp,
        channelId: session.channelId,
        selfId: session.selfId,
        elements: session.elements,
        type: 'user',
        guildId: session.guildId,
        guildName: guildName,
        platform: session.platform || 'unknown',
        quote: quoteInfo
      }

      // 直接添加到文件
      addMessageToFile(messageInfo)

      const messageEvent = {
        type: 'message',
        selfId: session.selfId,
        platform: session.platform || 'unknown',
        channelId: session.channelId,
        messageId: session.messageId,
        content: session.content,
        userId: session.userId || 'unknown',
        username: session.username || session.userId || 'unknown',
        avatar: session.author?.avatar,
        timestamp: timestamp,
        guildId: session.guildId,
        guildName: guildName,
        channelType: session.type || 0,
        elements: session.elements,
        quote: quoteInfo,
        bot: {
          avatar: session.bot.user?.avatar,
          name: session.bot.user?.name,
        }
      }

      ctx.console.broadcast('chat-message-event', messageEvent)
    } catch (error) {
      logger.error('广播消息事件失败:', error)
    }
  }

}
