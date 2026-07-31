<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGalgameStore } from '@/stores/galgame'
import { 
  Clock, 
  MapPin, 
  Coins, 
  Map as MapIcon, 
  Backpack, 
  Sparkles, 
  Zap, 
  ScrollText,
  User,
  Bookmark,
  LogOut
} from 'lucide-vue-next'

const gameStore = useGameStore()
const galgameStore = useGalgameStore()

const player = computed(() => gameStore.state.player)
const roundNumber = computed(() => galgameStore.currentRound)

// HP / MP 百分比计算
const hpPercent = computed(() => {
  if (!player.value || player.value.max_hp <= 0) return 0
  return Math.max(0, Math.min(100, (player.value.hp / player.value.max_hp) * 100))
})

const mpPercent = computed(() => {
  if (!player.value || player.value.max_mp <= 0) return 0
  return Math.max(0, Math.min(100, (player.value.mp / player.value.max_mp) * 100))
})

// 等级与声望换算
const playerLevel = computed(() => {
  if (!player.value) return 1
  return Math.floor((player.value.combatExp || 0) / 1000) + 1
})

const rankGrade = computed(() => {
  const rep = player.value?.reputation || 0
  if (rep > 5000) return 'S'
  if (rep > 2000) return 'A'
  if (rep > 1000) return 'B'
  if (rep > 500) return 'C'
  return 'D'
})

const rankTitle = computed(() => {
  const rep = player.value?.reputation || 0
  if (rep > 5000) return '幻想乡传说'
  if (rep > 2000) return '知名人物'
  if (rep > 1000) return '小有名气'
  if (rep > 500) return '崭露头角'
  return '名不见经传'
})

const LOCATIONS_MAP: Record<string, string> = {
  'hakurei-shrine': '博丽神社',
  'human-village': '人间之里',
  'misty-lake': '雾之湖',
  'sdm': '红魔馆',
  'magic-forest': '魔法森林',
  'bamboo-forest': '迷途竹林',
  'youkai-mountain': '妖怪之山',
  'former-hell': '旧地狱',
  'myouren-temple': '命莲寺',
  'sunflower-field': '太阳花田',
  'shimmy-castle': '辉针城',
  '未知': '博丽神社' // Mock 模式下如果未初始化则默认显示博丽神社
}

const locationName = computed(() => {
  const loc = player.value?.location
  if (!loc) return '未知地点'
  return LOCATIONS_MAP[loc] || loc
})

const emit = defineEmits([
  'open-inventory',
  'open-spells',
  'open-talents',
  'open-quests',
  'open-map',
  'open-history',
  'exit-galgame'
])
</script>

