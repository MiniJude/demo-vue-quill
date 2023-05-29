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

// 拿到给定节点的属性的data-m-id 中的id
export function getAttrIdByNode(node: HTMLElement): string {
    const data = node.dataset
    const m = Object.keys(data).find(key => key.startsWith('m'))
    return m?.slice(2)!
}

// 给给定dom元素添加自定义属性
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

// 判断某个dom元素是否有某些自定义属性
export function hasAttrByNode(node: any, ...args: string[]) {
    return args.every(key => Object.keys(node.attributes ?? {}).includes(('data-' + key)))
}

// 判断某个dom元素是否已有状态标注
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
    copyNode(node, suffix, status)
    node.parent.content.splice(node.index + 1, 0, copyNode(node, suffix, status))
}
export function addStatusByNodeRightIndex(node: any, status: string, r: number) {
    // 暂认为能走到这个函数，一定是需要一分为二的
    let oldTextObj = node.content[0]
    let prefix = oldTextObj.content.slice(0, r)
    oldTextObj.content = oldTextObj.content.slice(r)
    copyNode(node, prefix, status)
    node.parent.content.splice(node.index, 0, copyNode(node, prefix, status))
}
export function addStatusByNodeLeftAndRightIndex(node: any, status: string, l: number, r: number) {
    // 暂认为能走到这个函数，一定是需要一分为三的
    let oldTextObj = node.content[0]
    let prefix = oldTextObj.content.slice(0, l),
        suffix = oldTextObj.content.slice(r),
        middle = oldTextObj.content.slice(l, r)
    // oldTextObj.content = oldTextObj.content.slice(l, r)
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