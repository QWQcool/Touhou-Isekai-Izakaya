<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { X, Info, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-vue-next';
import { computed } from 'vue';

const toastStore = useToastStore();
const settingsStore = useSettingsStore();

const isGalgame = computed(() => settingsStore.playMode === 'galgame');

// 根据提示消息的语义类型动态分发对应的 Lucide 图标 喵
function getIcon(type: string) {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertTriangle;
    case 'error':
      return AlertOctagon;
    default:
      return Info;
  }
}

// 根据消息类型和当前模式，动态计算 CSS 样式类名数组 喵
function getClasses(type: string) {
  if (isGalgame.value) {
    // Galgame 模式：沉浸式科幻全息横幅 (Cinematic Holographic Banner)
    const base = 'relative flex items-center gap-4 px-16 py-3.5 overflow-hidden font-serif tracking-[0.2em]';
    switch (type) {
      case 'success':
        return `${base} text-green-300`;
      case 'warning':
        return `${base} text-orange-300`;
      case 'error':
        return `${base} text-red-400`;
      default:
        return `${base} text-white`;
    }
  } else {
    // 沙盒模式：复古居酒屋和纸风
    const base = 'bg-izakaya-paper relative overflow-hidden shadow-paper border backdrop-blur-sm';
    switch (type) {
      case 'success':
        return `${base} border-green-200 text-green-800`;
      case 'warning':
        return `${base} border-marisa-gold/50 text-yellow-900`;
      case 'error':
        return `${base} border-touhou-red/30 text-touhou-red-dark`;
      default:
        return `${base} border-izakaya-wood/20 text-izakaya-wood`;
    }
  }
}

// 根据消息类型动态计算图标文本着色类 喵
function getIconColor(type: string) {
  if (isGalgame.value) {
    switch (type) {
      case 'success': return 'text-green-300 drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]';
      case 'warning': return 'text-orange-300 drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]';
      case 'error': return 'text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.8)]';
      default: return 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]';
    }
  }
  switch (type) {
    case 'success':
      return 'text-green-600';
    case 'warning':
      return 'text-marisa-gold-dim';
    case 'error':
      return 'text-touhou-red';
    default:
      return 'text-izakaya-wood/60';
  }
}
</script>

<template>
  <div 
    class="fixed z-[200] flex pointer-events-none"
    :class="isGalgame 
      ? 'top-1/3 left-1/2 -translate-x-1/2 flex-col items-center gap-3' 
      : 'top-4 right-4 flex-col gap-2'"
  >
    <TransitionGroup
      enter-active-class="transform ease-out transition-all duration-500"
      :enter-from-class="isGalgame ? 'translate-y-8 opacity-0 scale-90' : 'translate-y-4 opacity-0 sm:translate-y-0 sm:translate-x-4 sm:scale-95'"
      :enter-to-class="isGalgame ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-0 opacity-100 sm:translate-x-0 sm:scale-100'"
      leave-active-class="transition-all ease-in duration-300 absolute"
      :leave-from-class="isGalgame ? 'opacity-100 scale-100' : 'opacity-100 sm:scale-100'"
      :leave-to-class="isGalgame ? 'opacity-0 -translate-y-8 scale-95' : 'opacity-0 sm:scale-95'"
      move-class="transition-transform duration-500 ease-out"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center gap-3 transition-all w-max"
        :class="[getClasses(toast.type), !isGalgame ? 'p-4 rounded-lg max-w-sm items-start group' : 'justify-center min-w-[300px]']"
      >
        <!-- 纸纹装饰层 (仅沙盒模式) 喵 -->
        <div v-if="!isGalgame" class="absolute inset-0 pointer-events-none opacity-10 bg-texture-rice-paper"></div>
        
        <!-- 沉浸式渐变背景与发光边缘 (仅 Galgame 模式) -->
        <template v-if="isGalgame">
          <div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-black/80 to-transparent backdrop-blur-sm"></div>
          <div class="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-60"></div>
          <div class="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-60"></div>
          <!-- 极光扫描线特效 -->
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent bg-[length:100%_4px] opacity-30 mix-blend-overlay"></div>
        </template>

        <!-- 类型图标 (Icon) 喵 -->
        <div class="relative z-10 mt-0.5" :class="getIconColor(toast.type)">
          <component :is="getIcon(toast.type)" class="w-5 h-5" />
        </div>

        <!-- 提示消息正文 (Content) 喵 -->
        <div class="relative z-10 flex-1 min-w-0 text-center">
          <p 
            class="leading-relaxed drop-shadow-md" 
            :class="isGalgame ? 'text-[15px] font-bold text-shadow-glow' : 'text-sm font-medium font-display'"
          >{{ toast.message }}</p>
        </div>

        <!-- 手动关闭按钮 (Close Button) 喵 -->
        <button
          v-if="!isGalgame"
          @click="toastStore.removeToast(toast.id)"
          class="relative z-10 text-current opacity-40 hover:opacity-100 transition-opacity p-1 hover:bg-black/5 rounded"
        >
          <X class="w-4 h-4" />
        </button>

        <!-- 装饰性侧边条 (仅沙盒模式) 喵 -->
        <div
          v-if="!isGalgame"
          class="absolute left-0 top-0 bottom-0 w-1"
          :class="{
            'bg-green-500': toast.type === 'success',
            'bg-marisa-gold': toast.type === 'warning',
            'bg-touhou-red': toast.type === 'error',
            'bg-izakaya-wood/40': !['success', 'warning', 'error'].includes(toast.type)
          }"
        ></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.text-shadow-glow {
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
}
</style>
