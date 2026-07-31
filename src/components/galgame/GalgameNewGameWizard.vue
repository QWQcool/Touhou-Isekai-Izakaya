<script setup lang="ts">
/**
 * GalgameNewGameWizard.vue
 * 
 * 3A级沉浸式开场建档系统
 * 采用 3D 视差、深渊星光特效与互动式叙事推进。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sparkles, Navigation } from 'lucide-vue-next'
import { PRESET_ORIGINS, PRESET_LOCATIONS } from '@/constants/presets'
import { audioManager } from '@/services/audio'

const emit = defineEmits<{
  (e: 'complete', data: any): void
  (e: 'cancel'): void
}>()

// 阶段定义
// -1: 纯黑开场
// 0: 独白 1
// 1: 独白 2
// 2: 独白 3 (命运之地)
// 3: 询问名字
// 4: 询问身世 (卡牌)
// 5: 询问未尽之言 (自定义人设补充)
// 6: 询问降生点 (地点)
// 7: 结语
const phase = ref(-1)
const isTransitioning = ref(false)
const isFadingOut = ref(false)

// 玩家输入数据
const formData = ref({
  name: '',
  originId: '',
  customPersona: '',
  location: ''
})

// 视差鼠标追踪
const mouseX = ref(0)
const mouseY = ref(0)
function handleMouseMove(e: MouseEvent) {
  const { clientX, clientY } = e
  const { innerWidth, innerHeight } = window
  // 转换为 -1 到 1 的范围
  mouseX.value = (clientX / innerWidth) * 2 - 1
  mouseY.value = (clientY / innerHeight) * 2 - 1
}

// 自动推进独白
let monologueTimer: any = null
function startMonologue() {
  // 延迟 800ms 开始，以触发首幕的淡入动画
  setTimeout(() => {
    phase.value = 0
    
    monologueTimer = setTimeout(() => {
      phase.value = 1
      monologueTimer = setTimeout(() => {
        phase.value = 2
        monologueTimer = setTimeout(() => {
          phase.value = 3
        }, 4000)
      }, 5000)
    }, 4500)
  }, 800)
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  startMonologue()
  audioManager.playBgmByCategory('wizard')
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  clearTimeout(monologueTimer)
})

function nextPhase() {
  if (isTransitioning.value) return
  isTransitioning.value = true
  setTimeout(() => {
    phase.value++
    isTransitioning.value = false
    
    // 如果到了最后一步，触发完成
    if (phase.value === 7) {
      setTimeout(() => {
        isFadingOut.value = true
        // 留出 2 秒的时间让整个黑屏/模糊淡出效果完全播放完毕
        setTimeout(() => {
          finalizeCreation()
        }, 2000)
      }, 3000)
    }
  }, 800) // 阶段切换的过度时间
}

function handleNameSubmit() {
  if (!formData.value.name.trim()) return
  nextPhase()
}

function handleOriginSelect(id: string) {
  audioManager.playClick()
  formData.value.originId = id
  nextPhase()
}

function handlePersonaSubmit() {
  nextPhase()
}

function handleLocationSelect(loc: string) {
  audioManager.playSoftClick()
  formData.value.location = loc
  nextPhase()
}

function finalizeCreation() {
  const origin = PRESET_ORIGINS.find(o => o.id === formData.value.originId) || PRESET_ORIGINS[0]
  
  // 组装最终数据 (匹配 Sandbox Wizard 的数据结构，但大幅精简)
  const finalPersonaObj = {
    ...(origin as any).setting,
    补充设定: formData.value.customPersona.trim() || "通过命运之门降临的灵魂。"
  }

  const finalStats = {
    ...origin.stats,
    max_hp: origin.stats.hp,
    max_mp: (origin.stats as any).mp || 100,
    location: formData.value.location
  }

  emit('complete', {
    name: formData.value.name,
    difficulty: 'normal', // Galgame 模式默认锁定普通难度即可，专注叙事
    persona: JSON.stringify(finalPersonaObj, null, 2),
    stats: finalStats,
  })
  
  audioManager.stopBgm()
  audioManager.playSpellCastAoE()
}

// ----------------------------------------
// 360° 立体轮播图逻辑 (Carousel Logic - Coverflow)
// ----------------------------------------
const totalOrigins = computed(() => PRESET_ORIGINS.length)

const carouselIndex = ref(0)
const activeIndex = computed(() => {
  let n = carouselIndex.value % totalOrigins.value
  if (n < 0) n += totalOrigins.value
  return n
})

const isDragging = ref(false)
const startX = ref(0)
const currentDragOffset = ref(0) // pixels

// 连续的进度，用于丝滑拖拽
const dragProgress = computed(() => currentDragOffset.value / 200)
const continuousIndex = computed(() => carouselIndex.value - dragProgress.value)

function handleDragStart(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  startX.value = 'touches' in e ? e.touches[0].clientX : e.clientX
}
function handleDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  currentDragOffset.value = clientX - startX.value
}
function handleDragEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  // 滑动阈值
  if (currentDragOffset.value > 80) {
    carouselIndex.value--
  } else if (currentDragOffset.value < -80) {
    carouselIndex.value++
  }
  currentDragOffset.value = 0
}

function handleCardClick(index: number, id: string) {
  // 误触保护
  if (Math.abs(currentDragOffset.value) > 10) return

  let normalizedCurrent = carouselIndex.value % totalOrigins.value
  if (normalizedCurrent < 0) normalizedCurrent += totalOrigins.value

  let diff = index - normalizedCurrent
  if (diff > totalOrigins.value / 2) diff -= totalOrigins.value
  if (diff < -totalOrigins.value / 2) diff += totalOrigins.value

  if (diff === 0) {
    handleOriginSelect(id)
  } else {
    carouselIndex.value += diff
  }
}

// 动态计算每张卡片的样式（Coverflow 椭球算法）
function getCardStyle(index: number) {
  let offset = index - continuousIndex.value
  const N = totalOrigins.value
  
  // 归一化偏移量到 [-N/2, N/2] 区间
  while (offset > N / 2) offset -= N
  while (offset < -N / 2) offset += N
  
  const absOffset = Math.abs(offset)
  const sign = Math.sign(offset)
  
  // 计算平移 (X, Z)
  let translateX = 0
  if (absOffset <= 1) {
    translateX = absOffset * 280 * sign
  } else {
    translateX = (280 + (absOffset - 1) * 100) * sign
  }
  const translateZ = absOffset * -180
  
  // 计算旋转 (两侧的卡片稍微面向镜头)
  const rotateY = offset * -35
  
  // 缩放、透明度与景深
  const scale = Math.max(1 - absOffset * 0.15, 0.6)
  
  const opacity = absOffset <= 1 
    ? 1 - absOffset * 0.25 
    : Math.max(0.75 - (absOffset - 1) * 0.5, 0.1)
    
  const blur = absOffset <= 1 
    ? absOffset * 2 
    : 2 + (absOffset - 1) * 5
    
  const brightness = absOffset <= 1 
    ? 1 - absOffset * 0.4 
    : Math.max(0.6 - (absOffset - 1) * 0.4, 0.2)

  return {
    transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    filter: `brightness(${brightness}) blur(${blur}px)`,
    zIndex: Math.round(100 - absOffset * 10),
    transition: isDragging.value ? 'none' : 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
    pointerEvents: absOffset < 1.2 ? 'auto' as any : 'none' as any,
  }
}
</script>

<template>
  <div class="gal-wizard-container" :class="{ 'is-fading-out': isFadingOut }">
    
    <!-- 动态星光与火星特效层 -->
    <div class="particles-layer" :style="{ transform: `translate(${mouseX * -20}px, ${mouseY * -20}px)` }">
      <div class="particle" v-for="i in 50" :key="i"></div>
    </div>
    <div class="ambient-glow"></div>

    <!-- 舞台层 (带 3D 视差) -->
    <div class="stage-layer" :style="{ transform: `translate(${mouseX * 10}px, ${mouseY * 10}px)` }">
      
      <Transition name="blur-fade" mode="out-in">
        <!-- ===== 第一阶段：独白 ===== -->
        <div v-if="phase === 0" key="p0" class="phase-container">
          <div class="monologue-text">
            <p>还没弄清楚发生了什么，<br>我只知道，自己似乎陷入了恒久的沉睡中。</p>
          </div>
        </div>
        
        <div v-else-if="phase === 1" key="p1" class="phase-container">
          <div class="monologue-text">
            <p>我在混沌的海洋里不断寻找，<br>随同万年间的星光飞逝，我的意识终于回归了这副躯体。</p>
          </div>
        </div>
        
        <div v-else-if="phase === 2" key="p2" class="phase-container">
          <div class="monologue-text voice-text">
            <p>「……汝……已抵达……命运之地……」</p>
          </div>
        </div>

        <!-- ===== 第二阶段：真名 ===== -->
        <div v-else-if="phase === 3" key="p3" class="phase-container interactive-section">
          <h2 class="voice-title">「在编织新的命运前……告诉吾……汝之名为何？」</h2>
          <div class="input-wrapper">
            <input 
              v-model="formData.name" 
              class="ethereal-input"
              placeholder="输入你的名字..."
              @keydown.enter="handleNameSubmit"
              autofocus
            />
            <button class="ethereal-btn" :class="{ 'is-active': formData.name.trim() }" @click="handleNameSubmit">
              <Sparkles :size="24" />
            </button>
          </div>
        </div>

        <!-- ===== 第三阶段：业果卡牌 ===== -->
        <div v-else-if="phase === 4" key="p4" class="phase-container interactive-section">
          <h2 class="voice-title">「{{ formData.name }}……汝之灵魂，曾背负过何种业果？」</h2>
          
          <div class="carousel-viewport"
            @mousedown="handleDragStart"
            @mousemove="handleDragMove"
            @mouseup="handleDragEnd"
            @mouseleave="handleDragEnd"
            @touchstart="handleDragStart"
            @touchmove="handleDragMove"
            @touchend="handleDragEnd"
          >
            <div class="carousel-stage">
              <div 
                v-for="(origin, index) in PRESET_ORIGINS" 
                :key="origin.id"
                class="carousel-item"
                :class="{ 'is-active': activeIndex === index }"
                :style="getCardStyle(index)"
                @click="handleCardClick(index, origin.id)"
              >
                <div class="destiny-card">
                  <div class="card-glare"></div>
                  <div class="card-icon">
                    <component :is="origin.icon" :size="56" stroke-width="1.5" />
                  </div>
                  <h3 class="card-title">{{ origin.name }}</h3>
                  <div class="card-divider"></div>
                  <p class="card-desc">{{ origin.desc }}</p>
                  <div class="card-particles"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 第五阶段：未尽之言 (补充人设) ===== -->
        <div v-else-if="phase === 5" key="p5" class="phase-container interactive-section">
          <h2 class="voice-title">「{{ formData.name }}……关于汝之过往，可还有未尽之言？」</h2>
          <div class="input-wrapper">
            <textarea 
              v-model="formData.customPersona" 
              class="ethereal-input ethereal-textarea"
              placeholder="在这里补充你的详细人设或外观特征...（选填）"
              @keydown.enter.ctrl="handlePersonaSubmit"
              rows="3"
            ></textarea>
            <div style="display: flex; gap: 20px; align-items: center;">
              <span class="sub-hint">支持 Ctrl+Enter 提交，如无补充可直接继续</span>
              <button class="ethereal-btn is-active" @click="handlePersonaSubmit">
                <Sparkles :size="24" />
              </button>
            </div>
          </div>
        </div>

        <!-- ===== 第六阶段：降生之域 ===== -->
        <div v-else-if="phase === 6" key="p6" class="phase-container interactive-section">
          <h2 class="voice-title">「命运的纺锤已然转动……汝，欲降生于何处？」</h2>
          
          <div class="map-nodes-container">
            <div 
              v-for="(loc, index) in PRESET_LOCATIONS" 
              :key="loc"
              class="map-node"
              :style="{ animationDelay: `${index * 100}ms` }"
              @click="handleLocationSelect(loc)"
            >
              <div class="node-glow"></div>
              <Navigation :size="32" class="node-icon" />
              <span class="node-label">{{ loc }}</span>
            </div>
          </div>
        </div>

        <!-- ===== 终局 ===== -->
        <div v-else-if="phase === 7" key="p7" class="phase-container">
          <div class="monologue-text voice-text final-voice">
            <p>「那么，愿星光指引你的道路……」</p>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
/* 容器基调：深邃的混沌 */
.gal-wizard-container {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at center, #150a0a 0%, #050202 100%);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  perspective: 1200px;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  user-select: none;
  transition: opacity 2s ease-in-out, filter 2s ease-in-out;
}

