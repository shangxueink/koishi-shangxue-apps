import { Context, Bot, Session } from 'koishi'
import { logInfo, loggerError, loggerInfo } from './index'
import { decodeStringId, decodeChannelId } from './utils'


declare module 'koishi' {
  interface Tables {
    channelprivate: channelprivate
    bindingchannel: BindingChannel
  }
}


declare module 'koishi' {
  interface Binding {
    botselfid?: string
  }
}

export interface channelprivate {
  id: number
  userId: string
  channelId: string
  botSelfId: string
  platform: string
  createdAt: Date
  updatedAt: Date
}

export interface BindingChannel {
  id: number
  channelId: string
  aid: number
  createdAt: Date
  updatedAt: Date
}




export class BotFinder {
  private recordingLocks: Set<string> = new Set()
  private recordingDebounce: Map<string, NodeJS.Timeout> = new Map()
  private bindingUpdateLocks: Set<string> = new Set()

  constructor(private ctx: Context) {
    this.initializeDatabase()
    this.setupEventListeners()

    this.ctx.on('ready', () => {
      this.cleanupDuplicateRecords()
    })
  }




  private initializeDatabase() {
    this.ctx.model.extend('channelprivate', {
      id: 'unsigned',
      userId: 'string',
      channelId: 'string',
      botSelfId: 'string',
      platform: 'string',
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
    }, {
      primary: 'id',
      autoInc: true,
      unique: [['userId', 'channelId']],
    })

    this.ctx.model.extend('bindingchannel', {
      id: 'unsigned',
      channelId: 'string',
      aid: 'unsigned',
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
    }, {
      primary: 'id',
      autoInc: true,
      unique: [['channelId'], ['aid']],
    })
  }




  private setupEventListeners() {
    this.ctx.on('ready', () => {
      this.ctx.middleware(async (session, next) => {
        this.updateBindingBotSelfId(session)
        this.handleMessageForchannelprivate(session)
        return next()
      })

      logInfo('Private channel event listeners set up')
    })
  }




  private async handleMessageForchannelprivate(session: Session) {



    if (!session.isDirect) {
      return
    }

    try {

      const bot = this.ctx.bots.find(b =>
        b.platform === session.platform &&
        b.selfId === session.selfId
      )

      if (!bot) {
        logInfo('No bot found for session: %s/%s', session.platform, session.selfId)
        return
      }


      await this.recordchannelprivate(
        session.userId,
        session.channelId || `private:${session.userId}`,
        bot.selfId,
        session.platform
      )
    } catch (error) {
      loggerError('Error handling private channel message: %s', error.message)
    }
  }




  private async updateBindingBotSelfId(session: Session) {
    if (!this.isDatabaseAvailable()) {
      return
    }

    const lockKey = `${session.userId}:${session.platform}`


    if (this.bindingUpdateLocks.has(lockKey)) {
      return
    }


    this.bindingUpdateLocks.add(lockKey)

    try {

      const bindings = await this.ctx.database.get('binding', {
        pid: `${session.userId}`,
        platform: session.platform
      })

      if (bindings.length > 0) {
        const binding = bindings[0]

        if (!binding.botselfid || binding.botselfid !== session.selfId) {
          await this.ctx.database.set('binding', {
            pid: `${session.userId}`,
            platform: session.platform
          }, {
            botselfid: session.selfId
          })

          logInfo('Updated binding botselfid for user %s: %s', session.userId, session.selfId)
        }
      }
    } catch (error) {
      loggerError('Error updating binding botselfid: %s', error.message)
    } finally {

      this.bindingUpdateLocks.delete(lockKey)
    }
  }




  private recordchannelprivate(userId: string, channelId: string, botSelfId: string, platform: string) {

    const userIdStr = String(userId)
    const key = `${userIdStr}|${channelId}`


    const existingTimer = this.recordingDebounce.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }


    const timer = setTimeout(async () => {
      await this.doRecordchannelprivate(userIdStr, channelId, botSelfId, platform)
      this.recordingDebounce.delete(key)
    }, 100)

