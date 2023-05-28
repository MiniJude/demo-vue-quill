<template>
    <div ref="markerContainerRef" class="rich_text_marker">
        <div ref="richTextMarkerRef" v-html="modelValue" @mouseup="handleMouseUp"></div>
    </div>
</template>
<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import useRichTextMarker from './useRichTextMarker.js'
import Toolbar, { TextType } from './Toolbar/index.ts'
import './Toolbar/index.less'

const props = defineProps<{
    modelValue: string
}>()
const emits = defineEmits<{
    (event: 'update:modelValue', value: string): void
}>()

// 用于出错重置
const initialValue = props.modelValue
function reset() {
    emits('update:modelValue', initialValue)
}

const richTextMarkerRef = ref<HTMLDivElement | null>(null)
const { handleSelectionChange, setRichText, recoverRange, rect, richText, range, updateStrByClassName } = useRichTextMarker(richTextMarkerRef)

const handleMouseUp = async () => {
    console.log('mouseup')
    try {
        await handleSelectionChange()
        // 标记后拿到最新的html字符串给父组件，后续让父组件更新modelValue，自己通过watch监听modelValue更新，执行后续操作（恢复选区）
        emits('update:modelValue', richTextMarkerRef.value!.innerHTML)
        // 弹出工具栏
        await new Promise(resolve => setTimeout(resolve, 0)) // fix: 等待原生dom操作结束
        try {
            let textTypeName = await Toolbar.show(markerContainerRef.value!, {
                style: getToolbarPosition(),
                config: [TextType.UNDERLINE, TextType.NOTE]
            })
            console.log(textTypeName)
            switch(textTypeName) {
                case TextType.UNDERLINE:
                    await updateStrByClassName('underline')
                    break
                case TextType.NOTE:
                    await updateStrByClassName('note')
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
    } catch (error) {
        console.log(error)
        // 微任务队列尾部执行reset（为了等待emit后各种的副作用）
        Promise.resolve().then(() => { reset() })
    }
}

// 初始化hooks中的richText
setRichText(props.modelValue)
watch(() => props.modelValue, async () => {
    // props.modelValue变化 --> 触发v-html --> dom重新渲染（异步） --> 丢失选区，所以要恢复之前的选区
    await nextTick() // 这里等待dom更新后设置选区
    try {
        // recoverRange()
    } catch (error) {
        reset()
    }
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

.underline {
    border-bottom: 2px solid blue;
}
</style>

<style lang="less" scoped>
.rich_text_marker {
    position: relative;
}
</style>