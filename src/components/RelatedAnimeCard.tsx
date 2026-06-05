import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

const RELATION_TYPES_AR: Record<string, string> = {
  'sequel': 'تكملة',
  'prequel': 'قصة سابقة',
  'alternative setting': 'قصة بديلة',
  'alternative version': 'نسخة بديلة',
  'side story': 'قصة جانبية',
  'summary': 'ملخص',
  'full story': 'قصة كاملة',
  'parent story': 'القصة الرئيسية',
  'spin-off': 'عمل مشتق',
  'adaptation': 'اقتباس',
  'character': 'شخصية',
  'other': 'أخرى'
};

const TYPE_AR: Record<string, string> = {
  'manga': 'مانجا',
  'anime': 'أنمي',
  'novel': 'رواية',
  'light_novel': 'رواية خفيفة',
  'one_shot': 'ون شوت',
  'manhwa': 'مانهوا كورية',
  'manhua': 'مانهوا صينية'
};

export default function RelatedAnimeCard({ rel, onClick }: any) {
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    if (rel.mal_id) {
      fetch(`/api/anime/poster/${rel.mal_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.posterUrl) {
            setPoster(data.posterUrl);
          }
        })
        .catch(() => {});
    }
  }, [rel.mal_id]);

  const cleanRelation = rel.relation ? rel.relation.trim().toLowerCase() : '';
  const relationAr = RELATION_TYPES_AR[cleanRelation] || rel.relation || 'عمل مرتبط';

  const cleanType = rel.type ? rel.type.trim().toLowerCase() : '';
  const typeAr = TYPE_AR[cleanType] || rel.type || 'أنمي';

  return (
    <div 
      onClick={onClick}
      className="w-28 shrink-0 relative group cursor-pointer"
    >
      <div className="w-28 h-40 rounded-xl overflow-hidden bg-[#121212] border border-neutral-800 shadow-lg group-hover:border-blue-500 transition-colors flex flex-col relative">
        {poster ? (
          <img src={poster} alt={rel.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-2 bg-gradient-to-b from-neutral-800 to-[#121212]">
            <Play size={24} className="opacity-20 mb-2 text-white" />
          </div>
        )}
        
        {/* Name Overlay if we have poster */}
        {poster && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6">
            <span className="text-[10px] text-center text-white font-bold line-clamp-2 drop-shadow-md">{rel.name}</span>
          </div>
        )}

        {!poster && (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <span className="text-[10px] text-center text-neutral-200 font-bold line-clamp-3">{rel.name}</span>
          </div>
        )}
        
        {rel.type && rel.type !== 'anime' && (
          <div className="absolute top-1 left-1 bg-neutral-900/80 text-white text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm z-10 border border-neutral-700 font-bold">
            {typeAr}
          </div>
        )}

        <div className="absolute top-1 right-1 bg-blue-600/90 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-md font-bold">
          {relationAr}
        </div>
      </div>
    </div>
  );
}
