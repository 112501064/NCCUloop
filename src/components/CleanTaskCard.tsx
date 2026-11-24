import React from 'react';
import { PostItem, UserProfile, Language } from '../types';
import { calculateHaversineDistanceMeters, formatDistance } from '../utils/lbs';
import { I18N } from '../data/i18n';
import { MapPin, Clock } from 'lucide-react';

interface CleanTaskCardProps {
  post: PostItem;
  currentUser: UserProfile;
  onClick: () => void;
  lang: Language;
}

export const CleanTaskCard: React.FC<CleanTaskCardProps> = ({
  post,
  currentUser,
  onClick,
  lang,
}) => {
  const t = I18N[lang];

  // Dynamic LBS distance calculation using Haversine formula
  const distanceMeters = calculateHaversineDistanceMeters(
    currentUser.currentCoordinates,
    post.locationCoordinates
  );
  const formattedDist = formatDistance(distanceMeters);

  // Category Badge Colors & Icon
  const categoryConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    leftovers: { label: lang === 'zh' ? '即時剩食 🍱' : 'Leftovers 🍱', bg: 'bg-amber-100', text: 'text-amber-900', icon: '🍱' },
    emergency: { label: lang === 'zh' ? '緊急求救 🆘' : 'SOS Rescue 🆘', bg: 'bg-rose-100', text: 'text-rose-900', icon: '🆘' },
    traffic: { label: lang === 'zh' ? '交通 🚗' : 'Traffic 🚗', bg: 'bg-sky-100', text: 'text-sky-900', icon: '🚗' },
    marketplace: { label: lang === 'zh' ? '二手市集 📦' : 'Market 📦', bg: 'bg-emerald-100', text: 'text-emerald-900', icon: '📦' },
    tutor: { label: lang === 'zh' ? '家教伴讀 🎓' : 'Tutoring 🎓', bg: 'bg-purple-100', text: 'text-purple-900', icon: '🎓' },
    rental: { label: lang === 'zh' ? '租房轉租 🏠' : 'Rental 🏠', bg: 'bg-indigo-100', text: 'text-indigo-900', icon: '🏠' },
    skill: { label: lang === 'zh' ? '技能教學 💡' : 'Skill 💡', bg: 'bg-teal-100', text: 'text-teal-900', icon: '💡' },
    group_buy: { label: lang === 'zh' ? '揪團預購 🛒' : 'Group Buy 🛒', bg: 'bg-cyan-100', text: 'text-cyan-900', icon: '🛒' },
  };

  const catStyle = categoryConfig[post.category] || categoryConfig.marketplace;

  const hasQuota = post.remainingQuota !== undefined && (post.category === 'leftovers' || post.category === 'group_buy' || (post.totalQuota && post.totalQuota > 1));

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 active:scale-[0.99]"
    >
      {/* Row 1: [類別標籤 + 剩餘名額/匿名標記] + [距離 Badge (例: 📍 綜院 • 120m)] */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] font-mono ${catStyle.bg} ${catStyle.text}`}>
            {catStyle.label}
          </span>

          {/* Remaining Quota Badge for Leftovers & Group Buy */}
          {hasQuota && (
            <span className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold border ${
              (post.remainingQuota || 0) > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {post.category === 'leftovers' ? '🍱' : '🛒'}{' '}
              {(post.remainingQuota || 0) > 0
                ? (lang === 'zh' ? `剩餘 ${post.remainingQuota} 份` : `${post.remainingQuota} left`)
                : (lang === 'zh' ? '已領完' : 'Claimed Out')}
            </span>
          )}

          {post.isCreatorAnonymous && (
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold border border-slate-200">
              {lang === 'zh' ? '🤫 匿名' : '🤫 Anon'}
            </span>
          )}
        </div>

        {/* Dynamic LBS Distance Badge (例: 📍 綜院 • 120m) */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 text-slate-700 px-2 py-1 rounded-lg text-[11px] font-mono font-medium shrink-0">
          <MapPin className="w-3 h-3 text-emerald-600" />
          <span className="truncate max-w-[90px]">{post.locationName.split('（')[0]}</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-700 font-bold tabular-nums">{formattedDist}</span>
        </div>
      </div>

      {/* Row 2: [標題] */}
      <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug">
        {lang === 'zh' ? post.title : (post.titleEn || post.title)}
      </h3>

      {/* Row 3: [剩餘時間] + [金額 / 免費] */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        {/* Time remaining */}
        <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono tabular-nums">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{post.timeRemainingText || post.expiresAt}</span>
        </div>

        {/* Amount or Free Aid */}
        <div className="text-right">
          {post.rewardAmount === 0 ? (
            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs">
              {t.free}
            </span>
          ) : (
            <span className="font-mono font-extrabold text-slate-900 text-sm tabular-nums">
              NT$ {post.rewardAmount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
