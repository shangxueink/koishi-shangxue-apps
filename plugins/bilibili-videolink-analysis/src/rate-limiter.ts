import type { Context } from 'koishi'
import type { Config } from './index'

export type BlockReason = 'user-video-limit' | 'channel-video-limit'

// 用户累计到达第 5 个视频时触发停止
const MAX_VIDEO_COUNT = 5
// 同一频道同时处理中的视频数上限
const CHANNEL_ACTIVE_LIMIT = 3
// 用户短时频率的统计窗口
const USER_FREQUENCY_WINDOW = 30 * 1000

interface UserRecord {
  count: number
  dispose: () => void
}

export class VideoRateLimiter {
  private userRecords = new Map<string, UserRecord>()
  private activeChannelCounts: Record<string, number> = {}
  private disposed = false

  constructor(private ctx: Context, private config: Config) {}

  // 新消息入队前检查；逐条消息提前计数，多链接消息交给处理时逐链接停止
  public checkNewMessage(channelId: string, userId: string, linkCount: number): BlockReason | null {
    if (this.disposed || !this.config.preventSingleUserListAttack) {
      return null
    }

    if (this.getUserCount(channelId, userId) >= MAX_VIDEO_COUNT) {
      return 'user-video-limit'
    }

    if (linkCount > 1 && this.getUserCount(channelId, userId) >= MAX_VIDEO_COUNT - 1) {
      return 'user-video-limit'
    }

    if (linkCount === 1 && this.getUserCount(channelId, userId) + 1 >= MAX_VIDEO_COUNT) {
      return 'user-video-limit'
    }

    return null
  }

  // 逐条消息入队时立即计数；多链接消息不在这里占用用户名额
  public reserveMessage(channelId: string, userId: string, linkCount: number): void {
    if (this.disposed || !this.config.preventSingleUserListAttack) {
      return
    }
    if (linkCount === 1) {
      this.addUserCount(channelId, userId, 1)
    }
  }

  // 警戒线触发时把当前这条也计入，让处理中的任务能立即感知
  public blockUser(channelId: string, userId: string): void {
    if (this.disposed || !this.config.preventSingleUserListAttack) {
      return
    }
    this.addUserCount(channelId, userId, 1)
  }

  public isUserBlocked(channelId: string, userId: string): boolean {
    if (this.disposed || !this.config.preventSingleUserListAttack) {
      return false
    }
    return this.getUserCount(channelId, userId) >= MAX_VIDEO_COUNT
  }

  // 每个链接处理前检查；逐条消息按已计数判断，多链接消息最多处理到第 4 个
  public canProcessUserVideo(channelId: string, userId: string, isMultiLinkMessage: boolean): boolean {
    if (this.disposed || !this.config.preventSingleUserListAttack) {
      return true
    }
    const limit = isMultiLinkMessage ? MAX_VIDEO_COUNT - 1 : MAX_VIDEO_COUNT
    return this.getUserCount(channelId, userId) < limit
  }

  // 多链接消息处理完一个链接后立即计入用户频率
  public recordProcessedVideo(channelId: string, userId: string): void {
    if (this.disposed || !this.config.preventSingleUserListAttack) {
      return
    }
    this.addUserCount(channelId, userId, 1)
  }

  public canStartChannelVideo(channelId: string): boolean {
    if (this.disposed || !this.config.preventSingleUserListAttack) {
      return true
    }
    return (this.activeChannelCounts[channelId] ?? 0) < CHANNEL_ACTIVE_LIMIT
  }

  public startChannelVideo(channelId: string): void {
    if (this.disposed) {
      return
    }
    this.activeChannelCounts[channelId] = (this.activeChannelCounts[channelId] ?? 0) + 1
  }

  public endChannelVideo(channelId: string): void {
    if (this.disposed) {
      return
    }
    this.activeChannelCounts[channelId] = Math.max(0, (this.activeChannelCounts[channelId] ?? 0) - 1)
    if (this.activeChannelCounts[channelId] === 0) {
      delete this.activeChannelCounts[channelId]
    }
  }

  public dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    for (const record of this.userRecords.values()) {
      record.dispose()
    }
    this.userRecords.clear()
    this.activeChannelCounts = {}
  }

  private addUserCount(channelId: string, userId: string, count: number): void {
    const key = this.userKey(channelId, userId)
    let record = this.userRecords.get(key)
    if (!record) {
      record = { count: 0, dispose: () => {} }
      this.userRecords.set(key, record)
    }

    record.count += count
    record.dispose()
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
