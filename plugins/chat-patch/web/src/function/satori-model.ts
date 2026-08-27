// Satori 协议数据与 Stapxs UI 数据模型之间的转换层。

interface SatoriElement {
  type?: unknown
  attrs?: Record<string, unknown>
  children?: SatoriElement[]
}

interface SatoriObject {
  [key: string]: unknown
}

function getObject(value: unknown): SatoriObject {
  return typeof value === 'object' && value !== null ? value as SatoriObject : {}
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function normalizeResourceSrc(src: string, type: string): string {
  if (!src.startsWith('base64://')) return src
  const mime = type === 'image'
    ? 'image/png'
    : type === 'video'
      ? 'video/mp4'
      : type === 'audio'
        ? 'audio/mp3'
        : 'application/octet-stream'
  return `data:${mime};base64,${src.slice(9)}`
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
}

function parseTagAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const pattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    const value = match[2] ?? match[3] ?? match[4] ?? ''
    attrs[match[1]] = decodeEntities(value)
  }
  return attrs
}

function findClosingTag(source: string, start: number, tagName: string): number {
  const pattern = new RegExp(`<(/?)${tagName}(?:\\s|/|>)`, 'g')
  pattern.lastIndex = start
  let depth = 0
  while (true) {
    const match = pattern.exec(source)
    if (!match) return -1
    const tagEnd = source.indexOf('>', match.index)
    if (match[1]) {
      depth -= 1
      if (depth === 0) return match.index
    } else if (tagEnd < 0 || source[tagEnd - 1] !== '/') {
      depth += 1
    }
  }
}

function pushParsedTag(
  tagName: string,
  attrs: Record<string, string>,
  children: Array<Record<string, unknown>>,
  result: Array<Record<string, unknown>>,
) {
  const pushResource = (type: string, fallbackType?: string) => {
    const src = normalizeResourceSrc(attrs.src || attrs.url || attrs.file || '', type)
    result.push({ type, file: src, url: src, name: attrs.name, title: attrs.title })
  }

  switch (tagName) {
    case 'p':
      result.push(...children)
      result.push({ type: 'text', text: '\n' })
      break
    case 'br':
      result.push({ type: 'text', text: '\n' })
      break
    case 'at':
      result.push({
        type: 'at',
        qq: attrs.id || '',
        text: normalizeAtText(
          attrs.name || (attrs.type === 'all' ? 'all' : attrs.id || ''),
          attrs.id || '',
        ),
      })
      break
    case 'sharp':
      result.push({ type: 'text', text: attrs.name || `#${attrs.id || ''}` })
      break
    case 'img':
    case 'image':
      pushResource('image')
      break
    case 'audio':
    case 'record':
      pushResource('record')
      break
    case 'video':
      pushResource('video')
      break
    case 'file':
      pushResource('file')
      break
    case 'mface':
    case 'face': {
      const childImage = children.find((child) => child.type === 'image')
      const src = attrs.src || attrs.url || attrs.file || getString(childImage?.url)
      if (src) {
        result.push({ type: 'image', file: src, url: src, summary: attrs.name || attrs.title })
      } else {
        result.push({ type: 'face', id: attrs.id || '', text: attrs.name || '' })
      }
      break
    }
    case 'quote':
      result.push({ type: 'reply', id: attrs.id || '' })
      break
    case 'message':
      if (attrs.forward) {
        result.push({ type: 'forward', id: attrs.id || '', content: children })
      } else {
        result.push(...children)
      }
      break
    case 'text':
      result.push({ type: 'text', text: attrs.content || '' })
      break
    case 'a':
      result.push({ type: 'text', text: attrs.href ? `${childrenText(children)} (${attrs.href})` : childrenText(children) })
      break
    case 'json':
      result.push({ type: 'json', data: attrs.data || attrs.content || '' })
      break
    case 'xml':
      result.push({ type: 'xml', data: attrs.data || attrs.content || '' })
      break
    case 'markdown':
      result.push({ type: 'markdown', content: attrs.content || childrenText(children) })
      break
    case 'keyboard':
      // 官方机器人按钮不渲染，只保留 Markdown 正文
      break
    default:
      if (children.length > 0) {
        result.push(...children)
      } else if (tagName) {
        result.push({ type: 'text', text: `[${tagName}]` })
      }
  }
}

function childrenText(children: Array<Record<string, unknown>>): string {
  return children.map((item) => getString(item.text) || getString(item.summary) || getString(item.name)).join('')
}

