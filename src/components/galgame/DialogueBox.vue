<script setup lang="ts">
/**
 * DialogueBox.vue — 居酒屋风对话框
 *
 * 三种文本模式的字色/字形区分：
 *   1. 旁白/叙事（speaker=null）：琥珀色 + 微斜体 — 「我」视角的叙述
 *   2. 主角说话（speaker=玩家名）：清酒白 + 引号装饰 — 「我」说出的话
 *   3. 角色说话（speaker=其他名字）：明亮白 + 正常字重 — NPC 的对话
 */

import { ref, watch, computed } from 'vue'
import { useGameStore } from '@/stores/game'

const props = defineProps<{
  speaker: string | null
  emotion: string
  text: string
  isOpening: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  (e: 'go-back'): void
  (e: 'toggle-history'): void
}>()

const gameStore = useGameStore()

/** 判断文本模式 */
const textMode = computed<'narration' | 'protagonist' | 'character'>(() => {
  if (!props.speaker) return 'narration'
  const playerName = gameStore.state?.player?.name || '玩家'
  if (props.speaker === playerName || props.speaker === '我' || props.speaker === '主角') {
    return 'protagonist'
  }
  return 'character'
})

/** 打字机效果状态 */
const displayedText = ref('')
const isTyping = ref(false)
let typeTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.text,
  (newText) => {
    if (!newText) return
    if (typeTimer) clearTimeout(typeTimer)
    displayedText.value = ''
    isTyping.value = true
    typeChar(newText, 0)
  },
  { immediate: true }
)

function typeChar(full: string, idx: number) {
  if (idx >= full.length) {
    isTyping.value = false
    return
  }
  displayedText.value = full.slice(0, idx + 1)
  typeTimer = setTimeout(() => typeChar(full, idx + 1), 25)
}

/** 点击可跳过打字机；打字完成后不阻止冒泡，让点击传递到 Engine 推进对话 */
function handleClick(e: MouseEvent) {
  if (isTyping.value && typeTimer) {
    e.stopPropagation()
    clearTimeout(typeTimer)
    displayedText.value = props.text
    isTyping.value = false
  }
}
</script>

<template>
  <div class="dlg-wrap" @click="handleClick">
    <!-- 顶部高光修饰线 -->
    <div class="dlg-highlight"></div>

    <!-- 工具按钮（右上角） -->
    <div class="dlg-tools">
      <button class="dlg-tools__btn" title="回退 (鼠标中键)" @click.stop="emit('go-back')">◀</button>
      <button class="dlg-tools__btn" title="历史记录" @click.stop="emit('toggle-history')">▤</button>
    </div>

    <!-- 角色铭牌（NPC 说话时显示） -->
    <div v-if="textMode === 'character'" class="dlg-nameplate">
      <span class="dlg-nameplate__text">{{ speaker }}</span>
    </div>

    <!-- 主角铭牌 -->
    <div v-else-if="textMode === 'protagonist'" class="dlg-nameplate dlg-nameplate--protagonist">
      <span class="dlg-nameplate__text">{{ speaker }}</span>
    </div>

    <!-- 旁白标记 -->
    <div v-else class="dlg-narration-mark">
      <span>❖</span>
    </div>

    <!-- 正文区 -->
    <div class="dlg-body" :class="`dlg-body--${textMode}`">
      <p class="dlg-text">{{ displayedText }}</p>
    </div>

    <!-- 底部提示 -->
    <div class="dlg-hint">
      <template v-if="isOpening">
        <span v-if="isLast" class="dlg-hint__final">— 开场结束，进入自由活动 —</span>
        <span v-else class="dlg-hint__next">
          <span class="dlg-hint__arrow">▼</span>
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════
   对话框整体 — 毛玻璃极简风
   ═══════════════════════════════════════ */
.dlg-wrap {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: min(96%, 1200px);
  min-height: 180px;
  padding: 40px 48px 30px;

  /* 高级毛玻璃材质 */
  background: linear-gradient(to bottom, rgba(15, 10, 8, 0.45), rgba(5, 3, 2, 0.85));
  backdrop-filter: blur(24px) saturate(1.2);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  pointer-events: auto;
  animation: dlg-enter 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dlg-highlight {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(220, 100, 80, 0.8), rgba(240, 180, 100, 0.8), transparent);
  box-shadow: 0 0 10px rgba(220, 100, 80, 0.4);
}

