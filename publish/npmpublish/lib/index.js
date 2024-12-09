var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  QQ: () => types_exports,
  QQBot: () => QQBot,
  QQGuildMessageEncoder: () => QQGuildMessageEncoder,
  QQMessageEncoder: () => QQMessageEncoder,
  WsClient: () => WsClient,
  adaptSession: () => adaptSession,
  decodeChannel: () => decodeChannel,
  decodeGroupMessage: () => decodeGroupMessage,
  decodeGuild: () => decodeGuild,
  decodeGuildMember: () => decodeGuildMember,
  decodeMessage: () => decodeMessage,
  decodeUser: () => decodeUser,
  default: () => src_default,
  escapeMarkdown: () => escapeMarkdown,
  setupReaction: () => setupReaction
});
module.exports = __toCommonJS(src_exports);

// src/types.ts
var types_exports = {};
__export(types_exports, {
  AnnounceType: () => AnnounceType,
  ChannelPrivateType: () => ChannelPrivateType,
  ChannelSpeakPermission: () => ChannelSpeakPermission,
  ChannelSubType: () => ChannelSubType,
  ChannelType: () => ChannelType,
  ChatType: () => ChatType,
  DefaultRoles: () => DefaultRoles,
  DeleteHistoryMsgDays: () => DeleteHistoryMsgDays,
  EmojiType: () => EmojiType,
  Forum: () => Forum,
  Intents: () => Intents,
  Message: () => Message,
  Opcode: () => Opcode,
  ReactionTargetType: () => ReactionTargetType,
  RemindType: () => RemindType
});
var Intents = /* @__PURE__ */ ((Intents2) => {
  Intents2[Intents2["GUILDS"] = 1] = "GUILDS";
  Intents2[Intents2["GUILD_MEMBERS"] = 2] = "GUILD_MEMBERS";
  Intents2[Intents2["GUILD_MESSAGES"] = 512] = "GUILD_MESSAGES";
  Intents2[Intents2["GUILD_MESSAGE_REACTIONS"] = 1024] = "GUILD_MESSAGE_REACTIONS";
  Intents2[Intents2["DIRECT_MESSAGES"] = 4096] = "DIRECT_MESSAGES";
  Intents2[Intents2["OPEN_FORUMS_EVENT"] = 262144] = "OPEN_FORUMS_EVENT";
  Intents2[Intents2["AUDIO_OR_LIVE_CHANNEL_MEMBER"] = 524288] = "AUDIO_OR_LIVE_CHANNEL_MEMBER";
  Intents2[Intents2["USER_MESSAGE"] = 33554432] = "USER_MESSAGE";
  Intents2[Intents2["INTERACTIONS"] = 67108864] = "INTERACTIONS";
  Intents2[Intents2["MESSAGE_AUDIT"] = 134217728] = "MESSAGE_AUDIT";
  Intents2[Intents2["FORUM_EVENT"] = 268435456] = "FORUM_EVENT";
  Intents2[Intents2["AUDIO_ACTION"] = 536870912] = "AUDIO_ACTION";
  Intents2[Intents2["PUBLIC_GUILD_MESSAGES"] = 1073741824] = "PUBLIC_GUILD_MESSAGES";
  return Intents2;
})(Intents || {});
var Opcode = /* @__PURE__ */ ((Opcode2) => {
  Opcode2[Opcode2["DISPATCH"] = 0] = "DISPATCH";
  Opcode2[Opcode2["HEARTBEAT"] = 1] = "HEARTBEAT";
  Opcode2[Opcode2["IDENTIFY"] = 2] = "IDENTIFY";
  Opcode2[Opcode2["RESUME"] = 6] = "RESUME";
  Opcode2[Opcode2["RECONNECT"] = 7] = "RECONNECT";
  Opcode2[Opcode2["INVALID_SESSION"] = 9] = "INVALID_SESSION";
  Opcode2[Opcode2["HELLO"] = 10] = "HELLO";
  Opcode2[Opcode2["HEARTBEAT_ACK"] = 11] = "HEARTBEAT_ACK";
  Opcode2[Opcode2["HTTP_CAKKBACK_ACK"] = 12] = "HTTP_CAKKBACK_ACK";
  return Opcode2;
})(Opcode || {});
var Message;
((Message2) => {
  let Type;
  ((Type2) => {
    Type2[Type2["TEXT"] = 0] = "TEXT";
    Type2[Type2["MIXED"] = 1] = "MIXED";
    Type2[Type2["MARKDOWN"] = 2] = "MARKDOWN";
    Type2[Type2["ARK"] = 3] = "ARK";
    Type2[Type2["EMBED"] = 4] = "EMBED";
    Type2[Type2["MEDIA"] = 7] = "MEDIA";
  })(Type = Message2.Type || (Message2.Type = {}));
  let File;
  ((File2) => {
    let Type2;
    ((Type3) => {
      Type3[Type3["IMAGE"] = 1] = "IMAGE";
      Type3[Type3["VIDEO"] = 2] = "VIDEO";
      Type3[Type3["AUDIO"] = 3] = "AUDIO";
      Type3[Type3["FILE"] = 4] = "FILE";
    })(Type2 = File2.Type || (File2.Type = {}));
  })(File = Message2.File || (Message2.File = {}));
})(Message || (Message = {}));
var DefaultRoles = /* @__PURE__ */ ((DefaultRoles2) => {
  DefaultRoles2[DefaultRoles2["ALL"] = 1] = "ALL";
  DefaultRoles2[DefaultRoles2["ADMIN"] = 2] = "ADMIN";
  DefaultRoles2[DefaultRoles2["OWNER"] = 4] = "OWNER";
  DefaultRoles2[DefaultRoles2["SUBCHANNEL_ADMIN"] = 5] = "SUBCHANNEL_ADMIN";
  return DefaultRoles2;
})(DefaultRoles || {});
var ChannelType = /* @__PURE__ */ ((ChannelType2) => {
  ChannelType2[ChannelType2["TEXT"] = 0] = "TEXT";
  ChannelType2[ChannelType2["VOICE"] = 2] = "VOICE";
  ChannelType2[ChannelType2["GROUP"] = 4] = "GROUP";
  ChannelType2[ChannelType2["LIVE"] = 10005] = "LIVE";
  ChannelType2[ChannelType2["APPLICATION"] = 10006] = "APPLICATION";
  ChannelType2[ChannelType2["FORUM"] = 10007] = "FORUM";
  return ChannelType2;
})(ChannelType || {});
var ChannelSubType = /* @__PURE__ */ ((ChannelSubType2) => {
  ChannelSubType2[ChannelSubType2["IDLE"] = 0] = "IDLE";
  ChannelSubType2[ChannelSubType2["ANNOUNCEMENT"] = 1] = "ANNOUNCEMENT";
  ChannelSubType2[ChannelSubType2["STRATEGY"] = 2] = "STRATEGY";
  ChannelSubType2[ChannelSubType2["BLACK"] = 3] = "BLACK";
  return ChannelSubType2;
})(ChannelSubType || {});
var ChannelPrivateType = /* @__PURE__ */ ((ChannelPrivateType2) => {
  ChannelPrivateType2[ChannelPrivateType2["PUBLIC"] = 0] = "PUBLIC";
  ChannelPrivateType2[ChannelPrivateType2["ADMIN_ONLY"] = 1] = "ADMIN_ONLY";
  ChannelPrivateType2[ChannelPrivateType2["SELECTED_MEMBERS"] = 2] = "SELECTED_MEMBERS";
  return ChannelPrivateType2;
})(ChannelPrivateType || {});
var ChannelSpeakPermission = /* @__PURE__ */ ((ChannelSpeakPermission2) => {
  ChannelSpeakPermission2[ChannelSpeakPermission2["INVALID"] = 0] = "INVALID";
  ChannelSpeakPermission2[ChannelSpeakPermission2["ALL"] = 1] = "ALL";
  ChannelSpeakPermission2[ChannelSpeakPermission2["SELECTED_MEMBERS"] = 2] = "SELECTED_MEMBERS";
  return ChannelSpeakPermission2;
})(ChannelSpeakPermission || {});
var AnnounceType = /* @__PURE__ */ ((AnnounceType2) => {
  AnnounceType2[AnnounceType2["MEMBER"] = 0] = "MEMBER";
  AnnounceType2[AnnounceType2["WELCOME"] = 1] = "WELCOME";
  return AnnounceType2;
})(AnnounceType || {});
var ReactionTargetType = /* @__PURE__ */ ((ReactionTargetType2) => {
  ReactionTargetType2["MESSAGE"] = "ReactionTargetType_MSG";
  ReactionTargetType2["POST"] = "ReactionTargetType_FEED";
  ReactionTargetType2["COMMENT"] = "ReactionTargetType_COMMNENT";
  ReactionTargetType2["REPLY"] = "ReactionTargetType_REPLY";
  return ReactionTargetType2;
})(ReactionTargetType || {});
var EmojiType = /* @__PURE__ */ ((EmojiType2) => {
  EmojiType2[EmojiType2["SYSTEM"] = 1] = "SYSTEM";
  EmojiType2[EmojiType2["DEFAULT"] = 2] = "DEFAULT";
  return EmojiType2;
})(EmojiType || {});
var RemindType = /* @__PURE__ */ ((RemindType2) => {
  RemindType2["NEVER"] = "0";
  RemindType2["START"] = "1";
  RemindType2["BEFORE_5"] = "2";
  RemindType2["BEFORE_15"] = "3";
  RemindType2["BEFORE_30"] = "4";
  RemindType2["BEFORE_60"] = "5";
  return RemindType2;
})(RemindType || {});
var DeleteHistoryMsgDays = /* @__PURE__ */ ((DeleteHistoryMsgDays2) => {
  DeleteHistoryMsgDays2[DeleteHistoryMsgDays2["ALL"] = -1] = "ALL";
  DeleteHistoryMsgDays2[DeleteHistoryMsgDays2["NONE"] = 0] = "NONE";
  DeleteHistoryMsgDays2[DeleteHistoryMsgDays2["DAY_3"] = 3] = "DAY_3";
  DeleteHistoryMsgDays2[DeleteHistoryMsgDays2["DAY_7"] = 7] = "DAY_7";
  DeleteHistoryMsgDays2[DeleteHistoryMsgDays2["DAY_15"] = 15] = "DAY_15";
  DeleteHistoryMsgDays2[DeleteHistoryMsgDays2["DAY_30"] = 30] = "DAY_30";
  return DeleteHistoryMsgDays2;
})(DeleteHistoryMsgDays || {});
var Forum;
((Forum2) => {
  let AuditType;
  ((AuditType2) => {
    AuditType2[AuditType2["PUBLISH_THREAD"] = 1] = "PUBLISH_THREAD";
    AuditType2[AuditType2["PUBLISH_POST"] = 2] = "PUBLISH_POST";
    AuditType2[AuditType2["PUBLISH_REPLY"] = 3] = "PUBLISH_REPLY";
  })(AuditType = Forum2.AuditType || (Forum2.AuditType = {}));
  let RichType;
  ((RichType2) => {
    RichType2[RichType2["TEXT"] = 1] = "TEXT";
    RichType2[RichType2["AT"] = 2] = "AT";
    RichType2[RichType2["URL"] = 3] = "URL";
    RichType2[RichType2["EMOJI"] = 4] = "EMOJI";
    RichType2[RichType2["CHANNEL"] = 5] = "CHANNEL";
    RichType2[RichType2["VIDEO"] = 10] = "VIDEO";
    RichType2[RichType2["IMAGE"] = 11] = "IMAGE";
  })(RichType = Forum2.RichType || (Forum2.RichType = {}));
  let AtType;
  ((AtType2) => {
    AtType2[AtType2["AT_EXPLICIT_USER"] = 1] = "AT_EXPLICIT_USER";
    AtType2[AtType2["AT_ROLE_GROUP"] = 2] = "AT_ROLE_GROUP";
    AtType2[AtType2["AT_GUILD"] = 3] = "AT_GUILD";
  })(AtType = Forum2.AtType || (Forum2.AtType = {}));
  let ElemType;
  ((ElemType2) => {
    ElemType2[ElemType2["ELEM_TYPE_TEXT"] = 1] = "ELEM_TYPE_TEXT";
    ElemType2[ElemType2["ELEM_TYPE_IMAGE"] = 2] = "ELEM_TYPE_IMAGE";
    ElemType2[ElemType2["ELEM_TYPE_VIDEO"] = 3] = "ELEM_TYPE_VIDEO";
    ElemType2[ElemType2["ELEM_TYPE_URL"] = 4] = "ELEM_TYPE_URL";
  })(ElemType = Forum2.ElemType || (Forum2.ElemType = {}));
  let Alignment;
  ((Alignment2) => {
    Alignment2[Alignment2["ALIGNMENT_LEFT"] = 0] = "ALIGNMENT_LEFT";
    Alignment2[Alignment2["ALIGNMENT_MIDDLE"] = 1] = "ALIGNMENT_MIDDLE";
    Alignment2[Alignment2["ALIGNMENT_RIGHT"] = 2] = "ALIGNMENT_RIGHT";
  })(Alignment || (Alignment = {}));
  let PostFormat;
  ((PostFormat2) => {
    PostFormat2[PostFormat2["FORMAT_TEXT"] = 1] = "FORMAT_TEXT";
    PostFormat2[PostFormat2["FORMAT_HTML"] = 2] = "FORMAT_HTML";
    PostFormat2[PostFormat2["FORMAT_MARKDOWN"] = 3] = "FORMAT_MARKDOWN";
    PostFormat2[PostFormat2["FORMAT_JSON"] = 4] = "FORMAT_JSON";
  })(PostFormat = Forum2.PostFormat || (Forum2.PostFormat = {}));
})(Forum || (Forum = {}));
var ChatType = /* @__PURE__ */ ((ChatType2) => {
  ChatType2[ChatType2["GROUP"] = 1] = "GROUP";
  ChatType2[ChatType2["DIRECT"] = 2] = "DIRECT";
  ChatType2[ChatType2["CHANNEL"] = 3] = "CHANNEL";
  return ChatType2;
})(ChatType || {});

