import { backend } from '@renderer/runtime/backend'
import { Logger } from '../base'
import { getApi, getForegroundToneGridFromImageUrl } from './systemUtil'
import jp from 'jsonpath'

export const linkView = {
    async bilibili(url: string) {
        const logger = new Logger()

        const combinedQuantity = (numObj: any) => {
            try {
                const num = Number(numObj)
                // 如果数量大于一万，返回为 xx 万
                if(num / 10000 >= 1) {
                    return (num / 10000).toFixed(1) + ' w'
                } else if(num / 1000 >= 1) {
                    return (num / 1000).toFixed(1) + ' k'
                } else {
                    return num.toString()
                }
            } catch (_) {
                return numObj
            }
        }

        const previewAPI = 'https://api.bilibili.com/x/web-interface/wbi/view?bvid='
        const match = url.match(/bilibili.com\/video\/(BV[0-9a-zA-Z]+)/)
        if (match) {
            const bvid = match[1]
            logger.info(`[linkView] 获取到 bilibili 链接：${bvid}`)
            const data = await getApi(previewAPI + bvid)
            if (data && data.code === 0) {
                logger.info(`[linkView] 预览 bilibili 链接成功：${data.data.title}`)
                const stat = data.data.stat
                Object.keys(stat).forEach((key) => {
                    stat[key] = combinedQuantity(stat[key])
                })
                return {
                    type: 'bilibili',
                    sub_type: 'video',
                    url: url,
                    data: {
                        title: data.data.title,
                        desc: data.data.desc,
                        pic: data.data.pic,
                        public: data.data.pubdate,
                        owner: data.data.owner,
                        stat: stat
                    }
                }
            }
        }
        return null
    },

    async music163(url: string) {
        const logger = new Logger()

        const urlObj = new URL(url)
        const params = new URLSearchParams(urlObj.search)
        const id = params.get('id')
        if(id != null) {
            logger.info(`[linkView] 获取获取网易云音乐歌曲 ID：${id}`)
            const baseUrl = import.meta.env.VITE_APP_163_MUSIC_API
            try {
                const responseDetail = await getApi(baseUrl + '/song/detail?ids=' + id)
                const responseUrl = await getApi(baseUrl + '/song/url?id=' + id)

                const getData = {
                    detail: responseDetail,
                    url: responseUrl,
                }
                const colorInfo = await getForegroundToneGridFromImageUrl(backend.proxyUrl(jp.query(getData['detail'], '$..al.picUrl')[0]), 0.4)
                const finalData = {
                    type: 'music163',
                    sub_type: 'song',
                    data: {
                        id: id,
                        play_link: jp.query(getData['url'], '$..url')[0],
                        cover: jp.query(getData['detail'], '$..al.picUrl')[0],
                        cover_light: colorInfo[1][1] == 'light',
                        info: {
                            name: jp.query(getData['detail'], '$..name')[0],
                            author: jp.query(getData['detail'], '$..ar[*].name'),
                            time: jp.query(getData['detail'], '$..dt')[0] / 1000,
                            free: jp.query(getData['url'], '$..freeTrialInfo')[0] != null ? {
                                start: jp.query(getData['url'], '$..freeTrialInfo')[0].start,
                                end: jp.query(getData['url'], '$..freeTrialInfo')[0].end,
                            } : null
                        }
                    }
                }
                logger.info('[linkView] 预览网易云音乐成功')
                return finalData
            } catch (error) {
                logger.error(error as Error, '[linkView] 预览网易云音乐失败')
            }
        }
        return null
    }
}
