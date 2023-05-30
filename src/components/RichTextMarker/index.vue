<template>
    <div ref="markerContainerRef" class="rich_text_marker">
        <div ref="richTextMarkerRef" v-html="modelValue" @mouseup="handleMouseUp"></div>
    </div>
</template>
<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import useRichTextMarker from './useRichTextMarker.js'
import Toolbar, { Config } from './Toolbar/index.ts'
import './Toolbar/index.less'
import { clearCustomAttributes } from './domUtils.js'

const props = defineProps<{
    modelValue: string
}>()
const emits = defineEmits<{
    (event: 'update:modelValue', value: string): void
    (event: 'choose', value: Config, callback?: (...arys: any[]) => void): void
}>()

// 用于出错重置
let initialValue = props.modelValue
function reset() {
    console.log('reset')
    emits('update:modelValue', initialValue)
}

const richTextMarkerRef = ref<HTMLDivElement | null>(null)
const { handleSelectionChange, setRichText, rect, richText, updateStrByClassName, hasStatus } = useRichTextMarker(richTextMarkerRef)

const handleMouseUp = async () => {
    console.log('mouseup')
    try {
        await handleSelectionChange()
        // 弹出工具栏
        await new Promise(resolve => setTimeout(resolve, 0)) // fix: 等待原生dom操作结束
        try {
            let config = [Config.m_underline, Config.m_note]

            let hasUnderline = await hasStatus('m_underline')
            console.log('hasUnderline:', hasUnderline)
            if (hasUnderline) {
                // 如果值为true说明选区内有划线， 添加删除划线的选项
                config.splice(1, 0, Config.d_underline)
            }
            let textTypeName = await Toolbar.show(markerContainerRef.value!, { style: getToolbarPosition(), config })

            const map = Object.keys(Config)
            console.log(map, Config)
            emits('choose', textTypeName, updateStrByClassName)
            console.log(textTypeName)
            switch (textTypeName) {
                case Config.m_underline:
                    await updateStrByClassName('m_underline')
                    break
                case Config.m_note:
                    // await updateStrByClassName('m_note')
                    break
                case Config.d_underline:
                    await updateStrByClassName('d_underline')
                    break
            }
            // 等待工具栏操作
            setTimeout(() => {
                emits('update:modelValue', richText.value)
                Toolbar.close()
            }, 1000);
        } catch (error) {
            console.log(error)
            console.log('取消')
            clearCustomAttributes(markerContainerRef.value!)
            Toolbar.close()
        }
    } catch (error: any) {
        console.log(error)
        // 微任务队列尾部执行reset（为了等待emit后各种的副作用）
        if (error.message?.includes('warning')) return clearCustomAttributes(markerContainerRef.value!)
        Promise.resolve().then(() => { reset() })
    }
}

// 初始化hooks中的richText
setRichText(props.modelValue)
watch(() => props.modelValue, async (v) => {
    initialValue = v
    console.log('传入新值：', v)
}, { immediate: true })


// 计算工具条样式
const markerContainerRef = ref<HTMLElement>()
function getToolbarPosition() {
    try {
        // 获取markerContainerRef的getBoundingClientRect
        const { x: x1, y: y1 } = markerContainerRef.value!.getBoundingClientRect()
        const { x: x2, y: y2, width: width2 } = rect.value!
        return {
            left: (x2 - x1 + (width2 - 70) / 2) + 'px',
            top: (y2 - y1 - 40) + 'px'
        }
    } catch (error) {
        return {
            left: '0px',
            top: '0px'
        }
    }
}


</script>
<style lang="less">
img {
    width: 20px;
    height: 20px;
}

.m_underline {
    border-bottom: 2px solid blue;
    cursor: pointer;
}

.m_note {
    background-color: red;
}
</style>

<style lang="less" scoped>
.rich_text_marker {
    position: relative;
}
</style>