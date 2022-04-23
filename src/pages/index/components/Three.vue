<template>
  <canvas class="webgl"></canvas>
  <h2 id="scene_name">University Square</h2>
  <div id="joystickWrapper1"></div>
  <div v-if="dialog" class="mask" @click="click">
    <div class="dialog" bg-green>
      <h2>{{ message }}</h2>
    </div>
  </div>
</template>

<script setup lang="ts">
import {} from '@/hooks'
import { start } from './three'
onMounted(start)

//$ref()获取组件里的信息
let dialog = $ref(false)
var message = $ref('')

function click(){
  dialog = false
  uni.$emit('startMove')
}

uni.$on('clickObject', name => {
  switch (name) {
    case '11002':
      uni.$emit('stopMove')
      dialog = true
      message = 'You just click star, cool'
      break
    case 'book':
      uni.$emit('stopMove')
      dialog = true
      message = 'You just click book, cool'
      break
    case 'pen':
      uni.$emit('stopMove')
      dialog = true
      message = 'You just click pen, cool'
      break

    default:
      break
  }
})
</script>

<style lang="scss">
.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 500rpx;
  height: 300rpx;
  transform: translate(-50%, -50%);
  z-index: 1000;
}
.mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: -1;
}
#scene_name{
    color: black;
    text-align:center;
}
.webgl
{
    position: fixed;
    top: 0;
    left: 0;
    outline: none;
    z-index:-1;
}
</style>