    this.recordingDebounce.set(key, timer)
  }




  private async doRecordchannelprivate(userId: string, channelId: string, botSelfId: string, platform: string) {
    if (!this.isDatabaseAvailable()) {
      logInfo('Database not available, skipping private channel record')
      return
    }

    const key = `${userId}|${channelId}`


    if (this.recordingLocks.has(key)) {
      logInfo('Already recording for %s, skipping', key)
      return
    }


    this.recordingLocks.add(key)

    try {

      const userIdStr = String(userId)


      const existing = await this.ctx.database.get('channelprivate', {
        userId: userIdStr,
        channelId,
      })

      if (existing.length > 0) {

        await this.ctx.database.set('channelprivate', {
          userId: userIdStr,
          channelId,
        }, {
          botSelfId,
          platform,
          updatedAt: new Date(),
        })

        logInfo('Updated private channel record: %s -> %s', channelId, botSelfId)
      } else {

        await this.ctx.database.create('channelprivate', {
          userId: userIdStr,
          channelId,
          botSelfId,
          platform,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        logInfo('Created private channel record: %s -> %s', channelId, botSelfId)
      }
    } catch (error) {
      loggerError('Error recording private channel: %s', error.message)
    } finally {

      this.recordingLocks.delete(key)
    }
  }




  private isDatabaseAvailable(): boolean {
    return !!(this.ctx.database && typeof this.ctx.database.get === 'function')
  }




  private async cleanupDuplicateRecords() {
    if (!this.isDatabaseAvailable()) {
      return
    }

    try {

      const allRecords = await this.ctx.database.get('channelprivate', {})


      const groups = new Map<string, typeof allRecords>()

      for (const record of allRecords) {
        const key = `${record.userId}|${record.channelId}`
        if (!groups.has(key)) {
          groups.set(key, [])
        }
        groups.get(key)!.push(record)
      }


      let cleanedCount = 0
      for (const [key, records] of groups) {
        if (records.length > 1) {

          const latest = records.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0]

          const toDelete = records.filter(r => r.id !== latest.id)

          for (const record of toDelete) {
            await this.ctx.database.remove('channelprivate', { id: record.id })
            cleanedCount++
          }
        }
      }

      if (cleanedCount > 0) {
        logInfo('Cleaned up %d duplicate private channel records', cleanedCount)
      }
    } catch (error) {
      loggerError('Error cleaning up duplicate records: %s', error.message)
    }
  }







  async findBotByChannelId(channelId: string): Promise<Bot | null> {
    try {

      if (!this.isDatabaseAvailable()) {
        throw new Error('Database not available')
      }


      const channelprivates = await this.ctx.database.get('channelprivate', {
        channelId: channelId
      })

      if (channelprivates.length > 0) {
        const channelprivate = channelprivates[0]
        const bot = this.ctx.bots.find(bot => bot.selfId === channelprivate.botSelfId)

        if (bot) {
          return bot
        } else {
          logInfo('Bot with selfId %s not found for private channel, trying fallback', channelprivate.botSelfId)
        }
      }


      if (channelId.startsWith('private:')) {
        return null
      }



      const channels = await this.ctx.database.get('channel', {
        guildId: channelId
      })

      if (channels.length === 0) {
        throw new Error(`No channel found for channelId: ${channelId}`)
      }


      const channel = channels[0]
      const assignee = channel.assignee

      if (!assignee) {
        logInfo('No assignee found for channel: %s', channelId)
        return null
      }


      const bot = this.ctx.bots.find(bot => bot.selfId === assignee)

      if (bot) {
        return bot
      } else {
        logInfo('Bot with selfId %s not found in active bots', assignee)
        return null
      }
    } catch (error) {
      loggerError('Error finding bot for channel %s: %s', channelId, error.message)
      return null
    }
  }






  async findBotByUserId(userId: string): Promise<Bot | null> {
    try {
      if (!this.isDatabaseAvailable()) {
        throw new Error('Database not available')
      }


      const bindings = await this.ctx.database.get('binding', {
        pid: String(userId)
      })

      if (bindings.length > 0) {
        const binding = bindings[0]
        if (binding.botselfid) {
          const bot = this.ctx.bots.find(bot => bot.selfId === binding.botselfid)
          if (bot) {
            return bot
          } else {
            logInfo('Bot with selfId %s not found for user, bot may be offline', binding.botselfid)
          }
        }
      }


      throw new Error(`No bot found for user: ${userId}`)
    } catch (error) {
      loggerError('Error finding bot for user %s: %s', userId, error.message)
      throw new Error(`Failed to find bot for user ${userId}: ${error.message}`)
    }
  }







  async findBot(params: any = {}, clientState: any): Promise<Bot | null> {


    if (clientState?.selfId) {
      const bot = this.ctx.bots.find(bot => bot.selfId === clientState.selfId)
      if (bot) {
        logInfo('Found bot by clientState.selfId: %s', clientState.selfId)
        return bot
      }
    }

    if (params.group_id) {

      const originalGroupId = await decodeChannelId(params.group_id, this.ctx)
      logInfo('Decoded group_id %s to %s', params.group_id, originalGroupId)
      const bot = await this.findBotByChannelId(originalGroupId)
      if (bot) {
        return bot
      }
    }


    if (params.user_id) {

      const originalUserId = await decodeStringId(params.user_id, this.ctx)
      logInfo('Decoded user_id %s to %s', params.user_id, originalUserId)
      const bot = await this.findBotByUserId(originalUserId)
      if (bot) {
        return bot
      }
    }



    const availableBots = this.ctx.bots
    if (availableBots.length > 0) {
      logInfo('Using first available bot as fallback: %s', availableBots[0].selfId)
      return availableBots[0]
    }


    throw new Error('No suitable bot found for the request')
  }




  getAvailableBots(): Bot[] {
    return this.ctx.bots
  }




  async getchannelprivateId(userId: string): Promise<string | null> {
    try {
      if (!this.isDatabaseAvailable()) {
        return null
      }

      const channelprivates = await this.ctx.database.get('channelprivate', {
        userId: String(userId)
      })

      if (channelprivates.length > 0) {
        const channelId = channelprivates[0].channelId
        logInfo('Found private channel %s for user %s', channelId, userId)
        return channelId
      }

      return null
    } catch (error) {
      loggerError('Error finding private channel for user %s: %s', userId, error.message)
      return null
    }
  }




  findBotByPlatformAndId(platform: string, selfId: string): Bot | null {
    return this.ctx.bots.find(bot =>
      bot.platform === platform && bot.selfId === selfId
    ) || null
  }
}
