<script setup lang="ts">
import { ref, watch } from 'vue'
import { 
  X,
  Backpack, 
  Sparkles, 
  Zap, 
  ScrollText,
  Bookmark
} from 'lucide-vue-next'
import GalgameHistory from './GalgameHistory.vue'
import GalgameInventory from './GalgameInventory.vue'
import GalgameSpells from './GalgameSpells.vue'
import GalgameTalents from './GalgameTalents.vue'
import GalgameQuests from './GalgameQuests.vue'

const props = defineProps<{
  isOpen: boolean
  defaultTab?: string
}>()

const emit = defineEmits(['close'])

const activeTab = ref(props.defaultTab || 'inventory')

// 关键路由逻辑：当菜单被打开时，强制同步当前的 Tab
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.defaultTab) {
    activeTab.value = props.defaultTab
  }
})

const tabs = [
  { id: 'inventory', label: 'PACKAGE', name: '行囊', icon: Backpack },
  { id: 'spells', label: 'SPELLS', name: '符卡', icon: Sparkles },
  { id: 'talents', label: 'TALENTS', name: '天赋', icon: Zap },
  { id: 'quests', label: 'QUESTS', name: '任务', icon: ScrollText },
  { id: 'history', label: 'LOG', name: '记录', icon: Bookmark },
]

// Handle clicking outside to close
const handleBackdropClick = (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains('sys-menu-backdrop')) {
    closeMenu()
  }
}

const closeMenu = () => {
  emit('close')
}
</script>

<template>
  <Transition name="sys-fade">
    <div v-if="isOpen" class="sys-menu-backdrop" @click="handleBackdropClick">
      
      <!-- 主视窗外壳 -->
      <div class="sys-menu-window" @click.stop>
        <!-- 装饰线：顶部科幻扫面线 -->
        <div class="sys-menu__deco-top"></div>
        <div class="sys-menu__deco-bottom"></div>

        <!-- 内部布局：左侧导航 + 右侧内容 -->
        <div class="sys-menu__layout">
          
          <!-- 左侧：战术导航栏 -->
          <nav class="sys-menu__nav">
            <div class="sys-menu__nav-header">
              <span class="sys-menu__nav-title">SYSTEM 终端</span>
              <span class="sys-menu__nav-subtitle">VER 1.0.4 // TOUHOU ISEKAI</span>
            </div>

            <div class="sys-menu__tabs">
              <button 
                v-for="tab in tabs" 
                :key="tab.id"
                class="sys-menu__tab"
                :class="{ 'sys-menu__tab--active': activeTab === tab.id }"
                @click="activeTab = tab.id"
              >
                <div class="sys-menu__tab-bg"></div>
                <component :is="tab.icon" :size="18" class="sys-menu__tab-icon" />
                <div class="sys-menu__tab-text">
                  <span class="sys-menu__tab-label">{{ tab.label }}</span>
                  <span class="sys-menu__tab-name">{{ tab.name }}</span>
                </div>
                <div v-if="activeTab === tab.id" class="sys-menu__tab-active-indicator"></div>
              </button>
            </div>
            
            <button class="sys-menu__close-btn" @click="closeMenu">
              <X :size="16" />
              <span>CLOSE (关闭)</span>
            </button>
          </nav>

          <!-- 右侧：动态功能区 (第一步先用 Placeholder 占位) -->
          <main class="sys-menu__content">
            
            <GalgameInventory v-if="activeTab === 'inventory'" />
            <GalgameSpells v-else-if="activeTab === 'spells'" />
            <GalgameTalents v-else-if="activeTab === 'talents'" />
            <GalgameHistory v-else-if="activeTab === 'history'" />
            <GalgameQuests v-else-if="activeTab === 'quests'" />

            <!-- 占位符内容，后续我们会根据 activeTab 挂载不同的组件 -->
            <div v-else class="sys-content-placeholder">
              <component :is="tabs.find(t => t.id === activeTab)?.icon" :size="48" class="sys-placeholder-icon" />
              <h2>{{ tabs.find(t => t.id === activeTab)?.label }} SYSTEM ONLINE</h2>
              <p>等待模块接驳中... (模块尚未加载)</p>
            </div>
          </main>
          
        </div>
      </div>

    </div>
  </Transition>
</template>

<style scoped>
/* ====================================================
   全局蒙版层 (高斯模糊背景)
   ==================================================== */
.sys-menu-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(10, 5, 10, 0.7);
  backdrop-filter: blur(12px);
  z-index: 100; /* 高于一切 HUD */
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
}