function normalizeAtText(name: string, id: string): string {
  if (!name) return id ? `@${id}` : '@'
  return name.startsWith('@') ? name : `@${name}`
}

function containsElementMarkup(source: string): boolean {
  return /<(img|image|audio|video|file|mface|face|quote|at|json|xml|markdown|keyboard)(?:\s|\/|>)/i.test(source)
}

function splitMarkupTextSegments(
  segments: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = []
  for (const segment of segments) {
    const text = getString(segment.text)
    if (segment.type === 'text' && containsElementMarkup(text)) {
      result.push(...parseSatoriMarkup(text))
    } else {
      result.push(segment)
    }
  }
  return result
}

function parseSatoriMarkup(source: string): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = []
  let index = 0
  while (index < source.length) {
    const open = source.indexOf('<', index)
    if (open < 0) {
      const text = source.slice(index)
      if (text) result.push({ type: 'text', text: decodeEntities(text) })
      break
    }
    if (open > index) {
      const text = source.slice(index, open)
      if (text) result.push({ type: 'text', text: decodeEntities(text) })
    }
    const close = source.indexOf('>', open + 1)
    if (close < 0) {
      const text = source.slice(index)
      if (text) result.push({ type: 'text', text: decodeEntities(text) })
      break
    }
    const raw = source.slice(open + 1, close).trim()
    if (raw.startsWith('!--')) {
      const commentEnd = source.indexOf('-->', close + 1)
      index = commentEnd < 0 ? source.length : commentEnd + 3
      continue
    }
    if (raw.startsWith('/')) {
      index = close + 1
      continue
    }
    const selfClosing = raw.endsWith('/')
    const tagPart = selfClosing ? raw.slice(0, -1).trim() : raw
    const spaceIndex = tagPart.search(/\s/)
    const tagName = spaceIndex < 0 ? tagPart : tagPart.slice(0, spaceIndex)
    const attrSource = spaceIndex < 0 ? '' : tagPart.slice(spaceIndex + 1)
    const attrs = parseTagAttrs(attrSource)
    if (selfClosing || tagName === 'img' || tagName === 'br') {
      pushParsedTag(tagName, attrs, [], result)
      index = close + 1
      continue
    }
    const closingIndex = findClosingTag(source, close + 1, tagName)
    if (closingIndex < 0) {
      const children = parseSatoriMarkup(source.slice(close + 1))
      pushParsedTag(tagName, attrs, children, result)
      break
    }
    const inner = source.slice(close + 1, closingIndex)
    const children = parseSatoriMarkup(inner)
    pushParsedTag(tagName, attrs, children, result)
    index = closingIndex + tagName.length + 3
  }
  return result
}

function messageSegments(message: SatoriObject): Array<Record<string, unknown>> {
  const source = getString(message.content)
  if (containsElementMarkup(source)) {
    return parseSatoriMarkup(source)
  }
  const elements = message.elements
  if (Array.isArray(elements) && elements.length > 0) {
    return splitMarkupTextSegments(toSegments(elements))
  }
  return parseSatoriMarkup(source)
}

