import React, { useState } from 'react';
import { PostItem, UserProfile, Language, CampusZone } from '../types';
import { CleanTaskCard } from './CleanTaskCard';
import {
  calculateHaversineDistanceMeters,
  findNearestLandmark,
  formatDistance,
  localizeLocationName,
  isFemaleDormLocationName,
  MANUAL_CAMPUS_AREAS,
  Coordinates,
} from '../utils/lbs';
import { I18N } from '../data/i18n';
import { MapPin, Zap, Sparkles, Navigation, Loader2 } from 'lucide-react';

interface FeedViewProps {
  posts: PostItem[];
  currentUser: UserProfile;
  onSelectPost: (post: PostItem) => void;
  onOpenCreatePost: () => void;
  onOpenOnboarding: () => void;
  onUpdateLocation: (coords: Coordinates, areaLabel: string, zone: CampusZone) => void;
  mode?: 'feed' | 'flash';
  lang: Language;
}

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  currentUser,
  onSelectPost,
  onUpdateLocation,
  mode = 'feed',
  lang,
}) => {
  const t = I18N[lang];

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [flashSubFilter, setFlashSubFilter] = useState<'all' | 'leftovers' | 'emergency'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'closest'>('closest');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'gps' | 'denied'>('idle');
  const [manualAreaId, setManualAreaId] = useState<'downhill' | 'uphill' | 'zhinan'>('downhill');

  const nearest = findNearestLandmark(currentUser.currentCoordinates);

  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const closestLandmark = findNearestLandmark(coords);
        onUpdateLocation(
          coords,
          lang === 'zh' ? closestLandmark.landmark.name : closestLandmark.landmark.nameEn,
          closestLandmark.landmark.zone
        );
        setGeoStatus('gps');
        setIsLocating(false);
      },
      () => {
        setGeoStatus('denied');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectManualArea = (areaId: 'downhill' | 'uphill' | 'zhinan') => {
    const area = MANUAL_CAMPUS_AREAS.find((a) => a.id === areaId);
    if (!area) return;
    setManualAreaId(areaId);
    setGeoStatus('idle');
    onUpdateLocation(
      area.coordinates,
      lang === 'zh' ? area.labelZh : area.labelEn,
      area.zone
    );
  };

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

  const filtered = posts.filter((p) => {
    const isDelisted =
      p.status === 'expired' ||
      p.status === 'completed' ||
      p.status === 'closed' ||
      p.status === 'refunded' ||
      p.status === 'cancelled' ||
      (p.remainingQuota !== undefined && p.remainingQuota <= 0);
    if (isDelisted) return false;

    // STRICT BIOLOGICAL SEX ISOLATION FOR FEMALE DORMS
    const isFemaleTask = Boolean(
      p.isFemaleDormOnly || isFemaleDormLocationName(p.locationName)
    );
    if (isFemaleTask && currentUser.biologicalSex !== 'female') {
      return false;
    }

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
  const nearestLabel = localizeLocationName(
    nearest.landmark.name,
    lang,
    nearest.landmark.nameEn
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Campus Geolocation & Landmark Distance Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>{lang === 'zh' ? '📍 校園定位' : '📍 Campus Location'}</span>
                <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] tabular-nums">
                  {lang === 'zh'
                    ? `距${nearestLabel} ${formatDistance(nearest.distanceMeters)}`
                    : `${formatDistance(nearest.distanceMeters)} from ${nearestLabel}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {geoStatus === 'gps'
                  ? lang === 'zh'
                    ? '已啟用即時定位，自動計算各政大地標距離'
                    : 'Live location active across NCCU landmarks'
                  : geoStatus === 'denied'
                    ? lang === 'zh'
                      ? '未授權瀏覽器定位，請直接點選下方校區位置'
                      : 'Location permission declined; select campus area below'
                    : lang === 'zh'
                      ? '可點擊右側取得即時定位，或手動選擇所在校區'
                      : 'Tap locate for live GPS or pick a campus area'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestGeolocation}
            disabled={isLocating}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>
              {isLocating
                ? lang === 'zh'
                  ? '定位中...'
                  : 'Locating...'
                : lang === 'zh'
                  ? '更新目前位置'
                  : 'Use My Location'}
            </span>
          </button>
        </div>

        {/* Manual Zone Selector Fallback */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-0.5">
              {lang === 'zh' ? '手動切換區域：' : 'Campus Area:'}
            </span>
            {MANUAL_CAMPUS_AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => handleSelectManualArea(area.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                  geoStatus !== 'gps' && manualAreaId === area.id
                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {lang === 'zh' ? area.labelZh : area.labelEn}
              </button>
            ))}
          </div>

          <span className="font-mono text-emerald-800 font-semibold text-[11px] tabular-nums">
            {postsWithDistance.length} {lang === 'zh' ? '則進行中任務' : 'live tasks'}
          </span>
        </div>
      </div>

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
                  ? '優先匯集限時剩食與即時校園緊急救援'
                  : 'Time-limited leftover shares & immediate campus help requests'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0 tabular-nums">
            {postsWithDistance.length} {lang === 'zh' ? '筆急件' : 'urgent'}
          </span>
        </div>
      )}

      {/* Dynamic Top Pill Filters & Sort Switcher */}
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

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1 text-[11px] shrink-0">
          <button
            onClick={() => setSortBy('closest')}
            className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
              sortBy === 'closest' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-500'
            }`}
          >
            {t.pillClosest}
          </button>
          <button
            onClick={() => setSortBy('latest')}
            className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
              sortBy === 'latest' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500'
            }`}
          >
            {t.pillLatest}
          </button>
        </div>
      </div>

      {/* Synced Followed Tags Strip */}
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
