<script setup lang="ts">
/**
 * FreeActivityPanel.vue — 自由活动 SLG 面板（居酒屋风）
 *
 * 布局：
 *   左侧：斜切角色卡片栏（浮动）
 *   右侧：特殊事件卷轴浮窗
 *   底部：多功能对话框区域（角色台词 / 交互选项 / 自定义输入）
 */

import { ref, computed, nextTick } from 'vue'
import { useGalgameStore } from '@/stores/galgame'
import { useGameStore } from '@/stores/game'
import { galgameLoop } from '@/services/galgameLoop'
import { resolveSpritePath } from '@/services/spriteResolver'
import type { Interaction, SpecialEvent } from '@/types/galgame'
import {
  MessageSquare,
  Gift,
  Swords,
  Scroll,
  Hexagon,
  ArrowLeft,
  Send,
  Sparkles,
  PenTool,
  LogOut,
  X,
  Target,
  HelpCircle
} from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'end-activity'): void
}>()

const galgameStore = useGalgameStore()
const gameStore = useGameStore()

/** 自定义对话 */
const customChatInput = ref('')
const customChatLoading = ref(false)
const showCustomChat = ref(false)
const chatInputRef = ref<HTMLInputElement | null>(null)

// 结束回合与引导模态框
const showEndModal = ref(false)
const guidanceText = ref('')
const showGuidanceDetails = ref(false)

/** 当前选中角色信息 */
const selectedChar = computed(() => {
  if (!galgameStore.selectedCharacter) return null
  return galgameStore.sceneCharacters.find(
    (c) => c.name === galgameStore.selectedCharacter
  ) ?? null
})

/** 是否有交互结果对话在播放 */
const hasActiveResult = computed(() => galgameStore.activeResultDialogues.length > 0)

/** 未触发的特殊事件 */
const availableEvents = computed(() => {
  return galgameStore.specialEvents.filter((e) => !e.triggered)
})

/** 角色头像路径 */
function getCharAvatar(name: string): string {
  return `/src/assets/images/head/${name}_头像.png`
}

function getPortraitSrc(charName: string) {
  const c = galgameStore.sceneCharacters.find((x) => x.name === charName)
  const emo = c ? c.default_emotion : '常规'
  return resolveSpritePath(charName, emo)
}

function confirmEndActivity() {
  if (guidanceText.value.trim()) {
    galgameStore.narrativeGuidance = guidanceText.value.trim()
  }
  showEndModal.value = false
  guidanceText.value = ''
  emit('end-activity')
}

/** 选中角色 */
function handleSelectCharacter(name: string) {
  galgameStore.selectCharacter(name)
  galgameStore.advanceIdleDialogue()
  showCustomChat.value = false
}

/** 执行交互 */
function handleInteraction(interaction: Interaction, charName: string) {
  if (!galgameStore.selectedCharacter) return
  if (galgameStore.executedActions[charName]?.includes(interaction.label)) return // 防止重复执行

  galgameStore.executeInteraction(
    galgameStore.selectedCharacter,
    interaction
  )
}

/** 推进结果对话 */
function handleAdvanceResult() {
  galgameStore.advanceResultDialogue()
}

/** 触发特殊事件 */
function handleSpecialEvent(event: SpecialEvent) {
  galgameStore.triggerSpecialEvent(event)
}

/** 进入自定义对话模式 */
function enterCustomChat() {
  showCustomChat.value = true
  nextTick(() => chatInputRef.value?.focus())
}

/** 发送自定义对话 */
async function handleCustomChat() {
  if (!customChatInput.value.trim() || !galgameStore.selectedCharacter) return
  customChatLoading.value = true
  try {
    const reply = await galgameLoop.customChat(
      galgameStore.selectedCharacter,
      customChatInput.value.trim()
    )
    galgameStore.currentText = reply
    galgameStore.currentSpeaker = galgameStore.selectedCharacter
    customChatInput.value = ''
  } finally {
    customChatLoading.value = false
  }
}
</script>

