
import { ref, computed, onMounted, onUnmounted, nextTick, watch, defineComponent, h } from 'vue'
import { useContext, receive, send } from '@koishijs/client'

export function useChatLogic() {

    interface SendMessageResponse {
        success: boolean
        messageId?: string
        error?: string
        tempImageIds?: string[]
    }

    interface BotInfo {
        selfId: string
        platform: string
        username: string
        avatar?: string
        status: 'online' | 'offline'
    }

    interface ChannelInfo {
        id: string
        name: string
        type: number | string
        channelId?: string
        guildName?: string
        isDirect?: boolean
    }

    interface MessageElement {
        type: string
        attrs: Record<string, any>
        children: MessageElement[]
    }

    interface QuoteInfo {
        messageId: string
        id: string
        content: string
        elements?: MessageElement[]
        user: {
            id: string
            name: string
            userId: string
            avatar?: string
            username: string
        }
        timestamp: number
    }

    interface MessageInfo {
        id: string
        content: string
        userId: string
        username: string
        avatar?: string
        timestamp: number
        channelId: string
        selfId: string
        elements?: MessageElement[]
        isBot?: boolean
        quote?: QuoteInfo
    }

    interface ChatData {
        bots: Record<string, BotInfo>
        channels: Record<string, Record<string, ChannelInfo>>
        messages: Record<string, MessageInfo[]>
    }

    // 检查是否为文件 URL
    function isFileUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url)
            return parsedUrl.protocol === 'file:'
        } catch {
            return false
        }
    }

    // 头像组件
    const AvatarComponent = defineComponent({
        props: {
            src: { type: String, required: true },
            alt: { type: String, default: '头像' },
            channelKey: { type: String, required: true }
        },
        setup(props) {
            const imageState = ref<'loading' | 'loaded' | 'error' | 'caching'>('loading')
            const imageSrc = ref(props.src)
            const errorMessage = ref('')

            const loadImage = async () => {
                try {
                    imageState.value = 'loading'

                    // 首先检查缓存
                    const cachedUrl = await getCachedImageUrl(props.channelKey, props.src)
                    if (cachedUrl) {
                        imageSrc.value = cachedUrl
                        imageState.value = 'loaded'
                        return
                    }

                    // 尝试直接加载原图
                    const testImg = new Image()
                    testImg.crossOrigin = 'anonymous'
                    testImg.referrerPolicy = 'no-referrer'
                    testImg.draggable = false

                    const loadPromise = new Promise<void>((resolve, reject) => {
                        testImg.onload = () => resolve()
                        testImg.onerror = () => reject(new Error('Direct load failed'))
                        testImg.src = props.src
                    })

                    const timeoutPromise = new Promise<void>((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout')), 3000)
                    })

                    try {
                        await Promise.race([loadPromise, timeoutPromise])
                        // 直接加载成功，但仍然缓存图片以备后用
                        imageSrc.value = props.src
                        imageState.value = 'loaded'

                        // 异步缓存图片，不阻塞显示
                        cacheImage(props.channelKey, props.src).catch(error => {
                            console.warn('异步缓存头像失败:', error)
                        })
                    } catch {
                        // 直接加载失败，使用缓存系统
                        await loadWithCache()
                    }
                } catch (error) {
                    console.error('头像加载失败:', error)
                    imageState.value = 'error'
                    errorMessage.value = '头像加载失败'
                }
            }

            const loadWithCache = async () => {
                try {
                    imageState.value = 'caching'

                    const cachedUrl = await cacheImage(props.channelKey, props.src)

                    if (cachedUrl) {
                        imageSrc.value = cachedUrl
                        imageState.value = 'loaded'
                    } else {
                        throw new Error('缓存系统加载失败')
                    }
                } catch (error: any) {
                    console.error('缓存系统加载头像失败:', error)
                    imageState.value = 'error'
                    errorMessage.value = error?.message || '缓存加载失败'
                }
            }

            // 组件挂载时开始加载图片
            onMounted(() => {
                loadImage()
            })

            return () => {
                switch (imageState.value) {
                    case 'loading':
                    case 'caching':
                        return h('div', { class: 'avatar-placeholder' }, props.alt.charAt(0).toUpperCase())

                    case 'loaded':
                        return h('img', {
                            src: imageSrc.value,
                            alt: props.alt,
                            draggable: false,
                            style: {
                                width: '100%',
                                height: '100%',
                                'object-fit': 'cover'
                            }
                        })

                    case 'error':
                        return h('div', { class: 'avatar-placeholder' }, props.alt.charAt(0).toUpperCase())

                    default:
                        return h('div', { class: 'avatar-placeholder' }, props.alt.charAt(0).toUpperCase())
                }
            }
        }
    })

    // 图片组件
    const ImageComponent = defineComponent({
        props: {
            src: { type: String, required: true },
            alt: { type: String, default: '图片' },
            filename: { type: String, default: '' },
            channelKey: { type: String, required: true }
        },
        setup(props) {
            const imageState = ref<'loading' | 'loaded' | 'error' | 'caching'>('loading')
            const imageSrc = ref(props.src)
            const errorMessage = ref('')
            const imgRef = ref<HTMLImageElement | null>(null)

            const loadImage = async () => {
                try {
                    imageState.value = 'loading'

                    // 检查缓存
                    const cachedUrl = await getCachedImageUrl(props.channelKey, props.src)
                    if (cachedUrl) {
                        imageSrc.value = cachedUrl
                        imageState.value = 'loaded'
                        return
                    }

                    // 检查是否是本地文件路径，如果是则直接使用代理请求
                    if (isFileUrl(props.src)) {
                        console.log('ImageComponent: 检测到本地文件，使用代理请求:', props.src)
                        await loadWithCache()
                        return
                    }

                    // 尝试直接加载原图
                    const testImg = new Image()
                    testImg.crossOrigin = 'anonymous'
                    testImg.referrerPolicy = 'no-referrer'
                    testImg.draggable = false

                    const loadPromise = new Promise<void>((resolve, reject) => {
                        testImg.onload = () => resolve()
                        testImg.onerror = () => reject(new Error('Direct load failed'))
                        testImg.src = props.src
                    })

                    const timeoutPromise = new Promise<void>((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout')), 3000)
                    })

                    try {
                        await Promise.race([loadPromise, timeoutPromise])
                        // 直接加载成功，但仍然缓存图片以备后用
                        imageSrc.value = props.src
                        imageState.value = 'loaded'

                        // 异步缓存图片，不阻塞显示
                        cacheImage(props.channelKey, props.src).catch(error => {
                            console.warn('异步缓存图片失败:', error)
                        })
                    } catch {
                        // 直接加载失败，使用缓存系统
                        await loadWithCache()
                    }
                } catch (error) {
                    console.error('图片加载失败:', error)
                    imageState.value = 'error'
                    errorMessage.value = '图片加载失败'
                }
            }

            const loadWithCache = async () => {
                try {
                    imageState.value = 'caching'

                    const cachedUrl = await cacheImage(props.channelKey, props.src)

                    if (cachedUrl) {
                        imageSrc.value = cachedUrl
                        imageState.value = 'loaded'
                    } else {
                        throw new Error('缓存系统加载失败')
                    }
                } catch (error: any) {
                    console.error('缓存系统加载图片失败:', error)
                    imageState.value = 'error'
                    errorMessage.value = error?.message || '缓存加载失败'
                }
            }

            // 组件挂载时开始加载图片
            onMounted(() => {
                loadImage()
            })
            return () => {
                switch (imageState.value) {
                    case 'loading':
                        return h('div', { class: 'message-image-loading' }, '加载中...')

                    case 'caching':
                        return h('div', { class: 'message-image-loading' }, '[图片加载缓存中...]')

                    case 'loaded':
                        return h('img', {
                            src: imageSrc.value,
                            alt: props.alt,
                            class: 'message-image',
                            loading: 'lazy',
                            ref: imgRef,
                            draggable: false,
                            style: {
                                'max-width': 'min(400px, 66.67vw)',
                                'max-height': '200px',
                                'width': 'auto',
                                'height': 'auto',
                                'object-fit': 'contain'
                            },
                            // 确保GIF动画能正常播放
                            onLoad: () => {
                                // 对于GIF图片，确保动画开始播放
                                if (imgRef.value && props.src.toLowerCase().includes('.gif')) {
                                    imgRef.value.style.imageRendering = 'auto'
                                }
                            }
                        })

                    case 'error':
                        return h('div', { class: 'message-image-error' }, [
                            '图片加载失败',
                            h('br'),
                            h('small', props.filename || props.alt || '未知图片'),
                            h('br'),
                            h('small', { style: 'color: #ff9800;' }, errorMessage.value)
                        ])

                    default:
                        return h('div', { class: 'message-image-error' }, '未知状态')
                }
            }
        }
    })

    // JSON卡片组件
    const JsonCardComponent = defineComponent({
        props: {
            data: { type: String, required: true },
            channelKey: { type: String, required: true }
        },
        setup(props) {
            const parseJsonData = () => {
                try {
                    const jsonData = JSON.parse(props.data)

                    // 检查是否是QQ小程序或类似的分享卡片
                    if (jsonData.meta && jsonData.meta.detail_1) {
                        const detail = jsonData.meta.detail_1
                        return {
                            type: 'share_card',
                            title: detail.title || jsonData.prompt || '分享内容',
                            desc: detail.desc || '',
                            preview: detail.preview ? detail.preview.replace(/\\\//g, '/') : '',
                            icon: detail.icon ? detail.icon.replace(/\\\//g, '/') : '',
                            url: detail.qqdocurl ? detail.qqdocurl.replace(/\\\//g, '/') : (detail.url ? detail.url.replace(/\\\//g, '/') : ''),
                            appName: detail.title || '应用'
                        }
                    }

                    // 其他类型的JSON数据
                    return {
                        type: 'raw',
                        data: jsonData
                    }
                } catch (error) {
                    console.error('解析JSON数据失败:', error)
                    return {
                        type: 'error',
                        error: '无法解析的JSON数据'
                    }
                }
            }

            const cardData = parseJsonData()

            const handleCardClick = () => {
                if (cardData.type === 'share_card' && cardData.url) {
                    window.open(cardData.url, '_blank', 'noopener,noreferrer')
                }
            }

            return () => {
                if (cardData.type === 'share_card' && cardData.preview) {
                    // 返回一个带跳转链接的图片
                    return h('img', {
                        src: cardData.preview,
                        alt: cardData.title || '[分享小程序]',
                        class: 'message-image',
                        loading: 'lazy',
                        draggable: false,
                        onClick: handleCardClick,
                        style: {
                            'max-width': '400px',
                            'max-height': '200px',
                            'width': 'auto',
                            'height': 'auto',
                            'object-fit': 'contain',
                            cursor: cardData.url ? 'pointer' : 'default'
                        },
                        title: cardData.url ? `点击打开: ${cardData.title || '链接'}` : cardData.title,
                        onError: (e: Event) => {
                            // 图片加载失败时隐藏图片容器
                            const target = e.target as HTMLElement
                            const container = target.parentElement
                            if (container) {
                                container.style.display = 'none'
                            }
                        }
                    })
                } else if (cardData.type === 'error') {
                    return h('div', { class: 'message-json-error' }, [
                        h('span', { class: 'json-error-text' }, cardData.error),
                        h('details', { class: 'json-raw-data' }, [
                            h('summary', '查看原始数据'),
                            h('pre', { class: 'json-raw-content' }, props.data)
                        ])
                    ])
                } else {
                    // 原始JSON数据显示
                    return h('div', { class: 'message-json-raw' }, [
                        h('div', { class: 'json-label' }, '[JSON数据]'),
                        h('details', { class: 'json-raw-data' }, [
                            h('summary', '查看详情'),
                            h('pre', { class: 'json-raw-content' }, JSON.stringify(cardData.data, null, 2))
                        ])
                    ])
                }
            }
        }
    })

    // 合并转发消息组件
    const ForwardMessageComponent = defineComponent({
        props: {
            element: {
                type: Object as () => MessageElement,
                required: true
            },
            channelKey: {
                type: String,
                required: true
            }
        },
        setup(props) {
            const isExpanded = ref(false)

            const toggleExpanded = () => {
                isExpanded.value = !isExpanded.value
            }

            const getPreviewText = (): { previews: string[]; messageCount: number } => {
                if (!props.element.children || props.element.children.length === 0) {
                    return {
                        previews: [],
                        messageCount: 0
                    }
                }

                const messages = props.element.children.filter((child: any) => child.type === 'message')
                const messageCount = messages.length

                // 生成预览文本
                const previews = messages.slice(0, 3).map((msg: any) => {
                    const nickname = msg.attrs?.nickname || '用户'
                    let content = ''

                    if (msg.children && msg.children.length > 0) {
                        const firstChild = msg.children[0]
                        if (firstChild.type === 'text') {
                            content = (firstChild.attrs?.content || '').substring(0, 20)
                            if (content.length > 15) content += '...'
                        } else if (firstChild.type === 'img') {
                            content = '[图片]'
                        } else if (firstChild.type === 'video') {
                            content = '[视频]'
                        } else {
                            content = `[${firstChild.type}]`
                        }
                    }

                    return `${nickname}：${content}`
                })

                return {
                    previews,
                    messageCount
                }
            }

            const renderForwardedMessage = (message: any, index: number): any => {
                const nickname = message.attrs?.nickname || '用户'
                const userId = message.attrs?.userId || 'unknown'

                return h('div', {
                    key: index,
                    class: 'forwarded-message-item'
                }, [
                    h('div', { class: 'forwarded-message-header' }, [
                        h('span', { class: 'forwarded-message-nickname' }, nickname),
                        h('span', { class: 'forwarded-message-userid' }, `(${userId})`)
                    ]),
                    h('div', { class: 'forwarded-message-content' },
                        message.children?.map((child: any, childIndex: number) =>
                            h(MessageElement, {
                                key: childIndex,
                                element: child,
                                channelKey: props.channelKey
                            })
                        ) || []
                    )
                ])
            }

            return () => {
                const { previews, messageCount } = getPreviewText()

                return h('div', { class: 'forward-message-container' }, [
                    h('div', {
                        class: 'forward-message-preview',
                        onClick: toggleExpanded
                    }, [
                        h('div', { class: 'forward-message-title' }, '聊天记录'),
                        ...previews.map((preview, index) =>
                            h('div', { key: index, class: 'forward-message-preview-item' }, preview)
                        ),
                        h('div', { class: 'forward-message-footer' }, [
                            h('span', { class: 'forward-message-count' }, `查看${messageCount}条转发消息`),
                            h('span', { class: 'forward-message-toggle' }, isExpanded.value ? '▲' : '▼')
                        ])
                    ]),
                    isExpanded.value && h('div', { class: 'forward-message-expanded' },
                        props.element.children
                            ?.filter((child: any) => child.type === 'message')
                            .map((message: any, index: number) => renderForwardedMessage(message, index)) || []
                    )
                ])
            }
        }
    })

    const MessageElement = defineComponent({
        props: {
            element: {
                type: Object as () => MessageElement,
                required: true
            },
            channelKey: {
                type: String,
                required: true
            }
        },
        setup(props) {
            const renderElement = (element: MessageElement): any => {
                switch (element.type) {
                    case 'text':
                        return h('span', { class: 'message-text-content' }, element.attrs.content || '')

                    case 'forward':
                        return h('span', { class: 'message-text-content' }, `[转发消息 ${element.attrs.id}]` || '[转发消息]')

                    case 'img':
                    case 'image':
                        const imageUrl = element.attrs.src || element.attrs.url || element.attrs.file
                        return h('div', { class: 'message-image-container' }, [
                            h(ImageComponent, {
                                src: imageUrl,
                                alt: element.attrs.summary || '图片',
                                filename: element.attrs.filename || element.attrs.summary || '',
                                channelKey: props.channelKey
                            })
                        ])

                    case 'mface':
                        const mfaceimageUrl = element.attrs.src || element.attrs.url || element.attrs.file
                        return h('div', { class: 'message-image-container' }, [
                            h(ImageComponent, {
                                src: mfaceimageUrl,
                                alt: element.attrs.summary || '表情',
                                filename: element.attrs.emojiId || element.attrs.summary || '',
                                channelKey: props.channelKey
                            })
                        ])

                    case 'face':
                        if (element.children[0]?.attrs?.src) {
                            const faceimageUrl = element.children[0]?.attrs?.src || element.children[0]?.attrs?.url
                            return h('div', { class: 'message-image-container' }, [
                                h(ImageComponent, {
                                    src: faceimageUrl,
                                    alt: element.attrs.name || element.attrs.id || '[表情]',
                                    filename: element.attrs.name || element.attrs.id || '[表情]',
                                    channelKey: props.channelKey
                                })
                            ])
                        } else {
                            return h('span', { class: 'message-text-content' }, `[${element.attrs.name || element.attrs.id}]` || '[表情]')
                        }

                    case 'at':
                        return h('span', {
                            class: 'message-at',
                            title: element.attrs.name
                        }, `${element.attrs.name || element.attrs.id}`)

                    case 'json':
                        return h('div', { class: 'message-image-container' }, [
                            h(JsonCardComponent, {
                                data: element.attrs.data || '',
                                channelKey: props.channelKey
                            })
                        ])

                    case 'p':
                        // 处理段落元素，递归渲染子元素
                        if (element.children && element.children.length > 0) {
                            const childElements: any[] = element.children.map((child, index) =>
                                h(MessageElement, {
                                    key: index,
                                    element: child,
                                    channelKey: props.channelKey
                                })
                            )
                            return h('div', { class: 'message-paragraph' }, childElements)
                        } else {
                            return h('div', { class: 'message-paragraph' }, '')
                        }
                    case 'figure':
                        // 处理合并转发消息，创建可折叠的消息组件
                        return h(ForwardMessageComponent, {
                            element: element,
                            channelKey: props.channelKey
                        })
                    default:
                        // 未知类型
                        return h('span', {
                            class: 'message-unknown',
                            title: `未知消息类型: ${element.type}`
                        }, element.attrs.content || `[${element.type}]`)

                }
            }

            return () => renderElement(props.element)
        }
    })

    const chatData = ref<ChatData>({
        bots: {},
        channels: {},
        messages: {}
    })

    // 存储每个频道的真实消息数量
    const channelMessageCounts = ref<Record<string, number>>({})

    const pluginConfig = ref<{
        maxMessagesPerChannel: number
        keepMessagesOnClear: number
        loggerinfo: boolean
        blockedPlatforms: Array<{
            platformName: string
            exactMatch: boolean
        }>
        chatContainerHeight: number
    }>({
        maxMessagesPerChannel: 1000,
        keepMessagesOnClear: 50,
        loggerinfo: false,
        blockedPlatforms: [],
        chatContainerHeight: 80
    })

    // 图片缓存 - IndexedDB
    interface ImageCacheItem {
        url: string
        blob: Blob
        timestamp: number
        size: number
        channelKey: string
    }

    // 内存中的URL缓存
    const imageBlobUrls = ref<Record<string, string>>({})
    // 正在加载的图片URL锁，防止并发请求
    const loadingImages = new Map<string, Promise<string | null>>()

    // 内存管理配置
    const MAX_MEMORY_USAGE = 100 * 1024 * 1024 // 100MB 最大内存使用量
    const MAX_BLOB_COUNT = 50 // 最大blob URL数量
    let currentMemoryUsage = 0 // 当前内存使用量估算

    // IndexedDB 配置和限制
    let imageDB: IDBDatabase | null = null
    const DB_NAME = 'ChatImageCache'
    const DB_VERSION = 2 // 版本号
    const STORE_NAME = 'images'

    // 存储限制
    const MAX_DB_SIZE = 50 * 1024 * 1024 // 50MB 最大数据库大小
    const MAX_IMAGES_PER_CHANNEL = 100 // 每个频道最多缓存100张图片
    const MAX_TOTAL_IMAGES = 500 // 总共最多缓存500张图片
    const MAX_IMAGE_SIZE = 12 * 1024 * 1024 // 单张图片最大12MB
    const CLEANUP_THRESHOLD = 0.8 // 当达到80%限制时开始清理
    const DB_HEALTH_CHECK_INTERVAL = 60 * 1000 // 每分钟检查一次数据库健康状态

    // 数据库状态跟踪
    let currentDbSize = 0
    let currentImageCount = 0
    let lastHealthCheck = 0

    const selectedBot = ref<string>('')
    const selectedChannel = ref<string>('')
    const inputMessage = ref<string>('')

    // 图片上传相关状态
    const uploadedImages = ref<Array<{
        tempId: string
        filename: string
        preview: string
        size: number
    }>>([])

    const showActionMenu = ref<boolean>(false)
    const fileInput = ref<HTMLInputElement>()

    // 手机端状态管理
    const isMobile = ref<boolean>(false)
    const mobileView = ref<'bots' | 'channels' | 'messages'>('bots')

    // 滑动手势状态
    const touchStart = ref<{ x: number, y: number, time: number } | null>(null)
    const touchCurrent = ref<{ x: number, y: number } | null>(null)
    const isSwipeActive = ref<boolean>(false)
    const swipeIndicator = ref<{ show: boolean, text: string }>({ show: false, text: '' })
    const messageHistory = ref<HTMLElement>()
    const messageInput = ref<HTMLInputElement>()
    const showScrollButton = ref<boolean>(false)
    const isUserScrolling = ref<boolean>(false)
    const isSending = ref<boolean>(false)

    // 拖拽相关状态
    const draggingChannel = ref<string>('')
    const dragStartPos = ref<{ x: number, y: number }>({ x: 0, y: 0 })
    const dragCurrentPos = ref<{ x: number, y: number }>({ x: 0, y: 0 })
    const dragElementInitialPos = ref<{ x: number, y: number }>({ x: 0, y: 0 })
    const dragOffset = ref<{ x: number, y: number }>({ x: 0, y: 0 })
    const dragThreshold = 80 // 拖拽阈值，超过这个距离就清理历史记录
    const dragStartTime = ref<number>(0)
    const dragDelayTimer = ref<number | null>(null)
    const isDragReady = ref<boolean>(false)
    const draggedBubbleElement = ref<HTMLElement | null>(null)

    // 右键菜单相关状态
    const contextMenu = ref<{
        show: boolean
        x: number
        y: number
        type: 'bot' | 'channel' | null
        targetId: string
        isSecondClick: boolean
    }>({
        show: false,
        x: 0,
        y: 0,
        type: null,
        targetId: '',
        isSecondClick: false
    })

    // 置顶状态管理
    const pinnedBots = ref<Set<string>>(new Set())
    const pinnedChannels = ref<Set<string>>(new Set())

    const bots = computed(() => {
        const botList = Object.values(chatData.value.bots)
        // 按置顶状态排序，置顶的在前面
        return botList.sort((a, b) => {
            const aPinned = pinnedBots.value.has(a.selfId)
            const bPinned = pinnedBots.value.has(b.selfId)
            if (aPinned && !bPinned) return -1
            if (!aPinned && bPinned) return 1
            return 0
        })
    })

    const currentChannels = computed(() => {
        if (!selectedBot.value || !chatData.value.channels[selectedBot.value]) {
            return []
        }
        const channelList = Object.values(chatData.value.channels[selectedBot.value])
        // 按置顶状态排序，置顶的在前面
        return channelList.sort((a, b) => {
            const aPinned = pinnedChannels.value.has(`${selectedBot.value}:${a.id}`)
            const bPinned = pinnedChannels.value.has(`${selectedBot.value}:${b.id}`)
            if (aPinned && !bPinned) return -1
            if (!aPinned && bPinned) return 1
            return 0
        })
    })

    const currentMessages = computed(() => {
        if (!selectedBot.value || !selectedChannel.value) {
            return []
        }
        const channelKey = `${selectedBot.value}:${selectedChannel.value}`
        const messages = chatData.value.messages[channelKey] || []

        const messagesWithQuote = messages.filter(m => m.quote)
        return messages
    })

    const currentChannelName = computed(() => {
        if (!selectedBot.value || !selectedChannel.value) {
            return ''
        }
        const channels = chatData.value.channels[selectedBot.value]
        return channels?.[selectedChannel.value]?.name || ''
    })

    const currentChannelKey = computed(() => {
        if (!selectedBot.value || !selectedChannel.value) {
            return ''
        }
        return `${selectedBot.value}:${selectedChannel.value}`
    })

    const canSendMessage = computed(() => {
        return selectedBot.value && selectedChannel.value && (inputMessage.value.trim() || uploadedImages.value.length > 0) && !isSending.value
    })

    const canInputMessage = computed(() => {
        return selectedBot.value && selectedChannel.value && !isSending.value
    })

    // 手机端视图状态计算属性
    const mobileViewClass = computed(() => {
        if (!isMobile.value) return ''

        switch (mobileView.value) {
            case 'channels':
                return 'show-channels'
            case 'messages':
                return 'show-messages'
            default:
                return ''
        }
    })

    // 输入框提示文字
    const inputPlaceholder = computed(() => {
        if (isMobile.value) {
            return '输入消息...（屏幕左滑返回）'
        } else {
            return '输入消息...'
        }
    })

    // 容器样式，但主要由CSS处理
    const chatContainerStyle = computed(() => {
        // 移除复杂的高度计算，让CSS的dvh单位自动处理
        return {};
    });

    // 内存管理函数
    function estimateBlobSize(blob: Blob): number {
        return blob.size || 0
    }

    function updateMemoryUsage(sizeChange: number) {
        currentMemoryUsage += sizeChange
        if (pluginConfig.value.loggerinfo) {
            console.log(`内存使用量变化: ${sizeChange > 0 ? '+' : ''}${(sizeChange / 1024 / 1024).toFixed(2)}MB, 总计: ${(currentMemoryUsage / 1024 / 1024).toFixed(2)}MB`)
        }
    }

    // 清理最旧的blob URL以释放内存
    function cleanupOldestBlobs(targetCount: number = 10) {
        const blobEntries = Object.entries(imageBlobUrls.value)
        if (blobEntries.length <= targetCount) return

        // 简单的LRU策略：清理最早创建的blob
        const toRemove = blobEntries.slice(0, blobEntries.length - targetCount)

        let freedMemory = 0
        toRemove.forEach(([url, blobUrl]) => {
            URL.revokeObjectURL(blobUrl)
            delete imageBlobUrls.value[url]
            freedMemory += 500 * 1024 // 估算每个图片500KB
            if (pluginConfig.value.loggerinfo) {
                console.log('清理旧blob URL:', url)
            }
        })

        updateMemoryUsage(-freedMemory)
    }

    // 检查内存使用情况并清理
    function checkAndCleanupMemory() {
        const blobCount = Object.keys(imageBlobUrls.value).length

        // 如果blob数量过多，清理一些
        if (blobCount > MAX_BLOB_COUNT) {
            cleanupOldestBlobs(Math.floor(MAX_BLOB_COUNT * 0.7)) // 清理到70%
        }

        // 如果估算内存使用过高，也进行清理
        if (currentMemoryUsage > MAX_MEMORY_USAGE) {
            cleanupOldestBlobs(Math.floor(MAX_BLOB_COUNT * 0.5)) // 清理到50%
        }
    }

    function selectBot(botId: string) {
        selectedBot.value = botId
        selectedChannel.value = ''

        // 保存选择状态
        saveSelectionState()

        // 手机端：选择机器人后切换到频道视图
        if (isMobile.value) {
            mobileView.value = 'channels'
        }
    }

    // 右键菜单相关方法
    function handleBotRightClick(event: MouseEvent, botId: string) {
        event.preventDefault()
        event.stopPropagation()

        // 检查是否是第二次右键点击同一个目标
        const isSecondClick = contextMenu.value.show &&
            contextMenu.value.type === 'bot' &&
            contextMenu.value.targetId === botId

        if (isSecondClick) {
            // 第二次右键，隐藏自定义菜单，让浏览器显示原生菜单
            hideContextMenu()
            return
        }
        showContextMenu(event, 'bot', botId)
    }

    function handleChannelRightClick(event: MouseEvent, channelId: string) {
        event.preventDefault()
        event.stopPropagation()

        // 检查是否是第二次右键点击同一个目标
        const isSecondClick = contextMenu.value.show &&
            contextMenu.value.type === 'channel' &&
            contextMenu.value.targetId === channelId

        if (isSecondClick) {
            // 第二次右键，隐藏自定义菜单，让浏览器显示原生菜单
            hideContextMenu()
            return
        }
        showContextMenu(event, 'channel', channelId)
    }

    function showContextMenu(event: MouseEvent, type: 'bot' | 'channel', targetId: string) {
        // 确保菜单不会超出屏幕边界
        const menuWidth = 180
        const menuHeight = 80
        let x = event.clientX
        let y = event.clientY

        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10
        }

        contextMenu.value = {
            show: true,
            x,
            y,
            type,
            targetId,
            isSecondClick: false
        }

        // 添加全局事件监听器来隐藏菜单
        document.addEventListener('click', hideContextMenu, { once: true })
        document.addEventListener('keydown', handleKeyDown)
    }

    function hideContextMenu() {
        contextMenu.value.show = false
        document.removeEventListener('click', hideContextMenu)
        document.removeEventListener('keydown', handleKeyDown)
    }

    // 处理键盘事件
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && contextMenu.value.show) {
            hideContextMenu()
        }
    }

    // 置顶相关方法
    async function toggleBotPin(botId: string) {
        if (pinnedBots.value.has(botId)) {
            pinnedBots.value.delete(botId)
        } else {
            pinnedBots.value.add(botId)
        }
        // 持久化置顶状态到后端
        await (send as any)('set-pinned-bots', { pinnedBots: Array.from(pinnedBots.value) })
        hideContextMenu()
    }

    async function toggleChannelPin(channelId: string) {
        const channelKey = `${selectedBot.value}:${channelId}`
        if (pinnedChannels.value.has(channelKey)) {
            pinnedChannels.value.delete(channelKey)
        } else {
            pinnedChannels.value.add(channelKey)
        }
        // 持久化置顶状态到后端
        await (send as any)('set-pinned-channels', { pinnedChannels: Array.from(pinnedChannels.value) })
        hideContextMenu()
    }

    // 删除消息相关方法
    async function deleteBotMessages(botId: string) {
        try {
            // 调用后端API删除机器人数据
            const result = await (send as any)('delete-bot-data', {
                selfId: botId
            })

            if (result.success) {
                // 前端同步删除数据
                const channelsToDelete = Object.keys(chatData.value.messages).filter(key => key.startsWith(`${botId}:`))

                for (const channelKey of channelsToDelete) {
                    delete chatData.value.messages[channelKey]
                    delete channelMessageCounts.value[channelKey]
                    // 清理图片缓存
                    await clearChannelImageCache(channelKey)
                }

                // 删除机器人信息
                delete chatData.value.bots[botId]

                // 删除频道信息
                delete chatData.value.channels[botId]

                // 如果当前选中的是被删除的机器人，清空选择
                if (selectedBot.value === botId) {
                    selectedBot.value = ''
                    selectedChannel.value = ''
                }

                showNotification(result.message || '已删除该机器人的所有数据', 'success')
            } else {
                throw new Error(result.error || '删除失败')
            }
        } catch (error: any) {
            console.error('删除机器人数据失败:', error)
            showNotification('删除失败: ' + (error?.message || String(error)), 'error')
        }
        hideContextMenu()
    }

    async function deleteChannelMessages(channelId: string) {
        try {
            const result = await (send as any)('delete-channel-data', {
                selfId: selectedBot.value,
                channelId: channelId
            })

            if (result.success) {
                const channelKey = `${selectedBot.value}:${channelId}`

                // 前端同步删除数据
                delete chatData.value.messages[channelKey]
                delete channelMessageCounts.value[channelKey]

                // 删除频道信息
                if (chatData.value.channels[selectedBot.value]) {
                    delete chatData.value.channels[selectedBot.value][channelId]
                }

                // 清理图片缓存
                await clearChannelImageCache(channelKey)

                // 如果当前选中的是被删除的频道，清空选择
                if (selectedChannel.value === channelId) {
                    selectedChannel.value = ''
                }

                showNotification(result.message || '已删除该频道的所有数据', 'success')
            } else {
                throw new Error(result.error || '删除失败')
            }
        } catch (error: any) {
            console.error('删除频道数据失败:', error)
            showNotification('删除失败: ' + (error?.message || String(error)), 'error')
        }
        hideContextMenu()
    }

    async function selectChannel(channelId: string) {
        selectedChannel.value = channelId
        isUserScrolling.value = false

        // 保存选择状态
        saveSelectionState()

        // 手机端：选择频道后切换到消息视图
        if (isMobile.value) {
            mobileView.value = 'messages'
        }

        // 先获取历史消息，然后再滚动到底部
        if (selectedBot.value) {
            await loadHistoryMessages(selectedBot.value, channelId)
        }

        nextTick(() => {
            scrollToBottom()
            // 只有在非手机端才自动聚焦输入框
            if (!isMobile.value && messageInput.value) {
                messageInput.value.focus()
            }
        })
    }

    async function sendMessage() {
        if (!canSendMessage.value) return

        const messageContent = inputMessage.value.trim()
        if (!messageContent && uploadedImages.value.length === 0) return

        // 设置发送状态
        isSending.value = true

        // 保存当前的图片信息，用于后续清理
        const currentImages = [...uploadedImages.value]

        try {
            // 调用后端 API 发送消息
            const result = await (send as any)('send-message', {
                selfId: selectedBot.value,
                channelId: selectedChannel.value,
                content: messageContent,
                images: currentImages.map(img => ({
                    tempId: img.tempId,
                    filename: img.filename
                }))
            }) as SendMessageResponse & { tempImageIds?: string[] }

            if (result.success) {
                // 清空输入框和图片预览
                inputMessage.value = ''

                // 释放blob URL
                currentImages.forEach(img => {
                    URL.revokeObjectURL(img.preview)
                })
                uploadedImages.value = []
                showActionMenu.value = false

                // 消息发送成功后，主动通知后端清理临时文件
                if (result.tempImageIds && result.tempImageIds.length > 0) {
                    try {
                        await (send as any)('cleanup-temp-images', {
                            tempImageIds: result.tempImageIds
                        })
                        console.log('临时图片清理完成:', result.tempImageIds)
                    } catch (cleanupError) {
                        console.warn('清理临时图片失败:', cleanupError)
                    }
                }
            } else {
                console.error('消息发送失败:', result.error)
                // 使用showNotification显示错误提示
                showNotification('发送失败: ' + result.error, 'error')
            }
        } catch (error: any) {
            console.error('发送消息时出错:', error)
            showNotification('发送失败: ' + (error?.message || String(error)), 'error')
        } finally {
            // 重置发送状态
            isSending.value = false
        }
    }

    // 图片上传相关方法
    function toggleActionMenu() {
        showActionMenu.value = !showActionMenu.value
    }

    function triggerImageUpload() {
        if (fileInput.value) {
            fileInput.value.click()
        }
        showActionMenu.value = false
    }

    async function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement
        const files = target.files
        if (!files || files.length === 0) return

        for (const file of Array.from(files)) {
            await uploadImage(file)
        }

        // 清空文件输入，允许重复选择同一文件
        target.value = ''
    }

    async function handlePaste(event: ClipboardEvent) {
        const items = event.clipboardData?.items
        if (!items) return

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                event.preventDefault()
                const file = item.getAsFile()
                if (file) {
                    // 为粘贴的文件创建一个带有正确扩展名的新File对象
                    const extension = item.type === 'image/gif' ? '.gif' :
                        item.type === 'image/png' ? '.png' :
                            item.type === 'image/jpeg' ? '.jpg' : '.jpg'
                    const filename = `pasted-image-${Date.now()}${extension}`

                    // 创建新的File对象，确保有正确的文件名和类型
                    const newFile = new File([file], filename, {
                        type: item.type,
                        lastModified: Date.now()
                    })

                    await uploadImage(newFile)
                }
            }
        }
    }

    async function uploadImage(file: File) {
        try {
            // 检查文件大小 (限制为10MB)
            if (file.size > 10 * 1024 * 1024) {
                showNotification('图片文件过大，请选择小于10MB的图片', 'error')
                return
            }

            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                showNotification('请选择图片文件', 'error')
                return
            }

            // 转换为base64
            const base64 = await fileToBase64(file)

            // 创建预览URL
            const preview = URL.createObjectURL(file)

            // 调用后端API上传图片
            const result = await (send as any)('upload-image', {
                file: base64,
                filename: file.name,
                mimeType: file.type,
                isGif: file.type === 'image/gif' // 标记是否为GIF
            })

            if (result.success) {
                uploadedImages.value.push({
                    tempId: result.tempId,
                    filename: file.name,
                    preview: preview,
                    size: file.size
                })
            } else {
                URL.revokeObjectURL(preview)
                showNotification('图片上传失败: ' + result.error, 'error')
            }
        } catch (error: any) {
            console.error('上传图片失败:', error)
            showNotification('图片上传失败: ' + (error?.message || String(error)), 'error')
        }
    }

    async function removeImage(tempId: string) {
        try {
            // 从列表中移除
            const imageIndex = uploadedImages.value.findIndex(img => img.tempId === tempId)
            if (imageIndex !== -1) {
                const image = uploadedImages.value[imageIndex]
                // 释放预览URL
                URL.revokeObjectURL(image.preview)
                uploadedImages.value.splice(imageIndex, 1)
            }

            // 调用后端API删除临时文件
            await (send as any)('delete-temp-image', { tempId })
        } catch (error: any) {
            console.error('删除图片失败:', error)
        }
    }

    function fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    // 点击外部关闭菜单
    function handleClickOutside(event: Event) {
        const target = event.target as HTMLElement
        if (!target.closest('.input-actions')) {
            showActionMenu.value = false
        }
        if (!target.closest('.context-menu')) {
            hideContextMenu()
        }
    }

    function formatTime(timestamp: number): string {
        const date = new Date(timestamp)
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    function getChannelTypeText(type: number | string): string {
        if (typeof type === 'number') {
            switch (type) {
                case 0: return '文本'
                case 1: return '私聊'
                default: return '未知'
            }
        }
        return String(type)
    }

    function scrollToBottom() {
        if (messageHistory.value) {
            messageHistory.value.scrollTop = messageHistory.value.scrollHeight
            showScrollButton.value = false
            isUserScrolling.value = false
        }
    }

    function checkScrollPosition() {
        if (messageHistory.value) {
            const { scrollTop, scrollHeight, clientHeight } = messageHistory.value
            const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
            const isAtBottom = distanceFromBottom <= 50

            const shouldShowButton = !isAtBottom

            showScrollButton.value = shouldShowButton

            // 检测是否在主动滚动（向上滚动查看历史消息）
            if (!isAtBottom) {
                isUserScrolling.value = true
            } else {
                // 滚动到底部时，重置滚动状态
                isUserScrolling.value = false
            }
        }
    }

    function isNearBottom(): boolean {
        if (!messageHistory.value) return true // 如果没有消息容器，默认应该滚动
        const { scrollTop, scrollHeight, clientHeight } = messageHistory.value
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
        const isNear = distanceFromBottom <= 200 // 距离底部200px内认为是在底部附近

        return isNear
    }

    function getChannelMessageCount(channelId: string): number {
        if (!selectedBot.value) return 0
        const channelKey = `${selectedBot.value}:${channelId}`

        // 优先使用缓存的消息数量信息
        const cachedCount = channelMessageCounts.value[channelKey]
        if (cachedCount !== undefined) {
            return cachedCount
        }
        // 如果没有缓存，使用当前加载的消息数量作为备用
        return chatData.value.messages[channelKey]?.length || 0
    }

    // 拖拽相关方法
    function startDrag(event: MouseEvent | TouchEvent, channelId: string) {
        event.preventDefault()
        event.stopPropagation()

        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
        const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

        // 记录开始时间和位置
        dragStartTime.value = Date.now()
        dragStartPos.value = { x: clientX, y: clientY }
        dragCurrentPos.value = { x: clientX, y: clientY }
        isDragReady.value = false

        // 获取元素的初始位置
        const element = event.target as HTMLElement
        const rect = element.getBoundingClientRect()
        dragElementInitialPos.value = { x: rect.left, y: rect.top }
        dragOffset.value = { x: clientX - rect.left, y: clientY - rect.top } // 计算触摸点相对于元素左上角的偏移

        // 设置60ms延迟
        dragDelayTimer.value = window.setTimeout(() => {
            if (dragStartTime.value > 0) { // 确保还在按住状态
                isDragReady.value = true
                draggingChannel.value = channelId

                // 获取原始元素
                const originalElement = event.target as HTMLElement
                // 克隆元素
                const clonedElement = originalElement.cloneNode(true) as HTMLElement
                clonedElement.classList.add('dragging-clone') // 添加一个类以便样式控制
                clonedElement.style.position = 'fixed'
                clonedElement.style.zIndex = '1000'
                clonedElement.style.pointerEvents = 'none' // 克隆体不响应事件

                // 设置克隆体的初始位置
                const rect = originalElement.getBoundingClientRect()
                clonedElement.style.left = `${rect.left}px`
                clonedElement.style.top = `${rect.top}px`
                clonedElement.style.width = `${rect.width}px`
                clonedElement.style.height = `${rect.height}px`

                document.body.appendChild(clonedElement)
                draggedBubbleElement.value = clonedElement

                // 添加全局拖拽样式
                document.body.style.userSelect = 'none'
                document.body.style.cursor = 'grabbing'
                document.body.classList.add('dragging-bubble-global') // 全局拖拽样式

                // 创建阈值圆圈（固定在原始位置）
                createThresholdCircle(dragStartPos.value.x, dragStartPos.value.y)
            }
        }, 60)

        // 添加全局事件监听器
        document.addEventListener('mousemove', handleDragMove)
        document.addEventListener('mouseup', handleDragEnd)
        document.addEventListener('touchmove', handleDragMove)
        document.addEventListener('touchend', handleDragEnd)
    }

    function handleDragMove(event: MouseEvent | TouchEvent) {
        if (!isDragReady.value || !draggedBubbleElement.value) return

        event.preventDefault()

        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
        const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

        dragCurrentPos.value = { x: clientX, y: clientY }

        // 更新克隆体的位置和样式
        const deltaX = dragCurrentPos.value.x - dragStartPos.value.x
        const deltaY = dragCurrentPos.value.y - dragStartPos.value.y
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        const opacity = Math.max(0.3, 1 - distance / (dragThreshold * 2))
        const scale = Math.max(0.8, 1 - distance / (dragThreshold * 3))
        const willDelete = distance > dragThreshold

        const finalX = dragCurrentPos.value.x - dragOffset.value.x
        const finalY = dragCurrentPos.value.y - dragOffset.value.y

        draggedBubbleElement.value.style.left = `${finalX}px`
        draggedBubbleElement.value.style.top = `${finalY}px`
        draggedBubbleElement.value.style.transform = `scale(${scale})`
        draggedBubbleElement.value.style.opacity = `${opacity}`
        draggedBubbleElement.value.style.backgroundColor = willDelete ? '#f44336' : '#2196f3'
        draggedBubbleElement.value.style.boxShadow = willDelete ? '0 4px 12px rgba(244, 67, 54, 0.4)' : '0 4px 12px rgba(33, 150, 243, 0.4)'

        // 更新克隆体的类
        if (willDelete) {
            draggedBubbleElement.value.classList.add('will-delete')
        } else {
            draggedBubbleElement.value.classList.remove('will-delete')
        }
    }

    function handleDragEnd(event: MouseEvent | TouchEvent) {
        // 清除延迟定时器
        if (dragDelayTimer.value) {
            clearTimeout(dragDelayTimer.value)
            dragDelayTimer.value = null
        }

        // 清除延迟定时器
        if (dragDelayTimer.value) {
            clearTimeout(dragDelayTimer.value)
            dragDelayTimer.value = null
        }

        // 如果还没有开始拖拽，直接重置
        if (!isDragReady.value || !draggingChannel.value) {
            resetDragState()
            return
        }

        const channelId = draggingChannel.value
        const distance = Math.sqrt(
            Math.pow(dragCurrentPos.value.x - dragStartPos.value.x, 2) +
            Math.pow(dragCurrentPos.value.y - dragStartPos.value.y, 2)
        )

        // 如果拖拽距离超过阈值，清理历史记录
        if (distance > dragThreshold) {
            clearChannelHistory(channelId)
            // 立即重置状态
            resetDragState()
        } else {
            // 距离不够，添加回弹动画到克隆体
            if (draggedBubbleElement.value) {
                draggedBubbleElement.value.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                // 回弹到原始位置
                const originalElement = document.querySelector(`[data-channel-id="${channelId}"] .channel-message-count`)
                if (originalElement) {
                    const rect = originalElement.getBoundingClientRect()
                    draggedBubbleElement.value.style.left = `${rect.left}px`
                    draggedBubbleElement.value.style.top = `${rect.top}px`
                    draggedBubbleElement.value.style.transform = 'scale(1)'
                    draggedBubbleElement.value.style.opacity = '1'
                    draggedBubbleElement.value.style.backgroundColor = '#2196f3'
                    draggedBubbleElement.value.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)'
                }
                setTimeout(() => {
                    resetDragState()
                }, 300)
            } else {
                resetDragState()
            }
        }
    }

    function resetDragState() {
        // 清除延迟定时器
        if (dragDelayTimer.value) {
            clearTimeout(dragDelayTimer.value)
            dragDelayTimer.value = null
        }

        // 重置拖拽状态
        draggingChannel.value = ''
        dragStartPos.value = { x: 0, y: 0 }
        dragCurrentPos.value = { x: 0, y: 0 }
        dragElementInitialPos.value = { x: 0, y: 0 }
        dragStartTime.value = 0
        isDragReady.value = false

        // 移除全局事件监听器
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
        document.removeEventListener('touchmove', handleDragMove)
        document.removeEventListener('touchend', handleDragEnd)

        // 恢复样式
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        document.body.classList.remove('dragging-bubble-global') // 移除全局拖拽样式

        // 移除克隆体
        if (draggedBubbleElement.value && draggedBubbleElement.value.parentNode) {
            draggedBubbleElement.value.parentNode.removeChild(draggedBubbleElement.value)
            draggedBubbleElement.value = null
        }

        // 移除阈值圆圈
        removeThresholdCircle()
    }

    function getDragStyle(channelId: string) {
        if (draggingChannel.value === channelId && isDragReady.value) {
            // 当拖拽开始且准备就绪时，隐藏原始气泡
            return {
                visibility: 'hidden' as const,
                pointerEvents: 'none' as const,
                transition: 'none' as const, // 确保隐藏时没有动画
            }
        }
        return {}
    }

    function getDragDistance(channelId: string): number {
        if (draggingChannel.value !== channelId) return 0

        const deltaX = dragCurrentPos.value.x - dragStartPos.value.x
        const deltaY = dragCurrentPos.value.y - dragStartPos.value.y
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    }

    async function clearChannelHistory(channelId: string) {
        if (!selectedBot.value) return

        try {
            const channelKey = `${selectedBot.value}:${channelId}`

            // 先检查当前消息数量
            const currentCount = getChannelMessageCount(channelId)
            const keepCount = pluginConfig.value.keepMessagesOnClear

            if (keepCount > 0 && currentCount <= keepCount) {
                showNotification('当前消息还很少诶~ 无需清理', 'success')
                return
            }

            // 调用后端API清理历史记录
            const result = await (send as any)('clear-channel-history', {
                selfId: selectedBot.value,
                channelId: channelId
                // 不传keepCount，让后端使用配置的默认值
            })

            if (result.success) {
                // 检查是否真的进行了清理
                if (result.clearedCount && result.clearedCount > 0) {
                    // 更新本地数据
                    if (chatData.value.messages[channelKey]) {
                        // 保留最新的消息
                        const messages = chatData.value.messages[channelKey]
                        const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)
                        chatData.value.messages[channelKey] = sortedMessages.slice(-result.keptCount)
                    }

                    // 更新消息数量缓存为实际保留的消息数量
                    channelMessageCounts.value[channelKey] = result.keptCount

                    // 清理图片缓存
                    await clearChannelImageCache(channelKey)

                    // 显示成功提示，显示实际清理的数量
                    showNotification(`历史记录已清理，清理了 ${result.clearedCount} 条消息，保留最新 ${result.keptCount} 条`, 'success')
                } else if (keepCount === 0) {
                    // 当keepCount为0时
                    // 更新本地数据
                    if (chatData.value.messages[channelKey]) {
                        chatData.value.messages[channelKey] = []
                    }

                    // 更新消息数量缓存为0
                    channelMessageCounts.value[channelKey] = 0

                    // 清理图片缓存
                    await clearChannelImageCache(channelKey)

                    // 显示成功提示
                    showNotification('历史记录已清理，所有消息已删除', 'success')
                } else {
                    showNotification('当前消息还很少诶~ 无需清理', 'success')
                }
            } else {
                console.error('清理历史记录失败:', result.error)
                showNotification('清理失败: ' + result.error, 'error')
            }
        } catch (error: any) {
            console.error('清理历史记录时出错:', error)
            showNotification('清理失败: ' + (error?.message || String(error)), 'error')
        }
    }

    function showNotification(message: string, type: 'info' | 'warn' | 'error' | 'success' = 'success') {
        // 创建通知元素
        const notification = document.createElement('div')
        notification.className = `notification ${type}`
        notification.textContent = message

        let backgroundColor = '#4caf50' // success - 绿色
        switch (type) {
            case 'info':
                backgroundColor = '#2196f3' // 蓝色
                break
            case 'warn':
                backgroundColor = '#ff9800' // 橙色
                break
            case 'error':
                backgroundColor = '#f44336' // 红色
                break
            case 'success':
                backgroundColor = '#4caf50' // 绿色
                break
        }

        notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    background: ${backgroundColor};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `

        // 添加动画样式
        const style = document.createElement('style')
        style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `
        document.head.appendChild(style)

        document.body.appendChild(notification)

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in'
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification)
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style)
                }
            }, 300)
        }, 3000)
    }

    function createThresholdCircle(centerX: number, centerY: number) {
        const circle = document.createElement('div')
        circle.className = 'drag-threshold-circle'
        circle.style.cssText = `
    left: ${centerX - dragThreshold}px;
    top: ${centerY - dragThreshold}px;
    width: ${dragThreshold * 2}px;
    height: ${dragThreshold * 2}px;
  `
        document.body.appendChild(circle);

        (window as any).dragThresholdCircle = circle
    }

    function removeThresholdCircle() {
        const circle = (window as any).dragThresholdCircle
        if (circle && circle.parentNode) {
            circle.parentNode.removeChild(circle);
            (window as any).dragThresholdCircle = null
        }
    }

    // 数据库健康检查
    async function checkDatabaseHealth(): Promise<boolean> {
        try {
            if (!imageDB) return false

            const now = Date.now()
            if (now - lastHealthCheck < DB_HEALTH_CHECK_INTERVAL) {
                return true // 跳过频繁检查
            }

            lastHealthCheck = now

            // 获取数据库统计信息
            const stats = await getDatabaseStats()
            currentDbSize = stats.totalSize
            currentImageCount = stats.totalImages

            console.log('数据库健康检查:', {
                大小: `${(currentDbSize / 1024 / 1024).toFixed(2)}MB / ${(MAX_DB_SIZE / 1024 / 1024).toFixed(2)}MB`,
                图片数量: `${currentImageCount} / ${MAX_TOTAL_IMAGES}`,
                使用率: `${(currentDbSize / MAX_DB_SIZE * 100).toFixed(1)}%`
            })

            // 检查是否需要清理
            const sizeRatio = currentDbSize / MAX_DB_SIZE
            const countRatio = currentImageCount / MAX_TOTAL_IMAGES

            if (sizeRatio > CLEANUP_THRESHOLD || countRatio > CLEANUP_THRESHOLD) {
                console.warn('数据库使用率过高，开始自动清理')
                await performAutomaticCleanup()
            }

            // 检查是否超过硬限制
            if (sizeRatio > 0.95 || countRatio > 0.95) {
                console.error('数据库接近极限，执行紧急清理')
                await performEmergencyCleanup()
            }

            return true
        } catch (error) {
            console.error('数据库健康检查失败:', error)
            return false
        }
    }

    // 获取数据库统计信息
    async function getDatabaseStats(): Promise<{ totalSize: number, totalImages: number, channelStats: Record<string, number> }> {
        if (!imageDB) return { totalSize: 0, totalImages: 0, channelStats: {} }

        return new Promise((resolve) => {
            const transaction = imageDB!.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.getAll()

            request.onsuccess = () => {
                const items: ImageCacheItem[] = request.result || []
                let totalSize = 0
                const channelStats: Record<string, number> = {}

                items.forEach(item => {
                    totalSize += item.size || 0
                    channelStats[item.channelKey] = (channelStats[item.channelKey] || 0) + 1
                })

                resolve({
                    totalSize,
                    totalImages: items.length,
                    channelStats
                })
            }

            request.onerror = () => {
                console.error('获取数据库统计失败:', request.error)
                resolve({ totalSize: 0, totalImages: 0, channelStats: {} })
            }
        })
    }

    // 自动清理
    async function performAutomaticCleanup() {
        try {
            console.log('开始自动清理...')

            // 获取所有图片，按时间排序
            const allImages = await getAllImagesFromDB()
            if (allImages.length === 0) return

            // 按频道分组
            const channelGroups: Record<string, ImageCacheItem[]> = {}
            allImages.forEach(item => {
                if (!channelGroups[item.channelKey]) {
                    channelGroups[item.channelKey] = []
                }
                channelGroups[item.channelKey].push(item)
            })

            let cleanedCount = 0
            let freedSize = 0

            // 清理每个频道超出限制的图片
            for (const [channelKey, images] of Object.entries(channelGroups)) {
                if (images.length > MAX_IMAGES_PER_CHANNEL) {
                    // 按时间排序，删除最旧的
                    images.sort((a, b) => a.timestamp - b.timestamp)
                    const toDelete = images.slice(0, images.length - MAX_IMAGES_PER_CHANNEL)

                    for (const item of toDelete) {
                        await deleteImageFromDB(item.url)
                        cleanedCount++
                        freedSize += item.size || 0

                        // 清理内存中的blob URL
                        if (imageBlobUrls.value[item.url]) {
                            URL.revokeObjectURL(imageBlobUrls.value[item.url])
                            delete imageBlobUrls.value[item.url]
                        }
                    }
                }
            }

            console.log(`自动清理完成: 清理了 ${cleanedCount} 张图片，释放了 ${(freedSize / 1024 / 1024).toFixed(2)}MB`)

            // 更新统计
            currentImageCount -= cleanedCount
            currentDbSize -= freedSize

        } catch (error) {
            console.error('自动清理失败:', error)
        }
    }

    // 紧急清理 // 激进
    async function performEmergencyCleanup() {
        try {
            console.log('开始紧急清理...')

            // 获取所有图片
            const allImages = await getAllImagesFromDB()
            if (allImages.length === 0) return

            // 按时间排序，只保留最新的一部分
            allImages.sort((a, b) => b.timestamp - a.timestamp)
            const keepCount = Math.floor(MAX_TOTAL_IMAGES * 0.3) // 只保留30%
            const toDelete = allImages.slice(keepCount)

            let cleanedCount = 0
            let freedSize = 0

            for (const item of toDelete) {
                await deleteImageFromDB(item.url)
                cleanedCount++
                freedSize += item.size || 0

                // 清理内存中的blob URL
                if (imageBlobUrls.value[item.url]) {
                    URL.revokeObjectURL(imageBlobUrls.value[item.url])
                    delete imageBlobUrls.value[item.url]
                }
            }

            console.log(`紧急清理完成: 清理了 ${cleanedCount} 张图片，释放了 ${(freedSize / 1024 / 1024).toFixed(2)}MB`)

            // 更新统计
            currentImageCount = keepCount
            currentDbSize -= freedSize

        } catch (error) {
            console.error('紧急清理失败:', error)
        }
    }

    // 获取所有图片
    async function getAllImagesFromDB(): Promise<ImageCacheItem[]> {
        if (!imageDB) return []

        return new Promise((resolve) => {
            const transaction = imageDB!.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.getAll()

            request.onsuccess = () => {
                resolve(request.result || [])
            }

            request.onerror = () => {
                console.error('获取所有图片失败:', request.error)
                resolve([])
            }
        })
    }

    // 清理所有IndexedDB数据 //紧急情况使用
    async function clearAllIndexedDBData(): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                // 先关闭现有连接
                if (imageDB) {
                    imageDB.close()
                    imageDB = null
                }

                // 删除整个数据库
                const deleteRequest = indexedDB.deleteDatabase(DB_NAME)

                deleteRequest.onsuccess = () => {
                    console.log('IndexedDB数据库已完全清理')
                    currentDbSize = 0
                    currentImageCount = 0
                    resolve(true)
                }

                deleteRequest.onerror = () => {
                    console.error('清理IndexedDB数据库失败:', deleteRequest.error)
                    resolve(false)
                }

                deleteRequest.onblocked = () => {
                    console.warn('IndexedDB数据库删除被阻塞，可能有其他连接正在使用')
                    // 等待一段时间后重试
                    setTimeout(() => {
                        resolve(false)
                    }, 5000)
                }
            } catch (error) {
                console.error('清理数据库时出错:', error)
                resolve(false)
            }
        })
    }

    // IndexedDB初始化
    async function initImageDB(): Promise<boolean> {
        try {
            // 首先尝试打开数据库
            const success = await openDatabase()
            if (!success) {
                console.warn('数据库打开失败，尝试清理后重新初始化')
                await clearAllIndexedDBData()
                return await openDatabase()
            }

            // 数据库打开成功，进行初始健康检查
            setTimeout(async () => {
                const stats = await getDatabaseStats()
                console.log('数据库初始状态:', {
                    大小: `${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`,
                    图片数量: stats.totalImages,
                    频道分布: stats.channelStats
                })

                // 如果初始状态就超过限制，执行清理
                if (stats.totalSize > MAX_DB_SIZE * 0.9 || stats.totalImages > MAX_TOTAL_IMAGES * 0.9) {
                    console.warn('数据库初始状态接近限制，执行清理')
                    await performAutomaticCleanup()
                }
            }, 1000)

            return true
        } catch (error) {
            console.error('IndexedDB初始化出错:', error)
            return false
        }
    }

    // 打开数据库的内部函数
    async function openDatabase(): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION)

                request.onerror = () => {
                    console.error('IndexedDB打开失败:', request.error)
                    resolve(false)
                }

                request.onsuccess = () => {
                    imageDB = request.result

                    // 添加错误处理
                    imageDB.onerror = (event) => {
                        console.error('IndexedDB运行时错误:', event)
                    }

                    // 添加版本变更处理
                    imageDB.onversionchange = () => {
                        console.warn('IndexedDB版本变更，关闭连接')
                        imageDB?.close()
                        imageDB = null
                    }

                    resolve(true)
                }

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result

                    // 创建对象存储
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' })
                        store.createIndex('channelKey', 'channelKey', { unique: false })
                        store.createIndex('timestamp', 'timestamp', { unique: false })
                        store.createIndex('size', 'size', { unique: false })
                        console.log('IndexedDB对象存储创建完成')
                    }
                }

                request.onblocked = () => {
                    console.warn('IndexedDB打开被阻塞')
                    resolve(false)
                }
            } catch (error) {
                console.error('打开数据库时出错:', error)
                resolve(false)
            }
        })
    }

    // 从IndexedDB获取图片
    async function getImageFromDB(url: string): Promise<ImageCacheItem | null> {
        if (!imageDB) return null

        return new Promise((resolve, reject) => {
            const transaction = imageDB!.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.get(url)

            request.onsuccess = () => {
                resolve(request.result || null)
            }

            request.onerror = () => {
                console.error('从IndexedDB获取图片失败:', request.error)
                resolve(null)
            }
        })
    }

    // 保存图片到IndexedDB
    async function saveImageToDB(item: ImageCacheItem): Promise<boolean> {
        if (!imageDB) return false

        try {
            // 检查单张图片大小
            if (item.size > MAX_IMAGE_SIZE) {
                console.warn(`图片过大，跳过缓存: ${(item.size / 1024 / 1024).toFixed(2)}MB > ${(MAX_IMAGE_SIZE / 1024 / 1024).toFixed(2)}MB`)
                return false
            }

            // 执行健康检查
            await checkDatabaseHealth()

            // 检查是否会超过限制
            if (currentDbSize + item.size > MAX_DB_SIZE) {
                console.warn('添加图片会超过数据库大小限制，执行清理')
                await performAutomaticCleanup()

                // 清理后再次检查
                if (currentDbSize + item.size > MAX_DB_SIZE) {
                    console.warn('清理后仍会超过限制，跳过此图片')
                    return false
                }
            }

            if (currentImageCount >= MAX_TOTAL_IMAGES) {
                console.warn('图片数量已达上限，执行清理')
                await performAutomaticCleanup()

                // 清理后再次检查
                if (currentImageCount >= MAX_TOTAL_IMAGES) {
                    console.warn('清理后仍达上限，跳过此图片')
                    return false
                }
            }

            return new Promise((resolve) => {
                const transaction = imageDB!.transaction([STORE_NAME], 'readwrite')
                const store = transaction.objectStore(STORE_NAME)
                const request = store.put(item)

                request.onsuccess = () => {
                    // 更新统计
                    currentDbSize += item.size
                    currentImageCount += 1
                    resolve(true)
                }

                request.onerror = () => {
                    console.error('保存图片到IndexedDB失败:', request.error)
                    resolve(false)
                }
            })
        } catch (error) {
            console.error('保存图片时出错:', error)
            return false
        }
    }

    // 从IndexedDB删除图片
    async function deleteImageFromDB(url: string): Promise<boolean> {
        if (!imageDB) return false

        return new Promise((resolve) => {
            const transaction = imageDB!.transaction([STORE_NAME], 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.delete(url)

            request.onsuccess = () => {
                resolve(true)
            }

            request.onerror = () => {
                console.error('从IndexedDB删除图片失败:', request.error)
                resolve(false)
            }
        })
    }

    // 获取频道的所有图片
    async function getChannelImagesFromDB(channelKey: string): Promise<ImageCacheItem[]> {
        if (!imageDB) return []

        return new Promise((resolve) => {
            const transaction = imageDB!.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const index = store.index('channelKey')
            const request = index.getAll(channelKey)

            request.onsuccess = () => {
                resolve(request.result || [])
            }

            request.onerror = () => {
                console.error('获取频道图片失败:', request.error)
                resolve([])
            }
        })
    }

    // 图片缓存管理函数
    async function getCachedImageUrl(channelKey: string, originalUrl: string): Promise<string | null> {
        // 检查是否正在加载中，如果是则等待加载完成
        if (loadingImages.has(originalUrl)) {
            return loadingImages.get(originalUrl) || null
        }

        // 首先检查内存中的blob URL
        const existingBlobUrl = imageBlobUrls.value[originalUrl]
        if (existingBlobUrl) {
            return existingBlobUrl
        }

        // 使用立即执行的异步函数来处理加载过程
        const loadingPromise = (async () => {
            try {
                // 再次检查内存中的blob URL（防止在创建Promise期间其他地方已经缓存了）
                const cachedBlobUrl = imageBlobUrls.value[originalUrl]
                if (cachedBlobUrl) {
                    return cachedBlobUrl
                }

                // 从IndexedDB获取
                const cacheItem = await getImageFromDB(originalUrl)
                if (!cacheItem) {
                    return null
                }

                // 检查内存使用情况
                checkAndCleanupMemory()

                // 创建blob URL并缓存到内存
                const blobUrl = URL.createObjectURL(cacheItem.blob)
                imageBlobUrls.value[originalUrl] = blobUrl

                // 更新内存使用量
                updateMemoryUsage(estimateBlobSize(cacheItem.blob))

                // 更新访问时间
                cacheItem.timestamp = Date.now()
                await saveImageToDB(cacheItem)

                return blobUrl
            } catch (error) {
                console.error('获取缓存图片失败:', error)
                return null
            } finally {
                // 加载完成后从loadingImages中移除
                loadingImages.delete(originalUrl)
            }
        })()

        // 立即添加到loadingImages中，防止并发请求
        loadingImages.set(originalUrl, loadingPromise)

        // 等待加载完成并返回结果
        return loadingPromise
    }

    async function cacheImage(channelKey: string, originalUrl: string): Promise<string | null> {
        // 检查是否正在加载中，如果是则等待加载完成
        if (loadingImages.has(originalUrl)) {
            return loadingImages.get(originalUrl) || null
        }

        // 首先检查内存中的blob URL
        const existingBlobUrl = imageBlobUrls.value[originalUrl]
        if (existingBlobUrl) {
            return existingBlobUrl
        }

        // 使用立即执行的异步函数来处理加载过程
        const loadingPromise = (async () => {
            try {
                // 再次检查内存中的blob URL（防止在创建Promise期间其他地方已经缓存了）
                const cachedBlobUrl = imageBlobUrls.value[originalUrl]
                if (cachedBlobUrl) {
                    return cachedBlobUrl
                }

                // 从IndexedDB获取
                const cachedItem = await getImageFromDB(originalUrl)
                if (cachedItem) {
                    // 检查内存使用情况
                    checkAndCleanupMemory()

                    // 创建blob URL并缓存到内存
                    const blobUrl = URL.createObjectURL(cachedItem.blob)
                    imageBlobUrls.value[originalUrl] = blobUrl

                    // 更新内存使用量
                    updateMemoryUsage(estimateBlobSize(cachedItem.blob))

                    // 更新访问时间
                    cachedItem.timestamp = Date.now()
                    await saveImageToDB(cachedItem)

                    return blobUrl
                }

                // 获取图片数据
                const result = await (send as any)('fetch-image', { url: originalUrl })

                if (!result.success) {
                    return null
                }

                // 将base64转换为blob
                const base64Data = result.base64
                const contentType = result.contentType || 'image/jpeg'

                // 解码base64
                const byteCharacters = atob(base64Data)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)

                // 保持原始MIME类型，特别是对于GIF
                const blob = new Blob([byteArray], { type: contentType })

                // 检查blob大小
                if (blob.size > MAX_IMAGE_SIZE) {
                    return null
                }

                // 再次检查内存中是否已经存在（防止并发请求）
                const concurrentBlobUrl = imageBlobUrls.value[originalUrl]
                if (concurrentBlobUrl) {
                    return concurrentBlobUrl
                }

                // 创建缓存项
                const cacheItem: ImageCacheItem = {
                    url: originalUrl,
                    blob: blob,
                    timestamp: Date.now(),
                    size: blob.size,
                    channelKey: channelKey
                }

                // 保存到IndexedDB
                const saved = await saveImageToDB(cacheItem)
                if (!saved) {
                    return null
                }

                // 检查内存使用情况
                checkAndCleanupMemory()

                // 创建blob URL并缓存到内存
                const blobUrl = URL.createObjectURL(blob)
                imageBlobUrls.value[originalUrl] = blobUrl

                // 更新内存使用量
                updateMemoryUsage(estimateBlobSize(blob))

                return blobUrl
            } catch (error) {
                console.error('缓存图片失败:', error)
                return null
            } finally {
                // 加载完成后从loadingImages中移除
                loadingImages.delete(originalUrl)
            }
        })()

        // 立即添加到loadingImages中，防止并发请求
        loadingImages.set(originalUrl, loadingPromise)

        // 等待加载完成并返回结果
        return loadingPromise
    }

    // 清理频道的所有图片缓存
    async function clearChannelImageCache(channelKey: string) {
        try {
            // 获取频道的所有图片
            const channelImages = await getChannelImagesFromDB(channelKey)

            let freedMemory = 0
            // 删除IndexedDB中的数据
            for (const item of channelImages) {
                await deleteImageFromDB(item.url)
                // 清理内存中的blob URL
                if (imageBlobUrls.value[item.url]) {
                    URL.revokeObjectURL(imageBlobUrls.value[item.url])
                    delete imageBlobUrls.value[item.url]
                    freedMemory += item.size || 0
                }
            }

            // 更新内存使用量
            if (freedMemory > 0) {
                updateMemoryUsage(-freedMemory)
            }
        } catch (error) {
            console.error('清理频道图片缓存失败:', error)
        }
    }

    // 获取内存使用统计
    function getMemoryStats() {
        const blobCount = Object.keys(imageBlobUrls.value).length
        return {
            blobCount,
            estimatedMemoryUsage: currentMemoryUsage,
            maxMemoryLimit: MAX_MEMORY_USAGE,
            maxBlobLimit: MAX_BLOB_COUNT,
            memoryUsagePercent: (currentMemoryUsage / MAX_MEMORY_USAGE * 100).toFixed(1),
            blobUsagePercent: (blobCount / MAX_BLOB_COUNT * 100).toFixed(1)
        }
    }

    // 获取缓存统计信息
    async function getCacheStats() {
        if (!imageDB) return { totalImages: 0, totalSize: 0, channels: 0 }

        return new Promise<{ totalImages: number, totalSize: number, channels: number }>((resolve) => {
            const transaction = imageDB!.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.getAll()

            request.onsuccess = () => {
                const allImages = request.result || []
                const channelSet = new Set<string>()
                let totalSize = 0

                allImages.forEach(item => {
                    channelSet.add(item.channelKey)
                    totalSize += item.size
                })

                resolve({
                    totalImages: allImages.length,
                    totalSize: totalSize,
                    channels: channelSet.size
                })
            }

            request.onerror = () => {
                console.error('获取缓存统计失败:', request.error)
                resolve({ totalImages: 0, totalSize: 0, channels: 0 })
            }
        })
    }

    // 保存和恢复选择状态
    function saveSelectionState() {
        if (selectedBot.value && selectedChannel.value) {
            localStorage.setItem('chat-selected-bot', selectedBot.value)
            localStorage.setItem('chat-selected-channel', selectedChannel.value)
        }
    }

    function restoreSelectionState() {
        const savedBot = localStorage.getItem('chat-selected-bot')
        const savedChannel = localStorage.getItem('chat-selected-channel')

        if (savedBot && savedChannel) {
            // 验证保存的状态是否仍然有效
            if (chatData.value.bots[savedBot] &&
                chatData.value.channels[savedBot] &&
                chatData.value.channels[savedBot][savedChannel]) {
                selectedBot.value = savedBot
                selectedChannel.value = savedChannel
                return true
            }
        }
        return false
    }

    // 处理消息事件
    function handleMessageEvent(messageEvent: any) {
        // 更新机器人信息
        if (!chatData.value.bots[messageEvent.selfId]) {
            chatData.value.bots[messageEvent.selfId] = {
                selfId: messageEvent.selfId,
                platform: messageEvent.platform,
                username: messageEvent.bot?.name || `Bot-${messageEvent.selfId}`,
                avatar: messageEvent.bot?.avatar,
                status: 'online'
            }
        } else {
            // 更新机器人状态和信息
            const existingBot = chatData.value.bots[messageEvent.selfId]
            existingBot.status = 'online'
            if (messageEvent.bot?.name && existingBot.username !== messageEvent.bot.name) {
                existingBot.username = messageEvent.bot.name
            }
            if (messageEvent.bot?.avatar && existingBot.avatar !== messageEvent.bot.avatar) {
                existingBot.avatar = messageEvent.bot.avatar
            }
        }

        // 更新频道信息
        if (!chatData.value.channels[messageEvent.selfId]) {
            chatData.value.channels[messageEvent.selfId] = {}
        }

        if (messageEvent.channelId && !chatData.value.channels[messageEvent.selfId][messageEvent.channelId]) {
            const channelName = messageEvent.isDirect
                ? `私信 ${messageEvent.channelId}`
                : `${messageEvent.guildName || messageEvent.channelId} (${messageEvent.channelId})`

            chatData.value.channels[messageEvent.selfId][messageEvent.channelId] = {
                id: messageEvent.channelId,
                name: channelName,
                type: messageEvent.channelType || 0,
                channelId: messageEvent.channelId,
                guildName: messageEvent.guildName || '群聊',
                isDirect: messageEvent.isDirect
            }
        }

        // 添加消息
        if (messageEvent.messageId && messageEvent.content && messageEvent.channelId) {
            const channelKey = `${messageEvent.selfId}:${messageEvent.channelId}`
            if (!chatData.value.messages[channelKey]) {
                chatData.value.messages[channelKey] = []
            }

            // 检查消息是否已存在
            const exists = chatData.value.messages[channelKey].find(m => m.id === messageEvent.messageId)
            if (!exists) {
                const message: MessageInfo = {
                    id: messageEvent.messageId,
                    content: messageEvent.content,
                    userId: messageEvent.userId,
                    username: messageEvent.username,
                    avatar: messageEvent.avatar,
                    timestamp: messageEvent.timestamp,
                    channelId: messageEvent.channelId,
                    selfId: messageEvent.selfId,
                    elements: messageEvent.elements,
                    isBot: false, // 接收到的消息标记为非机器人消息
                    quote: messageEvent.quote
                }

                // 按时间戳排序插入消息
                const messages = chatData.value.messages[channelKey]
                let insertIndex = messages.length

                // 找到正确的插入位置（按时间戳排序）
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].timestamp <= messageEvent.timestamp) {
                        insertIndex = i + 1
                        break
                    }
                    if (i === 0) {
                        insertIndex = 0
                    }
                }

                messages.splice(insertIndex, 0, message)

                // 保持消息数量限制
                if (messages.length > 100) {
                    chatData.value.messages[channelKey] = messages.slice(-100)
                }

                // 更新频道消息数量缓存
                channelMessageCounts.value[channelKey] = messages.length

                // 在添加新消息前检查是否在底部附近
                const wasNearBottom = isNearBottom()

                // 基于添加消息前的位置状态来决定是否滚动
                nextTick(() => {
                    // 再次等待，确保新消息的DOM已经渲染
                    setTimeout(() => {
                        if (wasNearBottom) {
                            scrollToBottom()
                        }
                    }, 10)
                })
            }
        }

        // 异步预缓存消息中的图片
        if (messageEvent.elements && messageEvent.elements.length > 0) {
            const channelKey = `${messageEvent.selfId}:${messageEvent.channelId}`
            messageEvent.elements.forEach((element: any) => {
                if ((element.type === 'img' || element.type === 'image' || element.type === 'mface') && element.attrs) {
                    const imageUrl = element.attrs.src || element.attrs.url || element.attrs.file
                    if (imageUrl) {
                        // 异步缓存，不阻塞消息显示
                        cacheImage(channelKey, imageUrl).catch(error => {
                            console.warn('预缓存图片失败:', imageUrl, error)
                        })
                    }
                }
            })
        }

        // 触发响应式更新
        chatData.value = { ...chatData.value }
    }

    // 处理机器人发送消息成功事件
    function handleBotMessageSentEvent(sentEvent: any) {
        const channelKey = `${sentEvent.selfId}:${sentEvent.channelId}`
        if (!chatData.value.messages[channelKey]) {
            chatData.value.messages[channelKey] = []
        }

        // 检查消息是否已存在
        const exists = chatData.value.messages[channelKey].find(m => m.id === sentEvent.messageId)
        if (!exists) {
            const botMessage: MessageInfo = {
                id: sentEvent.messageId,
                content: sentEvent.content,
                userId: sentEvent.selfId,
                username: sentEvent.botUsername,
                avatar: sentEvent.botAvatar,
                timestamp: sentEvent.timestamp,
                channelId: sentEvent.channelId,
                selfId: sentEvent.selfId,
                elements: sentEvent.elements,
                isBot: true, // 标记为机器人发送的消息
                quote: sentEvent.quote
            }

            // 按时间戳排序插入消息
            const messages = chatData.value.messages[channelKey]
            let insertIndex = messages.length

            // 找到正确的插入位置（按时间戳排序）
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].timestamp <= sentEvent.timestamp) {
                    insertIndex = i + 1
                    break
                }
                if (i === 0) {
                    insertIndex = 0
                }
            }

            messages.splice(insertIndex, 0, botMessage)

            // 保持消息数量限制
            if (messages.length > 100) {
                chatData.value.messages[channelKey] = messages.slice(-100)
            }

            // 更新频道消息数量缓存
            channelMessageCounts.value[channelKey] = messages.length

            // 在添加新消息前检查是否在底部附近
            const wasNearBottom = isNearBottom()

            // 智能滚动：基于添加消息前的位置状态来决定是否滚动
            nextTick(() => {
                // 再次等待，确保新消息的DOM已经渲染
                setTimeout(() => {
                    if (wasNearBottom) {
                        scrollToBottom()
                    }
                }, 10)
            })
        }

        // 触发响应式更新
        chatData.value = { ...chatData.value }
    }

    // 处理机器人消息事件
    function handleBotMessageEvent(botMessageEvent: any) {
        // 更新机器人信息
        if (!chatData.value.bots[botMessageEvent.selfId]) {
            chatData.value.bots[botMessageEvent.selfId] = {
                selfId: botMessageEvent.selfId,
                platform: botMessageEvent.platform,
                username: botMessageEvent.bot?.name || `Bot-${botMessageEvent.selfId}`,
                avatar: botMessageEvent.bot?.avatar,
                status: 'online'
            }
        } else {
            // 更新机器人状态和信息
            const existingBot = chatData.value.bots[botMessageEvent.selfId]
            existingBot.status = 'online'
            if (botMessageEvent.bot?.name && existingBot.username !== botMessageEvent.bot.name) {
                existingBot.username = botMessageEvent.bot.name
            }
            if (botMessageEvent.bot?.avatar && existingBot.avatar !== botMessageEvent.bot.avatar) {
                existingBot.avatar = botMessageEvent.bot.avatar
            }
        }

        // 更新频道信息
        if (!chatData.value.channels[botMessageEvent.selfId]) {
            chatData.value.channels[botMessageEvent.selfId] = {}
        }

        if (botMessageEvent.channelId && !chatData.value.channels[botMessageEvent.selfId][botMessageEvent.channelId]) {
            const channelName = botMessageEvent.isDirect
                ? `私信 ${botMessageEvent.channelId}`
                : `${botMessageEvent.guildName || botMessageEvent.channelId} (${botMessageEvent.channelId})`

            chatData.value.channels[botMessageEvent.selfId][botMessageEvent.channelId] = {
                id: botMessageEvent.channelId,
                name: channelName,
                type: botMessageEvent.channelType || 0,
                channelId: botMessageEvent.channelId,
                guildName: botMessageEvent.guildName || '群聊',
                isDirect: botMessageEvent.isDirect
            }
        }

        // 添加机器人消息
        if (botMessageEvent.messageId && botMessageEvent.content && botMessageEvent.channelId) {
            const channelKey = `${botMessageEvent.selfId}:${botMessageEvent.channelId}`
            if (!chatData.value.messages[channelKey]) {
                chatData.value.messages[channelKey] = []
            }

            // 检查消息是否已存在
            const exists = chatData.value.messages[channelKey].find(m => m.id === botMessageEvent.messageId)
            if (!exists) {
                const message: MessageInfo = {
                    id: botMessageEvent.messageId,
                    content: botMessageEvent.content,
                    userId: botMessageEvent.userId,
                    username: botMessageEvent.username,
                    avatar: botMessageEvent.avatar,
                    timestamp: botMessageEvent.timestamp,
                    channelId: botMessageEvent.channelId,
                    selfId: botMessageEvent.selfId,
                    elements: botMessageEvent.elements,
                    isBot: true, // 标记为机器人消息
                    quote: botMessageEvent.quote
                }

                // 按时间戳排序插入消息
                const messages = chatData.value.messages[channelKey]
                let insertIndex = messages.length

                // 找到正确的插入位置（按时间戳排序）
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].timestamp <= botMessageEvent.timestamp) {
                        insertIndex = i + 1
                        break
                    }
                    if (i === 0) {
                        insertIndex = 0
                    }
                }

                messages.splice(insertIndex, 0, message)

                // 保持消息数量限制
                if (messages.length > 100) {
                    chatData.value.messages[channelKey] = messages.slice(-100)
                }

                // 更新频道消息数量缓存
                channelMessageCounts.value[channelKey] = messages.length

                // 在添加新消息前检查是否在底部附近
                const wasNearBottom = isNearBottom()

                nextTick(() => {
                    // 再次等待，确保新消息的DOM已经渲染
                    setTimeout(() => {
                        if (wasNearBottom) {
                            scrollToBottom()
                        }
                    }, 10)
                })
            }
        }

        // 异步预缓存消息中的图片
        if (botMessageEvent.elements && botMessageEvent.elements.length > 0) {
            const channelKey = `${botMessageEvent.selfId}:${botMessageEvent.channelId}`
            botMessageEvent.elements.forEach((element: any) => {
                if ((element.type === 'img' || element.type === 'image' || element.type === 'mface') && element.attrs) {
                    const imageUrl = element.attrs.src || element.attrs.url || element.attrs.file
                    if (imageUrl) {
                        // 异步缓存，不阻塞消息显示
                        cacheImage(channelKey, imageUrl).catch(error => {
                            console.warn('预缓存图片失败:', imageUrl, error)
                        })
                    }
                }
            })
        }

        // 触发响应式更新
        chatData.value = { ...chatData.value }
    }

    // 获取完整聊天数据
    async function loadChatData() {
        try {
            const result = await (send as any)('get-chat-data')

            if (result.success && result.data) {
                // 转换消息格式
                const convertedMessages: Record<string, MessageInfo[]> = {}

                // 初始化置顶状态
                pinnedBots.value = new Set(result.data.pinnedBots || [])
                pinnedChannels.value = new Set(result.data.pinnedChannels || [])

                for (const [channelKey, messages] of Object.entries(result.data.messages || {})) {
                    const convertedChannelMessages = (messages as any[]).map((msg: any) => ({
                        id: msg.id,
                        content: msg.content,
                        userId: msg.userId,
                        username: msg.username,
                        avatar: msg.avatar,
                        timestamp: msg.timestamp,
                        channelId: msg.channelId,
                        selfId: msg.selfId,
                        elements: msg.elements,
                        isBot: msg.type === 'bot',
                        quote: msg.quote
                    }))

                    // 按时间戳排序
                    convertedChannelMessages.sort((a, b) => a.timestamp - b.timestamp)

                    // 现在后端已经使用冒号格式，直接使用即可
                    convertedMessages[channelKey] = convertedChannelMessages
                }

                // 更新聊天数据
                chatData.value = {
                    bots: result.data.bots || {},
                    channels: result.data.channels || {},
                    messages: convertedMessages
                }

                // 加载所有频道的消息数量
                await loadAllChannelMessageCounts()

                return true
            } else {
                console.warn('获取聊天数据失败:', result.error)
                return false
            }
        } catch (error) {
            console.error('获取聊天数据时出错:', error)
            return false
        }
    }

    // 获取所有频道的消息数量
    async function loadAllChannelMessageCounts() {
        try {
            const result = await (send as any)('get-all-channel-message-counts')

            if (result.success && result.counts) {
                // 转换格式：从 "selfId-channelId" 到 "selfId:channelId"
                const convertedCounts: Record<string, number> = {}
                for (const [channelKey, count] of Object.entries(result.counts)) {
                    // 现在后端已经使用冒号格式，直接使用即可
                    convertedCounts[channelKey] = count as number
                }

                channelMessageCounts.value = convertedCounts

            } else {
                console.warn('获取频道消息数量失败:', result.error)
            }
        } catch (error) {
            console.error('获取频道消息数量时出错:', error)
        }
    }

    // 获取插件配置
    async function loadPluginConfig() {
        try {
            const result = await (send as any)('get-plugin-config')

            if (result.success && result.config) {
                pluginConfig.value = result.config
            } else {
                console.warn('获取插件配置失败:', result.error)
            }
        } catch (error) {
            console.error('获取插件配置时出错:', error)
        }
    }

    // 获取历史消息
    async function loadHistoryMessages(botId: string, channelId: string) {
        try {

            const result = await (send as any)('get-history-messages', {
                selfId: botId,
                channelId: channelId
            })

            if (result.success && result.messages) {
                const channelKey = `${botId}:${channelId}`

                // 转换消息格式
                const messages: MessageInfo[] = result.messages.map((msg: any) => ({
                    id: msg.id,
                    content: msg.content,
                    userId: msg.userId,
                    username: msg.username,
                    avatar: msg.avatar,
                    timestamp: msg.timestamp,
                    channelId: msg.channelId,
                    selfId: msg.selfId,
                    elements: msg.elements,
                    isBot: msg.type === 'bot',
                    quote: msg.quote
                }))

                // 按时间戳排序
                messages.sort((a, b) => a.timestamp - b.timestamp)

                // 设置历史消息
                chatData.value.messages[channelKey] = messages

                // 更新频道消息数量缓存
                channelMessageCounts.value[channelKey] = messages.length

                // 触发响应式更新
                chatData.value = { ...chatData.value }

                return true
            } else {
                console.warn('获取历史消息失败:', result.error)
                return false
            }
        } catch (error) {
            console.error('获取历史消息时出错:', error)
            return false
        }
    }

    // 手机端返回按钮处理
    // 滑动手势处理
    function handleTouchStart(event: TouchEvent) {
        if (!isMobile.value || event.touches.length !== 1) return

        const touch = event.touches[0]
        touchStart.value = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        }
        touchCurrent.value = { x: touch.clientX, y: touch.clientY }
        isSwipeActive.value = false
    }

    function handleTouchMove(event: TouchEvent) {
        if (!isMobile.value || !touchStart.value || event.touches.length !== 1) return

        const touch = event.touches[0]
        touchCurrent.value = { x: touch.clientX, y: touch.clientY }

        const deltaX = touch.clientX - touchStart.value.x
        const deltaY = touch.clientY - touchStart.value.y

        // 检查是否是水平滑动（水平距离大于垂直距离）
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
            // 检查滑动方向和当前视图状态
            const isRightSwipe = deltaX > 0
            const canGoBack = (mobileView.value === 'messages' || mobileView.value === 'channels')

            if (isRightSwipe && canGoBack) {
                isSwipeActive.value = true

                // 显示滑动指示器
                const swipeDistance = Math.min(deltaX, 200)
                const threshold = 150 // 增加阈值，减少误触

                if (swipeDistance > threshold) {
                    swipeIndicator.value = { show: true, text: '松开返回' }
                } else {
                    swipeIndicator.value = { show: true, text: `滑动返回 ${Math.round(swipeDistance / threshold * 100)}%` }
                }

                // 阻止默认滚动行为
                event.preventDefault()
            } else {
                swipeIndicator.value = { show: false, text: '' }
            }
        } else {
            swipeIndicator.value = { show: false, text: '' }
        }
    }

    function handleTouchEnd(event: TouchEvent) {
        if (!isMobile.value || !touchStart.value) return

        const endTime = Date.now()
        const duration = endTime - touchStart.value.time

        if (touchCurrent.value) {
            const deltaX = touchCurrent.value.x - touchStart.value.x
            const deltaY = touchCurrent.value.y - touchStart.value.y

            // 检查是否满足返回条件 (水平滑动)
            const isRightSwipe = deltaX > 150 // 滑动距离超过150px，减少误触
            const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) // 水平滑动
            const isFastHorizontalSwipe = duration < 300 && deltaX > 80 // 快速水平滑动，也增加阈值

            if ((isRightSwipe && isHorizontal) || isFastHorizontalSwipe) {
                performSwipeBack()
            }
        }

        // 重置状态
        touchStart.value = null
        touchCurrent.value = null
        isSwipeActive.value = false
        swipeIndicator.value = { show: false, text: '' }
    }

    function performSwipeBack() {
        switch (mobileView.value) {
            case 'messages':
                mobileView.value = 'channels'
                break
            case 'channels':
                mobileView.value = 'bots'
                selectedBot.value = ''
                selectedChannel.value = ''
                break
            default:
                // 在机器人列表页面，不做任何操作
                break
        }
    }

    // 检测是否为手机端
    function checkMobile() {
        isMobile.value = window.innerWidth <= 768
    }

    // 判断是否应该自动滚动
    function shouldAutoScroll(): boolean {
        // 如果没有主动滚动，或者已经在底部附近，则应该自动滚动
        return !isUserScrolling.value || isNearBottom()
    }

    // 简单的视口高度管理
    const handleViewportChange = () => {
        if (isMobile.value && messageHistory.value) {
            // 当视口变化时，确保消息区域滚动到底部
            nextTick(() => {
                if (shouldAutoScroll()) {
                    scrollToBottom()
                }
            })
        }
    }

    // 输入框焦点处理
    const handleInputFocus = () => {
        if (isMobile.value) {
            // 延迟滚动，等待键盘完全出现
            setTimeout(() => {
                if (messageHistory.value && shouldAutoScroll()) {
                    scrollToBottom()
                }
            }, 300)
        }
    }

    // 监听消息变化
    watch(currentMessages, (newMessages, oldMessages) => {
        // 只有在切换频道时（消息数组完全不同）才自动滚动
        if (oldMessages.length === 0 && newMessages.length > 0) {
            nextTick(() => {
                scrollToBottom()
            })
        }
    })

    // 生命周期
    onMounted(async () => {
        // 检测手机端
        checkMobile()
        window.addEventListener('resize', checkMobile)

        // 添加视口变化监听（处理键盘弹出）
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange)
        }

        // 添加点击外部关闭菜单的监听器
        document.addEventListener('click', handleClickOutside)

        // 初始化IndexedDB
        const dbInitialized = await initImageDB()
        if (!dbInitialized) {
            console.warn('IndexedDB初始化失败，图片缓存功能将不可用')
        } else {
            console.log('IndexedDB初始化成功')

            // 启动时进行健康检查
            setTimeout(async () => {
                await checkDatabaseHealth()
            }, 2000) // 延迟2秒，避免影响页面加载

            // 设置定期健康检查（每5分钟）
            setInterval(async () => {
                await checkDatabaseHealth()
            }, 5 * 60 * 1000)
        }

        // 首先加载插件配置
        await loadPluginConfig()

        // 然后加载历史数据
        await loadChatData()

        // 尝试恢复之前的选择状态
        nextTick(() => {
            if (!restoreSelectionState()) {
                // 如果没有保存的状态或状态无效，则使用默认逻辑
                // 不自动选择任何频道，让用户手动选择
            }
        })

        // 然后开始监听消息事件
        const dispose1 = receive('chat-message-event', handleMessageEvent) as (() => void) | undefined
        const dispose2 = receive('bot-message-sent-event', handleBotMessageSentEvent) as (() => void) | undefined
        const dispose3 = receive('chat-bot-message-event', handleBotMessageEvent) as (() => void) | undefined

        // 添加滚动监听
        watch(selectedChannel, (newChannelId) => {
            if (newChannelId) {
                nextTick(() => {
                    if (messageHistory.value) {
                        // 移除旧的监听器，防止重复添加
                        messageHistory.value.removeEventListener('scroll', checkScrollPosition);
                        messageHistory.value.addEventListener('scroll', checkScrollPosition);
                        checkScrollPosition();
                    }
                    if (!isMobile.value && messageInput.value) { // 只有在非手机端才自动聚焦输入框
                        messageInput.value.focus();
                    }
                });
            }
        }, { immediate: true }); // immediate: true 确保在组件挂载时也执行一次

        // 定期检查和清理内存（每2分钟）
        setInterval(() => {
            checkAndCleanupMemory()
        }, 2 * 60 * 1000)

        // 在组件卸载时清理监听器
        onUnmounted(() => {
            window.removeEventListener('resize', checkMobile)
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportChange)
            }
            document.removeEventListener('click', handleClickOutside)

            if (dispose1 && typeof dispose1 === 'function') {
                dispose1()
            }
            if (dispose2 && typeof dispose2 === 'function') {
                dispose2()
            }
            if (dispose3 && typeof dispose3 === 'function') {
                dispose3()
            }

            // 确保在卸载时移除监听器
            if (messageHistory.value) {
                messageHistory.value.removeEventListener('scroll', checkScrollPosition)
            }

            // 清理内存中的blob URL
            Object.values(imageBlobUrls.value).forEach(blobUrl => {
                URL.revokeObjectURL(blobUrl)
            })
            imageBlobUrls.value = {}

            // 关闭IndexedDB连接
            if (imageDB) {
                imageDB.close()
                imageDB = null
            }
        })
    })

    // 返回所有需要在Vue组件中使用的响应式数据和方法
    return {
        // 组件
        AvatarComponent,
        ImageComponent,
        JsonCardComponent,
        ForwardMessageComponent,
        MessageElement,

        // 响应式数据
        chatData,
        channelMessageCounts,
        pluginConfig,
        selectedBot,
        selectedChannel,
        inputMessage,
        imageBlobUrls,
        pinnedBots,
        pinnedChannels,
        uploadedImages,
        showActionMenu,
        isMobile,
        mobileView,
        touchStart,
        touchCurrent,
        isSwipeActive,
        swipeIndicator,
        messageHistory,
        messageInput,
        showScrollButton,
        isUserScrolling,
        isSending,
        draggingChannel,
        dragStartPos,
        dragCurrentPos,
        dragElementInitialPos,
        dragOffset,
        dragThreshold,
        isDragReady,
        draggedBubbleElement,
        contextMenu,
        fileInput,

        // 计算属性
        bots,
        currentChannels,
        currentMessages,
        currentChannelName,
        currentChannelKey,
        canSendMessage,
        canInputMessage,
        mobileViewClass,
        inputPlaceholder,
        chatContainerStyle,

        // 方法
        selectBot,
        selectChannel,
        handleBotRightClick,
        handleChannelRightClick,
        showContextMenu,
        hideContextMenu,
        handleKeyDown,
        toggleBotPin,
        toggleChannelPin,
        deleteBotMessages,
        deleteChannelMessages,
        sendMessage,
        toggleActionMenu,
        triggerImageUpload,
        handleFileSelect,
        handlePaste,
        uploadImage,
        removeImage,
        fileToBase64,
        handleClickOutside,
        formatTime,
        getChannelTypeText,
        scrollToBottom,
        checkScrollPosition,
        isNearBottom,
        getChannelMessageCount,
        startDrag,
        handleDragMove,
        handleDragEnd,
        resetDragState,
        getDragStyle,
        getDragDistance,
        clearChannelHistory,
        showNotification,
        createThresholdCircle,
        removeThresholdCircle,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleInputFocus,

        // 图片缓存相关
        getCachedImageUrl,
        cacheImage,
        clearChannelImageCache,
        getMemoryStats,
        getCacheStats,

        // 其他工具函数
        isFileUrl,
        loadHistoryMessages,
        handleMessageEvent,
        saveSelectionState,
        restoreSelectionState
    }
}
