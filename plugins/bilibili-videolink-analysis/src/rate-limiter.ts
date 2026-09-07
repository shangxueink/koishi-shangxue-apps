import type { Context } from 'koishi'
import type { Config } from './config'

export type BlockReason = 'user-video-limit' | 'channel-video-limit'

// 单用户累计 5 个视频后触发暂停
const MAX_VIDEO_COUNT = 5
// 同一频道同时处理的视频数上限
const CHANNEL_ACTIVE_LIMIT = 3
// 用户短时间频率的统计窗口
const USER_FREQUENCY_WINDOW = 30 * 1000

interface UserRecord {
  count: number
  dispose: () => void
}

export class VideoRateLimiter {
  private userRecords = new Map<string, UserRecord>()
  private activeChannelCounts: Record<string, number> = {}
  private disposed = false

  constructor(private readonly ctx: Context, private readonly config: Config) {}

  // 新消息入队前检查；单链接消息提前计数，多链接消息交给处理时逐条判断
  checkNewMessage(channelId: string, userId: string, linkCount: number): BlockReason | null {
    if (this.disposed || !this.config.preventSingleUserListAttack) return null

    const count = this.getUserCount(channelId, userId)
    if (count >= MAX_VIDEO_COUNT) return 'user-video-limit'
    if (linkCount > 1 && count >= MAX_VIDEO_COUNT - 1) return 'user-video-limit'
    if (linkCount === 1 && count + 1 >= MAX_VIDEO_COUNT) return 'user-video-limit'
    return null
  }

  reserveMessage(channelId: string, userId: string, linkCount: number) {
    if (this.disposed || !this.config.preventSingleUserListAttack) return
    if (linkCount === 1) {
      this.addUserCount(channelId, userId, 1)
    }
  }

  blockUser(channelId: string, userId: string) {
    if (this.disposed || !this.config.preventSingleUserListAttack) return
    this.addUserCount(channelId, userId, 1)
  }

  isUserBlocked(channelId: string, userId: string): boolean {
    if (this.disposed || !this.config.preventSingleUserListAttack) return false
    return this.getUserCount(channelId, userId) >= MAX_VIDEO_COUNT
  }

  canProcessUserVideo(channelId: string, userId: string, isMultiLinkMessage: boolean): boolean {
    if (this.disposed || !this.config.preventSingleUserListAttack) return true
    const limit = isMultiLinkMessage ? MAX_VIDEO_COUNT - 1 : MAX_VIDEO_COUNT
    return this.getUserCount(channelId, userId) < limit
  }

  recordProcessedVideo(channelId: string, userId: string) {
    if (this.disposed || !this.config.preventSingleUserListAttack) return
    this.addUserCount(channelId, userId, 1)
  }

  canStartChannelVideo(channelId: string): boolean {
    if (this.disposed || !this.config.preventSingleUserListAttack) return true
    return (this.activeChannelCounts[channelId] ?? 0) < CHANNEL_ACTIVE_LIMIT
  }

  startChannelVideo(channelId: string) {
    if (this.disposed) return
    this.activeChannelCounts[channelId] = (this.activeChannelCounts[channelId] ?? 0) + 1
  }

  endChannelVideo(channelId: string) {
    if (this.disposed) return
    this.activeChannelCounts[channelId] = Math.max(0, (this.activeChannelCounts[channelId] ?? 0) - 1)
    if (this.activeChannelCounts[channelId] === 0) {
      delete this.activeChannelCounts[channelId]
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const record of this.userRecords.values()) {
      record.dispose()
    }
    this.userRecords.clear()
    this.activeChannelCounts = {}
  }

  private addUserCount(channelId: string, userId: string, count: number) {
    const key = this.userKey(channelId, userId)
    let record = this.userRecords.get(key)
    if (!record) {
      record = { count: 0, dispose: () => {} }
      this.userRecords.set(key, record)
    }

    record.count += count
    record.dispose()
    // 窗口结束自动清除记录，避免内存持续增长
    record.dispose = this.ctx.setTimeout(() => {
      this.userRecords.delete(key)
    }, USER_FREQUENCY_WINDOW)
  }

  private getUserCount(channelId: string, userId: string): number {
    return this.userRecords.get(this.userKey(channelId, userId))?.count ?? 0
  }

  private userKey(channelId: string, userId: string): string {
    return `${channelId}:${userId}`
  }
}

