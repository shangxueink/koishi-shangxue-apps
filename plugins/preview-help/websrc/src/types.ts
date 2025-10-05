export interface MenuItem {
    id: string
    title: string
    description: string
    groupId: string
    order: number
}

export interface MenuGroup {
    id: string
    name: string
    order: number
}

export interface Config {
    title: string
    subtitle: string
    gradientColor1: string // 渐变色起始颜色
    gradientColor2: string // 渐变色结束颜色
    useRandomGradient: boolean // 是否使用随机渐变
    backgroundBrightness: number
    badgeText: string
    badgePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center'
    fontUrl: string
    selectedFont: string
    customFonts: { name: string, url: string }[]
    menuItems: MenuItem[]
    menuGroups: MenuGroup[]
    columns: number
    columnWidth: number
    heightAdjustment: number // 高度调整误差，正数增加高度，负数减少高度
    titleColor: string // 标题颜色
    subtitleColor: string // 副标题颜色
    globalTextColor: string // 全局指令文字、分组文字、角标文字颜色
    itemBackgroundColor: string // 指令方块背景色
}

export const defaultConfig: Config = {
    title: '指令菜单',
    subtitle: 'Bot of koishi & preview-help',
    gradientColor1: '#667eea',
    gradientColor2: '#764ba2',
    useRandomGradient: true,
    backgroundBrightness: 50,
    badgeText: 'koishi-plugin-preview-help',
    badgePosition: 'bottom-center',
    fontUrl: '',
    selectedFont: '默认字体',
    customFonts: [],
    menuItems: [
        {
            id: '1',
            title: 'help',
            description: '显示帮助信息',
            groupId: 'default',
            order: 0
        },
        {
            id: '2',
            title: 'status',
            description: '查看运行状态',
            groupId: 'default',
            order: 1
        },
        {
            id: '3',
            title: 'plugin',
            description: '插件管理',
            groupId: 'default',
            order: 2
        },
        {
            id: '4',
            title: 'usage',
            description: '调用次数信息',
            groupId: 'resources',
            order: 3
        },
        {
            id: '5',
            title: 'timer',
            description: '定时器信息',
            groupId: 'resources',
            order: 4
        }
    ],
    menuGroups: [
        { id: 'default', name: '基础功能', order: 0 },
        { id: 'resources', name: '资料信息', order: 1 }
    ],
    columns: 2,
    columnWidth: 265,
    heightAdjustment: 0, // 默认不调整高度
    titleColor: '#ffffff', // 默认白色标题
    subtitleColor: '#ffffff', // 默认白色副标题
    globalTextColor: '#ffffff', // 默认白色全局文字
    itemBackgroundColor: '#524242' // 默认深色方块背景
}

export const defaultGradients = [
    { color1: '#667eea', color2: '#764ba2' }, // 紫蓝渐变
    { color1: '#f093fb', color2: '#f5576c' }, // 粉红渐变
    // { color1: '#4facfe', color2: '#00f2fe' }, // 蓝青渐变
    // { color1: '#43e97b', color2: '#38f9d7' }, // 绿青渐变
    { color1: '#fa709a', color2: '#fee140' }, // 粉黄渐变
    { color1: '#a8edea', color2: '#fed6e3' }, // 青粉渐变
    { color1: '#ff9a9e', color2: '#fecfef' }, // 红粉渐变
    { color1: '#ffecd2', color2: '#fcb69f' }  // 橙黄渐变
]