// src/bot/index.ts
var import_core6 = require("@satorijs/core");

// src/ws.ts
var import_core2 = require("@satorijs/core");

// src/utils.ts
var import_core = require("@satorijs/core");
var decodeGuild = /* @__PURE__ */ __name((guild) => ({
  id: guild.id,
  name: guild.name
}), "decodeGuild");
var decodeChannel = /* @__PURE__ */ __name((channel) => ({
  id: channel.id,
  name: channel.name,
  // TODO support more channel types
  type: import_core.Universal.Channel.Type.TEXT
}), "decodeChannel");
var decodeUser = /* @__PURE__ */ __name((user) => ({
  id: user.id,
  name: user.username,
  isBot: user.bot,
  avatar: user.avatar
}), "decodeUser");
var decodeGuildMember = /* @__PURE__ */ __name((member) => ({
  user: decodeUser(member.user),
  nick: member.nick,
  roles: member.roles
}), "decodeGuildMember");
function decodeGroupMessage(bot, data, message = {}, payload = message) {
  message.id = data.id;
  message.elements = [];
  if (data.content.length) message.elements.push(import_core.h.text(data.content));
  for (const attachment of data.attachments ?? []) {
    if (attachment.content_type === "file") {
      message.elements.push(import_core.h.file(attachment.url, {
        filename: attachment.filename
      }));
    } else if (attachment.content_type.startsWith("image/")) {
      message.elements.push(import_core.h.image(attachment.url));
    } else if (attachment.content_type === "voice") {
      message.elements.push(import_core.h.audio(attachment.url));
    } else if (attachment.content_type === "video") {
      message.elements.push(import_core.h.video(attachment.url));
    }
  }
  message.content = message.elements.join("");
  if (!payload) return message;
  let date = data.timestamp;
  if (date.includes("m=")) {
    date = data.timestamp.slice(0, data.timestamp.indexOf("m=")).trim().replace(/\+(\d{4}) CST/, "GMT+$1");
  }
  payload.timestamp = new Date(date).valueOf();
  payload.guild = data.group_id && { id: data.group_id };
  payload.user = { id: data.author.id, avatar: `https://q.qlogo.cn/qqapp/${bot.config.id}/${data.author.id}/640` };
  return message;
}
__name(decodeGroupMessage, "decodeGroupMessage");
async function decodeMessage(bot, data, message = {}, payload = message) {
  message.id = message.messageId = data.id;
  message.content = (data.content ?? "").replace(/<@!(\d+)>/g, (_, $1) => import_core.h.at($1).toString());
  const { attachments = [] } = data;
  if (attachments.length && !/\s$/.test(message.content)) message.content += " ";
  message.content = attachments.filter(({ content_type }) => content_type.startsWith("image")).reduce((content, attachment) => content + import_core.h.image("https://" + attachment.url), message.content);
  message.elements = import_core.h.parse(message.content);
  message.elements = import_core.h.transform(message.elements, {
    text: /* @__PURE__ */ __name((attrs) => import_core.h.unescape(attrs.content), "text")
  });
  if (data.message_reference) {
    message.quote = bot.getMessage ? await bot.getMessage(data.channel_id, data.message_reference.message_id) : { id: data.message_reference.message_id };
  }
  if (!payload) return message;
  payload.timestamp = new Date(data.timestamp).valueOf();
  payload.user = decodeUser(data.author);
  if (data.direct_message) {
    payload.guild = { id: `${data.src_guild_id}_${data.guild_id}` };
    payload.channel = { id: `${data.guild_id}_${data.channel_id}`, type: import_core.Universal.Channel.Type.DIRECT };
  } else {
    payload.guild = { id: data.guild_id };
    payload.channel = { id: data.channel_id, type: import_core.Universal.Channel.Type.TEXT };
  }
  return message;
}
__name(decodeMessage, "decodeMessage");
function setupReaction(session, data) {
  session.userId = data.user_id;
  session.guildId = data.guild_id;
  session.channelId = data.channel_id;
  session.content = `${data.emoji.type}:${data.emoji.id}`;
  session.messageId = data.target.id;
  session.isDirect = false;
  return session;
}
__name(setupReaction, "setupReaction");
async function adaptSession(bot, input) {
  let session = bot.session();
  if (![
    "GROUP_AT_MESSAGE_CREATE",
    "C2C_MESSAGE_CREATE",
    "FRIEND_ADD",
    "FRIEND_DEL",
    "GROUP_ADD_ROBOT",
    "GROUP_DEL_ROBOT",
    "INTERACTION_CREATE"
  ].includes(input.t)) {
    session = bot.guildBot.session();
    session.setInternal(bot.guildBot.platform, input);
  } else {
    session.setInternal(bot.platform, input);
  }
  if (input.t === "MESSAGE_CREATE" || input.t === "AT_MESSAGE_CREATE" || input.t === "DIRECT_MESSAGE_CREATE") {
    if (bot.config.type === "private" && input.t === "AT_MESSAGE_CREATE" && bot.config.intents & 512 /* GUILD_MESSAGES */) return;
    session.type = "message";
    await decodeMessage(bot, input.d, session.event.message = {}, session.event);
  } else if (input.t === "MESSAGE_REACTION_ADD") {
    if (input.d.target.type !== "ReactionTargetType_MSG") return;
    setupReaction(session, input.d);
    session.type = "reaction-added";
  } else if (input.t === "MESSAGE_REACTION_REMOVE") {
    if (input.d.target.type !== "ReactionTargetType_MSG") return;
    setupReaction(session, input.d);
    session.type = "reaction-removed";
  } else if (input.t === "CHANNEL_CREATE" || input.t === "CHANNEL_UPDATE" || input.t === "CHANNEL_DELETE") {
    session.type = {
      CHANNEL_CREATE: "channel-added",
      CHANNEL_UPDATE: "channel-updated",
      CHANNEL_DELETE: "channel-deleted"
    }[input.t];
    session.guildId = input.d.guild_id;
    session.event.channel = decodeChannel(input.d);
  } else if (input.t === "GUILD_CREATE" || input.t === "GUILD_UPDATE" || input.t === "GUILD_DELETE") {
    session.type = {
      GUILD_CREATE: "guild-added",
      GUILD_UPDATE: "guild-updated",
      GUILD_DELETE: "guild-deleted"
    }[input.t];
    session.event.guild = decodeGuild(input.d);
  } else if (input.t === "DIRECT_MESSAGE_DELETE" || input.t === "MESSAGE_DELETE" || input.t === "PUBLIC_MESSAGE_DELETE") {
    if (bot.config.type === "private" && input.t === "PUBLIC_MESSAGE_DELETE" && bot.config.intents & 512 /* GUILD_MESSAGES */) return;
    session.type = "message-deleted";
    session.userId = input.d.message.author.id;
    session.operatorId = input.d.op_user.id;
    session.messageId = input.d.message.id;
    session.isDirect = input.d.message.direct_message;
    if (session.isDirect) {
      session.guildId = `${input.d.message.src_guild_id}_${input.d.message.guild_id}`;
      session.channelId = `${input.d.message.guild_id}_${input.d.message.channel_id}`;
    } else {
      session.guildId = input.d.message.guild_id;
      session.channelId = input.d.message.channel_id;
    }
  } else if (input.t === "GROUP_AT_MESSAGE_CREATE") {
    session.type = "message";
    session.isDirect = false;
    decodeGroupMessage(bot, input.d, session.event.message = {}, session.event);
    session.channelId = session.guildId;
    session.elements.unshift(import_core.h.at(session.selfId));
  } else if (input.t === "C2C_MESSAGE_CREATE") {
    session.type = "message";
    session.isDirect = true;
    decodeGroupMessage(bot, input.d, session.event.message = {}, session.event);
    session.channelId = session.userId;
  } else if (input.t === "FRIEND_ADD") {
    session.type = "friend-added";
    session.timestamp = input.d.timestamp;
    session.userId = input.d.openid;
  } else if (input.t === "FRIEND_DEL") {
    session.type = "friend-deleted";
    session.timestamp = input.d.timestamp;
    session.userId = input.d.openid;
  } else if (input.t === "GROUP_ADD_ROBOT") {
    session.type = "guild-added";
    session.timestamp = input.d.timestamp;
    session.guildId = input.d.group_openid;
    session.operatorId = input.d.op_member_openid;
  } else if (input.t === "GROUP_DEL_ROBOT") {
    session.type = "guild-removed";
    session.timestamp = input.d.timestamp;
    session.guildId = input.d.group_openid;
    session.operatorId = input.d.op_member_openid;
  } else if (input.t === "INTERACTION_CREATE") {
    session.type = "interaction/button";
    session.userId = input.d.group_member_openid ?? input.d.user_openid ?? input.d.data.resolved.user_id;
    if (input.d.chat_type === 1 /* GROUP */) {
      session.guildId = input.d.group_openid;
      session.channelId = input.d.group_openid;
      session.isDirect = false;
    } else if (input.d.chat_type === 3 /* CHANNEL */) {
      session.channelId = input.d.channel_id;
      session.isDirect = false;
    } else if (input.d.chat_type === 2 /* DIRECT */) {
      session.isDirect = true;
      session.channelId = session.userId;
    }
    session.event.button = {
      id: input.d.data.resolved.button_id,
      // @ts-ignore
      data: input.d.data.resolved.button_data
    };
    if (!bot.config.manualAcknowledge) bot.internal.acknowledgeInteraction(input.d.id, { code: 0 }).catch(() => {
    });
  } else if (input.t === "GUILD_MEMBER_ADD" || input.t === "GUILD_MEMBER_DELETE" || input.t === "GUILD_MEMBER_UPDATE") {
    session.type = {
      GUILD_MEMBER_ADD: "guild-member-added",
      GUILD_MEMBER_UPDATE: "guild-member-updated",
      GUILD_MEMBER_DELETE: "guild-member-removed"
    }[input.t];
    session.guildId = input.d.guild_id;
    session.operatorId = input.d.op_user_id;
    session.timestamp = Date.now();
    session.event.user = decodeUser(input.d.user);
  } else {
    return;
  }
  return session;
}
__name(adaptSession, "adaptSession");

