import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { X, Clock, CheckCircle2, Tv, ExternalLink } from 'lucide-react';

interface AdPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardGranted?: (coins: number) => void;
}

export default function AdPopup({ isOpen, onClose, onRewardGranted }: AdPopupProps) {
  const { user } = useAuth();
  const [monetization, setMonetization] = useState<any>({
    mode: 'simulation',
    directLinkUrl: 'https://www.effectivecpmnetwork.com/pt97wb2w?key=f76147a23264a74437b153780898337a',
    scriptCode: '',
    stayTime: 12,
    rewardCoins: 25
  });
  const [countdown, setCountdown] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setFinished(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'globalSettings', 'monetization'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMonetization({
            mode: data.mode ?? 'simulation',
            directLinkUrl: data.directLinkUrl ?? 'https://www.effectivecpmnetwork.com/pt97wb2w?key=f76147a23264a74437b153780898337a',
            scriptCode: data.scriptCode ?? '',
            stayTime: data.stayTime ?? 12,
            rewardCoins: data.rewardCoins ?? 25
          });
          setCountdown(data.stayTime ?? 12);
        }
      } catch (err) {
        console.warn("Could not load popup ad configs:", err);
      }
      setIsPlaying(true);
    };

    fetchSettings();
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && isPlaying && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isOpen && isPlaying && countdown === 0) {
      handleComplete();
    }
    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, countdown]);

  const handleComplete = async () => {
    setIsPlaying(false);
    setFinished(true);
    
    const coinsReward = monetization.rewardCoins;
    const xpReward = 150;

    if (user?.id) {
      setIsSyncing(true);
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          coins: increment(coinsReward),
          xp: increment(xpReward)
        });
        if (onRewardGranted) {
          onRewardGranted(coinsReward);
        }
      } catch (err) {
        console.error("Failed to sync popup ad reward:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleOpenSmartLink = () => {
    window.open(monetization.directLinkUrl, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 font-sans text-right" dir="rtl" id="popup_ad_backdrop">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center"
          >
            {/* Header / Countdown */}
            <div className="w-full flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
              <span className="text-[10px] text-yellow-500 font-extrabold flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded-full animate-pulse">
                <Clock size={11} />
                <span>إعلان منبثق ممول لدعم المنصة</span>
              </span>
              
              {!finished ? (
                <div className="bg-[#FF1744]/10 text-[#FF1744] text-xs font-mono font-black border border-[#FF1744]/20 px-2.5 py-1 rounded-md">
                  انتظر {countdown}ث مجاناً
                </div>
              ) : (
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-lg transition select-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Ad Media Panel */}
            <div className="w-full py-4 min-h-[160px] flex flex-col justify-center items-center">
              {!finished ? (
                <div className="space-y-4 w-full">
                  {monetization.mode === 'direct_link' && (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto animate-bounce">
                        <Tv size={20} />
                      </div>
                      <h3 className="text-white text-sm font-black leading-relaxed">
                        جاري تهيئة العرض المباشر والتحقق من حساب المكافأة...
                      </h3>
                      <p className="text-[10px] text-zinc-400 leading-relaxed max-w-xs mx-auto">
                        يرجى تصفح موقع الشريك من الرواد لضمان تعويض نقاطك كاش تلقائياً بعد انتهاء العد في الخلفية.
                      </p>
                      <button
                        onClick={handleOpenSmartLink}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black py-2 px-5 rounded-xl text-[11px] transition inline-flex items-center gap-1.5 cursor-pointer selection:bg-transparent"
                      >
                        <ExternalLink size={12} />
                        <span>فتح الرابط الممول 🚀</span>
                      </button>
                    </div>
                  )}

                  {monetization.mode === 'script' && monetization.scriptCode && (
                    <div className="space-y-3 w-full pr-1 overflow-x-auto">
                      <div 
                        className="flex items-center justify-center min-h-[100px]"
                        dangerouslySetInnerHTML={{ __html: monetization.scriptCode }}
                      />
                      <p className="text-[8.5px] text-zinc-500 font-medium">تفاعل معنا في هذه المساحة لدعم ومؤازرة الموقع</p>
                    </div>
                  )}

                  {monetization.mode === 'simulation' && (
                    <div className="space-y-3">
                      <span className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-purple-500/20 inline-block">
                        متجر طوكιο للأنمي
                      </span>
                      <h3 className="text-white text-sm font-black leading-relaxed">
                        مجسمات ون بيس، دراغون بول، وبليتش الحصرية مع شحن مجاني سريع!
                      </h3>
                      <p className="text-[10px] text-zinc-400">جودة أصلية فاخرة 100% ورعاية خوادم البث.</p>
                      <img 
                        src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&auto=format&fit=crop" 
                        alt="Anime Sponsor" 
                        className="w-full max-h-[80px] object-cover rounded-xl mt-1 border border-neutral-800"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={30} />
                  </div>
                  <div>
                    <h3 className="text-emerald-400 font-black text-sm">✓ تم تأكيد استعراض الإعلان!</h3>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed max-w-xs mx-auto">
                      أضيفت لحسابك: <span className="text-yellow-400 font-black">+{monetization.rewardCoins} كوينز</span> ذهبية بنجاح لدعمك خوادم الأوبن لوف.
                    </p>
                  </div>
                  
                  {isSyncing && (
                    <span className="text-[9px] text-lime-400 animate-pulse font-bold block">جاري مزامنة قواعد البيانات السحابية...</span>
                  )}

                  <button
                    onClick={onClose}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-6 py-2 rounded-xl transition cursor-pointer select-none"
                  >
                    متابعة وبث الآن 📺
                  </button>
                </motion.div>
              )}
            </div>

            {/* Footer lock and feedback bar */}
            <div className="w-full mt-4 pt-3.5 border-t border-neutral-900 flex items-center justify-center gap-1 text-[9px] text-zinc-500 font-medium">
              <span>نشكر لك دعمك الراقي لاستقرار البث وسرعة النظريات ❤️</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
