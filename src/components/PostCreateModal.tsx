import React, { useState, useEffect } from 'react';
import {
  PostCategory,
  CampusZone,
  PostItem,
  UserProfile,
  PaymentMethod,
  PaymentDirection,
  TimeOption,
  Language,
} from '../types';
import { I18N } from '../data/i18n';
import { isFemaleDormLocationName, localizeLocationName } from '../utils/lbs';
import {
  X,
  MapPin,
  Clock,
  UserX,
  Wand2,
  Users,
  Minus,
  Plus,
  Wallet,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { formatRemainingMinutes } from '../utils/formatters';

interface PostCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  editingPost?: PostItem | null;
  hasActiveOrders?: boolean;
  onCreatePost: (newPost: Partial<PostItem>) => void;
  onUpdatePost?: (postId: string, updates: Partial<PostItem>) => Promise<void> | void;
  lang: Language;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function computePresetDeadline(preset: '30m' | '1h' | '2h' | 'tonight' | 'tomorrow'): Date {
  const now = new Date();
  if (preset === '30m') return new Date(now.getTime() + 30 * 60000);
  if (preset === '1h') return new Date(now.getTime() + 60 * 60000);
  if (preset === '2h') return new Date(now.getTime() + 120 * 60000);
  if (preset === 'tonight') {
    const tonight = new Date(now);
    tonight.setHours(22, 0, 0, 0);
    if (tonight.getTime() <= now.getTime()) {
      tonight.setTime(now.getTime() + 120 * 60000);
    }
    return tonight;
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  return tomorrow;
}

const PRESET_LOCATIONS = [
  { name: '總圖書館', zone: 'downhill' as CampusZone, lat: 24.9866, lng: 121.5766, isFemaleDorm: false },
  { name: '商學院', zone: 'downhill' as CampusZone, lat: 24.9866, lng: 121.5754, isFemaleDorm: false },
  { name: '達賢圖書館', zone: 'downhill' as CampusZone, lat: 24.9849, lng: 121.5727, isFemaleDorm: false },
  { name: '莊敬外舍', zone: 'dorms' as CampusZone, lat: 24.9888, lng: 121.5722, isFemaleDorm: true },
  { name: '莊敬一～三舍(女宿)', zone: 'dorms' as CampusZone, lat: 24.9872, lng: 121.5761, isFemaleDorm: true },
  { name: '自強十舍(女宿區)', zone: 'dorms' as CampusZone, lat: 24.9815, lng: 121.5812, isFemaleDorm: true },
  { name: '山下校門口', zone: 'downhill' as CampusZone, lat: 24.9877, lng: 121.5759, isFemaleDorm: false },
  { name: '麥側', zone: 'off_campus' as CampusZone, lat: 24.9881, lng: 121.5772, isFemaleDorm: false },
  { name: '綜院', zone: 'downhill' as CampusZone, lat: 24.9862, lng: 121.5755, isFemaleDorm: false },
  { name: '山上綜合大樓', zone: 'uphill' as CampusZone, lat: 24.9825, lng: 121.5795, isFemaleDorm: false },
];

export const PostCreateModal: React.FC<PostCreateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  editingPost,
  hasActiveOrders = false,
  onCreatePost,
  onUpdatePost,
  lang,
}) => {
  const isEditing = Boolean(editingPost);
  const lockCoreFields = isEditing && hasActiveOrders;

  const [category, setCategory] = useState<PostCategory>('leftovers');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [titleEn, setTitleEn] = useState<string>('');
  const [descriptionEn, setDescriptionEn] = useState<string>('');
  const [quotaCount, setQuotaCount] = useState<number>(1);
  const [selectedLocName, setSelectedLocName] = useState<string>('總圖書館');
  const [isCustomLoc, setIsCustomLoc] = useState<boolean>(false);
  const [customLocationName, setCustomLocationName] = useState<string>('');
  const [priceType, setPriceType] = useState<'fixed' | 'free'>('free');
  const [rewardAmount, setRewardAmount] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_meetup');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentDirection, setPaymentDirection] = useState<PaymentDirection>('accepter_pays');
  const [timeOption, setTimeOption] = useState<TimeOption>('2h');
  const [deadlineValue, setDeadlineValue] = useState<string>(() =>
    toDatetimeLocalValue(computePresetDeadline('2h'))
  );
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isFemaleDormOnly, setIsFemaleDormOnly] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync form state when opening in Create or Edit mode
  useEffect(() => {
    if (!isOpen) return;
    if (editingPost) {
      setCategory(editingPost.category);
      setTitle(editingPost.title);
      setDescription(editingPost.description);
      setTitleEn(editingPost.titleEn || '');
      setDescriptionEn(editingPost.descriptionEn || '');
      setQuotaCount(editingPost.totalQuota ?? 1);
      const isPreset = PRESET_LOCATIONS.some((l) => l.name === editingPost.locationName);
      if (isPreset) {
        setIsCustomLoc(false);
        setSelectedLocName(editingPost.locationName);
        setCustomLocationName('');
      } else {
        setIsCustomLoc(true);
        setCustomLocationName(editingPost.locationName);
      }
      if (editingPost.rewardAmount === 0) {
        setPriceType('free');
        setRewardAmount(50);
        setPaymentDirection('free');
      } else {
        setPriceType('fixed');
        setRewardAmount(editingPost.rewardAmount);
        setPaymentMethod(editingPost.paymentMethod);
        setPaymentDirection(editingPost.paymentDirection || 'accepter_pays');
      }
      setPaymentNote(editingPost.paymentNote || '');
      setTimeOption(editingPost.timeOption || '2h');
      const expMs =
        editingPost.expireAtMs && editingPost.expireAtMs > Date.now()
          ? editingPost.expireAtMs
          : Date.now() + (editingPost.remainingMinutes ?? 120) * 60000;
      setDeadlineValue(toDatetimeLocalValue(new Date(expMs)));
      const fDorm = Boolean(
        editingPost.isFemaleDormOnly || isFemaleDormLocationName(editingPost.locationName)
      );
      setIsFemaleDormOnly(fDorm);
      setIsAnonymous(fDorm ? false : Boolean(editingPost.isCreatorAnonymous));
    } else {
      setCategory('leftovers');
      setTitle('');
      setDescription('');
      setTitleEn('');
      setDescriptionEn('');
      setQuotaCount(1);
      setSelectedLocName('總圖書館');
      setIsCustomLoc(false);
      setCustomLocationName('');
      setPriceType('free');
      setRewardAmount(50);
      setPaymentMethod('cash_meetup');
      setPaymentNote('');
      setPaymentDirection('accepter_pays');
      setTimeOption('2h');
      setDeadlineValue(toDatetimeLocalValue(computePresetDeadline('2h')));
      setIsFemaleDormOnly(false);
      setIsAnonymous(false);
    }
  }, [isOpen, editingPost]);

  if (!isOpen) return null;
  const t = I18N[lang];
  const isMaleUser = currentUser.biologicalSex === 'male';

  const currentLocName = isCustomLoc
    ? customLocationName.trim() || '政大校園'
    : selectedLocName;
  const effectiveFemaleDormOnly =
    !isMaleUser && (isFemaleDormOnly || isFemaleDormLocationName(currentLocName));

  // Enforce mandatory real-name whenever task is female-dorm-only
  const effectiveAnonymous = effectiveFemaleDormOnly ? false : isAnonymous;

  const handleSelectCategory = (newCat: PostCategory) => {
    if (lockCoreFields) return;
    setCategory(newCat);
    if (newCat === 'emergency' || newCat === 'tutor' || newCat === 'skill') {
      setPaymentDirection('creator_pays');
    } else {
      setPaymentDirection('accepter_pays');
    }
    if (newCat === 'leftovers') {
      setPriceType('free');
    }
  };

  const handleSelectTimePreset = (preset: '30m' | '1h' | '2h' | 'tonight' | 'tomorrow') => {
    if (lockCoreFields) return;
    setTimeOption(preset);
    setDeadlineValue(toDatetimeLocalValue(computePresetDeadline(preset)));
  };

  const handleToggleFemaleDorm = (checked: boolean) => {
    if (lockCoreFields || isMaleUser) return;
    setIsFemaleDormOnly(checked);
    if (checked) {
      setIsAnonymous(false);
    }
  };

  const handleAiRefine = () => {
    setIsRefining(true);
    setTimeout(() => {
      setIsRefining(false);
      const targetLoc = currentLocName;
      const currentTitle = title.trim();
      const currentDesc = description.trim();

      if (category === 'emergency') {
        if (!lockCoreFields) {
          setTitle(
            currentTitle
              ? `【校園急救】${currentTitle.replace(/【.*?】/g, '')}`
              : `【校園急救】${targetLoc} 急需物資支援`
          );
        }
        setDescription(
          currentDesc
            ? `【求助地點】${targetLoc}\n【急難說明】${currentDesc}`
            : `【求助地點】${targetLoc}\n【急難說明】現場急需備用物資支援，求好心政大同學協助送達！`
        );
      } else if (category === 'leftovers') {
        if (!lockCoreFields) {
          setTitle(
            currentTitle
              ? `【即時剩食】${currentTitle.replace(/【.*?】/g, '')}`
              : `【即時剩食】${targetLoc} 多出 ${quotaCount} 份餐點免費自取`
          );
        }
        setDescription(
          currentDesc
            ? `【取餐地點】${targetLoc}\n【餐點份數】共 ${quotaCount} 份\n【餐點資訊】${currentDesc}`
            : `【取餐地點】${targetLoc}\n【餐點份數】共 ${quotaCount} 份\n【惜食說明】活動剛結束多出乾淨餐點，歡迎政大同學免費自取！`
        );
      } else {
        if (!lockCoreFields) {
          setTitle(
            currentTitle
              ? `【校園互助】${currentTitle.replace(/【.*?】/g, '')}`
              : `【校園互助】${targetLoc} 需求交流與面交`
          );
        }
        setDescription(
          currentDesc
            ? `【交涉地點】${targetLoc}\n【詳細內容】${currentDesc}`
            : `【交涉地點】${targetLoc}\n【詳細內容】校園物品或互助需求交流，歡迎私訊確認。`
        );
      }
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditing && editingPost && onUpdatePost) {
        if (lockCoreFields) {
          await onUpdatePost(editingPost.id, {
            description: description.trim() || editingPost.description,
          });
          onClose();
          return;
        }
      }

      const matchedPreset = !isCustomLoc
        ? PRESET_LOCATIONS.find((l) => l.name === selectedLocName)
        : undefined;
      const locName = currentLocName;
      const locZone: CampusZone = matchedPreset
        ? matchedPreset.zone
        : locName.includes('山上') || locName.includes('綜合大樓')
          ? 'uphill'
          : locName.includes('舍')
            ? 'dorms'
            : locName.includes('指南') || locName.includes('麥側')
              ? 'off_campus'
              : 'downhill';

      const locCoords = matchedPreset
        ? { lat: matchedPreset.lat, lng: matchedPreset.lng }
        : currentUser.currentCoordinates;

      const parsedDeadlineMs = new Date(deadlineValue).getTime();
      const expireAtMs =
        !Number.isNaN(parsedDeadlineMs) && parsedDeadlineMs > Date.now()
          ? parsedDeadlineMs
          : Date.now() + 120 * 60000;
      const mins = Math.max(5, Math.min(10080, Math.round((expireAtMs - Date.now()) / 60000)));
      const isQuotaCategory = category === 'leftovers' || category === 'group_buy';

      const effectiveDirection: PaymentDirection =
        priceType === 'free' ? 'free' : paymentDirection;

      const payload: Partial<PostItem> = {
        creatorId: currentUser.id,
        creatorName: currentUser.nickname || currentUser.name,
        creatorRealName: effectiveFemaleDormOnly
          ? currentUser.realName || currentUser.nickname || currentUser.name
          : undefined,
        creatorGender: currentUser.gender,
        creatorTrustScore: currentUser.trustScore,
        isCreatorAnonymous: effectiveAnonymous,
        isFemaleDormOnly: effectiveFemaleDormOnly,
        femaleOnlyRecommended: effectiveFemaleDormOnly,
        category,
        title:
          title.trim() ||
          (category === 'leftovers'
            ? `${locName} 多出 ${quotaCount} 份餐點歡迎自取`
            : category === 'emergency'
              ? `${locName} 急需校園支援`
              : `${locName} 校園互助任務`),
        titleEn: titleEn || undefined,
        description:
          description.trim() || '詳細交涉細節請點選申請接單後於 1-on-1 聊天室溝通。',
        descriptionEn: descriptionEn || undefined,
        tags: [
          category === 'emergency'
            ? '#緊急求救'
            : category === 'leftovers'
              ? '#即時剩食'
              : category === 'group_buy'
                ? '#揪團預購'
                : '#校園互助',
          `#${locName.split('（')[0]}`,
          priceType === 'free' ? '#免費互助' : `#NT$${rewardAmount}`,
        ],
        rewardAmount: priceType === 'free' ? 0 : Number(rewardAmount),
        isNegotiable: false,
        escrowDeposit: priceType === 'free' ? 0 : Number(rewardAmount),
        paymentMethod: priceType === 'free' ? 'free_aid' : paymentMethod,
        paymentDirection: effectiveDirection,
        paymentNote: priceType === 'free' ? undefined : paymentNote.trim() || undefined,
        payerRole:
          effectiveDirection === 'creator_pays'
            ? 'creator'
            : effectiveDirection === 'accepter_pays'
              ? 'fulfiller'
              : undefined,
        totalQuota: isQuotaCategory ? quotaCount : 1,
        remainingQuota: isQuotaCategory ? quotaCount : 1,
        claimedByUserIds: [],
        timeOption,
        remainingMinutes: mins,
        timeRemainingText: formatRemainingMinutes(mins, lang),
        status: 'open',
        locationName: locName,
        locationNameEn: localizeLocationName(locName, 'en'),
        locationCoordinates: locCoords,
        locationZone: locZone,
        minTrustScoreRequired: 60,
        createdAt: editingPost?.createdAt || '剛剛',
        expiresAt: formatRemainingMinutes(mins, lang),
        expireAtMs,
      };

      if (isEditing && editingPost && onUpdatePost) {
        await onUpdatePost(editingPost.id, payload);
      } else {
        onCreatePost(payload);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const showQuotaSelector = category === 'leftovers' || category === 'group_buy';
  const visiblePresetLocations = isMaleUser
    ? PRESET_LOCATIONS.filter((l) => !l.isFemaleDorm)
    : PRESET_LOCATIONS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-900 text-white">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              NCCU LOOP
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              {isEditing ? t.editTitle : t.createTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {lockCoreFields && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-950 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {lang === 'zh'
                  ? '已有同學接單，僅可修改補充說明（標題、地點、金額與截止時間已鎖定）。'
                  : 'An order is already active — only additional description details can be edited.'}
              </span>
            </div>
          )}

          {/* Category tabs */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              {lang === 'zh' ? '選擇服務類別' : 'Category'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'leftovers', label: '🍱 即時剩食', labelEn: '🍱 Leftovers' },
                { id: 'emergency', label: '🆘 緊急求救', labelEn: '🆘 Emergency SOS' },
                { id: 'traffic', label: '🚗 交通共乘', labelEn: '🚗 Traffic' },
                { id: 'marketplace', label: '📦 二手用品', labelEn: '📦 Marketplace' },
                { id: 'group_buy', label: '🛒 揪團預購', labelEn: '🛒 Group Buy' },
                { id: 'tutor', label: '🎓 家教伴讀', labelEn: '🎓 Tutoring' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  disabled={lockCoreFields || isEditing}
                  onClick={() => handleSelectCategory(cat.id as PostCategory)}
                  className={`py-2 px-2.5 rounded-xl border text-center font-medium transition-colors ${
                    lockCoreFields || isEditing ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    category === cat.id
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'zh' ? cat.label : cat.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Multi-Quota Selector for Leftovers & Group Buy */}
          {showQuotaSelector && !isEditing && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold text-amber-950 block text-xs">
                    {lang === 'zh' ? '開放名額 / 份數' : 'Available Spots / Portions'}
                  </span>
                  <span className="text-[11px] text-amber-800">
                    {lang === 'zh'
                      ? '每有一位同學接單即減 1，名額歸零才下架'
                      : 'Each claim reserves 1 spot independently until 0 left'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQuotaCount((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-900 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={quotaCount}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                    setQuotaCount(val);
                  }}
                  className="w-10 text-center font-mono font-bold text-sm text-slate-900 focus:outline-none tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setQuotaCount((q) => Math.min(20, q + 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-900 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-bold">
                {lang === 'zh' ? '任務標題' : 'Task Title'}
              </label>
              <button
                type="button"
                onClick={handleAiRefine}
                disabled={isRefining}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                {isRefining ? (
                  <>
                    <div className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                    <span>{t.aiRefining}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3 text-emerald-600" />
                    <span>{t.aiRefine}</span>
                  </>
                )}
              </button>
            </div>

            <input
              type="text"
              required
              disabled={lockCoreFields}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                lang === 'zh'
                  ? '輸入標題（例：總圖門口多出 3 份便當自取）...'
                  : 'Enter task title...'
              }
              className="w-full bg-slate-50 disabled:opacity-60 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* Content Description (Always editable for supplementary notes) */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {lockCoreFields
                ? lang === 'zh'
                  ? '補充說明（可修改）'
                  : 'Additional Description (Editable)'
                : lang === 'zh'
                  ? '詳細需求描述'
                  : 'Detailed Description'}
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                lang === 'zh'
                  ? '請說明交付位置、物資細節或聯絡注意事項...'
                  : 'Meeting point, item details, or notes...'
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 leading-relaxed font-sans"
            />
          </div>

          {/* Location Picker */}
          <fieldset disabled={lockCoreFields} className="space-y-2 disabled:opacity-60">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'zh' ? '面交／集合地點' : 'Campus Location'}</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {localizeLocationName(currentLocName, lang)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {visiblePresetLocations.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    setIsCustomLoc(false);
                    setSelectedLocName(loc.name);
                    if (loc.isFemaleDorm) {
                      setIsFemaleDormOnly(true);
                      setIsAnonymous(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    !isCustomLoc && selectedLocName === loc.name
                      ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {localizeLocationName(loc.name, lang)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomLoc(true)}
                className={`px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  isCustomLoc
                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                + {lang === 'zh' ? '自訂地點' : 'Custom'}
              </button>
            </div>

            {isCustomLoc && (
              <input
                type="text"
                value={customLocationName}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isMaleUser && isFemaleDormLocationName(val)) return;
                  setCustomLocationName(val);
                  if (isFemaleDormLocationName(val)) {
                    setIsFemaleDormOnly(true);
                    setIsAnonymous(false);
                  }
                }}
                placeholder={
                  lang === 'zh'
                    ? '請輸入政大校園或指南路地點（例：季陶樓一樓）...'
                    : 'Enter custom campus spot...'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            )}
          </fieldset>

          {/* Deadline Picker */}
          <fieldset disabled={lockCoreFields} className="space-y-2 disabled:opacity-60">
            <label className="text-slate-700 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>{lang === 'zh' ? '截止時間設定' : 'Deadline'}</span>
            </label>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: '30m', zh: '+30分鐘', en: '+30m' },
                { id: '1h', zh: '+1小時', en: '+1h' },
                { id: '2h', zh: '+2小時', en: '+2h' },
                { id: 'tonight', zh: '今天晚上', en: 'Tonight' },
                { id: 'tomorrow', zh: '明天', en: 'Tomorrow' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    handleSelectTimePreset(
                      opt.id as '30m' | '1h' | '2h' | 'tonight' | 'tomorrow'
                    )
                  }
                  className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-all ${
                    timeOption === opt.id
                      ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'zh' ? opt.zh : opt.en}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 shrink-0">
                {lang === 'zh' ? '精確截止時間：' : 'Exact Deadline:'}
              </span>
              <input
                type="datetime-local"
                value={deadlineValue}
                min={toDatetimeLocalValue(new Date())}
                onChange={(e) => {
                  setTimeOption('custom_time');
                  setDeadlineValue(e.target.value);
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </fieldset>

          {/* Pricing & Payment Direction */}
          <fieldset
            disabled={lockCoreFields}
            className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'zh' ? '價格與交易付款方向' : 'Price & Payment Direction'}</span>
              </label>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPriceType('free')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                    priceType === 'free'
                      ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lang === 'zh' ? '0 元免費互助' : 'Free Aid'}
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType('fixed')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                    priceType === 'fixed'
                      ? 'bg-slate-900 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lang === 'zh' ? '自訂金額' : 'Paid'}
                </button>
              </div>
            </div>

            {priceType === 'fixed' ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-xs">
                    {lang === 'zh' ? '金額（新台幣）：' : 'Amount (NTD):'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold font-mono">NT$</span>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(Number(e.target.value))}
                      className="w-24 bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    {lang === 'zh' ? '誰付款、誰收款（交易方向）：' : 'Who Pays Whom:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentDirection('creator_pays')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer text-xs transition-all ${
                        paymentDirection === 'creator_pays'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div>🙋 {lang === 'zh' ? '發布者付錢請人幫忙' : 'Creator Pays Accepter'}</div>
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                        {lang === 'zh' ? '例：徵代買、徵家教、徵求物資' : 'e.g. Errands, Tutoring'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentDirection('accepter_pays')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer text-xs transition-all ${
                        paymentDirection === 'accepter_pays'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div>🛍️ {lang === 'zh' ? '接單者付錢購買/領取' : 'Accepter Pays Creator'}</div>
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                        {lang === 'zh' ? '例：二手出清、團購分售、有償剩食' : 'e.g. Resale, Group Buy'}
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    {lang === 'zh' ? '交易付款方式：' : 'Payment Method:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash_meetup')}
                      className={`p-2 rounded-xl border text-left cursor-pointer text-xs transition-all ${
                        paymentMethod === 'cash_meetup'
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      💵 {lang === 'zh' ? '面交現金' : 'Cash at Meetup'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pre_transfer')}
                      className={`p-2 rounded-xl border text-left cursor-pointer text-xs transition-all ${
                        paymentMethod === 'pre_transfer'
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      📲 {lang === 'zh' ? '轉帳（街口 / 台灣 Pay / Line Pay）' : 'Transfer (JKOPAY / Line Pay)'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium block mb-1">
                    {lang === 'zh' ? '收款帳號或面交備註 (選填)' : 'Payment Note (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder={
                      lang === 'zh'
                        ? '例：街口帳號 901234567 / 現場掃 Line Pay...'
                        : 'e.g. JKOPAY ID / Line Pay QR at meetup...'
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-900 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80">
                ❤️{' '}
                {lang === 'zh'
                  ? '本任務為 0 元免費互助/贈送，面交後雙方確認完成即可！'
                  : 'Free mutual aid — no payment needed!'}
              </div>
            )}
          </fieldset>

          {/* Female Dorm Safety Lock + Anonymous Toggle */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'zh' ? '安全規範與隱私設定' : 'Safety & Privacy'}
            </span>

            {!isMaleUser && (
              <div className="flex items-center justify-between p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold text-rose-950 block text-xs">
                      {t.femaleReminder}
                    </span>
                    <span className="text-[11px] text-rose-700">
                      {lang === 'zh'
                        ? '僅生理女帳號可見與接單，並強制實名（禁止匿名）'
                        : 'Visible & claimable only by biological females; real-name required'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={lockCoreFields}
                  checked={effectiveFemaleDormOnly}
                  onChange={(e) => handleToggleFemaleDorm(e.target.checked)}
                  className="accent-rose-600 w-4 h-4 cursor-pointer"
                />
              </div>
            )}

            {effectiveFemaleDormOnly && (
              <div className="p-2.5 bg-rose-100/80 border border-rose-300 rounded-xl text-[11px] text-rose-950 font-semibold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                <span>{t.femaleLockNotice}</span>
              </div>
            )}

            <div
              className={`flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl ${
                effectiveFemaleDormOnly ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    {t.anonymousToggle}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {effectiveFemaleDormOnly
                      ? lang === 'zh'
                        ? '女宿專屬任務已強制鎖定關閉匿名'
                        : 'Disabled for female dorm safety tasks'
                      : lang === 'zh'
                        ? '卡片將隱藏您的暱稱並顯示「🛡️ 匿名防護中」'
                        : 'Masks your nickname on the lobby card'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                disabled={lockCoreFields || effectiveFemaleDormOnly}
                checked={effectiveAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="accent-slate-900 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 cursor-pointer text-xs"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 text-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>{lang === 'zh' ? '儲存中...' : 'Saving...'}</span>
              ) : isEditing ? (
                <span>{lang === 'zh' ? '儲存變更' : 'Save Changes'}</span>
              ) : priceType === 'free' ? (
                <span>{t.publishFreeBtn}</span>
              ) : (
                <span>
                  {lang === 'zh'
                    ? `發布任務（NT$ ${rewardAmount}）`
                    : `Publish Task (NT$ ${rewardAmount})`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
