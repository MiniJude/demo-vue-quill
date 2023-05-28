declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

interface Window {
    katex: any
    Quill: any
}

interface Node {
    replaceWith: any
}

// declare module 'html-to-json-parser' {
    
// }