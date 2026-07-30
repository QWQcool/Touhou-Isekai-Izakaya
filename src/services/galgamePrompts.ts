/**
 * services/galgamePrompts.ts — Galgame 模式三套 Prompt 模板
 *
 * 与沙盒模式的 prompt.ts / stores/prompt.ts 完全隔离。
 * 三套模板分别对应：
 *   1. 故事写手 (LLM1) — 生成 RoundScript JSON
 *   2. 剧情规划大师 (LLM1) — 生成/更新 PlotOutline JSON
 *   3. 逻辑模型 (LLM2) — 自定义对话 + 回合总结
 */

import { useGameStore } from '@/stores/game';
import { useCharacterStore } from '@/stores/character';
import { useGalgameStore } from '@/stores/galgame';
import { useSettingsStore } from '@/stores/settings';
import { getAvailableCharacters } from '@/services/spriteResolver';
import { resolveCharacterId } from '@/services/characterMapping';
import {
  getGalgameWritingRules,
  getGalgameChatRules,
  WORLD_SETTING_CORE,
  JAILBREAK_HEADER,
  ANTI_EASY_LOVE,
  ANTI_MARY_SUE,
} from '@/services/promptFragments';
import type { PlotOutline } from '@/types/galgame';

// ===================================================================
// 辅助函数：提取玩家详细人设
// ===================================================================

function getPlayerPersonaContext(p: any): string {
  let textPersona = p.persona;
  if (p.persona && p.persona.trim()) {
    try {
      const jsonObj = JSON.parse(p.persona);
      if (jsonObj['详细人设']) textPersona = jsonObj['详细人设'];
      else if (jsonObj['补充设定']) textPersona = jsonObj['补充设定'];
      else textPersona = '无特殊描述';
    } catch (e) {
      textPersona = p.persona; // 纯文本降级
    }
  } else {
    textPersona = '一个意外迷入幻想乡的人类。';
  }

  return `- 身份：${p.identity || '未知'}
- 穿着：${p.clothing || '无特殊描述'}
- 详细人设：${textPersona}`;
}

// ===================================================================
// 辅助函数：提取完整的场景角色与系统状态（对齐沙盒模式）
// ===================================================================

