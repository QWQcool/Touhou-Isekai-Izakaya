<script setup lang="ts">
/**
 * ChoicePanel.vue — Galgame 模式 Layer 5: 剧情选项层
 *
 * 当 LLM 返回 [OPTIONS: ...] 标签时渲染。
 * 3~4 个纵向排列的长条按钮，具有磨砂深色底板 + 渐变发光描边 + 弹性动效。
 * 最后一个选项固定为「自由行动...」。
 */
</script>

<template>
  <!-- 占位：剧情选项卡 -->
  <div class="gal-choice">
    <div class="gal-choice__container">
      <button class="gal-choice__btn" v-for="(opt, i) in placeholderOptions" :key="i">
        <span class="gal-choice__icon">{{ opt.icon }}</span>
        <span class="gal-choice__text">{{ opt.text }}</span>
      </button>
      <!-- 自由输入选项 -->
      <button class="gal-choice__btn gal-choice__btn--free">
        <span class="gal-choice__icon">✏️</span>
        <span class="gal-choice__text">自由行动...</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
// 占位选项数据
const placeholderOptions = [
  { icon: '💬', text: '去博丽神社找灵梦' },
  { icon: '🏪', text: '回居酒屋准备晚餐' },
  { icon: '🗺️', text: '探索迷途竹林' },
]
</script>

<style scoped>
.gal-choice {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gal-choice__container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  padding: 0 24px;
}

.gal-choice__btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  cursor: pointer;

  /* 面板样式：立体化规范 */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.06) 0%,
    transparent 50%
  ), rgba(10, 10, 20, 0.82);
  backdrop-filter: blur(12px);

  /* 统一光源边缘 */
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.5);
  border-right: 1px solid rgba(0, 0, 0, 0.35);

  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);

  /* 弹性动效 */
  transition:
    transform 200ms var(--ease-spring-out, cubic-bezier(0.34, 1.56, 0.64, 1)),
    box-shadow 200ms ease-out;
}

.gal-choice__btn:hover {
  transform: scale(1.04) translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  border-top-color: rgba(255, 255, 255, 0.2);
}

.gal-choice__btn:active {
  transform: scale(0.97) translateY(1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* 边缘厚度 */
.gal-choice__btn::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 4px;
  right: 4px;
  height: 2px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 0 0 11px 11px;
  filter: blur(0.5px);
}

.gal-choice__icon {
  font-size: 1.2rem;
}

.gal-choice__text {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.04em;
}

/* 自由行动选项：虚线描边 */
.gal-choice__btn--free {
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.1);
  opacity: 0.7;
}

.gal-choice__btn--free:hover {
  opacity: 1;
}
</style>