<template>
  <div class="fa" @click.stop>

    <!-- ========== 左侧：角色卡 + 交互下拉 (Cinematic HUD Style) ========== -->
    <div class="fa-chars">
      <template v-for="(char, index) in galgameStore.sceneCharacters" :key="char.name">
        <!-- 角色卡片 (HUD Style) -->
        <div
          class="fa-char-card"
          :class="{ 'fa-char-card--active': galgameStore.selectedCharacter === char.name }"
          @click="handleSelectCharacter(char.name)"
        >
          <div class="fa-char-card__avatar">
            <img
              :src="getCharAvatar(char.name)"
              :alt="char.name"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
            <div class="fa-char-card__avatar-overlay"></div>
          </div>
          <div class="fa-char-card__info">
            <div class="fa-char-card__header">
              <span class="fa-char-card__name">{{ char.name }}</span>
              <span class="fa-char-card__status">READY</span>
            </div>
            <div class="fa-char-card__favor-bar">
              <div class="fa-char-card__favor-fill"></div>
            </div>
          </div>
          
          <!-- 选中时的十字准星 -->
          <div v-if="galgameStore.selectedCharacter === char.name" class="fa-char-card__target">
            <Target :size="16" />
          </div>
          
          <!-- 边框修饰 -->
          <div class="fa-char-card__bracket fa-char-card__bracket--tl"></div>
          <div class="fa-char-card__bracket fa-char-card__bracket--br"></div>
        </div>

        <!-- 选中后展开的交互选项 (HUD Action Menu) -->
        <Transition name="fa-dropdown">
          <div
            v-if="galgameStore.selectedCharacter === char.name && !showCustomChat"
            class="fa-dropdown"
          >
            <div class="fa-dropdown__line"></div>
            <!-- 1. 对话 (无限次数，随机闲聊) -->
            <button
              class="fa-dropdown__btn"
              @click.stop="galgameStore.advanceIdleDialogue()"
            >
              <div class="fa-btn-bg"></div>
              <div class="fa-dropdown__type">
                <MessageSquare :size="14" stroke-width="1.5" />
                <span>CHAT</span>
              </div>
              <span class="fa-dropdown__label">闲聊...</span>
              <div class="fa-dropdown__action-box">TALK</div>
            </button>

            <!-- 2. 行动 (每回合一次，带效果) -->
            <template v-for="(inter, i) in char.interactions" :key="i">
              <button
                v-if="!(galgameStore.executedActions[char.name]?.includes(inter.label))"
                class="fa-dropdown__btn"
                @click.stop="handleInteraction(inter, char.name)"
              >
                <div class="fa-btn-bg"></div>
                <div class="fa-dropdown__type">
                  <component :is="inter.type === 'gift' ? Gift : inter.type === 'combat' ? Swords : inter.type === 'quest' ? Scroll : Hexagon" :size="14" stroke-width="1.5" />
                  <span>{{ inter.type.toUpperCase() }}</span>
                </div>
                <span class="fa-dropdown__label">{{ inter.label }}</span>
                <div class="fa-dropdown__action-box">EXEC</div>
              </button>
            </template>
            <button
              v-if="char.allow_custom_chat"
              class="fa-dropdown__btn fa-dropdown__btn--chat"
              @click.stop="enterCustomChat"
            >
              <div class="fa-btn-bg"></div>
              <div class="fa-dropdown__type">
                <PenTool :size="14" stroke-width="1.5" />
                <span>CUSTOM</span>
              </div>
              <span class="fa-dropdown__label">自由对话...</span>
              <div class="fa-dropdown__action-box">INPUT</div>
            </button>
          </div>
        </Transition>

        <!-- 自定义对话输入 (HUD Input) -->
        <Transition name="fa-dropdown">
          <div
            v-if="galgameStore.selectedCharacter === char.name && showCustomChat"
            class="fa-dropdown fa-dropdown--chat"
          >
            <div class="fa-dropdown__chat-header">
              <button class="fa-dropdown__back" @click.stop="showCustomChat = false">
                <ArrowLeft :size="12" />
                <span>返回</span>
              </button>
            </div>
            <div class="fa-dropdown__chat-row">
              <input
                ref="chatInputRef"
                v-model="customChatInput"
                class="fa-dropdown__chat-input"
                placeholder="说点什么..."
                :disabled="customChatLoading"
                @keydown.enter="handleCustomChat"
                @click.stop
              />
              <button
                class="fa-dropdown__chat-send"
                :disabled="customChatLoading || !customChatInput.trim()"
                @click.stop="handleCustomChat"
              >
                <Send :size="12" />
              </button>
            </div>
          </div>
        </Transition>
      </template>

      <!-- 结束活动按钮 -->
      <button class="fa-end-btn" @click="showEndModal = true">
        <LogOut :size="14" />
        <span>结束活动</span>
      </button>
    </div>

    <!-- ========== 右侧：特殊事件浮窗 ========== -->
    <div v-if="availableEvents.length > 0" class="fa-events">
      <div
        v-for="evt in availableEvents"
        :key="evt.id"
        class="fa-event-scroll"
        :class="`fa-event-scroll--${evt.button_style}`"
        @click="handleSpecialEvent(evt)"
      >
        <Sparkles :size="14" class="fa-event-scroll__icon" />
        <span class="fa-event-scroll__text">{{ evt.button_label }}</span>
      </div>
    </div>

    <!-- ========== 结束活动确认与剧情引导弹窗 ========== -->
    <Transition name="gal-fade">
      <div v-if="showEndModal" class="fa-modal-overlay" @click="showEndModal = false">
        <div class="fa-modal" @click.stop>
          <div class="fa-modal__header">
            <h3>结束当前回合？</h3>
          </div>
          
          <div class="fa-modal__body">
            <input
              v-model="guidanceText"
              class="fa-modal__input"
              placeholder="（可选）输入您期望的后续发展..."
              @keydown.enter="confirmEndActivity"
            />
            
            <div class="fa-modal__help-toggle" @click="showGuidanceDetails = !showGuidanceDetails">
              <HelpCircle :size="14" />
              <span>了解剧情引导机制</span>
            </div>
            
            <Transition name="gal-expand">
              <div v-if="showGuidanceDetails" class="fa-modal__details">
                <p>
                  如果您输入了期望的发展走向（如“去红魔馆”、“遇到危险”等），系统将作为<strong>最高优先级的强烈指令</strong>去执行。<br/>
                  <span class="text-red-400">注意：这会强制触发【剧情规划大师】重新编写宏观大纲，打断原有的自然发展轨迹。</span>
                </p>
              </div>
            </Transition>
          </div>

          <div class="fa-modal__footer">
            <button class="fa-modal__btn fa-modal__btn--cancel" @click="showEndModal = false">取消</button>
            <button class="fa-modal__btn fa-modal__btn--confirm" @click="confirmEndActivity">
              {{ guidanceText.trim() ? '引导并结束' : '自然结束' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════
   全局布局
   ═══════════════════════════════════════ */
.fa {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.fa > * { pointer-events: auto; }

/* ═══════════════════════════════════════
   左侧角色卡片栏 (Cinematic HUD Style)
   ═══════════════════════════════════════ */
.fa-chars {
  position: absolute;
  top: 130px;
  left: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 340px; /* 增加宽度，防止中文换行 */
}

.fa-char-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: rgba(5, 3, 2, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}
/* 背景扫描线 */
.fa-char-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px);
  pointer-events: none;
}

/* 装饰性直角边框 (Brackets) */
.fa-char-card__bracket {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  transition: all 400ms ease;
  pointer-events: none;
}
.fa-char-card__bracket--tl { top: 0; left: 0; border-right: none; border-bottom: none; border-top-color: rgba(255,255,255,0.2); border-left-color: rgba(255,255,255,0.2); }
.fa-char-card__bracket--br { bottom: 0; right: 0; border-left: none; border-top: none; border-bottom-color: rgba(255,255,255,0.2); border-right-color: rgba(255,255,255,0.2); }

.fa-char-card:hover {
  background: rgba(20, 10, 8, 0.6);
  transform: translateX(6px);
}
.fa-char-card:hover .fa-char-card__bracket {
  width: 16px; height: 16px;
  border-color: rgba(255, 255, 255, 0.5);
}

.fa-char-card--active {
  background: linear-gradient(90deg, rgba(220, 60, 60, 0.15), rgba(0, 0, 0, 0.4));
  border-left: 3px solid #ff4a4a;
  box-shadow: inset 20px 0 40px -20px rgba(255, 74, 74, 0.3);
  transform: translateX(8px);
}
.fa-char-card--active .fa-char-card__bracket {
  border-color: #ff4a4a;
  width: 8px; height: 8px;
}

/* 注: 已移除水印编号以避免与顶栏重叠 */

/* 头像 (Cyberpunk/Cinematic Style) */
.fa-char-card__avatar {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.05); /* 轻量级透明淡色 */
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  clip-path: polygon(0 0, 100% 0, 100% 80%, 80% 100%, 0 100%); /* 切角设计 */
}
.fa-char-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 10%;
  transform: scale(1.1);
  filter: grayscale(20%) contrast(1.1);
  transition: all 400ms ease;
}
.fa-char-card--active .fa-char-card__avatar img {
  filter: grayscale(0%) contrast(1.1);
}
.fa-char-card__avatar-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent 50%);
  mix-blend-mode: overlay;
}

