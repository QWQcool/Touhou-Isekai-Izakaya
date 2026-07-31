<script setup lang="ts">
import { computed, watch } from 'vue';
import { useGameStore } from '@/stores/game';
import { useToastStore } from '@/stores/toast';
import { audioManager } from '@/services/audio';
import { CheckCircle2, XCircle, Handshake } from 'lucide-vue-next';

const gameStore = useGameStore();
const toastStore = useToastStore();

const pendingPromise = computed(() => gameStore.state.system.pending_promise_trigger);

watch(
  () => pendingPromise.value,
  (newVal) => {
    if (newVal) {
      audioManager.playPopupSound();
    }
  }
);

function handleAccept() {
  audioManager.playClick();
  if (pendingPromise.value) {
    const promise = {
      ...pendingPromise.value,
      status: 'active' as const,
      acceptedTurn: gameStore.state.system.turn_count,
      createdTime: new Date().toLocaleString()
    };
    if (!gameStore.state.system.promises) {
      gameStore.state.system.promises = [];
    }
    gameStore.state.system.promises.push(promise);
    gameStore.setPendingPromise(null);
    toastStore.addToast(`已缔结约定：与 ${promise.giver}`, 'success');
  }
}

function handleDecline() {
  audioManager.playSoftClick();
  if (pendingPromise.value) {
    gameStore.setPendingPromise(null);
    toastStore.addToast('已拒绝约定', 'info');
  }
}
</script>

<template>
  <Transition name="gal-fade">
    <div v-if="pendingPromise" class="gal-offer-overlay">
      <div class="gal-offer-modal gal-offer-modal--promise">
        <!-- 赛博装饰背景 -->
        <div class="gal-offer__bg-grid"></div>
        <div class="gal-offer__scanner"></div>
        
        <!-- 头部 -->
        <div class="gal-offer__header">
          <div class="gal-offer__type-badge">
            <Handshake :size="16" />
            <span>NEW AGREEMENT // 新增协议约定</span>
          </div>
          <div class="gal-offer__title">与 {{ pendingPromise.giver }} 的约定</div>
          <div class="gal-offer__giver">
            <span class="opacity-50">TARGET: </span>
            <span class="text-blue-400">{{ pendingPromise.giver }}</span>
          </div>
        </div>

        <div class="gal-offer__content">
          <!-- 约定简报 -->
          <div class="gal-offer__section">
            <div class="gal-offer__label">AGREEMENT DETAILS // 约定内容</div>
            <p class="gal-offer__desc">"{{ pendingPromise.content }}"</p>
          </div>
        </div>

        <!-- 动作按钮 -->
        <div class="gal-offer__actions">
          <button class="gal-btn gal-btn--decline" @click="handleDecline">
            <XCircle :size="16" /> DECLINE // 拒绝
          </button>
          <button class="gal-btn gal-btn--accept" @click="handleAccept">
            <CheckCircle2 :size="16" /> ACCEPT AGREEMENT // 缔结约定
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
  background: rgba(10, 15, 25, 0.95); /* 偏蓝的深色背景 */
  border: 1px solid rgba(96, 165, 250, 0.3);
  box-shadow: 0 0 30px rgba(96, 165, 250, 0.15), inset 0 0 20px rgba(0,0,0,0.8);
  clip-path: polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gal-offer__bg-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(96, 165, 250, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(96, 165, 250, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}

.gal-offer__scanner {
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: #60a5fa;
  box-shadow: 0 0 10px #60a5fa;
  opacity: 0.3;
  animation: scanline 3s linear infinite;
}
@keyframes scanline {
  0% { transform: translateY(0); }
  100% { transform: translateY(300px); }
}

.gal-offer__header {
  padding: 32px 32px 24px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.2);
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.05), transparent);
}

.gal-offer__type-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #60a5fa;
  font-family: 'Oswald', sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  margin-bottom: 12px;
}

.gal-offer__title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.8rem;
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

.gal-offer__desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.1rem;
  color: rgba(255,255,255,0.9);
  line-height: 1.6;
  font-style: italic;
  background: rgba(96, 165, 250, 0.05);
  padding: 16px;
  border-left: 2px solid rgba(96, 165, 250, 0.5);
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
  background: rgba(96, 165, 250, 0.15);
  border: 1px solid #60a5fa;
  color: #fff;
  box-shadow: 0 0 15px rgba(96, 165, 250, 0.2);
}
.gal-btn--accept:hover {
  background: #60a5fa;
  box-shadow: 0 0 25px rgba(96, 165, 250, 0.4);
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
