import { HTMLParser, JSONToHTML, JSONContent, DataSetString } from './parser'
import {
    hasAttrByNode,
    hasStatusByNode,
    addStatusByNode,
    addStatusByNodeLeftIndex,
    addStatusByNodeRightIndex,
    addStatusByNodeLeftAndRightIndex,
    deleteStatusByNode,
    deleteStatusByNodeLeftIndex,
    deleteStatusByNodeRightIndex,
    deleteStatusByNodeLeftAndRightIndex,
    uuid
} from './domUtils'
export default function useDFS(tempStartOffset: number, tempEndOffset: number, className: string = 'm_underline') {
    let targetClassName = ''
    if (className.startsWith('d_')) targetClassName = className.replace('d_', 'm_')

    function refreshContentIndex(content: JSONContent[]) {
        content.forEach((item, index) => item.index = index)
    }

    let lock = true
    // 添加状态
    const addStatus = (root: any) => {
        if (!root) return
        let index = root.index,
            type = root.type,
            spanWrapper = null
        if (hasAttrByNode(root, 'select_start', 'select_end')) {
            // 选区属于同一节点（都是文字、都是图片）
            let parent = root.parent
            if (parent.type !== 'span') {
                if (type === 'text') {
                    if (parent.attributes?.class?.includes(className)) return // 重复状态
                    const sentence = root.content
                    const prefix = sentence.slice(0, tempStartOffset)
                    const selected = sentence.slice(tempStartOffset, tempEndOffset)
                    const suffix = sentence.slice(tempEndOffset)
                    // 插入状态节点
                    spanWrapper = {
                        type: 'span',
                        attributes: { class: className },
                        content: [{
                            type: 'text',
                            content: selected,
                            parent: null as any,
                            index: 0
                        }],
                        parent,
                        index
                    }
                    spanWrapper.content[0].parent = spanWrapper
                    parent.content[index] = spanWrapper

                    if (tempStartOffset) {
                        parent.content.splice(index, 0, {
                            type: 'text',
                            content: prefix,
                            parent,
                            index
                        })
                    }
                    if (tempEndOffset < sentence.length) {
                        parent.content.splice(index + (tempStartOffset ? 2 : 1), 0, {
                            type: 'text',
                            content: suffix,
                            parent,
                            index
                        })
                    }
                } else if (type === 'img') {
                    spanWrapper = {
                        type: 'span',
                        attributes: { class: className },
                        index,
                        content: [root],
                        parent
                    }
                    root.parent = spanWrapper
                    parent.content[index] = spanWrapper
                } else {
                    throw new Error('unexpected case')
                }
            } else {
                // 如果有状态span节点

                if (parent.attributes?.class.includes(className)) {
                    // 如果该状态节点已有该状态，则不做处理
                } else {
                    // 否则添加新的状态
                    addStatusByNodeLeftAndRightIndex(parent, className, tempStartOffset, tempEndOffset)
                }
            }
            refreshContentIndex(parent.content)
            return
        }

        if (hasAttrByNode(root, 'select_start')) {
            let parent = root.parent
            if (parent.type !== 'span') {
                if (root.type === 'text') {
                    // 以文本节点为选区起点
                    let text = root.content
                    let prefix = text.slice(0, tempStartOffset)
                    let suffix = text.slice(tempStartOffset)
                    parent.content[index] = {
                        type: 'text',
                        content: prefix,
                        parent,
                        index
                    }
                    if (!suffix) return
                    spanWrapper = {
                        type: 'span',
                        attributes: { class: className },
                        content: [{
                            type: 'text',
                            content: suffix,
                            parent: null as any,
                            index: 0
                        }],
                        parent,
                        index: 1,
                    }
                    spanWrapper.content[0].parent = spanWrapper
                    parent.content.splice(index + 1, 0, spanWrapper)
                } else {
                    // 包裹图片
                    spanWrapper = {
                        type: 'span',
                        attributes: { class: className },
                        content: [root],
                        parent,
                        index: 1,
                    }
                    root.parent = spanWrapper
                    parent.content.splice(index, 1, spanWrapper)
                }
                refreshContentIndex(parent.content)
            } else {
                // 如果有状态span节点

                if (parent.attributes?.class.includes(className)) {
                    // 如果该状态节点已有该状态，则不做处理
                } else {
                    // 否则添加新的状态
                    addStatusByNodeLeftIndex(parent, className, tempStartOffset)
                }
            }
            lock = true
        } else if (hasAttrByNode(root, 'select_end')) {
            let parent = root.parent
            if (parent.type !== 'span') {
                if (root.type === 'text') {
                    // 以文本节点为选区终点
                    let text = root.content
                    let prefix = text.slice(0, tempEndOffset)
                    let suffix = text.slice(tempEndOffset)
                    parent.content[index] = {
                        type: 'text',
                        content: suffix,
                        parent,
                        index
                    }
                    if (!prefix) return
                    spanWrapper = {
                        type: 'span',
                        attributes: { class: className },
                        content: [{
                            type: 'text',
                            content: prefix,
                            parent: null as any,
                            index: 0
                        }],
                        parent,
                        index: 0,
                    }
                    spanWrapper.content[0].parent = spanWrapper
                    parent.content.splice(root.index, 0, spanWrapper)
                    refreshContentIndex(root.parent.content)
                } else if (root.type === 'img') {
                    // 包裹图片
                    spanWrapper = {
                        type: 'span',
                        attributes: { class: className },
                        content: [root],
                        parent,
                        index: 1,
                    }
                    root.parent = spanWrapper
                    parent.content.splice(index, 1, spanWrapper)
                }
            } else {
                // 如果有状态span节点

                if (parent.attributes?.class.includes(className)) {
                    // 如果该状态节点已有该状态，则不做处理
                } else {
                    // 否则添加新的状态
                    addStatusByNodeRightIndex(parent, className, tempEndOffset)
                }
            }
            lock = false
        } else if ((type === 'text' || type === 'img' || root.attributes?.class?.includes('ql-formula')) && !lock) {
            let parent = root.parent
            // 选区中间的节点（既不是开头也不是结尾）

            if (parent.type !== 'span') {
                spanWrapper = {
                    type: 'span',
                    attributes: { class: className },
                    content: [root],
                    parent,
                    index
                }
                root.parent = spanWrapper
                parent.content[root.index] = spanWrapper
            } else {
                // 叠加状态
                addStatusByNode(root.parent, className)
            }
        }
        if (root.content.length && root.type !== 'text') {
            if (root.attributes?.class?.includes('ql-formula')) return //  如果是公式的节点，不遍历其子节点
            if (hasStatusByNode(root)) return
            // 倒序遍历，规避子节点向当前节点插入了新的节点导致遍历异常
            for (let i = root.content.length - 1, child: JSONContent; child = root.content[i--];) {
                addStatus(child)
            }
        }
    }

    function deleteStatus(root: any) {
        console.log('deleteStatus')
        if (!root) return
        let type = root.type
        if (hasAttrByNode(root, 'select_start', 'select_end')) {
            // 选区属于同一节点（都是文字、都是图片）
            let parent = root.parent
            if (parent.type !== 'span') {
                // 如果父节点不是span节点，说明其没有任何状态
            } else {
                // 如果有状态span节点

                if (parent.attributes?.class.includes(targetClassName)) {
                    // 如果该状态节点已有该状态，则需要删除该状态
                    deleteStatusByNodeLeftAndRightIndex(parent, targetClassName, tempStartOffset, tempEndOffset)
                } else {
                }
            }
            refreshContentIndex(parent.content)
            return
        }

        if (hasAttrByNode(root, 'select_start')) {
            let parent = root.parent
            if (parent.type !== 'span') {
            } else {
                // 如果有状态span节点

                if (parent.attributes?.class.includes(targetClassName)) {
                    // 如果该状态节点已有该状态，则需要删除该状态
                    deleteStatusByNodeLeftIndex(parent, targetClassName, tempStartOffset)
                } else {
                }
            }
            lock = true
        } else if (hasAttrByNode(root, 'select_end')) {
            let parent = root.parent
            if (parent.type !== 'span') {
            } else {
                // 如果有状态span节点

                if (parent.attributes?.class.includes(targetClassName)) {
                    // 如果该状态节点已有该状态，则需要删除该状态
                    deleteStatusByNodeRightIndex(parent, targetClassName, tempEndOffset)
                } else {
                }
            }
            lock = false
        } else if ((type === 'text' || type === 'img' || root.attributes?.class?.includes('ql-formula')) && !lock) {
            let parent = root.parent
            // 选区中间的节点（既不是开头也不是结尾）

            if (parent.type !== 'span') {
            } else {
                if (parent.attributes?.class.includes(targetClassName)) {
                    deleteStatusByNode(root.parent, targetClassName)
                }
            }
        }
        if (root.content.length && root.type !== 'text') {
            if (root.attributes?.class?.includes('ql-formula')) return //  如果是公式的节点，不遍历其子节点
            // 倒序遍历，规避子节点向当前节点插入了新的节点导致遍历异常
            for (let i = root.content.length - 1, child: JSONContent; child = root.content[i--];) {
                deleteStatus(child)
            }
        }
    }
    return {
        addStatus,
        deleteStatus
    }
}