/* 信息 */
.fa-char-card__info {
  flex: 1;
  min-width: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fa-char-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-right: 24px; /* 为准星图标留出空间 */
}
.fa-char-card__name {
  font-size: 0.95rem;
  color: #fff;
  letter-spacing: 0.1em;
  font-family: "Noto Serif SC", serif;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}
.fa-char-card__status {
  font-family: 'Oswald', 'DIN Alternate', sans-serif;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.4);
}
.fa-char-card--active .fa-char-card__status {
  color: #ff4a4a;
  animation: fa-pulse 2s infinite;
}

.fa-char-card__favor-bar {
  width: 100%;
  height: 2px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
}
.fa-char-card__favor-fill {
  width: 40%;
  height: 100%;
  background: #ff4a4a;
  box-shadow: 0 0 8px #ff4a4a;
}

/* 选中准星 */
.fa-char-card__target {
  position: absolute;
  right: 14px;
  top: 14px;
  color: #ff4a4a;
  opacity: 0.8;
  animation: fa-spin-slow 4s linear infinite;
}

/* ═══════════════════════════════════════
   交互选项下拉 (HUD Menu)
   ═══════════════════════════════════════ */
.fa-dropdown {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0 0 24px;
  margin-top: -6px;
  position: relative;
}
.fa-dropdown__line {
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 10px;
  width: 1px;
  background: linear-gradient(180deg, rgba(255,255,255,0.2), transparent);
}

