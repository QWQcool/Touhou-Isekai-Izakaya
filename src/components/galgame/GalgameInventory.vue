<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/utils/confirm'
import { Package, Beaker, Key, Box, Trash2 } from 'lucide-vue-next'
import type { Item } from '@/types/game'

const gameStore = useGameStore()
const playerItems = computed(() => gameStore.state.player.items || [])

// 注入测试数据 (仅在没有任何物品时注入，方便测试)
onMounted(() => {
  if (playerItems.value.length === 0) {
    gameStore.state.player.items = [
      { id: 'item_01', name: '特制高能量便当', count: 3, description: '异界居酒屋特制的便当，能恢复大量生命值和体力。', type: 'consumable', effects: { heal: 200 } },
      { id: 'item_02', name: '微型魔力结晶', count: 12, description: '蕴含着微弱魔法能量的晶体，可以用于合成或者直接吸收。', type: 'material' },
      { id: 'item_03', name: '八卦炉的碎片', count: 1, description: '散发着惊人热量的神秘碎片，看起来非常危险。', type: 'key_item' },
      { id: 'item_04', name: '冰精的翅膀粉末', count: 5, description: '摸起来极其冰凉的粉末，是制作降温药剂的绝佳材料。', type: 'material' },
      { id: 'item_05', name: '神社的护身符', count: 2, description: '灵梦亲手制作的护身符，据说能带来好运（大概吧）。', type: 'consumable', effects: { buff: 'luck_up' } },
    ]
  }
})

const activeFilter = ref('all')
const filters = [
  { id: 'all', label: '全部', icon: Package },
  { id: 'consumable', label: '消耗品', icon: Beaker },
  { id: 'material', label: '材料', icon: Box },
  { id: 'key_item', label: '关键道具', icon: Key },
]

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return playerItems.value
  return playerItems.value.filter(item => item.type === activeFilter.value)
})

const selectedItem = ref<Item | null>(null)

const selectItem = (item: Item) => {
  selectedItem.value = item
}

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    'consumable': '消耗品',
    'material': '合成材料',
    'key_item': '关键道具',
    'equipment': '装备'
  }
  return map[type] || type
}

const toastStore = useToastStore()
const { confirm: customConfirm } = useConfirm()

const handleDiscardItem = async () => {
  const item = selectedItem.value
  if (!item) return
  if (await customConfirm(`确定要将 [${item.name}] 销毁吗？\n这是不可逆转的操作，请三思喵！`, { destructive: true })) {
    gameStore.applyAction({
      type: 'INVENTORY',
      target: 'items',
      op: 'remove',
      value: { id: item.id || item.name, count: item.count || 1 }
    })
    toastStore.addToast({ message: `已丢弃 ${item.name}`, type: 'warning' })
    selectedItem.value = null
  }
}
</script>

<template>
  <div class="sys-inventory">
    
    <!-- 左侧：物品列表区 -->
    <div class="sys-inventory__list-area">
      <div class="sys-inventory__filters">
        <button 
          v-for="f in filters" 
          :key="f.id"
          class="sys-filter-btn"
          :class="{ 'sys-filter-btn--active': activeFilter === f.id }"
          @click="activeFilter = f.id; selectedItem = null"
        >
          <component :is="f.icon" :size="14" />
          <span>{{ f.label }}</span>
        </button>
      </div>

      <div class="sys-inventory__grid">
        <div 
          v-for="item in filteredItems" 
          :key="item.id"
          class="sys-item-card"
          :class="{ 'sys-item-card--selected': selectedItem?.id === item.id }"
          @click="selectItem(item)"
        >
          <div class="sys-item-card__bg"></div>
          <div class="sys-item-card__count">x{{ item.count }}</div>
          <div class="sys-item-card__icon-box">
            <component :is="item.type === 'consumable' ? Beaker : item.type === 'key_item' ? Key : Box" :size="24" class="sys-item-card__icon" />
          </div>
          <div class="sys-item-card__name">{{ item.name }}</div>
        </div>

        <div v-if="filteredItems.length === 0" class="sys-inventory__empty">
          DATA NOT FOUND // 无匹配物品
        </div>
      </div>
    </div>

    <!-- 右侧：物品详情区 (扫描线科幻风格) -->
    <div class="sys-inventory__detail-area">
      <template v-if="selectedItem">
        <div class="sys-detail-panel">
          <!-- 科技装饰线 -->
          <div class="sys-detail-panel__scanner"></div>
          <div class="sys-detail-panel__corner sys-detail-panel__corner--tl"></div>
          <div class="sys-detail-panel__corner sys-detail-panel__corner--br"></div>

          <div class="sys-detail__header">
            <div class="sys-detail__icon-large">
              <component :is="selectedItem.type === 'consumable' ? Beaker : selectedItem.type === 'key_item' ? Key : Box" :size="48" color="#a855f7" />
            </div>
            <div class="sys-detail__title-box">
              <div class="sys-detail__name">{{ selectedItem.name }}</div>
              <div class="sys-detail__type">TYPE // {{ getTypeLabel(selectedItem.type) }}</div>
            </div>
          </div>

          <div class="sys-detail__info-row">
            <span class="sys-detail__label">INVENTORY COUNT</span>
            <span class="sys-detail__value">x{{ selectedItem.count }}</span>
          </div>

          <div class="sys-detail__desc-box">
            <div class="sys-detail__label">DESCRIPTION</div>
            <p class="sys-detail__desc">{{ selectedItem.description }}</p>
          </div>

          <div v-if="selectedItem.effects && Object.keys(selectedItem.effects).length > 0" class="sys-detail__effects-box">
            <div class="sys-detail__label">EFFECTS // 效果参数</div>
            <div class="sys-effects-grid">
              <div v-for="(val, key) in selectedItem.effects" :key="key" class="sys-effect-item">
                <span class="sys-effect-key">{{ key }}</span>
                <span class="sys-effect-val">{{ val }}</span>
              </div>
            </div>
          </div>

          <div class="sys-detail__actions">
            <button class="sys-action-btn sys-action-btn--danger" @click="handleDiscardItem">
              <Trash2 :size="16" />
              <span>DISCARD // 丢弃该物品</span>
            </button>
          </div>
        </div>
      </template>
      <div v-else class="sys-detail-empty">
        <Package :size="48" class="sys-detail-empty__icon" />
        <p>SELECT AN ITEM TO VIEW DETAILS</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.sys-inventory {
  width: 100%;
  height: 100%;
  display: flex;
  padding: 32px;
  gap: 32px;
  box-sizing: border-box;
}

