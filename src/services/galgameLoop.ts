/**
 * services/galgameLoop.ts — Galgame 模式回合生命周期编排器
 *
 * 负责编排完整的回合流程：
 *   1. (可选) 调用剧情规划大师更新大纲
 *   2. 调用故事写手 (LLM1) 生成回合剧本
 *   3. 将剧本交给 galgameStore 驱动前端回放
 *   4. 回合结束时调用 LLM2 撰写总结 + 数值计算
 *   5. 推进至下一回合
 *
 * 与 gameLoop.ts（沙盒模式）平行，互不干扰。
 */

import { ref } from 'vue';
import OpenAI from 'openai';
import { useSettingsStore } from '@/stores/settings';
import { useGameStore } from '@/stores/game';
import { useGalgameStore } from '@/stores/galgame';
import { useChatStore } from '@/stores/chat';
import { useSaveStore } from '@/stores/save';
import { useToastStore } from '@/stores/toast';
import { audioManager } from './audio';
import { memoryService } from '@/services/memory';
import type { RoundScript, PlotOutline, Effect } from '@/types/galgame';
import {
  buildStoryWriterPrompt,
  buildPlotDirectorPrompt,
  buildCustomChatPrompt,
  buildRoundSummaryPrompt,
} from './galgamePrompts';
import { getMockRoundScript, getMockPlotOutline } from './galgameMock';

class GalgameLoopService {
  /** 是否正在执行 LLM 调用 */
  isProcessing = ref(false);
  /** 当前处理阶段描述 */
  processingStage = ref('');
  /** 错误信息 */
  error = ref<string | null>(null);
  /** Mock 模式开关：跳过 LLM 调用，使用硬编码数据 */
  mockMode = ref(false);

  /**
   * 启动新一轮回合。
   * 完整流程：检查规划大师 → 调用故事写手 → 加载剧本。
   */
  async startNewRound() {
    const galgameStore = useGalgameStore();
    const toastStore = useToastStore();

    if (this.isProcessing.value) {
      console.warn('[GalgameLoop] 忽略重复调用：正在处理中');
      return;
    }

    this.isProcessing.value = true;
    this.error.value = null;
    galgameStore.phase = 'loading';

    try {
      const nextRound = galgameStore.currentRound + 1;

      // ===== Mock 模式：跳过 LLM 调用 =====
      if (this.mockMode.value) {
        this.processingStage.value = '【Mock】加载测试剧本...';
        await new Promise((r) => setTimeout(r, 800)); // 模拟加载延迟

        if (nextRound === 1) {
          galgameStore.updatePlotOutline(getMockPlotOutline());
          
          // 给 Mock 模式注入详细的角色状态变量，用于测试二级情报面板
          const gameStore = useGameStore();
          gameStore.state.npcs['灵梦'] = {
            id: '灵梦',
            name: '灵梦',
            favorability: 65,
            obedience: 50,
            mood: '慵懒',
            relationship: '损友',
            clothing: '红白相间的露腋巫女服',
            posture: '斜靠在塞钱箱上',
            action: '发呆',
            hp: 100,
            max_hp: 100,
            power: '极高',
            face: '',
            mouth: '',
            chest: '平平无奇',
            hands: '',
            buttocks: '',
            vagina: '',
            anus: '',
            residence: '博丽神社',
          } as any;
          gameStore.state.npcs['魔理沙'] = {
            id: '魔理沙',
            name: '魔理沙',
            favorability: 80,
            obedience: 60,
            mood: '兴奋',
            relationship: '常客',
            clothing: '黑白相间的魔法使装束，戴着大帽子',
            posture: '骑在扫帚上悬停半空',
            action: '四处张望',
            hp: 95,
            max_hp: 100,
            power: '极高',
            face: '',
            mouth: '',
            chest: '一般',
            hands: '',
            buttocks: '',
            vagina: '',
            anus: '',
            residence: '魔法森林',
          } as any;
        }

        const script = getMockRoundScript(nextRound);
        galgameStore.loadRoundScript(script);
        if (script.bgm_mood) {
          audioManager.playBgmByCategory(script.bgm_mood);
        } else {
          audioManager.playBgmByCategory('daily');
        }
        toastStore.addToast(`【Mock】第 ${nextRound} 回合开始`, 'info', 3000);
        return;
      }

      // ===== 正式模式 =====
      // 步骤 1：检查是否需要触发剧情规划大师
      if (galgameStore.needsReplan || nextRound === 1 || galgameStore.narrativeGuidance) {
        this.processingStage.value = '剧情规划大师正在编织命运之线...';
        const outline = await this.callPlotDirector(nextRound);
        if (outline) {
          galgameStore.updatePlotOutline(outline);
        }
        // 如果是因为到达回合数触发的大纲更新，重置倒计时
        if (galgameStore.replanCountdown <= 0) {
          galgameStore.replanCountdown = 10; // 默认每 10 回合重新规划
        }
      }

      // 步骤 2：调用故事写手生成回合剧本
      this.processingStage.value = '故事写手正在执笔本回合的剧本...';
      const script = await this.callStoryWriter(nextRound);

      if (!script) {
        throw new Error('故事写手未返回有效的回合剧本');
      }

      // 步骤 3：加载剧本，开始前端回放
      galgameStore.loadRoundScript(script);
      
      // 触发 BGM
      if (script.bgm_mood) {
        audioManager.playBgmByCategory(script.bgm_mood);
      } else {
        audioManager.playBgmByCategory('daily');
      }

      audioManager.playPageFlip();
      
      // 清空玩家的自定义剧情引导（只生效一回合）
      galgameStore.narrativeGuidance = '';

      toastStore.addToast(`第 ${nextRound} 回合开始`, 'info', 3000);
    } catch (e: any) {
      console.error('[GalgameLoop] 回合启动失败:', e);
      this.error.value = e.message || '未知错误';
      galgameStore.phase = 'idle';
      toastStore.addToast(`回合启动失败：${e.message}`, 'error', 8000);
    } finally {
      this.isProcessing.value = false;
      this.processingStage.value = '';
    }
  }

