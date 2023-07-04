<template>
  <div ref="markerContainerRef" class="rich_text_marker">
    <div ref="richTextMarkerRef" v-html="modelValue" @mousedown="handleMouseDown" @mouseup="handleMouseUp"
      v-bind="$attrs"></div>
    <img class="clear" title="清空划线和批注" src="./img/重置.png" @click="handleClear" alt="">
  </div>
</template>
<script lang="ts" setup>
import { nextTick, ref } from 'vue'
import useRichTextMarker from './useRichTextMarker.ts'
import Toolbar, { Config } from './Toolbar/index.ts'
import './Toolbar/index.less'
import { uuid, clearCustomAttributes } from './domUtils.ts'
import useRecords from './useRecords.ts'


// 所有的批注数组
type Comment = {
  key: string
  value: string
  title: string
}

const props = defineProps<{
  modelValue: string
}>()
const emits = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'commentChange', value: Comment[]): void
  (event: 'takeComment', value: Comment): void
  (event: 'clear'): void
}>()

const { addRecord, undo, records, init } = useRecords()

addRecord(props.modelValue)



const richTextMarkerRef = ref<HTMLDivElement | null>(null)
const { handleSelectionChange, setRichText, rect, richText, updateStrByClassName, hasStatus } =
  useRichTextMarker(richTextMarkerRef)

// 计时
let mousedownTimestamp = 0
const TIME_DIVIDE = 200 // 500ms内的点击事件认为是点击事件，不触发mouseup事件
function handleMouseDown() {
  console.log('mousedown')
  mousedownTimestamp = Date.now()
}

const handleMouseUp = async () => {
  if (Date.now() - mousedownTimestamp < TIME_DIVIDE) return // 如果时间很短认为是点击事件，直接返回
  console.log('mouseup')
  try {
    await handleSelectionChange()
    // 弹出工具栏
    await new Promise((resolve) => setTimeout(resolve, 0)) // fix: 等待原生dom操作结束
    try {
      let config = [Config.m_underline, Config.m_comment]

      let hasUnderline = await hasStatus('m_underline')
      if (hasUnderline) {
        // 如果值为true说明选区内有划线， 添加删除划线的选项
        config.splice(1, 0, Config.d_underline)
      }
      let textTypeName = await Toolbar.show(markerContainerRef.value!, {
        style: getToolbarPosition(),
        config
      })
      console.log(textTypeName)
      let key
      switch (textTypeName) {
        case Config.m_underline:
          await updateStrByClassName('m_underline')
          break
        case Config.m_comment:
          // 生成唯一comment-id-xxx,
          key = 'm_comment-id-' + uuid()
          await updateStrByClassName(key)
          break
        case Config.d_underline:
          await updateStrByClassName('d_underline')
          break
      }
      // 等待工具栏操作
      emits('update:modelValue', richText.value)
      await nextTick()
      // key存在 及批注情况下暴露出批注的title
      if (key) {
        const titleElemArr = richTextMarkerRef.value?.querySelectorAll(`.${key}`)
        const title = Array.from(titleElemArr!).reduce(
          (prev, current) => prev + current.innerHTML,
          ''
        )
        emits('takeComment', { key, value: '', title: title || '' })
      }

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
      left: x2 - x1 + (width2 - 70) / 2 + 'px',
      top: y2 - y1 - 50 + 'px'
    }
  } catch (error) {
    return {
      left: '0px',
      top: '0px'
    }
  }
}

function handleClear() {
  emits('update:modelValue', init())
  emits('clear')
}
</script>
<style lang="less">
.m_underline {
  border-bottom: 2px solid blue;
}

[class*='m_comment-id-'] {
  background-color: #ccd7fa;
  cursor: pointer;
}
</style>

<style lang="less" scoped>
.rich_text_marker {
  position: relative;
  display: inline-block;
  vertical-align: text-top;
  padding-right: 50px;

  p {
    margin-bottom: 6px;
  }

  &:hover .clear {
    opacity: 1;
  }

  .clear {
    position: absolute;
    top: 2px;
    right: 10px;
    cursor: pointer;
    opacity: 0;
    transition: all ease .3s;
  }
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