function buildFullGameStateContext(gameStore: any, charStore: any): string {
  const currentSceneNPCs = gameStore.state.system.current_scene_npcs || [];
  
  const maleNPCs: string[] = [];
  const femaleNPCs: string[] = [];
  const otherNPCs: string[] = [];

  for (const npcId of currentSceneNPCs) {
    const resolvedId = resolveCharacterId(npcId, charStore.characters, gameStore.state.npcs);
    const card = charStore.characters.find((c: any) => c.uuid === resolvedId);
    const status = gameStore.state.npcs[npcId] || gameStore.state.npcs[resolvedId];

    const name = card?.name || status?.name || npcId;
    let charInfo = `- ${name}`;

    if (status && (!card || card.type === 'character' || !card.type)) {
      const details = [];
      if (status.favorability !== undefined) details.push(`好感:${status.favorability}`);
      if (status.obedience !== undefined) details.push(`服从:${status.obedience}`);
      if (status.mood) details.push(`心情:${status.mood}`);
      if (status.action) details.push(`正在:${status.action}`);
      if (status.posture) details.push(`姿势:${status.posture}`);
      if (status.clothing) details.push(`衣着:${status.clothing}`);
      if (status.hp !== undefined) details.push(`HP:${status.hp}`);
      if (status.power) details.push(`战力:${status.power}`);
      if (status.hands) details.push(`手部:${status.hands}`);
      if (status.chest) details.push(`胸部:${status.chest}`);
      if (status.buttocks) details.push(`臀部:${status.buttocks}`);
      if (status.vagina) details.push(`小穴:${status.vagina}`);
      if (status.anus) details.push(`菊穴:${status.anus}`);
      if (status.residence) details.push(`住所:${status.residence}`);
      if (status.face) details.push(`脸部:${status.face}`);
      if (status.mouth) details.push(`嘴部:${status.mouth}`);

      let relStr = '';
      if (status.relationship) relStr = `关系:${status.relationship}`;
      if (status.addressing) relStr += ` (称呼你:${status.addressing})`;
      if (relStr) details.push(relStr.trim());

      if (details.length > 0) {
        charInfo += `: ${details.join(', ')}`;
      }
    }

    const gender = card?.gender || 'female';
    if (gender === 'male') {
      maleNPCs.push(charInfo);
    } else if (gender === 'female') {
      femaleNPCs.push(charInfo);
    } else {
      otherNPCs.push(charInfo);
    }
  }

  let content = '';
  if (maleNPCs.length > 0) content += `\n[当前区域角色 (男性)]\n${maleNPCs.join('\n')}`;
  if (femaleNPCs.length > 0) content += `\n[当前区域角色 (女性)]\n${femaleNPCs.join('\n')}`;
  if (otherNPCs.length > 0) content += `\n[当前区域角色 (其他)]\n${otherNPCs.join('\n')}`;
  if (currentSceneNPCs.length === 0) content += `\n[当前区域角色]\n(无)`;

  // 已知角色（非在场）
  const allRuntimeNpcs = gameStore.state.npcs;
  const knownNPCs: string[] = [];
  for (const [id, status] of Object.entries(allRuntimeNpcs)) {
    if (currentSceneNPCs.includes(id)) continue;
    const resolvedId = resolveCharacterId(id, charStore.characters, allRuntimeNpcs);
    const card = charStore.characters.find((c: any) => c.uuid === resolvedId);
    const name = card?.name || (status as any).name || id;

    const isSignificant =
      ((status as any).favorability !== undefined && (status as any).favorability !== 0) ||
      ((status as any).obedience !== undefined && (status as any).obedience !== 0) ||
      ((status as any).relationship && (status as any).relationship !== '陌生人') ||
      (status as any).residence;

    if (isSignificant) {
      let npcBrief = `- ${name}`;
      const details = [];
      if ((status as any).favorability !== undefined) details.push(`好感:${(status as any).favorability}`);
      if ((status as any).obedience !== undefined) details.push(`服从:${(status as any).obedience}`);
      let relStr = '';
      if ((status as any).relationship) relStr = `关系:${(status as any).relationship}`;
      if ((status as any).addressing) relStr += ` (称呼你:${(status as any).addressing})`;
      if (relStr) details.push(relStr.trim());
      if ((status as any).residence) details.push(`住所:${(status as any).residence}`);
      if (details.length > 0) npcBrief += `: ${details.join(', ')}`;
      knownNPCs.push(npcBrief);
    }
  }
  if (knownNPCs.length > 0) content += `\n\n[已知角色及关系 (不在当前区域)]\n${knownNPCs.join('\n')}`;

  // 任务与约定
  const activeQuests = gameStore.state.system.quests?.filter((q: any) => q.status === 'active') || [];
  if (activeQuests.length > 0) {
    content += `\n\n[当前进行中的任务]\n`;
    content += activeQuests.map((q: any) => `- ${q.name} (目标: ${q.description})`).join('\n');
  }

  const activePromises = gameStore.state.system.promises?.filter((p: any) => p.status === 'active') || [];
  if (activePromises.length > 0) {
    content += `\n\n[当前有效的约定]\n`;
    content += activePromises.map((p: any) => `- ${p.content} (约定人: ${p.giver})`).join('\n');
  }

  return content;
}

// ===================================================================
// 1. 故事写手 Prompt — 每回合调用，输出 RoundScript JSON
// ===================================================================

