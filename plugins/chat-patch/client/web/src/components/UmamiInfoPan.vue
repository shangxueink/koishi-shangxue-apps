<template>
    <div class="umami-info-pan">
        <div :class="'type-list' + (loading ? ' load' : '')">
            <font-awesome-icon :icon="['fas', 'book']" />
            <!-- 概览 -->
            <font-awesome-icon
                :class="{'select': showName === 'overview'}"
                :icon="['fas', 'chart-column']"
                @click="changeView('overview')" />
            <!-- 访客数据 -->
            <font-awesome-icon
                :class="{'select': showName === 'website'}"
                :icon="['fas', 'globe']"
                @click="changeView('website')" />
            <!-- 访客详情 -->
            <font-awesome-icon
                :class="{'select': showName === 'session'}"
                :icon="['fas', 'box-archive']"
                @click="changeView('session')" />
            <!-- 事件详情 -->
            <font-awesome-icon
                :class="{'select': showName === 'event'}"
                :icon="['fas', 'calendar-days']"
                @click="changeView('event')" />
        </div>
        <div :class="mainListSelected ? 'select' : ''">
            <div v-if="showName != 'overview'" class="detail-list">
                <template v-if="showName === 'website'">
                    <p>{{ $t('访客数据') }}</p>
                </template>
                <template v-if="showName === 'session'">
                    <p>{{ $t('访客详情') }}</p>
                    <span> {{ $t('访客数据表示访问网站的独立会话，同一个访客只会统计一次。并且在下次访问时覆盖上次的数据。') }}
                        <span v-if="onlyValidData"><br><br>{{ $t('"有效数据"仅包含了访客中连接了 bot 的部分会话。') }}</span></span>
                </template>
                <template v-if="showName === 'event'">
                    <p>{{ $t('事件详情') }}</p>
                    <span> {{ $t('事件数据表示用户在访问期间的具体操作或上报行为，每次触发都会单独记录，因此同一个访客可能产生多个事件。') }} </span>
                </template>
                <div class="list">
                    <div v-for="(item, index) in mainList"
                        :key="index"
                        :class="{'select': mainListSelected === item.value}"
                        @click="getData(item.value)">
                        <span>{{ item.label }}<span v-if="item.subLabel">{{ item.subLabel }}</span></span>
                        <a>{{ item.count ? formatNumber(Number(item.count)) : '' }}</a>
                    </div>
                </div>
                <div class="time-select">
                    <div>
                        <label for="umami-time-select-detail" class="sr-only">{{ $t('选择统计时间范围') }}</label>
                        <select id="umami-time-select-detail" v-model="timeType" :disabled="loading"
                            @change="changeTime">
                            <option value="1">
                                {{ $t('最近 24 小时') }}
                            </option>
                            <option value="2">
                                {{ $t('本周') }}
                            </option>
                            <option value="3">
                                {{ $t('本月') }}
                            </option>
                            <option value="4">
                                {{ $t('本年') }}
                            </option>
                            <option value="5">
                                {{ $t('所有时间段') }}
                            </option>
                        </select>
                    </div>
                </div>
                <div v-if="showName === 'session'" class="only-valid-data">
                    <span>{{ $t('仅有效数据') }}</span>
                    <label for="umami-only-valid-data" class="sr-only">{{ $t('仅有效数据') }}</label>
                    <label class="ss-switch">
                        <input id="umami-only-valid-data" v-model="onlyValidData" :disabled="loading"
                            type="checkbox"
                            @change="changeTime">
                        <div>
                            <div />
                        </div>
                    </label>
                </div>
            </div>
            <div class="view-pan">
                <font-awesome-icon
                    v-if="showName != 'overview'"
                    :icon="['fas', 'arrow-left']"
                    @click="mainListSelected = ''" />
                <!-- 概览 -->
                <template v-if="showName === 'overview'">
                    <a v-if="visitData.pageviewChart != null">{{ $t('概览') }}</a>
                    <div v-if="visitData.pageviewChart != null" style="width: 100%;height: 100%;display: flex;align-items: center;flex-direction: column;">
                        <v-chart :option="visitData.pageviewChart" style="width: 100%;height: 100%;" autoresize />
                        <div class="time-select overview-time-select">
                            <div>
                                <label for="umami-time-select-overview" class="sr-only">{{ $t('选择统计时间范围') }}</label>
                                <select id="umami-time-select-overview" v-model="timeType" :disabled="loading"
                                    @change="changeTime">
                                    <option value="1">
                                        {{ $t('最近 24 小时') }}
                                    </option>
                                    <option value="2">
                                        {{ $t('本周') }}
                                    </option>
                                    <option value="3">
                                        {{ $t('本月') }}
                                    </option>
                                    <option value="4">
                                        {{ $t('本年') }}
                                    </option>
                                    <option value="5">
                                        {{ $t('所有时间段') }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </template>
                <!-- 访客数据 -->
                <template v-else-if="showName === 'website'">
                    <div class="status">
                        <div v-for="name in Object.keys(visitData.status)"
                            v-show="name !== 'bounces' && name !== 'totaltime'"
                            :key="name">
                            <a>{{ formatNumber(visitData.status[name].value) }}</a>
                            <span v-if="name !== 'bounces' && name !== 'totaltime'">
                                {{ $t('访客数据_' + name) }}
                                <span v-if="visitData.status[name].comparison !== undefined">
                                    ({{ visitData.status[name].comparison >= 0 ? '+' : '' }}{{ visitData.status[name].comparison.toFixed(0) }}%)
                                </span>
                            </span>
                        </div>
                    </div>
                    <span>{{ $t('当前在线人数') }}: {{ visitData.online }}</span>
                    <div v-show="mainListSelected != ''" v-if="visitData.metrics != null" class="ss-card website-metric">
                        <div>
                            <span v-if="mainListSelected !== ''">{{ $t(metricTypes[mainListSelected]) }}</span>
                            <a style="width: calc(5rem + 20px);">{{ $t('数值（占比）') }}</a>
                        </div>
                        <div v-for="(metric, index) in visitData.metrics" :key="index">
                            <span v-if="mainListSelected === 'event'">
                                {{ eventTypes[metric.x] ? $t(eventTypes[metric.x]) + $t('次数') : metric.x }}
                            </span>
                            <span v-else>{{ (metric.x && metric.x != '') ? metric.x : '-' }}</span>
                            <div>
                                <a>{{ formatNumber(metric.y) }}</a>
                                <!-- 按百分比绘制背景 -->
                                <div :style="{background: `linear-gradient(to right, color-mix(in srgb, var(--color-main) 20%, transparent) ${metric.percentage}%, transparent ${metric.percentage}%)`}">
                                    <span>{{ metric.percentage }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
                <!-- 访客详情 & 事件详情 -->
                <template v-if="showName === 'event' || showName === 'session'">
                    <div v-show="mainListSelected != ''" v-if="eventData != null" class="pie-pan">
                        <v-chart :option="eventData" autoresize />
                        <a v-if="eventData.series && eventData.series[0] && eventData.series[0].type === 'pie'">{{ $t('占比小于 {per}% 的数据将不会展示在饼图中', { per: minPiePercentage * 100 }) }}</a>
                    </div>
                    <div v-show="mainListSelected != ''" v-else>
                        <a>{{ $t('暂无数据') }}</a>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { ref, shallowReactive, watch, onMounted } from 'vue'
    import { i18n } from '@renderer/main'

    import { use } from 'echarts/core'
    import { PieChart, BarChart, SunburstChart } from 'echarts/charts'
    import {
        LegendComponent,
        BrushComponent,
        ToolboxComponent,
        TooltipComponent,
        GridComponent,
        PolarComponent
    } from 'echarts/components'
    import { CanvasRenderer } from 'echarts/renderers'

    import VChart from 'vue-echarts'

    use([
        TooltipComponent,
        LegendComponent,
        PieChart,
        CanvasRenderer,
        LegendComponent,
        BrushComponent,
        ToolboxComponent,
        TooltipComponent,
        BarChart,
        GridComponent,
        PolarComponent,
        SunburstChart
    ])

    defineOptions({ name: 'UmamiInfoPan' })

    const $t = i18n.global.t

    const API_URL = import.meta.env.VITE_APP_MU_DATA_API

    // ========== 静态数据 ===========

    const metricTypes: Record<string, string> = {
        'path': '页面',
        'browser': '浏览器',
        'os': '操作系统',
        'device': '设备',
        'language': '语言',
        'screen': '屏幕',
        'event': '事件'
    }

    const eventTypes: Record<string, string> = {
        'send_msg': '发送消息',
        'sendMsg': '发送消息（弃用）',
        'connect': '连接',
        'use_theme_color': '切换主题色',
        'use_language': '切换语言',
        'click_statistics': '触发按钮',
        'use_chatview': '切换聊天面板样式',
        'cilent': '上报版本（弃用）',
        'show_qed': '触发彩蛋',
        'use_transparent': '切换窗口透明',
        'link_view': '链接预览',

        'app_version': '应用版本',
        'os_version': '系统版本',
        'bot_version': '机器人版本',
        'os_arch': '系统架构',
    }

    const buttonTypes: Record<string, string> = {
        'touch_randomly': '彩蛋按钮',
        'visit_fish': '赞助按钮',
        'visit_github': 'GitHub 按钮',
        'visit_blog': '博客按钮',
    }

    const minPiePercentage = 0.0084 // 饼图中最小显示百分比

    // ========== 响应式数据 ==========

    const showName = ref('website')
    const timeType = ref(1)
    const loading = ref(false)
    const mainListSelected = ref('')
    const mainList = ref<{
        label: string,
        subLabel?: string,
        value: string,
        count?: number,
        data?: any
    }[]>([])
    const visitData = shallowReactive<{
        pageviews: any,
        pageviewChart: any,
        status: any,
        metrics: any,
        online: number
    }>({
        pageviews: null,
        pageviewChart: null,
        status: {},
        metrics: null,
        online: 0
    })
    const eventData = ref<any>(null)
    const onlyValidData = ref(false)

    // ========== watch ==========

    watch(mainList, (newValue) => {
        if (newValue.length > 0)
            loading.value = false
    })

    watch(visitData, (newValue) => {
        if (newValue.pageviewChart != null)
            loading.value = false
    })

    watch(showName, () => {
        updateData()
    })

    // ========== 方法 ==========

    function changeView(view: string) {
        if (loading.value) return

        showName.value = view
        mainListSelected.value = ''
        visitData.metrics = null
        eventData.value = null
        updateData()
    }

    function changeTime() {
        if (loading.value) return

        mainListSelected.value = ''
        updateData()
    }

    function updateData() {
        loading.value = true
        getStatus()
        getOnlineCount()
        getList()
        if (mainListSelected.value != '' || showName.value === 'overview') {
            getData(mainListSelected.value)
        }
    }

    function getData(value: string) {
        // 获取 css 中的 var(--color-main)
        const colorMainRaw = getComputedStyle(document.documentElement).getPropertyValue('--color-main')
        const colorFont = getComputedStyle(document.documentElement).getPropertyValue('--color-font-1')
        const colorCard = getComputedStyle(document.documentElement).getPropertyValue('--color-card-1')

        mainListSelected.value = value
        if (showName.value === 'overview') {
            getPageViews().then(() => {
                if (!visitData.pageviews) return
                const xAxisData: string[] = []
                const data1: number[] = []
                const data2: number[] = []
                for (let i = 0; i < visitData.pageviews.pageviews.length; i++) {
                    const pageviews = visitData.pageviews.pageviews[i]
                    const sessions = visitData.pageviews.sessions[i]
                    // 2025-09-19 01:00:00
                    const format = getRealTimeRange().format
                    const formattedDate = formatDate(pageviews.x, format)
                    xAxisData.push(formattedDate)
                    data1.push(pageviews.y)
                    data2.push(sessions.y)
                }
                const colorMain = hexToRgb(colorMainRaw)
                // 给 colorMain 加透明的
                const colorMainWithAlpha = colorMain.replace(')', ', 0.5)').replace('rgb', 'rgba')
                visitData.pageviewChart = {
                    textStyle: {
                        color: colorFont
                    },
                    legend: {
                        data: [$t('浏览量'), $t('访客')],
                        left: '10%',
                        textStyle: {
                            color: colorFont
                        }
                    },
                    tooltip: {},
                    xAxis: {
                        data: xAxisData,
                        name: getRealTimeRange().formatName,
                        axisLine: { onZero: true },
                        axisLabel: {
                            color: colorFont
                        },
                        splitLine: { show: false },
                        splitArea: { show: false },
                    },
                    yAxis: {
                        axisLabel: {
                            color: colorFont
                        }
                    },
                    grid: {
                        bottom: 100,
                        left: 50,
                    },
                    series: [
                        {
                            name: $t('浏览量'),
                            type: 'bar',
                            data: data1,
                            barGap: '-100%',
                            itemStyle: {
                                color: colorMainWithAlpha,
                                borderRadius: [7, 7, 0, 0]
                            }
                        },
                        {
                            name: $t('访客'),
                            type: 'bar',
                            data: data2,
                            itemStyle: {
                                color: colorMain,
                                borderRadius: [7, 7, 0, 0]
                            }
                        }
                    ]
                }
            })
        } else if (showName.value === 'website') {
            getMetric(value)
        } else if (showName.value === 'event' || showName.value === 'session') {
            const evData = mainList.value.find(item => item.value === value)?.data
            if (evData) {
                // evData 格式：[{value: 'xxx', total: 123}, ...]
                // 转换为饼图需要的格式
                let pieData = evData.map((item: any) => ({
                    value: item.total,
                    name: (item.value != '' && item.value != null) ? item.value : $t('（未知）')
                }))
                // 只取前 9 项，其他归为"其他"，如果恰巧有 10 项也不处理防止第 10 项变成"其他"
                // if (pieData.length > 10) {
                //     const topData = pieData.slice(0, 9)
                //     const otherTotal = pieData.slice(9).reduce((sum: number, item: any) => sum + item.value, 0)
                //     topData.push({ value: otherTotal, name: $t('其他') })
                //     pieData = topData
                // }
                // 按 value 降序排列
                pieData.sort((a: any, b: any) => b.value - a.value)

                const isSunburstMetric =
                    value.indexOf('app_version') == 0 ||
                    value.indexOf('os_version') == 0 ||
                    value.indexOf('bot_version') == 0

                // ======= 特殊处理 =======
                // 应用版本、系统版本、机器人版本改为旭日图逐层展示
                if (isSunburstMetric) {
                    eventData.value = buildSunburstOption(value, pieData, colorCard, colorFont)
                    return
                }

                // 触发彩蛋改为直方图
                if (value.indexOf('show_qed') == 0) {
                    eventData.value = buildShowQedHistogramOption(pieData, colorCard, colorFont, colorMainRaw)
                    return
                }

                // 系统架构将 x86_64 统一为 x64、arm64 统一为 aarch64
                if (value.indexOf('os_arch') == 0) {
                    pieData = processOsArch(pieData)
                }
                // 触发按钮进行名称映射
                else if (value.indexOf('click_statistics') == 0) {
                    pieData = processClickStatistics(pieData)
                }
                // 这边的颜色用 colorMainRaw 创建 10 级不同透明度的颜色，不需要转为 rgba，使用十六进制颜色
                const colors = [] as string[]
                for (let i = 10; i >= 1; i--) {
                    const alpha = Math.floor((i / 10) * 255).toString(16).padStart(2, '0')
                    colors.push(colorMainRaw + alpha)
                }
                // 去除占比小于等于 0.84% 的
                const total = pieData.reduce((sum: number, it: any) => sum + it.value, 0)
                pieData = pieData.filter((item: any) => (item.value / total) > minPiePercentage)
                eventData.value = {
                    // colors: colors,
                    color: ['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8', '#efa18d', '#787464', '#cc7e63', '#724e58', '#4b565b'],
                    tooltip: {
                        formatter: (params: any) => {
                            return `${params.marker} ${params.name}: ${params.value} (${params.percent}%)`
                        },
                        trigger: 'item',
                        backgroundColor: colorCard,
                        textStyle: {
                            color: colorFont
                        },
                    },
                    legend: {
                        top: 'bottom',
                        left: 'center',
                        type: 'scroll',
                        textStyle: {
                            color: colorFont
                        }
                    },
                    series: [
                        {
                            type: 'pie',
                            radius: ['40%', '70%'],
                            center: ['50%', '55%'],
                            avoidLabelOverlap: false,
                            padAngle: 3,
                            itemStyle: {
                                borderRadius: 7
                            },
                            label: {
                                show: false
                            },
                            emphasis: {
                                label: {
                                    show: false
                                }
                            },
                            labelLine: {
                                show: false
                            },
                            data: pieData
                        }
                    ]
                }
            }
        }
    }

    async function getPageViews() {
        const url = API_URL + '/pageviews/' + getRealTimeRange().precision + '/' + getRealTimeRange().time
        const res = await fetch(url)
        const data = await res.json()
        if (!data.error) {
            visitData.pageviews = data
        }
    }

    /**
     * 获取当前在线人数
     */
    async function getOnlineCount() {
        // 获取当前在线人数
        const url = API_URL + '/active'
        const res = await fetch(url)
        const data = await res.json()
        if (!data.error) {
            visitData.online = data.visitors
        }
    }

    /**
     * 获取统计指标列表
     */
    async function getList() {
        mainList.value = []
        if (showName.value == 'website') {
            const list = [] as {
                label: string,
                subLabel?: string,
                value: string,
                count?: number,
                data?: any
            }[]
            for (const type of Object.keys(metricTypes)) {
                list.push({
                    label: $t(metricTypes[type]),
                    value: type,
                })
            }
            if (showName.value == 'website')
                mainList.value = list
        } else if (showName.value == 'event' || showName.value == 'session') {
            let url = API_URL + '/events/' + getRealTimeRange().time
            if (showName.value == 'session') {
                url = API_URL + '/sessions/' + getRealTimeRange().time
            }
            let res
            if (showName.value == 'session' && onlyValidData.value) {
                url = API_URL + '/sessions/' + getRealTimeRange().time + '/filter'
                res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event: 'eq.send_msg'
                    })
                })
            } else {
                res = await fetch(url)
            }
            const data = await res.json()
            if (!data.error) {
                const list = [] as {
                    label: string,
                    subLabel?: string,
                    value: string,
                    count?: number,
                    data?: any
                }[]
                for (const item of data) {
                    if (!item.eventName) {
                        item.eventName = item.propertyName
                        delete item.propertyName
                    }
                    list.push({
                        label: eventTypes[item.eventName] ? $t(eventTypes[item.eventName]) : item.eventName,
                        subLabel: item.propertyName,
                        value: item.eventName + '/' + item.propertyName,
                        count: item.total,
                        data: item.details
                    })
                }
                // 根据 count 降序排列
                list.sort((a, b) => (b.count || 0) - (a.count || 0))
                if (showName.value == 'event' || showName.value == 'session')
                    mainList.value = list
            }
        }
    }

    /**
     * 获取访客数据总览
     */
    async function getStatus() {
        const url = API_URL + '/status/' + getRealTimeRange().time
        const res = await fetch(url)
        const data = await res.json()
        if (!data.error) {
            const calculateComparison = (current: number, baseline: number): number => {
                const currentVal = current || 0
                const baselineVal = baseline || 0
                // 如果基准值为 0，则无法计算百分比变化
                if (baselineVal === 0) {
                    return currentVal === 0 ? 0 : 100
                }
                const result = ((currentVal - baselineVal) / baselineVal) * 100
                return isNaN(result) ? 0 : result
            }
            visitData.status = {
                pageviews: {
                    value: data.pageviews || 0,
                    comparison: calculateComparison(data.pageviews, data.comparison?.pageviews)
                },
                visitors: {
                    value: data.visitors || 0,
                    comparison: calculateComparison(data.visitors, data.comparison?.visitors)
                },
                visits: {
                    value: data.visits || 0,
                    comparison: calculateComparison(data.visits, data.comparison?.visits)
                }
            }
        }
    }

    /**
     * 获取指定指标的详细数据
     * @param name 指标名称
     */
    async function getMetric(name: string) {
        // 获取指定指标的详细数据
        visitData.metrics = []
        const url = API_URL + '/metrics/' + name + '/' + getRealTimeRange().time
        const res = await fetch(url)
        const data = await res.json()
        if (!data.error) {
            // 计算 data[*].y 的总和
            let total = 0
            for (const item of data) {
                total += item.y
            }
            // 计算每一项的占比
            for (const item of data) {
                item.percentage = ((item.y / total) * 100).toFixed(0)
            }
            visitData.metrics = data
        }
    }

    // ========== 工具函数 ===========

    /**
     * 合并同名项并降序排序
     */
    function mergeAndSort(pieData: Array<{ name: string, value: number }>) {
        const mergedData: Record<string, number> = {}
        for (const item of pieData) {
            if (mergedData[item.name]) {
                mergedData[item.name] += item.value
            } else {
                mergedData[item.name] = item.value
            }
        }
        const result = Object.keys(mergedData).map(name => ({
            name,
            value: mergedData[name]
        }))
        result.sort((a, b) => b.value - a.value)
        return result
    }

    function buildSunburstOption(metric: string, pieData: Array<{ name: string, value: number }>, colorCard: string, colorFont: string) {
        const sunburstData = getSunburstData(metric, pieData)
        if (!sunburstData || sunburstData.length === 0) {
            return null
        }

        return {
            tooltip: {
                trigger: 'item',
                backgroundColor: colorCard,
                textStyle: {
                    color: colorFont
                },
                formatter: (params: any) => {
                    const treePath = params.treePathInfo || []
                    const visiblePath = treePath.slice(1)
                    const path = visiblePath.map((item: any) => item.name).join(' ')

                    const toPercent = (part: number, whole: number) => {
                        if (!whole || whole <= 0) return '0.00%'
                        return `${((part / whole) * 100).toFixed(2)}%`
                    }

                    const rootValue = Number(treePath[0]?.value || params.value || 0)
                    const levelLines = visiblePath.map((node: any, index: number) => {
                        const currentValue = Number(node.value || 0)
                        const parentValue = Number(treePath[index]?.value || rootValue)
                        const parentPercent = toPercent(currentValue, parentValue)
                        const totalPercent = toPercent(currentValue, rootValue)
                        return `${node.name}: ${parentPercent} (${$t('全局')} ${totalPercent})`
                    })

                    return `${params.marker} ${path}<br/>${$t('数值')}: ${params.value}<br/>${levelLines.join('<br/>')}`
                }
            },
            series: [
                {
                    type: 'sunburst',
                    radius: ['20%', '90%'],
                    itemStyle: {
                        borderWidth: 3,
                        borderRadius: 7,
                        borderColor: colorCard
                    },
                    label: {
                        show: false
                    },
                    emphasis: {
                        focus: 'series'
                    },
                    data: sunburstData
                }
            ]
        }
    }

    function buildShowQedHistogramOption(pieData: Array<{ name: string, value: number }>, colorCard: string, colorFont: string, colorMainRaw: string) {
        const attempts = pieData
            .map(item => Number(item.name))
            .filter(item => !isNaN(item) && item > 0)
        const maxAttempt = attempts.length > 0 ? Math.max(...attempts) : 0
        if (maxAttempt <= 0) {
            return null
        }

        const bucketSize = 150
        const bucketCount = Math.ceil(maxAttempt / bucketSize)
        const bucketMap: Record<string, number> = {}
        const labels: string[] = []
        for (let i = 0; i < bucketCount; i++) {
            const start = i * bucketSize + 1
            const end = (i + 1) * bucketSize
            const label = `${start}-${end}`
            labels.push(label)
            bucketMap[label] = 0
        }

        for (const item of pieData) {
            const attempt = Number(item.name)
            if (isNaN(attempt) || attempt <= 0) continue
            const bucketIndex = Math.floor((attempt - 1) / bucketSize)
            const label = labels[bucketIndex]
            if (!label) continue
            bucketMap[label] += Number(item.value || 0)
        }

        const activeLabels = labels.filter(label => bucketMap[label] > 0)
        const points = activeLabels.map(label => [label, bucketMap[label]])

        if (activeLabels.length === 0) {
            return null
        }

        return {
            tooltip: {
                trigger: 'item',
                backgroundColor: colorCard,
                textStyle: {
                    color: colorFont
                },
                formatter: (params: any) => {
                    const label = activeLabels[params.dataIndex] || params.name
                    return `${params.marker} ${$t('尝试区间')}: ${label}<br/>${$t('出现次数')}: ${params.value}`
                }
            },
            polar: {
                radius: ['20%', '80%']
            },
            angleAxis: {
                type: 'category',
                data: activeLabels,
                startAngle: 90,
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    show: false
                },
                nameTextStyle: {
                    color: colorFont
                }
            },
            radiusAxis: {
                type: 'value',
                name: $t('触发尝试次数'),
                minInterval: 1,
                nameTextStyle: {
                    color: colorFont
                },
                axisLabel: {
                    color: colorFont,
                    formatter: (value: number) => `${Math.round(value)}`
                }
            },
            series: [
                {
                    type: 'bar',
                    coordinateSystem: 'polar',
                    roundCap: true,
                    barMaxWidth: 28,
                    itemStyle: {
                        color: colorMainRaw,
                        borderRadius: 6
                    },
                    data: points.map(point => point[1])
                }
            ]
        }
    }

    function getSunburstData(metric: string, pieData: Array<{ name: string, value: number }>) {
        if (metric.indexOf('os_version') == 0) {
            return buildOsVersionSunburstData(pieData)
        }
        if (metric.indexOf('app_version') == 0) {
            return buildVersionSunburstData(pieData, 'app')
        }
        if (metric.indexOf('bot_version') == 0) {
            return buildVersionSunburstData(pieData, 'bot')
        }
        return []
    }

    function buildOsVersionSunburstData(pieData: Array<{ name: string, value: number }>) {
        const tree: Record<string, Record<string, number>> = {}
        const appleSystems = new Set(['macOS', 'iPadOS', 'iOS'])

        for (const item of pieData) {
            const parsed = parseOsVersionNode(item.name)
            const rawSystemName = parsed.systemName
            const systemName = appleSystems.has(rawSystemName) ? `apple/${rawSystemName}` : rawSystemName
            const version = parsed.version

            if (!tree[systemName]) {
                tree[systemName] = {}
            }
            tree[systemName][version] = (tree[systemName][version] || 0) + item.value
        }

        const result: Array<{ name: string, children: any[] }> = []
        const appleChildren: Array<{ name: string, children: any[] }> = []

        for (const systemName of Object.keys(tree)) {
            const children = Object.keys(tree[systemName]).map(version => ({
                name: version,
                value: tree[systemName][version]
            }))
            children.sort((a, b) => b.value - a.value)

            if (systemName.startsWith('apple/')) {
                appleChildren.push({
                    name: systemName.replace('apple/', ''),
                    children
                })
            } else {
                result.push({
                    name: systemName,
                    children
                })
            }
        }

        if (appleChildren.length > 0) {
            appleChildren.sort((a, b) => {
                const aValue = a.children.reduce((sum, child) => sum + child.value, 0)
                const bValue = b.children.reduce((sum, child) => sum + child.value, 0)
                return bValue - aValue
            })
            result.push({
                name: 'apple',
                children: appleChildren
            })
        }

        result.sort((a, b) => {
            const aValue = a.children.reduce((sum, child) => sum + child.value, 0)
            const bValue = b.children.reduce((sum, child) => sum + child.value, 0)
            return bValue - aValue
        })
        return result
    }

    function buildVersionSunburstData(pieData: Array<{ name: string, value: number }>, type: 'app' | 'bot') {
        const tree: Record<string, Record<string, Record<string, number>>> = {}

        for (const item of pieData) {
            let parsed
            if (type === 'app') {
                parsed = parseAppVersionNode(item.name)
            } else {
                parsed = parseBotVersionNode(item.name)
            }

            const branch = parsed.branch
            const majorMinor = parsed.majorMinor
            const detail = parsed.detail

            if (!tree[branch]) {
                tree[branch] = {}
            }
            if (!tree[branch][majorMinor]) {
                tree[branch][majorMinor] = {}
            }
            tree[branch][majorMinor][detail] = (tree[branch][majorMinor][detail] || 0) + item.value
        }

        const result = Object.keys(tree).map(branch => ({
            name: branch,
            children: Object.keys(tree[branch]).map(majorMinor => ({
                name: majorMinor,
                children: Object.keys(tree[branch][majorMinor]).map(detail => ({
                    name: detail,
                    value: tree[branch][majorMinor][detail]
                })).sort((a, b) => b.value - a.value)
            }))
        }))

        result.sort((a, b) => {
            const sumNode = (node: any): number => {
                if (node.value) return node.value
                if (!node.children) return 0
                return node.children.reduce((sum: number, child: any) => sum + sumNode(child), 0)
            }
            return sumNode(b) - sumNode(a)
        })

        return result
    }

    function parseOsVersionNode(rawName: string) {
        const raw = (rawName || '').trim()
        if (!raw) {
            return {
                systemName: $t('未知'),
                version: $t('未知')
            }
        }

        if (raw.includes('(Web)')) {
            return {
                systemName: 'Web',
                version: 'Web'
            }
        }

        const parts = raw.split(/\s+/)
        if (parts.length >= 2) {
            return {
                systemName: parts[0],
                version: parts[1]
            }
        }

        return {
            systemName: raw,
            version: $t('未知')
        }
    }

    function parseAppVersionNode(rawName: string) {
        const raw = (rawName || '').trim()
        const segs = raw.split(',').map(seg => seg.trim()).filter(Boolean)
        const versionRaw = segs[1] || ''
        const versionLower = versionRaw.toLowerCase()
        const branchRaw = segs[0] || $t('未知')
        const branch = versionLower.includes('pre') ? 'pre' : branchRaw
        const versionInfo = extractVersionGroups(versionRaw)
        return {
            branch,
            majorMinor: versionInfo.majorMinor,
            detail: versionInfo.detail
        }
    }

    function parseBotVersionNode(rawName: string) {
        const raw = (rawName || '').trim()
        const segs = raw.split(',').map(seg => seg.trim()).filter(Boolean)
        const branch = segs[0] || $t('未知')
        const versionRaw = segs[1] || segs[0] || ''
        const versionInfo = extractVersionGroups(versionRaw)
        return {
            branch,
            majorMinor: versionInfo.majorMinor,
            detail: versionInfo.detail
        }
    }

    function extractVersionGroups(rawVersion: string) {
        const cleaned = (rawVersion || '').replace(/^v/i, '')
        const matched = cleaned.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?(.+)?/) || []

        if (!matched[1]) {
            const unknown = $t('未知')
            return {
                majorMinor: unknown,
                detail: unknown
            }
        }

        const major = matched[1]
        const minorNum = matched[2] || '0'
        const patchNum = matched[3] || '0'
        const suffix = (matched[4] || '').trim()
        const detail = `${patchNum}${suffix}`

        return {
            majorMinor: `${major}.${minorNum}`,
            detail
        }
    }

    /**
     * 处理系统架构数据
     */
    function processOsArch(pieData: Array<{ name: string, value: number }>) {
        return mergeAndSort(pieData.map(item => {
            let name = item.name
            if (name === 'x86_64') {
                name = 'x64'
            } else if (name === 'arm64') {
                name = 'aarch64'
            }
            return { value: item.value, name }
        }))
    }

    /**
     * 处理触发按钮数据
     */
    function processClickStatistics(pieData: Array<{ name: string, value: number }>) {
        return mergeAndSort(pieData.map(item => {
            let name = item.name
            if (buttonTypes[name]) {
                name = $t(buttonTypes[name])
            }
            return { value: item.value, name }
        }))
    }

    function getRealTimeRange() {
        const now = new Date()
        switch (Number(timeType.value)) {
            case 1: // 最近 24 小时
                return {
                    time: Date.now() - 86400000 + '-' + Date.now(),
                    precision: 'hour',
                    format: 'HH',
                    formatName: $t('小时')
                }
            case 2: { // 本周
                const day = now.getDay() || 7 // 周日为7
                const startOfWeek = new Date(now)
                startOfWeek.setHours(0, 0, 0, 0)
                startOfWeek.setDate(now.getDate() - day + 1) // 周一
                return {
                    time: startOfWeek.getTime() + '-' + now.getTime(),
                    precision: 'day',
                    format: 'MM-DD',
                    formatName: $t('天')
                }
            }
            case 3: { // 本月
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                return {
                    time: startOfMonth.getTime() + '-' + now.getTime(),
                    precision: 'day',
                    format: 'MM-DD',
                    formatName: $t('天')
                }
            }
            case 4: { // 本年
                const startOfYear = new Date(now.getFullYear(), 0, 1)
                return {
                    time: startOfYear.getTime() + '-' + now.getTime(),
                    precision: 'month',
                    format: 'YYYY-MM',
                    formatName: $t('月')
                }
            }
            case 5: { // 所有时间段
                return {
                    time: '0000000000000-' + now.getTime(),
                    precision: 'month',
                    format: 'YYYY-MM',
                    formatName: $t('月')
                }
            }
            default: // 默认最近 24 小时
                return {
                    time: Date.now() - 86400000 + '-' + Date.now(),
                    precision: 'hour',
                    format: 'HH'
                }
        }
    }

    function formatNumber(num: number) {
        // 将大于 1000 的数字格式化为 1.2k 形式
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M'
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k'
        } else {
            return num.toString()
        }
    }

    function formatDate(dateStr: string, format: string): string {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return ''

        const map: Record<string, string> = {
            'YYYY': date.getFullYear().toString(),
            'MM': (date.getMonth() + 1).toString().padStart(2, '0'),
            'DD': date.getDate().toString().padStart(2, '0'),
            'HH': date.getHours().toString().padStart(2, '0'),
            'mm': date.getMinutes().toString().padStart(2, '0'),
            'ss': date.getSeconds().toString().padStart(2, '0')
        }

        return format.replace(/YYYY|MM|DD|HH|mm|ss/g, matched => map[matched])
    }

    function hexToRgb(hex: string): string {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : ''
    }

    // ========== 生命周期 ==========

    onMounted(() => {
        updateData()
    })
