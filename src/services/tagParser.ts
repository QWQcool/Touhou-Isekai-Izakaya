/**
 * tagParser.ts — Galgame 模式标签解析中间件
 *
 * 负责从 LLM 原始回复中提取并剥离 Galgame 专属的结构化标签：
 *   [emotion: shy]           → 立绘表情切换
 *   [speaker: 今泉影狼]      → 当前说话角色
 *   [bgm: romantic]          → BGM 情景切换
 *   [bg: hakurei_shrine_night] → 背景场景切换
 *   [OPTIONS: "选项A", "选项B", "选项C"] → 剧情分支选项
 *   [FORESHADOW: "id" STATUS: "approaching"] → 伏笔状态（保留扩展）
 *
 * 解析后将标签数据路由至：立绘调度器 / BGM 控制器 / 选项渲染器。
 * 返回剥离标签后的纯净叙事文本，确保不污染对话框显示。
 */

/** Galgame 标签解析结果的完整数据结构 */
export interface GalgameTagResult {
  /** 剥离所有标签后的纯净叙事文本 */
  cleanText: string;
  /** 角色表情标签 — 如 'shy', '害羞', 'happy' */
  emotion: string | null;
  /** 当前说话角色名 — 如 '今泉影狼', '博丽灵梦' */
  speaker: string | null;
  /** BGM 切换标签 — 如 'romantic', 'tension', 'daily' */
  bgm: string | null;
  /** 背景场景标签 — 如 'hakurei_shrine_night', 'izakaya_interior' */
  bg: string | null;
  /** 剧情选项列表 — 如 ['去神社找灵梦', '回居酒屋', '探索竹林'] */
  options: string[];
  /** 伏笔数据（保留扩展） */
  foreshadow: { id: string; status: string } | null;
}

/**
 * 从 LLM 原始回复中提取 Galgame 结构化标签，并返回剥离后的纯净文本。
 *
 * @param rawText - LLM 回复的原始文本（可能包含标签）
 * @returns 解析后的标签数据 + 干净文本
 */
export function parseGalgameTags(rawText: string): GalgameTagResult {
  const result: GalgameTagResult = {
    cleanText: rawText,
    emotion: null,
    speaker: null,
    bgm: null,
    bg: null,
    options: [],
    foreshadow: null,
  };

  let text = rawText;

  // ===== 1. 提取 [emotion: xxx] =====
  const emotionMatch = text.match(/\[emotion:\s*([^\]]+)\]/i);
  if (emotionMatch) {
    result.emotion = emotionMatch[1]!.trim();
    text = text.replace(emotionMatch[0], '');
  }

  // ===== 2. 提取 [speaker: xxx] =====
  const speakerMatch = text.match(/\[speaker:\s*([^\]]+)\]/i);
  if (speakerMatch) {
    result.speaker = speakerMatch[1]!.trim();
    text = text.replace(speakerMatch[0], '');
  }

  // ===== 3. 提取 [bgm: xxx] =====
  const bgmMatch = text.match(/\[bgm:\s*([^\]]+)\]/i);
  if (bgmMatch) {
    result.bgm = bgmMatch[1]!.trim();
    text = text.replace(bgmMatch[0], '');
  }

  // ===== 4. 提取 [bg: xxx] =====
  const bgMatch = text.match(/\[bg:\s*([^\]]+)\]/i);
  if (bgMatch) {
    result.bg = bgMatch[1]!.trim();
    text = text.replace(bgMatch[0], '');
  }

  // ===== 5. 提取 [OPTIONS: "选项A", "选项B", "选项C"] =====
  // 支持中英文引号，以及无引号逗号分隔
  const optionsMatch = text.match(/\[OPTIONS:\s*([^\]]+)\]/i);
  if (optionsMatch) {
    const rawOptions = optionsMatch[1]!;
    // 尝试解析带引号的选项列表
    const quotedOptions = rawOptions.match(/["「"']([^"」"']+)["」"']/g);
    if (quotedOptions && quotedOptions.length > 0) {
      // 去掉引号
      result.options = quotedOptions.map(
        (opt) => opt.replace(/^["「"']|["」"']$/g, '').trim()
      );
    } else {
      // 回退：按逗号或中文顿号分隔
      result.options = rawOptions
        .split(/[,，、]/)
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0);
    }
    text = text.replace(optionsMatch[0], '');
  }

  // ===== 6. 提取 [FORESHADOW: "id" STATUS: "status"] =====
  const foreshadowMatch = text.match(
    /\[FORESHADOW:\s*["']?([^"'\]]+)["']?\s+STATUS:\s*["']?([^"'\]]+)["']?\]/i
  );
  if (foreshadowMatch) {
    result.foreshadow = {
      id: foreshadowMatch[1]!.trim(),
      status: foreshadowMatch[2]!.trim(),
    };
    text = text.replace(foreshadowMatch[0], '');
  }

  // ===== 7. 清理残余空行和首尾空白 =====
  result.cleanText = text
    .replace(/\n{3,}/g, '\n\n') // 把连续3个以上换行压缩为2个
    .trim();

  return result;
}

/**
 * 中文表情标签到英文标识符的映射表。
 * 支持 LLM 用中文输出表情标签时自动转换为文件路径可用的标识符。
 */
export const EMOTION_LABEL_MAP: Record<string, string> = {
  // 中文 → 文件名前缀
  '常规': '常规',
  '默认': '常规',
  '平静': '常规',
  '高兴': '高兴',
  '开心': '高兴',
  '微笑': '高兴',
  '害羞': '害羞',
  '脸红': '害羞',
  '愤怒': '愤怒',
  '生气': '愤怒',
  '惊讶': '惊讶',
  '震惊': '惊讶',
  '思考': '思考',
  '困惑': '思考',
  '委屈': '委屈',
  '悲伤': '委屈',
  '哭泣': '委屈',
  '好奇': '好奇',
  '嫌弃': '嫌弃',
  '撒娇': '撒娇',
  '紧张': '紧张',
  '自信': '自信',
  '决心': '自信',
  '赌气': '赌气',
  '傲娇': '赌气',
  '内着': '内着',
  // 英文 → 中文文件名前缀（兼容设计文档中的英文标识符）
  'neutral': '常规',
  'happy': '高兴',
  'laugh': '高兴',
  'shy': '害羞',
  'angry': '愤怒',
  'sad': '委屈',
  'surprised': '惊讶',
  'thinking': '思考',
  'tsundere': '赌气',
  'determined': '自信',
  'hurt': '委屈',
  'curious': '好奇',
  'disgusted': '嫌弃',
  'spoiled': '撒娇',
  'nervous': '紧张',
  'confident': '自信',
  'special_a': '内着',
};

/**
 * 将 LLM 输出的表情标签统一规范化为中文文件名前缀。
 * 若映射表中不存在，返回原值作为回退。
 *
 * @param rawEmotion - LLM 输出的原始表情标签
 * @returns 规范化后的中文表情标识符
 */
export function normalizeEmotion(rawEmotion: string): string {
  const lower = rawEmotion.trim().toLowerCase();
  return EMOTION_LABEL_MAP[lower] || EMOTION_LABEL_MAP[rawEmotion.trim()] || rawEmotion.trim();
}
