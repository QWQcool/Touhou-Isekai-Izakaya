<script setup lang="ts">
/**
 * GalgameEngine.vue — Galgame 模式根容器（居酒屋风 UI）
 *
 * 五阶段状态机驱动：idle / loading / opening / free_activity / ending
 * 开场阶段：纯净（背景 + 立绘 + 对话框）
 * 自由活动：左侧角色卡 + 右侧事件 + 底部多功能对话框
 */

import { computed, ref, watch } from 'vue'
import { useGalgameStore } from '@/stores/galgame'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'
import { galgameLoop } from '@/services/galgameLoop'
import { audioManager } from '@/services/audio'
import BackgroundLayer from './BackgroundLayer.vue'
import SpriteLayer from './SpriteLayer.vue'
import DialogueBox from './DialogueBox.vue'
import FreeActivityPanel from './FreeActivityPanel.vue'
import GalgameSpells from './GalgameSpells.vue'
import GalgameTalents from './GalgameTalents.vue'
import GalgameQuestOffer from './GalgameQuestOffer.vue'
import GalgamePromiseOffer from './GalgamePromiseOffer.vue'
import GalgameHUD from './GalgameHUD.vue'
import GalgameSystemMenu from './GalgameSystemMenu.vue'
import GalgameMapFullscreen from './GalgameMapFullscreen.vue'
import GalgameCharacterProfile from './GalgameCharacterProfile.vue'
import GalgameNewGameWizard from './GalgameNewGameWizard.vue'
import { Loader2, Play, Sparkles } from 'lucide-vue-next'
import { useSaveStore } from '@/stores/save'
import { useToastStore } from '@/stores/toast'
import { useChatStore } from '@/stores/chat'

const galgameStore = useGalgameStore()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()
const saveStore = useSaveStore()
const toastStore = useToastStore()
const chatStore = useChatStore()

/** 退出 Galgame 模式，回到沙盒 */
function exitGalgame() {
  galgameStore.resetState()
  settingsStore.playMode = 'sandbox'
}

/** 控制阶段显示 */
const phase = computed(() => galgameStore.phase)
const isLoading = computed(() => galgameLoop.isProcessing.value)
const loadingText = computed(() => galgameLoop.processingStage.value)
const roundNumber = computed(() => galgameStore.currentRound)

/** 沉浸式建档向导状态 */
const showNewGameWizard = ref(false)
const playerMoney = computed(() => gameStore.state?.player?.money ?? 0)

/** 暖光粒子数组 */
const particles = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 15, // 打散延迟
  duration: 10 + Math.random() * 15, // 放慢上升速度
  size: 3 + Math.random() * 12
}))

/** 点击画面：推进对话（开场叙事 + 自由活动的交互结果） */
function handleScreenClick() {
  if (showHistoryLog.value) return // 历史记录打开时不推进
  if (phase.value === 'opening') {
    galgameStore.advanceOpening()
  } else if (phase.value === 'free_activity' && galgameStore.activeResultDialogues.length > 0) {
    galgameStore.advanceResultDialogue()
  }
}

/** 鼠标中键：回退到上一条对话 */
function handleMiddleClick(e: MouseEvent) {
  if (e.button === 1) {
    e.preventDefault()
    if (phase.value === 'opening') {
      galgameStore.goBackOpening()
    }
  }
}

/** 历史记录浮层 */
const showHistoryLog = ref(false)
function toggleHistoryLog() {
  openSystemMenu('history')
}

/** 系统菜单浮层 */
const isSystemMenuOpen = ref(false)
const isMapOpen = ref(false)
const activeSystemTab = ref('inventory')
const inspectingCharacterName = ref<string | null>(null)

function openSystemMenu(tab: string) {
  activeSystemTab.value = tab
  isSystemMenuOpen.value = true
}

/** 开始回合按钮 */
function handleStartRound() {
  if (galgameStore.currentRound === 0) {
    // 启动沉浸式开场建档
    showNewGameWizard.value = true
  } else {
    // 已经有存档，直接推进
    galgameLoop.startNewRound()
  }
}

