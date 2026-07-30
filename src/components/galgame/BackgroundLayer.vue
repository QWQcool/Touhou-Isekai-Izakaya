<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  bg: string
}>()

// 自动加载 battle_bg 和 map 目录下的所有可能背景图
const bgImages = import.meta.glob('/src/assets/images/**/*.{jpg,png,webp}', {
  query: '?url',
  import: 'default',
  eager: true
}) as Record<string, string>

const currentBgUrl = computed(() => {
  if (!props.bg) return ''
  
  // 尝试匹配名称
  const match = Object.keys(bgImages).find(path => path.includes(props.bg))
  if (match) return bgImages[match]

  // 如果没有，使用默认的博丽神社或者地图作为保底背景
  const fallback = Object.keys(bgImages).find(path => path.includes('博丽神社') || path.includes('地图'))
  return fallback ? bgImages[fallback] : ''
})
</script>

<template>
  <div class="gal-bg">
    <!-- 当有背景图标识时尝试加载 -->
    <div
      class="gal-bg__image"
      :style="currentBgUrl ? { backgroundImage: `url(${currentBgUrl})` } : {}"
    />
    <!-- 暗角 + 氛围叠加，改用更现代的色彩倾向 -->
    <div class="gal-bg__vignette" />
    <div class="gal-bg__gradient" />
  </div>
</template>

<style scoped>
.gal-bg {
  position: absolute;
  inset: 0;
  background-color: #050302;
  overflow: hidden; /* 防止放大时溢出 */
}

.gal-bg__image {
  position: absolute;
  inset: -4%; /* 给呼吸动画留出更大空间 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-image 1000ms ease;
  filter: blur(8px) saturate(0.9); /* 加大虚化，降低一点饱和度让人物更突出 */
  animation: gal-bg-breathe 20s ease-in-out infinite alternate;
}

@keyframes gal-bg-breathe {
  0% { transform: scale(1) translate(0, 0); }
  100% { transform: scale(1.04) translate(-1%, 1%); }
}

.gal-bg__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(10, 5, 5, 0.8) 100%);
  mix-blend-mode: multiply;
}

.gal-bg__gradient {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 60%;
  background: linear-gradient(to top, rgba(15, 10, 8, 0.95) 0%, rgba(15, 10, 8, 0.4) 50%, transparent 100%);
}
</style>