function toSegments(elements: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(elements)) return []
  const result: Array<Record<string, unknown>> = []
  for (const item of elements) {
    const element = getObject(item)
    const type = getString(element.type)
    const attrs = getObject(element.attrs)
    const children = Array.isArray(element.children) ? element.children : []

    if (type === 'text') {
      result.push({ type: 'text', text: getString(attrs.content) })
    } else if (type === 'at') {
      const id = getString(attrs.id)
      result.push({
        type: 'at',
        qq: id,
        text: normalizeAtText(getString(attrs.name), id),
      })
    } else if (type === 'img' || type === 'image') {
      const src = normalizeResourceSrc(getString(attrs.src) || getString(attrs.url) || getString(attrs.file), 'image')
      result.push({ type: 'image', file: src, url: src, summary: getString(attrs.title) })
    } else if (type === 'mface' || type === 'face') {
      const nestedSegments = toSegments(children)
      const nestedImage = nestedSegments.find((segment) => segment.type === 'image')
      const src = normalizeResourceSrc(
        getString(attrs.src) || getString(attrs.url) || getString(attrs.file) || getString(nestedImage?.url),
        'image',
      )
      if (src) {
        result.push({ type: 'image', file: src, url: src, summary: getString(attrs.name) || getString(attrs.title) })
      } else {
        result.push({ type: 'face', id: getString(attrs.id), text: getString(attrs.name) })
      }
    } else if (type === 'audio') {
      const src = normalizeResourceSrc(getString(attrs.src) || getString(attrs.url) || getString(attrs.file), 'audio')
      result.push({ type: 'record', file: src, url: src })
    } else if (type === 'video') {
      const src = normalizeResourceSrc(getString(attrs.src) || getString(attrs.url) || getString(attrs.file), 'video')
      result.push({ type: 'video', file: src, url: src })
    } else if (type === 'file') {
      const src = normalizeResourceSrc(getString(attrs.src) || getString(attrs.url) || getString(attrs.file), 'file')
      result.push({ type: 'file', file: src, name: getString(attrs.name), url: src })
    } else if (type === 'quote') {
      result.push({ type: 'reply', id: getString(attrs.id) })
    } else if (type === 'json') {
      result.push({ type: 'json', data: getString(attrs.data) || getString(attrs.content) })
    } else if (type === 'xml') {
      result.push({ type: 'xml', data: getString(attrs.data) || getString(attrs.content) })
    } else if (type === 'markdown') {
      result.push({ type: 'markdown', content: getString(attrs.content) || childrenText(children) })
    } else if (type === 'keyboard') {
      // 按钮段不渲染
    } else if (type === 'message' && attrs.forward) {
      result.push({ type: 'forward', id: getString(attrs.id), content: children })
    } else if (type === 'p' || type === 'br') {
      result.push({ type: 'text', text: '\n' })
    } else if (children.length > 0) {
      result.push(...toSegments(children))
    } else {
      result.push({ type: 'text', text: `[${type}]` })
    }
  }
  return result
}

function messageFromEvent(event: SatoriObject): SatoriObject {
  return getObject(event.message)
}

function userFromEvent(event: SatoriObject): SatoriObject {
  return getObject(event.user)
}

function memberFromEvent(event: SatoriObject): SatoriObject {
  return getObject(event.member)
}

function channelFromEvent(event: SatoriObject): SatoriObject {
  return getObject(event.channel)
}

function guildFromEvent(event: SatoriObject): SatoriObject {
  return getObject(event.guild)
}

export function satoriEventToOneBot(event: SatoriObject): Record<string, unknown> | null {
  const type = getString(event.type)
  const user = userFromEvent(event)
  const member = memberFromEvent(event)
  const channel = channelFromEvent(event)
  const guild = guildFromEvent(event)
  const message = messageFromEvent(event)
  const selfId = getString(event.selfId) || getString(getObject(getObject(event.login).user).id)
  const platform = getString(event.platform) || getString(getObject(event.login).platform)
  const base = {
    self_id: selfId,
    platform,
    time: Math.floor(getNumber(event.timestamp) / 1000),
  }

  if (type === 'message' || type === 'message-created' || type === 'send') {
    const hasChannelType = channel.type !== undefined && channel.type !== null
    const channelType = getNumber(channel.type)
    const isGroup = Boolean(guild.id)
      || (hasChannelType && channelType === 0 && Boolean(guild.id || channel.parentId))
    const userId = getString(user.id)
    const groupId = isGroup
      ? getString(guild.id) || getString(channel.id)
      : ''
    const directChannelId = isGroup ? groupId : userId
    const nickname = getString(user.name) || getString(user.nick) || userId
    const card = getString(member.nick) || getString(member.name) || ''
    return {
      ...base,
      post_type: type === 'send' ? 'message_sent' : 'message',
      message_type: isGroup ? 'group' : 'private',
      message_id: getString(message.id),
      user_id: isGroup ? userId : directChannelId,
      group_id: groupId,
      group_name: isGroup ? (getString(guild.name) || getString(channel.name) || undefined) : undefined,
      group_avatar: isGroup ? (getString(guild.avatar) || getString(channel.avatar) || undefined) : undefined,
      channel_id: getString(channel.id) || (isGroup ? groupId : `private:${userId}`),
      guild_id: getString(guild.id),
      target_id: selfId,
      message: messageSegments(message),
      raw_message: getString(message.content),
      sender: {
        user_id: userId,
        nickname,
        card,
        avatar: getString(user.avatar) || undefined,
        role: getString(member.title) || '',
      },
      infoList: {
        message_id: getString(message.id),
        private_id: isGroup ? '' : directChannelId,
        group_id: groupId,
        channel_id: getString(channel.id) || (isGroup ? groupId : `private:${userId}`),
        guild_id: getString(guild.id),
        target_id: selfId,
        sender: userId,
      },
    }
  }

  if (type === 'guild-member-added' || type === 'guild-member-removed') {
    return {
      ...base,
      post_type: 'notice',
      notice_type: type === 'guild-member-added' ? 'group_increase' : 'group_decrease',
      group_id: getString(guild.id),
      user_id: getString(user.id),
      operator_id: getString(getObject(event.operator).id) || selfId,
      sub_type: 'approve',
    }
  }

  if (type === 'friend-request' || type === 'guild-request' || type === 'guild-member-request') {
    const isFriend = type === 'friend-request'
    const isGuild = type === 'guild-request'
    return {
      ...base,
      post_type: 'request',
      request_type: isFriend ? 'friend' : 'group',
      sub_type: isGuild ? 'invite' : 'add',
      user_id: getString(user.id),
      group_id: getString(guild.id),
      comment: getString(getObject(event.operator).name) || getString(user.name),
      flag: getString(message.id) || getString(user.id),
    }
  }

  if (type === 'reaction-added' || type === 'reaction-removed') {
    return {
      ...base,
      post_type: 'notice',
      notice_type: 'reaction',
      sub_type: type === 'reaction-added' ? 'added' : 'removed',
      group_id: getString(guild.id),
      user_id: getString(user.id),
      message_id: getString(message.id),
    }
  }

  return null
}

