<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useToastStore } from '@/stores/toast';
import { TALENTS } from '@/data/talents';
import {
  Activity,
  Sword,
  Wind,
  Target,
  Shield,
  Brain,
  Flame,
  Droplets,
  Sun,
  Moon,
  GitBranch,
  Lock,
  Check,
  Zap,
  Info
} from 'lucide-vue-next';
import { audioManager } from '@/services/audio';

const gameStore = useGameStore();
const toastStore = useToastStore();

const player = computed(() => gameStore.state.player as any);
const combatTalents = computed(() => Object.values(TALENTS).filter((t) => t.category === 'combat'));

// 拖拽与缩放状态
const zoom = ref(1);
const position = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const startPos = ref({ x: 0, y: 0 });
const hasMoved = ref(false);

const selectedTalentId = ref<string | null>(null);
const selectedTalent = computed(() => selectedTalentId.value ? TALENTS[selectedTalentId.value] : null);

// 获取状态
function getTalentStatus(talent: any) {
  const unlocked = player.value.unlockedTalents || [];
  if (unlocked.includes(talent.id)) return 'unlocked';

  const prereqs = talent.prerequisites || [];
  if (prereqs.length === 0) return 'available';

  const allMet = prereqs.every((id: string) => unlocked.includes(id));
  return allMet ? 'available' : 'locked';
}

function getLineStatus(fromId: string, toId: string) {
  const unlocked = player.value.unlockedTalents || [];
  if (unlocked.includes(fromId) && unlocked.includes(toId)) return 'active';
  if (unlocked.includes(fromId)) return 'available';
  return 'inactive';
}

// 特效中英文字典
const EFFECT_TRANSLATIONS: Record<string, string> = {
  stat_max_hp: '最大生命值',
  stat_max_mp: '最大灵力值',
  stat_dodge: '闪避率',
  stat_hit_rate: '命中率',
  stat_flat_dmg_reduction: '固定减伤',
  stat_flat_dmg: '基础伤害',
  stat_max_hp_pct: '最大生命值加成',
  combat_start_mp_regen_buff: '开局MP恢复',
  buff_duration: '增益持续回合',
  stat_crit_dmg_resist: '暴伤抵抗',
  stat_crit_rate: '暴击率',
  stat_mp_cost_reduction: 'MP消耗降低',
  combat_start_p: '初始P点',
  combat_start_heal_pct: '开局治疗',
  stat_debuff_resist: '异常状态抵抗',
  stat_crit_dmg: '暴击伤害',
  spell_level_bonus: '符卡等级加成',
  mechanic_dodge_counter: '闪避反击伤害',
  mechanic_low_hp_dodge: '低血量闪避',
  mechanic_ignore_def: '护甲穿透',
  turn_mp_regen_pct: '回合MP恢复',
  stat_hit_rate_bonus: '符卡命中加成',
  stat_p_point_gain: 'P点获取加成',
  stat_final_dmg: '最终伤害加成',
  mechanic_low_hp_dmg: '绝境伤害加成',
  combat_start_shield_hp_pct: '开局护盾',
  combat_win_heal_pct: '战胜恢复',
  mechanic_mp_dmg_tradeoff: '魔力过载等级',
  stat_normal_atk_reduction: '普攻减免',
  mechanic_first_hit_dodge: '首击必闪',
  mechanic_bomb_mp_reduction: 'BOMB消耗降低',
  mechanic_execute_dmg: '处决伤害',
  mechanic_lifesteal: '生命偷取',
  stat_all_dmg_reduction: '全伤害减免',
  mechanic_double_attack_chance: '连击概率',
  mechanic_turn1_dmg: '首回合爆发',
  stat_max_ap: '行动点上限',
  mechanic_ignore_suppression: '无视战力压制',
  mechanic_overpower_slayer_dmg: '越级挑战伤害'
};