.gal-wizard-container.is-fading-out {
  opacity: 0;
  filter: blur(20px);
  pointer-events: none;
}

/* 环境泛光 */
.ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80vw;
  height: 80vh;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(200, 60, 40, 0.05) 0%, transparent 60%);
  filter: blur(50px);
  pointer-events: none;
}

/* 粒子层：模拟上浮的火星与星光碎屑 */
.particles-layer {
  position: absolute;
  inset: -100px; /* 留出视差移动空间 */
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: rgba(255, 180, 100, 0.8);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 100, 50, 0.8);
  bottom: -10px;
  /* 随机分布与动画，实际应用中可用 JS 生成，此处使用 SCSS 模拟 (为了简化，用 nth-child 模拟几个) */
  animation: floatUp linear infinite;
}

/* 简单写死几个粒子的位置和时间，实际可以使用更复杂的 CSS预处理器/JS。 */
.particle:nth-child(1) { left: 10%; animation-duration: 8s; animation-delay: 0s; width: 2px; height: 2px; opacity: 0.5; }
.particle:nth-child(2) { left: 30%; animation-duration: 12s; animation-delay: -2s; width: 4px; height: 4px; background: rgba(200,200,255,0.8); }
.particle:nth-child(3) { left: 50%; animation-duration: 10s; animation-delay: -5s; width: 3px; height: 3px; }
.particle:nth-child(4) { left: 70%; animation-duration: 15s; animation-delay: -8s; width: 2px; height: 2px; opacity: 0.6; }
.particle:nth-child(5) { left: 90%; animation-duration: 9s; animation-delay: -1s; width: 4px; height: 4px; }
.particle:nth-child(6) { left: 20%; animation-duration: 11s; animation-delay: -4s; width: 3px; height: 3px; background: rgba(255,100,100,0.8); }
.particle:nth-child(7) { left: 40%; animation-duration: 14s; animation-delay: -7s; width: 2px; height: 2px; }
.particle:nth-child(8) { left: 60%; animation-duration: 13s; animation-delay: -3s; width: 5px; height: 5px; opacity: 0.3; }
.particle:nth-child(9) { left: 80%; animation-duration: 8s; animation-delay: -6s; width: 3px; height: 3px; }
.particle:nth-child(10) { left: 15%; animation-duration: 16s; animation-delay: -9s; width: 2px; height: 2px; }