// src/ws.ts
var WsClient = class extends import_core2.Adapter.WsClient {
  static {
    __name(this, "WsClient");
  }
  _sessionId = "";
  _s = null;
  _ping;
  async prepare() {
    if (this.bot.config.authType === "bearer") await this.bot.getAccessToken();
    try {
      this.bot.logger.debug(this.bot.config.webhookURL);
      return this.bot.http.ws(this.bot.config.webhookURL);
    } catch (error) {
      if (this.bot.http.isError(error) && error.response) {
        this.bot.logger.warn(`GET /gateway response: %o`, error.response.data);
      }
      throw error;
    }
  }
  heartbeat() {
    this.socket.send(JSON.stringify({
      op: 1 /* HEARTBEAT */,
      s: this._s
    }));
  }
  async accept() {
    this.socket.addEventListener("message", async ({ data }) => {
      const parsed = JSON.parse(data.toString());
      this.bot.logger.debug("websocket receives %o", parsed);
      if (parsed.op === 10 /* HELLO */) {
        const token = this.bot.config.authType === "bearer" ? `QQBot ${await this.bot.getAccessToken()}` : `Bot ${this.bot.config.id}.${this.bot.config.token}`;
        if (this._sessionId) {
          this.socket.send(JSON.stringify({
            op: 6 /* RESUME */,
            d: {
              token,
              session_id: this._sessionId,
              seq: this._s
            }
          }));
        } else {
          this.socket.send(JSON.stringify({
            op: 2 /* IDENTIFY */,
            d: {
              token,
              intents: this.bot.config.intents,
              shard: [0, 1]
            }
          }));
        }
        this._ping = setInterval(() => this.heartbeat(), parsed.d.heartbeat_interval);
      } else if (parsed.op === 9 /* INVALID_SESSION */) {
        this._sessionId = "";
        this._s = null;
        this.bot.logger.warn("offline: invalid session");
      } else if (parsed.op === 7 /* RECONNECT */) {
        this.bot.logger.warn("offline: server request reconnect");
      } else if (parsed.op === 0 /* DISPATCH */) {
        this.bot.dispatch(this.bot.session({
          type: "internal",
          _type: "qq/" + parsed.t.toLowerCase().replace(/_/g, "-"),
          _data: parsed.d
        }));
        this._s = parsed.s;
        if (parsed.t === "READY") {
          this._sessionId = parsed.d.session_id;
          this.bot.user = decodeUser(parsed.d.user);
          this.bot.guildBot.user = this.bot.user;
          await this.bot.initialize();
          return this.bot.online();
        }
        if (parsed.t === "RESUMED") {
          return this.bot.online();
        }
        const session = await adaptSession(this.bot, parsed);
        if (session) this.bot.dispatch(session);
      }
    });
    this.socket.addEventListener("close", (e) => {
      this.bot.logger.debug("websocket closed, code %o, reason: %s", e.code, e.reason);
      if (e.code > 4e3 && ![4008, 4009].includes(e.code)) {
        this._sessionId = "";
        this._s = null;
      }
      clearInterval(this._ping);
    });
  }
};
((WsClient2) => {
  WsClient2.Options = import_core2.Schema.intersect([
    import_core2.Adapter.WsClientConfig
  ]);
})(WsClient || (WsClient = {}));

