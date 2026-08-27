/*
 * @FileDescription: 基础功能模块
 * @Author: Stapxs
 * @Date: 2022/10/20
 * @Version: 1.0
 * @Description: 此模块主要为程序相关的基础功能
 */

import Option from './option'
import { reactive } from 'vue'
import { PopInfoElem } from './elements/system'

// =============== 日志 ===============

export enum LogType {
    WS,
    UI,
    ERR,
    INFO,
    DEBUG,
    SYSTEM
}

export class Logger {
    private logTypeInfo: [string, string][]

    constructor() {
        // 日志类型输出文本前缀样式，顺序对应 LogType
        this.logTypeInfo = [
            ['7abb7e', 'fff'],
            ['b573f7', 'fff'],
            ['ff5370', 'fff'],
            ['99b3db', 'fff'],
            ['677480', 'fff'],
            ['e5a5a9', 'fff'],
        ]
    }

    /**
     * 输出一条日志
     * @param mode 日志类型
     * @param args 日志内容
     */
    add(type: LogType, args: string, data = '' as any, hidden = false) {
        const logLevel = Option.get('log_level')
        // PS：WS, UI, ERR, INFO, DEBUG
        // all 将会输出以上全部类型，debug 将会输出 DEBUG、UI，info 将会输出 INFO，err 将会输出 ERR
        if(import.meta.env.DEV && type === LogType.SYSTEM) {
            this.print(type, args, data, hidden)
        } else if (logLevel === 'all') {
            this.print(type, args, data, hidden)
        } else if (
            logLevel === 'debug' &&
            (type === LogType.DEBUG || type === LogType.UI)
        ) {
            this.print(type, args, data, hidden)
        } else if (logLevel === 'info' && type === LogType.INFO) {
            this.print(type, args, data, hidden)
        } else if (logLevel === 'err' && type === LogType.ERR) {
            this.print(type, args, data, hidden)
        }
    }
    info(args: string, hidden = false) {
        this.add(LogType.INFO, args, undefined, hidden)
    }
    error(e: Error | null, args: string, hidden = false) {
        if (e) {
            // this.add(LogType.ERR, args + '\n' + e.stack?.replaceAll('webpack-internal:///./', 'webpack-internal:///'), undefined, hidden)
            this.add(LogType.ERR, args + '\n', e, hidden)
        } else {
            this.add(LogType.ERR, args, undefined, hidden)
        }
    }
    debug(args: string, hidden = false) {
        this.add(LogType.DEBUG, args, undefined, hidden)
    }
    system(args: string) {
        this.add(LogType.SYSTEM, args, undefined, true)
    }
    /**
     * 打印一条日志
     * @param type 日志类型
     * @param args 日志内容
     */
    private print(type: LogType, args: string, data: any, hidden: boolean) {
        const error = new Error()
        // 浏览器类型，用于判断是不是 webkit
        let isWebkit = /webkit/i.test(navigator.userAgent)
        if(window.electron != undefined) {
            // electron 是 chrome，但是 userAgent 里面含有 webkit 字样
            isWebkit = false
        }
        // 从调用栈中获取调用者信息
        let from = undefined as string | undefined
        const stack = error.stack
        if (stack) {
            const stackArr = stack.split('\n')
            // 找到第一个不是 at Logger 开头的调用者信息（WebKit 为第一个 @ 开头）
            for (let i = 1; i < stackArr.length; i++) {
                if (isWebkit ? stackArr[i].startsWith('@') : !stackArr[i].includes('at Logger')) {
                    // 取出链接部分，去除括号
                    from = stackArr[i].replace(/\(|\)/g, '').split(' ').pop() || ''
                    from = from.replace(
                        'webpack-internal:///./',
                        'webpack-internal:///',
                    )
                    if(from.startsWith('@')) {
                        from = from.substring(1)
                    }
                    if (from.startsWith('webpack-internal:///node_modules')) {
                        from = undefined
                    }
                    break
                }
            }
        }
        // 打印日志
        let typeStr = LogType[type]
        if (typeStr === 'WS') {
            if (args.startsWith('GET')) {
                args = args.substring(4)
                typeStr = '◀'
                if(data.echo) {
                    typeStr += ` ${data.echo.replace('send_', '')}`
                } else if(data.post_type) {
                    typeStr += ` ${data.post_type}`
                }
            } else if (args.startsWith('PUT')) {
                args = args.substring(4)
                typeStr = '▶'
                if(data.action) {
                    typeStr += ` ${data.action}`
                }
                if(data.echo) {
                    typeStr += ` -> ${data.echo.replace('send_', '')}`
                }
            }
        }

        // 如果存在 vconsole 就不打印带 css 样式的日志（它不支持）
        // 因为在 capturer 下 from 是无意义的，所以也不显示
        if (document.getElementById('__vconsole')) {
            const { message } = this.buildLogParams(typeStr, args, hidden, type)
            this.logOutput(message.replaceAll('%c', ' | '), [], data, false)
        } else {
            const { message, styles } = this.buildLogParams(typeStr, args, hidden, type, from)
            this.logOutput(message, styles, data)
        }
    }

    private buildLogParams(
        typeStr: string,
        args: string,
        hidden: boolean,
        type: LogType,
        from?: string
    ): { message: string; styles: string[] } {
        const hasFrom = !hidden && from;
        if (hasFrom) {
            return {
                message: `%c${typeStr}%c${from}%c\n${args}`,
                styles: [
                    `background:#${this.logTypeInfo[type][0]};color:#${this.logTypeInfo[type][1]};border-radius:7px 0 0 7px;padding:2px 4px 2px 7px;margin-bottom:7px;`,
                    'background:#e3e8ec;color:#000;padding:2px 7px 4px 4px;border-radius:0 7px 7px 0;margin-bottom:7px;',
                    ''
                ]
            }
        } else {
            return {
                message: `%c${typeStr}%c ${args}`,
                styles: [
                    `background:#${this.logTypeInfo[type][0]};color:#${this.logTypeInfo[type][1]};border-radius:7px;padding:2px 4px 2px 7px;margin-bottom:7px;`,
                    '',
                    ''
                ]
            }
        }
    }

    private logOutput(message: string, styles: string[], data: any, useStyles = true) {
        if (useStyles) {
            // eslint-disable-next-line no-console
            console.log(message, ...styles, data)
        } else {
            // eslint-disable-next-line no-console
            console.log(message, data)
        }
    }
}

// =============== 系统消息 ===============

export enum PopType {
    INFO = 'circle-info',
    ERR = 'circle-exclamation',
}

export class PopInfo {
    /**
     *
     * @param typeInfo 消息类型
     * @param args 消息内容
     * @param isAutoClose 是否自动关闭（默认为 true）
     */
    add(icon: PopType, args: string, isAutoClose = true) {
        const data: PopInfoElem = {
            id: popList.length,
            svg: icon,
            text: args,
            autoClose: isAutoClose,
        }
        popList.splice(popList.length, 0, data)
        // 创建定时器
        if (data.autoClose) {
            setTimeout(() => {
                this.remove(data.id)
            }, 5000)
        }
    }

    /**
     * 移除一条消息
     * @param id 消息编号
     */
    remove(id: number) {
        const index = popList.findIndex((item) => {
            return item.id === id
        })
        if (index !== -1) {
            popList.splice(index, 1)
        }
    }

    /**
     * 清空所有消息
     */
    clear() {
        // 因为消息是有动画的，所以需要延迟清空
        setTimeout(() => {
            popList.splice(0, popList.length)
        }, 300)
    }
}

export const popList: PopInfoElem[] = reactive([])