  /**
   * 结束当前回合的自由活动阶段。
   * 调用 LLM2 生成总结 → 保存 → 推进。
   */
  async endCurrentRound() {
    const galgameStore = useGalgameStore();
    const toastStore = useToastStore();

    if (this.isProcessing.value) return;

    this.isProcessing.value = true;
    galgameStore.endFreeActivity();

    try {
      // Mock 模式：生成固定总结
      if (this.mockMode.value) {
        this.processingStage.value = '【Mock】生成回合总结...';
        await new Promise((r) => setTimeout(r, 500));
        const mockSummary = `【Mock 总结】第 ${galgameStore.currentRound} 回合的夜晚平静而温驨。居酒屋的灯光在暮色中渐渐亮起，客人们三三两两地走进店里，在炭火的温暖和酒香中度过了一段宁静的时光。`;
        const chatStore = useChatStore();
        await chatStore.addMessage('user', `（系统）：经过了一天的探索与交流，第 ${galgameStore.currentRound} 回合的自由活动已结束。`);
        await chatStore.addMessage('assistant', `【第 ${galgameStore.currentRound} 回合总结】\n\n${mockSummary}`);
        galgameStore.completeRound(mockSummary);
        toastStore.addToast(`【Mock】第 ${galgameStore.currentRound} 回合结束`, 'info', 3000);
        return;
      }

      // 调用 LLM2 撰写回合总结
      this.processingStage.value = '正在撰写本回合故事总结...';
      const summary = await this.callRoundSummary();

      // 将总结存入聊天记录（沙盒模式可见），保证 user 与 assistant 气泡交替
      const chatStore = useChatStore();
      await chatStore.addMessage(
        'user',
        `（系统）：经过了一天的探索与交流，第 ${galgameStore.currentRound} 回合的自由活动已结束。`
      );
      await chatStore.addMessage(
        'assistant',
        `【第 ${galgameStore.currentRound} 回合总结】\n\n${summary}`
      );

      // 提取长期记忆
      if (!this.mockMode.value) {
        this.processingStage.value = '正在提取长期记忆...';
        const saveStore = useSaveStore();
        const gameStore = useGameStore();
        if (saveStore.currentSaveId) {
          try {
            await memoryService.extractAndSave(
              saveStore.currentSaveId,
              galgameStore.currentRound,
              { name: 'System', input: `这是第 ${galgameStore.currentRound} 回合的故事总结与角色自由活动记录。` },
              summary,
              [], // Galgame 模式暂不直接传行为，通过 summary 让书记员总结即可
              {
                date: gameStore.state.player.date,
                time: gameStore.state.player.time,
                location: gameStore.state.player.location,
                characters: galgameStore.sceneCharacters.map(c => c.name)
              }
            );
          } catch (e) {
            console.error('[GalgameLoop] 记忆提取失败:', e);
          }
        }
      }

      // 完成回合
      galgameStore.completeRound(summary);
      audioManager.playChime();

      toastStore.addToast(`第 ${galgameStore.currentRound} 回合结束`, 'info', 3000);
    } catch (e: any) {
      console.error('[GalgameLoop] 回合结束处理失败:', e);
      this.error.value = e.message;
      galgameStore.phase = 'idle';
      toastStore.addToast(`回合结束处理失败：${e.message}`, 'error', 8000);
    } finally {
      this.isProcessing.value = false;
      this.processingStage.value = '';
    }
  }