export function satoriElementsToText(elements: unknown): string {
  return toSegments(elements)
    .map((segment) => getString(segment.text))
    .join('')
}

export function mapAction(action: string, params: Record<string, unknown>): {
  method: string
  params: Record<string, unknown>
} | null {
  if (!action) return null
  const normalized = action.replace(/^_/, '')
  const guildId = getString(params.group_id) || getString(params.guild_id)
  const userId = getString(params.user_id)
  const messageId = getString(params.message_id)
  const directChannel = userId && !userId.includes(':') ? `private:${userId}` : userId
  const channelId = getString(params.channel_id) || guildId || directChannel || userId
  const content = getString(params.message) || getString(params.content)

  if (
    ['get_group_member_info', 'get_group_member_list'].includes(normalized) &&
    (!guildId || guildId === '0')
  ) {
    return null
  }
  if (
    ['send_msg', 'send_private_msg', 'send_group_msg', 'get_group_msg_history', 'get_friend_msg_history'].includes(normalized) &&
    (!channelId || channelId === '0')
  ) {
    return null
  }

  const table: Record<string, { method: string; params: Record<string, unknown> }> = {
    get_login_info: { method: 'login.get', params: {} },
    get_friend_list: { method: 'friend.list', params: {} },
    get_group_list: { method: 'guild.list', params: {} },
    get_stranger_info: { method: 'user.get', params: { user_id: userId } },
    get_group_member_info: { method: 'guild.member.get', params: { guild_id: guildId, user_id: userId } },
    get_group_member_list: { method: 'guild.member.list', params: { guild_id: guildId } },
    delete_msg: { method: 'message.delete', params: { channel_id: channelId, message_id: messageId } },
    get_msg: { method: 'message.get', params: { channel_id: channelId, message_id: messageId } },
    send_msg: { method: 'message.create', params: { channel_id: channelId, content } },
    send_private_msg: { method: 'message.create', params: { channel_id: channelId, content } },
    send_group_msg: { method: 'message.create', params: { channel_id: channelId, content } },
    set_group_kick: { method: 'guild.member.kick', params: { guild_id: guildId, user_id: userId } },
    set_group_ban: {
      method: 'guild.member.mute',
      params: { guild_id: guildId, user_id: userId, duration: getNumber(params.duration) || 3600 },
    },
    send_respond: {
      method: 'reaction.create',
      params: { channel_id: channelId, message_id: messageId, emoji_id: getString(params.reaction_id) || getString(params.code) },
    },
    set_friend_add_request: {
      method: 'friend.approve',
      params: { message_id: getString(params.flag) || messageId, approve: params.approve !== false && params.approve !== 0 },
    },
    set_group_add_request: {
      method: 'guild.member.approve',
      params: { message_id: getString(params.flag) || messageId, approve: params.approve !== false && params.approve !== 0 },
    },
    get_group_msg_history: {
      method: 'message.list',
      params: { channel_id: channelId, order: 'desc', limit: getNumber(params.message_count) || 50 },
    },
    get_friend_msg_history: {
      method: 'message.list',
      params: { channel_id: channelId, order: 'desc', limit: getNumber(params.message_count) || 50 },
    },
  }

  return table[normalized] ?? null
}

