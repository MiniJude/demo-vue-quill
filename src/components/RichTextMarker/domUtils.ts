// import 

import { HTMLParser, JSONToHTML } from "./parser"
import { bfs } from './useAst'


// 使用DOMParser根据html字符串生成node节点
export function createNodeByStr(str: string) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(str, 'text/html')
    return doc.body.firstChild
}

// 根据event对象和类名拿到最近的拥有该类名的父节点，然后用它的子节点替换它
export function clearNodeByEvent(event: MouseEvent, className: string) {
    const target = event.target as HTMLElement
    const parent = target.closest(`.${className}`)
    if (!parent) return
    const node = createNodeByStr(parent.innerHTML)
    parent.replaceWith(node)
}

export function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// 获取className字符串中的m-comment-ids
export function getCommentIdsByClassName(className: string): string[] {
    let prefix = 'm_comment-id-'
    let classList = className.split(' ')
    let ids: string[] = classList.filter(item => {
        return item.startsWith(prefix)
    }).map(item => {
        return item.trim()
    })
    return ids
}

// 获取给定节点的comment-id集合
export function getCommentIdsByNode(node: HTMLElement): string[] {
    let ans: string[] = []
    const findCommentIds = (node: HTMLElement) => {
        let ids = getCommentIdsByClassName(node.className)
        if (ids.length) {
            ans.push(...ids)
            return
        }
        if (node.parentElement?.tagName === 'P') return
        if (node.parentElement) {
            findCommentIds(node.parentElement)
        }
    }
    findCommentIds(node)
    return ans
}

// 给给定dom节点添加自定义属性
export function setAttrByNode(node: any, ...args: string[]) {
    args.forEach(key => {
        if (node instanceof HTMLElement) {
            node.dataset[key] = ''
        } else {
            if (!node.attributes) node.attributes = {}
            node.attributes[`data-${key}`] = ''
        }
    })
}

// 判断某个dom节点是否有某些自定义属性
export function hasAttrByNode(node: any, ...args: string[]) {
    return args.every(key => Object.keys(node.attributes ?? {}).includes(('data-' + key)))
}

// 清除某个dom节点（包括其子节点）的自定义属性（data-select_start  data-select_end）
export function clearCustomAttributes(node: any) {
    if (!node) {
        return;
    }

    // 清除自定义属性
    if (node.attributes && (node.attributes.hasOwnProperty('data-select_start') || node.attributes.hasOwnProperty('data-select_end'))) {
        delete node.attributes['data-select_start'];
        delete node.attributes['data-select_end'];
    }

    // 递归清除子节点的自定义属性
    if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
            clearCustomAttributes(node.childNodes[i]);
        }
    }
}


// 判断某个dom节点是否已有状态标注
export function hasStatusByNode(node: any, ...args: string[]) {
    if (!node.attributes) return false
    if (args.length) {
        return args.every(key => Object.keys(node.attributes ?? {}).includes((key)))
    }
    return Object.keys(node.attributes).some(key => key.startsWith('m_'))
}

// 叠加状态类名标注
export function addStatusByNode(node: any, status: string) {
    if (!node.attributes) {
        node.attributes = {
            class: status
        }
        return
    }
    if (!node.attributes.class?.trim()) {
        node.attributes.class = status
        return
    }
    if (node.attributes.class.includes(status)) return
    node.attributes.class += ` ${status}`
}

export function addStatusByNodeLeftIndex(node: any, status: string, l: number) {
    // 暂认为能走到这个函数，一定是需要一分为二的
    let oldTextObj = node.content[0]
    let suffix = oldTextObj.content.slice(l)
    oldTextObj.content = oldTextObj.content.slice(0, l)
    node.parent.content.splice(node.index + 1, 0, copyNode(node, suffix, status))
}
export function addStatusByNodeRightIndex(node: any, status: string, r: number) {
    // 暂认为能走到这个函数，一定是需要一分为二的
    let oldTextObj = node.content[0]
    let prefix = oldTextObj.content.slice(0, r)
    oldTextObj.content = oldTextObj.content.slice(r)
    node.parent.content.splice(node.index, 0, copyNode(node, prefix, status))
}
export function addStatusByNodeLeftAndRightIndex(node: any, status: string, l: number, r: number) {
    // 暂认为能走到这个函数，一定是需要一分为三的
    let oldTextObj = node.content[0]
    let prefix = oldTextObj.content.slice(0, l),
        suffix = oldTextObj.content.slice(r),
        middle = oldTextObj.content.slice(l, r)
    if (suffix) node.parent.content.splice(node.index + 1, 0, copyNode(node, suffix))
    if (middle) node.parent.content.splice(node.index, 1, copyNode(node, middle, status))
    if (prefix) node.parent.content.splice(node.index, 0, copyNode(node, prefix))
}