/** 沉浸式建档完成，初始化世界并开局 */
async function handleWizardComplete(data: any) {
  showNewGameWizard.value = false
  galgameStore.phase = 'loading'
  
  // 1. 若当前没有任何存档，创建一个专属的新存档（复用沙盒存档体系）
  if (!saveStore.currentSaveId) {
    const slgSaves = saveStore.saves.filter(s => s.name.startsWith('SLG'))
    let nextNum = 1
    if (slgSaves.length > 0) {
      const nums = slgSaves.map(s => {
        const match = s.name.match(/^SLG(\d+)$/)
        return match ? parseInt(match[1]) : 0
      })
      nextNum = Math.max(...nums, 0) + 1
    }
    const saveName = `SLG${nextNum}`
    const newSaveId = await saveStore.createSave(saveName, false)
    await saveStore.switchSave(newSaveId)
  }

  // 2. 注入建档基础数据到 gameStore
  gameStore.updatePlayer({
    name: data.name,
    persona: data.persona,
    hp: data.stats.hp,
    max_hp: data.stats.max_hp,
    mp: data.stats.mp,
    max_mp: data.stats.max_mp,
    money: data.stats.money,
    power: data.stats.power,
    identity: data.stats.identity,
    clothing: data.stats.clothing,
    location: data.stats.location,
    time: data.stats.time,
    date: data.stats.date,
    items: data.stats.items || [],
    authorities: data.stats.authorities || [],
    spell_cards: data.stats.spell_cards || []
  })

  // 3. 注入系统难度
  if (data.difficulty) {
    const currentSystem = gameStore.state.system
    gameStore.updateState({
      system: { ...currentSystem, difficulty: data.difficulty }
    })
  }

  // 4. 同步沙盒模式底层的持久化逻辑 (注入开场引导词并创建快照)
  if (data.initialMessage) {
    chatStore.addMessage('system', data.initialMessage)
  }
  await chatStore.createInitialSnapshot()

  // 5. 正式启动第一回合！
  galgameLoop.startNewRound()
}

function handleAdvanceResultDialogue() {
  const effectsToApply = galgameStore.advanceResultDialogue()
  if (effectsToApply && effectsToApply.length > 0) {
    // 还需要检查战斗事件
    const combatEffect = effectsToApply.find(e => e.type === 'combat_trigger')
    if (combatEffect) {
      console.log('[Galgame] 对话结束，触发挂起的战斗事件:', combatEffect);
      window.dispatchEvent(
        new CustomEvent('galgame-combat-start', {
          detail: { effect: combatEffect },
        })
      );
    }
    galgameLoop.applyEffects(effectsToApply)
  }
}

/** 结束自由活动 */
async function handleEndFreeActivity() {
  await galgameLoop.endCurrentRound()
  await galgameLoop.startNewRound()
}
</script>

