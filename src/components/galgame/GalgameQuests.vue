<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { ScrollText, CheckCircle2, XCircle, Clock, MapPin, ChevronRight, Gift } from 'lucide-vue-next'
import type { Quest } from '@/types/game'

const gameStore = useGameStore()
const allQuests = computed(() => gameStore.state.system.quests || [])

// 测试数据注入
onMounted(() => {
  if (allQuests.value.length === 0) {
    gameStore.state.system.quests = [
      {
        id: 'q_01',
        name: '异变初现：红雾的真相',
        giver: '博丽灵梦',
        description: '幻想乡突然被不知名的红雾笼罩，阳光无法穿透。灵梦委托你去红魔馆方向侦察情况。这可能是一场前所未有的大异变。',
        status: 'active',
        acceptedTurn: 1,
        rewards: [{ type: 'money', description: '5000 钱币', value: 5000 }],
        logs: [
          { turn: 1, date: '纪元123年1月1日', time: '12:00', content: '在神社接到了灵梦的委托。' },
          { turn: 2, date: '纪元123年1月1日', time: '13:00', content: '抵达雾之湖，发现湖面结冰，遇见了妖精琪露诺。' }
        ]
      },
      {
        id: 'q_02',
        name: '香霖堂的跑腿任务',
        giver: '森近霖之助',
        description: '帮霖之助把一批不需要的废铜烂铁送到河童的秘密基地去。',
        status: 'completed',
        acceptedTurn: -5,
        completedTurn: -1,
        rewards: [{ type: 'item', description: '微型魔力结晶 x5' }],
        logs: [
          { turn: -5, date: '纪元122年12月25日', time: '10:00', content: '答应了霖之助的跑腿请求。' },
          { turn: -1, date: '纪元122年12月28日', time: '15:00', content: '成功将货物送达河童基地，获得了报酬。' }
        ]
      }
    ]
  }
})

const activeFilter = ref<'active' | 'completed' | 'failed'>('active')
const filters = [
  { id: 'active', label: '进行中', icon: Clock },
  { id: 'completed', label: '已完成', icon: CheckCircle2 },
  { id: 'failed', label: '已失败', icon: XCircle },
] as const

const filteredQuests = computed(() => {
  return allQuests.value.filter(q => q.status === activeFilter.value)
})

const selectedQuest = ref<Quest | null>(null)

const selectQuest = (quest: Quest) => {
  selectedQuest.value = quest
}
</script>

<template>
  <div class="sys-quests">
    
    <!-- 左侧：任务列表 -->
    <div class="sys-quests__list-area">
      <div class="sys-quests__filters">
        <button 
          v-for="f in filters" 
          :key="f.id"
          class="sys-filter-btn"
          :class="{ 'sys-filter-btn--active': activeFilter === f.id }"
          @click="activeFilter = f.id; selectedQuest = null"
        >
          <component :is="f.icon" :size="14" />
          <span>{{ f.label }}</span>
        </button>
      </div>

      <div class="sys-quests__list">
        <div 
          v-for="quest in filteredQuests" 
          :key="quest.id"
          class="sys-quest-item"
          :class="{ 'sys-quest-item--selected': selectedQuest?.id === quest.id, [`sys-quest-item--${quest.status}`]: true }"
          @click="selectQuest(quest)"
        >
          <div class="sys-quest-item__bg"></div>
          
          <div class="sys-quest-item__main">
            <div class="sys-quest-item__name">{{ quest.name }}</div>
            <div class="sys-quest-item__giver">
              <MapPin :size="12" />
              委托人: {{ quest.giver }}
            </div>
          </div>
          <ChevronRight class="sys-quest-item__arrow" :size="16" />
        </div>

        <div v-if="filteredQuests.length === 0" class="sys-quests__empty">
          NO RECORDS FOUND // 暂无记录
        </div>
      </div>
    </div>

    <!-- 右侧：详情面板 -->
    <div class="sys-quests__detail-area">
      <template v-if="selectedQuest">
        <div class="sys-detail-panel" :class="`sys-detail-panel--${selectedQuest.status}`">
          <!-- 科技装饰线 -->
          <div class="sys-detail-panel__scanner"></div>
          
          <div class="sys-detail__header">
            <div class="sys-detail__type">
              MISSION FILE // {{ selectedQuest.status.toUpperCase() }}
            </div>
            <div class="sys-detail__name">{{ selectedQuest.name }}</div>
            <div class="sys-detail__giver">委托方：{{ selectedQuest.giver }}</div>
          </div>

          <div class="sys-detail__scroll-content">
            
            <div class="sys-detail__section">
              <div class="sys-detail__label">MISSION BRIEFING // 任务简报</div>
              <p class="sys-detail__desc">{{ selectedQuest.description }}</p>
            </div>

            <!-- 奖励区域 -->
            <div class="sys-detail__section" v-if="selectedQuest.rewards && selectedQuest.rewards.length > 0">
              <div class="sys-detail__label">REWARDS // 任务报酬</div>
              <div class="sys-rewards-list">
                <div v-for="(reward, idx) in selectedQuest.rewards" :key="idx" class="sys-reward-item">
                  <Gift :size="14" class="text-marisa-gold" />
                  <span>{{ reward.description }}</span>
                </div>
              </div>
            </div>

            <!-- 进度日志 (通讯轴) -->
            <div class="sys-detail__section" v-if="selectedQuest.logs && selectedQuest.logs.length > 0">
              <div class="sys-detail__label">PROGRESS LOG // 追踪记录</div>
              <div class="sys-timeline">
                <div v-for="(log, idx) in selectedQuest.logs" :key="idx" class="sys-timeline-item">
                  <div class="sys-timeline-node"></div>
                  <div class="sys-timeline-content">
                    <div class="sys-timeline-meta">回合 {{ log.turn }} // {{ log.date }} {{ log.time }}</div>
                    <div class="sys-timeline-text">{{ log.content }}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </template>
      <div v-else class="sys-detail-empty">
        <ScrollText :size="48" class="sys-detail-empty__icon" />
        <p>SELECT A MISSION TO VIEW DETAILS</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.sys-quests {
  width: 100%;
  height: 100%;
  display: flex;
  padding: 32px;
  gap: 32px;
  box-sizing: border-box;
}