<template>
  <div class="gal-hud-container">
    
    <!-- 1. 玩家主卡片 (高层次感悬浮设计) -->
    <div class="gal-player-hud">
      <!-- 装饰线：背景科技刻度 -->
      <div class="gal-player-hud__deco-line"></div>

      <!-- 左侧：悬浮头像与等级角标 -->
      <div class="gal-player-hud__avatar-wrap">
        <div class="gal-player-hud__avatar">
          <User :size="24" stroke-width="1.5" color="rgba(255, 255, 255, 0.9)" />
          <div class="gal-player-hud__avatar-glitch"></div>
        </div>
        <!-- 突破边框的等级徽章 (增加Z轴层次感) -->
        <div class="gal-player-hud__level-badge">
          <span class="gal-player-hud__level-prefix">Lv</span>{{ playerLevel }}
        </div>
      </div>

      <!-- 右侧：信息与状态栏 -->
      <div class="gal-player-hud__info-wrap">
        <!-- 带有切角和渐变的底层背景 -->
        <div class="gal-player-hud__info-bg"></div>
        
        <div class="gal-player-hud__name-row">
          <span class="gal-player-hud__name">{{ player?.name || '玩家' }}</span>
          <div class="gal-player-hud__rank-box">
            <span class="gal-player-hud__rank-grade" :data-grade="rankGrade">{{ rankGrade }}</span>
            <span class="gal-player-hud__rank-title">{{ rankTitle }}</span>
          </div>
        </div>
        
        <!-- 状态条组 (通过粗细、透明度区分主次) -->
        <div class="gal-player-hud__bars">
          <!-- HP (主状态，加粗，带数字) -->
          <div class="gal-player-hud__bar-group gal-player-hud__bar-group--hp">
            <span class="gal-player-hud__bar-label text-touhou-red">HP</span>
            <div class="gal-player-hud__bar-track">
              <div class="gal-player-hud__bar-fill" :style="{ width: hpPercent + '%' }"></div>
            </div>
            <div class="gal-player-hud__bar-value">
              <span class="val-current">{{ player?.hp }}</span>
              <span class="val-max">/{{ player?.max_hp }}</span>
            </div>
          </div>
          
          <!-- MP (次状态，极细线条，弱化数字) -->
          <div class="gal-player-hud__bar-group gal-player-hud__bar-group--mp">
            <span class="gal-player-hud__bar-label text-blue-400">SP</span>
            <div class="gal-player-hud__bar-track">
              <div class="gal-player-hud__bar-fill" :style="{ width: mpPercent + '%' }"></div>
            </div>
            <div class="gal-player-hud__bar-value val-alt">
              {{ player?.mp }} / {{ player?.max_mp }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 环境情报区 (中上方独立悬浮舱) -->
    <div class="gal-env-hud">
      <div class="gal-env-hud__bg"></div>
      
      <div class="gal-env-hud__item">
        <Clock :size="14" class="gal-env-hud__icon text-izakaya-accent" />
        <span class="gal-env-hud__label">TURN</span>
        <span class="gal-env-hud__value">{{ String(roundNumber).padStart(2, '0') }}</span>
      </div>
      
      <div class="gal-env-hud__item">
        <MapPin :size="14" class="gal-env-hud__icon text-blue-400" />
        <span class="gal-env-hud__label">LOC</span>
        <span class="gal-env-hud__value">{{ locationName }}</span>
      </div>
      
      <div class="gal-env-hud__item">
        <Coins :size="14" class="gal-env-hud__icon text-yellow-400" />
        <span class="gal-env-hud__label">FUNDS</span>
        <span class="gal-env-hud__value">{{ (player?.money || 0).toLocaleString() }}</span>
      </div>
    </div>

    <!-- 3. 右侧垂直功能栏 (保留悬浮风格) -->
    <div class="gal-sidebar-tools">
      <button class="gal-tool-btn" @click="emit('open-inventory')">
        <Backpack :size="16" />
        <div class="gal-tool-btn__label">PACKAGE</div>
      </button>
      <button class="gal-tool-btn" @click="emit('open-spells')">
        <Sparkles :size="16" />
        <div class="gal-tool-btn__label">SPELLS</div>
      </button>
      <button class="gal-tool-btn" @click="emit('open-talents')">
        <Zap :size="16" />
        <div class="gal-tool-btn__label">TALENTS</div>
      </button>
      <button class="gal-tool-btn" @click="emit('open-quests')">
        <ScrollText :size="16" />
        <div class="gal-tool-btn__label">QUESTS</div>
      </button>
      
      <div class="gal-tool-divider"></div>
      
      <button class="gal-tool-btn gal-tool-btn--sys" @click="emit('open-map')">
        <MapIcon :size="16" />
        <div class="gal-tool-btn__label">MAP</div>
      </button>
      <button class="gal-tool-btn gal-tool-btn--sys" @click="emit('open-history')">
        <Bookmark :size="16" />
        <div class="gal-tool-btn__label">LOG</div>
      </button>
      <button class="gal-tool-btn gal-tool-btn--danger" @click="emit('exit-galgame')">
        <LogOut :size="16" />
        <div class="gal-tool-btn__label">EXIT</div>
      </button>
    </div>

  </div>
</template>

<style scoped>
/* 容器不占位置，供内部绝对定位 */
.gal-hud-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 60;
  font-family: 'Oswald', 'DIN Alternate', 'Inter', sans-serif;
}