<template>
  <div class="gal-engine" @click="handleScreenClick" @mousedown.middle.prevent="handleMiddleClick">

    <!-- ===== Layer 1: 背景 ===== -->
    <div class="gal-layer gal-layer--bg">
      <BackgroundLayer :bg="galgameStore.currentBg" />
      <!-- 暖色氛围叠加 -->
      <div class="gal-ambience"></div>
    </div>

    <!-- ===== 暖光粒子 ===== -->
    <div class="gal-layer gal-layer--particles">
      <div
        v-for="p in particles"
        :key="p.id"
        class="gal-particle"
        :style="{
          left: p.left + '%',
          animationDelay: p.delay + 's',
          animationDuration: p.duration + 's',
          width: p.size + 'px',
          height: p.size + 'px',
        }"
      ></div>
    </div>

    <!-- ===== Layer 2: 立绘 ===== -->
    <div class="gal-layer gal-layer--sprite">
      <SpriteLayer
        v-if="phase === 'opening' || phase === 'free_activity'"
        :speaker="galgameStore.currentSpeaker"
        :emotion="galgameStore.currentEmotion"
        :sprite-path="galgameStore.currentSpritePath"
        :scene-characters="galgameStore.sceneCharacters"
        :phase="phase"
        @select-character="(name: string) => { galgameStore.selectCharacter(name); galgameStore.advanceIdleDialogue() }"
        @view-details="(name: string) => inspectingCharacterName = name"
      />
    </div>

    <!-- ===== Layer 3: 对话框 ===== -->
    <div class="gal-layer gal-layer--dialogue">
      <DialogueBox
        v-if="(phase === 'opening' || phase === 'free_activity') && galgameStore.currentText"
        :speaker="galgameStore.currentSpeaker"
        :emotion="galgameStore.currentEmotion"
        :text="galgameStore.currentText"
        :is-opening="phase === 'opening'"
        :is-last="galgameStore.isOpeningFinished"
        @go-back="galgameStore.goBackOpening()"
        @toggle-history="toggleHistoryLog"
      />
    </div>

    <!-- ===== 交互结果对话：透明点击覆盖层（点击任意位置推进） ===== -->
    <div
      v-if="phase === 'free_activity' && galgameStore.activeResultDialogues.length > 0"
      class="gal-click-capture"
      @click.stop="handleAdvanceResultDialogue"
    ></div>

    <!-- ===== Layer 4: 自由活动 HUD（仅 free_activity 阶段） ===== -->
    <div class="gal-layer gal-layer--hud" v-if="phase === 'free_activity'">
      <!-- 顶栏状态与快捷菜单 (常驻且沉浸式) -->
      <GalgameHUD 
        @open-map="isMapOpen = true"
        @open-inventory="openSystemMenu('inventory')"
        @open-spells="openSystemMenu('spells')"
        @open-talents="openSystemMenu('talents')"
        @open-quests="openSystemMenu('quests')"
        @open-history="toggleHistoryLog"
        @exit-galgame="exitGalgame"
      />

      <!-- 自由活动面板（角色卡 + 事件 + 结束按钮） -->
      <FreeActivityPanel @end-activity="handleEndFreeActivity" />
    </div>

    <!-- ===== 状态覆盖层 ===== -->

    <!-- 标题画面（idle） -->
    <Transition name="gal-fade">
      <div v-if="phase === 'idle' && !isLoading" class="gal-overlay gal-overlay--idle">
        <!-- 装饰灯笼 -->
        <div class="gal-title-lantern gal-title-lantern--left"></div>
        <div class="gal-title-lantern gal-title-lantern--right"></div>

        <div class="gal-title">
          <div class="gal-title__deco">❖</div>
          <h1 class="gal-title__main">東方異界食堂</h1>
          <div class="gal-title__sub">— 物 語 モ ー ド —</div>
          <div class="gal-title__line"></div>

          <button class="gal-title__start" @click.stop="handleStartRound">
            <Play :size="18" />
            <span>{{ galgameLoop.mockMode.value ? '【测试】' : '' }}{{ roundNumber > 0 ? '続きから' : '冒険を始める' }}</span>
          </button>

          <label class="gal-title__mock" @click.stop>
            <input
              type="checkbox"
              :checked="galgameLoop.mockMode.value"
              @change="galgameLoop.mockMode.value = !galgameLoop.mockMode.value"
            />
            <span>测试模式</span>
          </label>
        </div>
      </div>
    </Transition>

    <!-- 加载中 -->
    <Transition name="gal-fade">
      <div v-if="isLoading" class="gal-overlay gal-overlay--loading">
        <div class="gal-loading">
          <div class="gal-loading__spinner"></div>
          <span class="gal-loading__text">{{ loadingText || '準備中...' }}</span>
        </div>
      </div>
    </Transition>

    <!-- 回合结束处理 -->
    <Transition name="gal-fade">
      <div v-if="phase === 'ending'" class="gal-overlay gal-overlay--ending">
        <div class="gal-loading">
          <Sparkles class="gal-loading__icon" />
          <span class="gal-loading__text">物語を紡いでいます...</span>
        </div>
      </div>
    </Transition>

    <!-- ===== Layer 6: 系统菜单枢纽 (System Menu Modal) ===== -->
    <GalgameSystemMenu
      :is-open="isSystemMenuOpen"
      :default-tab="activeSystemTab"
      @close="isSystemMenuOpen = false"
    />

    <!-- 独立沉浸式地图 -->
    <GalgameMapFullscreen 
      :is-open="isMapOpen"
      @close="isMapOpen = false"
    />

    <!-- 弹窗 (Missions / Promises) -->
    <GalgameQuestOffer />
    <GalgamePromiseOffer />
    
    <!-- ===== 角色详细情报浮层 ===== -->
    <GalgameCharacterProfile
      v-if="inspectingCharacterName"
      :character-name="inspectingCharacterName"
      @close="inspectingCharacterName = null"
    />

    <!-- ===== 3A级沉浸式建档开场 ===== -->
    <GalgameNewGameWizard 
      v-if="showNewGameWizard"
      @complete="handleWizardComplete"
    />
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════
   居酒屋风 Design Token
   ═══════════════════════════════════════ */
