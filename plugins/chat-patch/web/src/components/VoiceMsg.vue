<!--
 * @FileDescription: 语音消息组件
 * @Description: 渲染 QQ 语音消息，支持播放/暂停、进度显示和时长展示。
 *   语音消息通过 recordUtil 调用 OneBot get_record API 加载。
 *   如果协议端不支持格式转换，显示"不支持的消息"。
-->

<template>
    <div class="voice-msg"
        :class="{ me: isMe, loading: isLoading, playing: isPlaying }"
        @click.stop="togglePlay">
        <!-- 播放/加载图标 -->
        <div class="voice-icon">
            <font-awesome-icon v-if="isLoading" :icon="['fas', 'spinner']" spin />
            <font-awesome-icon v-else-if="isError" :icon="['fas', 'exclamation-circle']" />
            <font-awesome-icon v-else-if="isPlaying" :icon="['fas', 'pause']" />
            <font-awesome-icon v-else :icon="['fas', 'play']" />
        </div>

        <!-- 频谱区域 -->
        <div class="voice-progress">
            <template v-if="isUnsupported">
                <span class="voice-unsupported">{{ $t('不支持的消息') }}</span>
            </template>
            <template v-else>
                <div class="voice-spectrum">
                    <div
                        v-for="(height, index) in displaySpectrumBars"
                        :key="index"
                        class="voice-spectrum-bar"
                        :class="{ active: index < activeBarCount }"
                        :style="{ height: `${height}%` }" />
                </div>
                <span class="voice-duration">{{ isError ? $t('加载失败') : formatSeconds }}</span>
            </template>
        </div>

        <!-- 音频元素，仅在有可用 src 时渲染 -->
        <audio v-if="audioSrc"
            ref="audioRef"
            :src="audioSrc"
            preload="auto"
            @loadedmetadata="onLoaded"
            @error="onError"
            @timeupdate="onTimeUpdate"
            @ended="onEnded"
            @play="isPlaying = true"
            @pause="isPlaying = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { loadRecord, revokeRecord, type RecordMsgData } from '@renderer/function/utils/recordUtil'
import { Logger } from '@renderer/function/base'

const logger = new Logger()

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
    /** 语音消息数据 */
    item: RecordMsgData
    /** 消息 ID（用于缓存） */
    messageId?: string
    /** 是否为本人发送的消息 */
    isMe?: boolean
}>()

// ============================================================================
// 响应式状态
// ============================================================================

const audioRef = ref<HTMLAudioElement | null>(null)
const audioSrc = ref<string>('')
const isLoading = ref(false)
const isError = ref(false)
const isUnsupported = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(props.item.duration || 0)
const loaded = ref(false)
const spectrumBars = ref<number[]>([])
const hasSpectrumData = ref(false)

let spectrumBuildToken = 0

const SPECTRUM_MIN_BAR_HEIGHT = 14
const SPECTRUM_FFT_SIZE = 256
const SPECTRUM_BAR_COUNT = 32

// ============================================================================
// 计算属性
// ============================================================================

const progressPercent = computed(() => {
    if (duration.value <= 0) return 0
    return Math.min(100, (currentTime.value / duration.value) * 100)
})

const spectrumBarCount = computed(() => {
    return SPECTRUM_BAR_COUNT
})

const placeholderSpectrumBars = computed(() => createPlaceholderSpectrumBars(spectrumBarCount.value))

const displaySpectrumBars = computed(() => {
    return hasSpectrumData.value && spectrumBars.value.length > 0 ? spectrumBars.value : placeholderSpectrumBars.value
})

const activeBarCount = computed(() => {
    return Math.round((displaySpectrumBars.value.length * progressPercent.value) / 100)
})

function formatSecondsLabel(value: number) {
    return `${Math.max(1, Math.ceil(value))}″`
}

const formatSeconds = computed(() => {
    if (isLoading.value) return '--″'
    if (isError.value) return '⚠'
    if (isUnsupported.value) return ''
    if (!loaded.value && duration.value <= 0) return '--″'
    const seconds = isPlaying.value || currentTime.value > 0 ? currentTime.value : duration.value
    return formatSecondsLabel(seconds)
})

// ============================================================================
// 方法
// ============================================================================

function createPlaceholderSpectrumBars(count: number) {
    return Array.from({ length: count }, (_, index) => {
        const t = count <= 1 ? 0 : index / (count - 1)
        const curve = Math.sin(t * Math.PI)
        return Math.round(SPECTRUM_MIN_BAR_HEIGHT + curve * 34)
    })
}