</script>

<style scoped>
.umami-info-pan {
    margin:-41px -15px -15px -15px;
    padding: 0 !important;
    flex-direction: row;
    display: flex;
    height: calc(100% + 30px);
    background: var(--color-bg);
    border-radius: 7px;
    overflow: hidden;
    z-index: -1;
}
.umami-info-pan > div:last-child {
    flex: 1;
    display: flex;
}
.type-list {
    background: var(--color-card-2);
    flex-direction: column;
    padding: 10px;
    display: flex;
    z-index: 10;
}
.type-list > svg {
    transition: all 0.3s;
    cursor: pointer;
    color: var(--color-font);
    width: 15px;
    height: 15px;
    padding: 10px;
    border-radius: 7px;
    margin-bottom: 10px;
}
.type-list > svg:first-child {
    width: 13px;
    height: 13px;
    border: 2px solid var(--color-main);
}
.type-list > svg.select {
    background: var(--color-main);
    color: var(--color-font-r);
}
.type-list.load > svg.select {
    opacity: 0.5;
}

.detail-list {
    background: var(--color-card-1);
    flex-direction: column;
    display: flex;
    width: 30%;
}
.detail-list > p {
    color: var(--color-font);
    font-size: 1rem;
    font-weight: bold;
    display: block;
    margin: 1rem;
}
.detail-list > span {
    border-radius: 7px;
    padding: 10px;
    background: var(--color-card-2);
    margin: 0 1rem 1rem 1rem;
    font-size: 0.8rem;
    color: var(--color-font-1);
}

