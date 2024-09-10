import { Context, Logger } from 'koishi';
import { SpeakerKeyMap } from './constants';
// eslint-disable-next-line @typescript-eslint/naming-convention
import { betavits, betavitsService } from './service';
import { Config } from './config';

export * from './config';
const logger = new Logger('beta-dxl-bert-vits');
export function apply(ctx: Context, config: Config) {
    const vits = new betavits(ctx, config);

    // if (config.service) {
    ctx.plugin(betavitsService, vits);
    // }

    ctx.command('betavits <text:text>', 'AIbetavits语音合成帮助')
        .option('speaker', '-s [speaker:string] 语音合成的讲者', {
            fallback: config.speaker,
        })
        .option('sdp_ratio', '-sr [sdp_ratio:nubmer] 语音合成的SDP/DP混合比', {
            fallback: config.sdp_ratio,
        })
        .option('noise', '-n [noise:number] 语音合成的感情强度', {
            fallback: config.noise,
        })
        .option('noisew', '-nw [noisew:number] 语音合成的音素长度', {
            fallback: config.noisew,
        })
        .option('length', '-l [length:number] 语音合成语速', {
            fallback: config.length,
        })
        .option('prompt', '-p [prompt:string] 辅助语音合成的情感文本', {
            fallback: config.prompt,
        })
        .option('weight', '-w [weight:number] 主文本和辅助文本的混合比率', {
            fallback: config.weight,
        })
        .action(async ({ session, options }, text) => {
            if (!text) {
                await session.execute('betavits -h');
                return null;
            }

            // 检查 session.channelId 是否在 groupListmapping 中
            const groupConfig = config.groupListmapping.find(
                (group: { groupList: string }) =>
                    group.groupList === session.channelId
            );
            // options 被你吃了？
            const finalSpeaker =
                options.speaker ??
                (groupConfig ? groupConfig.defaultspeaker : config.speaker);

            // 日志调试模式
            if (config.loggerinfo) {
                // 打印当前的 session.channelId
                logger.info(`当前频道: ${session.channelId}`);

                // 打印找到的群组配置
                if (groupConfig) {
                    logger.info(
                        `找到的群组配置: ${JSON.stringify(groupConfig)}`
                    );
                } else {
                    logger.info('未找到当前频道的群组配置。');
                }

                // 打印最终使用的讲者
                logger.info(`最终确定的讲者: ${finalSpeaker}`);
            }

            const version =
                SpeakerKeyMap[finalSpeaker] ??
                SpeakerKeyMap[finalSpeaker + '_ZH'];
            if (!version) {
                return `找不到这个 ${finalSpeaker} 讲者，请检查你的输入。`;
            }

            return await vits.say(
                text,
                Object.assign(options, {
                    speaker: finalSpeaker,
                })
            ); // 确保 speaker 被正确传递
        });
}

export const inject = {
    optional: ['translator'],
};
