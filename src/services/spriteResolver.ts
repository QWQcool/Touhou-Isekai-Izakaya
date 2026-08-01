/**
 * spriteResolver.ts — 角色立绘路径解析器
 *
 * 负责将「角色名 + 表情标签」映射为实际的立绘图片路径。
 *
 * 三级回退机制：
 *   1. 日常立绘（表情差分）：daily_sprites/{角色名}/{表情}_{角色名}.png
 *   2. 战斗立绘（单图）：battle_sprites/{角色名}_战斗立绘.png
 *   3. 默认立绘：battle_sprites/其他角色.png
 */

import { normalizeEmotion } from './tagParser';

/** 日常立绘基础路径 */
const DAILY_SPRITE_BASE = '/src/assets/images/daily_sprites';
/** 战斗立绘基础路径 */
const BATTLE_SPRITE_BASE = '/src/assets/images/battle_sprites';
/** 通用默认立绘（无匹配角色时使用） */
export const DEFAULT_FALLBACK = `${BATTLE_SPRITE_BASE}/其他角色.png`;

// 使用 import.meta.glob 让 Vite 将图片纳入打包依赖 (Asset bundling)
const dailySpritesMap = import.meta.glob('/src/assets/images/daily_sprites/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const battleSpritesMap = import.meta.glob('/src/assets/images/battle_sprites/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/**
 * 拥有日常表情差分的角色目录映射表。
 * 键为 LLM 可能输出的任意名称变体，值为实际的文件夹/文件前缀名。
 */
const CHARACTER_DIR_MAP: Record<string, string> = {
  // —— 今泉影狼 ——
  '今泉影狼': '今泉影狼',
  '影狼': '今泉影狼',
  'kagerou': '今泉影狼',
  'kagerou imaizumi': '今泉影狼',

  // —— 克劳恩皮斯 ——
  '克劳恩皮斯': '克劳恩皮斯',
  '克劳恩': '克劳恩皮斯',
  '小丑': '克劳恩皮斯',
  'clownpiece': '克劳恩皮斯',

  // —— 菅牧典 ——
  '菅牧典': '菅牧典',
  'aunn': '菅牧典',
  'aunn komano': '菅牧典',
  '高丽野阿吽': '菅牧典',

  // —— 键山雏 ——
  '键山雏': '键山雏',
  '雏': '键山雏',
  'hina': '键山雏',
  'hina kagiyama': '键山雏',

  // —— 博丽灵梦 ——
  '博丽灵梦': '博丽灵梦',
  '灵梦': '博丽灵梦',
  'reimu': '博丽灵梦',

  // —— 雾雨魔理沙 ——
  '雾雨魔理沙': '魔理沙',
  '魔理沙': '魔理沙',
  'marisa': '魔理沙',
};

/**
 * 战斗立绘角色名映射表。
 * 键为 LLM 可能输出的角色名变体，值为实际的战斗立绘文件名前缀。
 * 注意：战斗立绘命名有少许不一致（如"克劳恩皮丝"而非"克劳恩皮斯"），此处做兼容。
 */
const BATTLE_SPRITE_MAP: Record<string, string> = {
  '博丽灵梦': '博丽灵梦', '灵梦': '博丽灵梦',
  '雾雨魔理沙': '雾雨魔理沙', '魔理沙': '雾雨魔理沙',
  '十六夜咲夜': '十六夜咲夜', '咲夜': '十六夜咲夜',
  '蕾米莉亚': '蕾米莉亚',
  '芙兰朵露': '芙兰朵露', '芙兰': '芙兰朵露',
  '帕秋莉': '帕秋莉',
  '红美铃': '红美铃', '美铃': '红美铃',
  '小恶魔': '小恶魔',
  '爱丽丝': '爱丽丝',
  '八云紫': '八云紫', '紫': '八云紫',
  '八云蓝': '八云蓝', '蓝': '八云蓝',
  '橙': '橙',
  '西行寺幽幽子': '西行寺幽幽子', '幽幽子': '西行寺幽幽子',
  '魂魄妖梦': '魂魄妖梦', '妖梦': '魂魄妖梦',
  '蓬莱山辉夜': '蓬莱山辉夜', '辉夜': '蓬莱山辉夜',
  '八意永琳': '八意永琳', '永琳': '八意永琳',
  '铃仙': '铃仙',
  '因幡帝': '因幡帝',
  '东风谷早苗': '东风谷早苗', '早苗': '东风谷早苗',
  '八坂神奈子': '八坂神奈子', '神奈子': '八坂神奈子',
  '洩矢诹访子': '洩矢诹访子', '诹访子': '洩矢诹访子',
  '射命丸文': '射命丸文', '文': '射命丸文',
  '犬走椛': '犬走椛',
  '河城荷取': '河城荷取', '荷取': '河城荷取',
  '风见幽香': '风见幽香', '幽香': '风见幽香',
  '琪露诺': '琪露诺',
  '大妖精': '大妖精',
  '露米娅': '露米娅',
  '圣白莲': '圣白莲', '白莲': '圣白莲',
  '丰聪耳神子': '丰聪耳神子', '神子': '丰聪耳神子',
  '古明地觉': '古明地觉', '觉': '古明地觉',
  '古明地恋': '古明地恋', '恋': '古明地恋',
  '灵乌路空': '灵乌路空', '阿空': '灵乌路空',
  '火焰猫燐': '火焰猫燐', '阿燐': '火焰猫燐',
  '星熊勇仪': '星熊勇仪', '勇仪': '星熊勇仪',
  '水桥帕露西': '水桥帕露西', '帕露西': '水桥帕露西',
  '比那名居天子': '比那名居天子', '天子': '比那名居天子',
  '永江衣玖': '永江衣玖', '衣玖': '永江衣玖',
  '伊吹萃香': '伊吹萃香', '萃香': '伊吹萃香',
  '藤原妹红': '藤原妹红', '妹红': '藤原妹红',
  '秦心': '秦心',
  '茨木华扇': '茨木华扇', '华扇': '茨木华扇',
  '鬼人正邪': '鬼人正邪', '正邪': '鬼人正邪',
  '少名针妙丸': '少名针妙丸', '针妙丸': '少名针妙丸',
  '赫卡提亚': '赫卡提亚',
  '纯狐': '纯狐',
  '哆来咪': '哆来咪',
  '摩多罗隐岐奈': '摩多罗隐岐奈', '隐岐奈': '摩多罗隐岐奈',
  '四季映姬': '四季映姬', '映姬': '四季映姬',
  '小野冢小町': '小野冢小町', '小町': '小野冢小町',
  '多多良小伞': '多多良小伞', '小伞': '多多良小伞',
  '封兽鵺': '封兽鵺', '鵺': '封兽鵺',
  '物部布都': '物部布都', '布都': '物部布都',
  '苏我屠自古': '苏我屠自古',
  '霍青娥': '霍青娥', '青娥': '霍青娥',
  '稗田阿求': '稗田阿求', '阿求': '稗田阿求',
  '本居小铃': '本居小铃', '小铃': '本居小铃',
  '宇佐见堇子': '宇佐见堇子', '堇子': '宇佐见堇子',
  '米斯蒂娅': '米斯蒂娅',
  '莉格露': '莉格露',
  '梅蒂欣': '梅蒂欣',
  '龙神': '龙神',
  '森近霖之助': '森近霖之助', '霖之助': '森近霖之助',
  // 日常立绘角色也注册战斗立绘（注意"克劳恩皮丝"是战斗文件名）
  '今泉影狼': '今泉影狼',
  '克劳恩皮斯': '克劳恩皮丝',  // 战斗文件名是"皮丝"
  '菅牧典': '菅牧典',
  '键山雏': '键山雏',
};

/** 路径缓存 */
const resolvedCache = new Map<string, string>();

/** 默认回退表情 */
const DEFAULT_EMOTION = '常规';

/**
 * 获取所有有日常差分立绘的角色名。
 */
export function getAvailableCharacters(): string[] {
  return [...new Set(Object.values(CHARACTER_DIR_MAP))];
}

/**
 * 将角色名解析为日常立绘的文件夹目录名。
 */
export function resolveCharacterDir(characterName: string): string | null {
  const name = characterName.trim();
  const lower = name.toLowerCase();

  // 精确匹配
  for (const [alias, dir] of Object.entries(CHARACTER_DIR_MAP)) {
    if (alias.toLowerCase() === lower) return dir;
  }

  // 子串模糊匹配
  for (const [alias, dir] of Object.entries(CHARACTER_DIR_MAP)) {
    if (alias.includes(name) || name.includes(alias)) return dir;
  }

  return null;
}

/**
 * 将角色名解析为战斗立绘的文件名前缀。
 */
function resolveBattleSpriteName(characterName: string): string | null {
  const name = characterName.trim();
  const lower = name.toLowerCase();

  // 精确匹配
  for (const [alias, fileName] of Object.entries(BATTLE_SPRITE_MAP)) {
    if (alias.toLowerCase() === lower) return fileName;
  }

  // 子串模糊匹配
  for (const [alias, fileName] of Object.entries(BATTLE_SPRITE_MAP)) {
    if (alias.includes(name) || name.includes(alias)) return fileName;
  }

  return null;
}

/**
 * 直接尝试获取战斗立绘路径，如果找不到则返回 null。
 */
export function resolveBattleSpritePath(characterName: string): string | null {
  const battleName = resolveBattleSpriteName(characterName);
  if (battleName) {
    const rawPath = `${BATTLE_SPRITE_BASE}/${battleName}_战斗立绘.png`;
    return battleSpritesMap[rawPath] || rawPath;
  }
  return null;
}

/**
 * 核心函数：将「角色名 + 表情标签」解析为完整的图片路径。
 *
 * 三级回退：
 *   1. 日常立绘（有表情差分）→ daily_sprites/{dir}/{emotion}_{dir}.png
 *   2. 战斗立绘（单图）→ battle_sprites/{name}_战斗立绘.png
 *   3. 默认立绘 → battle_sprites/其他角色.png
 *
 * @param characterName - 角色名（中文/英文/别名均可）
 * @param emotion - 表情标签（中文/英文均可，会自动归一化）
 * @returns 图片的 URL 路径（永不返回 null，兜底到默认立绘）
 */
export function resolveSpritePath(
  characterName: string,
  emotion: string = DEFAULT_EMOTION
): string {
  const cacheKey = `${characterName}/${emotion}`;
  if (resolvedCache.has(cacheKey)) {
    return resolvedCache.get(cacheKey)!;
  }

  let path: string;

  // 第一级：尝试日常立绘（表情差分）
  const dailyDir = resolveCharacterDir(characterName);
  if (dailyDir) {
    let normalizedEmotion = normalizeEmotion(emotion);
    // 强制兜底验证：如果归一化后的表情不在标准集合内，强制回退为常规
    if (!getAvailableEmotions().includes(normalizedEmotion)) {
      console.warn(`[立绘解析] 未知表情 "${normalizedEmotion}"，回退到 "${DEFAULT_EMOTION}"`);
      normalizedEmotion = DEFAULT_EMOTION;
    }
    const rawPath = `${DAILY_SPRITE_BASE}/${dailyDir}/${normalizedEmotion}_${dailyDir}.png`;
    path = dailySpritesMap[rawPath] || rawPath;
    resolvedCache.set(cacheKey, path);
    return path;
  }

  // 第二级：尝试战斗立绘
  const battleName = resolveBattleSpriteName(characterName);
  if (battleName) {
    const rawPath = `${BATTLE_SPRITE_BASE}/${battleName}_战斗立绘.png`;
    path = battleSpritesMap[rawPath] || rawPath;
    resolvedCache.set(cacheKey, path);
    return path;
  }

  // 第三级：默认立绘
  console.warn(`[立绘解析] 角色「${characterName}」无匹配立绘，使用默认`);
  path = battleSpritesMap[DEFAULT_FALLBACK] || DEFAULT_FALLBACK;
  resolvedCache.set(cacheKey, path);
  return path;
}

/**
 * 获取角色的默认（常规）立绘路径。
 */
export function getDefaultSprite(characterName: string): string {
  return resolveSpritePath(characterName, DEFAULT_EMOTION);
}

/**
 * 获取角色所有可用的表情标签列表。
 */
export function getAvailableEmotions(): string[] {
  return [
    '常规', '高兴', '害羞', '愤怒', '惊讶',
    '思考', '委屈', '好奇', '嫌弃', '撒娇',
    '紧张', '自信', '赌气', '内着',
  ];
}

/**
 * 判断角色是否有日常差分立绘（而非仅战斗立绘）。
 */
export function hasDailySprites(characterName: string): boolean {
  return resolveCharacterDir(characterName) !== null;
}

/**
 * 获取角色的立绘级别。
 */
export function getSpriteLevel(characterName: string): 'daily' | 'battle' | 'default' {
  if (resolveCharacterDir(characterName)) return 'daily';
  if (resolveBattleSpriteName(characterName)) return 'battle';
  return 'default';
}
