const QQ_GROUP_AVATAR_PLATFORMS = new Set([
    'onebot',
    'red',
    'napcat',
    'milky',
    'llonebot',
    'llob',
])

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

export function avatarError(event: Event) {
    const img = event.target as HTMLImageElement
    const fallback = new URL('/img/icons/icon.svg', location.origin).href
    if (img.src !== fallback) img.src = fallback
}
