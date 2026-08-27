<!--
 * @FileDescription: 卡片消息消息组件
 * @Author: Mr.Lee
 * @Date: 2026/02/13
 * @Version: 1.0 - 从CardMsgComp拆分出来
-->

<template>
    <div
        ref="main"
        @click="cardClick()"
        v-html="buildXML(item, id, id)" />
</template>

<script setup lang="ts">
import { Logger } from '@renderer/function/base';
import { openLink } from '@renderer/function/utils/appUtil'
import app from '@renderer/main'
import { useTemplateRef } from 'vue'

const { item, id } = defineProps<{
    item: string,
    id: string,
}>()

const mainDom = useTemplateRef('main')

let link: string | undefined = undefined

/**
 * 尝试解析渲染 XML 消息
 * @param xml 原始的 XML 消息内容
 * @param id  XML 消息 ID（暂时不知道有什么用）
 * @param msgid 消息 ID
 * @returns 处理完成的 HTML 代码
 */
function buildXML(xml: string, id: string, msgid: string) {
    const $t = app.config.globalProperties.$t
    try {
        // <msg> 标签内的为本体
        let item = xml.substring(xml.indexOf('<item'), xml.indexOf('</msg>'))
        // 尝试转换标签为 html
        // item = item.replaceAll('/>', '>')
        item = item.replaceAll('item', 'div') // item
        item = item.replaceAll('<div', '<div class="msg-xml"')
        item = item.replaceAll('title', 'p') // title
        item = item.replaceAll('summary', 'a') // summary
        item = item.replaceAll('<a', '<a class="msg-xml-summary"')
        item = item.replaceAll('<picture', '<img class="msg-xml-img"') // picture
        // 将不正确的参数改为 dataset
        item = item.replaceAll('size=', 'data-size=')
        item = item.replaceAll('linespace=', 'data-linespace=')
        item = item.replaceAll('cover=', 'src=')
        // 处理出处标签
        item = item.replace('source name=', 'source data-name=')
        // 处理错误的 style 位置
        const div = document.createElement('div')
        div.id = 'xml-' + msgid
        div.dataset.id = id
        div.innerHTML = item
        for (const element of div.children[0].children) {
            if (element.nodeName === 'P') {
                const pBody = element as HTMLParagraphElement
                pBody.style.fontSize =
                    (Number(pBody.dataset.size) / 30).toString() + 'rem'
                pBody.style.marginBottom = Number(pBody.dataset.size) / 5 + 'px'
                break
            }
        }
        // 解析 msg 消息体
        let msgHeader =
            xml.substring(xml.indexOf('<msg'), xml.indexOf('<item')) + '</msg>'
        msgHeader = msgHeader.replace('msg', 'div')
        msgHeader = msgHeader.replace('m_resid=', 'data-resid=')
        msgHeader = msgHeader.replace('url=', 'data-url=')
        const header = document.createElement('div')
        header.innerHTML = msgHeader
        // 处理特殊的出处
        let sourceBody = undefined as HTMLElement | undefined
        for (const element of div.children) {
            if (element.nodeName === 'SOURCE') {
                sourceBody = element as HTMLElement
            }
        }
        if (sourceBody !== undefined) {
            const source = sourceBody.dataset.name
            if (source === '群投票')
                return (
                    '<a class="msg-unknow">（' +
                    $t('chat_xml_unsupport') +
                    '：' +
                    source +
                    '）</a>'
                )
        }
        // 附带链接的 xml 消息处理
        if ((header.children[0] as HTMLElement).dataset.url !== undefined) {
            link = (header.children[0] as HTMLElement).dataset.url
            div.style.cursor = 'pointer'
        }
        return div.outerHTML
    } catch (ex) {
        new Logger().error(ex as Error, 'xml 消息解析错误')
        return (
            '<span v-else class="msg-unknown">( ' +
            $t('解析消息错误') +
            ': xml )</span>'
        )
    }
}

/**
 * xml 消息的点击事件
 */
function cardClick() {
    const sender = mainDom.value

    if (!sender) return

    // 如果存在 url 项，优先打开 url
    if (link !== undefined && link !== 'undefined' && link !== '') {
        const openType =
            sender.dataset.urlOpenType || sender.dataset.urlopentype
        if (openType == '_self') {
            window.open(link, '_self')
        } else {
            // 默认都以 _blank 打开
            openLink(link)
        }
    }
}
</script>
