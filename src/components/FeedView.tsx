import React, { useState } from 'react';
import { PostItem, UserProfile, Language } from '../types';
import { CleanTaskCard } from './CleanTaskCard';
import { calculateHaversineDistanceMeters } from '../utils/lbs';
import { I18N } from '../data/i18n';
import { MapPin, Zap, Sparkles } from 'lucide-react';

interface FeedViewProps {
  posts: PostItem[];
  currentUser: UserProfile;
  onSelectPost: (post: PostItem) => void;
  onOpenCreatePost: () => void;
  onOpenOnboarding: () => void;
  mode?: 'feed' | 'flash';
  lang: Language;
}

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  currentUser,
  onSelectPost,
  mode = 'feed',
  lang,
}) => {
  const t = I18N[lang];

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [flashSubFilter, setFlashSubFilter] = useState<'all' | 'leftovers' | 'emergency'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'closest'>('closest');

  const matchesFollowedTag = (post: PostItem) => {
    if (!currentUser.subscribedTags || currentUser.subscribedTags.length === 0) return false;
    const haystack = [
      post.title,
      post.titleEn || '',
      post.description,
      post.locationName,
      ...post.tags,
    ]
      .join(' ')
      .toLowerCase();

    return currentUser.subscribedTags.some((rawTag) => {
      const clean = rawTag.replace(/^#/, '').trim().toLowerCase();
      if (!clean) return false;
      return haystack.includes(clean);
    });
  };

  // Filter active lobby posts (exclude expired, completed, closed, refunded, cancelled, and zero-quota tasks)
  const filtered = posts.filter((p) => {
    const isDelisted =
      p.status === 'expired' ||
      p.status === 'completed' ||
      p.status === 'closed' ||
      p.status === 'refunded' ||
      p.status === 'cancelled' ||
      (p.remainingQuota !== undefined && p.remainingQuota <= 0);
    if (isDelisted) return false;

    if (mode === 'flash') {
      const isFlashTask = p.category === 'leftovers' || p.category === 'emergency';
      if (!isFlashTask) return false;
      if (flashSubFilter === 'all') return true;
      return p.category === flashSubFilter;
    }

    if (activeFilter === 'all') return true;
    if (activeFilter === 'recommended') return matchesFollowedTag(p);
    if (activeFilter === 'leftovers') return p.category === 'leftovers';
    if (activeFilter === 'emergency') return p.category === 'emergency';
    if (activeFilter === 'traffic') return p.category === 'traffic';
    if (activeFilter === 'marketplace') {
      return (
        p.category === 'marketplace' ||
        p.category === 'tutor' ||
        p.category === 'rental' ||
        p.category === 'skill' ||
        p.category === 'group_buy'
      );
    }
    return true;
  });

  // Calculate distances and sort
  const postsWithDistance = filtered.map((p) => ({
    ...p,
    distanceMeters: calculateHaversineDistanceMeters(
      currentUser.currentCoordinates,
      p.locationCoordinates
    ),
  }));

  if (sortBy === 'closest') {
    postsWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
  } else {
    postsWithDistance.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  }

  const pillFilters =
    mode === 'flash'
      ? [
          { id: 'all', label: lang === 'zh' ? '⚡ 全部快閃/急件' : '⚡ All Flash' },
          { id: 'leftovers', label: lang === 'zh' ? '🍱 2h 限時剩食' : '🍱 2h Leftovers' },
          { id: 'emergency', label: lang === 'zh' ? '🆘 緊急求救' : '🆘 Emergency SOS' },
        ]
      : [
          { id: 'all', label: t.pillAll },
          { id: 'recommended', label: `✨ ${t.pillRecommended}` },
          { id: 'leftovers', label: t.pillLeftovers },
          { id: 'emergency', label: t.pillEmergency },
          { id: 'traffic', label: t.pillTraffic },
          { id: 'marketplace', label: t.pillMarket },
        ];

  const currentPillValue = mode === 'flash' ? flashSubFilter : activeFilter;

  return (
    <div className="space-y-4 pb-24">
      {/* Flash Mode Header Banner */}
      {mode === 'flash' && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-amber-950 truncate">
                {lang === 'zh' ? '快閃剩食 & 緊急求救專區' : 'Flash Leftovers & Urgent SOS'}
              </h2>
              <p className="text-[11px] text-amber-800 truncate">
                {lang === 'zh'
                  ? '優先匯集 2 小時限時剩食與即時校園緊急救援'
                  : '2-hour leftover shares & immediate campus help requests'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0 tabular-nums">
            {postsWithDistance.length} {lang === 'zh' ? '筆急件' : 'urgent'}
          </span>
        </div>
      )}

      {/* Dynamic Top Pill Filters */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none flex-1">
          {pillFilters.map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                if (mode === 'flash') {
                  setFlashSubFilter(pill.id as 'all' | 'leftovers' | 'emergency');
                } else {
                  setActiveFilter(pill.id);
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer font-medium ${
                currentPillValue === pill.id
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Sort Switcher: Closest vs Latest */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1 text-[11px] shrink-0">
          <button
            onClick={() => setSortBy('closest')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              sortBy === 'closest' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-500'
            }`}
          >
            {t.pillClosest}
          </button>
          <button
            onClick={() => setSortBy('latest')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              sortBy === 'latest' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500'
            }`}
          >
            {t.pillLatest}
          </button>
        </div>
      </div>

      {/* Synced Followed Tags Strip when Recommended filter is active */}
      {mode === 'feed' && activeFilter === 'recommended' && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="flex items-center gap-1 font-bold text-emerald-900 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            {lang === 'zh' ? '目前追蹤關鍵字：' : 'Active Followed Tags:'}
          </span>
          {currentUser.subscribedTags.length > 0 ? (
            currentUser.subscribedTags.map((tg) => (
              <span
                key={tg}
                className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 rounded-full font-mono"
              >
                {tg}
              </span>
            ))
          ) : (
            <span className="text-slate-500">
              {lang === 'zh'
                ? '尚未設定追蹤標籤，請至「個人」頁面新增！'
                : 'No followed tags yet. Add some in Profile!'}
            </span>
          )}
        </div>
      )}

      {/* LBS User Anchor Strip */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {lang === 'zh' ? '目前定位錨點：' : 'Current LBS Anchor:'}{' '}
            <strong>{currentUser.dormLocation || '綜院南棟 (山下)'}</strong>
          </span>
        </div>
        <span className="font-mono text-emerald-800 font-semibold tabular-nums">
          {postsWithDistance.length} {lang === 'zh' ? '則即時任務' : 'live tasks'}
        </span>
      </div>

      {/* Clean Cards Stream */}
      {postsWithDistance.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">
            {activeFilter === 'recommended'
              ? lang === 'zh'
                ? '目前沒有符合您追蹤標籤的進行中任務'
                : 'No live tasks match your followed tags yet.'
              : lang === 'zh'
                ? '目前此分類暫無進行中任務'
                : 'No live tasks in this category.'}
          </p>
          <p className="text-[11px] text-slate-400">
            {activeFilter === 'recommended'
              ? lang === 'zh'
                ? '可至「個人」頁面自由新增更多追蹤標籤（如 #綜院、#經濟學課本）'
                : 'Add more tags in Profile to customize recommendations.'
              : lang === 'zh'
                ? '點擊底部中間「+ 發布」即可發起校園互助需求！'
                : 'Tap + Post below to create a new task!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {postsWithDistance.map((post) => (
            <CleanTaskCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onClick={() => onSelectPost(post)}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
};