.gal-engine {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #0d0806;
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;

  --wood-deep: #1a0f0a;
  --wood-mid: #2d1b12;
  --wood-light: #3d2a1c;
  --amber: #d4a574;
  --amber-dim: rgba(212, 165, 116, 0.6);
  --lantern-red: #b43c3c;
  --lantern-glow: rgba(180, 60, 60, 0.25);
  --gold: #c8a45e;
  --gold-dim: rgba(200, 164, 94, 0.4);
  --sake-white: #f5f0e8;
  --sake-dim: rgba(245, 240, 232, 0.7);
  --ink: #e8ddd0;
  --panel-bg: rgba(26, 15, 10, 0.88);
  --panel-border: rgba(200, 164, 94, 0.18);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ═══════════════════════════════════════
   图层系统
   ═══════════════════════════════════════ */
.gal-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gal-layer--bg        { z-index: 1; }
.gal-layer--particles { z-index: 2; }
.gal-layer--sprite    { z-index: 10; /* pointer-events 由 SpriteLayer 内部控制 */ }
.gal-layer--dialogue  { z-index: 20; }
.gal-layer--hud       { z-index: 30; }

/* 交互结果对话时的透明点击覆盖层 */
.gal-click-capture {
  position: absolute;
  inset: 0;
  z-index: 55;
  cursor: pointer;
}

/* ═══════════════════════════════════════
   暖色氛围叠加
   ═══════════════════════════════════════ */
.gal-ambience {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 30% 80%, rgba(180, 100, 40, 0.12) 0%, transparent 70%),
    radial-gradient(ellipse 60% 40% at 70% 20%, rgba(120, 60, 20, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

/* ═══════════════════════════════════════
   氛围粒子 (Cinematic Light Motes)
   ═══════════════════════════════════════ */
.gal-particle {
  position: absolute;
  bottom: -10vh;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 230, 200, 0.9) 0%, rgba(255, 200, 150, 0.4) 40%, transparent 70%);
  animation: gal-float-up linear infinite;
  pointer-events: none;
  opacity: 0;
  filter: blur(1px) drop-shadow(0 0 10px rgba(255, 180, 120, 0.6));
}
@keyframes gal-float-up {
  0%   { transform: translateY(0) scale(0.3); opacity: 0; }
  20%  { opacity: 0.8; }
  50%  { opacity: 0.5; transform: translateY(-50vh) scale(1.2) translateX(15px); }
  80%  { opacity: 0.2; }
  100% { transform: translateY(-110vh) scale(0.4) translateX(-15px); opacity: 0; }
}

/* ═══════════════════════════════════════
   浮动顶栏
   ═══════════════════════════════════════ */
.gal-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  pointer-events: none;
}
.gal-topbar > * { pointer-events: auto; }

