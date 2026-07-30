<script setup lang="ts">
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  Users,
  Info,
  ChevronRight,
  ArrowLeft,
  Target
} from 'lucide-vue-next';
import { ref } from 'vue';

interface LocationInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
  characters: string[];
  subLocations?: string[];
  subLocationDetails?: Record<string, string>;
  collabCharacters?: string[];
  collabCharacterDetails?: Record<string, string>;
  type?: string;
}

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close']);

const zoom = ref(1);
const isDragging = ref(false);
const position = ref({ x: 0, y: 0 });
const startPos = ref({ x: 0, y: 0 });
const selectedLocation = ref<LocationInfo | null>(null);
const selectedSubLocationName = ref<string | null>(null);
const selectedDetailType = ref<'sub' | 'collab'>('sub');

const typeMap: Record<string, string> = {
  shrine: '神社',
  village: '村落',
  forest: '森林',
  mansion: '洋馆',
  lake: '湖泊',
  mountain: '山岳',
  underground: '地底',
  castle: '城堡',
  temple: '寺庙'
};

// 幻想乡地点数据
const locations = ref<LocationInfo[]>([
  {
    id: 'myouren-temple',
    name: '命莲寺',
    x: 50.9,
    y: 74.6,
    type: 'temple',
    description: '命莲寺位于人间之里正南方的某处空地中，是由僧侣圣白莲创建的佛教寺庙。',
    characters: ['圣白莲', '寅丸星', '村纱水蜜', '娜兹玲', '封兽鵺', '云居一轮', '秦心', '多多良小伞', '幽谷响子'],
    subLocations: ['命莲寺大殿', '命莲寺墓地', '梦殿大祀庙'],
    subLocationDetails: {
      命莲寺大殿: '庄严神圣的大殿，是僧侣们修行与诵经的核心场所。',
      命莲寺墓地: '位于寺庙后方的宁静墓园，是通往神秘梦殿大祀庙的必经之地。',
      梦殿大祀庙: '曾深埋于地下的古老陵墓，现已通过圣人的伟力接入仙界。'
    }
  },
  {
    id: 'misty-lake',
    name: '雾之湖',
    x: 37.5,
    y: 40.6,
    type: 'lake',
    description: '雾之湖是位于妖怪之山山脚下的神秘核心湖泊，因正午前后升起的浓雾而得名。',
    characters: ['琪露诺', '大妖精', '露米娅', '若鹭姬', '俊达萌'],
    subLocations: ['红魔馆', '雾之湖钓台', '春之小径'],
    subLocationDetails: {
      红魔馆: '屹立于湖畔的深红洋馆，其哥特式的塔楼在浓雾中若隐若现。',
      雾之湖钓台: '由垂钓爱好者们搭建的木质平台，是观察湖中幻之鱼类的绝佳位置。',
      春之小径: '一条被繁花簇拥的幽静小路，连接着湖泊与魔法森林。'
    },
    collabCharacters: ['俊达萌'],
    collabCharacterDetails: {
      俊达萌: '穿越而来的异世界虚拟歌手，以“毛豆妖精”的形态实体化。'
    }
  },
  {
    id: 'human-village',
    name: '人间之里',
    x: 54.6,
    y: 49.9,
    type: 'village',
    description: '位于幻想乡中心区域的人类聚居地，是人类文明、经济与文化的核心。',
    characters: ['上白泽慧音', '稗田阿求', '本居小铃', '奥野田美宵', '铃瑚', '清兰', '冴月麟', '朱鹭子', '雏森', '月永爱', '菲娅'],
    subLocations: ['龙神广场', '观光缆车', '鲵吞亭', '寺子屋', '稗田邸', '铃奈庵'],
    subLocationDetails: {
      龙神广场: '村落最繁华的中心地带，矗立着巨大的龙神石像。',
      观光缆车: '现代技术与魔法结合的产物，可从村里直达妖怪之山。',
      鲵吞亭: '一家充满人情味的老字号酒馆。',
      寺子屋: '书声琅琅的学堂，上白泽慧音在此倾注心血教导孩子们。',
      稗田邸: '历史悠久的稗田家宅邸，保存着幻想乡最完整的文献记录。',
      铃奈庵: '藏书丰富的租书屋，本居小铃对这里的每一本书都如数家珍。'
    }
  },
  {
    id: 'hakurei-shrine',
    name: '博丽神社',
    x: 79.3,
    y: 39.8,
    type: 'shrine',
    description: '坐落于幻想乡极东边境、博丽大结界之上的神社。它是维持大结界的核心，也是灵梦的住处。',
    characters: ['博丽灵梦', '伊吹萃香', '比那名居天子', '针妙丸'],
    subLocations: ['本殿', '赛钱箱', '庭院', '间歇泉', '守矢神社分社'],
    subLocationDetails: {
      本殿: '古朴而宁静的建筑，博丽巫女日常生活与修行的核心。',
      赛钱箱: '神社庭院中那个略显寂寞的木箱。',
      庭院: '视野开阔的空地，是举办宴会、清扫落叶以及偶尔进行弹幕对决的舞台。',
      间歇泉: '伴随着巨大的轰鸣声从地下喷薄而出的泉眼。',
      守矢神社分社: '两家神社友好竞争与合作的象征。'
    }
  },
  {
    id: 'sunflower-field',
    name: '太阳花田',
    x: 23.8,
    y: 76.7,
    type: 'forest',
    description: '遍布向日葵的广阔草原，由风见幽香管理。这里寄宿着数众多的妖精。',
    characters: ['风见幽香', '梅蒂欣', '莉莉霍瓦特'],
    subLocations: ['风见幽香的住所', '无名之丘'],
    subLocationDetails: {
      风见幽香的住所: '掩映在万花丛中的精致木屋，处处透着主人对植物的热爱。',
      无名之丘: '一片被紫色铃兰覆盖的寂静山丘。'
    }
  },
  {
    id: 'magic-forest',
    name: '魔法森林',
    x: 31.7,
    y: 61.4,
    type: 'forest',
    description: '幻想乡中最大、湿度最高的原始森林，充斥着能产生幻觉的瘴气。',
    characters: ['雾雨魔理沙', '爱丽丝', '露米娅', '莉格露', '森近霖之助'],
    subLocations: ['雾雨魔法店', '香霖堂', '爱丽丝的宅邸', '无缘冢'],
    subLocationDetails: {
      雾雨魔法店: '这里是魔理沙研制新型弹幕与存放“借来”物品的基地。',
      香霖堂: '位于森林边缘的一座静谧古董店。店主森近霖之助收集了许多来自外界的奇妙物品。',
      爱丽丝的宅邸: '森林中一座精致的西式洋馆。屋内摆满了各式各样栩栩如生的人偶。',
      无缘冢: '幻想乡中最为阴郁的地带之一，是结界薄弱、彼岸花盛开的地方。'
    }
  },
  {
    id: 'bamboo-forest',
    name: '迷途竹林',
    x: 76,
    y: 79.6,
    type: 'forest',
    description: '位于人间之里东南侧的广阔竹林，以极易迷路而闻名。深处隐藏着古老的宅邸“永远亭”。',
    characters: ['蓬莱山辉夜', '八意永琳', '铃仙', '因幡帝', '藤原妹红', '米斯蒂娅'],
    subLocations: ['永远亭', '夜雀食堂', '藤原小屋'],
    subLocationDetails: {
      永远亭: '隐匿在竹林深处的辉煌建筑，充满了超越时代的古老气息。',
      夜雀食堂: '竹林深处唯一的暖光。米斯蒂娅在此支起摊位，为迷途的行人提供热气腾腾的小吃。',
      藤原小屋: '藤原妹红在竹林中的简朴居所。'
    }
  },
  {
    id: 'shimmy-castle',
    name: '辉针城',
    x: 55.9,
    y: 26,
    type: 'castle',
    description: '悬浮在幻想乡上空的倒悬城池，城内展现出日式传统美景。',
    characters: ['少名针妙丸', '鬼人正邪', '今泉影狼', '崛川雷鼓'],
    subLocations: ['逆针阁'],
    subLocationDetails: {
      逆针阁: '辉针城中最核心的倒悬大厅。精美的浮世绘与传统的日式结构在这里被重力反转。'
    }
  },
  {
    id: 'sdm',
    name: '红魔馆',
    x: 18.1,
    y: 44.7,
    type: 'mansion',
    description: '坐落于雾之湖北岸的哥特式洋馆，散发着深红色的妖气。',
    characters: ['蕾米莉亚', '芙兰朵露', '十六夜咲夜', '帕秋莉', '红美铃', '小恶魔'],
    subLocations: ['大图书馆', '地下室', '大厅'],
    subLocationDetails: {
      大图书馆: '由帕秋莉管理的巨大书库，空气中弥漫着古老羊皮纸与魔法药水的味道。',
      地下室: '位于馆内最深处的阴冷空间，长期以来一直是二小姐芙兰朵露的活动区域。',
      大厅: '红魔馆的门面所在，铺着华贵的深红地毯。门卫红美铃常在此守卫。'
    }
  },
  {
    id: 'youkai-mountain',
    name: '妖怪之山',
    x: 31.9,
    y: 22.3,
    type: 'mountain',
    description: '幻想乡的科技与文明中心，居住着天狗和河童等高度发达的妖怪社会。',
    characters: ['射命丸文', '犬走椛', '河城荷取', '姬海棠果', '键山雏', '东风谷早苗', '八坂神奈子', '洩矢诹访子'],
    subLocations: ['守矢神社', '九天瀑布', '河童机械工厂', '虹龙洞'],
    subLocationDetails: {
      守矢神社: '矗立在山顶云端的神社，供奉着从外界迁入的强大神明。',
      九天瀑布: '从绝壁上奔流而下的壮丽瀑布，水汽氤氲中常能见到白狼天狗巡逻队。',
      河童机械工厂: '充满了齿轮啮合声与蒸汽轰鸣的地下工坊。',
      虹龙洞: '由人工开凿、蜿蜒曲折的矿坑。洞壁上镶嵌着色彩斑斓的龙珠。'
    }
  },
  {
    id: 'former-hell',
    name: '旧地狱',
    x: 57.3,
    y: 91.4,
    type: 'underground',
    description: '位于地底深处的广阔地下世界，曾是地狱的一部分。现由鬼族接管并建立了热闹的街道和温泉街。',
    characters: ['古明地觉', '古明地恋', '星熊勇仪', '水桥帕露西', '火焰猫燐', '灵乌路空'],
    subLocations: ['地灵殿', '旧地狱街道', '旧地狱温泉街', '灼热地狱遗址'],
    subLocationDetails: {
      地灵殿: '地底最宏伟的宫殿，整体风格充满了维多利亚时代的精致与压抑。',
      旧地狱街道: '热闹非凡的地底商业街。在鬼族的治理下，这里充满了江湖气息。',
      旧地狱温泉街: '著名的地底疗养圣地。在这里，灼热地狱的余热被转化为舒适的温泉水。',
      灼热地狱遗址: '位于地底最深处的禁忌之地。滚烫的岩浆在此翻滚，为地底世界提供着源源不断的能源。'
    }
  }
]);