/* ====================================================
   主视窗容器
   ==================================================== */
.sys-menu-window {
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
  background: linear-gradient(135deg, rgba(20, 15, 20, 0.95), rgba(10, 5, 10, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset;
  clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);
  position: relative;
  display: flex;
  flex-direction: column;
  transform: translateZ(0);
}

/* 上下科技装饰线 */
.sys-menu__deco-top {
  position: absolute;
  top: 0; left: 40px; right: 0; height: 3px;
  background: linear-gradient(90deg, #a855f7, #4a9eff, transparent);
  box-shadow: 0 0 10px #a855f7;
}
.sys-menu__deco-bottom {
  position: absolute;
  bottom: 0; right: 40px; left: 0; height: 1px;
  background: linear-gradient(-90deg, #ff4a4a, transparent);
}

.sys-menu__layout {
  display: flex;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

/* ====================================================
   左侧：战术导航栏
   ==================================================== */
.sys-menu__nav {
  width: 260px;
  background: rgba(0, 0, 0, 0.4);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  padding: 24px 0;
  position: relative;
}

.sys-menu__nav-header {
  padding: 0 24px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 16px;
}
.sys-menu__nav-title {
  font-family: 'Oswald', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.15em;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}
.sys-menu__nav-subtitle {
  font-family: monospace;
  font-size: 0.65rem;
  color: rgba(255,255,255,0.4);
  letter-spacing: 0.1em;
}

.sys-menu__tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.sys-menu__tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  text-align: left;
  transition: all 0.3s ease;
  clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%);
}

.sys-menu__tab-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.sys-menu__tab > *:not(.sys-menu__tab-bg) {
  position: relative;
  z-index: 1;
}

.sys-menu__tab:hover {
  color: rgba(255, 255, 255, 0.9);
  padding-left: 24px;
}
.sys-menu__tab:hover .sys-menu__tab-bg { opacity: 0.5; }

.sys-menu__tab--active {
  color: #fff;
  padding-left: 24px;
}
.sys-menu__tab--active .sys-menu__tab-bg {
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.2), transparent);
  opacity: 1;
}

.sys-menu__tab-icon {
  filter: drop-shadow(0 0 4px rgba(0,0,0,0.5));
}
.sys-menu__tab--active .sys-menu__tab-icon {
  color: #a855f7;
  filter: drop-shadow(0 0 6px rgba(168,85,247,0.6));
}

.sys-menu__tab-text {
  display: flex;
  flex-direction: column;
}
.sys-menu__tab-label {
  font-family: 'Oswald', sans-serif;
  font-size: 1rem;
  letter-spacing: 0.1em;
  font-weight: 600;
}
.sys-menu__tab-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.7rem;
  opacity: 0.7;
}

.sys-menu__tab-active-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #a855f7;
  box-shadow: 0 0 10px #a855f7;
}

.sys-menu__close-btn {
  margin: 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 74, 74, 0.1);
  border: 1px solid rgba(255, 74, 74, 0.3);
  color: #ff4a4a;
  font-family: 'Oswald', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
  clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
}
.sys-menu__close-btn:hover {
  background: rgba(255, 74, 74, 0.8);
  color: #fff;
  transform: scale(1.02);
}

/* ====================================================
   右侧：动态功能区
   ==================================================== */
.sys-menu__content {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(168, 85, 247, 0.05), transparent 70%);
}

.sys-content-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: rgba(255,255,255,0.2);
  text-align: center;
  animation: placeholderPulse 4s ease-in-out infinite;
}
.sys-placeholder-icon {
  opacity: 0.5;
  margin-bottom: 8px;
}
.sys-content-placeholder h2 {
  font-family: 'Oswald', sans-serif;
  font-size: 1.5rem;
  letter-spacing: 0.2em;
  margin: 0;
}
.sys-content-placeholder p {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.9rem;
  margin: 0;
}

@keyframes placeholderPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; text-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
}

/* ====================================================
   过渡动画
   ==================================================== */
.sys-fade-enter-active,
.sys-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.sys-fade-enter-active .sys-menu-window { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.sys-fade-leave-active .sys-menu-window { transition: all 0.3s ease-in; }

.sys-fade-enter-from,
.sys-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}
.sys-fade-enter-from .sys-menu-window {
  opacity: 0;
  transform: translateZ(-100px) scale(0.95);
}
.sys-fade-leave-to .sys-menu-window {
  opacity: 0;
  transform: translateZ(50px) scale(1.02);
}
</style>