// 判断俩个类名字符串是否相等
function isSameClass(class1: string, class2: string) {
    try {
        let arr1 = class1.split(' ')
        let arr2 = class2.split(' ')
        if (arr1.length !== arr2.length) return false
        return arr1.every(item => arr2.includes(item)) && arr2.every(item => arr1.includes(item))
    } catch (error) {
        return false
    }
}

// 双指针合并同一层节点（span）的状态类名
export function mergeAttributes(nodes: JSONContent[]) {
    let l = 0, r = 1
    if (nodes.length < 2) return
    while (r < nodes.length) {
        let isBothSpan = nodes[l].type === 'span' && nodes[r].type === 'span'
        if (isSameClass(nodes[l].attributes?.class, nodes[r].attributes?.class) && isBothSpan) {
            nodes[l].content.push(...nodes[r].content)
            nodes.splice(r, 1)
        } else {
            l = r
            r++
        }
    }
}

// 广度优先遍历（合并同一层节点的状态）
export function bfs(root: JSONContent) {
    if (!root || !root.content?.length) return
    const queue: JSONContent[] = [root]
    while (queue.length) {
        const node = queue.shift()!
        if (node.type === 'text' || node.attributes?.class?.includes('ql-formula')) {
            continue
        } else if (node.content?.length) {
            // 合并
            mergeAttributes(node.content)
            queue.push(...node.content)
        }
    }
}

// 用data-m-xxxb标记每个节点
export async function initTree(str: string): Promise<string> {
    let tree = await HTMLParser(str)
    // 初始化树：深度优先遍历给每个节点加上自定义属性，后续用来记录选区起始点
    function markRoot(root: JSONContent) {
        if (!root || !root.content?.length) return
        // 加上data-m-xxx属性
        if (!root.attributes) root.attributes = {}
        let hasInit = Object.keys(root.attributes).some(key => key.startsWith('data-m-'))
        if (!hasInit) root.attributes[('data-m-' + uuid()) as DataSetString] = ''
        if (root.content.length) {
            // 如果是公式的节点，不遍历其子节点
            if (root.attributes?.class?.includes('ql-formula')) return
            for (let i = 0, child: JSONContent; child = root.content[i++];) {
                markRoot(child)
            }
        }
    }
    markRoot(tree)
    let ans = await JSONToHTML(tree) as string
    return ans
}
