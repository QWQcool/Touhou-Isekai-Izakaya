<script setup lang="ts">
import { computed, watch } from 'vue';
import { useGameStore } from '@/stores/game';
import { useToastStore } from '@/stores/toast';
import { audioManager } from '@/services/audio';
import { ScrollText, CheckCircle2, XCircle, Gift, Coins, Package, MapPin, Target, Zap } from 'lucide-vue-next';

const gameStore = useGameStore();
const toastStore = useToastStore();

const pendingQuest = computed(() => gameStore.state.system.pending_quest_trigger);

watch(
  () => pendingQuest.value,
  (newVal) => {
    if (newVal) {
      audioManager.playPopupSound();
    }
  }
);

function getRewardIcon(type: string) {
  if (type === 'money') return Coins;
  if (type === 'item') return Package;
  if (type === 'spell_card') return Zap;
  if (type === 'attribute') return Target;
  if (type === 'event') return MapPin;
  return Gift;
}

function formatRewardValue(reward: any) {
  if (!reward.value) return '';
  if (reward.type === 'item' && typeof reward.value === 'string' && reward.value.includes(',')) {
    return reward.value.split(',')[0];
  }
  return reward.value;
}

function handleAccept() {
  audioManager.playClick();
  if (pendingQuest.value) {
    const quest = {
      ...pendingQuest.value,
      status: 'active' as const,
      acceptedTurn: gameStore.state.system.turn_count
    };
    gameStore.addQuest(quest);
    gameStore.setPendingQuest(null);
    toastStore.addToast(`已接受任务：${quest.name}`, 'success');
  }
}

function handleDecline() {
  audioManager.playSoftClick();
  if (pendingQuest.value) {
    gameStore.setPendingQuest(null);
    toastStore.addToast('已拒绝委托', 'info');
  }
}
</script>

<template>
  <Transition name="gal-fade">
    <div v-if="pendingQuest" class="gal-offer-overlay">
      <div class="gal-offer-modal gal-offer-modal--quest">
        <!-- 赛博装饰背景 -->
        <div class="gal-offer__bg-grid"></div>
        <div class="gal-offer__scanner"></div>
        
        <!-- 头部 -->
        <div class="gal-offer__header">
          <div class="gal-offer__type-badge">
            <ScrollText :size="16" />
            <span>NEW MISSION // 新增战术任务</span>
          </div>
          <div class="gal-offer__title">{{ pendingQuest.name }}</div>
          <div class="gal-offer__giver">
            <span class="opacity-50">ISSUER: </span>
            <span class="text-touhou-red">{{ pendingQuest.giver }}</span>
          </div>
        </div>

        <div class="gal-offer__content">
          <!-- 任务简报 -->
          <div class="gal-offer__section">
            <div class="gal-offer__label">MISSION BRIEFING // 任务简报</div>
            <p class="gal-offer__desc">"{{ pendingQuest.description }}"</p>
          </div>

          <!-- 达成条件 -->
          <div v-if="pendingQuest.requirements && pendingQuest.requirements.length > 0" class="gal-offer__section">
            <div class="gal-offer__label">REQUIREMENTS // 达成条件</div>
            <ul class="gal-offer__list">
              <li v-for="(req, idx) in pendingQuest.requirements" :key="idx">
                <Target :size="12" class="text-touhou-red opacity-70" />
                <span>{{ req }}</span>
              </li>
            </ul>
          </div>

          <!-- 战利品预测 -->
          <div v-if="pendingQuest.rewards && pendingQuest.rewards.length > 0" class="gal-offer__section">
            <div class="gal-offer__label text-marisa-gold">EXPECTED REWARDS // 预计战利品</div>
            <div class="gal-offer__rewards">
              <div v-for="(reward, idx) in pendingQuest.rewards" :key="idx" class="gal-offer__reward-item">
                <component :is="getRewardIcon(reward.type)" :size="14" class="text-marisa-gold" />
                <span class="gal-offer__reward-desc">{{ reward.description }}</span>
                <span v-if="reward.value" class="gal-offer__reward-val">{{ formatRewardValue(reward) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 动作按钮 -->
        <div class="gal-offer__actions">
          <button class="gal-btn gal-btn--decline" @click="handleDecline">
            <XCircle :size="16" /> DECLINE // 拒绝
          </button>
          <button class="gal-btn gal-btn--accept" @click="handleAccept">
            <CheckCircle2 :size="16" /> ACCEPT MISSION // 接受任务
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.gal-offer-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
}

.gal-offer-modal {
  position: relative;
  width: 540px;
  background: rgba(15, 10, 10, 0.95);
  border: 1px solid rgba(255, 74, 74, 0.3);
  box-shadow: 0 0 30px rgba(255, 74, 74, 0.15), inset 0 0 20px rgba(0,0,0,0.8);
  clip-path: polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gal-offer__bg-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 74, 74, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 74, 74, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}

.gal-offer__scanner {
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: #ff4a4a;
  box-shadow: 0 0 10px #ff4a4a;
  opacity: 0.3;
  animation: scanline 3s linear infinite;
}
@keyframes scanline {
  0% { transform: translateY(0); }
  100% { transform: translateY(500px); }
}

.gal-offer__header {
  padding: 32px 32px 24px;
  border-bottom: 1px solid rgba(255, 74, 74, 0.2);
  background: linear-gradient(180deg, rgba(255,74,74,0.05), transparent);
}

.gal-offer__type-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #ff4a4a;
  font-family: 'Oswald', sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  margin-bottom: 12px;
}