@keyframes floatUp {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-110vh) scale(0.5); opacity: 0; }
}

/* 舞台层 */
.stage-layer {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform-style: preserve-3d;
}

.phase-container {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 独白文本 */
.monologue-text {
  text-align: center;
  color: rgba(255, 255, 255, 0.95);
  font-size: 2rem;
  line-height: 2.6;
  letter-spacing: 8px;
  font-family: 'Ma Shan Zheng', 'Zhi Mang Xing', 'Noto Serif SC', serif;
  text-shadow: 0 0 25px rgba(255, 255, 255, 0.5), 0 5px 15px rgba(0,0,0,1);
  font-weight: 300;
}

.voice-text {
  color: #f3d4a0;
  font-size: 2.4rem;
  letter-spacing: 10px;
  text-shadow: 0 0 40px rgba(243, 212, 160, 0.6), 0 5px 20px rgba(0,0,0,1);
}

.final-voice {
  font-size: 3rem;
  letter-spacing: 12px;
}

/* 交互区通用 */
.interactive-section {
  gap: 80px;
}

.voice-title {
  color: #f3d4a0;
  font-size: 2.4rem;
  font-family: 'Ma Shan Zheng', 'Zhi Mang Xing', 'Noto Serif SC', serif;
  font-weight: normal;
  letter-spacing: 6px;
  text-shadow: 0 0 30px rgba(243, 212, 160, 0.4);
  margin: 0;
}

/* 输入框 */
.input-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  margin-top: 20px;
}

