<template>
    <QuillEditor ref="editorRef" :content="content" contentType="html" :toolbar="defaultToolBar" :modules="modules"
        theme="snow" @textChange="handleTextChange" @click.prevent />
</template>
  
<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import BlotFormatter from 'quill-blot-formatter'
import ImageUploader from 'quill-image-uploader'
import { blobToDataURI } from '@/utils/common'

const props = withDefaults(defineProps<{
    content: string
}>(), {
    content: ''
})

const emits = defineEmits<{
    (event: 'update:content', content: string): void
}>()

const editorRef = ref()

const defaultToolBar = [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    ['image', 'code-block'],
    ['formula']
]

// onMounted(() => {
//     let toolbar = editorRef.value.getQuill().getModule('toolbar')
//     console.log(toolbar)
//     toolbar.addHandler('image', () => {
//         console.log('image')
//     })
// })

const modules = [{
    name: 'blotFormatter',
    module: BlotFormatter
}, {
    name: 'imageUploader',
    module: ImageUploader,
    options: {
        upload: (file: File) => {
            return new Promise((resolve, reject) => {
                // if (file.size / 1024 > 24) {
                //     message.error('图片大小不能超过24kb')
                //     reject()
                // } else {
                // }
                resolve(blobToDataURI(file))
            })
        }
    }
}
]

const handleTextChange = () => {
    let html = editorRef.value.getHTML()
    emits('update:content', html)
}

</script>

<style lang="less">
.ql-container {
    width: 100%;

    .ql-tooltip {
        &[data-mode="formula"] {
            left: 0 !important;
            top: -50px !important;
        }
    }
}
</style>