function normalizeSpectrumBars(samples: number[], count: number) {
    if (!samples.length) return createPlaceholderSpectrumBars(count)

    const merged = Array.from({ length: count }, (_, index) => {
        const start = Math.floor((index * samples.length) / count)
        const end = Math.max(start + 1, Math.floor(((index + 1) * samples.length) / count))
        const slice = samples.slice(start, end)

        if (!slice.length) return 0

        const peak = Math.max(...slice)
        const average = slice.reduce((sum, value) => sum + value, 0) / slice.length
        return peak * 0.65 + average * 0.35
    })

    const maxValue = Math.max(...merged, 0.001)

    return merged.map((value, index) => {
        const normalized = Math.min(1, value / maxValue)
        const eased = Math.pow(normalized, 0.82)
        const smoothed = (() => {
            const prev = merged[Math.max(0, index - 1)] / maxValue
            const next = merged[Math.min(merged.length - 1, index + 1)] / maxValue
            return (prev * 0.2) + (eased * 0.6) + (next * 0.2)
        })()

        return Math.round(SPECTRUM_MIN_BAR_HEIGHT + Math.min(1, smoothed) * (100 - SPECTRUM_MIN_BAR_HEIGHT))
    })
}

function buildWaveFallback(buffer: AudioBuffer, count: number) {
    const channelData = buffer.getChannelData(0)
    const samples = Array.from({ length: count }, (_, index) => {
        const start = Math.floor((index * channelData.length) / count)
        const end = Math.max(start + 1, Math.floor(((index + 1) * channelData.length) / count))
        let energy = 0

        for (let i = start; i < end; i += 1) {
            energy += Math.abs(channelData[i])
        }

        return energy / Math.max(1, end - start)
    })

    return normalizeSpectrumBars(samples, count)
}

async function analyzeBufferSpectrum(buffer: AudioBuffer, count: number) {
    const offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate)
    const source = offlineContext.createBufferSource()
    const analyser = offlineContext.createAnalyser()
    const processor = offlineContext.createScriptProcessor(2048, 1, 1)
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    const collected: number[] = []

    analyser.fftSize = SPECTRUM_FFT_SIZE
    analyser.smoothingTimeConstant = 0.35
    source.buffer = buffer

    processor.onaudioprocess = () => {
        analyser.getByteFrequencyData(frequencyData)
        const average = frequencyData.reduce((sum, value) => sum + value, 0) / (frequencyData.length * 255)
        collected.push(average)
    }

    source.connect(analyser)
    analyser.connect(processor)
    processor.connect(offlineContext.destination)
    source.start(0)

    await offlineContext.startRendering()

    source.disconnect()
    analyser.disconnect()
    processor.disconnect()

    return normalizeSpectrumBars(collected, count)
}

async function buildSpectrumBars() {
    if (!audioSrc.value) return

    const currentToken = ++spectrumBuildToken
    const count = spectrumBarCount.value

    hasSpectrumData.value = false
    spectrumBars.value = createPlaceholderSpectrumBars(count)

    try {
        const response = await fetch(audioSrc.value)
        const arrayBuffer = await response.arrayBuffer()
        const audioContext = new AudioContext()
        let decodedBuffer: AudioBuffer

        try {
            decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
        } finally {
            await audioContext.close()
        }

        if (currentToken !== spectrumBuildToken) return

        try {
            spectrumBars.value = await analyzeBufferSpectrum(decodedBuffer, count)
        } catch (error) {
            spectrumBars.value = buildWaveFallback(decodedBuffer, count)
        }

        hasSpectrumData.value = true
    } catch (error) {
        if (currentToken === spectrumBuildToken) {
            spectrumBars.value = createPlaceholderSpectrumBars(count)
            hasSpectrumData.value = false
        }
    }
}

/**
 * 加载语音资源
 */
async function loadVoice() {
    if (loaded.value || isLoading.value) return

    isLoading.value = true
    isError.value = false
    isUnsupported.value = false

    try {
        const result = await loadRecord(props.item, props.messageId)
        audioSrc.value = result.src
        duration.value = result.duration || props.item.duration || 0
        loaded.value = true
        void buildSpectrumBars()

        logger.debug(`语音加载完成: 时长=${duration.value}s`)
    } catch (e) {
        logger.error(e as Error, '语音加载失败')
        // 根据错误信息判断是否因为 OneBot 不支持
        const msg = (e as Error).message || ''
        if (msg.includes('不支持') || msg.includes('缺少 file')) {
            isUnsupported.value = true
        } else {
            isError.value = true
        }
    } finally {
        isLoading.value = false
    }
}

