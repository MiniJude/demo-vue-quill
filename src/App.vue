<template>
  <!-- <VueQuillEditor v-model:content="html"></VueQuillEditor> -->
  <!-- <div>
    <template v-for="item in 6">
      <RichTextMarker v-model="html['case' + item]"></RichTextMarker>
      <div style="height: 4px;background-color: red;"></div>
    </template>
  </div> -->
  <div style="display: flex;width: 100%;height: 100%;">
    <div style="flex:1;height: 100%;overflow: auto;padding: 20px;">
      <RichTextMarker v-model="html['case1']" @choose="handleChoose" :noteFn="123"></RichTextMarker>
    </div>
    <div style="width:2px;background-color: rosybrown;"> </div>
    <div style="flex:1;height: 100%;overflow: auto;padding: 20px;">
      123
    </div>
    <textarea class="custom-textarea" v-if="textareaVisible"></textarea>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import VueQuillEditor from '@/components/VueQuillEditor.vue'
import RichTextMarker from '@/components/RichTextMarker/index.vue'
import { HTMLParser } from './components/RichTextMarker/parser'

// 建议：公式和图片两侧都加空格！！！！
let case1 = '<p>这是<span class="m_underline">传入</span>的htmlstr字符串</p>'
let case2 = '<p>这是传入的htmlstr字符串</p><p>这是<span class="m_underline">第二行</span>文字</p><p>这是第3行文字</p>'
let case3 = '<p>这是第二<img src="https://www.antdv.com/assets/logo.1ef800a8.svg">行<img src="https://www.antdv.com/assets/logo.1ef800a8.svg">文字</p>'
let case4 = '<p>这是传入的htmlstr字符串</p><p>这是第二<img src="https://www.antdv.com/assets/logo.1ef800a8.svg"> 行 <img src="https://www.antdv.com/assets/logo.1ef800a8.svg"> 文字</p><p><img src="https://www.antdv.com/assets/logo.1ef800a8.svg">这是第3行文字</p>'
let case5 = '<p>这是<strong>传入</strong>的<em>ht</em>mlstr字<img src="https://www.antdv.com/assets/logo.1ef800a8.svg">符串</p><p>这是<u>第二<img src="https://www.antdv.com/assets/logo.1ef800a8.svg"行</u>文<span class="ql-formula" data-value=" \tfrac{v}{d} ">﻿<span contenteditable="false"><span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mfrac><mi>v</mi><mi>d</mi></mfrac></mrow><annotation encoding="application/x-tex"> \tfrac{v}{d} </annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height: 1.0404em; vertical-align: -0.345em;"></span><span class="mord"><span class="mopen nulldelimiter"></span><span class="mfrac"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height: 0.6954em;"><span class="" style="top: -2.655em;"><span class="pstrut" style="height: 3em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mord mathnormal mtight">d</span></span></span></span><span class="" style="top: -3.23em;"><span class="pstrut" style="height: 3em;"></span><span class="frac-line" style="border-bottom-width: 0.04em;"></span></span><span class="" style="top: -3.394em;"><span class="pstrut" style="height: 3em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mord mathnormal mtight" style="margin-right: 0.0359em;">v</span></span></span></span></span><span class="vlist-s">​</span></span><span class="vlist-r"><span class="vlist" style="height: 0.345em;"><span class=""></span></span></span></span></span><span class="mclose nulldelimiter"></span></span></span></span></span></span>﻿</span> 字</p>'
let case6 = '<p>这<span class="ql-formula" data-value="\cfrac{1}{a + \cfrac{7}{b + \cfrac{2}{9}}} =c ">&#xFEFF;<span contenteditable="false"><span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mstyle displaystyle="true" scriptlevel="0"><mfrac><mn>1</mn><mrow><mi>a</mi><mo>+</mo><mstyle displaystyle="true" scriptlevel="0"><mfrac><mn>7</mn><mrow><mi>b</mi><mo>+</mo><mstyle displaystyle="true" scriptlevel="0"><mfrac><mn>2</mn><mn>9</mn></mfrac></mstyle></mrow></mfrac></mstyle></mrow></mfrac></mstyle><mo>=</mo><mi>c</mi></mrow><annotation encoding="application/x-tex">\cfrac{1}{a + \cfrac{7}{b + \cfrac{2}{9}}} =c </annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height: 5.236em; vertical-align: -3.646em;"></span><span class="mord"><span class="mopen nulldelimiter"></span><span class="mfrac"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height: 1.59em;"><span class="" style="top: -2.11em;"><span class="pstrut" style="height: 3.59em;"></span><span class="mord"><span class="mord mathnormal">a</span><span class="mspace" style="margin-right: 0.2222em;"></span><span class="mbin">+</span><span class="mspace" style="margin-right: 0.2222em;"></span><span class="mord"><span class="mopen nulldelimiter"></span><span class="mfrac"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height: 1.59em;"><span class="" style="top: -2.11em;"><span class="pstrut" style="height: 3.59em;"></span><span class="mord"><span class="mord mathnormal">b</span><span class="mspace" style="margin-right: 0.2222em;"></span><span class="mbin">+</span><span class="mspace" style="margin-right: 0.2222em;"></span><span class="mord"><span class="mopen nulldelimiter"></span><span class="mfrac"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height: 1.59em;"><span class="" style="top: -2.314em;"><span class="pstrut" style="height: 3em;"></span><span class="mord"><span class="mord">9</span></span></span><span class="" style="top: -3.23em;"><span class="pstrut" style="height: 3em;"></span><span class="frac-line" style="border-bottom-width: 0.04em;"></span></span><span class="" style="top: -3.74em;"><span class="pstrut" style="height: 3em;"></span><span class="mord"><span class="mord">2</span></span></span></span><span class="vlist-s">&ZeroWidthSpace;</span></span><span class="vlist-r"><span class="vlist" style="height: 0.686em;"><span class=""></span></span></span></span></span><span class=""></span></span></span></span><span class="" style="top: -3.82em;"><span class="pstrut" style="height: 3.59em;"></span><span class="frac-line" style="border-bottom-width: 0.04em;"></span></span><span class="" style="top: -4.33em;"><span class="pstrut" style="height: 3.59em;"></span><span class="mord"><span class="mord">7</span></span></span></span><span class="vlist-s">&ZeroWidthSpace;</span></span><span class="vlist-r"><span class="vlist" style="height: 2.166em;"><span class=""></span></span></span></span></span><span class=""></span></span></span></span><span class="" style="top: -3.82em;"><span class="pstrut" style="height: 3.59em;"></span><span class="frac-line" style="border-bottom-width: 0.04em;"></span></span><span class="" style="top: -4.33em;"><span class="pstrut" style="height: 3.59em;"></span><span class="mord"><span class="mord">1</span></span></span></span><span class="vlist-s">&ZeroWidthSpace;</span></span><span class="vlist-r"><span class="vlist" style="height: 3.646em;"><span class=""></span></span></span></span></span><span class=""></span></span><span class="mspace" style="margin-right: 0.2778em;"></span><span class="mrel">=</span><span class="mspace" style="margin-right: 0.2778em;"></span></span><span class="base"><span class="strut" style="height: 0.4306em;"></span><span class="mord mathnormal">c</span></span></span></span></span>&#xFEFF;</span>s是一个超级复杂的公式</p><p>这是第二行的公式：<span class="ql-formula" data-value="a">&#xFEFF;<span contenteditable="false"><span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mi>a</mi></mrow><annotation encoding="application/x-tex">a</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height: 0.4306em;"></span><span class="mord mathnormal">a</span></span></span></span></span>&#xFEFF;</span> </p>'
const html = reactive<Record<string, string>>({
  case1,
  case2,
  case3,
  case4,
  case5,
  case6,
})
// HTMLParser(case1).then(res => {
//   console.log(res)
// })

function handleChoose(textTypeName: any, callback?: (...arys: any[]) => void) {
  console.log(textTypeName, callback)
  callback?.('m_note')
}


const textareaVisible = ref(false)
function createNote() {

}


</script>

<style lang="less" scoped>
// 自定义textarea样式
// 定义textarea样式
.custom-textarea {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  // 背景色
  background-color: #f5f5f5;
  
  // 边框
  border: 1px solid #ccc;
  border-radius: 4px;
  
  // 内边距
  padding: 8px;
  
  // 字体
  font-family: Arial, sans-serif;
  font-size: 14px;
  
  // 调整尺寸
  width: 300px;
  height: 150px;
  
  // 调整其他样式
  resize: vertical; // 允许垂直调整大小
  box-sizing: border-box; // 盒子模型为边框盒模型，便于计算尺寸
  outline: none; // 去除默认的焦点边框
  
  // 鼠标悬停效果
  &:hover {
    background-color: #ebebeb;
  }
  
  // 聚焦效果
  &:focus {
    border-color: #6c9ce8;
    box-shadow: 0 0 4px #6c9ce8;
  }
}

</style>