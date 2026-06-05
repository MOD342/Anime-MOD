import { Sparkles, Shield, Palette, Zap, Star, Flame, Crown, Crown as CrownIcon, Skull, Swords, Ghost, Moon, Droplet, Wind, Mountain, Sun, Gem, Heart, Eye, HandMetal, Crosshair, Anchor, Lock, Search } from 'lucide-react';
import { anilistAvatars, anilistBanners } from './anilistData';

export type StoreCategory = 'avatar' | 'banner' | 'frame' | 'title' | 'badge';
export type StoreRarity = 'common' | 'good' | 'rare' | 'epic' | 'legendary' | 'cosmic';

export interface StoreItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  type: StoreCategory;
  rarity?: StoreRarity;
  img?: string; 
  icon?: any;   
  color?: string;
  bg?: string;
  border?: string;
  frameStyle?: string; 
  imageStyle?: string;
  minLevel?: number;
  avatarShape?: 'circle' | 'squircle' | 'square' | 'hexagon' | 'octagon' | 'triangle' | 'rhombus';
}

export function getAvatarShapeClass(shape?: 'circle' | 'squircle' | 'square' | 'hexagon' | 'octagon' | 'triangle' | 'rhombus') {
  if (shape === 'square') return 'rounded-xl';
  if (shape === 'squircle') return 'rounded-[1.75rem]';
  if (shape === 'hexagon') return '[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]';
  if (shape === 'octagon') return '[clip-path:polygon(30%_0%,70%_0%,100%_30%,100%_70%,70%_100%,30%_100%,0%_70%,0%_30%)]';
  if (shape === 'triangle') return '[clip-path:polygon(50%_0%,100%_100%,0%_100%)]';
  if (shape === 'rhombus') return '[clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]';
  return 'rounded-full';
}

// 1. Core definitions of items
const baseAvatars: any[] = anilistAvatars.map(item => ({
  ...item,
  type: 'avatar' as StoreCategory,
  desc: 'رمز شخصي مميز لملف حسابك مستوحى من عالم الأنمي الساحر.'
}));

const baseBanners: any[] = anilistBanners.map(item => ({
  ...item,
  type: 'banner' as StoreCategory,
  desc: 'غلاف خلفي مبهر يكسو حائط حسابك بالهيبة والأناقة.'
}));