function messageListFromResponse(data: unknown): unknown[] {
  const root = getObject(data)
  const list = Array.isArray(root.data) ? root.data : Array.isArray(data) ? data : []
  return list.map((item) => {
    const message = getObject(item)
    const user = getObject(message.user)
    const channel = getObject(message.channel)
    const guild = getObject(message.guild)
    const member = getObject(message.member)
    const isGroup = Boolean(guild.id) || getNumber(channel.type) === 0
    const groupId = isGroup ? getString(guild.id) || getString(channel.id) : ''
    const userId = getString(user.id)
    const directChannelId = isGroup ? groupId : userId
    return {
      message_id: getString(message.id),
      time: Math.floor(getNumber(message.timestamp) / 1000),
      message_type: isGroup ? 'group' : 'private',
      group_id: groupId,
      user_id: groupId ? userId : directChannelId,
      channel_id: getString(channel.id) || (isGroup ? groupId : `private:${userId}`),
      guild_id: getString(guild.id),
      sender: {
        user_id: userId,
        nickname: getString(user.name) || getString(user.nick) || userId,
        card: getString(member.nick) || getString(member.name) || '',
      },
      message: messageSegments(message),
      raw_message: getString(message.content),
    }
  })
}

export function satoriResponseToOneBot(action: string, data: unknown): Record<string, unknown> {
  const root = getObject(data)
  const rawData = root.data ?? data

  if (action === 'get_login_info') {
    const user = getObject(getObject(rawData).user) || getObject(rawData)
    return {
      retcode: 0,
      data: {
        user_id: getString(user.id),
        nickname: getString(user.name) || getString(user.nick),
        platform: getString(getObject(rawData).platform),
      },
    }
  }

  if (action === 'get_friend_list' || action === 'get_group_list') {
    const list = Array.isArray(rawData) ? rawData : Array.isArray(root.data) ? root.data : []
    const mapped = list.map((item) => {
      const value = getObject(item)
      const user = getObject(value.user)
      const id = getString(value.id)
      const friendName = getString(user.name)
        || getString(user.nick)
        || getString(value.name)
        || getString(value.nick)
        || id
      return action === 'get_friend_list'
        ? {
            user_id: getString(user.id) || id,
            nickname: friendName,
            remark: friendName === id ? '' : friendName,
            avatar: getString(user.avatar) || getString(value.avatar) || undefined,
            group: {
              group_id: 0,
              group_name: '我的好友',
            },
            class_id: 0,
            class_name: '我的好友',
          }
        : {
            group_id: id,
            group_name: getString(value.name) || id,
            avatar: getString(value.avatar) || undefined,
            guild_id: id,
            channel_id: id,
            member_count: getNumber(value.member_count),
          }
    })
    return { retcode: 0, data: mapped }
  }

  if (action === 'get_group_member_list') {
    const list = Array.isArray(rawData) ? rawData : Array.isArray(root.data) ? root.data : []
    const mapped = list.map((item) => {
      const value = getObject(item)
      const user = getObject(value.user)
      const id = getString(user.id) || getString(value.id)
      return {
        user_id: id,
        nickname: getString(user.name) || getString(user.nick) || id,
        card: getString(value.nick) || getString(value.name) || '',
        role: getString(value.title) || '',
      }
    })
    return { retcode: 0, data: mapped }
  }

  if (action === 'get_group_member_info' || action === 'get_stranger_info') {
    const value = getObject(rawData)
    const user = getObject(value.user)
    return {
      retcode: 0,
      data: {
        user_id: getString(user.id) || getString(value.id),
        nickname: getString(user.name) || getString(user.nick),
        card: getString(value.nick) || getString(value.name) || '',
        role: getString(value.title) || '',
        sex: getString(user.sex),
      },
    }
  }

  if (action === 'get_group_msg_history' || action === 'get_friend_msg_history') {
    return { retcode: 0, data: { messages: messageListFromResponse(data) } }
  }

  if (action === 'get_msg') {
    return { retcode: 0, data: messageListFromResponse(data)[0] ?? rawData }
  }

  if (action === 'get_version_info') {
    return { retcode: 0, data: { app_name: 'Satori', app_version: '1.0' } }
  }

  return { retcode: 0, data: rawData }
}
