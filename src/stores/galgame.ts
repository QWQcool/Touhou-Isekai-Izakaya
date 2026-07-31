/**
 * stores/galgame.ts — Galgame 模式回合状态机
 *
 * 管理当前回合剧本的回放状态、玩家行为记录、剧情大纲缓存。
 * 充当「回合剧本 JSON」和「UI 渲染层」之间的响应式数据总线。
 *
 * 状态流转：
 *   idle → loading → opening → free_activity → ending → idle (下一回合)
 */

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useGameStore } from './game';
import type {
  RoundScript,
  PlotOutline,
  RoundPhase,
  RoundActionLog,
  DialogueLine,
  SceneCharacter,
  Interaction,
  SpecialEvent,
  Effect,
} from '@/types/galgame';
import { resolveSpritePath } from '@/services/spriteResolver';

export const useGalgameStore = defineStore('galgame', () => {
  // ===== 核心状态 =====

  /** 当前回合阶段 */
  const phase = ref<RoundPhase>('idle');

  /** 当前回合剧本（LLM1 生成的 RoundScript JSON） */
  const currentScript = ref<RoundScript | null>(null);

  /** 当前回合序号 */
  const currentRound = ref(0);

  /** 剧情规划大师的大纲缓存 */
  const plotOutline = ref<PlotOutline | null>(null);

  /** 距下次触发剧情规划大师的回合倒计时 */
  const replanCountdown = ref(10);

  /** 过往回合的故事总结集合（LLM2 每回合生成） */
  const roundSummaries = ref<Array<{ round: number; summary: string }>>([]);

  // ===== 开场叙事阶段状态 =====

  /** 当前正在播放的对话行索引 */
  const openingDialogueIndex = ref(0);

  /** 当前显示的对话行 */
  const currentDialogue = computed<DialogueLine | null>(() => {
    if (phase.value !== 'opening' || !currentScript.value) return null;
    const dialogues = currentScript.value.opening.dialogues;
    if (openingDialogueIndex.value >= dialogues.length) return null;
    return dialogues[openingDialogueIndex.value] ?? null;
  });

  /** 开场对话是否已播放完毕 */
  const isOpeningFinished = computed(() => openingDialogueIndex.value >= (currentScript.value?.opening.dialogues.length ?? 0));

  // 待处理的效果（等待交互结果对话结束后应用）
  const pendingEffects = ref<Effect[]>([]);

  // 玩家自定义下回合剧情走向
  const narrativeGuidance = ref<string>('');

  // ===== 自由活动阶段状态 =====

  /** 当前选中交互的角色名 */
  const selectedCharacter = ref<string | null>(null);

  /** 当前角色的 idle 台词索引 */
  const idleDialogueIndex = ref(0);

  /** 当前正在播放的交互结果对话序列（选择某选项后） */
  const activeResultDialogues = ref<DialogueLine[]>([]);

  /** 交互结果对话的当前播放索引 */
  const resultDialogueIndex = ref(0);

  /** 当前被挂起等待执行的战斗触发效果（用于在对话播放完毕后进入战斗） */
  const pendingCombatEffect = ref<Effect | null>(null);

  /** 本回合的玩家行为记录 */
  const actionLog = ref<RoundActionLog>({
    character_interactions: [],
    custom_chats: [],
    triggered_events: [],
  });

  /** 本回合的对话历史记录（用于回看） */
  const dialogueHistory = ref<DialogueLine[]>([]);

  /** 本回合已执行的行动（Interaction label），按角色记录，防止重复执行 */
  const executedActions = ref<Record<string, string[]>>({});

  // ===== 当前视觉状态（供 UI 直接消费） =====

  /** 当前背景图标识 */
  const currentBg = ref<string>('');

  /** 当前 BGM 标识 */
  const currentBgm = ref<string>('');

  /** 当前说话角色 */
  const currentSpeaker = ref<string | null>(null);

  /** 当前表情 */
  const currentEmotion = ref<string>('常规');

  /** 当前对话文本 */
  const currentText = ref<string>('');

  /** 当前立绘路径（有说话角色时永远有值，三级回退保证） */
  const currentSpritePath = computed(() => {
    if (!currentSpeaker.value) return null;
    return resolveSpritePath(currentSpeaker.value, currentEmotion.value);
  });

  /** 场景内的角色列表（自由活动阶段） */
  const sceneCharacters = computed<SceneCharacter[]>(() => {
    if (!currentScript.value) return [];
    return currentScript.value.free_activity.characters;
  });

  /** 特殊事件列表 */
  const specialEvents = computed<SpecialEvent[]>(() => {
    if (!currentScript.value) return [];
    return currentScript.value.free_activity.special_events;
  });

  // ===== 核心动作 =====

  /**
   * 加载新的回合剧本，进入开场叙事阶段。
   */
  function loadRoundScript(script: RoundScript) {
    currentScript.value = script;
    currentRound.value = script.round;
    phase.value = 'opening';
    openingDialogueIndex.value = 0;

    // 设置初始视觉状态
    currentBg.value = script.opening.bg;
    currentBgm.value = script.opening.bgm;

    // 清空行动日志与记录
    dialogueHistory.value = [];
    executedActions.value = {};
    pendingCombatEffect.value = null;
    actionLog.value = {
      character_interactions: [],
      custom_chats: [],
      triggered_events: [],
    };

    // 显示第一条对话并记录到历史
    const firstLine = script.opening.dialogues[0] ?? null;
    applyDialogueLine(firstLine);
    if (firstLine) dialogueHistory.value.push({ ...firstLine });

    console.log(`[Galgame] 回合 ${script.round} 剧本已加载，进入开场叙事`);
  }

  /**
   * 推进开场叙事的下一条对话。
   * 全部播完后自动切换到自由活动阶段。
   */
  function advanceOpening() {
    if (phase.value !== 'opening' || !currentScript.value) return;

    openingDialogueIndex.value++;

    if (isOpeningFinished.value) {
      enterFreeActivity();
      return;
    }

    applyDialogueLine(currentDialogue.value);
    // 前进时记录到历史
    if (currentDialogue.value) dialogueHistory.value.push({ ...currentDialogue.value });
  }

  /**
   * 回退到开场叙事的上一条对话（鼠标中键 / 回退按钮）。
   */
  function goBackOpening() {
    if (phase.value !== 'opening' || !currentScript.value) return;
    if (openingDialogueIndex.value <= 0) return;

    openingDialogueIndex.value--;
    applyDialogueLine(currentDialogue.value);
  }

  /**
   * 进入自由活动阶段。
   */
  function enterFreeActivity() {
    if (!currentScript.value) return;

    phase.value = 'free_activity';
    selectedCharacter.value = null;
    idleDialogueIndex.value = 0;
    activeResultDialogues.value = [];
    resultDialogueIndex.value = 0;

    // 切换到自由活动阶段的默认背景/BGM
    currentBg.value = currentScript.value.free_activity.bg;
    currentBgm.value = currentScript.value.free_activity.bgm;

    // 清空对话显示
    currentSpeaker.value = null;
    currentText.value = '';
    currentEmotion.value = '常规';

    console.log('[Galgame] 进入自由活动阶段');
  }

  /**
   * 选择与某角色进行交互。
   */
  function selectCharacter(characterName: string) {
    selectedCharacter.value = characterName;
    idleDialogueIndex.value = 0;
    activeResultDialogues.value = [];
    resultDialogueIndex.value = 0;
  }

  /**
   * 播放角色的下一条 idle 台词（循环）。
   */
  function advanceIdleDialogue() {
    const char = sceneCharacters.value.find(
      (c) => c.name === selectedCharacter.value
    );
    if (!char || char.idle_dialogues.length === 0) return;

    // 随机选取一句闲聊（对话），且不改变数值变量，不记录行动日志
    const randomIndex = Math.floor(Math.random() * char.idle_dialogues.length);
    const text = char.idle_dialogues[randomIndex];
    currentSpeaker.value = char.name;
    currentEmotion.value = char.default_emotion;
    currentText.value = text ?? '';
  }

  /**
   * 执行角色的某个交互选项。
   */
  function executeInteraction(characterName: string, interaction: Interaction) {
    if (!executedActions.value[characterName]) {
      executedActions.value[characterName] = [];
    }
    // 检查是否已执行过此行动
    if (hasExecutedAction(characterName, interaction.label)) {
      console.warn(`[Galgame] 角色 ${characterName} 的行动 "${interaction.label}" 本回合已执行过。`);
      return [];
    }

    // 记录该行动已执行 (使用展开语法确保触发响应式)
    executedActions.value = {
      ...executedActions.value,
      [characterName]: [...executedActions.value[characterName], interaction.label]
    };

    // 记录行为日志
    actionLog.value.character_interactions.push({
      character: characterName,
      interaction_label: interaction.label,
      effects: interaction.effects,
      timestamp: Date.now(),
    });

    // 推入结果对话开始播放
    if (interaction.result_dialogues.length > 0) {
      activeResultDialogues.value = interaction.result_dialogues;
      resultDialogueIndex.value = 0;
      pendingEffects.value = interaction.effects;
      applyDialogueLine(interaction.result_dialogues[0] ?? null);
      return []; // 对话结束前不返回效果
    } else {
      console.log(`[Galgame] 执行交互：${characterName} → ${interaction.label}`);
      return interaction.effects;
    }
  }

  /**
   * 检查某个角色的特定行动是否已经执行过
   */
  function hasExecutedAction(characterName: string, label: string): boolean {
    return executedActions.value[characterName]?.includes(label) ?? false;
  }

  /**
   * 推进交互结果对话的下一条。
   * @returns 返回需要被应用的效果数组（如果对话结束）
   */
  function advanceResultDialogue(): Effect[] | null {
    resultDialogueIndex.value++;
    if (resultDialogueIndex.value >= activeResultDialogues.value.length) {
      activeResultDialogues.value = [];
      resultDialogueIndex.value = 0;
      // 清除滞留文本
      currentText.value = '';
      currentSpeaker.value = null;
      currentEmotion.value = '常规';
      
      const effectsToApply = [...pendingEffects.value];
      pendingEffects.value = [];
      
      return effectsToApply;
    }
    applyDialogueLine(activeResultDialogues.value[resultDialogueIndex.value] ?? null);
    return null;
  }

  // checkAndTriggerPendingCombat: 已弃用，由 App.vue 监听 galgame-combat-start 事件处理

  /**
   * 触发特殊事件。
   */
  function triggerSpecialEvent(event: SpecialEvent) {
    if (event.triggered) return;

    actionLog.value.triggered_events.push({
      event_id: event.id,
      effects: event.effects || [],
      timestamp: Date.now(),
    });

    event.triggered = true;

    // 推入结果对话开始播放
    if (event.result_dialogues.length > 0) {
      activeResultDialogues.value = event.result_dialogues;
      resultDialogueIndex.value = 0;
      pendingEffects.value = event.effects;
      applyDialogueLine(event.result_dialogues[0] ?? null);
      return [];
    } else {
      console.log(`[Galgame] 触发特殊事件：${event.button_label}`);
      return event.effects;
    }
  }

  /**
   * 处理 Galgame 模式下的战斗结算。
   * 这个方法将被 App.vue 中的事件监听器调用。
   */
  function handleCombatEnd(result: string, summary: string) {
    console.log('[Galgame] 记录战斗结果:', result);
    // 把战报作为一种特殊记录塞进行动日志
    actionLog.value.custom_chats.push({
      character: 'system',
      player_input: '【系统战斗结算】',
      llm_response: summary,
      timestamp: Date.now(),
    });
    // 可选：如果希望有战后对话，可以在这里直接推入 activeResultDialogues。
    // 目前我们先只记入 actionLog 交给规划大师。
  }

  /**
   * 记录自定义对话（LLM2 交互结果）。
   */
  function logCustomChat(
    character: string,
    playerInput: string,
    llmResponse: string
  ) {
    actionLog.value.custom_chats.push({
      character,
      player_input: playerInput,
      llm_response: llmResponse,
      timestamp: Date.now(),
    });
  }

  /**
   * 结束自由活动，进入回合结束阶段。
   */
  function endFreeActivity() {
    phase.value = 'ending';
    console.log('[Galgame] 自由活动结束，进入回合收尾阶段');
  }

  /**
   * 回合收尾完成，保存总结并推进。
   */
  function completeRound(summary: string) {
    roundSummaries.value.push({
      round: currentRound.value,
      summary,
    });

    // 更新剧情规划大师倒计时
    replanCountdown.value--;
    if (currentScript.value?.force_replan) {
      replanCountdown.value = 0;
    }

    phase.value = 'idle';

    // 重置本回合的特定状态，为下一回合做准备
    actionLog.value = {
      character_interactions: [],
      custom_chats: [],
      triggered_events: [],
    };
    dialogueHistory.value = [];
    executedActions.value = {};

    console.log(`[Galgame] 回合 ${currentRound.value} 完成`);
  }

  /**
   * 更新剧情大纲并重置倒计时。
   */
  function updatePlotOutline(outline: PlotOutline) {
    plotOutline.value = outline;
    replanCountdown.value = 10;
    console.log(`[Galgame] 剧情大纲已更新至版本 ${outline.version}`);
  }

  /** 是否需要触发剧情规划大师 */
  const needsReplan = computed(() => replanCountdown.value <= 0);

  // ===== 内部工具方法 =====

  /** 将一条 DialogueLine 的数据应用到当前视觉状态 */
  function applyDialogueLine(line: DialogueLine | null) {
    if (!line) return;
    currentSpeaker.value = line.speaker;
    currentEmotion.value = line.emotion || '常规';
    currentText.value = line.text;
    if (line.bg) currentBg.value = line.bg;
    if (line.bgm) currentBgm.value = line.bgm;
  }

  /**
   * 重置所有状态。
   */
  function resetState() {
    phase.value = 'idle';
    currentScript.value = null;
    currentRound.value = 0;
    openingDialogueIndex.value = 0;
    selectedCharacter.value = null;
    idleDialogueIndex.value = 0;
    activeResultDialogues.value = [];
    resultDialogueIndex.value = 0;
    currentBg.value = '';
    currentBgm.value = '';
    currentSpeaker.value = null;
    currentEmotion.value = '常规';
    currentText.value = '';
    narrativeGuidance.value = '';
    actionLog.value = {
      character_interactions: [],
      custom_chats: [],
      triggered_events: [],
    };
  }

  // ===== 存档状态持久化同步 (Save Isolation Mechanism) =====
  const gameStore = useGameStore();

  // 1. 当主存档状态被重载时（例如切换存档），恢复 Galgame 的持久化数据
  watch(() => gameStore.state, (newState) => {
    if (newState.galgame) {
      currentRound.value = newState.galgame.currentRound || 0;
      plotOutline.value = newState.galgame.plotOutline || null;
      replanCountdown.value = newState.galgame.replanCountdown ?? 10;
      roundSummaries.value = newState.galgame.roundSummaries || [];
      executedActions.value = newState.galgame.executedActions || {};
    } else {
      currentRound.value = 0;
      plotOutline.value = null;
      replanCountdown.value = 10;
      roundSummaries.value = [];
      executedActions.value = {};
    }
  }, { deep: false });

  // 2. 当 Galgame 核心进度发生变化时，实时同步到主存档 State 中，以便系统打快照
  watch([currentRound, plotOutline, replanCountdown, roundSummaries, executedActions], () => {
    gameStore.state.galgame = {
      currentRound: currentRound.value,
      plotOutline: plotOutline.value,
      replanCountdown: replanCountdown.value,
      roundSummaries: roundSummaries.value,
      executedActions: executedActions.value,
    };
  }, { deep: true });

  return {
    // 核心状态
    phase,
    currentScript,
    currentRound,
    plotOutline,
    replanCountdown,
    roundSummaries,
    needsReplan,

    // 开场叙事
    openingDialogueIndex,
    currentDialogue,
    isOpeningFinished,

    // 自由活动
    selectedCharacter,
    sceneCharacters,
    specialEvents,
    activeResultDialogues,
    actionLog,
    dialogueHistory,
    executedActions,
    narrativeGuidance,

    // 视觉状态
    currentBg,
    currentBgm,
    currentSpeaker,
    currentEmotion,
    currentText,
    currentSpritePath,

    // 动作
    loadRoundScript,
    advanceOpening,
    goBackOpening,
    enterFreeActivity,
    selectCharacter,
    advanceIdleDialogue,
    executeInteraction,
    hasExecutedAction,
    advanceResultDialogue,
    triggerSpecialEvent,
    logCustomChat,
    endFreeActivity,
    completeRound,
    updatePlotOutline,
    resetState,
    handleCombatEnd,
  };
});