.only-valid-data {
    font-size: 0.8rem;
    display: flex;
    margin: 0 20px 20px 20px;
}
.only-valid-data > span {
    flex: 1;
}
.only-valid-data > label {
    --switch-height: 20px;
    min-width: 35px;
}
.only-valid-data > label > div {
    background: var(--color-card-2);
}

.time-select {
    margin: 1rem;
}
.time-select > div {
    position: relative
}
.time-select > div::after {
    content: "";
    position: absolute;
    pointer-events: none;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid var(--color-font-2);
}
.time-select select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background: var(--color-card-2);
    border: none;
    border-bottom: 1px solid var(--color-font-2);
    color: var(--color-font);
    font-size: 0.8rem;
    padding: 0 10px;
    border-radius: 7px;
    width: 100%;
    height: 30px;
}
.time-select select:disabled {
    background: var(--color-card-1);
    color: var(--color-font-2);
    cursor: not-allowed;
}
.overview-time-select {
    position: absolute;
    bottom: 17px;
    width: 25%;
    max-width: 200px;
    right: 80px;
}
.overview-time-select select {
    background: var(--color-card-1);
}
.overview-time-select select:disabled {
    background: var(--color-bg);
    color: var(--color-font-2);
    cursor: not-allowed;
}
.detail-list > .list {
    overflow-y: scroll;
    margin-right: 7px;
    flex: 1;
}

