import { rmSync } from 'fs';
import { Config, logger } from './index';
import { Context } from 'koishi';

export const createCustomFile = (ctx: Context): void => {
    try {
        ctx.component('custom-file', (attrs, children, session) => {
            if (session.platform !== 'onebot') {
                return '该平台适配器不支持导出文件类型消息';
            }
            const onebot = (session as any).onebot;
            try {
                if (session.subtype === 'private') {
                    const id = session.channelId;
                    const reg = /private:(\d+)/;
                    const userId = reg.test(id) ? reg.exec(id)[1] : null;
                    if (userId)
                        onebot
                            .uploadPrivateFile(userId, attrs.location, attrs.name)
                            .finally(() => rmSync(attrs.location));
                    // onebot.uploadPrivateFile()
                } else {
                    onebot
                        .uploadGroupFile(session.channelId, attrs.location, attrs.name)
                        .finally(() => rmSync(attrs.location));
                }
            } catch (error) {
                return `发送文件失败`;
            }

            return `已发送文件 ${attrs.name}`;
        });
    } catch (error) {
        logger.info('已经注册该组件');
    }
};
