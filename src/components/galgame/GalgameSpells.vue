<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { Sparkles, Flame, Shield, Activity, XCircle } from 'lucide-vue-next'
import type { SpellCard } from '@/types/combat'

const gameStore = useGameStore()
const playerSpells = computed(() => gameStore.state.player.spell_cards || [])

// 注入测试数据
onMounted(() => {
  if (playerSpells.value.length === 0) {
    gameStore.state.player.spell_cards = [
      { id: 'spell_01', name: '「梦想封印」', description: '博丽神社代代相传的强力符卡，对大范围内的敌人造成毁灭性打击，具有极高的封印效果。', damage: 800, scope: 'aoe', cost: 150, type: 'attack', isUltimate: true },
      { id: 'spell_02', name: '魔炮「Master Spark」', description: '极限火力的象征，将魔力汇聚于一点爆发，无视部分防御的直线光束炮。', damage: 1200, scope: 'aoe', cost: 200, type: 'attack', isUltimate: true },
      { id: 'spell_03', name: '结界「博丽大结界」', description: '张开一层坚不可摧的结界，在接下来的几个回合内大幅度减少所有受到的伤害。', damage: 0, scope: 'single', cost: 80, type: 'shield' },
      { id: 'spell_04', name: '恢复「治愈之水」', description: '借助水之精灵的力量，缓慢恢复自身生命值。', damage: 0, scope: 'single', cost: 50, type: 'heal' },
      { id: 'spell_05', name: '弱化「迟缓之阵」', description: '在敌方脚下刻印符文，降低目标的闪避率和行动速度。', damage: 50, scope: 'aoe', cost: 60, type: 'debuff' },
    ]
  }
})

const activeFilter = ref('all')
const filters = [
  { id: 'all', label: '全部符卡', icon: Sparkles },
  { id: 'attack', label: '攻击', icon: Flame },
  { id: 'shield', label: '防御', icon: Shield },
  { id: 'heal', label: '恢复', icon: Activity },
  { id: 'debuff', label: '干扰', icon: XCircle },
]

const filteredSpells = computed(() => {
  if (activeFilter.value === 'all') return playerSpells.value
  return playerSpells.value.filter(spell => spell.type === activeFilter.value)
})

const selectedSpell = ref<SpellCard | null>(null)

const selectSpell = (spell: SpellCard) => {
  selectedSpell.value = spell
}

const getTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    'attack': '攻击',
    'buff': '增益',
    'debuff': '干扰',
    'shield': '防御',
    'heal': '恢复'
  }
  return type ? (map[type] || type) : '未知'
}
</script>