.detail-list > .list > div {
    transition: all 0.3s;
    justify-content: space-between;
    cursor: pointer;
    margin: 0 1rem 5px 1rem;
    flex-direction: row;
    border-radius: 7px;
    padding: 7px 10px;
    align-items: center;
    display: flex;
}
.detail-list > .list > div > span > span {
    display: block;
    font-size: 0.8rem;
    color: var(--color-font-2);
}
.detail-list > .list > div:hover {
    background: var(--color-card-2);
}
.detail-list > .list > div.select {
    background: var(--color-main);
    color: var(--color-font-r);
}
.detail-list > .list > div.select > span > span {
    color: var(--color-font-2-r);
}

.view-pan {
    background-image: url('../assets/img/stars.svg');
    background-size: 100%;

    justify-content: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    flex: 1;
}
.view-pan > svg {
    display: none;
}
.view-pan > span {
    display: block;
    width: fit-content;
    margin-bottom: 2rem;
    font-size: 0.75rem;
    background: var(--color-card-2);
    padding: 5px 15px 5px 25px;
    border-radius: 20px;
}
.view-pan > span::before {
    content: '';
    width: 0.75rem;
    height: 0.75rem;
    background: var(--color-green);
    position: absolute;
    border-radius: 100%;
    margin-top: 1px;
    margin-left: -17px;
}
.view-pan > a {
    display: block;
    width: 100%;
    color: var(--color-font);
    font-size: 1rem;
    font-weight: bold;
    margin: 0 1rem 1rem 1rem;
}