// src/bot/guild.ts
var import_core5 = require("@satorijs/core");

// src/internal/internal.ts
var import_core3 = require("@satorijs/core");
var Internal = class {
  constructor(bot, http) {
    this.bot = bot;
    this.http = http;
  }
  static {
    __name(this, "Internal");
  }
  static define(isGuild, routes, preset) {
    for (const path in routes) {
      for (const key in routes[path]) {
        const method = key;
        for (const name of (0, import_core3.makeArray)(routes[path][method])) {
          (isGuild ? GuildInternal : GroupInternal).prototype[name] = async function(...args) {
            const raw = args.join(", ");
            const url = path.replace(/\{([^}]+)\}/g, () => {
              if (!args.length) throw new Error(`too few arguments for ${path}, received ${raw}`);
              return args.shift();
            });
            const config = { ...preset };
            if (args.length === 1) {
              if (method === "GET" || method === "DELETE") {
                config.params = args[0];
              } else {
                config.data = args[0];
              }
            } else if (args.length === 2 && method !== "GET" && method !== "DELETE") {
              config.data = args[0];
              config.params = args[1];
            } else if (args.length > 1) {
              throw new Error(`too many arguments for ${path}, received ${raw}`);
            }
            const http = this.http();
            try {
              this.bot.logger.debug(`${method} ${url} request: %o`, config);
              const response = await http(url, { ...config, method });
              this.bot.logger.debug(`${method} ${url} response: %o, trace id: %s`, response.data, response.headers.get("x-tps-trace-id"));
              return response.data;
            } catch (error) {
              if (!http.isError(error) || !error.response) throw error;
              this.bot.logger.debug(`${method} ${url} response: %o, trace id: %s`, error.response.data, error.response.headers.get("x-tps-trace-id"));
              throw error;
            }
          };
        }
      }
    }
  }
};
var GroupInternal = class extends Internal {
  static {
    __name(this, "GroupInternal");
  }
};
var GuildInternal = class extends Internal {
  static {
    __name(this, "GuildInternal");
  }
};