const baseFrames: StoreItem[] = [
  { id: 'fr_common_1', name: 'إطار الخشب البسيط', desc: 'إطار خشبي متواضع بلمسة دافئة وزوايا ناعمة', price: 0, type: 'frame', rarity: 'common', avatarShape: 'squircle', frameStyle: 'ring-2 ring-amber-800' },
  { id: 'fr_common_2', name: 'إطار الحديد المطروق', desc: 'تصميم حديدي بسيط وثقيل يمنح الحساب مظهر الصمود', price: 0, type: 'frame', rarity: 'common', avatarShape: 'square', frameStyle: 'ring-2 ring-neutral-700' },
  { id: 'fr_square_crystal', name: 'إطار الكريستان الناعم', desc: 'إطار مربع خفيف مثل بلورات الماء المقطر الرقيقة', price: 0, type: 'frame', rarity: 'good', avatarShape: 'square', frameStyle: 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)]' },
  { id: 'fr_good_1', name: 'إطار برونزي مصقول', desc: 'إطار دائري من البرونز اللامع يستحقه كل مكافح ومتابع نشيط', price: 0, type: 'frame', rarity: 'good', avatarShape: 'circle', frameStyle: 'ring-2 ring-amber-600/60 shadow-[0_0_8px_rgba(217,119,6,0.15)]' },
  { id: 'fr_ninja_leaf', name: 'حامي الجبين الأوتوكو', desc: 'لوحة معدنية مستوحاة من نينجا ورقة الشجر الأسطورية لبداية عهد جديد', price: 0, type: 'frame', rarity: 'good', avatarShape: 'square', frameStyle: 'ring-2 ring-emerald-600 border border-slate-300' },
  { id: 'fr_circle_sakura', name: 'طوق الساكورا الربيعي', desc: 'هالة ربيعية دافئة هادئة محاطة بأوراق الساكورا الوردية الزاهية', price: 0, type: 'frame', rarity: 'good', avatarShape: 'circle', frameStyle: 'ring-2 ring-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]' },
  { id: 'fr_triangle_crimson', name: 'المثلث الياقوتي الحاد', desc: 'إطار ثلاثي هندسي ملتهب بقوة شعلة الكي الياقوتية المتألقة', price: 0, type: 'frame', rarity: 'rare', avatarShape: 'triangle', frameStyle: 'border-[6px] border-red-600 shadow-[0_0_10px_#f43f5e] bg-transparent' },
  { id: 'fr_octagon_emerald', name: 'المثمن الزمردي المتألق', desc: 'إطار ثماني الأبعاد مصقول مروى بنقش النيون الزمردي البحت', price: 0, type: 'frame', rarity: 'rare', avatarShape: 'octagon', frameStyle: 'border-[6px] border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] bg-transparent' },
  { id: 'fr_triangle_solar', name: 'المثلث الشمسي المتوهج', desc: 'شكل ثلاثي هندسي مشرق بحرارة طاقة الكي الشعلية', price: 0, type: 'frame', rarity: 'rare', avatarShape: 'triangle', frameStyle: 'border-[6px] border-yellow-500 shadow-[0_0_12px_#fbbf24] bg-transparent' },
  { id: 'fr_death_note', name: 'إطار الشينغامي الأسود', desc: 'وهج قادم من عالم الموتى بمسحة سوداء غامضة', price: 0, type: 'frame', rarity: 'rare', avatarShape: 'circle', frameStyle: 'ring-2 ring-black border border-neutral-800 shadow-[0_0_12px_rgba(0,0,0,1)]' },
  { id: 'fr_rhombus_void', name: 'معين البلازما المظلم', desc: 'جسم معين هندسي ذو أطراف متباينة يشع بهالة بنفسجية غامضة', price: 0, type: 'frame', rarity: 'epic', avatarShape: 'rhombus', frameStyle: 'border-[6px] border-purple-500 shadow-[0_0_15px_#c084fc] bg-transparent' },
  { id: 'fr_1', name: 'إطار اللهب الملتهب', desc: 'نيران ملتهبة غاضبة تحيط بصورتك الدائرية الشغوفة بمشاهدة الحلقات', price: 0, type: 'frame', rarity: 'epic', avatarShape: 'circle', frameStyle: 'ring-2 ring-orange-500 shadow-[0_0_15px_orange]' },
  { id: 'fr_2', name: 'إطار الأمواج الصافية', desc: 'أمواج صافية وعميقة تأخذ شكلاً ناعماً مستديراً وخلاباً لأصحاب الذوق المائي', price: 0, type: 'frame', rarity: 'epic', avatarShape: 'squircle', frameStyle: 'ring-2 ring-blue-500 shadow-[0_0_15px_blue] border-dashed border-2 border-cyan-300' },
  { id: 'fr_demon_slayer', name: 'تنفس الماء المائي', desc: 'تدفقات السيوف المائية المنحنية مقتبسة من قتلة الشياطين تكسو صورتك هيبة', price: 0, type: 'frame', rarity: 'epic', avatarShape: 'circle', frameStyle: 'ring-2 ring-teal-400 border border-white shadow-[0_0_12px_rgba(34,211,238,0.5)] animate-pulse' },
  { id: 'fr_hexagon_ruby', name: 'سداسي العقيق الناري', desc: 'جسم سداسي منتظم مروى بوهج زاهي يشع بالطاقة النقية الكثيفة', price: 0, type: 'frame', rarity: 'epic', avatarShape: 'hexagon', frameStyle: 'border-[6px] border-rose-600 shadow-[0_0_14px_rgba(225,29,72,0.5)] bg-transparent' },
  { id: 'fr_new_rose_square', name: 'إطار الغابة الكرزي الفاخر', desc: 'إطار مربع ناعم مزدان بزخارف كرزية وورود متفتحة جذابة ومريحة للعين', price: 0, type: 'frame', rarity: 'epic', avatarShape: 'square', frameStyle: 'ring-2 ring-rose-400 border-2 border-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.4)]' },
  { id: 'fr_7', name: 'إطار الصقيع الجليدي', desc: 'إطار مربع متجمد من رياح مملكة الجليد القاسية للمتابعين من ذوي الدم البارد والتركيز المطلق', price: 0, type: 'frame', rarity: 'epic', avatarShape: 'square', frameStyle: 'ring-4 ring-cyan-200 border-4 border-cyan-800 shadow-[0_0_15px_#22d3ee]' },
  { id: 'fr_new_plasma_hex', name: 'إطار البلازما سداسي الأضلاع', desc: 'هالة سداسية حقيقية تومض بطاقة دمج البلازما الفريدة من معارك الخيال العلمي الملحمية', price: 0, type: 'frame', rarity: 'epic', avatarShape: 'hexagon', frameStyle: 'border-[3px] border-fuchsia-500 shadow-[0_0_20px_#e879f9]' },
  { id: 'fr_rhombus_shadow', name: 'إطار معين الشينوبي الغسقي', desc: 'إطار هندسي على شكل معين يحمل وهج النينجا الغسقي المظلم والتخفي الأسطوري', price: 0, type: 'frame', rarity: 'legendary', avatarShape: 'rhombus', frameStyle: 'border-[6px] border-zinc-500 shadow-[0_0_15px_rgba(0,0,0,0.8)] bg-transparent' },
  { id: 'fr_egypt_gold', name: 'الملك الفرعوني المذهب', desc: 'إطار ذهبي عريق يحمل أسرار الأحجية المئوية والذهب الذي لا يفنى لمتابعي ألعاب الذكاء', price: 0, type: 'frame', rarity: 'legendary', avatarShape: 'square', frameStyle: 'ring-4 ring-yellow-500 border-2 border-amber-600 shadow-[0_0_15px_#fbbf24]' },
  { id: 'fr_s_1', name: 'أرجوان الرداء (السوسانو)', desc: 'دروع السوسانو الحامية لملفك الشخصي بعز ونبل شينوبي الأوتشيها ذوي القوة والأعين الخالدة', price: 0, type: 'frame', rarity: 'legendary', avatarShape: 'circle', frameStyle: 'ring-4 ring-purple-600 border-2 border-fuchsia-400 border-double shadow-[0_0_20px_#c084fc]' },
  { id: 'fr_new_cyber_squircle', name: 'إطار السايبر المستقبلي', desc: 'إطار سيبراني ناعم مستقبلي باللون الأخضر المشع يحاكي هولوغرام لوحات تحهم الفضاء العميقة', price: 0, type: 'frame', rarity: 'legendary', avatarShape: 'squircle', frameStyle: 'ring-4 ring-emerald-400 border-2 border-emerald-900 border-dashed shadow-[0_0_18px_#34d399]' },
  { id: 'fr_3', name: 'غضب الهاكي الملكي دائرية الشكل', desc: 'هاكي ملكي مسود يرهب قلوب المنافسين والزوار ويثبت هيبتك العتيدة', price: 0, type: 'frame', rarity: 'legendary', avatarShape: 'circle', frameStyle: 'ring-4 ring-rose-900 border-4 border-black border-dashed shadow-[0_0_20px_#4c1d95]' },
  { id: 'fr_octagon_gold', name: 'المثمن الإمبراطوري المرصع', desc: 'ثماني أبعاد ذهبي عتيق براق ينبض ببريق الثراء وعرش الأباطرة لصفوة من يعتلون السيرفر', price: 0, type: 'frame', rarity: 'legendary', avatarShape: 'octagon', frameStyle: 'border-[6px] border-yellow-500 shadow-[0_0_20px_#f59e0b] bg-transparent' },
  { id: 'fr_9', name: 'إطار المجرة السداسية الساحرة', desc: 'سحابة نجوم سحيقة تلمع بقالب سداسي نادر فخم وساحر لكل المترددين', price: 0, type: 'frame', rarity: 'legendary', avatarShape: 'hexagon', frameStyle: 'border-[3px] border-fuchsia-600 shadow-[0_0_30px_fuchsia]' },
  { id: 'fr_cosmic_warp', name: 'نفق الإلتواء السديمي', desc: 'إطار مشع كوني بألوان قوس قزح هولوغرافي يأتي مائلاً مثل انحناءة الزمكان الفضائي', price: 0, type: 'frame', rarity: 'cosmic', avatarShape: 'squircle', frameStyle: 'ring-4 ring-indigo-400 border-2 border-purple-500 shadow-[0_0_20px_#6366f1] animate-pulse' },
  { id: 'fr_4', name: 'هالة السايان الفائقة', desc: 'نهض طاقة الكي السايانية المتفجرة من السوبر سايان ولهيبها الذهبي المنبعث بلا نهاية', price: 0, type: 'frame', rarity: 'cosmic', avatarShape: 'circle', frameStyle: 'ring-4 ring-yellow-400 border-2 border-orange-500 shadow-[0_0_25px_rgba(234,179,8,0.8)] animate-pulse' },
  { id: 'fr_squircle_star', name: 'النجم السديمي الفضائي', desc: 'هيكل مروحي مائل مرن مصقول بسديم أندروميدا المضيء الخارق ذو الجاذبية الساحقة', price: 0, type: 'frame', rarity: 'cosmic', avatarShape: 'squircle', frameStyle: 'border-[6px] border-indigo-500 shadow-[0_0_25px_#4f46e5] bg-transparent' },
  { id: 'fr_10', name: 'مجد ملك القراصنة الذهبي', desc: 'الذهب الخالص الممزوج بإرادة الجوي بوي التي لا تهزم لتبرز فوق قمة كل القراصنة والمشاهدين', price: 0, type: 'frame', rarity: 'cosmic', avatarShape: 'circle', frameStyle: 'ring-[6px] ring-yellow-500 border-2 border-white shadow-[0_0_40px_yellow]' },
  { id: 'fr_5', name: 'الغريزة الكونية سداسية الأضلاع', desc: 'توازن الهدوء والسرعة الهلالية بهالة سداسية فضية طاقة كاملة لمن حاز السمعة النقية الطيبة', price: 0, type: 'frame', rarity: 'cosmic', avatarShape: 'hexagon', frameStyle: 'border-[3px] border-slate-100 shadow-[0_0_35px_rgba(255,255,255,0.9)]' }
];