.pie-pan {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    flex-direction: column-reverse;
}
.pie-pan > x-vue-echarts {
    width: 80%;
    margin-top: -15%;
}
.pie-pan > a {
    top: 5mm;
    width: 80%;
    position: absolute;
    text-align: center;
    background: var(--color-card-1);
    padding: 10px;
    border-radius: 7px;
    font-size: 0.8rem;
    color: var(--color-font-2);
}

.status {
    margin-top: 1rem;
    padding-bottom: 1rem;
    width: calc(100% - 30px);
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    flex-wrap: wrap;
}
.status > div {
    flex-direction: column;
    align-items: center;
    display: flex;
    margin: 10px;
}
.status > div > a {
    font-weight: bold;
    font-size: 1.3rem;
}
.status > div > span {
    color: var(--color-font-2);
    font-size: 0.8rem;
}

.website-metric {
    border-top: 7px solid var(--color-main);
    margin-bottom: -20px;
    border-radius: 7px 7px 0 0;
    padding: 0;
    flex: 1;
    overflow-y: scroll;
    width: 100%;
}
.website-metric::-webkit-scrollbar {
    display: none;
}
.website-metric > div {
    justify-content: space-between;
    margin: 0 0 5px 0;
    flex-direction: row;
    border-bottom: 1px solid var(--color-border);
    padding: 7px 20px;
    display: flex;
}
.website-metric > div:nth-child(odd) {
    background: var(--color-card-1);
}
.website-metric > div:first-child {
    background: var(--color-card-2);
    font-weight: bold;
}
.website-metric > div > span {
    width: 60%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.website-metric > div > div {
    display: flex;
    align-items: center;
    margin: -7px 0;
}
.website-metric > div > div > a {
    font-weight: bold;
}
.website-metric > div > div > div {
    height: 100%;
    margin: -10px 0;
    border-left: 1px solid var(--color-font-2);
    padding-left: 10px;
    margin-left: 10px;
    width: 3rem;
    display: flex;
    align-items: center;
}
.website-metric > div > div > div span {
    font-size: 0.8rem;
    color: var(--color-font-2);
}

@media (max-width: 500px) {
    .umami-info-pan {
        flex-direction: column-reverse !important;
        margin: -46px -20px -20px -20px !important;
        height: calc(100% + 40px) !important;
    }
    .umami-info-pan > div:last-child {
        overflow-x: hidden;
    }
    .umami-info-pan > div:last-child > div:first-child {
        transition: margin-left 0.3s;
    }
    .umami-info-pan > div:last-child.select > div:first-child {
        margin-left: -100%;
    }

    .type-list {
        background: var(--color-card-1) !important;
        flex-direction: row !important;
        padding: 10px !important;
        justify-content: space-evenly;
    }
    .type-list > svg {
        margin: 0;
        padding: 13px;
        height: 20px;
        width: 20px;
    }
    .type-list > svg:first-child {
        display: none !important;
    }

    .view-pan > a,
    .detail-list > span {
        font-size: 1.3rem;
    }
    .detail-list {
        min-width: 100% !important;
        background: var(--color-bg) !important;
    }
    .time-select > div {
        height: 35px;
    }
    .time-select > div > select {
        height: 35px;
    }

    .view-pan {
        min-width: calc(100% - 40px) !important;
        margin-top: 1.5rem;
        justify-content: start;
    }
    .view-pan > svg {
        display: block !important;
        color: var(--color-font-r);
        background: var(--color-main);
        padding: 13px;
        border-radius: 7px;
        margin-top: 1.3rem;
    }

    .pie-pan {
        height: 70%;
    }

    .overview-time-select {
        bottom: 100px !important;
        right: 20px !important;
        width: 30% !important;
    }
}
</style>