// src/internal/group.ts
GroupInternal.define(false, {
  "/v2/groups/{channel.id}/messages": {
    POST: "sendMessage"
  },
  "/v2/groups/{channel.id}/messages/{message.id}": {
    DELETE: "deleteMessage"
  },
  "/v2/users/{user.id}/messages": {
    POST: "sendPrivateMessage"
  },
  "/v2/users/{user.id}/messages/{message.id}": {
    DELETE: "deletePrivateMessage"
  },
  "/v2/users/{user.id}/files": {
    POST: "sendFilePrivate"
  },
  "/v2/groups/{channel.id}/files": {
    POST: "sendFileGuild"
  },
  "/gateway": {
    GET: "getGateway"
  },
  "/gateway/bot": {
    GET: "getGatewayBot"
  }
});
GroupInternal.define(false, {
  "/interactions/{interaction.id}": {
    PUT: "acknowledgeInteraction"
  }
}, { responseType: "text" });

// src/internal/guild.ts
GuildInternal.define(true, {
  "/users/@me": {
    GET: "getMe"
  },
  "/users/@me/guilds": {
    GET: "getGuilds"
  },
  "/guilds/{guild.id}": {
    GET: "getGuild"
  },
  "/guilds/{guild.id}/channels": {
    GET: "getChannels",
    POST: "createGuildChannel"
  },
  "/channels/{channel.id}": {
    GET: "getChannel",
    PATCH: "modifyChannel",
    DELETE: "deleteChannel"
  },
  "/channels/{channel.id}/online_nums": {
    GET: "getChannelOnlineNums"
  },
  "/guilds/{guild.id}/members": {
    GET: "getGuildMembers"
  },
  "/guilds/{guild.id}/roles/{role.id}/members": {
    GET: "getGuildRoleMembers"
  },
  "/guilds/{guild.id}/members/{user.id}": {
    GET: "getGuildMember",
    DELETE: "removeGuildMember"
  },
  "/guilds/{guild.id}/roles": {
    GET: "getGuildRoles",
    POST: "createGuildRole"
  },
  "/guilds/{guild.id}/roles/{role.id}": {
    PATCH: "modifyGuildRole",
    DELETE: "removeGuildRole"
  },
  "/guilds/{guild.id}/members/{user.id}/roles/{role.id}": {
    PUT: "addGuildMemberRole",
    DELETE: "removeGuildMemberRole"
  },
  "/channels/{channel.id}/members/{user.id}/permissions": {
    GET: "getChannelMemberPermissions",
    PUT: "modifyChannelMemberPermissions"
  },
  "/channels/{channel.id}/roles/{role.id}/permissions": {
    GET: "getChannelRole",
    PUT: "modifyChannelRole"
  },
  "/channels/{channel.id}/messages/{message.id}": {
    GET: "getMessage",
    DELETE: "deleteMessage"
  },
  "/channels/{channel.id}/messages": {
    POST: "sendMessage"
  },
  "/dms/{guild.id}/messages": {
    POST: "sendDM"
  },
  "/guilds/{guild.id}/messages/setting": {
    GET: "getMessageSetting"
  },
  "/users/@me/dms": {
    POST: "createDMS"
  },
  "/dms/{guild.id}/messages/{message.id}": {
    DELETE: "deleteDM"
  },
  "/guilds/{guild.id}/mute": {
    PATCH: "muteGuildOrMembers"
  },
  "/guilds/{guild.id}/members/{user.id}/mute": {
    PATCH: "muteGuildMember"
  },
  "/guilds/{guild.id}/announces": {
    POST: "createGuildAnnounce"
  },
  "/guilds/{guild.id}/announces/{message.id}": {
    DELETE: "removeGuildAnnounce"
  },
  "/channels/{channel.id}/pins/{message.id}": {
    PUT: "createPinsMessage",
    DELETE: "removePinsMessage"
  },
  "/channels/{channel.id}/pins": {
    GET: "getPinsMessage"
  },
  "/channels/{channel.id}/schedules": {
    GET: "getSchedules",
    POST: "createSchedule"
  },
  "/channels/{channel.id}/schedules/{schedule.id}": {
    GET: "getSchedule",
    PATCH: "modifySchedule",
    DELETE: "removeSchedule"
  },
  "/channels/{channel.id}/messages/{message.id}/reactions/{type}/{id}": {
    PUT: "createReaction",
    DELETE: "deleteReaction",
    GET: "getReactions"
  },
  "/channels/{channel.id}/threads": {
    GET: "listThreads",
    PUT: "createPost"
  },
  "/channels/{channel.id}/threads/{thread.id}": {
    DELETE: "removePost"
  },
  "/guilds/{guild.id}/api_permissions": {
    GET: "getGuildApiPermissions"
  },
  "/guilds/{guild.id}/api_permissions/demand": {
    POST: "createGuildApiPermissionDemand"
  }
});

