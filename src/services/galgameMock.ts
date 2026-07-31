/**
 * services/galgameMock.ts — Galgame 模式 Mock 数据
 *
 * 提供完整的模拟 RoundScript 和 PlotOutline，用于不依赖 LLM 的 UI 调试。
 * 所有角色名严格对应 daily_sprites 中的实际立绘目录名。
 */

import type { RoundScript, PlotOutline } from '@/types/galgame';

/** 模拟剧情大纲 */
export const MOCK_PLOT_OUTLINE: PlotOutline = {
  version: 1,
  main_arc: '幻想乡异变解决的日常，博丽神社的悠闲时光',
  upcoming_beats: [
    {
      target_round_range: '1-3',
      description: '主角造访博丽神社，与灵梦和魔理沙交流异变的线索',
      key_characters: ['灵梦', '魔理沙'],
      priority: 'critical',
    }
  ],
  foreshadows: [
    {
      id: 'strange_magic',
      description: '神社后院发现的微弱不寻常魔力',
      status: 'planted',
      planted_round: 1,
      expected_reveal_round: 5,
    }
  ],
  relationship_notes: [
    '灵梦似乎总是在抱怨缺少塞钱',
    '魔理沙总是趁机来神社蹭茶喝',
  ],
  tone_guidance: '轻松愉快的东方Project日常风格，包含少许对异变的讨论。',
};