const baseTitles: StoreItem[] = [
  { id: 'title_common_1', name: 'لقب: مبتدئ الأوتاكو', desc: 'لقب بسيط يعبر عن خطواتك الأولى الفتية في عالم المشاهدة.', price: 0, type: 'title', rarity: 'common', color: 'text-neutral-400', bg: 'bg-black/40', border: 'border-neutral-900', icon: Shield },
  { id: 'title_good_1', name: 'لقب: متابع متفاعل', desc: 'لقب رائع لمن يترك أثراً دائماً ورأياً طيباً حول الحلقات.', price: 0, type: 'title', rarity: 'good', color: 'text-green-400', bg: 'bg-black/60', border: 'border-neutral-800', icon: Star },
  { id: 'title_good_2', name: 'لقب: ناقد الأنمي القدير', desc: 'يستحق لبلوغ مستوى رائق من الفن ومتابعة الأساطير بآراء فريدة.', price: 0, type: 'title', rarity: 'good', color: 'text-cyan-400', bg: 'bg-black/70', border: 'border-cyan-950', icon: Palette },
  { id: 'title_1', name: 'لقب: سيد الظلام', desc: 'يظهر بجانب اسمك، يعكس هدوءك وهيبتك الغامضة والعميقة كالقمر المظلم.', price: 0, type: 'title', rarity: 'epic', color: 'text-purple-500', bg: 'bg-black', border: 'border-neutral-800', icon: Moon },
  { id: 'title_2', name: 'لقب: إمبراطور النار', desc: 'يبرز شغفك والتهاب إرادتك المستعرة كالملك الوهّاج إيس صاحب الشعلة الأبدية.', price: 0, type: 'title', rarity: 'epic', color: 'text-orange-500', bg: 'bg-black', border: 'border-neutral-800', icon: Flame },
  { id: 'title_3', name: 'لقب: الشبح الآوكي الخفي', desc: 'نادر وخفي، ينفذ مهماته تحت ستار الليل بلا أثر أو صوت يعلو.', price: 0, type: 'title', rarity: 'epic', color: 'text-slate-400', bg: 'bg-black', border: 'border-neutral-800', icon: Ghost },
  { id: 'title_9', name: 'لقب: شينوبي الرتبة S', desc: 'مطلوب في جميع القرى بقيمة مليارية لقوته الخارقة وقدراته الفتاكة المعجزة.', price: 0, type: 'title', rarity: 'legendary', color: 'text-emerald-400', bg: 'bg-black', border: 'border-neutral-800', icon: Swords },
  { id: 'title_4', name: 'لقب: سياف الغسق الأسطوري', desc: 'شفرة لا تصدأ عبر الزمن تقسم السحاب والبحار بسحبة واحدة وهدوء يحبس المتابعين.', price: 0, type: 'title', rarity: 'legendary', color: 'text-indigo-400', bg: 'bg-black', border: 'border-neutral-800', icon: Swords },
  { id: 'title_5', name: 'لقب: إله الدمار الفتاك', desc: 'قوة مفرطة تحطم كل شيء أمامها مع غضب الكي المخيف الأسطوري.', price: 0, type: 'title', rarity: 'legendary', color: 'text-red-500', bg: 'bg-black', border: 'border-neutral-800', icon: Skull },
  { id: 'title_10', name: 'لقب: صياد العمالقة الأقوى', desc: 'قائد فيلق الاستطلاع الطائر الذي لا يرحم في حماية ما تبقى وتحقيق الانتصار الأكيد.', price: 0, type: 'title', rarity: 'legendary', color: 'text-cyan-400', bg: 'bg-black', border: 'border-emerald-950', icon: Crosshair },
  { id: 'title_6', name: 'لقب: حامل الإرادة العتيقة', desc: 'الشعلة التي تفجر فجر العالم الجديد من قلب رافتيل محفورة في التاريخ والكتب القديمة.', price: 0, type: 'title', rarity: 'cosmic', color: 'text-yellow-400', bg: 'bg-black', border: 'border-neutral-800', icon: Sun },
  { id: 'title_8', name: 'لقب: وريث الهاكي الملكي', desc: 'صاحب العيون القرمزية التي تخر لها جبابرة السيرفر ذعراً ومحبة وهدوءاً مهيباً.', price: 0, type: 'title', rarity: 'cosmic', color: 'text-[#ef4444]', bg: 'bg-neutral-950', border: 'border-red-900', icon: Zap },
  { id: 'title_7', name: 'لقب: الأوتاكو الأعظم فريد النظير', desc: 'اللقب الأسمى لمن ختم عالم الأنمي بالكامل واعتلى عرش المتابعين وأثبت أنه الرقم الصعب.', price: 0, type: 'title', rarity: 'cosmic', color: 'text-yellow-500', bg: 'bg-black', border: 'border-neutral-800', icon: Crown },
  { id: 'title_god', name: 'لقب: الـمـاورائـي الإلـهـي', desc: 'تجاوز حدود مستويات الأنمي وفهم كينونة الحكاية كلياً ليدرك جوهر الأباطرة والملوك قاطبة.', price: 0, type: 'title', rarity: 'cosmic', color: 'text-rose-400 font-bold tracking-widest', bg: 'bg-black', border: 'border-neutral-800', icon: Sparkles }
];