// src/message.ts
var import_core4 = require("@satorijs/core");
var escapeMarkdown = /* @__PURE__ */ __name((val) => val.replace(/([\\`*_[\*_~`\]\-(#!>])/g, "\\$&"), "escapeMarkdown");
var QQGuildMessageEncoder = class extends import_core4.MessageEncoder {
  static {
    __name(this, "QQGuildMessageEncoder");
  }
  content = "";
  file;
  filename;
  fileUrl;
  passiveId;
  passiveEventId;
  reference;
  retry = false;
  // 先文后图
  async flush() {
    if (!this.content.trim().length && !this.file && !this.fileUrl) {
      return;
    }
    const isDirect = this.channelId.includes("_");
    let endpoint = `/channels/${this.channelId}/messages`;
    if (isDirect) endpoint = `/dms/${this.channelId.split("_")[0]}/messages`;
    const useFormData = Boolean(this.file);
    let msg_id = this.options?.session?.messageId;
    if (this.options?.session && Date.now() - this.options?.session?.timestamp > MSG_TIMEOUT) {
      msg_id = null;
    }
    if (this.passiveId) msg_id = this.passiveId;
    let r;
    this.bot.logger.debug("use form data %s", useFormData);
    try {
      if (useFormData) {
        const form = new FormData();
        form.append("content", this.content);
        if (this.options?.session && msg_id) {
          form.append("msg_id", msg_id);
        }
        if (this.passiveEventId) {
          form.append("event_id", this.passiveEventId);
        }
        if (this.file) {
          form.append("file_image", this.file, this.filename);
        }
        r = await this.bot.http.post(endpoint, form);
      } else {
        const payload = {
          ...{
            content: this.content,
            msg_id,
            image: this.fileUrl
          },
          ...this.reference ? {
            message_reference: {
              message_id: this.reference
            }
          } : {},
          ...this.passiveEventId ? {
            event_id: this.passiveEventId
          } : {}
        };
        if (isDirect) r = await this.bot.internal.sendDM(this.channelId.split("_")[0], payload);
        else r = await this.bot.internal.sendMessage(this.channelId, payload);
      }
    } catch (e) {
      if (this.bot.http.isError(e)) {
        if (this.bot.parent.config.retryWhen.includes(e.response.data.code) && !this.retry && this.fileUrl) {
          this.bot.logger.warn("retry image sending");
          this.retry = true;
          await this.resolveFile(null, true);
          await this.flush();
        }
        if (useFormData) {
          this.bot.logger.warn(`POST ${endpoint} response: %o, trace id: %s`, e.response.data, e.response.headers.get("x-tps-trace-id"));
        }
      }
    }
    const session = this.bot.session();
    session.type = "send";
    session.guildId = this.session.guildId;
    session.channelId = this.channelId;
    session.isDirect = isDirect;
    if (r?.id) {
      session.messageId = r.id;
      session.app.emit(session, "send", session);
      this.results.push(session.event.message);
    } else if (r?.code === 304023 && this.bot.config.parent.intents & 134217728 /* MESSAGE_AUDIT */) {
      try {
        const auditData = await this.audit(r.data.message_audit.audit_id);
        session.messageId = auditData.message_id;
        session.app.emit(session, "send", session);
        this.results.push(session.event.message);
      } catch (e) {
        this.bot.logger.error(e);
      }
    }
    this.content = "";
    this.file = null;
    this.filename = null;
    this.fileUrl = null;
    this.retry = false;
  }
  async audit(audit_id) {
    return new Promise((resolve, reject) => {
      const dispose = this.bot.ctx.on("qq/message-audit-pass", (data) => {
        if (data.audit_id === audit_id) {
          dispose();
          dispose2();
          resolve(data);
        }
      });
      const dispose2 = this.bot.ctx.on("qq/message-audit-reject", (data) => {
        if (data.audit_id === audit_id) {
          dispose();
          dispose2();
          reject(data);
        }
      });
    });
  }
  async resolveFile(attrs, download = false) {
    if (!download && !await this.bot.ctx.http.isLocal(attrs.src || attrs.url)) {
      return this.fileUrl = attrs.src || attrs.url;
    }
    const { data, filename, type } = await this.bot.ctx.http.file(this.fileUrl || attrs.src || attrs.url, attrs);
    this.file = new Blob([data], { type });
    this.filename = filename;
    this.fileUrl = null;
  }
  async visit(element) {
    const { type, attrs, children } = element;
    if (type === "text") {
      this.content += attrs.content;
    } else if (type === "at") {
      switch (attrs.type) {
        case "all":
          this.content += `@everyone`;
          break;
        default:
          this.content += `<@${attrs.id}>`;
      }
    } else if (type === "br") {
      this.content += "\n";
    } else if (type === "p") {
      if (!this.content.endsWith("\n")) this.content += "\n";
      await this.render(children);
      if (!this.content.endsWith("\n")) this.content += "\n";
    } else if (type === "sharp") {
      this.content += `<#${attrs.id}>`;
    } else if (type === "quote") {
      this.reference = attrs.id;
      await this.flush();
    } else if (type === "passive") {
      if (attrs.messageId) this.passiveId = attrs.messageId;
      if (attrs.eventId) this.passiveEventId = attrs.eventId;
    } else if ((type === "img" || type === "image") && (attrs.src || attrs.url)) {
      await this.flush();
      await this.resolveFile(attrs);
      await this.flush();
    } else if (type === "message") {
      await this.flush();
      await this.render(children);
      await this.flush();
    } else {
      await this.render(children);
    }
  }
};
var MSG_TIMEOUT = 5 * 60 * 1e3 - 2e3;
var QQMessageEncoder = class extends import_core4.MessageEncoder {
  static {
    __name(this, "QQMessageEncoder");
  }
  content = "";
  passiveId;
  passiveSeq;
  passiveEventId;
  useMarkdown = false;
  rows = [];
  attachedFile;
  retry = false;
  // 先图后文
  async flush() {
    if (!this.content.trim() && !this.rows.flat().length && !this.attachedFile) return;
    this.trimButtons();
    let msg_id, msg_seq, event_id;
    if (this.options?.session?.messageId && Date.now() - this.options.session.timestamp < MSG_TIMEOUT) {
      this.options.session["seq"] ||= 0;
      msg_id = this.options.session.messageId;
      msg_seq = ++this.options.session["seq"];
    } else if (this.options?.session?.qq["id"] && Date.now() - this.options.session.timestamp < MSG_TIMEOUT) {
      event_id = this.options.session.qq["id"];
    }
    if (this.passiveId) msg_id = this.passiveId;
    if (this.passiveSeq) msg_seq = this.passiveSeq;
    if (this.passiveEventId) event_id = this.passiveEventId;
    const data = {
      content: this.content,
      msg_type: Message.Type.TEXT,
      msg_id,
      msg_seq,
      event_id
    };
    if (this.attachedFile) {
      if (!data.content.length) data.content = " ";
      data.media = this.attachedFile;
      data.msg_type = Message.Type.MEDIA;
    }
    if (this.useMarkdown) {
      data.msg_type = Message.Type.MARKDOWN;
      delete data.content;
      data.markdown = {
        content: escapeMarkdown(this.content) || " "
      };
      if (this.rows.length) {
        data.keyboard = {
          content: {
            rows: this.exportButtons()
          }
        };
      }
    }
    const session = this.bot.session();
    session.type = "send";
    const send = /* @__PURE__ */ __name(async () => {
      try {
        const resp = this.session.isDirect ? await this.bot.internal.sendPrivateMessage(this.session.channelId, data) : await this.bot.internal.sendMessage(this.session.channelId, data);
        if (resp.id && !resp.audit_id) {
          session.messageId = resp.id;
          session.timestamp = new Date(resp.timestamp).valueOf();
          session.channelId = this.session.channelId;
          session.guildId = this.session.guildId;
          session.app.emit(session, "send", session);
          this.results.push(session.event.message);
        } else if (resp.audit_id && this.bot.config.intents & 134217728 /* MESSAGE_AUDIT */) {
          try {
            const auditData = await this.audit(resp.audit_id);
            session.messageId = auditData.message_id;
            session.app.emit(session, "send", session);
            this.results.push(session.event.message);
          } catch (e) {
            this.bot.logger.error(e);
          }
        }
      } catch (e) {
        if (!this.bot.http.isError(e)) throw e;
        this.errors.push(e);
        if (!this.retry && this.bot.config.retryWhen.includes(e.response.data.code)) {
          this.bot.logger.warn("%s retry message sending", this.session.cid);
          this.retry = true;
          await send();
        }
      }
    }, "send");
    await send();
    this.content = "";
    this.attachedFile = null;
    this.rows = [];
    this.retry = false;
  }
  async audit(audit_id) {
    return new Promise((resolve, reject) => {
      const dispose = this.bot.ctx.on("qq/message-audit-pass", (data) => {
        if (data.audit_id === audit_id) {
          dispose();
          dispose2();
          resolve(data);
        }
      });
      const dispose2 = this.bot.ctx.on("qq/message-audit-reject", (data) => {
        if (data.audit_id === audit_id) {
          dispose();
          dispose2();
          reject(data);
        }
      });
    });
  }
  async sendFile(type, attrs) {
    const url = attrs.src || attrs.url;
    let file_type = 0;
    if (type === "img" || type === "image") file_type = 1;
    else if (type === "video") file_type = 2;
    else if (type === "audio") file_type = 3;
    else return;
    const data = {
      file_type,
      srv_send_msg: false
    };
    const capture = /^data:([\w/.+-]+);base64,(.*)$/.exec(url);
    if (capture?.[2]) {
      data.file_data = capture[2];
    } else if (await this.bot.ctx.http.isLocal(url)) {
      data.file_data = Buffer.from((await this.bot.ctx.http.file(url)).data).toString("base64");
    } else {
      data.url = url;
    }
    let res;
    try {
      if (this.session.isDirect) {
        res = await this.bot.internal.sendFilePrivate(this.options.session.userId, data);
      } else {
        res = await this.bot.internal.sendFileGuild(this.session.channelId, data);
      }
    } catch (e) {
      if (!this.bot.http.isError(e)) throw e;
      this.errors.push(e);
      if (!this.retry && this.bot.config.retryWhen.includes(e.response.data.code)) {
        this.bot.logger.warn("%s retry message sending", this.session.cid);
        this.retry = true;
        await this.sendFile(type, attrs);
      }
    }
    this.retry = false;
    return res;
  }
  decodeButton(attrs, label) {
    const result = {
      id: attrs.id,
      render_data: {
        label,
        visited_label: label,
        style: attrs.class === "primary" ? 1 : 0
      },
      action: {
        type: attrs.type === "input" ? 2 : attrs.type === "link" ? 0 : 1,
        permission: {
          type: 2
        },
        data: attrs.type === "input" ? attrs.text : attrs.type === "link" ? attrs.href : attrs.id
      }
    };
    return result;
  }
  lastRow() {
    if (!this.rows.length) this.rows.push([]);
    let last = this.rows[this.rows.length - 1];
    if (last.length >= 5) {
      this.rows.push([]);
      last = this.rows[this.rows.length - 1];
    }
    return last;
  }
  trimButtons() {
    if (this.rows.length && this.rows[this.rows.length - 1].length === 0) this.rows.pop();
  }
  exportButtons() {
    return this.rows.map((v) => ({
      buttons: v
    }));
  }
  async visit(element) {
    const { type, attrs, children } = element;
    if (type === "text") {
      this.content += attrs.content;
    } else if (type === "passive") {
      if (attrs.messageId) this.passiveId = attrs.messageId;
      if (attrs.seq) this.passiveSeq = Number(attrs.seq);
      if (attrs.eventId) this.passiveEventId = attrs.eventId;
    } else if ((type === "img" || type === "image") && (attrs.src || attrs.url)) {
      await this.flush();
      const data = await this.sendFile(type, attrs);
      if (data) this.attachedFile = data;
    } else if (type === "video" && (attrs.src || attrs.url)) {
      await this.flush();
      const data = await this.sendFile(type, attrs);
      if (data) this.attachedFile = data;
      await this.flush();
    } else if (type === "audio" && (attrs.src || attrs.url)) {
      await this.flush();
      const { data } = await this.bot.ctx.http.file(attrs.src || attrs.url, attrs);
      if (new TextDecoder().decode(data.slice(0, 7)).includes("#!SILK")) {
        const onlineFile = await this.sendFile(type, {
          src: `data:audio/amr;base64,` + Buffer.from(data).toString("base64")
        });
        this.attachedFile = onlineFile;
      } else {
        const ntsilk = this.bot.ctx.get("ntsilk");
        if (ntsilk) {
          const result = await ntsilk.encode(data);
          const onlineFile = await this.sendFile(type, {
            src: `data:audio/amr;base64,` + result.output.toString("base64")
          });
          if (onlineFile) this.attachedFile = onlineFile;
        } else {
          const silk = this.bot.ctx.get("silk");
          if (!silk) return this.bot.logger.warn("missing ntsilk/silk service, cannot send non-silk audio");
          const allowSampleRate = [8e3, 12e3, 16e3, 24e3, 32e3, 44100, 48e3];
          if (silk.isWav(data) && allowSampleRate.includes(silk.getWavFileInfo(data).fmt.sampleRate)) {
            const result = await silk.encode(data, 0);
            const onlineFile = await this.sendFile(type, {
              src: `data:audio/amr;base64,` + Buffer.from(result.data).toString("base64")
            });
            if (onlineFile) this.attachedFile = onlineFile;
          } else {
            if (!this.bot.ctx.get("ffmpeg")) return this.bot.logger.warn("missing ffmpeg service, cannot send non-silk audio except some wav");
            const pcmBuf = await this.bot.ctx.get("ffmpeg").builder().input(Buffer.from(data)).outputOption("-ar", "24000", "-ac", "1", "-f", "s16le").run("buffer");
            const result = await silk.encode(pcmBuf, 24e3);
            const onlineFile = await this.sendFile(type, {
              src: `data:audio/amr;base64,` + Buffer.from(result.data).toString("base64")
            });
            if (onlineFile) this.attachedFile = onlineFile;
          }
        }
      }
      await this.flush();
    } else if (type === "br") {
      this.content += "\n";
    } else if (type === "p") {
      if (!this.content.endsWith("\n")) this.content += "\n";
      await this.render(children);
      if (!this.content.endsWith("\n")) this.content += "\n";
    } else if (type === "button-group") {
      this.useMarkdown = true;
      this.rows.push([]);
      await this.render(children);
      this.rows.push([]);
    } else if (type === "button") {
      this.useMarkdown = true;
      const last = this.lastRow();
      last.push(this.decodeButton(attrs, children.join("")));
    } else if (type === "message") {
      await this.flush();
      await this.render(children);
      await this.flush();
    } else {
      await this.render(children);
    }
  }
};

// src/bot/guild.ts
var QQGuildBot = class extends import_core5.Bot {
  static {
    __name(this, "QQGuildBot");
  }
  hidden = true;
  internal;
  http;
  static MessageEncoder = QQGuildMessageEncoder;
  constructor(ctx, config) {
    super(ctx, config, "qq");
    this.parent = config.parent;
    this.parent.guildBot = this;
    this.platform = "qqguild";
    this.internal = new GuildInternal(this, () => config.parent.http);
    this.http = config.parent.http;
  }
  get status() {
    return this.parent.status;
  }
  set status(status) {
    this.parent.status = status;
  }
  async getUser(userId, guildId) {
    const { user } = await this.getGuildMember(guildId, userId);
    return user;
  }
  async getGuildList(next) {
    const guilds = await this.internal.getGuilds();
    return { data: guilds.map(decodeGuild) };
  }
  async getGuild(guildId) {
    const guild = await this.internal.getGuild(guildId);
    return decodeGuild(guild);
  }
  async getChannelList(guildId, next) {
    const channels = await this.internal.getChannels(guildId);
    return { data: channels.map(decodeChannel) };
  }
  async getChannel(channelId) {
    const channel = await this.internal.getChannel(channelId);
    return decodeChannel(channel);
  }
  async getGuildMemberList(guildId, next) {
    const members = await this.internal.getGuildMembers(guildId, {
      limit: 400,
      after: next
    });
    return { data: members.map(decodeGuildMember), next: members[members.length - 1].user.id };
  }
  async getGuildMember(guildId, userId) {
    const member = await this.internal.getGuildMember(guildId, userId);
    return decodeGuildMember(member);
  }
  async kickGuildMember(guildId, userId) {
    await this.internal.removeGuildMember(guildId, userId);
  }
  async muteGuildMember(guildId, userId, duration) {
    await this.internal.muteGuildMember(guildId, userId, {
      mute_seconds: Math.floor(duration / 1e3)
    });
  }
  async getReactionList(channelId, messageId, emoji, next) {
    const [type, id] = emoji.split(":");
    const { users, cookie } = await this.internal.getReactions(channelId, messageId, type, id, {
      limit: 50,
      cookie: next
    });
    return { next: cookie, data: users.map(decodeUser) };
  }
  async createReaction(channelId, messageId, emoji) {
    const [type, id] = emoji.split(":");
    await this.internal.createReaction(channelId, messageId, type, id);
  }
  async deleteReaction(channelId, messageId, emoji) {
    const [type, id] = emoji.split(":");
    await this.internal.deleteReaction(channelId, messageId, type, id);
  }
  async getMessage(channelId, messageId) {
    const r = await this.internal.getMessage(channelId, messageId);
    return decodeMessage(this, r);
  }
  async deleteMessage(channelId, messageId) {
    if (channelId.includes("_")) {
      const [guildId] = channelId.split("_");
      await this.internal.deleteDM(guildId, messageId);
    } else {
      await this.internal.deleteMessage(channelId, messageId);
    }
  }
  async getLogin() {
    return this.parent.getLogin();
  }
  async createDirectChannel(id, guild_id) {
    let input_guild_id = guild_id;
    if (guild_id?.includes("_")) input_guild_id = guild_id.split("_")[0];
    const dms = await this.internal.createDMS({
      recipient_id: id,
      source_guild_id: input_guild_id
    });
    return { id: `${dms.guild_id}_${input_guild_id}`, type: import_core5.Universal.Channel.Type.DIRECT };
  }
};

// src/bot/index.ts
var QQBot = class extends import_core6.Bot {
  static {
    __name(this, "QQBot");
  }
  static MessageEncoder = QQMessageEncoder;
  static inject = ["http"];
  guildBot;
  internal;
  http;
  _token;
  _timer;
  constructor(ctx, config) {
    super(ctx, config, "qq");
    let endpoint = config.endpoint;
    if (config.sandbox) {
      endpoint = endpoint.replace(/^(https?:\/\/)/, "$1sandbox.");
    }
    this.http = this.ctx.http.extend({
      endpoint,
      headers: {
        "Authorization": this.config.authType === "bot" ? `Bot ${this.config.id}.${this.config.token}` : "",
        "X-Union-Appid": this.config.id
      }
    });
    this.ctx.plugin(QQGuildBot, {
      parent: this
    });
    this.internal = new GroupInternal(this, () => this.http);
    this.ctx.plugin(WsClient, this);
  }
  async initialize() {
    try {
      const user = await this.guildBot.internal.getMe();
      Object.assign(this.user, user);
    } catch (e) {
      this.logger.error(e);
    }
  }
  async stop() {
    clearTimeout(this._timer);
    if (this.guildBot) {
      delete this.ctx.bots[this.guildBot.sid];
    }
    await super.stop();
  }
  async _ensureAccessToken() {
    try {
      const result = await this.ctx.http("https://bots.qq.com/app/getAppAccessToken", {
        method: "POST",
        data: {
          appId: this.config.id,
          clientSecret: this.config.secret
        }
      });
      if (!result.data.access_token) {
        this.logger.warn(`POST https://bots.qq.com/app/getAppAccessToken response: %o, trace id: %s`, result.data, result.headers.get("x-tps-trace-id"));
        throw new Error("failed to refresh access token");
      }
      this._token = result.data.access_token;
      this.http.config.headers.Authorization = `QQBot ${this._token}`;
      this._timer = setTimeout(() => {
        this._ensureAccessToken();
      }, (result.data.expires_in - 40) * 1e3);
    } catch (e) {
      if (!this.ctx.http.isError(e) || !e.response) throw e;
      this.logger.warn(`POST https://bots.qq.com/app/getAppAccessToken response: %o, trace id: %s`, e.response.data, e.response.headers.get("x-tps-trace-id"));
      throw e;
    }
  }
  async getAccessToken() {
    if (!this._token) {
      await this._ensureAccessToken();
    }
    return this._token;
  }
  async getLogin() {
    return this.toJSON();
  }
  async createDirectChannel(id) {
    return { id, type: import_core6.Universal.Channel.Type.DIRECT };
  }
  async deleteMessage(channelId, messageId) {
    try {
      await this.internal.deleteMessage(channelId, messageId);
    } catch (e) {
      await this.internal.deletePrivateMessage(channelId, messageId);
    }
  }
};
((QQBot2) => {
  QQBot2.usage = `

  ---

  本插件旨在实现qq官方机器人的 webhook 转换为 websocket ，让你的机器人使用 websocket 过度到 webhook，防止12月底的下线。
  
  本插件仅做临时方法使用，且存在诸多潜在的兼容性问题，请慎重使用。
  
  本插件会在 adapter-qq 支持 webhook 后 删除本插件。

  关于本插件的使用方法：  请参考论坛教程来使用本插件哦~

  ---
`;
  QQBot2.Config = import_core6.Schema.intersect([
    import_core6.Schema.object({
      id: import_core6.Schema.string().description("机器人 id。").required(),
      secret: import_core6.Schema.string().description("机器人密钥。").role("secret"),
      token: import_core6.Schema.string().description("机器人令牌。").role("secret"),
      type: import_core6.Schema.union(["public", "private"]).description("机器人类型。").required(),
      sandbox: import_core6.Schema.boolean().description("是否开启沙箱模式。").default(false),
      endpoint: import_core6.Schema.string().role("link").description("要连接的服务器地址。").default("https://api.sgroup.qq.com/"),
      webhookURL: import_core6.Schema.string().role("link").description("要连接的服务器地址。<br>webhook 转换 websocket 的服务器地址").default("wss://你的域名/ws/你的机器人secret秘钥"),
      authType: import_core6.Schema.union(["bot", "bearer"]).description("采用的验证方式。").default("bearer"),
      intents: import_core6.Schema.bitset(Intents).description("需要订阅的机器人事件。"),
      retryWhen: import_core6.Schema.array(Number).description("发送消息遇到平台错误码时重试。").default([])
    }),
    WsClient.Options,
    import_core6.Schema.object({
      manualAcknowledge: import_core6.Schema.boolean().description("手动响应回调消息。").default(false)
    }).description("高级设置")
  ]);
})(QQBot || (QQBot = {}));

// src/index.ts
var src_default = QQBot;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  QQ,
  QQBot,
  QQGuildMessageEncoder,
  QQMessageEncoder,
  WsClient,
  adaptSession,
  decodeChannel,
  decodeGroupMessage,
  decodeGuild,
  decodeGuildMember,
  decodeMessage,
  decodeUser,
  escapeMarkdown,
  setupReaction
});