/** 模拟第 1 回合剧本 */
export const MOCK_ROUND_SCRIPT_1: RoundScript = {
  round: 1,
  scene: 'hakurei_shrine',
  time_of_day: '下午',
  opening: {
    bg: '博丽神社',
    bgm: 'daily_peaceful',
    dialogues: [
      {
        speaker: null,
        emotion: '',
        text: '穿过漫长的参拜道，终于来到了幻想乡最著名的地标——博丽神社。',
      },
      {
        speaker: null,
        emotion: '',
        text: '今天的神社一如既往地冷清，甚至连扫地声都没有。大概是因为某位红白巫女又在偷懒了吧。',
      },
      {
        speaker: '灵梦',
        emotion: '常规',
        text: '哈啊……今天又是连一个参拜客都没有的一天。要不要干脆把赛钱箱换个更显眼的位置呢？',
      },
      {
        speaker: '魔理沙',
        emotion: '高兴',
        text: '哟，灵梦！我来玩啦！顺便把你这里的茶点吃光！',
      },
      {
        speaker: '灵梦',
        emotion: '生气',
        text: '你这家伙，别老是把我的神社当自己家啊！而且茶点早就在昨天被你吃完了！',
      },
      {
        speaker: null,
        emotion: '',
        text: '看着眼前这熟悉的打闹场景，我不禁露出了微笑。看来今天的幻想乡也是和平的一天。',
      },
    ],
  },
  free_activity: {
    bg: '博丽神社',
    bgm: 'daily_peaceful',
    characters: [
      {
        name: '灵梦',
        default_emotion: '常规',
        idle_dialogues: [
          '如果有闲钱的话，记得往赛钱箱里投一点哦？',
          '扫地好累……要是有妖怪能帮我干活就好了。',
          '今天的天气真不错，适合在缘侧喝茶晒太阳。',
          '异变？最近没什么异变啊，挺无聊的。',
        ],
        interactions: [
          {
            label: '供奉100金',
            type: 'gift',
            result_dialogues: [
              { speaker: '灵梦', emotion: '高兴', text: '诶？！真的吗？太感谢了！你真是个好人！' },
              { speaker: null, emotion: '', text: '灵梦眼疾手快地收下了钱，态度发生了一百八十度的大转变。' },
            ],
            effects: [
              { type: 'affection', target: '灵梦', value: 5, description: '灵梦好感度 +5' },
              { type: 'money', value: -100, description: '金钱 -100' },
            ],
          },
          {
            label: '帮忙打扫神社',
            type: 'action',
            result_dialogues: [
              { speaker: '灵梦', emotion: '惊讶', text: '你要帮忙扫地？好啊，那就拜托你了！' },
              { speaker: null, emotion: '', text: '我拿起扫帚，开始清理参拜道上的落叶。虽然有些辛苦，但灵梦看起来很高兴。' },
            ],
            effects: [
              { type: 'affection', target: '灵梦', value: 3, description: '灵梦好感度 +3' },
            ],
          },
          {
            label: '倾听灵梦的烦恼 (委托)',
            type: 'quest',
            result_dialogues: [
              { speaker: '灵梦', emotion: '烦恼', text: '最近神社周围总有一些吵闹的妖精，你能帮我稍微清理一下吗？' },
              { speaker: null, emotion: '', text: '我感觉到这是一个拉近关系的好机会。' },
            ],
            effects: [
              { 
                type: 'quest_trigger', 
                description: '触发新委托',
                quest: {
                  id: 'reimu-cleanup',
                  name: '神社大扫除',
                  description: '最近神社周围总有一些吵闹的妖精，帮助灵梦清理神社周围的妖精。',
                  giver: '博丽灵梦',
                  status: 'active',
                  requirements: ['击退 5 只吵闹的妖精'],
                  rewards: [
                    { type: 'attribute', value: 10, description: '灵梦好感度大幅提升' },
                    { type: 'item', value: '御守,1', description: '获得 1 个破魔御守' }
                  ],
                  acceptedTurn: 0
                }
              },
            ],
          },
        ],
        allow_custom_chat: true,
      },
      {
        name: '魔理沙',
        default_emotion: '高兴',
        idle_dialogues: [
          '灵梦这儿真舒服，可惜就是没点心。',
          '喂，你！有没有看到什么有趣的发明或者魔法道具？',
          '今晚要去哪里收集（借走）点东西好呢……',
          '怎么了？一直盯着我看，难道是迷上我了DA ZE？',
        ],
        interactions: [
          {
            label: '给她一些蘑菇',
            type: 'gift',
            result_dialogues: [
              { speaker: '魔理沙', emotion: '高兴', text: '哦！这可是上好的魔法材料啊！谢啦！' },
              { speaker: '魔理沙', emotion: '常规', text: '作为回礼，下次我顺点什么东西来给你吧。' },
            ],
            effects: [
              { type: 'affection', target: '魔理沙', value: 4, description: '魔理沙好感度 +4' },
            ],
          },
          {
            label: '切磋魔法',
            type: 'combat',
            result_dialogues: [
              { speaker: '魔理沙', emotion: '高兴', text: '哦？想跟我来一场弹幕游戏吗？很有胆量嘛！' },
              { speaker: null, emotion: '', text: '魔理沙拿出了八卦炉，看来不能善了了……' },
            ],
            effects: [
              { type: 'combat_trigger', target: '魔理沙', description: '触发弹幕战' },
            ],
          },
          {
            label: '约定下次一起寻宝',
            type: 'special',
            result_dialogues: [
              { speaker: '魔理沙', emotion: '高兴', text: '一言为定！下次有空，我带你去红魔馆的地下室“寻宝”！' },
              { speaker: null, emotion: '', text: '魔理沙开心地拍了拍我的肩膀。虽然目的地听起来有些危险，但我们立下了约定。' },
            ],
            effects: [
              { 
                type: 'promise_trigger', 
                description: '缔结新约定',
                promise: {
                  id: 'marisa-treasure',
                  giver: '雾雨魔理沙',
                  content: '下次有空一起去红魔馆地下室“寻宝”。',
                  createdTime: '',
                  acceptedTurn: 0,
                  status: 'active'
                }
              },
            ],
          },
        ],
        allow_custom_chat: true,
      },
    ],
    special_events: [
      {
        id: 'shrine_investigation',
        button_label: '环境调查',
        button_style: 'mysterious',
        result_dialogues: [
          { speaker: null, emotion: '', text: '我在神社的后院转了一圈，发现角落里有一丝微弱的不寻常的魔力残留。' },
          { speaker: '灵梦', emotion: '思考', text: '嗯？你说后院有奇怪的魔力？我怎么没感觉到。可能只是路过的小妖精吧。' },
          { speaker: null, emotion: '', text: '虽然灵梦这么说，但这股魔力总觉得有些在意……' },
        ],
        effects: [
          { type: 'custom', description: '获得了异变的微小线索' },
        ],
      },
    ],
  },
  force_replan: false,
};