.gal-offer__title {
  font-family: 'Noto Serif SC', serif;
  font-size: 2rem;
  color: #fff;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.gal-offer__giver {
  font-family: 'Oswald', sans-serif;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.7);
  letter-spacing: 0.05em;
}

.gal-offer__content {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.gal-offer__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gal-offer__label {
  font-family: 'Oswald', sans-serif;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  letter-spacing: 0.1em;
}
.gal-offer__label.text-marisa-gold {
  color: rgba(251, 191, 36, 0.7);
}

.gal-offer__desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.1rem;
  color: rgba(255,255,255,0.9);
  line-height: 1.6;
  font-style: italic;
  background: rgba(255, 74, 74, 0.05);
  padding: 16px;
  border-left: 2px solid rgba(255, 74, 74, 0.5);
}

.gal-offer__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gal-offer__list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Noto Serif SC', serif;
  font-size: 0.95rem;
  color: rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.03);
  padding: 8px 12px;
}

.gal-offer__rewards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.gal-offer__reward-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(251, 191, 36, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.1);
  padding: 10px 16px;
}
.gal-offer__reward-desc {
  flex: 1;
  font-family: 'Noto Serif SC', serif;
  font-size: 0.95rem;
  color: #fff;
}
.gal-offer__reward-val {
  font-family: 'Oswald', sans-serif;
  color: #fbbf24;
  font-weight: 700;
}

.gal-offer__actions {
  display: flex;
  padding: 24px 32px;
  gap: 16px;
  background: rgba(0,0,0,0.4);
  border-top: 1px solid rgba(255,255,255,0.05);
}

.gal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  font-family: 'Oswald', sans-serif;
  font-size: 1rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
}

.gal-btn--decline {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
}
.gal-btn--decline:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.gal-btn--accept {
  background: rgba(255, 74, 74, 0.15);
  border: 1px solid #ff4a4a;
  color: #fff;
  box-shadow: 0 0 15px rgba(255, 74, 74, 0.2);
}
.gal-btn--accept:hover {
  background: #ff4a4a;
  box-shadow: 0 0 25px rgba(255, 74, 74, 0.4);
}

.gal-fade-enter-active,
.gal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.gal-fade-enter-from,
.gal-fade-leave-to {
  opacity: 0;
}
</style>
