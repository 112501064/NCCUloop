import React, { useState } from 'react';
import { PostItem, UserProfile, Language } from '../types';
import { CleanTaskCard } from './CleanTaskCard';
import { calculateHaversineDistanceMeters } from '../utils/lbs';
import { I18N } from '../data/i18n';
import { MapPin, Sparkles, Plus, Compass, SlidersHorizontal, CheckCircle2 } from 'lucide-react';

interface FeedViewProps {
  posts: PostItem[];
  currentUser: UserProfile;
  onSelectPost: (post: PostItem) => void;
  onOpenCreatePost: () => void;
  onOpenOnboarding: () => void;
  lang: Language;
}

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  currentUser,
  onSelectPost,
  onOpenCreatePost,
  onOpenOnboarding,
  lang,
}) => {
  const t = I18N[lang];

  // Dynamic Pill Filter State
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'closest'>('closest');

  // Filter and sort posts
  let filtered = posts.filter(p => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'leftovers') return p.category === 'leftovers';
    if (activeFilter === 'emergency') return p.category === 'emergency';
    if (activeFilter === 'traffic') return p.category === 'traffic';
    if (activeFilter === 'marketplace') {
      return p.category === 'marketplace' || p.category === 'tutor' || p.category === 'rental' || p.category === 'skill' || p.category === 'group_buy';
    }
    return true;
  });

  // Calculate distances and sort
  const postsWithDistance = filtered.map(p => ({
    ...p,
    distanceMeters: calculateHaversineDistanceMeters(
      currentUser.currentCoordinates,
      p.locationCoordinates
    ),
  }));

  if (sortBy === 'closest') {
    postsWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  const pillFilters = [
    { id: 'all', label: t.pillAll },
    { id: 'leftovers', label: t.pillLeftovers },
    { id: 'emergency', label: t.pillEmergency },
    { id: 'traffic', label: t.pillTraffic },
    { id: 'marketplace', label: t.pillMarket },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Dynamic Top Pill Filters (頂部動態篩選列 - 輕量化膠囊標籤) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none flex-1">
          {pillFilters.map(pill => (
            <button
              key={pill.id}
              onClick={() => setActiveFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer font-medium ${
                activeFilter === pill.id
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

      {/* LBS User Anchor Strip */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {lang === 'zh' ? '目前定位錨點：' : 'Current LBS Anchor:'} <strong>綜院南棟 (山下)</strong>
          </span>
        </div>
        <span className="font-mono text-emerald-800 font-semibold">
          {postsWithDistance.length} {lang === 'zh' ? '則即時任務' : 'live tasks'}
        </span>
      </div>

      {/* Clean Cards Stream (資訊卡片化流) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {postsWithDistance.map(post => (
          <CleanTaskCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            onClick={() => onSelectPost(post)}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
};