/* ====================================================
   左侧：物品列表区
   ==================================================== */
.sys-inventory__list-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 65%;
}

.sys-inventory__filters {
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
.sys-filter-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.sys-filter-btn--active {
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid #a855f7;
  color: #fff;
}

.sys-inventory__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding-right: 12px;
  align-content: flex-start;
}
.sys-inventory__grid::-webkit-scrollbar { width: 4px; }
.sys-inventory__grid::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
.sys-inventory__grid::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.5); }

/* 物品卡片 */
.sys-item-card {
  position: relative;
  aspect-ratio: 1;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
}
.sys-item-card__bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(168,85,247,0.1), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}
.sys-item-card:hover {
  border-color: rgba(168,85,247,0.5);
  transform: translateY(-4px);
}
.sys-item-card:hover .sys-item-card__bg { opacity: 1; }

.sys-item-card--selected {
  border-color: #a855f7;
  background: rgba(168,85,247,0.1);
  box-shadow: inset 0 0 15px rgba(168,85,247,0.2);
}

.sys-item-card__count {
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Oswald', sans-serif;
  font-size: 0.8rem;
  color: #a855f7;
  font-weight: 700;
}
.sys-item-card__icon-box {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border-radius: 50%;
  margin-bottom: 12px;
  color: rgba(255,255,255,0.8);
}
.sys-item-card__name {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.85rem;
  color: #fff;
  text-align: center;
  padding: 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sys-inventory__empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  font-family: 'Oswald', sans-serif;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.1em;
}

/* ====================================================
   右侧：详情面板区
   ==================================================== */
.sys-inventory__detail-area {
  flex: 1;
  background: rgba(10,5,15,0.4);
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
.sys-detail-empty__icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

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

/* 科幻细节装饰 */
.sys-detail-panel__scanner {
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: #a855f7;
  box-shadow: 0 0 10px #a855f7;
  animation: scanline 4s linear infinite;
  opacity: 0.3;
}
@keyframes scanline {
  0% { top: 0; opacity: 0; }
  10% { opacity: 0.5; }
  90% { opacity: 0.5; }
  100% { top: 100%; opacity: 0; }
}

.sys-detail-panel__corner {
  position: absolute;
  width: 16px; height: 16px;
  border: 2px solid #a855f7;
}
.sys-detail-panel__corner--tl { top: 16px; left: 16px; border-right: none; border-bottom: none; }
.sys-detail-panel__corner--br { bottom: 16px; right: 16px; border-left: none; border-top: none; }

/* 详情内容 */
.sys-detail__header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
}
.sys-detail__icon-large {
  width: 80px; height: 80px;
  background: rgba(168,85,247,0.1);
  border: 1px solid rgba(168,85,247,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%);
}
.sys-detail__title-box {
  flex: 1;
}
.sys-detail__name {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.6rem;
  color: #fff;
  font-weight: 700;
  margin-bottom: 4px;
}
.sys-detail__type {
  font-family: 'Oswald', sans-serif;
  font-size: 0.8rem;
  color: #a855f7;
  letter-spacing: 0.1em;
}

.sys-detail__info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 24px;
}
.sys-detail__label {
  font-family: 'Oswald', sans-serif;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.1em;
}
.sys-detail__value {
  font-family: 'Oswald', sans-serif;
  font-size: 1rem;
  color: #fff;
  font-weight: 700;
}

.sys-detail__desc-box {
  margin-bottom: 24px;
}
.sys-detail__effects-box {
  flex: 1;
}
.sys-effects-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
.sys-effect-item {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.3);
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 2px;
}
.sys-effect-key {
  font-family: 'Oswald', sans-serif;
  font-size: 0.8rem;
  color: #a855f7;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.sys-effect-val {
  font-family: 'Oswald', sans-serif;
  font-size: 0.95rem;
  color: #fff;
  font-weight: 700;
}

.sys-detail__actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}
.sys-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  background: #a855f7;
  color: #fff;
  border: none;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
  transition: all 0.2s;
}
.sys-action-btn:hover:not(:disabled) {
  background: #c084fc;
  transform: translateX(-4px);
  box-shadow: 0 4px 15px rgba(168,85,247,0.4);
}
.sys-action-btn--danger {
  background: rgba(255, 74, 74, 0.2);
  color: #ff4a4a;
  border: 1px solid #ff4a4a;
}
.sys-action-btn--danger:hover:not(:disabled) {
  background: #ff4a4a;
  color: #fff;
  box-shadow: 0 4px 15px rgba(255, 74, 74, 0.4);
}
</style>
