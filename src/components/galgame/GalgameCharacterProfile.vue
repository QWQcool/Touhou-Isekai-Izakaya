<script setup lang="ts">
/**
 * GalgameCharacterProfile.vue — 详细角色档案面板
 *
 * 通过点击立绘旁悬浮卡片触发，显示完整的角色实时状态与设定。
 */
import { computed, onMounted, ref } from 'vue'
import { X, Heart, Smile, Users, MapPin, Activity, CheckCircle2 } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { useCharacterStore } from '@/stores/character'
import { resolveCharacterId } from '@/services/characterMapping'
import { resolveSpritePath, DEFAULT_FALLBACK } from '@/services/spriteResolver'

const props = defineProps<{
  characterName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const charStore = useCharacterStore()

const card = computed(() => {
  const resolvedId = resolveCharacterId(props.characterName, charStore.characters, gameStore.state.npcs)
  return charStore.characters.find(c => c.uuid === resolvedId)
})

const status = computed(() => {
  const resolvedId = resolveCharacterId(props.characterName, charStore.characters, gameStore.state.npcs)
  return (gameStore.state.npcs[props.characterName] || gameStore.state.npcs[resolvedId] || {}) as any
})

const spritePath = computed(() => {
  return resolveSpritePath(props.characterName, '常规')
})

function handleImgError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = DEFAULT_FALLBACK;
}

// 动画状态
const isMounted = ref(false)
onMounted(() => {
  setTimeout(() => {
    isMounted.value = true
  }, 10)
})

function close() {
  isMounted.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}
</script>