@keyframes dlg-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); filter: blur(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); filter: blur(0); }
}

/* ═══════════════════════════════════════
   角色铭牌 — 水墨虚化与细线
   ═══════════════════════════════════════ */
.dlg-nameplate {
  position: absolute;
  top: -32px;
  left: 40px;
  padding: 4px 24px 4px 16px;
  background: transparent;
  z-index: 1;
}

.dlg-nameplate::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(160, 40, 40, 0.85), transparent);
  border-left: 2px solid rgba(220, 80, 60, 0.9);
  z-index: -1;
  mask-image: linear-gradient(to right, black 30%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 30%, transparent 100%);
}

.dlg-nameplate--protagonist::before {
  background: linear-gradient(90deg, rgba(180, 140, 60, 0.85), transparent);
  border-left: 2px solid rgba(240, 200, 120, 0.9);
}

.dlg-nameplate__text {
  font-size: 1.25rem;
  font-weight: 300;
  color: #fff;
  letter-spacing: 0.15em;
  font-family: "Noto Serif SC", "STZhongsong", serif;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
}

/* ═══════════════════════════════════════
   旁白标记
   ═══════════════════════════════════════ */
.dlg-narration-mark {
  position: absolute;
  top: -28px;
  left: 40px;
  color: rgba(200, 164, 94, 0.7);
  font-size: 1.4rem;
  filter: drop-shadow(0 0 6px rgba(200,164,94,0.5));
  animation: pulse-glow 3s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 4px rgba(200,164,94,0.3)); }
  50% { opacity: 1; filter: drop-shadow(0 0 10px rgba(200,164,94,0.8)); }
}

/* ═══════════════════════════════════════
   正文 — 三种文本模式 (优雅衬线字体)
   ═══════════════════════════════════════ */
.dlg-body {
  min-height: 80px;
  display: flex;
  align-items: flex-start;
}

.dlg-text {
  font-size: 1.15rem;
  line-height: 2.2;
  letter-spacing: 0.08em;
  font-weight: 300;
  font-family: "Noto Serif SC", "STZhongsong", serif;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 旁白/叙事：微弱的琥珀色 */
.dlg-body--narration .dlg-text {
  color: rgba(230, 200, 160, 0.9);
  font-style: italic;
  text-shadow: 0 2px 4px rgba(0,0,0,0.6);
}

/* 主角说话：清酒白 */
.dlg-body--protagonist .dlg-text {
  color: #f5f0e8;
  font-style: normal;
  text-shadow: 0 2px 4px rgba(0,0,0,0.6);
}

/* NPC 角色对话：明亮纯净 */
.dlg-body--character .dlg-text {
  color: #ffffff;
  font-style: normal;
  font-weight: 400; /* 略微加重 */
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}

/* ═══════════════════════════════════════
   底部提示
   ═══════════════════════════════════════ */
.dlg-hint {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 22px;
  margin-top: 12px;
}

.dlg-hint__next {
  display: flex;
  align-items: center;
}

.dlg-hint__arrow {
  font-size: 0.8rem;
  color: rgba(220, 180, 120, 0.6);
  animation: dlg-blink 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes dlg-blink {
  0%, 100% { opacity: 0.2; transform: translateY(0); }
  50%      { opacity: 1; transform: translateY(3px); filter: drop-shadow(0 0 5px rgba(220,180,120,0.8)); }
}

.dlg-hint__final {
  font-size: 0.85rem;
  color: rgba(200, 164, 94, 0.6);
  letter-spacing: 0.15em;
  font-family: "Noto Serif SC", serif;
}

/* 工具按钮 */
.dlg-tools {
  position: absolute;
  top: -24px;
  right: 24px;
  display: flex;
  gap: 8px;
}
.dlg-tools__btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  color: rgba(255,255,255,0.4);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 300ms ease;
}
.dlg-tools__btn:hover {
  color: rgba(255,255,255,0.9);
  border-color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}
</style>