<template>
  <div class="sys-spells">
    
    <!-- 左侧：符卡列表区 -->
    <div class="sys-spells__list-area">
      <div class="sys-spells__filters">
        <button 
          v-for="f in filters" 
          :key="f.id"
          class="sys-filter-btn"
          :class="{ 'sys-filter-btn--active': activeFilter === f.id }"
          @click="activeFilter = f.id; selectedSpell = null"
        >
          <component :is="f.icon" :size="14" />
          <span>{{ f.label }}</span>
        </button>
      </div>

      <div class="sys-spells__list">
        <div 
          v-for="spell in filteredSpells" 
          :key="spell.id || spell.name"
          class="sys-spell-item"
          :class="{ 'sys-spell-item--selected': selectedSpell?.name === spell.name, 'sys-spell-item--ultimate': spell.isUltimate }"
          @click="selectSpell(spell)"
        >
          <div class="sys-spell-item__bg"></div>
          
          <div class="sys-spell-item__icon-box">
            <component :is="spell.type === 'attack' ? Flame : spell.type === 'shield' ? Shield : spell.type === 'heal' ? Activity : spell.type === 'debuff' ? XCircle : Sparkles" :size="20" class="sys-spell-item__icon" />
          </div>
          
          <div class="sys-spell-item__main">
            <div class="sys-spell-item__name">{{ spell.name }}</div>
            <div class="sys-spell-item__tags">
              <span class="sys-tag sys-tag--type">{{ getTypeLabel(spell.type) }}</span>
              <span class="sys-tag sys-tag--cost">MP: {{ spell.cost }}</span>
              <span v-if="spell.isUltimate" class="sys-tag sys-tag--ultimate">奥义</span>
            </div>
          </div>
        </div>

        <div v-if="filteredSpells.length === 0" class="sys-spells__empty">
          DATA NOT FOUND // 无符卡记录
        </div>
      </div>
    </div>

    <!-- 右侧：详情面板区 -->
    <div class="sys-spells__detail-area">
      <template v-if="selectedSpell">
        <div class="sys-detail-panel" :class="{ 'sys-detail-panel--ultimate': selectedSpell.isUltimate }">
          <div class="sys-detail-panel__scanner"></div>
          
          <div class="sys-detail__header">
            <div class="sys-detail__title-box">
              <div class="sys-detail__type">SPELL CARD ARCHIVE // {{ selectedSpell.isUltimate ? 'ULTIMATE' : 'NORMAL' }}</div>
              <div class="sys-detail__name">{{ selectedSpell.name }}</div>
            </div>
          </div>

          <div class="sys-detail__stats-grid">
            <div class="sys-stat-box">
              <div class="sys-stat-label">TYPE // 类型</div>
              <div class="sys-stat-value">{{ getTypeLabel(selectedSpell.type) }}</div>
            </div>
            <div class="sys-stat-box">
              <div class="sys-stat-label">COST // 消耗</div>
              <div class="sys-stat-value text-blue-400">{{ selectedSpell.cost }} MP</div>
            </div>
            <div class="sys-stat-box">
              <div class="sys-stat-label">DAMAGE // 威力</div>
              <div class="sys-stat-value text-touhou-red">{{ selectedSpell.damage > 0 ? selectedSpell.damage : '--' }}</div>
            </div>
            <div class="sys-stat-box">
              <div class="sys-stat-label">SCOPE // 范围</div>
              <div class="sys-stat-value">{{ selectedSpell.scope === 'aoe' ? '群体' : '单体' }}</div>
            </div>
          </div>

          <div class="sys-detail__desc-box">
            <div class="sys-detail__label">DESCRIPTION</div>
            <p class="sys-detail__desc">{{ selectedSpell.description }}</p>
          </div>

        </div>
      </template>
      <div v-else class="sys-detail-empty">
        <Sparkles :size="48" class="sys-detail-empty__icon" />
        <p>SELECT A SPELL CARD TO VIEW DETAILS</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.sys-spells {
  width: 100%;
  height: 100%;
  display: flex;
  padding: 32px;
  gap: 32px;
  box-sizing: border-box;
}

/* ====================================================
   左侧：符卡列表区
   ==================================================== */
.sys-spells__list-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 55%;
}

.sys-spells__filters {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 12px;
}
.sys-filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid transparent;
  color: rgba(255,255,255,0.6);
  font-family: 'Oswald', sans-serif;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
  transition: all 0.2s;
}
.sys-filter-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.sys-filter-btn--active { background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #fff; }

.sys-spells__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 12px;
}
.sys-spells__list::-webkit-scrollbar { width: 4px; }
.sys-spells__list::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
.sys-spells__list::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.5); }

/* 符卡条目 */
.sys-spell-item {
  position: relative;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}
.sys-spell-item__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}
.sys-spell-item:hover { border-color: rgba(56, 189, 248, 0.5); transform: translateX(4px); }
.sys-spell-item:hover .sys-spell-item__bg { opacity: 1; }

.sys-spell-item--selected {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  border-left: 4px solid #38bdf8;
}

