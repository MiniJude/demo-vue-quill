// 使用DOMParser根据html字符串生成node节点
export function createNodeByStr(str: string) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(str, 'text/html')
    return doc.body.firstChild
}

// 将给定的节点用span包裹，并指定其类名
export function wrapNode(node: Node, className: string) {
    const span = document.createElement('span')
    span.className = className
    node.replaceWith(span)
    span.appendChild(node)
    return span
}