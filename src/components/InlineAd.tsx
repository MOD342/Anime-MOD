import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ExternalLink, Tv } from 'lucide-react';
import AdScriptRunner from './AdScriptRunner';

interface InlineAdProps {
  location?: string;
}

export default function InlineAd({ location = 'general' }: InlineAdProps) {
  const [monetization, setMonetization] = useState<any>({
    mode: 'simulation',
    directLinkUrl: 'https://www.effectivecpmnetwork.com/pt97wb2w?key=f76147a23264a74437b153780898337a',
    scriptCode: '',
    stayTime: 12,
    rewardCoins: 25
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonetization = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'globalSettings', 'monetization'));
        if (docSnap.exists()) {
          setMonetization(docSnap.data());
        }
      } catch (e) {
        console.warn("Could not load inline ad settings, using defaults:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMonetization();
  }, []);

  if (loading) return null;

  if (monetization.mode === 'direct_link') {
    return (
      <div className="mx-4 md:mx-8 p-4 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-purple-500/10 border border-yellow-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-right my-2" id={`inline_ad_direct_${location}`}>
        <div className="space-y-1">
          <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-yellow-500/15">
            🔗 مساهمة إعلانية ممولة داخل التطبيق
          </span>
          <h4 className="text-white text-xs font-black">احصل على كوينز مجانية لدعم خوادم البث المباشر!</h4>
          <p className="text-[10px] text-zinc-400">اضغط على رابط شريكنا الممول لضمان مواصلة تشغيل الموقع مجاناً.</p>
        </div>
        <a
          href={monetization.directLinkUrl}
          target="_blank"
          rel="noopener"
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg select-none cursor-pointer"
        >
          <ExternalLink size={12} />
          <span>تصفح العرض الترويجي 🚀</span>
        </a>
      </div>
    );
  }

  if (monetization.mode === 'script' && monetization.scriptCode) {
    return (
      <div className="mx-4 md:mx-8 p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col items-center justify-center my-2 text-center" id={`inline_ad_script_${location}`}>
        <span className="text-[8px] text-zinc-500 block mb-2 font-bold tracking-wider uppercase">— إعلان ممول داخل التطبيق —</span>
        <AdScriptRunner scriptCode={monetization.scriptCode} />
      </div>
    );
  }

  // Fallback / simulation ad
  return (
    <div className="mx-4 md:mx-8 p-4 bg-gradient-to-r from-purple-950/20 to-neutral-950 border border-neutral-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-right my-2" id={`inline_ad_sim_${location}`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-yellow-500/10 text-yellow-400 rounded-xl shrink-0">
          <Tv size={18} />
        </div>
        <div className="space-y-1">
          <span className="text-yellow-400 text-[9px] font-black block">أنمي فيرس - شريك مالي</span>
          <h4 className="text-white text-xs font-black">تسوق أفضل أكواب ومجسمات الأسطورة لوفي وزورو بخصم 25%!</h4>
          <p className="text-[9px] text-zinc-400">استخدم الرمز الترويجي <strong className="text-purple-400">OTAKU25</strong> عند الدفع بالمتجر الإلكتروني الرائد.</p>
        </div>
      </div>
      <button
        onClick={() => {
          // Open mock ad/site or Support page
          window.location.hash = '#support';
        }}
        className="bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-bold text-xs px-3.5 py-1.5 rounded-lg transition text-center select-none cursor-pointer"
      >
        بوابة المساعدة والدعم
      </button>
    </div>
  );
}
