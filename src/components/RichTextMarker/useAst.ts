import { HTMLParser, JSONToHTML, JSONContent, DataSetString } from './parser'
import { hasAttrByNode, hasStatusByNode, addStatusByNode, addStatusByNodeLeftIndex, addStatusByNodeRightIndex, addStatusByNodeLeftAndRightIndex } from './domUtils'
export default function useDFS(tempStartOffset: number, tempEndOffset: number, className: string = 'underline') {
    function refreshContentIndex(content: JSONContent[]) {
        content.forEach((item, index) => item.index = index)
    }

    let lock = true
    const dfs = (root: any) => {
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
        // JSONToHTML(tree).then(html => console.log(html))
        if (root.content.length && root.type !== 'text') {
            if (root.attributes?.class?.includes('ql-formula')) return //  如果是公式的节点，不遍历其子节点
            if (hasStatusByNode(root)) return
            // fix: cannot use forEach here, because the length of root.content will change
            for (let i = root.content.length - 1, child: JSONContent; child = root.content[i--];) {
                dfs(child)
            }
            // 给一个p标签尾部新增一个span状态标签，当退出p的text后回来p，这时p已经多了一个节点，导致for循环继续往下走，所以这里尝试用forEach
            // root.content.forEach(dfs)
        }
    }
    return {
        dfs
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
function mergeAttributes(nodes: JSONContent[]) {
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

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
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