/* ====================================================
   1. 玩家主卡片 (高层次感悬浮设计)
   ==================================================== */
.gal-player-hud {
  position: absolute;
  top: 24px;
  left: 32px;
  width: 360px; /* Slightly wider to accommodate spacing */
  display: flex;
  align-items: center;
  gap: 16px; /* Increased gap */
  pointer-events: auto;
}

/* 背后的虚线装饰轨道，增加视觉延伸感 */
.gal-player-hud__deco-line {
  position: absolute;
  left: 20px;
  right: -40px;
  bottom: -4px;
  height: 1px;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 4px, transparent 4px, transparent 8px);
  z-index: -2;
}

/* --- 头像包装区 (Z轴最高，凸出设计) --- */
.gal-player-hud__avatar-wrap {
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.gal-player-hud__avatar {
  width: 44px; /* 缩减至 44px，同 FreeActivityPanel 角色头像 */
  height: 44px;
  background: rgba(255, 255, 255, 0.05); /* 轻量级透明淡色 */
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%);
  box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
  position: relative;
}

/* 头像框内部的光效点缀 */
.gal-player-hud__avatar-glitch {
  position: absolute;
  top: -1px; left: -1px;
  width: 8px; height: 8px;
  border-top: 2px solid #4a9eff;
  border-left: 2px solid #4a9eff;
}

/* 等级角标 (悬浮于头像右下角，打破边界) */
.gal-player-hud__level-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: #ff4a4a;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0px 6px;
  clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
  box-shadow: 2px 2px 4px rgba(255, 74, 74, 0.4);
  border-left: 1px solid rgba(255,255,255,0.5);
}
.gal-player-hud__level-prefix {
  font-size: 0.55rem;
  margin-right: 2px;
  opacity: 0.9;
}

/* --- 核心信息区 (带透明底板) --- */
.gal-player-hud__info-wrap {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 16px 6px 12px;
  z-index: 1;
}

.gal-player-hud__info-bg {
  position: absolute;
  inset: 0;
  /* Add repeating diagonal stripes for texture */
  background: 
    linear-gradient(90deg, rgba(20, 10, 8, 0.9) 0%, rgba(20, 10, 8, 0.5) 60%, transparent 100%),
    repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px);
  backdrop-filter: blur(4px);
  /* Aggressive cut on the right */
  clip-path: polygon(0 0, 92% 0, 100% 100%, 0 100%);
  border-left: 3px solid #4a9eff; 
  z-index: -1;
}

.gal-player-hud__name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}
.gal-player-hud__name {
  font-size: 1rem;
  color: #fff;
  letter-spacing: 0.1em;
  font-family: "Noto Serif SC", serif;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}