.gal-topbar__left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.gal-topbar__right {
  display: flex;
  gap: 6px;
}

/* 徽章 (Cinematic HUD Style) */
.gal-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 10px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 3px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Oswald', 'DIN Alternate', sans-serif;
  letter-spacing: 0.1em;
  font-size: 0.9rem;
  clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%);
  transition: all 300ms ease;
}
.gal-badge:hover {
  background: rgba(20, 10, 8, 0.6);
  border-left-color: rgba(255, 255, 255, 0.6);
  transform: translateX(2px);
}
.gal-badge--round { border-left-color: #ff4a4a; }
.gal-badge--round .gal-badge__icon { color: #ff4a4a; }
.gal-badge--round:hover { border-left-color: #ff6b6b; }

.gal-badge--money { border-left-color: #f0b478; }
.gal-badge--money .gal-badge__icon { color: #f0b478; }
.gal-badge--money:hover { border-left-color: #f0c896; }

.gal-badge__label { color: rgba(255,255,255,0.4); font-size: 0.75rem; margin-right: 4px; }
.gal-badge__value { color: #fff; font-weight: 500; font-family: inherit; }

/* 顶栏按钮 */
.gal-topbar__btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 10, 8, 0.4);
  backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.gal-topbar__btn:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(25, 15, 12, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.3);
}

/* ═══════════════════════════════════════
   覆盖层基类
   ═══════════════════════════════════════ */
.gal-overlay {
  position: absolute;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

/* ═══════════════════════════════════════
   标题画面
   ═══════════════════════════════════════ */
.gal-overlay--idle {
  background:
    radial-gradient(ellipse 120% 80% at 50% 60%, rgba(45, 27, 18, 0.6) 0%, rgba(13, 8, 6, 0.95) 70%),
    linear-gradient(180deg, rgba(13,8,6,0.3) 0%, rgba(13,8,6,1) 100%);
}

/* 装饰灯笼 */
.gal-title-lantern {
  position: absolute;
  width: 60px;
  height: 100px;
  background: radial-gradient(ellipse at center, rgba(180,60,60,0.15) 0%, transparent 70%);
  border-radius: 50%;
  animation: gal-lantern-sway 4s ease-in-out infinite;
}
.gal-title-lantern--left  { top: 8%; left: 15%; animation-delay: 0s; }
.gal-title-lantern--right { top: 12%; right: 18%; animation-delay: 2s; }
@keyframes gal-lantern-sway {
  0%, 100% { transform: rotate(-3deg) translateY(0); }
  50%      { transform: rotate(3deg) translateY(-5px); }
}

.gal-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: gal-title-enter 1s ease-out;
}
@keyframes gal-title-enter {
  from { opacity: 0; transform: translateY(30px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.gal-title__deco {
  font-size: 1.2rem;
  color: var(--gold-dim);
  letter-spacing: 1em;
  margin-bottom: -4px;
}

.gal-title__main {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 900;
  background: linear-gradient(135deg, var(--amber), #e8c4a0, var(--gold), var(--amber));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.15em;
  filter: drop-shadow(0 2px 8px rgba(200, 164, 94, 0.3));
  animation: gal-shimmer 6s ease-in-out infinite;
}
@keyframes gal-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}

.gal-title__sub {
  font-size: 0.95rem;
  color: var(--sake-dim);
  letter-spacing: 0.4em;
  font-weight: 400;
}

.gal-title__line {
  width: 120px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
  margin: 8px 0 16px;
}

.gal-title__start {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 40px;
  background: linear-gradient(135deg, var(--lantern-red), #8c2828);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px 24px 6px 24px; /* 非对称圆角 */
  color: var(--sake-white);
  font-size: 1.05rem;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 0.15em;
  cursor: pointer;
  box-shadow:
    0 4px 20px var(--lantern-glow),
    0 8px 32px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.1);
  transition: all 350ms var(--ease-spring);
}
.gal-title__start:hover {
  transform: scale(1.04) translateY(-2px);
  box-shadow:
    0 6px 28px rgba(180,60,60,0.45),
    0 12px 40px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.15);
}
.gal-title__start:active {
  transform: scale(0.97);
}

.gal-title__mock {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  margin-top: 4px;
  font-size: 0.75rem;
  color: rgba(245,240,232,0.3);
  transition: color 200ms ease;
}
.gal-title__mock:hover { color: rgba(245,240,232,0.5); }
.gal-title__mock input {
  accent-color: var(--lantern-red);
  cursor: pointer;
}

/* ═══════════════════════════════════════
   加载覆盖层
   ═══════════════════════════════════════ */
.gal-overlay--loading,
.gal-overlay--ending {
  background: rgba(13,8,6,0.8);
  backdrop-filter: blur(6px);
}

.gal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.gal-loading__spinner {
  width: 40px;
  height: 40px;
  border: 2px solid rgba(212,165,116,0.15);
  border-top-color: var(--amber);
  border-radius: 50%;
  animation: gal-spin 1s linear infinite;
}

.gal-loading__icon {
  width: 36px;
  height: 36px;
  color: var(--gold);
  animation: gal-pulse 1.5s ease-in-out infinite;
}

.gal-loading__text {
  font-size: 0.9rem;
  color: var(--amber-dim);
  letter-spacing: 0.12em;
}

@keyframes gal-spin {
  to { transform: rotate(360deg); }
}
@keyframes gal-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.15); }
}

/* ═══════════════════════════════════════
   过渡动画
   ═══════════════════════════════════════ */
.gal-fade-enter-active { transition: opacity 400ms ease; }
.gal-fade-leave-active { transition: opacity 300ms ease; }
.gal-fade-enter-from,
.gal-fade-leave-to { opacity: 0; }

/* ═══════════════════════════════════════
   历史记录浮层
   ═══════════════════════════════════════ */
.gal-layer--history {
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(13,8,6,0.7);
  backdrop-filter: blur(6px);
  pointer-events: auto;
}
.gal-history {
  width: min(90%, 720px);
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(26,15,10,0.96), rgba(45,27,18,0.98));
  border: 1px solid rgba(200,164,94,0.2);
  border-radius: 4px 16px 4px 16px;
  box-shadow: 0 12px 60px rgba(0,0,0,0.6);
  overflow: hidden;
}
.gal-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(200,164,94,0.1);
}
.gal-history__title {
  font-size: 0.9rem;
  color: var(--amber);
  letter-spacing: 0.1em;
  font-weight: 600;
}
.gal-history__close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba(200,164,94,0.12);
  border-radius: 4px;
  color: rgba(200,164,94,0.4);
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 200ms ease;
}
.gal-history__close:hover {
  color: var(--amber);
  border-color: rgba(200,164,94,0.3);
}
.gal-history__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.gal-history__line {
  padding: 10px 0;
  border-bottom: 1px solid rgba(200,164,94,0.05);
}
.gal-history__line:last-child { border-bottom: none; }
.gal-history__speaker {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--lantern-red);
  margin-bottom: 4px;
  padding: 2px 8px;
  background: rgba(180,60,60,0.12);
  border-radius: 3px;
}
.gal-history__speaker--narr {
  color: var(--gold-dim);
  background: rgba(200,164,94,0.08);
}
.gal-history__text {
  font-size: 0.88rem;
  line-height: 1.8;
  color: var(--sake-white);
  margin: 4px 0 0;
  white-space: pre-wrap;
}
.gal-history__line--narration .gal-history__text {
  color: var(--amber-dim);
  font-style: italic;
}
.gal-history__empty {
  text-align: center;
  padding: 40px;
  color: rgba(200,164,94,0.25);
  font-size: 0.85rem;
}
</style>