const baseBadges: StoreItem[] = [
  { id: 'badge_common_1', name: 'شارة: البداية الفتية', desc: 'رمز العضوية الجديدة والترحيب بك في عالم الأباطرة.', price: 0, type: 'badge', rarity: 'common', color: 'text-neutral-400', bg: 'bg-black/50', border: 'border-neutral-950', icon: Shield },
  { id: 'badge_good_1', name: 'شارة: الباحث الذكي', desc: 'لمن يعرف كيف يستخرج تفاصيل الأنماي ويبحث بتعمق.', price: 0, type: 'badge', rarity: 'good', color: 'text-amber-500', bg: 'bg-black/50', border: 'border-neutral-800', icon: Search },
  { id: 'badge_1', name: 'شارة: عين الصقر', desc: 'دقة الملاحظة الأسطورية وقوة التركيز لقطع جبال الجليد.', price: 0, type: 'badge', rarity: 'rare', color: 'text-amber-500', bg: 'bg-black', border: 'border-neutral-800', icon: Eye },
  { id: 'badge_2', name: 'شارة: قلب شجاع لا يلين', desc: 'قلب لا يعرف الاستسلام، ينادي بالإرادة الحرة والحرية وكسر القيود.', price: 0, type: 'badge', rarity: 'epic', color: 'text-rose-500', bg: 'bg-black', border: 'border-neutral-800', icon: Heart },
  { id: 'badge_3', name: 'شارة: الغموض المطلق', desc: 'أسرار قديمة غامضة لم تكتشف بعد في المخطوطات السحرية للأوتوكو.', price: 0, type: 'badge', rarity: 'epic', color: 'text-fuchsia-500', bg: 'bg-black', border: 'border-neutral-800', icon: Ghost },
  { id: 'badge_5', name: 'شارة: الجوتسو السري الخارق', desc: 'رمز مستخدم العناصر الخمسة للنينجوتسو عالي التعقيد والتنفيذ.', price: 0, type: 'badge', rarity: 'legendary', color: 'text-teal-400', bg: 'bg-black', border: 'border-neutral-800', icon: Wind },
  { id: 'badge_4', name: 'شارة: أعين الشارينغان الخالدة', desc: 'أعين اليوتشيها الأسطورية القادرة على نسخ الحركات واستبصار الهجمات وتوقع الغد.', price: 0, type: 'badge', rarity: 'legendary', color: 'text-red-500', bg: 'bg-black', border: 'border-red-950', icon: Eye },
  { id: 'badge_6', name: 'شارة: إرادة الـ D الأبدية', desc: 'الحمل الموروث عبر العصور كالعاصفة التي ستجلب الفجر اللامع وتغير مصير العالم وعرش البحار.', price: 0, type: 'badge', rarity: 'cosmic', color: 'text-amber-400', bg: 'bg-neutral-950', border: 'border-yellow-950', icon: Anchor }
];

