import { JSONContent } from './parser'
export default function useDFS(tempStartOffset: number, tempEndOffset: number, className: string = 'underline') {
    function refreshContentIndex(content: JSONContent[]) {
        content.forEach((item, index) => item.index = index)
    }

    let lock = true
    const dfs = (root: JSONContent) => {
        if (!root) return
        if (root.attributes?.class === 'select_start select_end') {
            if (root.parent.type !== 'span') {
                if (typeof root.content[0].content === 'string') {
                    const sentence = root.content[0].content
                    const prefix = sentence.slice(0, tempStartOffset)
                    const selected = sentence.slice(tempStartOffset, tempEndOffset)
                    const suffix = sentence.slice(tempEndOffset)
                    root.parent.content[root.index] = {
                        type: 'span',
                        attributes: { class: className },
                        content: [{
                            type: 'text',
                            content: selected,
                            parent: null as unknown as JSONContent,
                            index: 0
                        }],
                        parent: root.parent,
                        index: root.index
                    }
                    root.parent.content[root.index].content[0].parent = root.parent.content[0]
                    if (tempStartOffset) {
                        root.parent.content.splice(root.index, 0, {
                            type: 'text',
                            content: prefix,
                            parent: root.parent,
                            index: root.index
                        })
                    }
                    if (tempEndOffset < sentence.length) {
                        root.parent.content.splice(root.index + (tempStartOffset ? 2 : 1), 0, {
                            type: 'text',
                            content: suffix,
                            parent: root.parent,
                            index: root.index
                        })
                    }
                    refreshContentIndex(root.parent.content)
                } else {
                    root.attributes.class = className // todo 处理类名这里不能直接赋值
                }
            } else {
                if (root.parent.attributes?.class.includes(className)) {
                    root.content[0].parent = root.parent
                    root.parent.content[root.index] = root.content[0]
                } else {

                }
            }
            return
        }
        if (root.attributes?.class === 'select_start') {
            if (root.parent.type !== 'span') {
                if (typeof root.content[0].content === 'string') {
                    let text = root.content[0].content as unknown as string
                    let prefix = text.slice(0, tempStartOffset)
                    let suffix = text.slice(tempStartOffset)
                    root.parent.content[root.index] = {
                        type: 'text',
                        content: prefix,
                        parent: root.parent,
                        index: 0
                    }
                    if (!suffix) return
                    let suffixSpan: JSONContent = {
                        type: 'span',
                        attributes: { class: className },
                        content: [{
                            type: 'text',
                            content: suffix,
                            parent: null as unknown as JSONContent,
                            index: 0
                        }],
                        parent: root.parent,
                        index: 1,
                    }
                    suffixSpan.content[0].parent = suffixSpan
                    root.parent.content.splice(root.index + 1, 0, suffixSpan)
                    refreshContentIndex(root.parent.content)
                } else {
                    root.attributes.class = className // todo 处理类名这里不能直接赋值
                }
            } else {
                if (root.parent.attributes?.class.includes(className)) {
                    root.content[0].parent = root.parent
                    root.parent.content[root.index] = root.content[0]
                } else {

                }
            }
            lock = false
        }
        if ((root.type === 'text' || root.type === 'img' || root.attributes?.class?.includes('ql-formula')) && !lock) {
            if (root.parent.type !== 'span') {
                root.parent.content[root.index] = {
                    type: 'span',
                    attributes: { class: className },
                    index: root.index,
                    content: [root],
                    parent: root.parent
                }
            } else {
                root.parent.attributes!.class = className // todo 处理类名这里不能直接赋值
            }
        }
        if (root.attributes?.class === 'select_end') {
            if (root.parent.type !== 'span') {
                if (!root.content.length) {
                    // span.select_end 包裹了空内容
                    root.parent.content.shift()
                } else if (root.content[0].type === 'img') {
                    // span.select_end 包裹了图片
                    root.attributes.class = className // todo 处理类名这里不能直接赋值
                } else if (root.content[0].type === 'text') {
                    // span.select_end 包裹了文本
                    let prefix = root.content[0].content.slice(0, tempEndOffset)
                    let suffix = root.content[0].content.slice(tempEndOffset)
                    root.parent.content[root.index] = {
                        type: 'text',
                        content: suffix,
                        parent: root.parent,
                        index: root.index
                    }
                    // if (!prefix) return
                    let prefixSpan: JSONContent = {
                        type: 'span',
                        attributes: { class: className },
                        content: [{
                            type: 'text',
                            content: prefix,
                            parent: null as unknown as JSONContent,
                            index: 0
                        }],
                        parent: root.parent,
                        index: 0,
                    }
                    prefixSpan.content[0].parent = prefixSpan
                    root.parent.content.splice(root.index, 0, prefixSpan)
                    refreshContentIndex(root.parent.content)
                }
            } else {
                if (root.parent.attributes?.class.includes(className)) {
                    root.content[0].parent = root.parent
                    root.parent.content[root.index] = root.content[0]
                } else {

                }
            }
            lock = true
        }
        // JSONToHTML(tree).then(html => console.log(html))
        if (root.content.length && root.type !== 'text') {
            //  如果是公式的节点，不遍历其子节点
            if (root.attributes?.class?.includes('ql-formula')) return
            // fix: cannot use forEach here, because the length of root.content will change
            for (let i = 0, child: JSONContent; child = root.content[i++];) {
                dfs(child)
            }
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