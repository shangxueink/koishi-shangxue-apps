import { Context, Schema, h } from 'koishi';
import { } from '@koishijs/assets';

export const name = 'assets-test';
export const inject = ["assets"];
export interface Config { }

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  // write your plugin here
  ctx
    .command('测试图床')
    .action(async ({ session }) => {
      const aaa = await ctx.assets.transform(`${h.image("file:///D:/Pictures/meme/2024-12-07-13-23-30-038.png")}`);
      ctx.logger.info(aaa);
      return h.text(`${aaa}`);
    });

  ctx
    .command('测试语音')
    .action(async ({ session }) => {
      await session.send(h.audio("https://api.qijieya.cn/meting/?type=url&id=1391282847"));
      return;
    });
}
