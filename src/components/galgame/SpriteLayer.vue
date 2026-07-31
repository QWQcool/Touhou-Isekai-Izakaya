<script setup lang="ts">
/**
 * SpriteLayer.vue — 弧形舞台式立绘层（方案 C）
 *
 * 布局算法：
 *   1. 所有角色沿一条隐形椭圆弧线等距排列
 *   2. 弧线中央的角色最大（scale=1），两端最小（scale=0.7）
 *   3. 说话角色从弧线位置平滑前移到舞台中央，放大并高亮
 *   4. 非说话角色暗化 + 保持弧线位置
 *   5. 人数自适应：2人宽松、5人紧凑
 */

import { computed } from 'vue'
import { resolveSpritePath, DEFAULT_FALLBACK } from '@/services/spriteResolver'
import { resolveCharacterId } from '@/services/characterMapping'
import { useGameStore } from '@/stores/game'
import { useCharacterStore } from '@/stores/character'
import type { SceneCharacter } from '@/types/galgame'

const gameStore = useGameStore()
const charStore = useCharacterStore()

const props = defineProps<{
  speaker: string | null
  emotion: string
  spritePath: string | null
  sceneCharacters: SceneCharacter[]
  phase: string
}>()

const emit = defineEmits<{
  (e: 'select-character', name: string): void
  (e: 'view-details', name: string): void
}>()

function handleImgError(event: Event, charName: string) {
  const img = event.target as HTMLImageElement;
  
  // 使用 dataset 记录当前 fallback 阶段，防止死循环
  const fallbackStage = parseInt(img.dataset.fallbackStage || '0', 10);

  if (fallbackStage === 0) {
    // 阶段 1：回退到该角色的常规日常立绘
    img.dataset.fallbackStage = '1';
    img.src = resolveSpritePath(charName, '常规');
  } else if (fallbackStage === 1) {
    // 阶段 2：回退到通用无脸黑影 (其他角色.png)
    img.dataset.fallbackStage = '2';
    img.src = DEFAULT_FALLBACK;
  } else {
    // 阶段 3：连通用黑影都加载失败，直接隐藏
    img.style.display = 'none';
  }
}

/**
 * 计算每个角色在弧形舞台上的位置和样式
 */
const stagePositions = computed(() => {
  const chars = props.sceneCharacters
  const count = chars.length
  if (count === 0) return []

  // 弧线参数（收窄，保持角色在屏幕中央区域）
  const arcSpreadX = Math.min(22, 8 + count * 6)  // 2人=20vw总宽, 5人≈22vw
  const arcDepthY = 10 + count * 4    // 微妙的前后差
  const minScale = 0.78
  const maxScale = 0.95

  return chars.map((char, i) => {
    // 归一化位置 t ∈ [-1, 1]，中间为 0
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1

    // 弧线 X 坐标（百分比，相对于屏幕中心）
    const arcX = t * arcSpreadX

    // 弧线 Y 坐标（抛物线：中间高，两端低）→ 越靠边越往下
    const arcY = t * t * arcDepthY

    // 弧线缩放：中间大，两端小
    const arcScale = maxScale - Math.abs(t) * (maxScale - minScale)

    // 弧线 z-index：中间高，两端低
    const arcZ = Math.round((1 - Math.abs(t)) * 10) + 10

    // 是否为说话角色
    const isSpeaking = props.speaker === char.name

    // 说话角色：保持弧线水平位置，只微微前移（不跳到正中央）
    const finalX = isSpeaking ? arcX * 0.5 : arcX
    const finalY = isSpeaking ? -12 : arcY
    const finalScale = isSpeaking ? 1.0 : arcScale
    const finalZ = isSpeaking ? 30 : arcZ

    // 说话角色立绘路径使用情绪，非说话使用默认
    const spritePath = isSpeaking && props.spritePath
      ? props.spritePath
      : resolveSpritePath(char.name, char.default_emotion)

    // 获取角色实时情报
    const resolvedId = resolveCharacterId(char.name, charStore.characters, gameStore.state.npcs)
    const status = gameStore.state.npcs[char.name] || gameStore.state.npcs[resolvedId]

    return {
      name: char.name,
      path: spritePath,
      isSpeaking,
      favorability: status?.favorability ?? '未知',
      mood: status?.mood ?? '未知',
      relationship: status?.relationship ?? '未知',
      clothing: status?.clothing ?? '无特殊描述',
      style: {
        '--tfX': `${finalX}vw`,
        '--tfY': `${finalY}px`,
        '--sc': finalScale,
        zIndex: finalZ,
        filter: isSpeaking
          ? 'brightness(1) saturate(1.1) drop-shadow(0 15px 40px rgba(220,100,80,0.15)) drop-shadow(0 0 15px rgba(0,0,0,0.5))'
          : 'brightness(0.4) saturate(0.5) drop-shadow(0 6px 16px rgba(0,0,0,0.4))',
      } as any,
    }
  })
})

/** 开场阶段：仅显示说话角色居中 */
const openingSpriteStyle = computed(() => ({
  '--tfX': '0vw',
  '--tfY': '-10px',
  '--sc': 1,
  zIndex: 20,
  filter: 'brightness(1) saturate(1.1) drop-shadow(0 15px 40px rgba(220,100,80,0.15)) drop-shadow(0 0 15px rgba(0,0,0,0.5))',
} as any))
</script>