// Helper to calculate rarity rank weight
const getRarityWeight = (rarity?: StoreRarity): number => {
  if (rarity === 'common') return 1;
  if (rarity === 'good') return 2;
  if (rarity === 'rare') return 3;
  if (rarity === 'epic') return 4;
  if (rarity === 'legendary') return 5;
  if (rarity === 'cosmic') return 6;
  return 1;
};

// 2. Separate Level 5 Starter Items explicitly
const itemLevi: StoreItem = {
  id: 'av_ani_45627',
  name: 'Levi Ackerman',
  desc: 'الرمز الترحيبي الأسطوري للبطل ليفاي أكرمان متاح فور فتح المتجر.',
  price: 250,
  minLevel: 5,
  type: 'avatar',
  img: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png',
  rarity: 'common'
};

const itemWoodFrame: StoreItem = {
  id: 'fr_common_1',
  name: 'إطار الخشب البسيط',
  desc: 'إطار خشبي دافئ يرمز لبداية رحلتك العظيمة بعد الوصول للمستوى 5.',
  price: 260,
  minLevel: 5,
  type: 'frame',
  avatarShape: 'squircle',
  frameStyle: 'ring-2 ring-amber-800',
  rarity: 'common'
};

// Helper to map and scale an array of items systematically from startPrice to endPrice and startLevel to endLevel
const mapPurchasablesList = (
  items: any[],
  startLevel: number,
  endLevel: number,
  startPrice: number,
  endPrice: number
): StoreItem[] => {
  const sorted = [...items].sort((a, b) => {
    const rA = getRarityWeight(a.rarity);
    const rB = getRarityWeight(b.rarity);
    if (rA !== rB) return rA - rB;
    return a.name.localeCompare(b.name);
  });

  const total = sorted.length;
  if (total === 0) return [];
  if (total === 1) {
    return [{
      ...sorted[0],
      price: startPrice,
      minLevel: startLevel,
      rarity: startLevel >= 95 ? 'cosmic' : startLevel >= 75 ? 'legendary' : startLevel >= 45 ? 'epic' : startLevel >= 25 ? 'rare' : startLevel >= 12 ? 'good' : 'common'
    }];
  }

  return sorted.map((item, idx) => {
    const ratio = idx / (total - 1);
    
    // Level range gradually increasing
    const level = Math.min(endLevel, Math.floor(startLevel + ratio * (endLevel - startLevel)));
    
    // Price range gradually scaling up to endPrice
    const linearPart = startPrice + ratio * (endPrice - startPrice);
    const curvePart = startPrice + Math.pow(ratio, 1.5) * (endPrice - startPrice);
    const rawPrice = 0.8 * curvePart + 0.2 * linearPart;
    const price = Math.round(rawPrice / 10) * 10;

    // Refine rarity dynamically based on computed level to represent accurate evaluation
    let rarity: StoreRarity = 'common';
    if (level >= 95) rarity = 'cosmic';
    else if (level >= 75) rarity = 'legendary';
    else if (level >= 45) rarity = 'epic';
    else if (level >= 25) rarity = 'rare';
    else if (level >= 12) rarity = 'good';

    return {
      ...item,
      price,
      minLevel: level,
      rarity
    };
  });
};