function handleLocationClick(loc: LocationInfo) {
  if (isDragging.value) return;
  selectedLocation.value = loc;
  selectedSubLocationName.value = null;
}

function handleSubLocationClick(subName: string, type: 'sub' | 'collab') {
  selectedSubLocationName.value = subName;
  selectedDetailType.value = type;
}

function backToLocation() {
  selectedSubLocationName.value = null;
}

function handleClose() {
  emit('close');
  zoom.value = 1;
  position.value = { x: 0, y: 0 };
  selectedLocation.value = null;
}

function handleZoom(delta: number) {
  zoom.value = Math.max(0.5, Math.min(3, zoom.value + delta));
}

function resetZoom() {
  zoom.value = 1;
  position.value = { x: 0, y: 0 };
}

function startDrag(e: MouseEvent) {
  if (zoom.value <= 1) return;
  isDragging.value = true;
  startPos.value = { x: e.clientX - position.value.x, y: e.clientY - position.value.y };
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  position.value = {
    x: e.clientX - startPos.value.x,
    y: e.clientY - startPos.value.y
  };
}

function stopDrag() {
  isDragging.value = false;
}
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      
      <!-- 半透明背景遮罩 -->
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="handleClose"></div>

      <!-- 全屏内容容器 (Cyber-Tactical 风格) -->
      <div
        class="relative w-full h-full max-w-[95vw] max-h-[90vh] bg-[#0a050a] rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden flex flex-col border border-red-500/30"
      >
        <!-- 扫面线效果 -->
        <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_48%,rgba(239,68,68,0.1)_50%,transparent_52%)] bg-[length:100%_4px] z-50 opacity-30"></div>

        <!-- 地图视口层 -->
        <div
          class="relative w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-black/50"
          @mousedown="startDrag"
          @mousemove="onDrag"
          @mouseup="stopDrag"
          @mouseleave="stopDrag"
        >
          <div
            class="transition-transform duration-200 ease-out"
            :style="{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`
            }"
          >
            <!-- 图片挂载容器：用于锚定标记点的相对定位 -->
            <div class="relative">
              <img
                src="@/assets/images/map/幻想乡地图.webp"
                alt="幻想乡地图"
                class="block pointer-events-none select-none max-w-none h-[90vh]"
              />

              <!-- 地点交互标记点阵 -->
              <div
                v-for="loc in locations"
                :key="loc.id"
                class="absolute group/marker cursor-pointer"
                :style="{
                  left: `${loc.x}%`,
                  top: `${loc.y}%`,
                  transform: `translate(-50%, -50%) scale(${1 / Math.sqrt(zoom)})`
                }"
                @click.stop="handleLocationClick(loc)"
              >
                <!-- 科技感波纹动效 -->
                <div
                  v-if="selectedLocation?.id === loc.id"
                  class="absolute inset-0 w-10 h-10 -m-5 border border-red-500/80 rounded-full animate-ping"
                ></div>

                <!-- 标记点实体图标 -->
                <div
                  class="relative w-5 h-5 bg-red-500/20 backdrop-blur-[2px] border border-red-400/60 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300 group-hover/marker:scale-125 group-hover/marker:bg-red-500/40 group-hover/marker:border-red-300 flex items-center justify-center overflow-hidden"
                  :class="{ 'bg-red-500/60 border-red-300 scale-125': selectedLocation?.id === loc.id }"
                >
                  <Target v-if="selectedLocation?.id === loc.id" :size="12" class="text-white animate-spin-slow" />
                  <div v-else class="w-1.5 h-1.5 bg-white/80 rounded-full shadow-[0_0_8px_white]"></div>
                </div>

                <!-- 地名悬浮标签 -->
                <div
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-0.5 bg-black/80 border border-red-500/30 backdrop-blur-sm text-[10px] font-oswald text-white whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none"
                >
                  {{ loc.name }}
                </div>
              </div>
            </div>
          </div>

          <!-- 地点详细信息卡片覆盖层 (科幻风) -->
          <Transition name="slide-fade">
            <div
              v-if="selectedLocation"
              class="absolute right-6 top-24 bottom-24 w-80 z-40 pointer-events-auto"
              @mousedown.stop
            >
              <div
                class="h-full bg-black/70 backdrop-blur-xl border border-red-500/30 flex flex-col relative"
                style="clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);"
              >
                <!-- 装饰边角 -->
                <div class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500 pointer-events-none"></div>
                <div class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500 pointer-events-none"></div>

                <!-- 关闭操作按钮 -->
                <button
                  @click="selectedLocation = null"
                  class="absolute top-4 right-4 p-1.5 hover:bg-red-500/20 rounded transition-colors text-white/40 hover:text-red-500 z-20 border border-transparent hover:border-red-500/50"
                >
                  <X class="w-4 h-4" />
                </button>

                <!-- 返回上一级视图按钮 -->
                <button
                  v-if="selectedSubLocationName"
                  @click="backToLocation"
                  class="absolute top-4 left-4 px-2 py-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white z-20 flex items-center gap-1 text-[11px] font-oswald border border-transparent hover:border-white/30"
                >
                  <ArrowLeft class="w-3.5 h-3.5" />
                  <span>BACK</span>
                </button>

                <!-- 卡片内容滚动区 -->
                <div class="relative z-0 pt-16 px-6 pb-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                  
                  <!-- 地点主视图详情 -->
                  <div
                    v-if="!selectedSubLocationName"
                    class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
                  >
                    <!-- 地点头部标题 -->
                    <div>
                      <div class="text-[10px] font-bold font-oswald text-red-400 uppercase tracking-widest mb-1">
                        {{ typeMap[selectedLocation.type || ''] || 'LOCATION' }} // X:{{ selectedLocation.x }} Y:{{ selectedLocation.y }}
                      </div>
                      <h3 class="text-2xl font-serif font-bold text-white tracking-wide">
                        {{ selectedLocation.name }}
                      </h3>
                      <div class="h-0.5 w-12 bg-red-500 mt-3 shadow-[0_0_10px_#ef4444]"></div>
                    </div>

                    <!-- 地理描述 -->
                    <div class="space-y-2 bg-red-500/5 border border-red-500/10 p-3">
                      <div class="flex items-center gap-2 font-oswald text-red-300 text-[10px] tracking-wider">
                        <Info class="w-3 h-3" />
                        <span>TOPOGRAPHY // 地理简述</span>
                      </div>
                      <p class="text-sm text-white/80 leading-relaxed font-serif">
                        {{ selectedLocation.description }}
                      </p>
                    </div>

                    <!-- 内部主要区域 -->
                    <div v-if="selectedLocation.subLocations" class="space-y-3">
                      <div class="flex items-center gap-2 font-oswald text-red-300 text-[10px] tracking-wider">
                        <MapPin class="w-3 h-3" />
                        <span>SUB-ZONES // 次级探测区</span>
                      </div>
                      <div class="grid grid-cols-1 gap-1.5">
                        <div
                          v-for="sub in selectedLocation.subLocations"
                          :key="sub"
                          @click="handleSubLocationClick(sub, 'sub')"
                          class="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 text-xs text-white/80 group/sub cursor-pointer hover:bg-red-500/20 hover:border-red-500/50 transition-all font-serif"
                        >
                          <span>{{ sub }}</span>
                          <ChevronRight
                            class="w-3 h-3 text-red-500 opacity-50 group-hover/sub:opacity-100 group-hover/sub:translate-x-1 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- 相关常驻人物 -->
                    <div class="space-y-3 pt-2">
                      <div class="flex items-center gap-2 font-oswald text-red-300 text-[10px] tracking-wider">
                        <Users class="w-3 h-3" />
                        <span>ENTITIES // 探测到生命体反应</span>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <span
                          v-for="char in selectedLocation.characters"
                          :key="char"
                          class="px-2 py-1 bg-white/5 border border-white/10 text-[11px] text-white/70 hover:text-white hover:border-red-500/50 transition-colors cursor-default font-serif"
                        >
                          {{ char }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- 子地点/角色详细说明面层 -->
                  <div
                    v-else
                    class="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300"
                  >
                    <div>
                      <div class="text-[10px] font-bold font-oswald text-white/40 uppercase tracking-widest mb-1">
                        {{ selectedLocation.name }} · {{ selectedDetailType === 'collab' ? 'ENTITY' : 'SUB-ZONE' }}
                      </div>
                      <h4 class="text-xl font-serif font-bold text-white">
                        {{ selectedSubLocationName }}
                      </h4>
                      <div class="h-0.5 w-12 bg-red-500 mt-3 shadow-[0_0_10px_#ef4444]"></div>
                    </div>

                    <div class="bg-red-500/5 border border-red-500/10 p-3 mt-4">
                      <p class="text-sm text-white/90 leading-relaxed font-serif">
                        {{
                          selectedDetailType === 'collab'
                            ? selectedLocation.collabCharacterDetails?.[selectedSubLocationName]
                            : selectedLocation.subLocationDetails?.[selectedSubLocationName]
                        }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- 悬浮顶部导航 -->
          <div
            class="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
          >
            <div class="flex items-center gap-4 pointer-events-auto">
              <div
                class="w-10 h-10 bg-red-500/20 border border-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                style="clip-path: polygon(30% 0, 100% 0, 100% 70%, 70% 100%, 0 100%, 0 30%);"
              >
                <MapPin class="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 class="text-2xl font-oswald font-bold text-white leading-none tracking-widest">
                  TACTICAL MAP
                </h2>
                <p class="text-xs text-red-400/80 font-oswald mt-1 uppercase tracking-widest">
                  GENSOKYO SECTOR // SATELLITE VIEW
                </p>
              </div>
            </div>

            <div class="flex items-center gap-4 pointer-events-auto">
              <!-- 缩放控制 -->
              <div class="flex items-center bg-black/60 border border-white/10 p-1 px-2 shadow-xl">
                <button
                  @click="handleZoom(0.2)"
                  class="p-2 hover:bg-white/10 transition-colors text-white/80"
                >
                  <ZoomIn class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-white/20 mx-1"></div>
                <button
                  @click="handleZoom(-0.2)"
                  class="p-2 hover:bg-white/10 transition-colors text-white/80"
                >
                  <ZoomOut class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-white/20 mx-1"></div>
                <button
                  @click="resetZoom"
                  class="p-2 hover:bg-white/10 transition-colors text-white/80"
                >
                  <Maximize2 class="w-4 h-4" />
                </button>
              </div>

              <button
                @click="handleClose"
                class="px-4 py-2 bg-red-500/20 hover:bg-red-500 border border-red-500/50 hover:border-red-500 transition-all text-white font-oswald text-sm tracking-widest flex items-center gap-2 group"
                style="clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);"
              >
                <X class="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                CLOSE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.font-oswald {
  font-family: 'Oswald', sans-serif;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(40px);
  opacity: 0;
}

.animate-spin-slow {
  animation: spin 6s linear infinite;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(239, 68, 68, 0.5);
  border-radius: 2px;
}
</style>
