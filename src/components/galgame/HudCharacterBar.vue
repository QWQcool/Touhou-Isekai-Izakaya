<script setup lang="ts">
/**
 * HudCharacterBar.vue — Galgame 模式 Layer 4: 角色速览侧栏（右侧）
 * 平时只显示一列小型角色头像圆点，悬停显示信息浮窗。
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const npcs = computed(() => {
  const npcMap = gameStore.state.npcs || {}
  return Object.values(npcMap).slice(0, 6) // 最多显示 6 个
})
</script>

<template>
  <div class="gal-hud-chars">
    <div class="gal-hud-chars__list">
      <div v-for="(npc, i) in npcs" :key="i" class="gal-hud-chars__dot" :title="(npc as any)?.name || 'NPC'">
        <span class="gal-hud-chars__emoji">👤</span>
      </div>
      <!-- 空状态 -->
      <div v-if="npcs.length === 0" class="gal-hud-chars__empty">
        <span>暂无角色</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gal-hud-chars {
  position: absolute; top: 80px; right: 16px;
}

.gal-hud-chars__list {
  display: flex; flex-direction: column; gap: 8px;
}

.gal-hud-chars__dot {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(10,10,20,0.75); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.gal-hud-chars__dot:hover {
  transform: scale(1.15) translateX(-4px);
  border-color: rgba(255,255,255,0.25);
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.gal-hud-chars__emoji { font-size: 0.9rem; }

.gal-hud-chars__empty {
  font-size: 0.65rem; color: rgba(255,255,255,0.2);
  writing-mode: vertical-rl; letter-spacing: 0.1em;
}
</style>
