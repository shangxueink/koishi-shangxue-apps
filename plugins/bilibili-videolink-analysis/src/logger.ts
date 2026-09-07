import type { Logger } from 'koishi'

export class PluginLogger {
  constructor(
    private readonly logger: Logger,
    private readonly debugEnabled: boolean,
  ) {}

  // 调试日志仅在配置开启时输出
  debug(format: any, ...params: any[]) {
    if (this.debugEnabled) {
      this.logger.info(format, ...params)
    }
  }

  warn(format: any, ...params: any[]) {
    this.logger.warn(format, ...params)
  }

  error(format: any, ...params: any[]) {
    this.logger.error(format, ...params)
  }
}