.ethereal-input {
  background: transparent;
  border: none;
  border-bottom: 2px solid rgba(243, 212, 160, 0.3);
  width: 400px;
  padding: 15px;
  color: #fff;
  font-size: 2rem;
  text-align: center;
  font-family: 'Ma Shan Zheng', 'Zhi Mang Xing', 'Noto Serif SC', serif;
  letter-spacing: 4px;
  outline: none;
  transition: all 0.5s;
}

.ethereal-textarea {
  font-size: 1.4rem;
  line-height: 1.8;
  height: 120px;
  resize: none;
  border-radius: 8px;
  background: rgba(10, 5, 10, 0.4);
  border: 1px solid rgba(243, 212, 160, 0.2);
  padding: 20px;
  text-align: left;
}

.ethereal-textarea:focus {
  border-color: rgba(243, 212, 160, 0.8);
  box-shadow: 0 0 30px rgba(243, 212, 160, 0.2);
}

.ethereal-input::placeholder {
  color: rgba(255, 255, 255, 0.1);
  font-size: 1.5rem;
}

.ethereal-input:focus {
  border-bottom-color: rgba(243, 212, 160, 0.9);
  box-shadow: 0 15px 30px -15px rgba(243, 212, 160, 0.5);
}

.ethereal-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform: scale(0.8);
}

.ethereal-btn.is-active {
  color: #f3d4a0;
  transform: scale(1.2);
  filter: drop-shadow(0 0 15px rgba(243, 212, 160, 0.6));
}