function formatEffectValue(key: string, val: number) {
  if (key === 'buff_duration' || key === 'stat_max_ap' || key === 'mechanic_mp_dmg_tradeoff' || key === 'mechanic_first_hit_dodge' || key === 'mechanic_ignore_suppression' || key === 'spell_level_bonus' || key === 'combat_start_p' || key === 'combat_start_mp_regen_buff' || key === 'stat_max_hp' || key === 'stat_max_mp' || key === 'stat_flat_dmg' || key === 'stat_flat_dmg_reduction') {
    return `+${val}`;
  }
  return `+${Math.round(val * 100)}%`;
}

// SVG贝塞尔曲线连线
function getCurvedPath(fromNode: any, toNode: any) {
  // 基于 160 的网格间距，X 偏移量增加以撑开水平空间
  const x1 = fromNode.position.x * 200 + 1000;
  const y1 = fromNode.position.y * 160 + 200;
  const x2 = toNode.position.x * 200 + 1000;
  const y2 = toNode.position.y * 160 + 200;

  if (Math.abs(x1 - x2) < 5) return `M ${x1} ${y1} L ${x2} ${y2}`;

  const distY = Math.abs(y2 - y1);
  const cpOffset = Math.min(distY * 0.5, 80);
  return `M ${x1} ${y1} C ${x1} ${y1 + cpOffset}, ${x2} ${y2 - cpOffset}, ${x2} ${y2}`;
}

function getTalentIcon(talent: any) {
  const id = talent.id;
  if (id.includes('vitality') || id.includes('spirit')) return Activity;
  if (id.includes('strength')) return Sword;
  if (id.includes('agility') || id.includes('reflex')) return Wind;
  if (id.includes('focus') || id.includes('insight')) return Target;
  if (id.includes('guard') || id.includes('toughness') || id.includes('iron_skin')) return Shield;
  if (id.includes('meditation') || id.includes('wisdom')) return Brain;
  if (id.includes('lethal') || id.includes('burst')) return Flame;
  if (id.includes('recycling')) return Droplets;
  if (id.includes('potential')) return Sun;
  if (id.includes('fantasy_killer')) return Moon;
  return GitBranch;
}

// 交互事件
function handleTalentClick(talent: any) {
  if (hasMoved.value) return;
  selectedTalentId.value = talent.id;
  audioManager.playSoftClick();
}

function handleUnlockTalent() {
  if (!selectedTalent.value) return;
  const status = getTalentStatus(selectedTalent.value);
  if (status !== 'available') return;
  
  if (player.value.p_points < selectedTalent.value.cost) {
    toastStore.addToast('技能点不足 (INSUFFICIENT P-POINTS)', 'error');
    audioManager.playError();
    return;
  }

  const success = gameStore.unlockTalent(selectedTalent.value.id, selectedTalent.value.cost);
  if (success) {
    audioManager.playLevelUp();
    toastStore.addToast(`已解锁天赋: ${selectedTalent.value.name}`, 'success');
  }
}

// 拖拽控制
function startDrag(e: MouseEvent) {
  isDragging.value = true;
  hasMoved.value = false;
  startPos.value = { x: e.clientX - position.value.x, y: e.clientY - position.value.y };
}
function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  const newX = e.clientX - startPos.value.x;
  const newY = e.clientY - startPos.value.y;
  if (Math.abs(newX - position.value.x) > 5 || Math.abs(newY - position.value.y) > 5) {
    hasMoved.value = true;
  }
  position.value = { x: newX, y: newY };
}
function stopDrag() {
  isDragging.value = false;
  // 延迟充置 hasMoved 防止点击误判
  setTimeout(() => { hasMoved.value = false; }, 50);
}
function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const zoomFactor = -e.deltaY * 0.001;
  zoom.value = Math.max(0.3, Math.min(2, zoom.value + zoomFactor));
}
</script>