<template>
  <div class="stage">
    <!-- ===== 开场阶段：单角色居中（也用舞台定位） ===== -->
    <div
      v-if="phase === 'opening' && spritePath"
      class="stage__actor stage__actor--solo"
      :style="openingSpriteStyle"
    >
      <img
        :src="spritePath"
        :alt="speaker || ''"
        class="stage__img"
        @error="handleImgError($event, speaker || '')"
      />
      <!-- 底部聚光灯光晕 -->
      <div class="stage__spotlight"></div>
    </div>

    <!-- ===== 自由活动：弧形多角色舞台 ===== -->
    <template v-if="phase === 'free_activity'">
      <div
        v-for="pos in stagePositions"
        :key="pos.name"
        class="stage__actor"
        :class="{ 'stage__actor--speaking': pos.isSpeaking }"
        :style="pos.style"
        @click.stop="emit('select-character', pos.name)"
      >
        <img
          :src="pos.path"
          :alt="pos.name"
          class="stage__img stage__img--clickable"
          @error="handleImgError($event, pos.name)"
        />
        <!-- 说话角色底部光晕 -->
        <div v-if="pos.isSpeaking" class="stage__spotlight"></div>
        
        <!-- 角色详情悬浮卡片 -->
        <div class="stage__intel-card" @click.stop="emit('view-details', pos.name)">
          <div class="intel-header">{{ pos.name }}</div>
          <div class="intel-body">
            <div class="intel-row"><span class="intel-label">好感度：</span><span class="intel-value">{{ pos.favorability }}</span></div>
            <div class="intel-row"><span class="intel-label">心情：</span><span class="intel-value">{{ pos.mood }}</span></div>
            <div class="intel-row"><span class="intel-label">关系：</span><span class="intel-value">{{ pos.relationship }}</span></div>
            <div class="intel-row"><span class="intel-label">着装：</span><span class="intel-value">{{ pos.clothing }}</span></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════
   舞台容器
   ═══════════════════════════════════════ */
.stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  pointer-events: none; /* 容器本身不拦截点击 */
}

/* ═══════════════════════════════════════
   角色演员（每个角色一个定位块）
   ═══════════════════════════════════════ */
.stage__actor {
  position: absolute;
  bottom: 180px;
  left: 50%;
  margin-left: -175px;
  width: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto; /* 角色区域可点击 */
  cursor: pointer;

  /* 默认读取变量 */
  transform: translateX(var(--tfX, 0vw)) translateY(var(--tfY, 0px)) scale(var(--sc, 1));

  /* 核心：平滑过渡所有属性 */
  transition:
    transform 650ms cubic-bezier(0.2, 0.8, 0.2, 1),
    filter 650ms cubic-bezier(0.2, 0.8, 0.2, 1),
    z-index 0ms;
}

.stage__actor:hover .stage__intel-card {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.stage__actor--solo {
  animation: stage-enter 600ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.stage__actor--speaking {
  /* 说话角色轻微呼吸动画 */
  animation: stage-breathe 4s ease-in-out infinite;
}

/* ═══════════════════════════════════════
   立绘图片
   ═══════════════════════════════════════ */
.stage__img {
  max-height: 68vh;
  max-width: 350px;
  object-fit: contain;
  pointer-events: none;
  /* 增加优雅的地面倒影 */
  -webkit-box-reflect: below 0px linear-gradient(transparent 75%, rgba(255, 255, 255, 0.2));
}

.stage__img--clickable {
  pointer-events: auto;
  cursor: pointer;
}

/* ═══════════════════════════════════════
   聚光灯底部光晕（说话角色脚下）
   ═══════════════════════════════════════ */
.stage__spotlight {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 250px;
  height: 30px;
  background: radial-gradient(
    ellipse 100% 100% at center,
    rgba(220, 100, 80, 0.25) 0%,
    rgba(220, 100, 80, 0.05) 50%,
    transparent 70%
  );
  border-radius: 50%;
  pointer-events: none;
  filter: blur(4px);
}

/* ═══════════════════════════════════════
   角色详情悬浮卡片 (Intel Card)
   ═══════════════════════════════════════ */
.stage__intel-card {
  position: absolute;
  top: 10%;
  left: 80%; /* 位于立绘右侧 */
  width: max-content;
  max-width: 200px;
  background: rgba(30, 20, 20, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(220, 100, 80, 0.3);
  border-radius: 8px;
  padding: 12px;
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  transition: all 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(220, 100, 80, 0.1);
  z-index: 50;
  text-align: left;
}

/* 防止靠右的角色卡片出界，给特定序号或全局加上适当定位即可，这里使用简单的 hover 结构 */

.intel-header {
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
  border-bottom: 1px solid rgba(220, 100, 80, 0.4);
  padding-bottom: 6px;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.intel-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}

.intel-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.intel-label {
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.intel-value {
  color: #ffcccc;
  text-align: right;
  word-break: break-all;
}

/* ═══════════════════════════════════════
   动画
   ═══════════════════════════════════════ */
@keyframes stage-enter {
  from {
    opacity: 0;
    transform: translateX(var(--tfX, 0vw)) translateY(calc(var(--tfY, 0px) + 40px)) scale(calc(var(--sc, 1) * 0.95));
  }
  to {
    opacity: 1;
    transform: translateX(var(--tfX, 0vw)) translateY(var(--tfY, 0px)) scale(var(--sc, 1));
  }
}

@keyframes stage-breathe {
  0%, 100% { transform: translateX(var(--tfX, 0vw)) translateY(var(--tfY, 0px)) scale(var(--sc, 1)); }
  50% { transform: translateX(var(--tfX, 0vw)) translateY(calc(var(--tfY, 0px) - 8px)) scale(calc(var(--sc, 1) * 1.015)); }
}
</style>
