"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.sleep = exports.inject = exports.name = void 0;
const koishi_1 = require("koishi");
exports.name = 'pingfen';
exports.inject = {
    optional: ['database'],
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
exports.Config = koishi_1.Schema.object({
    headers: koishi_1.Schema.array(koishi_1.Schema.object({
        key: koishi_1.Schema.string(),
        value: koishi_1.Schema.string(),
    }))
        .default([])
        .role('table'),
});
function apply(ctx, config) {
    const l = ctx.logger('pingfen');
    let task = Promise.resolve();
    let i = 0;
    const headers = config.headers.reduce((c, x) => ((c[x.key] = x.value), c), {});
    ctx.model.extend('pingfen', {
        key: {
            type: 'string',
            length: 255,
            nullable: false,
        },
        value: {
            type: 'string',
            length: 255,
            nullable: false,
        },
    }, {
        primary: 'key',
        unique: [['key']],
    });
    ctx.command('pingfen [商品:text]').action(async ({ session }, key) => {
        if (!key)
            return session.execute('help pingfen');
        const queryKey = `${key}的具体评分是多少`;
        void session.send(`正在查询${key}的评分`);
        await (0, exports.sleep)(1000);
        try {
            const cached = await ctx.database.get('pingfen', queryKey, ['value']);
            if (cached.length)
                return `${key} 的评分是${extractScore(cached[0].value)}`;
            const t = task.then(async () => {
                try {
                    const result = await ctx.http.post('https://www.pingti.xyz/api/chat', JSON.stringify({
                        messages: [
                            {
                                role: 'user',
                                content: queryKey,
                            },
                        ],
                    }), {
                        headers,
                    });
                    return result;
                }
                catch (e) {
                    l.error('请求API时出现错误：');
                    l.error(e);
                    return '请求API时出现了问题 >_<……请稍后再试吧';
                }
            });
            task = t.then(() => (0, exports.sleep)(2000));
            const result = (await t).toString('utf8');
            if (result instanceof Error)
                throw result;
            void ctx.database
                .upsert('pingfen', [
                {
                    key,
                    value: result,
                },
            ])
                .catch((e) => {
                l.error('写入数据库时出现错误：');
                l.error(e);
            });
            return `${key} 的分数是：${extractScore(result)}`;
        }
        catch (e) {
            l.error('处理时出现错误：');
            l.error(e);
            return '出现了问题 >_<……请稍后再试吧';
        }
    });

    // 提取分数
    function extractScore(text) {
        
        const match = text.match(/(?<=是)\d+(\.\d+)?/);
        // 如果有匹配到的数字，则返回第一个匹配的数字，否则返回"价值连城🥰"
        return match ? match[0] : "价值连城🥰";
    }
}
exports.apply = apply;