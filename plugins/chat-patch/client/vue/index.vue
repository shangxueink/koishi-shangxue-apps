<style scoped src="./style.css"></style>

<template>
  <div class="chat-container" :class="mobileViewClass" :style="chatContainerStyle" @touchstart="handleTouchStart"
    @touchmove="handleTouchMove" @touchend="handleTouchEnd">
    <!-- 左侧机器人列表 -->
    <div class="bot-list">
      <div class="panel-header">
        <h3>机器人</h3>
      </div>
      <div class="bot-items">
        <div v-for="bot in bots" :key="bot.selfId"
          :class="['bot-item', { active: selectedBot === bot.selfId, pinned: pinnedBots.has(bot.selfId) }]"
          @click="selectBot(bot.selfId)" @contextmenu="handleBotRightClick($event, bot.selfId)">
          <div class="bot-avatar">
            <AvatarComponent v-if="bot.avatar" :src="bot.avatar" :alt="bot.username" :channel-key="'bot-list'" />
            <div v-else class="avatar-placeholder">{{ bot.username.charAt(0).toUpperCase() }}</div>
          </div>
          <div class="bot-info">
            <div class="bot-name">{{ bot.username }}</div>
            <div class="bot-platform">{{ bot.platform }}</div>
          </div>
          <div :class="['bot-status', bot.status]"></div>
        </div>
      </div>
    </div>

    <!-- 中间频道列表 -->
    <div class="channel-list">
      <div class="panel-header">
        <h3>频道</h3>
      </div>
      <div v-if="!selectedBot" class="empty-state">
        请选择一个机器人
      </div>
      <div v-else class="channel-items">
        <div v-for="channel in currentChannels" :key="channel.id"
          :class="['channel-item', { active: selectedChannel === channel.id, pinned: pinnedChannels.has(`${selectedBot}:${channel.id}`) }]"
          :data-channel-id="channel.id" @click="selectChannel(channel.id)"
          @contextmenu="handleChannelRightClick($event, channel.id)">
          <div class="channel-info">
            <div class="channel-name">{{ channel.name }}</div>
            <div class="channel-type">{{ getChannelTypeText(channel.type) }}</div>
          </div>
          <div v-if="getChannelMessageCount(channel.id) > 0" class="channel-message-count draggable-bubble" :class="{
            'dragging': draggingChannel === channel.id,
            'will-delete': draggingChannel === channel.id && getDragDistance(channel.id) > dragThreshold
          }" @mousedown="startDrag($event, channel.id)" @touchstart="startDrag($event, channel.id)"
            :style="getDragStyle(channel.id)"
            :title="draggingChannel === channel.id ? (getDragDistance(channel.id) > dragThreshold ? '松开清理历史记录' : '拖拽更远以清理历史记录') : '拖拽清理历史记录'">
            {{ getChannelMessageCount(channel.id) }}

          </div>
        </div>
      </div>
    </div>

    <!-- 右侧消息区域 -->
    <div class="message-area">
      <div class="panel-header">
        <h3>{{ currentChannelName || '选择频道' }}</h3>
      </div>
      <div v-if="!selectedBot || !selectedChannel" class="empty-state">
        请选择机器人和频道
      </div>
      <div v-else class="message-content">
        <!-- 消息历史 -->
        <div class="message-history" ref="messageHistory">
          <!-- 加载更多指示器 -->
          <div v-if="isLoadingMore" class="loading-more-indicator">
            <div class="loading-spinner"></div>
            <span>加载更多消息中...</span>
          </div>
          
          <div v-for="message in currentMessages" :key="message.id"
            :class="['message-item', { 'bot-message': message.isBot }]">
            <div class="message-avatar">
              <AvatarComponent v-if="message.avatar" :src="message.avatar" :alt="message.username"
                :channel-key="currentChannelKey" />
              <div v-else class="avatar-placeholder">{{ message.username.charAt(0).toUpperCase() }}</div>
            </div>
            <div class="message-content-wrapper">
              <div class="message-header">
                <span class="message-username">{{ message.username }}</span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>

              <!-- 引用消息显示 -->
              <div v-if="message.quote" class="message-quote">
                <div class="quote-header">
                  <div class="quote-avatar">
                    <AvatarComponent v-if="message.quote.user.avatar" :src="message.quote.user.avatar"
                      :alt="message.quote.user.username" :channel-key="currentChannelKey" />
                    <div v-else class="avatar-placeholder">{{
                      message.quote.user.username.charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <span class="quote-username">{{ message.quote.user.username }}</span>
                  <span class="quote-time">{{ formatTime(message.quote.timestamp) }}</span>
                </div>
                <div class="quote-content">
                  <template v-if="message.quote.elements && message.quote.elements.length > 0">
                    <MessageElement v-for="(element, index) in message.quote.elements" :key="`quote-${index}`"
                      :element="element" :channel-key="currentChannelKey" />
                  </template>
                  <template v-else>
                    {{ message.quote.content }}
                  </template>
                </div>
              </div>

              <div class="message-text">
                <template v-if="message.elements && message.elements.length > 0">
                  <MessageElement v-for="(element, index) in message.elements" :key="index" :element="element"
                    :channel-key="currentChannelKey" />
                </template>
                <template v-else>
                  {{ message.content }}
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 悬浮的滚动到底部按钮 -->
        <div class="floating-scroll-button" v-show="showScrollButton" @click="scrollToBottom">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>

        <!-- 输入框 -->
        <div class="message-input">
          <!-- 图片预览区域 -->
          <div v-if="uploadedImages.length > 0" class="image-preview-container">
            <div v-for="image in uploadedImages" :key="image.tempId" class="image-preview-item">
              <img :src="image.preview" :alt="image.filename" class="preview-image" />
              <button class="remove-image-btn" @click="removeImage(image.tempId)" title="删除图片">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="input-row">
            <!-- 加号按钮 -->
            <div class="input-actions">
              <button class="add-button" @click="toggleActionMenu" :class="{ active: showActionMenu }" title="更多操作">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>

              <!-- 操作菜单 -->
              <div v-if="showActionMenu" class="action-menu" @click.stop>
                <button class="action-menu-item" @click="triggerImageUpload">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                  </svg>
                  上传图片
                </button>
              </div>
            </div>

            <input v-model="inputMessage" type="text" :placeholder="inputPlaceholder" @keyup.enter="sendMessage"
              :disabled="!canInputMessage" ref="messageInput" @paste="handlePaste" @focus="handleInputFocus" />
            <button @click="sendMessage" :disabled="!canSendMessage" :class="{ 'is-sending': isSending }">
              {{ isSending ? '发送中...' : '发送' }}
            </button>
          </div>

          <!-- 隐藏的文件输入 -->
          <input type="file" ref="fileInput" @change="handleFileSelect" accept="image/*" multiple
            style="display: none;" />
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div v-if="contextMenu.show" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop>
      <!-- 机器人右键菜单 -->
      <template v-if="contextMenu.type === 'bot'">
        <div class="context-menu-item" @click="toggleBotPin(contextMenu.targetId)">
          {{ pinnedBots.has(contextMenu.targetId) ? '取消置顶' : '置顶' }}
        </div>
        <div class="context-menu-item danger" @click="deleteBotMessages(contextMenu.targetId)">
          彻底删除此机器人所有数据
        </div>
      </template>

      <!-- 频道右键菜单 -->
      <template v-if="contextMenu.type === 'channel'">
        <div class="context-menu-item" @click="toggleChannelPin(contextMenu.targetId)">
          {{ pinnedChannels.has(`${selectedBot}:${contextMenu.targetId}`) ? '取消置顶' : '置顶' }}
        </div>
        <div class="context-menu-item danger" @click="deleteChannelMessages(contextMenu.targetId)">
          彻底删除此频道所有数据
        </div>
      </template>
    </div>

    <!-- 滑动指示器 -->
    <div class="swipe-indicator" :class="{ show: swipeIndicator.show }">
      {{ swipeIndicator.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChatLogic } from './chat-logic'

const chatLogic = useChatLogic()

// 解构
const {
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
  isLoadingMore,
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
  handleMessageEvent
} = chatLogic
</script>