  /**
   * 自由活动阶段的自定义对话（调用 LLM2）。
   */
  async customChat(characterName: string, playerInput: string): Promise<string> {
    const galgameStore = useGalgameStore();

    // Mock 模式：返回固定回复
    if (this.mockMode.value) {
      await new Promise((r) => setTimeout(r, 300));
      const mockReplies: Record<string, string> = {
        '今泉影狼': '哼，你说的这个啊……我觉得还行吧。不过下次能再多加点秋刀鱼吗？',
        '键山雏': '喃喃……谢谢你愿意和我说话。很少有人这样……',
        '菅牧典': '汪！这个问题交给我！虽然我也不太懂就是了！',
        '克劳恩皮斯': '嘿嘿~你可真有趣呀，人类！要不要我用火把表演给你看？',
      };
      const reply = mockReplies[characterName] || `「${characterName}」微微点了点头，似乎在思考你说的话。`;
      galgameStore.logCustomChat(characterName, playerInput, reply);
      return reply;
    }

    const settingsStore = useSettingsStore();
    const logicConfig = settingsStore.getEffectiveConfig('logic');

    if (!logicConfig.apiKey) {
      throw new Error('未配置逻辑模型 (LLM #2) 的 API Key');
    }

    const openai = new OpenAI({
      baseURL: logicConfig.baseUrl,
      apiKey: logicConfig.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const saveStore = useSaveStore();
    let memoryContext = '';
    if (saveStore.currentSaveId && !this.mockMode.value) {
      const retrieved = await memoryService.retrieve(
        saveStore.currentSaveId,
        playerInput,
        galgameStore.currentRound
      );
      memoryContext = retrieved;
    }

    // 使用 Galgame 专属自定义对话 Prompt 模板
    const messages = buildCustomChatPrompt(characterName, playerInput, memoryContext) as any;

    const response = await openai.chat.completions.create({
      model: logicConfig.model || 'gpt-3.5-turbo',
      messages,
      temperature: logicConfig.temperature ?? 0.7,
      stream: false,
    });

    const reply = response.choices[0]?.message?.content || '（沉默不语）';

    // 记录到行为日志
    galgameStore.logCustomChat(characterName, playerInput, reply);

    return reply;
  }

  /**
   * 应用效果列表到游戏状态。
   */
  applyEffects(effects: Effect[]) {
    const gameStore = useGameStore();
    const toastStore = useToastStore();

    for (const effect of effects) {
      switch (effect.type) {
        case 'money':
          if (effect.value) {
            gameStore.state.player.money = (gameStore.state.player.money || 0) + effect.value;
          }
          break;
        case 'hp':
          if (effect.value) {
            gameStore.state.player.hp = Math.max(
              0,
              (gameStore.state.player.hp || 0) + effect.value
            );
          }
          break;
        case 'mp':
          if (effect.value) {
            gameStore.state.player.mp = Math.max(
              0,
              (gameStore.state.player.mp || 0) + effect.value
            );
          }
          break;
        case 'quest_trigger':
          if (effect.quest) {
            gameStore.setPendingQuest(effect.quest);
          }
          break;
        case 'promise_trigger':
          if (effect.promise) {
            gameStore.setPendingPromise(effect.promise);
          }
          break;
        // 其他效果类型后续扩展
        default:
          break;
      }

      // 显示效果提示
      if (effect.description) {
        toastStore.addToast(effect.description, 'info', 3000);
      }
    }
  }

  // ===== 内部 LLM 调用方法 =====

  /**
   * 调用剧情规划大师（复用 LLM1 配置）。
   */
  private async callPlotDirector(nextRound: number): Promise<PlotOutline | null> {
    const settingsStore = useSettingsStore();
    const galgameStore = useGalgameStore();
    const chatConfig = settingsStore.getEffectiveConfig('chat');

    if (!chatConfig.apiKey) return null;

    const openai = new OpenAI({
      baseURL: chatConfig.baseUrl,
      apiKey: chatConfig.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const saveStore = useSaveStore();
    let memoryContext = '';
    if (saveStore.currentSaveId && !this.mockMode.value) {
      const globalMems = await memoryService.getGlobalMemories(saveStore.currentSaveId);
      const retrieved = await memoryService.retrieve(
        saveStore.currentSaveId,
        '主线剧情 核心目标 联盟 誓约 秘密',
        galgameStore.currentRound
      );
      if (globalMems || retrieved) {
        memoryContext = [globalMems, retrieved].filter(Boolean).join('\n\n');
      }
    }

    // 使用 Galgame 专属剧情规划大纲 Prompt 模板
    const messages = buildPlotDirectorPrompt(nextRound, memoryContext) as any;

    try {
      const response = await openai.chat.completions.create({
        model: chatConfig.model || 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        stream: false,
      });

      const raw = response.choices[0]?.message?.content || '';
      // 尝试从回复中提取 JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as PlotOutline;
      }
      console.warn('[GalgameLoop] 剧情规划大师未返回有效 JSON');
      return null;
    } catch (e) {
      console.error('[GalgameLoop] 剧情规划大师调用失败:', e);
      return null;
    }
  }

  /**
   * 调用故事写手（LLM1）生成回合剧本。
   */
  private async callStoryWriter(nextRound: number): Promise<RoundScript | null> {
    const settingsStore = useSettingsStore();
    const galgameStore = useGalgameStore();
    const chatConfig = settingsStore.getEffectiveConfig('chat');

    if (!chatConfig.apiKey) {
      throw new Error('未配置对话模型 (LLM #1) 的 API Key');
    }

    const openai = new OpenAI({
      baseURL: chatConfig.baseUrl,
      apiKey: chatConfig.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const saveStore = useSaveStore();
    let memoryContext = '';
    if (saveStore.currentSaveId && !this.mockMode.value) {
      const globalMems = await memoryService.getGlobalMemories(saveStore.currentSaveId);
      const retrieved = await memoryService.retrieve(
        saveStore.currentSaveId,
        galgameStore.narrativeGuidance || galgameStore.plotOutline?.main_arc || '剧情推进',
        galgameStore.currentRound
      );
      if (globalMems || retrieved) {
        memoryContext = [globalMems, retrieved].filter(Boolean).join('\n\n');
      }
    }

    // 使用 Galgame 专属剧本 Prompt 模板
    const messages = buildStoryWriterPrompt(nextRound, memoryContext) as any;

    const response = await openai.chat.completions.create({
      model: chatConfig.model || 'gpt-3.5-turbo',
      messages,
      temperature: chatConfig.temperature ?? 0.7,
      stream: false,
    },
    { timeout: Math.round(chatConfig.timeout || 300000) });

    const raw = response.choices[0]?.message?.content || '';
    console.log('[GalgameLoop] 故事写手原始输出:', raw);

    // 提取 JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('故事写手返回内容中未找到有效 JSON');
    }

    const script = JSON.parse(jsonMatch[0]) as RoundScript;
    script.round = nextRound; // 确保回合号正确
    return script;
  }

  /**
   * 调用 LLM2 撰写回合总结。
   */
  private async callRoundSummary(): Promise<string> {
    const settingsStore = useSettingsStore();
    const logicConfig = settingsStore.getEffectiveConfig('logic');

    if (!logicConfig.apiKey) {
      return '（逻辑模型未配置，无法生成总结）';
    }

    const openai = new OpenAI({
      baseURL: logicConfig.baseUrl,
      apiKey: logicConfig.apiKey,
      dangerouslyAllowBrowser: true,
    });

    // 使用 Galgame 专属回合总结 Prompt 模板
    const messages = buildRoundSummaryPrompt() as any;

    try {
      const response = await openai.chat.completions.create({
        model: logicConfig.model || 'gpt-3.5-turbo',
        messages,
        temperature: 0.3,
        stream: false,
      });

      return response.choices[0]?.message?.content || '（总结生成失败）';
    } catch (e) {
      console.error('[GalgameLoop] 回合总结生成失败:', e);
      return '（总结生成过程中发生错误）';
    }
  }
}

/** 全局单例 */
export const galgameLoop = new GalgameLoopService();
