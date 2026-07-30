<script setup lang="ts">
/**
 * HudQuestTracker.vue — Galgame 模式 Layer 4: 任务追踪指示器（右上角）
 * 始终悬浮显示当前活跃主线任务名称，带发光脉冲效果。
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const activeQuest = computed(() => {
  const quests = gameStore.state.system?.quests || []
  return quests.find((q: any) => q.status === 'active')
})
</script>

<template>
  <div class="gal-hud-quest">
    <div class="gal-panel gal-hud-quest__panel">
      <span class="gal-hud-quest__pulse" />
      <span class="gal-hud-quest__text">
        {{ activeQuest?.name || '暂无活跃任务' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.gal-hud-quest { position: absolute; top: 16px; right: 16px; }

.gal-panel {
  position: relative;
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%), rgba(10,10,20,0.82);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255,255,255,0.12);
  border-left: 1px solid rgba(255,255,255,0.08);
  border-bottom: 1px solid rgba(0,0,0,0.5);
  border-right: 1px solid rgba(0,0,0,0.35);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
}
.gal-panel::after {
  content: ''; position: absolute; bottom: -3px; left: 4px; right: 4px;
  height: 3px; background: rgba(0,0,0,0.4); border-radius: 0 0 13px 13px; filter: blur(1px);
}

.gal-hud-quest__panel {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
}

.gal-hud-quest__pulse {
  width: 8px; height: 8px; border-radius: 50%;
  background: #ff6b6b; box-shadow: 0 0 6px rgba(255,107,107,0.6);
  animation: quest-pulse 2s ease-in-out infinite;
}
@keyframes quest-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

.gal-hud-quest__text {
  font-size: 0.8rem; color: rgba(255,255,255,0.8);
  letter-spacing: 0.05em; max-width: 200px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