<template>
  <div class="sys-talents">
    
    <!-- 左侧/背景：网状星图画布 -->
    <div class="sys-talents__canvas-area">
      <!-- 资源信息悬浮 -->
      <div class="sys-talents__header">
        <div class="sys-points">
          <span class="sys-points__label">AVAILABLE P-POINTS // 剩余点数</span>
          <span class="sys-points__val">{{ player.p_points }}</span>
        </div>
      </div>

      <!-- 画布视口 -->
      <div 
        class="sys-talents__viewport"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
        @wheel="handleWheel"
      >
        <div class="sys-talents__grid-bg"></div>

        <div 
          class="sys-talents__canvas"
          :style="{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`
          }"
        >
          <!-- SVG 连线层 -->
          <svg class="sys-talents__svg-layer">
            <template v-for="talent in combatTalents" :key="'lines-' + talent.id">
              <template v-for="prereqId in talent.prerequisites" :key="prereqId">
                <path
                  v-if="TALENTS[prereqId]"
                  :d="getCurvedPath(TALENTS[prereqId], talent)"
                  fill="none"
                  :class="{
                    'sys-line--active': getLineStatus(prereqId, talent.id) === 'active',
                    'sys-line--available': getLineStatus(prereqId, talent.id) === 'available',
                    'sys-line--inactive': getLineStatus(prereqId, talent.id) === 'inactive'
                  }"
                />
              </template>
            </template>
          </svg>

          <!-- 节点层 -->
          <div
            v-for="talent in combatTalents"
            :key="talent.id"
            class="sys-node"
            :class="[
              `sys-node--${getTalentStatus(talent)}`,
              { 'sys-node--selected': selectedTalentId === talent.id }
            ]"
            :style="{
              left: `${talent.position.x * 200 + 1000 - 60}px`,
              top: `${talent.position.y * 160 + 200 - 60}px`
            }"
            @click.stop="handleTalentClick(talent)"
          >
            <!-- 赛博多边形背景 -->
            <div class="sys-node__bg"></div>
            
            <div class="sys-node__content">
              <component :is="getTalentIcon(talent)" class="sys-node__icon" />
              <div class="sys-node__name">{{ talent.name }}</div>
              <div class="sys-node__cost" v-if="getTalentStatus(talent) !== 'unlocked'">
                {{ talent.cost }} P
              </div>
              <Check v-else class="sys-node__check" :size="12" />
            </div>
            
            <Lock v-if="getTalentStatus(talent) === 'locked'" class="sys-node__lock" :size="14" />
          </div>

        </div>
      </div>
    </div>

    <!-- 右侧：详情面板 -->
    <div class="sys-talents__detail-area">
      <template v-if="selectedTalent">
        <div class="sys-detail-panel">
          <!-- 科技装饰线 -->
          <div class="sys-detail-panel__scanner" :class="`scanner--${getTalentStatus(selectedTalent)}`"></div>
          
          <div class="sys-detail__header">
            <div class="sys-detail__type" :class="`text--${getTalentStatus(selectedTalent)}`">
              NEURAL NODE // {{ getTalentStatus(selectedTalent).toUpperCase() }}
            </div>
            <div class="sys-detail__name">{{ selectedTalent.name }}</div>
          </div>

          <div class="sys-detail__scroll-content">
            
            <!-- 节点简报 -->
            <div class="sys-detail__section">
              <div class="sys-detail__label"><Info :size="14"/> DESCRIPTION</div>
              <p class="sys-detail__desc">{{ selectedTalent.description }}</p>
            </div>

            <!-- 效能参数 -->
            <div class="sys-detail__section" v-if="selectedTalent.effects">
              <div class="sys-detail__label"><Activity :size="14"/> EFFECTS // 效能参数</div>
              <div class="sys-effects-grid">
                <div v-for="(val, key) in selectedTalent.effects" :key="key" class="sys-effect-item">
                  <span class="sys-effect-key">{{ EFFECT_TRANSLATIONS[key] || key }}</span>
                  <span class="sys-effect-val">{{ formatEffectValue(key.toString(), val) }}</span>
                </div>
              </div>
            </div>

            <!-- 前置依赖 -->
            <div class="sys-detail__section" v-if="selectedTalent.prerequisites.length > 0">
              <div class="sys-detail__label"><GitBranch :size="14"/> PREREQUISITES // 依赖协议</div>
              <div class="sys-prereqs">
                <div 
                  v-for="pid in selectedTalent.prerequisites" 
                  :key="pid"
                  class="sys-prereq-item"
                  :class="{ 'sys-prereq-item--met': player.unlockedTalents?.includes(pid) }"
                >
                  <Check v-if="player.unlockedTalents?.includes(pid)" :size="12" />
                  <X v-else :size="12" class="text-red-500" />
                  <span>{{ TALENTS[pid]?.name }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- 解锁操作区 -->
          <div class="sys-detail__actions">
            <div class="sys-cost-info">
              <span>REQUIRED P-POINTS:</span>
              <span class="sys-cost-val" :class="{ 'text-red-500': player.p_points < selectedTalent.cost }">
                {{ selectedTalent.cost }}
              </span>
            </div>
            <button 
              class="sys-action-btn"
              :class="{ 'sys-action-btn--disabled': getTalentStatus(selectedTalent) !== 'available' || player.p_points < selectedTalent.cost }"
              @click="handleUnlockTalent"
            >
              <span v-if="getTalentStatus(selectedTalent) === 'unlocked'">ALREADY UNLOCKED</span>
              <span v-else-if="getTalentStatus(selectedTalent) === 'locked'">NODE LOCKED</span>
              <span v-else>INITIATE UNLOCK // 解锁天赋</span>
            </button>
          </div>
        </div>
      </template>
      <div v-else class="sys-detail-empty">
        <Zap :size="48" class="sys-detail-empty__icon" />
        <p>SELECT A NODE TO VIEW DATA</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.sys-talents {
  width: 100%;
  height: 100%;
  display: flex;
  padding: 32px;
  gap: 32px;
  box-sizing: border-box;
}

/* ====================================================
   左侧：全息星图画布
   ==================================================== */
.sys-talents__canvas-area {
  flex: 1;
  position: relative;
  background: rgba(5, 5, 8, 0.6);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sys-talents__header {
  position: absolute;
  top: 0; left: 0; right: 0;
  padding: 24px;
  z-index: 50;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
}
.sys-points {
  display: inline-flex;
  flex-direction: column;
  background: rgba(168, 85, 247, 0.1);
  border-left: 3px solid #a855f7;
  padding: 8px 16px;
  backdrop-filter: blur(4px);
}
.sys-points__label {
  font-family: 'Oswald', sans-serif;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.1em;
}
.sys-points__val {
  font-family: 'Oswald', sans-serif;
  font-size: 1.8rem;
  color: #fff;
  font-weight: 700;
  line-height: 1.2;
}

.sys-talents__viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: grab;
}
.sys-talents__viewport:active {
  cursor: grabbing;
}

.sys-talents__grid-bg {
  position: absolute;
  inset: -100%;
  background-image: 
    linear-gradient(rgba(168, 85, 247, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(168, 85, 247, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.sys-talents__canvas {
  position: absolute;
  top: 0; left: 0;
  width: 0; height: 0; /* Let translation handle coords */
  transform-origin: 0 0;
  will-change: transform;
}

.sys-talents__svg-layer {
  position: absolute;
  top: 0; left: 0;
  width: 4000px; height: 4000px;
  pointer-events: none;
  z-index: 10;
  overflow: visible;
}

.sys-line--active {
  stroke: #a855f7;
  stroke-width: 3;
  filter: drop-shadow(0 0 5px rgba(168, 85, 247, 0.8));
  stroke-dasharray: 10;
  animation: flow 1s linear infinite;
}
.sys-line--available {
  stroke: rgba(168, 85, 247, 0.4);
  stroke-width: 2;
  stroke-dasharray: 5 5;
}
.sys-line--inactive {
  stroke: rgba(255, 255, 255, 0.05);
  stroke-width: 1.5;
}
@keyframes flow {
  to { stroke-dashoffset: -20; }
}

/* 赛博节点样式 */
.sys-node {
  position: absolute;
  width: 120px; height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.sys-node:hover {
  transform: scale(1.1);
}

.sys-node__bg {
  position: absolute;
  inset: 10px;
  background: rgba(0,0,0,0.8);
  border: 1px solid rgba(255,255,255,0.1);
  transform: rotate(45deg);
  transition: all 0.3s;
}
.sys-node__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
}
.sys-node__icon { margin-bottom: 6px; width: 20px; height: 20px; color: rgba(255,255,255,0.3); transition: color 0.3s; }
.sys-node__name { font-family: 'Noto Serif SC', serif; font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.5); line-height: 1.2; padding: 0 8px; }
.sys-node__cost { font-family: 'Oswald', sans-serif; font-size: 0.75rem; color: rgba(168,85,247,0.8); margin-top: 4px; }
.sys-node__check { color: #a855f7; margin-top: 4px; }
.sys-node__lock { position: absolute; top: 15px; right: 15px; color: rgba(255,255,255,0.2); }

/* 节点状态变体 */
.sys-node--unlocked .sys-node__bg {
  background: rgba(168,85,247,0.1);
  border-color: #a855f7;
  box-shadow: inset 0 0 20px rgba(168,85,247,0.2);
}
.sys-node--unlocked .sys-node__name { color: #fff; }
.sys-node--unlocked .sys-node__icon { color: #a855f7; }

.sys-node--available .sys-node__bg {
  border-color: rgba(168,85,247,0.4);
}
.sys-node--available .sys-node__name { color: rgba(255,255,255,0.8); }
.sys-node--available .sys-node__icon { color: rgba(255,255,255,0.7); }

.sys-node--locked .sys-node__bg {
  border-color: rgba(239, 68, 68, 0.2);
}

/* 选中态 */
.sys-node--selected .sys-node__bg {
  border-color: #fff;
  box-shadow: 0 0 15px rgba(255,255,255,0.3);
}

/* ====================================================
   右侧：详情面板区
   ==================================================== */
.sys-talents__detail-area {
  width: 380px;
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
  opacity: 0.3; z-index: 10;
  animation: scanline 4s linear infinite;
}
.scanner--unlocked { background: #a855f7; box-shadow: 0 0 10px #a855f7; }
.scanner--available { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
.scanner--locked { background: #ef4444; box-shadow: 0 0 10px #ef4444; }

.text--unlocked { color: #a855f7 !important; }
.text--available { color: #38bdf8 !important; }
.text--locked { color: #ef4444 !important; }

.sys-detail__header {
  padding: 32px 32px 24px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: linear-gradient(180deg, rgba(255,255,255,0.03), transparent);
}
.sys-detail__type { font-family: 'Oswald', sans-serif; font-size: 0.8rem; letter-spacing: 0.1em; margin-bottom: 8px; }
.sys-detail__name { font-family: 'Noto Serif SC', serif; font-size: 1.8rem; color: #fff; font-weight: 700; }

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

.sys-detail__label { font-family: 'Oswald', sans-serif; font-size: 0.8rem; color: rgba(255,255,255,0.5); letter-spacing: 0.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.sys-detail__desc { font-family: 'Noto Serif SC', serif; font-size: 0.95rem; color: rgba(255,255,255,0.9); line-height: 1.8; }

.sys-effects-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.sys-effect-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sys-effect-key { font-family: 'Oswald', sans-serif; font-size: 0.75rem; color: rgba(255,255,255,0.5); }
.sys-effect-val { font-family: 'Oswald', sans-serif; font-size: 0.9rem; color: #a855f7; font-weight: 700; }

.sys-prereqs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sys-prereq-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Noto Serif SC', serif;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.4);
}
.sys-prereq-item--met { color: #fff; }

.sys-detail__actions {
  padding: 24px 32px;
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.2);
}
.sys-cost-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-family: 'Oswald', sans-serif;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.05em;
}
.sys-cost-val {
  font-size: 1.2rem;
  color: #fff;
  font-weight: 700;
}
.sys-action-btn {
  width: 100%;
  padding: 16px;
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid #a855f7;
  color: #fff;
  font-family: 'Oswald', sans-serif;
  font-size: 1rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
  clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
}
.sys-action-btn:hover:not(.sys-action-btn--disabled) {
  background: #a855f7;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
}
.sys-action-btn--disabled {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.3);
  cursor: not-allowed;
}
</style>