.fa-dropdown__btn {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
  clip-path: polygon(0 0, 100% 0, 98% 100%, 0 100%);
}

.fa-btn-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255, 74, 74, 0.25), transparent);
  transform: translateX(-100%);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 0;
}



.fa-dropdown__btn > * { position: relative; z-index: 1; }

.fa-dropdown__type {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Oswald', sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.5);
  width: 80px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.fa-dropdown__label {
  flex: 1;
  font-family: "Noto Serif SC", serif;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fa-dropdown__action-box {
  font-family: 'Oswald', sans-serif;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  padding: 2px 6px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
  transition: all 300ms ease;
}

.fa-dropdown__btn:hover {
  border-left-color: #ff4a4a;
  transform: translateX(4px);
  color: #fff;
  border-color: rgba(255,255,255,0.15);
}
.fa-dropdown__btn:hover .fa-btn-bg { transform: translateX(0); }
.fa-dropdown__btn:hover .fa-dropdown__type { color: #ff4a4a; border-right-color: rgba(255, 74, 74, 0.3); }
.fa-dropdown__btn:hover .fa-dropdown__action-box {
  background: #ff4a4a;
  color: #fff;
  box-shadow: 0 0 10px rgba(255, 74, 74, 0.5);
}

.fa-dropdown__btn--chat {
  border-left-style: dashed;
}

/* 自定义对话输入 (HUD Style) */
.fa-dropdown__chat-header {
  margin-bottom: 8px;
  padding-left: 10px;
}
.fa-dropdown__back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  font-family: 'Oswald', sans-serif;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 200ms ease;
}
.fa-dropdown__back:hover { color: #ff4a4a; transform: translateX(-2px); }

.fa-dropdown__chat-row {
  display: flex;
  gap: 8px;
  padding-left: 10px;
}
.fa-dropdown__chat-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 2px solid #ff4a4a;
  color: #fff;
  font-size: 0.85rem;
  outline: none;
  transition: all 200ms ease;
}
.fa-dropdown__chat-input:focus {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 74, 74, 0.5);
  box-shadow: inset 0 0 10px rgba(255, 74, 74, 0.2);
}
.fa-dropdown__chat-send {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  background: #ff4a4a;
  border: none;
  color: #fff;
  cursor: pointer;
  clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
  transition: all 200ms ease;
}
.fa-dropdown__chat-send:hover:not(:disabled) { background: #ff6b6b; transform: scale(1.05); }
.fa-dropdown__chat-send:disabled { background: rgba(255, 255, 255, 0.1); color: rgba(255,255,255,0.3); cursor: not-allowed; }

/* 下拉过渡动画 */
.fa-dropdown-enter-active { transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1); }
.fa-dropdown-leave-active { transition: all 200ms ease-in; }
.fa-dropdown-enter-from,
.fa-dropdown-leave-to { opacity: 0; transform: translateX(-15px); }

/* ═══════════════════════════════════════
   结束活动按钮
   ═══════════════════════════════════════ */
.fa-end-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 14px;
  margin-top: 20px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  font-family: 'Oswald', sans-serif;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: all 300ms ease;
  clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%);
}
.fa-end-btn:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
}