/* 终极符卡 (金/红色点缀) */
.sys-spell-item--ultimate {
  border-right: 2px solid #fbbf24;
}
.sys-spell-item--ultimate:hover { border-color: #fbbf24; }
.sys-spell-item--ultimate.sys-spell-item--selected {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  border-left: 4px solid #fbbf24;
}

.sys-spell-item__icon-box {
  width: 40px; height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  color: rgba(255,255,255,0.8);
  transform: rotate(45deg); /* 菱形图标框 */
}
.sys-spell-item__icon {
  transform: rotate(-45deg); /* 图标转回来 */
}
.sys-spell-item--ultimate .sys-spell-item__icon-box {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.sys-spell-item__main { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.sys-spell-item__name { font-family: 'Noto Serif SC', serif; font-size: 1.1rem; color: #fff; font-weight: 700; }

.sys-spell-item__tags { display: flex; gap: 8px; }
.sys-tag { font-family: 'Oswald', sans-serif; font-size: 0.65rem; padding: 2px 6px; border-radius: 2px; }
.sys-tag--type { background: rgba(255,255,255,0.1); color: #ccc; }
.sys-tag--cost { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
.sys-tag--ultimate { background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.5); }

.sys-spells__empty { text-align: center; padding: 40px; font-family: 'Oswald', sans-serif; color: rgba(255,255,255,0.2); letter-spacing: 0.1em; }

/* ====================================================
   右侧：详情面板区
   ==================================================== */
.sys-spells__detail-area {
  flex: 1;
  background: rgba(5, 10, 15, 0.4);
  border-left: 1px solid rgba(255,255,255,0.05);
  display: flex;
  position: relative;
}

.sys-detail-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.15);
  font-family: 'Oswald', sans-serif;
  letter-spacing: 0.1em;
}
.sys-detail-empty__icon { margin-bottom: 16px; opacity: 0.5; }

.sys-detail-panel {
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: detailFadeIn 0.3s ease-out;
}
@keyframes detailFadeIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.sys-detail-panel__scanner {
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
  animation: scanline 4s linear infinite;
  opacity: 0.3;
}

.sys-detail-panel--ultimate .sys-detail-panel__scanner {
  background: #fbbf24;
  box-shadow: 0 0 10px #fbbf24;
}

.sys-detail__header { margin-bottom: 32px; }
.sys-detail__type { font-family: 'Oswald', sans-serif; font-size: 0.8rem; color: #38bdf8; letter-spacing: 0.1em; margin-bottom: 4px; }
.sys-detail-panel--ultimate .sys-detail__type { color: #fbbf24; }
.sys-detail__name { font-family: 'Noto Serif SC', serif; font-size: 1.8rem; color: #fff; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }

.sys-detail__stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
.sys-stat-box {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 12px 16px;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}
.sys-stat-label { font-family: 'Oswald', sans-serif; font-size: 0.7rem; color: rgba(255,255,255,0.5); letter-spacing: 0.1em; margin-bottom: 4px; }
.sys-stat-value { font-family: 'Oswald', sans-serif; font-size: 1.1rem; color: #fff; font-weight: 700; }

.sys-detail__desc-box { flex: 1; }
.sys-detail__label { font-family: 'Oswald', sans-serif; font-size: 0.8rem; color: rgba(255,255,255,0.5); letter-spacing: 0.1em; margin-bottom: 12px; }
.sys-detail__desc { font-family: 'Noto Serif SC', serif; font-size: 1rem; color: rgba(255,255,255,0.85); line-height: 1.8; }

.sys-detail__actions { display: flex; justify-content: flex-end; }
.sys-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  background: #38bdf8;
  color: #fff;
  border: none;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
  transition: all 0.2s;
}
.sys-action-btn:hover { background: #7dd3fc; transform: translateX(-4px); box-shadow: 0 4px 15px rgba(56, 189, 248, 0.4); }
.sys-detail-panel--ultimate .sys-action-btn { background: #fbbf24; }
.sys-detail-panel--ultimate .sys-action-btn:hover { background: #fcd34d; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4); }
</style>
