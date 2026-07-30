<script setup lang="ts">
import { useGalgameStore } from '@/stores/galgame'
import { ref, onMounted, onUpdated, nextTick } from 'vue'

const galgameStore = useGalgameStore()
const historyContainer = ref<HTMLElement | null>(null)

// 自动滚动到最底部
const scrollToBottom = () => {
  if (historyContainer.value) {
    historyContainer.value.scrollTop = historyContainer.value.scrollHeight
  }
}

onMounted(() => {
  scrollToBottom()
})

onUpdated(() => {
  nextTick(() => {
    scrollToBottom()
  })
})
</script>

<template>
  <div class="sys-history">
    
    <div class="sys-history__header">
      <div class="sys-history__header-title">COMMUNICATION LOG</div>
      <div class="sys-history__header-subtitle">对话记录索引</div>
      <div class="sys-history__header-line"></div>
    </div>

    <div class="sys-history__scroll-area" ref="historyContainer">
      <div class="sys-history__content">
        
        <div v-if="galgameStore.dialogueHistory.length === 0" class="sys-history__empty">
          NO RECORDS FOUND // 暂无对话记录
        </div>

        <div
          v-for="(line, i) in galgameStore.dialogueHistory"
          :key="i"
          class="sys-history__item"
          :class="{ 'sys-history__item--narrator': !line.speaker }"
        >
          <!-- 装饰节点 -->
          <div class="sys-history__node"></div>
          
          <div class="sys-history__box">
            <div class="sys-history__speaker" v-if="line.speaker">
              {{ line.speaker }}
            </div>
            <div class="sys-history__speaker sys-history__speaker--narr" v-else>
              SYSTEM NARRATIVE
            </div>
            <div class="sys-history__text">{{ line.text }}</div>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
.sys-history {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 32px 48px;
  box-sizing: border-box;
}

.sys-history__header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 24px;
}
.sys-history__header-title {
  font-family: 'Oswald', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.1em;
}
.sys-history__header-subtitle {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.4);
}
.sys-history__header-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.2), transparent);
}

.sys-history__scroll-area {
  flex: 1;
  overflow-y: auto;
  padding-right: 16px;
}

/* 滚动条样式 */
.sys-history__scroll-area::-webkit-scrollbar {
  width: 6px;
}
.sys-history__scroll-area::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}
.sys-history__scroll-area::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.5);
  border-radius: 3px;
}
.sys-history__scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.8);
}

.sys-history__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 40px;
}

.sys-history__empty {
  text-align: center;
  font-family: 'Oswald', sans-serif;
  color: rgba(255,255,255,0.2);
  margin-top: 100px;
  letter-spacing: 0.2em;
}

/* ====================================================
   时间轴样式的对话条目
   ==================================================== */
.sys-history__item {
  display: flex;
  gap: 24px;
  position: relative;
  animation: logFadeIn 0.3s ease-out forwards;
}

@keyframes logFadeIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 左侧的时间轴节点 */
.sys-history__node {
  width: 8px;
  height: 8px;
  background: #a855f7;
  border-radius: 50%;
  margin-top: 8px;
  position: relative;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.8);
  flex-shrink: 0;
}
/* 节点连线 */
.sys-history__item:not(:last-child) .sys-history__node::after {
  content: '';
  position: absolute;
  top: 12px;
  left: 3px;
  width: 2px;
  height: calc(100% + 24px); /* 连接到下一个 */
  background: rgba(168, 85, 247, 0.2);
}

.sys-history__box {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px 20px;
  border-radius: 4px;
  transition: all 0.2s ease;
}
.sys-history__box:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(168, 85, 247, 0.3);
}

.sys-history__speaker {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.85rem;
  color: #a855f7;
  font-weight: 700;
  margin-bottom: 8px;
}
.sys-history__speaker--narr {
  font-family: 'Oswald', sans-serif;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.1em;
}

.sys-history__text {
  font-family: 'Noto Serif SC', serif;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

/* 旁白样式差异化 */
.sys-history__item--narrator .sys-history__node {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: none;
}
.sys-history__item--narrator:not(:last-child) .sys-history__node::after {
  background: rgba(255, 255, 255, 0.1);
}
.sys-history__item--narrator .sys-history__text {
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}
</style>