/** 模拟第 2 回合剧本 */
export const MOCK_ROUND_SCRIPT_2: RoundScript = {
  round: 2,
  scene: 'izakaya_exterior',
  time_of_day: '上午',
  opening: {
    bg: 'izakaya_exterior_morning',
    bgm: 'morning_breeze',
    dialogues: [
      {
        speaker: null,
        emotion: '',
        text: '第二天早上，阳光比昨天更加明亮。我推开居酒屋的正门，在门口伸了个懒腰。清晨的空气带着露水的气息，远处的山头上笼着一层淡淡的薄雾。',
      },
      {
        speaker: null,
        emotion: '',
        text: '昨晚那个叫影狼的少女走的时候，说了句"明天可能还会来"。说这话的时候她故意把脸别过去，但尾巴的摇摆已经出卖了她。',
      },
      {
        speaker: null,
        emotion: '',
        text: '我笑着摇了摇头，开始打扫门前的落叶。就在这时——',
      },
      {
        speaker: '菅牧典',
        emotion: '高兴',
        text: '汪！找到了找到了！就是这里！',
      },
      {
        speaker: null,
        emotion: '',
        text: '一个看起来像是石像狛犬的少女，从不知道什么方向蹦跳着冲了过来。她有着一对兽耳和短短的尾巴，身上的衣服沾满了泥土和草叶，整个人充满了一种……用"元气"都不足以形容的活力。',
      },
      {
        speaker: '菅牧典',
        emotion: '自信',
        text: '我是菅牧典！守护庙宇的狛犬！昨天我路过的时候闻到了超级好吃的味道，今天特意来找的！',
      },
      {
        speaker: null,
        emotion: '',
        text: '她两只手叉着腰，挺起胸膛，一脸得意洋洋的表情。那双大眼睛亮晶晶的，像是发现了什么宝藏。',
      },
      {
        speaker: null,
        emotion: '',
        text: '「呃……欢迎？不过我们正式营业是在傍晚——」',
      },
      {
        speaker: '菅牧典',
        emotion: '撒娇',
        text: '诶——！但是我现在就饿了嘛！',
      },
      {
        speaker: null,
        emotion: '',
        text: '她可怜巴巴地看着我，尾巴不知什么时候已经垂了下去。看着那副模样，我叹了口气，走回了厨房。',
      },
      {
        speaker: null,
        emotion: '',
        text: '……算了，反正食材还有剩。',
      },
    ],
  },
  free_activity: {
    bg: 'izakaya_exterior_morning',
    bgm: 'morning_breeze',
    characters: [
      {
        name: '菅牧典',
        default_emotion: '高兴',
        idle_dialogues: [
          '好吃好吃好吃！你做的饭团里放了什么？超级好吃的！',
          '我平时都是在神社那边吃供品的，但你做的比供品好吃一百倍！',
          '你这里需要守护吗？我可以帮你看门哦！我最擅长看门了！',
        ],
        interactions: [
          {
            label: '让她帮忙打扫门前',
            type: 'action',
            result_dialogues: [
              { speaker: '菅牧典', emotion: '自信', text: '交给我吧！看门和打扫是狛犬的基本功！' },
              { speaker: null, emotion: '', text: '她兴冲冲地拿起扫帚，干劲十足地扫了起来。不过……与其说是在扫地，不如说是在和落叶打架。' },
              { speaker: '菅牧典', emotion: '高兴', text: '搞定！……虽然好像比之前更乱了？' },
            ],
            effects: [
              { type: 'affection', target: '菅牧典', value: 2, description: '菅牧典好感度 +2' },
            ],
          },
          {
            label: '给她一块烤年糕',
            type: 'gift',
            result_dialogues: [
              { speaker: '菅牧典', emotion: '惊讶', text: '！！！这是什么！？软软的热热的！' },
              { speaker: '菅牧典', emotion: '高兴', text: '好吃！！！（两眼放光，尾巴摇成螺旋桨）' },
            ],
            effects: [
              { type: 'affection', target: '菅牧典', value: 3, description: '菅牧典好感度 +3' },
              { type: 'money', value: -20, description: '消耗食材 -20 金' },
            ],
          },
        ],
        allow_custom_chat: true,
      },
    ],
    special_events: [],
  },
  force_replan: false,
};

/** 根据回合号返回对应的 Mock 剧本 */
export function getMockRoundScript(round: number): RoundScript {
  if (round === 1) return structuredClone(MOCK_ROUND_SCRIPT_1);
  if (round === 2) return structuredClone(MOCK_ROUND_SCRIPT_2);

  // 回合 3+ 循环使用，修改回合号
  const base = structuredClone(round % 2 === 1 ? MOCK_ROUND_SCRIPT_1 : MOCK_ROUND_SCRIPT_2);
  base.round = round;
  return base;
}

/** 返回 Mock 大纲 */
export function getMockPlotOutline(): PlotOutline {
  return structuredClone(MOCK_PLOT_OUTLINE);
}
