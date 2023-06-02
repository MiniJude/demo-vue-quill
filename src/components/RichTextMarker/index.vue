<template>
    <div ref="markerContainerRef" class="rich_text_marker">
        <div ref="richTextMarkerRef" v-html="modelValue" @mousedown="handleMouseDown" @mouseup="handleMouseUp"
            @click="handleClick"></div>
    </div>
</template>
<script lang="ts" setup>
import { nextTick, ref } from 'vue'
import useRichTextMarker from './useRichTextMarker.ts'
import Toolbar, { Config } from './Toolbar/index.ts'
import './Toolbar/index.less'
import { uuid, getCommentIdsByNode, getHtmlStrByNeedRemovedKey, clearCustomAttributes } from './domUtils.ts'
import useRecords from './useRecords.ts'

const props = defineProps<{
    modelValue: string
}>()
const emits = defineEmits<{
    (event: 'update:modelValue', value: string): void
    (event: 'commentChange', value: Comment[]): void
    (event: 'takeComment', value: Comment): void
}>()


const { addRecord, undo } = useRecords()

addRecord(props.modelValue)

const richTextMarkerRef = ref<HTMLDivElement | null>(null)
const { handleSelectionChange, setRichText, rect, richText, updateStrByClassName, hasStatus } = useRichTextMarker(richTextMarkerRef)

// 计时
let mousedownTimestamp = 0
const TIME_DIVIDE = 200 // 500ms内的点击事件认为是点击事件，不触发mouseup事件
function handleMouseDown() {
    console.log('mousedown');
    mousedownTimestamp = Date.now()
}

const handleMouseUp = async () => {
    if (Date.now() - mousedownTimestamp < TIME_DIVIDE) return // 如果时间很短认为是点击事件，直接返回
    console.log('mouseup')
    if (commentForm.value.length) return // 如果有批注正在编辑则不触发
    try {
        await handleSelectionChange()
        // 弹出工具栏
        await new Promise(resolve => setTimeout(resolve, 0)) // fix: 等待原生dom操作结束
        try {
            let config = [Config.m_underline, Config.m_comment]

            let hasUnderline = await hasStatus('m_underline')
            if (hasUnderline) {
                // 如果值为true说明选区内有划线， 添加删除划线的选项
                config.splice(1, 0, Config.d_underline)
            }
            let textTypeName = await Toolbar.show(markerContainerRef.value!, { style: getToolbarPosition(), config })
            console.log(textTypeName)
            switch (textTypeName) {
                case Config.m_underline:
                    await updateStrByClassName('m_underline')
                    break
                case Config.m_comment:
                    // 生成唯一comment-id-xxx,
                    let key = 'm_comment-id-' + uuid()
                    await updateStrByClassName(key)
                    await nextTick()
                    emits('takeComment', { key, value: '' })
                    break
                case Config.d_underline:
                    await updateStrByClassName('d_underline')
                    break
            }
            // 等待工具栏操作
            emits('update:modelValue', richText.value)
            addRecord(richText.value)
            Toolbar.close()
        } catch (error) {
            console.log('取消：', error)
            // 如果取消，纯操作dom来清空自定义标记属性
            clearCustomAttributes(richTextMarkerRef.value)
            Toolbar.close()
        }
    } catch (error: any) {
        console.log(error)
        // 无效选区，则清空自定义属性
        if (error.message?.includes('warning')) return
        // 微任务队列尾部执行undo（为了等待emit后各种的副作用）
        Promise.resolve().then(() => {
            emits('update:modelValue', undo())
        })
    }
}

// 初始化hooks中的richText
setRichText(props.modelValue)

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

// 所有的批注数组
type Comment = {
    key: string
    value: string
}
const allComments = ref<Comment[]>([])

// 批注输入框
const commentForm = ref<{ key: string; value: string }[]>([]) // 批注表单
async function submitComment(index: number) {
    let currentComment = commentForm.value[index]
    let comment = allComments.value.find(c => c.key === currentComment.key)
    if (comment) {
        if (!currentComment.value) {
            // 删除
            let newStr = await getHtmlStrByNeedRemovedKey(richTextMarkerRef.value!, comment.key)
            addRecord(newStr) // 新增一条操作记录
            emits('update:modelValue', newStr)
            let index = allComments.value.indexOf(comment)
            allComments.value.splice(index, 1)
            emits('commentChange', JSON.parse(JSON.stringify(allComments.value)))
        } else {
            // 修改
            emits('commentChange', JSON.parse(JSON.stringify(allComments.value)))
            if (comment) comment.value = currentComment.value
        }
    } else {
        if (!currentComment.value) {
            // 撤销新增
            emits('update:modelValue', undo())
        } else {
            // 新增
            allComments.value.push(currentComment)
            emits('commentChange', JSON.parse(JSON.stringify(allComments.value)))
        }
    }
    commentForm.value.splice(index, 1)
}


// 点击展示评论
function handleClick(e: Event) {
    if (Date.now() - mousedownTimestamp >= TIME_DIVIDE) return
    console.log('click', e)
    // 获取当前点击节点最近的父节点的commentids
    let ans = getCommentIdsByNode(e.target as HTMLElement)
    console.log(ans)
    if (!ans.length) return
    commentForm.value = allComments.value.filter(item => ans.includes(item.key))
}

defineExpose({
    getHtmlStrByNeedRemovedKey
})


</script>
<style lang="less">
img {
    width: 20px;
    height: 20px;
}

.m_underline {
    border-bottom: 2px solid blue;
}

[class*="m_comment-id-"] {
    background-color: red;
    cursor: pointer;
}
</style>

<style lang="less" scoped>
.rich_text_marker {
    position: relative;
}


.textareaWrapper {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
}
</style>