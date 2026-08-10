import { Context } from 'koishi'

export interface BackupRunResult {
  ok: boolean
  message: string
}

export type BackupRunner = () => Promise<BackupRunResult>

export function registerBackupCommand(ctx: Context, runner: BackupRunner): void {
  ctx.command('备份', { authority: 4 })
    .alias('备份koishi')
    .action(async ({ session }) => {
      const result = await runner()
      await session.send(result.message)
    })
}