.ethereal-btn.is-active:hover {
  transform: scale(1.5);
  color: #fff;
}

.sub-hint {
  color: rgba(255, 255, 255, 0.3);
  font-size: 1rem;
  letter-spacing: 2px;
}

/* 业果卡牌 360° 轮播 */
.carousel-viewport {
  width: 100%;
  height: 480px;
  perspective: 1200px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: grab;
}
.carousel-viewport:active {
  cursor: grabbing;
}

.carousel-stage {
  width: 100%;
  height: 100%;
  position: absolute;
  transform-style: preserve-3d;
}

.carousel-item {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-left: -120px; /* 半宽 */
  margin-top: -200px;  /* 半高 */
  width: 240px;
  height: 400px;
  transform-style: preserve-3d;
  will-change: transform, opacity, filter;
}

.destiny-card {
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, rgba(40, 20, 25, 0.9), rgba(10, 5, 10, 0.95));
  border: 1px solid rgba(243, 212, 160, 0.2);
  border-radius: 12px;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.4s, border-color 0.4s;
  transform-style: preserve-3d;
  box-shadow: 0 15px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(243, 212, 160, 0.05);
}

.carousel-item.is-active .destiny-card:hover {
  border-color: rgba(243, 212, 160, 0.8);
  box-shadow: 0 0 30px rgba(243, 212, 160, 0.4), 0 30px 60px rgba(0,0,0,1), inset 0 0 30px rgba(243, 212, 160, 0.2);
}

.card-glare {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.15), transparent 60%);
  pointer-events: none;
}

.card-icon {
  color: rgba(243, 212, 160, 0.4);
  margin-bottom: 35px;
  transform: translateZ(40px); /* 3D 浮出效果 */
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.destiny-card:hover .card-icon {
  color: rgba(243, 212, 160, 1);
  transform: translateZ(60px) scale(1.2);
  filter: drop-shadow(0 0 20px rgba(243, 212, 160, 0.8));
}

.card-title {
  color: #fff;
  font-size: 1.8rem;
  font-family: 'Ma Shan Zheng', 'Zhi Mang Xing', 'Noto Serif SC', serif;
  margin: 0;
  letter-spacing: 4px;
  transform: translateZ(30px);
}

.card-divider {
  width: 40px;
  height: 2px;
  background: rgba(243, 212, 160, 0.3);
  margin: 20px 0;
  transform: translateZ(20px);
}

.card-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.05rem;
  line-height: 1.8;
  margin: 0;
  transform: translateZ(15px);
  font-family: 'Noto Serif SC', serif;
}

/* 降生节点 (地图沙盘) */
.map-nodes-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 60px;
  max-width: 900px;
  transform: rotateX(30deg); /* 更强烈的倾斜视角 */
  transform-style: preserve-3d;
  margin-top: 40px;
}

.map-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  animation: nodeEnter 1s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes nodeEnter {
  from { opacity: 0; transform: translateY(50px) scale(0.8); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.node-glow {
  position: absolute;
  top: 15px;
  width: 80px;
  height: 25px;
  background: radial-gradient(ellipse at center, rgba(243, 212, 160, 0.3), transparent 70%);
  border-radius: 50%;
  filter: blur(8px);
  transition: all 0.4s;
}

.map-node:hover .node-glow {
  background: radial-gradient(ellipse at center, rgba(243, 212, 160, 0.8), transparent 70%);
  transform: scale(1.8);
}

.node-icon {
  color: rgba(243, 212, 160, 0.5);
  transform: translateZ(15px);
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.map-node:hover .node-icon {
  color: rgba(243, 212, 160, 1);
  transform: translateZ(30px) translateY(-10px) scale(1.2);
  filter: drop-shadow(0 10px 15px rgba(243, 212, 160, 0.4));
}

.node-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.4rem;
  font-family: 'Ma Shan Zheng', 'Zhi Mang Xing', 'Noto Serif SC', serif;
  letter-spacing: 4px;
  transition: all 0.4s;
}

.map-node:hover .node-label {
  color: #fff;
  text-shadow: 0 0 15px rgba(243, 212, 160, 0.8);
  transform: translateZ(10px);
}

/* 动画系统 */
.blur-fade-enter-active,
.blur-fade-leave-active {
  transition: all 1.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.blur-fade-enter-from {
  opacity: 0;
  transform: scale(1.05) translateZ(50px);
  filter: blur(15px);
}
.blur-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateZ(-50px);
  filter: blur(15px);
}
</style>
