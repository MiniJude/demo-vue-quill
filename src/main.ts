import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { QuillEditor } from '@vueup/vue-quill'
import katex from 'katex'
import 'katex/dist/katex.min.css';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

window.katex = katex
const app = createApp(App)

app.component('QuillEditor', QuillEditor)
app.mount('#app')
