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
import { initTree } from './useAst'

const props = defineProps<{
    modelValue: string
}>()
const emits = defineEmits<{
    (event: 'update:modelValue', value: string): void
}>()

// 用于出错重置
let initialValue = props.modelValue
function reset() {
    emits('update:modelValue', initialValue)
}

const richTextMarkerRef = ref<HTMLDivElement | null>(null)
const { handleSelectionChange, setRichText, recoverRange, rect, richText, range, updateStrByClassName, hasStatusByRange } = useRichTextMarker(richTextMarkerRef)

const handleMouseUp = async () => {
    console.log('mouseup')
    try {
        await handleSelectionChange()
        // 弹出工具栏
        await new Promise(resolve => setTimeout(resolve, 0)) // fix: 等待原生dom操作结束
        try {
            let config = [Config.m_underline, Config.m_note]
            let textTypeName = await Toolbar.show(markerContainerRef.value!, { style: getToolbarPosition(), config })
            console.log(textTypeName)
            switch (textTypeName) {
                case Config.m_underline:
                    await updateStrByClassName('m_underline')
                    break
                case Config.m_note:
                    await updateStrByClassName('m_note')
                    break
                case Config.d_underline:
                    await updateStrByClassName('d_underline')
                    break
            }
            // 等待工具栏操作
            emits('update:modelValue', richText.value)
            Toolbar.close()
        } catch (error) {
            console.log(error)
            console.log('取消')
            reset()
            Toolbar.close()
        }
    } catch (error: any) {
        console.log(error)
        // 微任务队列尾部执行reset（为了等待emit后各种的副作用）
        if (error.message?.includes('warning')) return
        Promise.resolve().then(() => { reset() })
    }
}

// 初始化hooks中的richText
setRichText(props.modelValue)
watch(() => props.modelValue, async (v) => {
    initialValue = v
    // // props.modelValue变化 --> 触发v-html --> dom重新渲染（异步） --> 丢失选区，所以要恢复之前的选区
    // await nextTick() // 这里等待dom更新后设置选区
    // try {
    //     // recoverRange()
    // } catch (error) {
    //     reset()
    // }
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