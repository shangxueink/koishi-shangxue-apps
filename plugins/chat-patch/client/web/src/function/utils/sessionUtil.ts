import type { Session } from '../elements/information'

export function normalizeGroupId(value: string): string {
  return String(value)
}

export function normalizeSessionId(value: number | string): string {
  return String(value)
}

export function getSessionId(item: Session): number | string {
    const channelId = item.channel_id ?? item.channelId
    if (channelId !== undefined && channelId !== null && String(channelId) !== '') {
        return channelId
    }
    return item.user_id ?? item.group_id ?? 0
}

function getLegacySessionId(item: Session): number | string | undefined {
    return item.user_id ?? item.group_id
}

export function getSessionAliases(item: Session): string[] {
    const rawAliases: Array<number | string | undefined> = [
        getSessionId(item),
        getLegacySessionId(item),
    ]
    const aliases = rawAliases.filter((value): value is number | string => {
        const text = String(value ?? '')
        return text !== '' && text !== '0'
    })
    return [...new Set(aliases.map((value) => normalizeSessionId(value)))]
}

export function getSessionDedupKey(item: Session): string {
    const channelId = String(item.channel_id ?? item.channelId ?? '')
    const groupId = String(item.group_id ?? '')
    const userId = String(item.user_id ?? '')
    if (channelId) return normalizeSessionId(channelId)
    if (groupId) return normalizeSessionId(groupId)
    if (userId) return normalizeSessionId(userId)
    return ''
}

export function setSessionContact(
  map: Map<number | string, Session>,
  item: Session,
) {
  for (const alias of getSessionAliases(item)) {
    map.set(alias, item)
  }
}

export function upsertSessionContact(
  contacts: Session[],
  item: Session,
): Session[] {
  const key = getSessionDedupKey(item)
  if (!key) return contacts
  const index = contacts.findIndex((current) => getSessionDedupKey(current) === key)
  if (index >= 0) {
    const next = [...contacts]
    Object.assign(next[index], item)
    return next
  }
  return [...contacts, item]
}

export function findSessionContact(
    contacts: Session[],
    sessionId: number | string,
) {
    const target = normalizeSessionId(sessionId)
    return contacts.find((item) => {
        return getSessionAliases(item).some((alias) => alias === target)
    })
}

export function getMissingGroupPreviewSessions(
    contacts: Session[],
    knownSessions: ReadonlyMap<number | string, Session>,
) {
    return contacts.filter((item) => {
        const sessionId = getSessionId(item)
        return Boolean(item.group_id) &&
            sessionId !== 0 &&
            sessionId !== '' &&
            !item.time &&
            !item.raw_msg &&
            !knownSessions.has(normalizeSessionId(sessionId))
    })
}

export function resolveIncomingSession(
    contacts: Session[],
    sessionId: number | string,
    isGroup: boolean,
    senderName?: string,
) {
    const contact = findSessionContact(contacts, sessionId)
    if (contact) return contact

    const normalizedId = normalizeSessionId(sessionId)

    // 消息事件可能早于好友/群列表返回。先保留会话动态状态，列表加载后再合并真实资料。
    if (isGroup) {
        return {
            group_id: normalizedId,
            group_name: normalizedId,
        } as Session
    }
    return {
        user_id: normalizedId,
        nickname: senderName || normalizedId,
        remark: '',
    } as Session
}

const SESSION_STATE_KEYS = [
    'new_msg',
    'raw_msg',
    'raw_msg_base',
    'time',
    'always_top',
    'message_id',
    'highlight',
] as const

type SessionStateKey = (typeof SESSION_STATE_KEYS)[number]

function copyDefinedSessionState<K extends SessionStateKey>(
    contact: Session,
    currentSession: Session,
    key: K,
) {
    const value = currentSession[key]
    if (value !== undefined) {
        const current = contact[key]
        if (
            key === 'time' &&
            typeof current === 'number' &&
            typeof value === 'number' &&
            current > value
        ) {
            return
        }
        contact[key] = value
    }
}

function copyMissingIdentity<K extends keyof Session>(
    contact: Session,
    currentSession: Session,
    key: K,
) {
    const value = currentSession[key]
    if (value === undefined || value === null || String(value) === '') return
    const current = contact[key]
    if (current === undefined || current === null || String(current) === '') {
        contact[key] = value
    }
}

export function mergeSessionState(
    contact: Session,
    currentSession: Session,
) {
    const identityKeys = [
        'channel_id',
        'channelId',
        'guild_id',
        'guildId',
        'group_id',
        'user_id',
        'group_name',
        'nickname',
        'remark',
        'avatar',
    ] as const
    identityKeys.forEach((key) =>
        copyMissingIdentity(contact, currentSession, key),
    )
    SESSION_STATE_KEYS.forEach((key) =>
        copyDefinedSessionState(contact, currentSession, key),
    )
    return contact
}

/**
 * 让真实联系人接管消息早到时创建的占位会话。
 * 返回 true 表示 Map 中的对象引用已替换，调用方需要重建派生会话列表。
 */
export function mergeEarlySessionContacts(
    contacts: Session[],
    sessions: Map<number | string, Session>,
) {
    let didMerge = false
    contacts.forEach((contact) => {
        for (const [key, currentSession] of sessions.entries()) {
            if (currentSession === contact) continue
            if (
                findSessionContact([currentSession], getSessionId(contact))
                || getSessionDedupKey(contact) === getSessionDedupKey(currentSession)
            ) {
                sessions.set(
                    key,
                    mergeSessionState(contact, currentSession),
                )
                didMerge = true
            }
        }
    })
    return didMerge
}
