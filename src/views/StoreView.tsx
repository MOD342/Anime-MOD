import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  ArrowRight, Check, RefreshCw, Trophy, Crown, Coins, Bookmark, Lock, Sparkles, Shield, Star, Award
} from 'lucide-react';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  STORE_ITEMS_SORTED, 
  StoreItem, 
  getAvatarShapeClass,
  isBadgeUnlocked,
  getBadgeRequirementDesc,
  isTitleUnlocked
} from '../data/storeItems';

interface StoreViewProps {
  onBack: () => void;
}

type MainTab = 'avatar' | 'banner' | 'frame' | 'inventory';

// Standardized highly-crafted geometric avatar frame component
const GeometricAvatar = ({ 
  avatarUrl, 
  frame, 
  size = 'w-16 h-16' 
}: { 
  avatarUrl: string, 
  frame?: StoreItem | null, 
  size?: string 
}) => {
  const shapeClass = getAvatarShapeClass(frame?.avatarShape);
  
  if (!frame) {
    return (
      <div className={`${size} rounded-full overflow-hidden border-2 border-neutral-800 bg-neutral-950 shadow-inner`}>
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }

  const isClipPathShape = ['hexagon', 'octagon', 'triangle', 'rhombus'].includes(frame.avatarShape || '');

  if (isClipPathShape) {
    return (
      <div className={`relative ${size} flex items-center justify-center select-none`}>
        {/* Outer geometric shape wrapper displaying the style */}
        <div className={`absolute inset-0 ${shapeClass} ${frame.frameStyle || 'bg-purple-500'} flex items-center justify-center p-[3px] shadow-lg`}>
          {/* Internal spacer mask */}
          <div className={`w-full h-full ${shapeClass} bg-black p-[2px]`}>
            {/* Inner avatar image */}
            <div className={`w-full h-full ${shapeClass} overflow-hidden bg-neutral-950`}>
              <img 
                src={avatarUrl} 
                alt="" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Double-ringed frame for standard circles, squares and squircles
  return (
    <div className={`relative ${size} flex items-center justify-center select-none`}>
      <div className={`w-full h-full ${shapeClass} overflow-hidden border-2 border-black relative bg-neutral-950 shadow-md`}>
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      {/* Absolute frame overlay ring */}
      <div className={`absolute inset-[-3.5px] ${shapeClass} pointer-events-none ring-[3px] ring-offset-1 ring-offset-black ${frame.frameStyle}`} />
    </div>
  );
};

export default function StoreView({ onBack }: StoreViewProps) {
  const { user, userData } = useAuth();
  
  const coins = userData?.coins || 0;
  const userLevel = userData?.level || 1;
  const purchasedItems = userData?.purchasedItems || [];

  // Active equips
  const equippedBannerId = userData?.equippedBanner || null;
  const equippedAvatarId = userData?.equippedAvatar || null;
  const equippedFrameId = userData?.equippedFrame || null;
  const equippedTitleId = userData?.equippedTitle || null;
  const equippedBadgeId = userData?.equippedBadge || null;

  const [activeTab, setActiveTab] = useState<MainTab>('avatar');
  const [inventorySubTab, setInventorySubTab] = useState<'avatar' | 'banner' | 'frame' | 'title' | 'badge'>('avatar');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const isPurchasingRef = useRef(false);

  // Live element preview config (shows simulated changes immediately)
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);

  // Helper check ownership or dynamic qualification
  const isItemOwnedOrUnlocked = useCallback((item: StoreItem): boolean => {
    if (item.type === 'title') {
      return isTitleUnlocked(item, userData);
    }
    if (item.type === 'badge') {
      return isBadgeUnlocked(item.id, userData);
    }
    return purchasedItems.includes(item.id);
  }, [userData, purchasedItems]);

  // Master lists filtered accurately per main tabs
  const filteredItems = useMemo(() => {
    let baseList = [...STORE_ITEMS_SORTED];

    if (activeTab === 'avatar') {
      baseList = baseList.filter(i => i.type === 'avatar');
    } else if (activeTab === 'banner') {
      baseList = baseList.filter(i => i.type === 'banner');
    } else if (activeTab === 'frame') {
      baseList = baseList.filter(i => i.type === 'frame');
    } else if (activeTab === 'inventory') {
      if (inventorySubTab === 'avatar') {
        baseList = baseList.filter(i => i.type === 'avatar' && isItemOwnedOrUnlocked(i));
      } else if (inventorySubTab === 'banner') {
        baseList = baseList.filter(i => i.type === 'banner' && isItemOwnedOrUnlocked(i));
      } else if (inventorySubTab === 'frame') {
        baseList = baseList.filter(i => i.type === 'frame' && isItemOwnedOrUnlocked(i));
      } else if (inventorySubTab === 'title') {
        baseList = baseList.filter(i => i.type === 'title' && isItemOwnedOrUnlocked(i));
      } else if (inventorySubTab === 'badge') {
        baseList = baseList.filter(i => i.type === 'badge' && isItemOwnedOrUnlocked(i));
      }
    }

    // Sort by minLevel, then price
    return baseList.sort((a, b) => {
      const levelA = a.minLevel || 1;
      const levelB = b.minLevel || 1;
      if (levelA !== levelB) return levelA - levelB;
      return a.price - b.price;
    });
  }, [activeTab, inventorySubTab, userData, purchasedItems, isItemOwnedOrUnlocked]);

  // Read-only dynamic lists of ALL Honors (Titles & Badges) to showcase earned conditions
  const allHonorsList = useMemo(() => {
    return STORE_ITEMS_SORTED.filter(i => i.type === 'title' || i.type === 'badge');
  }, []);

  // Preview Plaque calculations
  const previewData = useMemo(() => {
    const mockBanner = previewItem?.type === 'banner' ? previewItem : STORE_ITEMS_SORTED.find(i => i.id === equippedBannerId) || null;
    const mockAvatar = previewItem?.type === 'avatar' ? previewItem : STORE_ITEMS_SORTED.find(i => i.id === equippedAvatarId) || null;
    const mockFrame = previewItem?.type === 'frame' ? previewItem : STORE_ITEMS_SORTED.find(i => i.id === equippedFrameId) || null;
    const mockTitle = previewItem?.type === 'title' ? previewItem : STORE_ITEMS_SORTED.find(i => i.id === equippedTitleId) || null;
    const mockBadge = previewItem?.type === 'badge' ? previewItem : STORE_ITEMS_SORTED.find(i => i.id === equippedBadgeId) || null;

    return {
      bannerUrl: mockBanner?.img || '',
      avatarUrl: mockAvatar?.img || userData?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      bannerObj: mockBanner,
      avatarObj: mockAvatar,
      frameObj: mockFrame,
      titleObj: mockTitle,
      badgeObj: mockBadge
    };
  }, [previewItem, equippedBannerId, equippedAvatarId, equippedFrameId, equippedTitleId, equippedBadgeId, userData]);

  // Purchase handler for premium items
  const handlePurchase = async (item: StoreItem) => {
    if (!user || coins < item.price || purchasedItems.includes(item.id) || isPurchasingRef.current) return;
    if (item.minLevel && userLevel < item.minLevel) return;

    try {
      isPurchasingRef.current = true;
      setPurchasing(item.id);
      
      await updateDoc(doc(db, 'users', user.id), {
        coins: increment(-item.price),
        purchasedItems: arrayUnion(item.id)
      });
      
      setPreviewItem(item);
    } catch (e) {
      console.error('Failed to buy item:', e);
    } finally {
      isPurchasingRef.current = false;
      setPurchasing(null);
    }
  };

  // Toggle Equip triggers
  const handleEquipToggle = async (item: StoreItem, forceUnequip = false) => {
    if (!user) return;
    if (!isItemOwnedOrUnlocked(item) && !forceUnequip) return; 

    const key = item.type === 'banner' ? 'equippedBanner' :
                item.type === 'avatar' ? 'equippedAvatar' :
                item.type === 'frame' ? 'equippedFrame' :
                item.type === 'title' ? 'equippedTitle' :
                item.type === 'badge' ? 'equippedBadge' : null;
    if (!key) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        [key]: forceUnequip ? null : item.id
      });
      if (previewItem?.id === item.id && forceUnequip) {
        setPreviewItem(null);
      }
    } catch (err) {
      console.error('Failed toggling item equip:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-36 font-sans text-right select-none max-w-xl mx-auto border-x border-neutral-900 relative shadow-[0_0_50px_rgba(0,0,0,0.8)]" dir="rtl">
      
      {/* Dynamic Ambient Blur background */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-purple-900/10 via-rose-900/5 to-transparent blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="p-4 space-y-6 relative z-10">

        {/* Premium Integrated Header and Level status */}
        <div className="flex items-center justify-between gap-4 bg-zinc-950/40 p-4 border border-neutral-900 rounded-2xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl transition cursor-pointer active:scale-95"
              title="رجوع"
              aria-label="رجوع"
            >
              <ArrowRight size={18} />
            </button>
            <div>
              <h1 className="text-white font-black text-lg bg-gradient-to-l from-yellow-500 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                المتجر
              </h1>
              <span className="text-[9px] text-neutral-500 block leading-tight">تخصيص الهوية والتميز في مجتمع الأوتاكو</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-purple-950/40 border border-purple-500/20 px-3 py-1.5 rounded-xl text-purple-400 text-xs font-black font-mono">
              LV: {userLevel}
            </div>
            <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl text-yellow-500 text-xs font-black font-mono">
              <Coins size={12} className="text-yellow-500 animate-pulse" />
              <span>{coins}</span>
            </div>
          </div>
        </div>

        {/* PROFILE PREVIEW PLAQUE */}
        <section className="relative group bg-[#050508] border border-neutral-900 rounded-2xl p-4 overflow-hidden shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] uppercase font-black text-purple-400 tracking-wider flex items-center gap-1">
              <span className="animate-spin text-purple-500">✨</span>
              لوحة المحاكاة والمعاينة المباشرة
            </span>
            {previewItem && (
              <button 
                onClick={() => setPreviewItem(null)}
                className="text-[9px] text-[#aaaaaa] hover:text-white bg-neutral-950 border border-neutral-900 px-2 py-0.5 rounded transition"
              >
                مسح المعاينة ✕
              </button>
            )}
          </div>

          <div className="h-32 rounded-xl overflow-hidden relative border border-neutral-900 bg-black shadow-inner">
            {previewData.bannerUrl ? (
              <div 
                className={`absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-500 ${previewData.bannerObj?.imageStyle || ''}`}
                style={{ backgroundImage: `url(${previewData.bannerUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 opacity-40" />
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 z-10" />
            
            {/* Equipping avatar preview block */}
            <div className="absolute bottom-3 right-4 flex items-center gap-3.5 z-20">
              <GeometricAvatar 
                avatarUrl={previewData.avatarUrl} 
                frame={previewData.frameObj} 
                size="w-14 h-14" 
              />
              
              <div className="text-right space-y-0.5">
                <h3 className={`text-xs font-black tracking-tight flex items-center gap-1 ${previewData.titleObj ? previewData.titleObj.color : 'text-white'}`}>
                  <span>{userData?.displayName || 'العضو النبيل'}</span>
                  {previewData.titleObj && previewData.titleObj.icon && <previewData.titleObj.icon size={11} className="inline-block" />}
                </h3>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-neutral-400 font-bold font-mono">@{userData?.username || 'otaku_core'}</span>
                  <span className="text-[8px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1 rounded font-mono font-black">Lvl {userLevel}</span>
                </div>
              </div>
            </div>

            {/* Award badge displays */}
            {previewData.badgeObj && (
              <div className="absolute bottom-3 left-4 bg-black/75 border border-amber-500/20 px-2 py-0.5 rounded-lg z-20 flex items-center gap-1.5 select-none shadow-lg">
                {previewData.badgeObj.icon && React.createElement(previewData.badgeObj.icon, { size: 10, className: previewData.badgeObj.color })}
                <span className={`text-[8px] font-black ${previewData.badgeObj.color}`}>{previewData.badgeObj.name}</span>
              </div>
            )}
          </div>
        </section>

        {/* Dynamic categories / tabs strictly matching instructions (Avatar, Banner, Frame, Inventory/Bag) */}
        <section className="bg-neutral-950 p-1 rounded-2xl border border-neutral-900 grid grid-cols-4 gap-1.5">
          {[
            { id: 'avatar', label: 'صورة الحساب', emoji: '👤' },
            { id: 'banner', label: 'غلاف', emoji: '🌌' },
            { id: 'frame', label: 'إطار', emoji: '🖼️' },
            { id: 'inventory', label: 'الحقيبة', emoji: '🎒' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as MainTab);
                  setPreviewItem(null);
                }}
                className={`py-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isActive 
                    ? 'bg-neutral-900 border border-neutral-800 text-white shadow-lg shadow-black/40' 
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-950/50'
                }`}
              >
                <span className="text-sm md:text-base leading-none">{tab.emoji}</span>
                <span className="text-[9px] font-black">{tab.label}</span>
              </button>
            );
          })}
        </section>

        {/* Master Listings Area */}
        <div className="space-y-6">
          
          {userLevel < 5 && activeTab !== 'inventory' ? (
            <div className="p-8 text-center border border-neutral-900 rounded-3xl bg-zinc-950/60 backdrop-blur-md space-y-6 animate-fadeIn py-12">
              <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)] animate-pulse">
                <Lock size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-white text-base font-black">متجر الأوتاكو الفاخر مغلق</h3>
                <p className="text-neutral-400 text-[10.5px] leading-relaxed max-w-sm mx-auto">
                  يفتح المتجر رسمياً عند بلوغ <span className="text-amber-400 font-bold">المستوى 5</span>. مستواك الحالي هو <span className="font-mono text-xs bg-neutral-900 px-1.5 py-0.5 rounded text-white">{userLevel}</span> ولديك متبقٍّ <span className="font-bold text-white">{5 - userLevel} مستويات</span> للوصول للقمة وتخصيص حسابك بكل فخامة.
                </p>
              </div>

              {/* Progress Bar indicator */}
              <div className="max-w-[12rem] mx-auto space-y-1">
                <div className="w-full bg-neutral-900 border border-neutral-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-l from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (userLevel / 5) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-neutral-500">
                  <span>المستوى {userLevel}</span>
                  <span>المستوى 5 🗝️</span>
                </div>
              </div>

              <div className="border-t border-neutral-900 pt-6 space-y-4">
                <div className="text-neutral-400 text-[9.5px] font-bold">
                  🎁 استكشف مقتنيات الترحيب المنتظرة عند مستوى 5:
                </div>
                
                {/* Visual rendering of Levi & Frame preview */}
                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                  
                  {/* Item 1: Levi */}
                  <div className="bg-neutral-900/40 p-3 rounded-2xl border border-neutral-900 flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 rounded-full border border-neutral-800 overflow-hidden">
                      <img 
                        src="https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png" 
                        className="w-full h-full object-cover" 
                        alt="" 
                      />
                    </div>
                    <span className="text-[9px] text-white font-black">Levi Ackerman</span>
                    <span className="text-[8px] text-yellow-500 font-bold">250 كوينز</span>
                  </div>

                  {/* Item 2: Frame */}
                  <div className="bg-neutral-900/40 p-3 rounded-2xl border border-neutral-900 flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 rounded-full border-2 border-amber-800 bg-neutral-950 flex items-center justify-center text-amber-800">
                      🪵
                    </div>
                    <span className="text-[9px] text-white font-black">إطار الخشب البسيط</span>
                    <span className="text-[8px] text-yellow-500 font-bold">260 كوينز</span>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <>
              {/* AVATAR IMAGES TAB */}
              {activeTab === 'avatar' && (
                <div className="space-y-3 animate-fadeIn">
                  <h2 className="text-xs text-neutral-400 font-extrabold flex items-center gap-1">
                    <span>👤 صور الحساب الشخصية الفاخرة</span>
                  </h2>
    
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredItems.map((item) => {
                      const isOwnedOrUnlocked = isItemOwnedOrUnlocked(item);
                      const levelLock = item.minLevel && userLevel < item.minLevel;
                      const isEquipped = equippedAvatarId === item.id;
    
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setPreviewItem(item)}
                          className="aspect-square bg-neutral-950 border border-neutral-900 rounded-[1.75rem] overflow-hidden relative group cursor-pointer transition hover:border-neutral-700 shadow-xl flex flex-col justify-end"
                        >
                      <img 
                        src={item.img} 
                        className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                        alt={item.name}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/25 z-10" />

                      {/* Level lock badge (Top Right) */}
                      <div className="absolute top-2.5 right-2.5 z-20">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full backdrop-blur-md ${
                          levelLock ? 'bg-rose-950/90 text-rose-400 border border-rose-900/40' : 'bg-black/60 text-emerald-400 border border-emerald-900/20'
                        }`}>
                          LV {item.minLevel || 1}
                        </span>
                      </div>

                      {/* Equipped Check (Top Left) */}
                      {isEquipped && (
                        <div className="absolute top-2.5 left-2.5 z-20 bg-emerald-500 text-black p-0.5 rounded-full shadow animate-pulse">
                          <Check size={8} className="stroke-[4px]" />
                        </div>
                      )}

                      {/* Overlaid controls - Description completely removed */}
                      <div className="absolute bottom-2.5 inset-x-2.5 text-right z-20 space-y-1.5">
                        <h4 className="text-[10px] font-black text-white leading-tight truncate px-1">{item.name}</h4>

                        <div className="pt-1.5 border-t border-white/5">
                          {isOwnedOrUnlocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipToggle(item, isEquipped);
                              }}
                              className={`w-full py-1 rounded-xl text-[8.5px] font-black cursor-pointer transition ${
                                isEquipped 
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-white text-black hover:bg-neutral-200 font-black'
                              }`}
                            >
                              {isEquipped ? 'إلغاء التجهيز' : 'تجهيز المظهر'}
                            </button>
                          ) : (
                            <button
                              disabled={coins < item.price || levelLock || purchasing !== null}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurchase(item);
                              }}
                              className={`w-full py-1 rounded-xl text-[8.5px] font-black transition cursor-pointer flex items-center justify-center gap-0.5 ${
                                coins >= item.price && !levelLock
                                  ? 'bg-yellow-500 text-black hover:bg-yellow-400 font-black'
                                  : 'bg-neutral-900 text-neutral-500 cursor-not-allowed'
                              }`}
                            >
                              {purchasing === item.id ? (
                                <RefreshCw size={8} className="animate-spin" />
                              ) : (
                                <>
                                  <span>شراء بـ</span>
                                  <span className="font-mono">{item.price}🪙</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COVERS / BANNERS TAB - Horizontal layout: image with name overlay, opposite to action button */}
          {activeTab === 'banner' && (
            <div className="space-y-3 animate-fadeIn">
              <h2 className="text-xs text-neutral-400 font-extrabold flex items-center gap-1">
                <span>🌌 أغلفة الملف الشخصي الحيوية</span>
              </h2>

              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const isOwnedOrUnlocked = isItemOwnedOrUnlocked(item);
                  const levelLock = item.minLevel && userLevel < item.minLevel;
                  const isEquipped = equippedBannerId === item.id;

                  return (
                    <div 
                      key={item.id}
                      onClick={() => setPreviewItem(item)}
                      className="h-32 sm:h-36 w-full rounded-2xl overflow-hidden border border-neutral-900 bg-neutral-950 relative group cursor-pointer transition hover:border-neutral-700 shadow-xl"
                    >
                      {/* Image underlay covering full card */}
                      <img 
                        src={item.img} 
                        className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                        alt={item.name} 
                        referrerPolicy="no-referrer"
                      />
                      {/* Deep gradient fade for name & action button legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 z-10" />

                      {/* Level lock badge (Top Right) */}
                      <div className="absolute top-3 right-3 z-20">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full backdrop-blur-md ${
                          levelLock ? 'bg-rose-950/90 text-rose-400 border border-rose-900/40' : 'bg-black/60 text-emerald-400 border border-emerald-950/20'
                        }`}>
                          LV {item.minLevel || 1}
                        </span>
                      </div>

                      {/* Equipped Check (Top Left) */}
                      {isEquipped && (
                        <div className="absolute top-3 left-3 z-20 bg-emerald-500 text-black p-0.5 rounded-full shadow animate-pulse">
                          <Check size={8} className="stroke-[4px]" />
                        </div>
                      )}

                      {/* Bottom row: Name on the right, buy/equip on the left */}
                      <div className="absolute bottom-3 inset-x-3.5 flex items-end justify-between gap-4 z-20">
                        {/* Right: Name */}
                        <div className="text-right">
                          <h4 className="text-[11px] font-black text-white drop-shadow-md leading-none">{item.name}</h4>
                        </div>

                        {/* Left: Action button */}
                        <div>
                          {isOwnedOrUnlocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipToggle(item, isEquipped);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black cursor-pointer transition ${
                                isEquipped 
                                  ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-white text-black hover:bg-neutral-200'
                              }`}
                            >
                              {isEquipped ? 'إلغاء التجهيز' : 'تجهيز'}
                            </button>
                          ) : (
                            <button
                              disabled={coins < item.price || levelLock || purchasing !== null}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurchase(item);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black transition cursor-pointer flex items-center gap-0.5 ${
                                coins >= item.price && !levelLock
                                  ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                                  : 'bg-neutral-900 text-neutral-500 cursor-not-allowed border border-neutral-900/50'
                              }`}
                            >
                              {purchasing === item.id ? (
                                <RefreshCw size={8} className="animate-spin text-black" />
                              ) : (
                                <>
                                  <span>شراء بـ</span>
                                  <span className="font-mono">{item.price}🪙</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GEOMETRIC FRAMES TAB - Impeccably crafted frames layout */}
          {activeTab === 'frame' && (
            <div className="space-y-3 animate-fadeIn">
              <h2 className="text-xs text-neutral-400 font-extrabold flex items-center gap-1">
                <span>🖼️ إطارات هندسية متقنة الصنع</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const isOwnedOrUnlocked = isItemOwnedOrUnlocked(item);
                  const levelLock = item.minLevel && userLevel < item.minLevel;
                  const isEquipped = equippedFrameId === item.id;

                  // Name of geometric structure localized
                  const shapeNames: Record<string, string> = {
                    circle: "دائري",
                    square: "مربع",
                    squircle: "منحني",
                    hexagon: "سداسي",
                    octagon: "ثماني",
                    triangle: "ثلاثي",
                    rhombus: "معين"
                  };

                  return (
                    <div 
                      key={item.id}
                      onClick={() => setPreviewItem(item)}
                      className="bg-neutral-950 border border-neutral-900 rounded-[1.75rem] p-3 flex flex-col justify-between relative group cursor-pointer transition hover:border-neutral-700 shadow-xl min-h-[178px]"
                    >
                      {/* Level requirement badge */}
                      <div className="absolute top-2 right-2 z-10">
                        <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded-full ${
                          levelLock ? 'bg-rose-950/90 text-rose-400 border border-rose-900/40' : 'bg-black/60 text-emerald-400 border border-emerald-950/30'
                        }`}>
                          LV {item.minLevel || 1}
                        </span>
                      </div>

                      {/* Shape marker */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className="text-[7.5px] bg-purple-950/40 text-purple-400 px-1 py-0.2 rounded font-black font-sans">
                          {shapeNames[item.avatarShape || ''] || 'دائري'}
                        </span>
                      </div>

                      {/* Display frame in the center */}
                      <div className="flex-1 flex items-center justify-center py-4 select-none">
                        <GeometricAvatar 
                          avatarUrl={userData?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky"} 
                          frame={item} 
                          size="w-14 h-14" 
                        />
                      </div>

                      {/* Frame Name */}
                      <div className="text-center px-1">
                        <h4 className="text-[9.5px] font-black text-white truncate">{item.name}</h4>
                      </div>

                      {/* Equip / Buy Actions */}
                      <div className="pt-2 border-t border-white/5 mt-2">
                        {isOwnedOrUnlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEquipToggle(item, isEquipped);
                            }}
                            className={`w-full py-1.5 rounded-xl text-[8.5px] font-black cursor-pointer transition ${
                              isEquipped 
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-white text-black hover:bg-neutral-200'
                            }`}
                          >
                            {isEquipped ? 'إلغاء التجهيز' : 'تجهيز'}
                          </button>
                        ) : (
                          <button
                            disabled={coins < item.price || levelLock || purchasing !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePurchase(item);
                            }}
                            className={`w-full py-1.5 rounded-xl text-[8px] font-black transition cursor-pointer flex items-center justify-center gap-0.5 ${
                              coins >= item.price && !levelLock
                                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                                : 'bg-neutral-900 text-neutral-500 cursor-not-allowed border border-neutral-900/50'
                            }`}
                          >
                            {purchasing === item.id ? (
                              <RefreshCw size={8} className="animate-spin text-black" />
                            ) : (
                              <>
                                <span>بـ</span>
                                <span className="font-mono">{item.price}🪙</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
            </>
          )}

          {/* INVENTORY / BAG & EARNED REWARDS TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Owned profile decors */}
              <div className="space-y-4">
                <h3 className="text-xs text-neutral-400 font-extrabold flex items-center gap-1 justify-between">
                  <span>🎒 حقيبتك الخاصة - العناصر الممتلكة</span>
                  <span className="text-[9px] text-neutral-600 bg-neutral-950 px-2 py-0.5 rounded-full border border-neutral-900/60">
                    {filteredItems.length} عنصر
                  </span>
                </h3>

                {/* Sub tab selector pills */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 select-none border-b border-neutral-900/40" dir="rtl">
                  {[
                    { id: 'avatar', label: '👤 صور الحساب' },
                    { id: 'banner', label: '🌌 الغلاف' },
                    { id: 'frame', label: '🖼️ الاطارات' },
                    { id: 'title', label: '👑 الالقاب' },
                    { id: 'badge', label: '🏅 الشارات' }
                  ].map((sub) => {
                    const isSubActive = inventorySubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setInventorySubTab(sub.id as any)}
                        className={`px-3 py-1.5 text-[9px] font-black rounded-xl border transition cursor-pointer flex-1 text-center whitespace-nowrap ${
                          isSubActive
                            ? 'bg-purple-950/40 text-purple-400 border-purple-500/30'
                            : 'bg-neutral-950/60 border-neutral-900 text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Content Display with Grid layouts except Banners */}
                
                {/* 1. Avatars sub-tab (Grid) */}
                {inventorySubTab === 'avatar' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {filteredItems.map((item) => {
                      const isEquipped = equippedAvatarId === item.id;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setPreviewItem(item)}
                          className="aspect-square bg-neutral-950 border border-neutral-900 rounded-[1.75rem] overflow-hidden relative group cursor-pointer transition hover:border-neutral-700 shadow-xl flex flex-col justify-end"
                        >
                          <img 
                            src={item.img} 
                            className="absolute inset-0 w-full h-full object-cover" 
                            alt="" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 z-10" />
                          
                          {/* Equipped Check */}
                          {isEquipped && (
                            <div className="absolute top-2 left-2 z-20 bg-emerald-500 text-black p-0.5 rounded-full shadow animate-pulse">
                              <Check size={8} className="stroke-[4px]" />
                            </div>
                          )}

                          <div className="absolute bottom-2.5 inset-x-2.5 text-right z-20 space-y-1">
                            <h4 className="text-[9.5px] font-black text-white truncate px-1">{item.name}</h4>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipToggle(item, isEquipped);
                              }}
                              className={`w-full py-1 rounded-xl text-[8.5px] font-black cursor-pointer transition ${
                                isEquipped ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20' : 'bg-white text-black hover:bg-neutral-200'
                              }`}
                            >
                              {isEquipped ? 'إلغاء التجهيز' : 'تجهيز المظهر'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Banners sub-tab (NOT A GRID - Stack of full height banners) */}
                {inventorySubTab === 'banner' && (
                  <div className="space-y-4">
                    {filteredItems.map((item) => {
                      const isEquipped = equippedBannerId === item.id;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setPreviewItem(item)}
                          className="h-32 sm:h-36 w-full rounded-2xl overflow-hidden border border-neutral-900 bg-neutral-950 relative group cursor-pointer transition hover:border-neutral-700 shadow-xl"
                        >
                          <img 
                            src={item.img} 
                            className="absolute inset-0 w-full h-full object-cover" 
                            alt="" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 z-10" />

                          {/* Equipped Check */}
                          {isEquipped && (
                            <div className="absolute top-3 left-3 z-20 bg-emerald-500 text-black p-0.5 rounded-full shadow animate-pulse">
                              <Check size={8} className="stroke-[4px]" />
                            </div>
                          )}

                          <div className="absolute bottom-3 inset-x-3.5 flex items-end justify-between gap-4 z-20">
                            <div className="text-right">
                              <h4 className="text-[11px] font-black text-white drop-shadow-md leading-none">{item.name}</h4>
                            </div>
                            <div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEquipToggle(item, isEquipped);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black cursor-pointer transition ${
                                  isEquipped 
                                    ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-white text-black hover:bg-neutral-200'
                                }`}
                              >
                                {isEquipped ? 'إلغاء التجهيز' : 'تجهيز'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Frames sub-tab (Grid with GeometricAvatar previews) */}
                {inventorySubTab === 'frame' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {filteredItems.map((item) => {
                      const isEquipped = equippedFrameId === item.id;

                      const shapeNames: Record<string, string> = {
                        circle: "دائري",
                        square: "مربع",
                        squircle: "منحني",
                        hexagon: "سداسي",
                        octagon: "ثماني",
                        triangle: "ثلاثي",
                        rhombus: "معين"
                      };

                      return (
                        <div 
                          key={item.id}
                          onClick={() => setPreviewItem(item)}
                          className="bg-neutral-950 border border-neutral-900 rounded-[1.75rem] p-3 flex flex-col justify-between relative group cursor-pointer transition hover:border-neutral-700 shadow-xl min-h-[178px]"
                        >
                          <div className="absolute top-2 left-2 z-10">
                            <span className="text-[7.5px] bg-purple-950/40 text-purple-400 px-1 py-0.2 rounded font-black font-sans">
                              {shapeNames[item.avatarShape || ''] || 'دائري'}
                            </span>
                          </div>

                          <div className="flex-1 flex items-center justify-center py-4 select-none">
                            <GeometricAvatar 
                              avatarUrl={userData?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky"} 
                              frame={item} 
                              size="w-14 h-14" 
                            />
                          </div>

                          <div className="text-center px-1">
                            <h4 className="text-[9.5px] font-black text-white truncate">{item.name}</h4>
                          </div>

                          <div className="pt-2 border-t border-white/5 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipToggle(item, isEquipped);
                              }}
                              className={`w-full py-1.5 rounded-xl text-[8.5px] font-black cursor-pointer transition ${
                                isEquipped 
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-white text-black hover:bg-neutral-200'
                              }`}
                            >
                              {isEquipped ? 'إلغاء التجهيز' : 'تجهيز'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Titles sub-tab (Grid) */}
                {inventorySubTab === 'title' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredItems.map((item) => {
                      const isEquipped = equippedTitleId === item.id;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setPreviewItem(item)}
                          className="p-3 bg-neutral-950 border border-neutral-900 rounded-2xl flex flex-col justify-between relative group cursor-pointer transition hover:border-neutral-700 min-h-[105px]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-black ${item.color || 'text-white'}`}>
                              {item.name}
                            </span>
                            <span className="text-[7px] bg-neutral-900 text-neutral-400 px-1.5 py-0.5 rounded font-extrabold font-mono">
                              LV {item.minLevel}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-white/5 mt-3 flex justify-between items-center">
                            <span className="text-[7.5px] text-zinc-500 font-extrabold">لقب فخري مستحق</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipToggle(item, isEquipped);
                              }}
                              className={`px-3 py-1 rounded-xl text-[8px] font-black cursor-pointer transition ${
                                isEquipped 
                                  ? 'bg-emerald-950/85 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-white text-black hover:bg-neutral-200'
                              }`}
                            >
                              {isEquipped ? 'إلغاء' : 'تجهيز'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5. Badges sub-tab (Grid) */}
                {inventorySubTab === 'badge' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {filteredItems.map((item) => {
                      const isEquipped = equippedBadgeId === item.id;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setPreviewItem(item)}
                          className="p-3 bg-neutral-950 border border-neutral-900 rounded-[1.75rem] flex flex-col justify-between relative group cursor-pointer transition hover:border-neutral-700 text-center min-h-[142px]"
                        >
                          <div className="flex-1 flex flex-col items-center justify-center p-2">
                            {item.icon && React.createElement(item.icon, { size: 18, className: item.color })}
                            <span className={`text-[9.5px] font-black mt-2 leading-tight ${item.color || 'text-white'}`}>
                              {item.name}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-white/5 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipToggle(item, isEquipped);
                              }}
                              className={`w-full py-1.5 rounded-xl text-[8.5px] font-black cursor-pointer transition ${
                                isEquipped 
                                  ? 'bg-emerald-950/85 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-white text-black hover:bg-neutral-200'
                              }`}
                            >
                              {isEquipped ? 'إلغاء التجهيز' : 'تجهيز'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty status message */}
                {filteredItems.length === 0 && (
                  <div className="p-8 text-center border border-neutral-900 rounded-2xl bg-neutral-950/60 text-[9.5px] text-neutral-500">
                    حقيبتك خالية من العناصر المستحقة أو المفتوحة في هذا التبويب حالياً.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
