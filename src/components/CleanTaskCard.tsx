import React from 'react';
import { PostItem, UserProfile, Language } from '../types';
import { calculateHaversineDistanceMeters, formatDistance } from '../utils/lbs';
import { I18N } from '../data/i18n';
import { MapPin, Clock, User } from 'lucide-react';

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

  const distanceMeters = calculateHaversineDistanceMeters(
    currentUser.currentCoordinates,
    post.locationCoordinates
  );
  const formattedDist = formatDistance(distanceMeters);

  const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
    leftovers: { label: lang === 'zh' ? '即時剩食 🍱' : 'Leftovers 🍱', bg: 'bg-amber-100', text: 'text-amber-900' },
    emergency: { label: lang === 'zh' ? '緊急求救 🆘' : 'SOS Rescue 🆘', bg: 'bg-rose-100', text: 'text-rose-900' },
    traffic: { label: lang === 'zh' ? '交通 🚗' : 'Traffic 🚗', bg: 'bg-sky-100', text: 'text-sky-900' },
    marketplace: { label: lang === 'zh' ? '二手市集 📦' : 'Market 📦', bg: 'bg-emerald-100', text: 'text-emerald-900' },
    tutor: { label: lang === 'zh' ? '家教伴讀 🎓' : 'Tutoring 🎓', bg: 'bg-purple-100', text: 'text-purple-900' },
    rental: { label: lang === 'zh' ? '租房轉租 🏠' : 'Rental 🏠', bg: 'bg-indigo-100', text: 'text-indigo-900' },
    skill: { label: lang === 'zh' ? '技能教學 💡' : 'Skill 💡', bg: 'bg-teal-100', text: 'text-teal-900' },
    group_buy: { label: lang === 'zh' ? '揪團預購 🛒' : 'Group Buy 🛒', bg: 'bg-cyan-100', text: 'text-cyan-900' },
  };

  const catStyle = categoryConfig[post.category] || categoryConfig.marketplace;
  const hasQuota =
    post.remainingQuota !== undefined &&
    (post.category === 'leftovers' ||
      post.category === 'group_buy' ||
      (post.totalQuota !== undefined && post.totalQuota > 1));

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 active:scale-[0.99]"
    >
      {/* Row 1: Category + Quota + Strict Anonymous Badge or Creator Nickname + Distance */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] font-mono ${catStyle.bg} ${catStyle.text}`}>
            {catStyle.label}
          </span>

          {hasQuota && (
            <span
              className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold border ${
                (post.remainingQuota || 0) > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {post.category === 'leftovers' ? '🍱' : '🛒'}{' '}
              {(post.remainingQuota || 0) > 0
                ? lang === 'zh'
                  ? `剩餘 ${post.remainingQuota} 份`
                  : `${post.remainingQuota} left`
                : lang === 'zh'
                  ? '已額滿'
                  : 'Full'}
            </span>
          )}

          {post.isCreatorAnonymous === true ? (
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
              {lang === 'zh' ? '🛡️ 匿名防護中' : '🛡️ Anonymous'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-700 font-medium text-[11px] border border-slate-200/80 inline-flex items-center gap-1 max-w-[110px] truncate">
              <User className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{post.creatorName}</span>
            </span>
          )}
        </div>

        {/* Distance Badge */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 text-slate-700 px-2 py-1 rounded-lg text-[11px] font-mono font-medium shrink-0">
          <MapPin className="w-3 h-3 text-emerald-600" />
          <span className="truncate max-w-[90px]">{post.locationName.split('（')[0]}</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-700 font-bold tabular-nums">{formattedDist}</span>
        </div>
      </div>

      {/* Row 2: Title */}
      <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug">
        {lang === 'zh' ? post.title : post.titleEn || post.title}
      </h3>

      {/* Row 3: Time remaining + Price */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono tabular-nums">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{post.timeRemainingText || post.expiresAt}</span>
        </div>

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