/* ═══════════════════════════════════════
   右侧特殊事件卷轴 (Cinematic HUD Style)
   ═══════════════════════════════════════ */
.fa-events {
  position: absolute;
  top: 80px;
  right: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 260px;
}

.fa-event-scroll {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px 12px 28px; /* 增加左侧 padding 容纳箭头 */
  background: 
    linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, rgba(0,0,0,0.6) 100%),
    repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 6px);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-family: "Noto Serif SC", serif;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  /* 极具特殊感的箭形异形碎片切角 */
  clip-path: polygon(15px 0, 100% 0, 100% 100%, 15px 100%, 0 50%);
  transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  animation: fa-event-breathe 2.5s ease-in-out infinite;
}

@keyframes fa-event-breathe {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(168,85,247,0.3)); transform: translateX(0); }
  50% { filter: drop-shadow(0 0 8px rgba(168,85,247,0.6)); transform: translateX(-4px); }
}

.fa-event-scroll::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(-90deg, rgba(255,255,255,0.1), transparent);
  transform: translateX(100%);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 0;
}

.fa-event-scroll > * { position: relative; z-index: 1; }

.fa-event-scroll:hover {
  background: rgba(20, 10, 20, 0.7);
  color: #fff;
  transform: translateX(-8px) scale(1.02);
  /* Use filter for glow since clip-path clips box-shadow */
  filter: drop-shadow(0 0 12px rgba(168, 85, 247, 0.8)) !important;
}
.fa-event-scroll:hover::before {
  transform: translateX(0);
}

.fa-event-scroll__icon {
  color: #a855f7;
  filter: drop-shadow(0 0 4px rgba(168,85,247,0.5));
}