// Filter remaining items to avoid duplication
const remainingAvatars = baseAvatars.filter(x => x.id !== 'av_ani_45627');
const remainingFrames = baseFrames.filter(x => x.id !== 'fr_common_1');

// Scaled arrays for each category independently
const mappedAvatars = mapPurchasablesList(remainingAvatars, 6, 100, 270, 30000);
const mappedBanners = mapPurchasablesList(baseBanners, 6, 100, 250, 30000);
const mappedFrames = mapPurchasablesList(remainingFrames, 6, 100, 270, 30000);

// Sort free earned honors and scale their levels from 6 to 100 gradually so they are not available before level 5 opens
const honorsList = [...baseTitles, ...baseBadges];
honorsList.sort((a, b) => {
  const rA = getRarityWeight(a.rarity);
  const rB = getRarityWeight(b.rarity);
  if (rA !== rB) return rA - rB;
  return a.name.localeCompare(b.name);
});

const totalHonors = honorsList.length;
const mappedHonors = honorsList.map((item, idx) => {
  const level = Math.min(100, Math.floor(6 + (idx / (totalHonors - 1)) * 94));
  
  let rarity: StoreRarity = 'common';
  if (level >= 95) rarity = 'cosmic';
  else if (level >= 75) rarity = 'legendary';
  else if (level >= 45) rarity = 'epic';
  else if (level >= 25) rarity = 'rare';
  else if (level >= 12) rarity = 'good';

  return {
    ...item,
    price: 0,
    minLevel: level,
    rarity
  };
});

