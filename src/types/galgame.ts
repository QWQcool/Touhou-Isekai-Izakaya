/**
 * types/galgame.ts — Galgame 模式核心类型定义
 *
 * 对应设计文档第 7.3 / 7.4 章的 JSON Schema。
 * 所有 LLM 输出均需符合此接口约束。
 */

// ===================================================================
// 回合剧本 (RoundScript) — 故事写手 (LLM1) 每回合输出
// ===================================================================

/** 回合剧本：故事写手每回合生成的完整数据结构 */
export interface RoundScript {
  /** 回合序号 */
  round: number;
  /** 当前场景标识（对应背景图） */
  scene: string;
  /** 当前时间段 */
  time_of_day: '早晨' | '上午' | '下午' | '傍晚' | '夜晚' | '深夜';

  /** ① 开场叙事阶段 */
  opening: OpeningPhase;
  /** ② 自由活动阶段 */
  free_activity: FreeActivityPhase;
  /** 是否强制触发剧情规划大师 */
  force_replan: boolean;
}

/** 开场叙事：按顺序播放的对话/叙事段落 */
export interface OpeningPhase {
  /** 本阶段的背景图标识 */
  bg: string;
  /** 本阶段的 BGM 标识 */
  bgm: string;
  /** 对话/叙事序列 */
  dialogues: DialogueLine[];
}

/** 单条对话/叙事 */
export interface DialogueLine {
  /** 说话角色名（null 表示旁白/叙述） */
  speaker: string | null;
  /** 角色表情标签 */
  emotion: string;
  /** 对话文本内容 */
  text: string;
  /** 可选：播放时切换背景 */
  bg?: string;
  /** 可选：播放时切换 BGM */
  bgm?: string;
}

/** 自由活动阶段 */
export interface FreeActivityPhase {
  /** 默认背景图 */
  bg: string;
  /** 默认 BGM */
  bgm: string;
  /** 场景内可交互角色列表 */
  characters: SceneCharacter[];
  /** 特殊事件列表 */
  special_events: SpecialEvent[];
}

/** 场景内的可交互角色 */
export interface SceneCharacter {
  /** 角色名（对应立绘目录名） */
  name: string;
  /** 场景中的默认表情 */
  default_emotion: string;
  /** 固定对话台词（轮流播放） */
  idle_dialogues: string[];
  /** 交互选项列表 */
  interactions: Interaction[];
  /** 是否允许自定义对话（调用 LLM2） */
  allow_custom_chat: boolean;
}

/** 单个交互选项 */
export interface Interaction {
  /** 选项显示文本 */
  label: string;
  /** 选项类型 */
  type: 'dialogue' | 'action' | 'gift' | 'quest' | 'combat' | 'special';
  /** 选择后播放的对话序列 */
  result_dialogues: DialogueLine[];
  /** 选择后的数值效果 */
  effects: Effect[];
}

/** 交互触发的效果 */
export interface Effect {
  /** 效果类型 */
  type:
    | 'affection'
    | 'money'
    | 'hp'
    | 'mp'
    | 'item'
    | 'spellcard'
    | 'quest_trigger'
    | 'combat_trigger'
    | 'promise_trigger'
    | 'custom';
  /** 效果目标（角色名、物品名等） */
  target?: string;
  /** 数值变化量 */
  value?: number;
  /** 效果描述（用于 Toast 提示） */
  description: string;
  /** 触发的任务（当 type 为 quest_trigger 时存在） */
  quest?: import('./game').Quest;
  /** 触发的约定（当 type 为 promise_trigger 时存在） */
  promise?: import('./game').PromiseState;
}

/** 特殊事件 */
export interface SpecialEvent {
  /** 事件唯一 ID */
  id: string;
  /** UI 上显示的按钮文本 */
  button_label: string;
  /** 按钮的视觉风格提示 */
  button_style: 'warning' | 'mysterious' | 'urgent' | 'festive';
  /** 触发后播放的对话/叙事序列 */
  result_dialogues: DialogueLine[];
  /** 触发后的效果列表 */
  effects: Effect[];
  /** 是否已被触发（前端运行时追踪） */
  triggered?: boolean;
}

// ===================================================================
// 剧情大纲 (PlotOutline) — 剧情规划大师输出
// ===================================================================

/** 剧情大纲 */
export interface PlotOutline {
  /** 大纲版本号 */
  version: number;
  /** 当前主线阶段描述 */
  main_arc: string;
  /** 未来 5~10 回合的剧情发展脉络 */
  upcoming_beats: StoryBeat[];
  /** 活跃伏笔网络 */
  foreshadows: Foreshadow[];
  /** 角色关系动态备注 */
  relationship_notes: string[];
  /** 给故事写手的风格/节奏指引 */
  tone_guidance: string;
}

/** 剧情节拍 */
export interface StoryBeat {
  /** 预计发生的回合范围 */
  target_round_range: string;
  /** 事件简述 */
  description: string;
  /** 涉及的关键角色 */
  key_characters: string[];
  /** 优先级 */
  priority: 'critical' | 'important' | 'optional';
}

/** 伏笔 */
export interface Foreshadow {
  /** 伏笔 ID */
  id: string;
  /** 伏笔描述 */
  description: string;
  /** 当前状态 */
  status: 'planted' | 'developing' | 'approaching' | 'resolved';
  /** 埋设回合 */
  planted_round: number;
  /** 预计揭示回合 */
  expected_reveal_round?: number;
}

// ===================================================================
// 回合状态机 — 前端运行时状态
// ===================================================================

/** 回合阶段枚举 */
export type RoundPhase =
  | 'loading'        // 正在加载回合剧本（LLM1 调用中）
  | 'opening'        // 开场叙事播放中
  | 'free_activity'  // 自由活动进行中
  | 'ending'         // 回合结束处理中（LLM2 调用中）
  | 'idle';          // 空闲（等待下一回合 / 初始状态）

/** 玩家在自由活动中的行为记录 */
export interface RoundActionLog {
  /** 与角色的交互记录 */
  character_interactions: Array<{
    character: string;
    interaction_label: string;
    effects: Effect[];
    timestamp: number;
  }>;
  /** 自定义对话记录 */
  custom_chats: Array<{
    character: string;
    player_input: string;
    llm_response: string;
    timestamp: number;
  }>;
  /** 触发的特殊事件 */
  triggered_events: Array<{
    event_id: string;
    effects: Effect[];
    timestamp: number;
  }>;
}