.fa-event-scroll--mysterious { animation-duration: 3s; }
.fa-event-scroll--mysterious:hover { filter: drop-shadow(0 0 15px rgba(168, 85, 247, 0.9)) !important; }
.fa-event-scroll--mysterious .fa-event-scroll__icon { color: #a855f7; filter: drop-shadow(0 0 4px rgba(168,85,247,0.8)); }

.fa-event-scroll--warning { 
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(0,0,0,0.6) 100%);
}
.fa-event-scroll--warning:hover { filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.9)) !important; }
.fa-event-scroll--warning .fa-event-scroll__icon { color: #f59e0b; filter: drop-shadow(0 0 4px rgba(245,158,11,0.8)); }

.fa-event-scroll--urgent { 
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(0,0,0,0.6) 100%);
}
.fa-event-scroll--urgent:hover { filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.9)) !important; }
.fa-event-scroll--urgent .fa-event-scroll__icon { color: #ef4444; filter: drop-shadow(0 0 4px rgba(239,68,68,0.8)); }

.fa-event-scroll--festive { 
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0.6) 100%);
}
.fa-event-scroll--festive:hover { filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.9)) !important; }
.fa-event-scroll--festive .fa-event-scroll__icon { color: #10b981; filter: drop-shadow(0 0 4px rgba(16,185,129,0.8)); }



/* ═══════════════════════════════════════
   结果对话浮标
   ═══════════════════════════════════════ */
.fa-result-float {
  position: absolute;
  bottom: 220px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  background: rgba(20, 10, 10, 0.6);
  backdrop-filter: blur(12px) saturate(1.2);
  border: 1px solid rgba(220, 100, 80, 0.3);
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  transition: all 300ms ease;
}
.fa-result-float:hover {
  background: rgba(30, 15, 15, 0.8);
  border-color: rgba(220, 100, 80, 0.6);
  transform: translateX(-50%) translateY(-2px);
}
.fa-result-float__hint {
  font-size: 0.8rem;
  color: rgba(240, 180, 120, 0.8);
  animation: fa-blink 1.5s ease-in-out infinite;
  letter-spacing: 0.05em;
}

@keyframes fa-blink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; filter: drop-shadow(0 0 4px rgba(240, 180, 120, 0.5)); }
}

/* ═══════════════════════════════════════
   结束活动模态框 (极简无边框设计)
   ═══════════════════════════════════════ */
.fa-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fa-modal {
  width: 420px;
  background: rgba(26, 15, 10, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(220, 100, 80, 0.2);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fa-modal__header {
  padding: 24px 24px 16px;
  text-align: center;
}
.fa-modal__header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #fff;
  letter-spacing: 2px;
  font-weight: 600;
}

.fa-modal__body {
  padding: 0 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fa-modal__input {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: none;
  border-bottom: 1px solid rgba(220,100,80,0.4);
  padding: 12px 0;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}
.fa-modal__input::placeholder {
  color: rgba(255,255,255,0.3);
}
.fa-modal__input:focus {
  border-bottom-color: rgba(220,100,80,0.9);
}

.fa-modal__help-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  width: fit-content;
  transition: color 0.2s;
}
.fa-modal__help-toggle:hover {
  color: rgba(220,100,80,0.8);
}

.fa-modal__details {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.6);
  line-height: 1.6;
  background: rgba(0,0,0,0.2);
  padding: 12px;
  border-radius: 4px;
  border-left: 2px solid rgba(220,100,80,0.5);
  overflow: hidden;
}

.fa-modal__footer {
  padding: 16px 24px 24px;
  display: flex;
  gap: 12px;
}

.fa-modal__btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 4px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 1px;
}
.fa-modal__btn--cancel {
  background: rgba(255,255,255,0.05);
  border: none;
  color: rgba(255,255,255,0.7);
}
.fa-modal__btn--cancel:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.fa-modal__btn--confirm {
  background: rgba(220, 100, 80, 0.8);
  border: none;
  color: #fff;
  font-weight: 500;
}
.fa-modal__btn--confirm:hover {
  background: rgba(220, 100, 80, 1);
  box-shadow: 0 0 15px rgba(220,100,80,0.4);
}

.gal-expand-enter-active,
.gal-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  max-height: 150px;
  opacity: 1;
}
.gal-expand-enter-from,
.gal-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
}

.gal-fade-enter-active,
.gal-fade-leave-active {
  transition: opacity 0.3s;
}
.gal-fade-enter-from,
.gal-fade-leave-to {
  opacity: 0;
}
</style>