// Create complete list of STORE_ITEMS ensuring exactly 2 starter items at Level 5
export const STORE_ITEMS: StoreItem[] = [
  itemLevi,
  itemWoodFrame,
  ...mappedAvatars,
  ...mappedBanners,
  ...mappedFrames,
  ...mappedHonors
];

export const STORE_ITEMS_SORTED = [...STORE_ITEMS].sort((a, b) => {
  const lvlA = a.minLevel || 5;
  const lvlB = b.minLevel || 5;
  if (lvlA !== lvlB) return lvlA - lvlB;
  return a.price - b.price;
});

export function isBadgeUnlocked(badgeId: string, userData: any): boolean {
  if (!userData) return false;
  const level = userData.level || 1;
  
  // The badge item details from our calibrated list
  const badgeItem = STORE_ITEMS.find(i => i.id === badgeId);
  const requiredLevel = badgeItem?.minLevel || 6;
  
  // Strictly enforce required level along with the interaction challenge
  if (level < requiredLevel) return false;

  const commentsCount = userData.commentsCount || 0;
  const ratingsCount = userData.ratingsCount || 0;
  const streakDays = userData.streakDays || 0;
  const aiGamesPoints = userData.aiGamesPoints || 0;
  const likesReceived = userData.likesReceived || 0;
  const approvedRecommendationsCount = userData.approvedRecommendationsCount || 0;
  const completedAnimeCount = userData.completedAnimeCount || 0;
  const totalEpisodesWatched = userData.totalEpisodesWatched || 0;
  const listCount = userData.listCount || 0;

  switch (badgeId) {
    case 'badge_common_1':
      return commentsCount >= 1;
    case 'badge_good_1':
      return ratingsCount >= 1 || listCount >= 3;
    case 'badge_1':
      return commentsCount >= 5;
    case 'badge_2':
      return streakDays >= 7;
    case 'badge_3':
      return aiGamesPoints >= 100;
    case 'badge_5':
      return commentsCount >= 15;
    case 'badge_4':
      return likesReceived >= 3 || approvedRecommendationsCount >= 1;
    case 'badge_6':
      return completedAnimeCount >= 5 || totalEpisodesWatched >= 40;
    default:
      return true;
  }
}