<template>
  <div class="gal-profile-overlay" @click="close">
    <div class="gal-profile-modal" :class="{ 'is-open': isMounted }" @click.stop>
      
      <!-- 左侧：大立绘展示 -->
      <div class="profile-left">
        <img :src="spritePath" class="profile-sprite" @error="handleImgError" />
        <div class="sprite-glow"></div>
      </div>

      <!-- 右侧：详细情报 -->
      <div class="profile-right">
        <button class="close-btn" @click="close">
          <X :size="24" />
        </button>

        <div class="profile-header">
          <h2 class="char-name">{{ props.characterName }}</h2>
          <div class="char-title" v-if="card?.tags && card.tags.length > 0">
            {{ card.tags.join(' • ') }}
          </div>
        </div>

        <div class="profile-scroll-area">
          
          <!-- 核心数值区块 -->
          <div class="info-section">
            <h3 class="section-title">核心状态</h3>
            <div class="stats-grid">
              <div class="stat-box">
                <Heart class="stat-icon text-red-400" :size="18" />
                <div class="stat-content">
                  <span class="stat-label">好感度</span>
                  <span class="stat-value">{{ status.favorability ?? '未知' }}</span>
                </div>
              </div>
              <div class="stat-box">
                <CheckCircle2 class="stat-icon text-purple-400" :size="18" />
                <div class="stat-content">
                  <span class="stat-label">服从度</span>
                  <span class="stat-value">{{ status.obedience ?? '未知' }}</span>
                </div>
              </div>
              <div class="stat-box">
                <Smile class="stat-icon text-yellow-400" :size="18" />
                <div class="stat-content">
                  <span class="stat-label">心情</span>
                  <span class="stat-value">{{ status.mood ?? '未知' }}</span>
                </div>
              </div>
              <div class="stat-box">
                <Users class="stat-icon text-blue-400" :size="18" />
                <div class="stat-content">
                  <span class="stat-label">关系</span>
                  <span class="stat-value">{{ status.relationship ?? '陌生人' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 生理/外观详情区块 -->
          <div class="info-section">
            <h3 class="section-title">外观与行为</h3>
            <div class="details-list">
              <div class="detail-row" v-if="status.action">
                <span class="detail-label">正在进行</span>
                <span class="detail-text text-green-300">{{ status.action }}</span>
              </div>
              <div class="detail-row" v-if="status.posture">
                <span class="detail-label">当前姿势</span>
                <span class="detail-text">{{ status.posture }}</span>
              </div>
              <div class="detail-row" v-if="status.clothing">
                <span class="detail-label">今日着装</span>
                <span class="detail-text">{{ status.clothing }}</span>
              </div>
              <div class="detail-row" v-if="status.residence">
                <span class="detail-label"><MapPin :size="14" class="inline mr-1"/>常住地</span>
                <span class="detail-text">{{ status.residence }}</span>
              </div>
              <div class="detail-row" v-if="status.power">
                <span class="detail-label"><Activity :size="14" class="inline mr-1"/>战斗力</span>
                <span class="detail-text text-orange-300">{{ status.power }}</span>
              </div>
            </div>
          </div>

          <!-- 敏感部位区块 (沙盒模式保留的字段) -->
          <div class="info-section">
            <h3 class="section-title">详细特征</h3>
            <div class="details-list tags-style">
              <span class="feature-tag" v-if="status.face">脸部: {{ status.face }}</span>
              <span class="feature-tag" v-if="status.mouth">嘴巴: {{ status.mouth }}</span>
              <span class="feature-tag" v-if="status.chest">胸部: {{ status.chest }}</span>
              <span class="feature-tag" v-if="status.hands">手部: {{ status.hands }}</span>
              <span class="feature-tag" v-if="status.buttocks">臀部: {{ status.buttocks }}</span>
              <span class="feature-tag" v-if="status.vagina">私处: {{ status.vagina }}</span>
              <span class="feature-tag" v-if="status.anus">后庭: {{ status.anus }}</span>
            </div>
          </div>


          
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gal-profile-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
}

.gal-profile-modal {
  width: 800px;
  max-width: 90vw;
  height: 600px;
  max-height: 85vh;
  background: linear-gradient(135deg, rgba(30, 20, 20, 0.95) 0%, rgba(15, 10, 10, 0.98) 100%);
  border: 1px solid rgba(220, 100, 80, 0.3);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  display: flex;
  overflow: hidden;
  opacity: 0;
  transform: rotateX(10deg) translateY(20px);
  transition: all 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.gal-profile-modal.is-open {
  opacity: 1;
  transform: rotateX(0deg) translateY(0);
}

/* 左侧大立绘 */
.profile-left {
  flex: 0 0 40%;
  position: relative;
  background: radial-gradient(circle at center, rgba(220, 100, 80, 0.15) 0%, transparent 70%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-right: 1px solid rgba(220, 100, 80, 0.2);
}

.profile-sprite {
  max-height: 110%;
  max-width: 140%;
  object-fit: cover;
  transform: translateY(5%);
  filter: drop-shadow(0 0 20px rgba(0,0,0,0.5));
  z-index: 2;
}

.sprite-glow {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 20px;
  background: rgba(220, 100, 80, 0.3);
  filter: blur(15px);
  border-radius: 50%;
  z-index: 1;
}

/* 右侧情报区 */
.profile-right {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  color: rgba(255,255,255,0.5);
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.close-btn:hover {
  color: #fff;
  transform: scale(1.1);
}

.profile-header {
  padding: 24px 32px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.char-name {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2px;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 10px rgba(220, 100, 80, 0.5);
}

.char-title {
  font-size: 0.9rem;
  color: rgba(220, 100, 80, 0.8);
}

.profile-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-scroll-area::-webkit-scrollbar {
  width: 6px;
}
.profile-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(220, 100, 80, 0.3);
  border-radius: 3px;
}

.section-title {
  font-size: 1.1rem;
  color: #fff;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title::before {
  content: '';
  display: block;
  width: 4px;
  height: 16px;
  background: #dc6450;
  border-radius: 2px;
}

/* 核心数值面板 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  opacity: 0.8;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}

/* 详情列表 */
.details-list {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.detail-label {
  width: 80px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
}

.detail-text {
  color: #ddd;
  font-size: 0.95rem;
  line-height: 1.4;
}

/* 标签列表 */
.tags-style {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  background: transparent;
  padding: 0;
}

.feature-tag {
  background: rgba(220, 100, 80, 0.15);
  border: 1px solid rgba(220, 100, 80, 0.3);
  color: #ffcccc;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
}


</style>