/* ====================================================
   左侧：任务列表区
   ==================================================== */
.sys-quests__list-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 45%;
}

.sys-quests__filters {
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
.sys-filter-btn--active { background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #fff; }

.sys-quests__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 12px;
}
.sys-quests__list::-webkit-scrollbar { width: 4px; }
.sys-quests__list::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
.sys-quests__list::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.5); }

.sys-quest-item {
  position: relative;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.1);
  border-left: 4px solid transparent;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}
.sys-quest-item__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.05), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}
.sys-quest-item:hover { background: rgba(255,255,255,0.05); transform: translateX(4px); }

.sys-quest-item--active { border-left-color: #38bdf8; }
.sys-quest-item--completed { border-left-color: #22c55e; }
.sys-quest-item--failed { border-left-color: #ef4444; }

.sys-quest-item--selected.sys-quest-item--active { border-color: #38bdf8; background: rgba(56, 189, 248, 0.1); }
.sys-quest-item--selected.sys-quest-item--completed { border-color: #22c55e; background: rgba(34, 197, 94, 0.1); }
.sys-quest-item--selected.sys-quest-item--failed { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }

.sys-quest-item__main { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.sys-quest-item__name { font-family: 'Noto Serif SC', serif; font-size: 1.05rem; color: #fff; font-weight: 700; }
.sys-quest-item__giver { font-family: 'Noto Serif SC', serif; font-size: 0.8rem; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 4px; }

.sys-quest-item__arrow { color: rgba(255,255,255,0.2); transition: all 0.2s; }
.sys-quest-item--selected .sys-quest-item__arrow { color: #fff; transform: translateX(4px); }

.sys-quests__empty { text-align: center; padding: 40px; font-family: 'Oswald', sans-serif; color: rgba(255,255,255,0.2); letter-spacing: 0.1em; }

/* ====================================================
   右侧：详情面板区
   ==================================================== */
.sys-quests__detail-area {
  flex: 1;
  background: rgba(5, 10, 15, 0.4);
  border-left: 1px solid rgba(255,255,255,0.05);
  display: flex;
  position: relative;
  overflow: hidden;
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
  z-index: 10;
}
.sys-detail-panel--completed .sys-detail-panel__scanner { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
.sys-detail-panel--failed .sys-detail-panel__scanner { background: #ef4444; box-shadow: 0 0 10px #ef4444; }

.sys-detail__header {
  padding: 32px 32px 24px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: linear-gradient(180deg, rgba(255,255,255,0.03), transparent);
}
.sys-detail__type { font-family: 'Oswald', sans-serif; font-size: 0.8rem; color: #38bdf8; letter-spacing: 0.1em; margin-bottom: 8px; }
.sys-detail-panel--completed .sys-detail__type { color: #22c55e; }
.sys-detail-panel--failed .sys-detail__type { color: #ef4444; }
.sys-detail__name { font-family: 'Noto Serif SC', serif; font-size: 1.8rem; color: #fff; font-weight: 700; margin-bottom: 8px; }
.sys-detail__giver { font-family: 'Noto Serif SC', serif; font-size: 0.9rem; color: rgba(255,255,255,0.6); }

.sys-detail__scroll-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.sys-detail__scroll-content::-webkit-scrollbar { width: 4px; }
.sys-detail__scroll-content::-webkit-scrollbar-track { background: transparent; }
.sys-detail__scroll-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }

.sys-detail__section {}
.sys-detail__label { font-family: 'Oswald', sans-serif; font-size: 0.8rem; color: rgba(255,255,255,0.5); letter-spacing: 0.1em; margin-bottom: 12px; }
.sys-detail__desc { font-family: 'Noto Serif SC', serif; font-size: 0.95rem; color: rgba(255,255,255,0.9); line-height: 1.8; }

.sys-rewards-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sys-reward-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 2px;
  color: #fff;
  font-family: 'Noto Serif SC', serif;
  font-size: 0.9rem;
}

/* 时间轴日志 */
.sys-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sys-timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}
.sys-timeline-node {
  width: 8px; height: 8px;
  background: rgba(255,255,255,0.5);
  border-radius: 50%;
  margin-top: 6px;
  position: relative;
  z-index: 1;
}
.sys-timeline-item:not(:last-child) .sys-timeline-node::after {
  content: '';
  position: absolute;
  top: 12px; left: 3px;
  width: 2px; height: calc(100% + 16px);
  background: rgba(255,255,255,0.1);
}
.sys-detail-panel--active .sys-timeline-item:last-child .sys-timeline-node {
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}
.sys-timeline-content {
  flex: 1;
  background: rgba(0,0,0,0.2);
  padding: 12px 16px;
  border-left: 2px solid rgba(255,255,255,0.1);
}
.sys-timeline-meta {
  font-family: 'Oswald', sans-serif;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  margin-bottom: 6px;
  letter-spacing: 0.05em;
}
.sys-timeline-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.8);
  line-height: 1.6;
}
</style>