export function getBadgeRequirementDesc(badgeId: string): string {
  const badgeItem = STORE_ITEMS.find(i => i.id === badgeId);
  const requiredLevel = badgeItem?.minLevel || 6;
  
  const baseDesc = (() => {
    switch (badgeId) {
      case 'badge_common_1':
        return "كتابة تعليق واحد على الأقل";
      case 'badge_good_1':
        return "إرسال تقييم واحد فما فوق، أو وجود 3 عناصر بالكلية في قائمتك";
      case 'badge_1':
        return "نشر 5 تعليقات أو ردود نقاشية حية بالأنمي";
      case 'badge_2':
        return "تحقيق سلسلة دخول يومية متتالية لـ 7 أيام بلا انقطاع";
      case 'badge_3':
        return "احراز حظوة 100 نقطة فما فوق في ساحات ألعاب الذكاء الاصطناعي";
      case 'badge_5':
        return "كتابة ما لا يقل عن 15 تعليقاً فاعلاً ومنظماً";
      case 'badge_4':
        return "تلقي 3 إعجابات تفاعل، أو قبول توصية فريدة لك من قبل المشرفين";
      case 'badge_6':
        return "إنهاء مشاهدة 5 أنميات، أو تخطي 40 حلقة";
      default:
        return "تتطلب تفاعلاً مستمراً وإثبات جدارة في مجمع الأوتوكو";
    }
  })();
  
  return `${baseDesc} (يتطلب أيضاً مستوى ${requiredLevel})`;
}

export function isTitleUnlocked(item: StoreItem, userData: any): boolean {
  if (!userData) return false;
  const level = userData.level || 1;
  return level >= (item.minLevel || 1);
}
