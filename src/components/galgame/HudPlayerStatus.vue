<script setup lang="ts">
/**
 * HudPlayerStatus.vue — Galgame 模式 Layer 4: 玩家状态 HUD（左上角）
 * 横向窄条悬浮面板：头像框、HP/MP 槽、金钱。
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const player = computed(() => gameStore.state.player)
const hpPct = computed(() => {
  const max = player.value?.max_hp || 100
  return Math.max(0, Math.min(100, ((player.value?.hp ?? max) / max) * 100))
})
const mpPct = computed(() => {
  const max = player.value?.max_mp || 100
  return Math.max(0, Math.min(100, ((player.value?.mp ?? max) / max) * 100))
})
</script>

<template>
  <div class="gal-hud-status">
    <div class="gal-hud-status__panel gal-panel">
      <div class="gal-hud-status__avatar"><span>👤</span></div>
      <div class="gal-hud-status__bars">
        <div class="gal-bar-track">
          <div class="gal-bar-fill gal-bar-fill--hp" :style="{ width: hpPct + '%' }" />
          <span class="gal-bar-lbl">HP</span>
        </div>
        <div class="gal-bar-track">
          <div class="gal-bar-fill gal-bar-fill--mp" :style="{ width: mpPct + '%' }" />
          <span class="gal-bar-lbl">MP</span>
        </div>
      </div>
      <div class="gal-hud-status__money">
        <span>💰</span>
        <span class="gal-money-val">{{ player?.money ?? 0 }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gal-hud-status { position: absolute; top: 16px; left: 16px; }

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

.gal-hud-status__panel { display: flex; align-items: center; gap: 12px; padding: 10px 16px; }

.gal-hud-status__avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(0,0,0,0.4); border: 2px solid rgba(180,60,60,0.6);
  display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.5); flex-shrink: 0;
}

.gal-hud-status__bars { display: flex; flex-direction: column; gap: 4px; min-width: 120px; }

.gal-bar-track {
  position: relative; height: 14px; background: rgba(0,0,0,0.4);
  border-radius: 7px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.7); overflow: hidden;
}
.gal-bar-fill { height: 100%; border-radius: 7px; transition: width 500ms ease-out; }
.gal-bar-fill--hp { background: linear-gradient(90deg, #cc3333, #ff5555); box-shadow: 0 0 8px rgba(255,50,50,0.4); }
.gal-bar-fill--mp { background: linear-gradient(90deg, #3355cc, #5588ff); box-shadow: 0 0 8px rgba(50,100,255,0.4); }
.gal-bar-lbl {
  position: absolute; top: 0; left: 6px; font-size: 0.6rem; font-weight: 700;
  color: rgba(255,255,255,0.7); line-height: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}

.gal-hud-status__money {
  display: flex; align-items: center; gap: 4px;
  padding-left: 8px; border-left: 1px solid rgba(255,255,255,0.08);
}
.gal-money-val {
  font-size: 0.85rem; font-weight: 700; color: rgba(255,215,0,0.9);
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
</style>