export function buildStoryWriterPrompt(nextRound: number): Array<{ role: string; content: string }> {
  const gameStore = useGameStore();
  const galgameStore = useGalgameStore();
  const charStore = useCharacterStore();
  const settingsStore = useSettingsStore();
  const p = gameStore.state.player;

  // 收集可用角色立绘名
  const spriteCharacters = getAvailableCharacters();

  // 收集完整的场景与状态上下文
  const fullGameStateContext = buildFullGameStateContext(gameStore, charStore);

  // 收集近期回合总结
  const recentSummaries = galgameStore.roundSummaries
    .slice(-3)
    .map((s: any) => `【第 ${s.round} 回合】\n${s.summary}`)
    .join('\n\n');

  // 获取玩家提供的剧情引导
  const narrativeGuidance = galgameStore.narrativeGuidance;

  // 剧情大纲
  const outlineText = galgameStore.plotOutline
    ? JSON.stringify(galgameStore.plotOutline, null, 2)
    : null;

  // 世界难度
  const difficulty = gameStore.state.system.difficulty || 'normal';
  const difficultyHint = difficulty === 'gentle'
    ? '当前为温柔模式：剧情偏向轻松日常，角色对玩家友善。'
    : difficulty === 'cruel'
    ? '当前为残酷模式：世界充满敌意与危机，角色警惕且事件激烈。'
    : '当前为普通模式：日常与冒险并存。';

  // 可用表情列表
  const availableEmotions = '常规、高兴、害羞、愤怒、惊讶、思考、委屈、好奇、嫌弃、撒娇、紧张、自信、赌气';

  // 注入共享写作规则 + 世界观
  const writingRules = getGalgameWritingRules();

  const systemPrompt = `${writingRules}

${WORLD_SETTING_CORE}

你是「故事写手」——东方异世界居酒屋 Galgame 模式的剧本生成引擎。

## 核心任务
为第 ${nextRound} 回合生成一份完整的「回合剧本」，输出必须是**纯净的合法 JSON**（不要 markdown 代码块、不要注释、不要多余文字）。

## 你的创作原则
- **叙事视角固定为第一人称（"我"）**：所有旁白/叙述类的 text 必须使用"我"的视角
- 剧情推进要**自然流畅**，不要为了填充而写无意义对话
- 角色性格必须**鲜活独特**，不同角色说话方式、语气、用词都应有区分
- 开场叙事要有**画面感**，用环境描写营造氛围，**篇幅必须充实**
- 交互选项的效果要**合理有趣**，不能全是正面效果
- 特殊事件要**令人惊喜**，但不能脱离剧情逻辑
- ${difficultyHint}

## 文本量要求（极重要！）
- **开场叙事 (opening.dialogues)**：15~30 条对话/叙述，所有 text 字段的纯文本总量 **≥ 1600 字**
  - 需要有充分的环境描写、角色内心独白、对话交锋、氛围渲染
  - 旁白叙述和角色对话交替出现，节奏自然
  - 不要只写短句，适当写长段落的叙述性文本
- **闲聊台词 (idle_dialogues)**：每条 20~60 字
- **交互结果对话 (result_dialogues)**：每个交互选项 2~5 条对话，文本量适中

## 可用角色立绘
以下角色有立绘可用，优先让这些角色出场：${spriteCharacters.join('、')}

## 可用表情标签
emotion 字段必须使用以下值之一：${availableEmotions}
旁白/叙述的 emotion 填空字符串 ""

## JSON 结构约束（RoundScript）
\`\`\`
{
  "round": number,          // 回合序号
  "scene": string,          // 场景标识
  "time_of_day": string,    // "早晨"|"上午"|"下午"|"傍晚"|"夜晚"|"深夜"
  "opening": {
    "bg": string,            // 背景标识
    "bgm": string,           // BGM 标识
    "dialogues": [           // 15~30 条开场对话/叙述，纯文本总量 ≥ 1600 字
      { "speaker": string|null, "emotion": string, "text": string, "bg?": string, "bgm?": string }
    ]
  },
  "free_activity": {
    "bg": string,
    "bgm": string,
    "characters": [          // 场景内可交互角色（1~4 个）
      {
        "name": string,            // 角色名（必须与立绘目录名一致）
        "default_emotion": string,
        "idle_dialogues": string[],  // 2~4 条闲聊台词
        "interactions": [            // 2~4 个交互选项
          {
            "label": string,
            "type": "dialogue"|"action"|"gift"|"quest"|"combat"|"special",
            "result_dialogues": [{ "speaker": string|null, "emotion": string, "text": string }],
            "effects": [{ "type": string, "target?": string, "value?": number, "description": string }]
          }
        ],
        "allow_custom_chat": boolean
      }
    ],
    "special_events": [      // 0~2 个特殊事件
      {
        "id": string,
        "button_label": string,
        "button_style": "warning"|"mysterious"|"urgent"|"festive",
        "result_dialogues": [{ "speaker": string|null, "emotion": string, "text": string }],
        "effects": [{ "type": string, "target?": string, "value?": number, "description": string }]
      }
    ]
  },
  "force_replan": boolean    // 是否强制触发剧情规划大师更新大纲
}
\`\`\`

## effect.type 可用值
affection（好感度）、money（金钱）、hp、mp、item（获得物品）、spellcard（获得符卡）、quest_trigger（触发任务）、combat_trigger（触发战斗）、promise（约定）、custom（自定义效果描述）`;

  const userPrompt = `## 当前游戏状态
- 玩家名：${p.name || '玩家'}
${getPlayerPersonaContext(p)}
- 时间：${p.time} / 日期：${p.date}
- 地点：${p.location}
- HP：${p.hp}/${p.max_hp}  MP：${p.mp}/${p.max_mp}
- 金钱：${p.money}
${fullGameStateContext}

${outlineText ? `## 剧情大纲（剧情规划大师制定）\n${outlineText}` : '## 剧情大纲\n（尚无大纲，请自由发挥开局剧情）'}

${recentSummaries ? `## 近期回合总结\n${recentSummaries}` : '## 近期回合总结\n（这是冒险的开始，没有过往记录）'}

${narrativeGuidance ? `## 玩家指定剧情导向\n**【强烈指令】玩家要求下回合的剧情必须向这个方向发展：${narrativeGuidance}**` : ''}

请生成第 ${nextRound} 回合的完整剧本 JSON。`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ===================================================================
// 2. 剧情规划大师 Prompt — 每 10 回合 / 强制触发
// ===================================================================

export function buildPlotDirectorPrompt(nextRound: number): Array<{ role: string; content: string }> {
  const gameStore = useGameStore();
  const galgameStore = useGalgameStore();
  const p = gameStore.state.player;

  const allSummaries = galgameStore.roundSummaries
    .map((s) => `【第 ${s.round} 回合】\n${s.summary}`)
    .join('\n\n');

  const oldOutline = galgameStore.plotOutline
    ? JSON.stringify(galgameStore.plotOutline, null, 2)
    : null;

  const systemPrompt = `${JAILBREAK_HEADER}

${WORLD_SETTING_CORE}

${ANTI_EASY_LOVE}

${ANTI_MARY_SUE}

你是「剧情规划大师」——东方异世界居酒屋 Galgame 模式的宏观叙事编剧。

## 核心任务
根据过往回合的故事发展，生成/更新一份「剧情大纲」（PlotOutline JSON）。
你负责的是**宏观故事架构**，不写具体对话，只规划：
- 主线故事弧的当前阶段和走向
- 未来 5~10 回合的关键剧情节拍
- 伏笔网络的维护（埋设、发展、临近揭示、已解决）
- 角色关系的宏观动态
- 给故事写手的风格/节奏指引

## 你的编剧原则
- 故事要有**起承转合**的节奏，不能永远平淡也不能永远紧张
- 伏笔要**草蛇灰线**，埋设自然，揭示时令人恍然大悟
- 角色关系发展要**循序渐进**，不能一步到位
- 剧情节拍的优先级要合理：关键剧情 > 重要支线 > 可选日常

## JSON 结构约束（PlotOutline）
\`\`\`
{
  "version": number,                    // 版本号（递增）
  "main_arc": string,                   // 当前主线阶段描述
  "upcoming_beats": [                   // 未来 5~10 个剧情节拍
    {
      "target_round_range": string,     // 如 "11-13"
      "description": string,
      "key_characters": string[],
      "priority": "critical"|"important"|"optional"
    }
  ],
  "foreshadows": [                      // 伏笔网络
    {
      "id": string,
      "description": string,
      "status": "planted"|"developing"|"approaching"|"resolved",
      "planted_round": number,
      "expected_reveal_round": number   // 可选
    }
  ],
  "relationship_notes": string[],       // 角色关系动态
  "tone_guidance": string               // 给故事写手的风格指引
}
\`\`\`

输出必须是**纯净的合法 JSON**，不要 markdown 代码块、不要注释。`;

  const userPrompt = `## 当前状态
- 即将进入第 ${nextRound} 回合
- 玩家名：${p.name || '玩家'}
${getPlayerPersonaContext(p)}
- 当前地点：${p.location}

${oldOutline ? `## 上一版本的大纲\n${oldOutline}` : '## 初始状态\n这是游戏的开始，尚无旧大纲。请创建初始剧情大纲。'}

## 过往回合总结
${allSummaries || '（暂无过往记录，这是游戏的开始）'}

${galgameStore.narrativeGuidance ? `## 玩家指定剧情导向\n**【强烈指令】玩家要求未来剧情必须向这个方向发展，请立即将其编入大纲：${galgameStore.narrativeGuidance}**` : ''}

请${oldOutline ? '更新' : '创建'}剧情大纲 JSON。`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ===================================================================
// 3. 逻辑模型 Prompt — 自定义对话 & 回合总结
// ===================================================================

/**
 * 构建自定义对话 Prompt（自由活动中与角色的即兴对话）
 */
export function buildCustomChatPrompt(
  characterName: string,
  playerInput: string
): Array<{ role: string; content: string }> {
  const gameStore = useGameStore();
  const charStore = useCharacterStore();
  const p = gameStore.state.player;

  // 尝试获取角色的设定集描述
  const charCard = charStore.characters.find(
    (c) => c.name === characterName || c.name.includes(characterName)
  );
  const charDescription = charCard?.description || `${characterName}是幻想乡的一位居民。`;

  // 获取运行时角色状态
  const npcStatus = Object.values(gameStore.state.npcs).find(
    (n: any) => n.name === characterName
  ) as any;
  const favorability = npcStatus?.favorability ?? '未知';
  const mood = npcStatus?.mood ?? '未知';
  const relationship = npcStatus?.relationship ?? '认识';

  // 注入自定义对话专用规则集
  const chatRules = getGalgameChatRules();

  const systemPrompt = `${chatRules}

你正在扮演「${characterName}」，在东方异世界居酒屋的场景中与玩家进行即兴对话。

## 角色设定
${charDescription}

## 当前状态
- 玩家（${p.name || '玩家'}）设定：
${getPlayerPersonaContext(p)}
- 对玩家的好感度：${favorability}
- 当前心情：${mood}
- 与玩家的关系：${relationship}
- 当前场景：${p.location}
- 当前时间：${p.time}

## 回复要求
- 以「${characterName}」的视角和语气回复
- 回复长度：2~5 句话，简洁生动
- 必须符合角色的性格特征，不能 OOC
- 不要使用 markdown 格式
- 根据好感度决定态度：低好感偏冷淡/警惕，高好感偏亲近/活泼`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: playerInput },
  ];
}

/**
 * 构建回合总结 Prompt（每回合结束时由 LLM2 撰写）
 */
export function buildRoundSummaryPrompt(): Array<{ role: string; content: string }> {
  const gameStore = useGameStore();
  const galgameStore = useGalgameStore();
  const p = gameStore.state.player;
  const log = galgameStore.actionLog;

  // 整理开场对话摘要
  const openingSummary = galgameStore.currentScript?.opening.dialogues
    .map((d) => d.speaker ? `${d.speaker}：「${d.text}」` : d.text)
    .join('\n') || '（无开场叙事）';

  // 整理玩家行为
  const actions = [
    ...log.character_interactions.map(
      (a) => `• 与「${a.character}」进行了交互：${a.interaction_label}（效果：${a.effects.map(e => e.description).join('、') || '无'}）`
    ),
    ...log.custom_chats.map(
      (c) => `• 与「${c.character}」进行了自由对话：玩家说"${c.player_input.slice(0, 50)}"，${c.character}回复"${c.llm_response.slice(0, 80)}"`
    ),
    ...log.triggered_events.map(
      (e) => `• 触发了特殊事件「${e.event_id}」（效果：${e.effects.map(ef => ef.description).join('、') || '无'}）`
    ),
  ];

  const systemPrompt = `${JAILBREAK_HEADER}

你是一位出色的故事记录者。请根据以下回合信息，撰写一份 200~400 字的故事总结。

## 撰写要求
- 使用第三人称视角
- 用**文学性的叙事语言**，而非干巴巴的流水账
- 重点记录：关键事件、角色关系变化、重要对话内容
- 捕捉人物的情感变化和氛围转变
- 这份总结将被存入档案，供后续回合参考，请确保信息完整
- 不要使用 markdown 格式`;

  const userPrompt = `## 第 ${galgameStore.currentRound} 回合信息

### 玩家（${p.name || '玩家'}）设定
${getPlayerPersonaContext(p)}

### 场景
地点：${p.location}，时间：${p.time}

### 开场叙事
${openingSummary}

### 玩家行为
${actions.length > 0 ? actions.join('\n') : '（玩家没有进行任何交互，只是安静地度过了这段时光）'}

请撰写本回合的故事总结。`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
