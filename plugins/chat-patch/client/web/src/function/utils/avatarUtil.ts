const QQ_GROUP_AVATAR_PLATFORMS = new Set([
    'onebot',
    'red',
    'napcat',
    'milky',
    'llonebot',
    'llob',
])

export const DEFAULT_AVATAR = '/img/icons/icon.svg'

// 仅用于白名单平台的 QQ 群头像，不能用于用户头像
export function buildQqGroupAvatar(
    platform: string,
    groupId: string | number,
    size: number = 0,
): string {
    const platformName = String(platform).toLowerCase().trim()
    if (!QQ_GROUP_AVATAR_PLATFORMS.has(platformName)) return ''
    const rawId = String(groupId)
        .replace(/^(?:group|room|chat|channel|guild):/i, '')
        .replace(/^\[_?([\s\S]+?)_?\]$/, '$1')
        .trim()
    if (!/^\d+$/.test(rawId)) return ''
    const safeSize = size === 100 || size === 640 ? size : 0
    return `https://p.qlogo.cn/gh/${rawId}/${rawId}/${safeSize}`
}

// 命中头像上下文后，任何加载失败都统一换默认 SVG
export function isAvatarImage(img: HTMLImageElement): boolean {
    if (img.hasAttribute('data-avatar') || img.getAttribute('name') === 'avatar') return true
    if (img.dataset.avatarFallback === 'true') return true
    if (img.closest('[data-avatar], .avatar, [class*="avatar"], [name="avatar"]')) return true
    const source = img.currentSrc || img.src || img.getAttribute('src') || ''
    return !source ? false : /(?:q\.qlogo\.cn|p\.qlogo\.cn|\/qqapp\/)/i.test(source)
}

export function avatarError(event: Event) {
    const img = event.target
    if (!(img instanceof HTMLImageElement)) return
    const fallback = new URL(DEFAULT_AVATAR, location.origin).href
    const source = img.currentSrc || img.src
    if (!source || source === fallback || img.dataset.avatarFallback === 'true') return
    img.dataset.avatarFallback = 'true'
    img.src = fallback
}