function copyNode(node: any, text: string, status?: string) {
    let { attributes: { class: oldClass }, ...newNode } = node
    newNode.attributes = {
        class: oldClass,
    }
    newNode.content = [{
        type: 'text',
        content: text,
        parent: newNode,
    }]
    if (status) newNode.attributes.class += ` ${status}`
    return newNode
}

export function deleteStatusByNode(node: any, status: string) {
    let text = node.content[0].content
    node.parent.content.splice(node.index, 1, reduceNode(node, text, status))
}

export function deleteStatusByNodeLeftIndex(node: any, status: string, l: number) {
    // 暂认为能走到这个函数，一定是需要一分为二的
    let oldTextObj = node.content[0]
    let suffix = oldTextObj.content.slice(l)
    oldTextObj.content = oldTextObj.content.slice(0, l)
    node.parent.content.splice(node.index + 1, 0, reduceNode(node, suffix, status))

}
export function deleteStatusByNodeRightIndex(node: any, status: string, r: number) {
    // 暂认为能走到这个函数，一定是需要一分为二的
    let oldTextObj = node.content[0]
    let prefix = oldTextObj.content.slice(0, r)
    oldTextObj.content = oldTextObj.content.slice(r)
    node.parent.content.splice(node.index, 0, reduceNode(node, prefix, status))
}
export function deleteStatusByNodeLeftAndRightIndex(node: any, status: string, l: number, r: number) {
    // 暂认为能走到这个函数，一定是需要一分为三的
    let oldTextObj = node.content[0]
    let prefix = oldTextObj.content.slice(0, l),
        suffix = oldTextObj.content.slice(r),
        middle = oldTextObj.content.slice(l, r)
    if (suffix) node.parent.content.splice(node.index + 1, 0, reduceNode(node, suffix))
    if (middle) node.parent.content.splice(node.index, 1, reduceNode(node, middle, status))
    if (prefix) node.parent.content.splice(node.index, 0, reduceNode(node, prefix))
}

function reduceNode(node: any, text: string, status?: string) {
    let { attributes: { class: oldClass }, ...newNode } = node
    if (oldClass.split(' ').length === 1) {
        // 判断oldClass长度如果是1说明这个，说明这个状态就是待删除的状态，删除后要提升节点
        if (status) {
            newNode = { ...node.content[0] }
            newNode.parent = node.parent
            newNode.content = text
        } else {
            if (!status) {
                newNode.attributes = { class: oldClass }
                newNode.content[0].content = text
            }
        }
    } else {
        // 否则只要删除对应状态类名
        newNode.attributes = {
            class: oldClass,
        }
        newNode.content = [{
            type: 'text',
            content: text,
            parent: newNode,
        }]
        if (status) {
            newNode.attributes.class = removeClass(newNode.attributes.class, status)
        }
    }

    return newNode
}

function removeClass(classString: string, classToRemove: string) {
    let classArray = classString.split(' ').map(i => i.trim())
    let filteredArray = classArray.filter((className) => className !== classToRemove.trim())
    return filteredArray.join(' ')
}

// 删除node中指定的class，如果删除后没有状态，则需要提升子节点
export async function removeClassByKey(node: HTMLElement, classToRemove: string) {
    let tree = await HTMLParser(node)
    console.log(tree);
    const fn = (root: any) => {
        // 广度优先遍历
        if (!root || !root.content?.length) return
        const queue = [root]
        while (queue.length) {
            const currentNode = queue.shift()!
            if (currentNode.type === 'span' && currentNode.attributes?.class?.includes(classToRemove)) {
                deleteStatusByNode(currentNode, classToRemove)
            }
            if (currentNode.type === 'text' || currentNode.attributes?.class?.includes('ql-formula')) {
                continue
            } else if (currentNode.content?.length) {
                queue.push(...currentNode.content)
            }
        }
    }
    fn(tree)
    bfs(tree)
    let str = await JSONToHTML(tree) as string
    // 去掉父节点
    let l = str.indexOf('>') + 1
    let r = str.lastIndexOf('<')
    return str.slice(l, r)
}