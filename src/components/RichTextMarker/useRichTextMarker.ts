import { computed, nextTick, ref, Ref } from 'vue'
import { type JSONContent, HTMLParser, JSONToHTML } from './parser'
import useDFS, { bfs } from './useAst'
import { createNodeByStr, getAttrIdByNode, setAttrByNode } from './domUtils'
export default function useRichTextMarker(container: Ref<Element | null>) {

    const selection = ref<Selection | null>()
    const text = computed(() => selection.value?.toString() ?? '')
    const range = computed(() => selection.value?.getRangeAt(0) ?? null) // Selection API规范要求选择的内容始终（仅）具有一个范围，所以这里不考虑多个区域
    const rect = computed(() => selection.value?.getRangeAt(0).getBoundingClientRect() ?? null)

    let tempStartOffset = 0, tempEndOffset = 0

    let richText = ref('')
    async function setRichText(str: string) {
        console.log('setRichText')
        richText.value = str
    }

    function recoverRange() {
        console.log('recoverRange')
        // 重新设置选区（dom的更改之后，可能会造成选区会丢失或者偏移，在此先移除所有range，再加入一个正确的选区）
        // fix: 因为是全新的dom，所以不能拿之前的span节点来设置选区，否则会报domcument内没有：addRange(): The given range isn't in document.
        let newRange = document.createRange()
        let startSpan = container.value?.querySelector('.select_start'),
            endSpan = container.value?.querySelector('.select_end')
        if (!startSpan || !endSpan) return
        newRange.setStart(startSpan.firstChild!, tempStartOffset)
        newRange.setEnd(endSpan.firstChild!, tempEndOffset)
        selection.value = window.getSelection()
        selection.value?.removeAllRanges()
        selection.value!.addRange(newRange)
        // rect.value = selection.value?.getRangeAt(0)!.getBoundingClientRect() ?? null
        nextTick(() => {
            tempStartOffset = 0
            tempEndOffset = 0
        })
    }

    // 选区变化处理函数
    async function handleSelectionChange() {
        if (!container.value) throw new Error('warning: container is null')
        selection.value = null // fix: 保证selection.value变化
        selection.value = window.getSelection()
        const isValid = await correctSelection()
        if (!isValid) throw new Error('warning: selection is invalid') // TODO：这里要清空用于标记选区的自定义属性
        // 在dom上标记选区
        tagDomRange()
    }

    // 校验选区合法性（判断选中内容是否全部属于某个组件节点，如果不是则清空选中内容）
    async function correctSelection() {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (!range.value || range.value?.collapsed) {
                    resolve(false)
                    return
                }
                const { startContainer, endContainer } = range.value
                let flag = container.value!.contains(startContainer) && container.value!.contains(endContainer)
                if (!flag) {
                    selection.value = null
                    resolve(false)
                    return
                }
                resolve(true)
                return
            }, 100);
        })
    }

    // 标记选区的dom范围（根据起止节点操作tree，给首尾节点加上自定义属性m-select_start 和 m-select_end的span包裹），如果是节点是公式或者图片也同样要包裹一层span方便后续合并
    // 关于startContainer和endContainer的说明：
    // 如果边界是img，那么边界对应的startContainer或endContainer将不是text节点，而是img所在的节点，可能是p或strong等等
    // 如果尾边界是新启一行的开头，则endContainer不是text节点，而是p节点
    // 如果尾边界在公式内，则很可能不是文本节点；此时要判断公式节点是否包含endContainer
    // 其他情况下，startContainer和endContainer都是text节点
    function tagDomRange() {
        if (!range.value) return
        const { collapsed, startContainer, endContainer, startOffset, endOffset } = range.value ?? {}
        if (collapsed || !startContainer || !endContainer) return
        // 保存startOffset, endOffset，因为后面会对选区进行操作，导致这两个值置0
        tempStartOffset = startOffset
        tempEndOffset = endOffset
        let isSameContainer = (startContainer === endContainer);
        // 判断左边界
        if (startContainer.nodeName === '#text') {
            setAttrByNode(startContainer, 'select_start')
        } else {
            // 认为左边界在img左侧
            setAttrByNode(startContainer.childNodes[startOffset] as HTMLElement, 'select_start')
            // 如果右边界在这个img右侧， 注意：是同一个img
            if (endContainer.nodeName !== '#text' && isSameContainer && ((endOffset - startOffset) === 1)) {
                setAttrByNode(endContainer.childNodes[startOffset] as HTMLElement, 'select_end')
                richText.value = container.value!.innerHTML
                return
            }
        }
        // 判断右边界
        if (endContainer.nodeName === '#text') {
            setAttrByNode(endContainer, 'select_end')
        } else {
            if (endOffset) {
                // 右边界在img右侧
                setAttrByNode(endContainer.childNodes[endOffset - 1] as HTMLElement, 'select_end')
            } else {
                setAttrByNode(endContainer as HTMLElement, 'select_end')
            }
        }
    }

    // 更新选区的文本内容给样式（根据选区的起止节点和类名，更新选区的文本内容）
    // 定义规则：
    // 1. 状态文字全用span包裹
    // 2. span.m-select_start和span.m-select_end 内只能包含文本节点？
    async function updateStrByClassName(className: string = 'underline') {
        if (!range.value || !container.value) return
        let tree = await HTMLParser(container.value)
        const { dfs } = useDFS(tempStartOffset, tempEndOffset, className)
        dfs(tree)
        bfs(tree)
        let str = await JSONToHTML(tree) as string
        // 去掉父节点
        let l = str.indexOf('>') + 1
        let r = str.lastIndexOf('<')
        richText.value = str.slice(l, r)
        return richText.value
    }

    // 判单选区内是否有某一类名的节点
    function hasStatusByRange(className: string) {
        if (!range.value) return false
        // 获取范围内的所有节点
        var nodes = range.value.cloneContents().querySelectorAll('*');
        // 遍历节点，判断是否有 class 包含 m_underline 的节点
        for (var i = 0, node; node = nodes[i++];) {
            if (node.closest('.' + className)) {
                return true
            }
        }
        return false
    }


    return {
        length,
        text,
        rect,
        range,
        handleSelectionChange,
        richText,
        setRichText,
        recoverRange,
        updateStrByClassName,
        hasStatusByRange
    }
}