/**
 * 切换播放/暂停
 */
function togglePlay() {
    if (isUnsupported.value) return

    if (isError.value) {
        // 点击重试
        isError.value = false
        loaded.value = false
        audioSrc.value = ''
        loadVoice()
        return
    }

    if (!loaded.value) {
        loadVoice()
        return
    }

    const audio = audioRef.value
    if (!audio) return

    if (audio.paused) {
        audio.play().catch((e) => {
            logger.error(e, '语音播放失败')
            isError.value = true
        })
    } else {
        audio.pause()
    }
}

/**
 * 音频加载完成
 */
function onLoaded() {
    const audio = audioRef.value
    if (audio && audio.duration && !duration.value) {
        duration.value = audio.duration
        void buildSpectrumBars()
    }
    logger.debug(`音频元数据加载完成: ${duration.value}s`)
}

/**
 * 音频加载失败
 */
function onError() {
    logger.error(null, '音频播放错误')
    isError.value = true
    isPlaying.value = false
}

/**
 * 播放时间更新
 */
function onTimeUpdate() {
    const audio = audioRef.value
    if (audio) {
        currentTime.value = audio.currentTime
    }
}

/**
 * 播放结束
 */
function onEnded() {
    isPlaying.value = false
    currentTime.value = 0
}

// ============================================================================
// 生命周期
// ============================================================================

onMounted(() => {
    loadVoice()
})

watch(spectrumBarCount, (count) => {
    if (!hasSpectrumData.value) {
        spectrumBars.value = createPlaceholderSpectrumBars(count)
        return
    }

    if (loaded.value && audioSrc.value && spectrumBars.value.length !== count) {
        void buildSpectrumBars()
    }
}, { immediate: true })

onBeforeUnmount(() => {
    spectrumBuildToken += 1
    // 停止播放
    const audio = audioRef.value
    if (audio) {
        audio.pause()
        audio.src = ''
    }
    // 释放缓存的 blob URL
    revokeRecord(props.messageId)
})
</script>

<style scoped>
.voice-msg {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s ease;
}

.voice-msg.loading {
    opacity: 0.7;
    pointer-events: none;
}

.voice-msg.playing .voice-icon {
    color: var(--color-main);
}

/* 播放图标 */
.voice-icon {
    flex-shrink: 0;
    width: 22px;
    height: 23px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(var(--color-card-rgb), 0.5);
    color: var(--color-font-2);
    font-size: 11px;
    transition: all 0.2s ease;
    padding-left: 2px;
}

.voice-msg.me .voice-icon {
    background: var(--color-card-2);
    color: var(--color-main);
}

.voice-msg.playing .voice-icon {
    background: var(--color-main);
    color: var(--color-font-r);
}
.voice-msg.me.playing .voice-icon {
    background: rgba(var(--color-card-2-rgb), 0.5);
}

/* 频谱区域 */
.voice-progress {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.voice-spectrum {
    flex: 1;
    min-width: 0;
    height: 22px;
    display: flex;
    align-items: center;
    gap: 2px;
    margin-right: 5px;
}

.voice-spectrum-bar {
    flex: 1 1 0;
    min-width: 2px;
    border-radius: 999px;
    background: var(--color-font);
    opacity: 0.5;
    transition: height 0.2s ease, background-color 0.12s linear, opacity 0.12s linear;
}

.voice-spectrum-bar.active {
    background: var(--color-font);
    opacity: 1;
}

.voice-msg.me .voice-spectrum-bar {
    background: var(--color-card-2);
}

.voice-msg.me .voice-spectrum-bar.active {
    background: var(--color-card-2);
}

.voice-duration {
    font-size: 0.8rem;
    color: var(--color-font-2);
    white-space: nowrap;
    flex-shrink: 0;
}
.voice-msg.me span.voice-duration {
    color: var(--color-font-r);
}

.voice-unsupported {
    font-size: 0.8rem;
    color: var(--color-font-2);
    opacity: 0.6;
    font-style: italic;
}

.voice-msg.me .voice-duration {
    color: var(--color-font-1);
}
</style>