/* 分离的 Rank 设计 */
.gal-player-hud__rank-box {
  display: flex;
  align-items: center;
  background: rgba(0,0,0,0.4);
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.gal-player-hud__rank-grade {
  padding: 0 6px;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 0.7rem;
  color: #000;
  background: #cbd5e1; /* Default D */
}
.gal-player-hud__rank-grade[data-grade="S"] { background: #fbbf24; }
.gal-player-hud__rank-grade[data-grade="A"] { background: #f87171; }
.gal-player-hud__rank-grade[data-grade="B"] { background: #60a5fa; }
.gal-player-hud__rank-grade[data-grade="C"] { background: #34d399; }

.gal-player-hud__rank-title {
  padding: 0 6px;
  font-size: 0.6rem;
  color: rgba(255,255,255,0.8);
  letter-spacing: 0.05em;
}

/* --- 状态条群组 (通过粗细区分层级) --- */
.gal-player-hud__bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gal-player-hud__bar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gal-player-hud__bar-label {
  width: 14px;
  font-size: 0.65rem;
  font-weight: 700;
  text-shadow: 1px 1px 0 #000;
}

.gal-player-hud__bar-track {
  flex: 1;
  background: rgba(0,0,0,0.6);
  position: relative;
  clip-path: polygon(0 0, 100% 0, 98% 100%, 0 100%);
}

.gal-player-hud__bar-fill {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  transition: width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.gal-player-hud__bar-value {
  font-family: monospace;
  text-align: right;
}

/* HP 样式 (粗大突出) */
.gal-player-hud__bar-group--hp .gal-player-hud__bar-track {
  height: 6px;
  border: 1px solid rgba(255,255,255,0.05);
}
.gal-player-hud__bar-group--hp .gal-player-hud__bar-fill {
  background: #ff4a4a;
  box-shadow: 0 0 8px rgba(255, 74, 74, 0.6);
}
.gal-player-hud__bar-group--hp .val-current {
  font-size: 0.8rem;
  font-weight: bold;
  color: #fff;
}
.gal-player-hud__bar-group--hp .val-max {
  font-size: 0.55rem;
  color: rgba(255,255,255,0.5);
}

/* MP 样式 (纤细次要) */
.gal-player-hud__bar-group--mp .gal-player-hud__bar-track {
  height: 2px; /* 极细线条 */
}
.gal-player-hud__bar-group--mp .gal-player-hud__bar-fill {
  background: #4a9eff;
  box-shadow: 0 0 6px rgba(74, 158, 255, 0.6);
}
.gal-player-hud__bar-group--mp .val-alt {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.6);
}

/* ====================================================
   2. 环境情报区 (中上方独立悬浮舱)
   ==================================================== */
.gal-env-hud {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 32px;
  pointer-events: auto;
}

.gal-env-hud__bg {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(90deg, rgba(20,10,8,0) 0%, rgba(20,10,8,0.6) 15%, rgba(20,10,8,0.6) 85%, rgba(20,10,8,0) 100%),
    repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 6px);
  backdrop-filter: blur(4px);
  border-top: 1px solid rgba(255,255,255,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  clip-path: polygon(4% 0, 96% 0, 100% 100%, 0 100%);
  z-index: -1;
}

.gal-env-hud__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.gal-env-hud__icon {
  opacity: 0.9;
  transform: translateY(2px);
}
.gal-env-hud__label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.1em;
}
.gal-env-hud__value {
  font-size: 1.05rem;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}

/* ====================================================
   3. 右侧垂直功能栏 (紧贴屏幕右边缘)
   ==================================================== */
.gal-sidebar-tools {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px; /* 减小间距 */
  pointer-events: auto;
}

.gal-tool-btn {
  position: relative;
  width: 40px; /* 稍微缩小 */
  height: 40px;
  background: rgba(10, 5, 5, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  clip-path: polygon(25% 0, 100% 0, 100% 100%, 0 100%, 0 25%);
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  backdrop-filter: blur(6px);
}

.gal-tool-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateX(-4px);
}

.gal-tool-btn--sys {
  background: rgba(20, 30, 40, 0.7);
}
.gal-tool-btn--sys:hover {
  background: rgba(60, 100, 140, 0.8);
  border-right: 3px solid #4a9eff;
}

.gal-tool-btn--danger {
  background: rgba(40, 10, 10, 0.7);
}
.gal-tool-btn--danger:hover {
  background: #ff4a4a;
  color: #fff;
  border-right: 3px solid #ff4a4a;
}

.gal-tool-divider {
  height: 2px;
  width: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px auto;
}

/* 悬停滑出文字提示 */
.gal-tool-btn__label {
  position: absolute;
  right: 48px;
  background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%);
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: bold;
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
  border-right: 2px solid rgba(255,255,255,0.5);
}

.gal-tool-btn:hover .gal-tool-btn__label {
  opacity: 1;
  transform: translateX(0);
}
</style>
