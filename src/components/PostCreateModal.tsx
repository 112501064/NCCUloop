import React, { useState } from 'react';
import { PostCategory, CampusZone, PostItem, UserProfile, PaymentMethod, TimeOption, Language } from '../types';
import { I18N } from '../data/i18n';
import { 
  X, ShieldAlert, MapPin, Clock, DollarSign, UserX, Wand2, Users, Minus, Plus, Wallet
} from 'lucide-react';
import { formatRemainingMinutes } from '../utils/formatters';

interface PostCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreatePost: (newPost: Partial<PostItem>) => void;
  lang: Language;
}

export const PostCreateModal: React.FC<PostCreateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreatePost,
  lang,
}) => {
  if (!isOpen) return null;
  const t = I18N[lang];

  const [category, setCategory] = useState<PostCategory>('leftovers');
  
  // Custom Title & Description (Starts blank for full freedom)
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [titleEn, setTitleEn] = useState<string>('');
  const [descriptionEn, setDescriptionEn] = useState<string>('');
  
  // Multi-quota for leftovers & group_buy (Default 1, range 1..20)
  const [quotaCount, setQuotaCount] = useState<number>(1);
  
  // Smart Pickers: Location
  const [selectedLocName, setSelectedLocName] = useState<string>('綜院');
  const [isCustomLoc, setIsCustomLoc] = useState<boolean>(false);
  const [customLocationName, setCustomLocationName] = useState<string>('');
  
  // Smart Pickers: Price & Manual Payment Confirmation
  const [priceType, setPriceType] = useState<'fixed' | 'free'>('free');
  const [rewardAmount, setRewardAmount] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_meetup');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [payerRole, setPayerRole] = useState<'creator' | 'fulfiller'>('fulfiller');
  
  // Smart Pickers: Time (Default 2 hours)
  const [timeOption, setTimeOption] = useState<TimeOption>('2h');
  const [customTimeText, setCustomTimeText] = useState<string>('今日 18:00 前');
  
  // Additional Options
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [femaleOnly, setFemaleOnly] = useState<boolean>(false);
  
  // AI Refine state
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const presetLocations = [
    { name: '綜院', zone: 'downhill', isFemaleDorm: false },
    { name: '商館', zone: 'downhill', isFemaleDorm: false },
    { name: '季陶樓', zone: 'downhill', isFemaleDorm: false },
    { name: '果夫樓', zone: 'downhill', isFemaleDorm: false },
    { name: '山上綜合大樓', zone: 'uphill', isFemaleDorm: false },
    { name: '莊敬舍', zone: 'dorms', isFemaleDorm: true },
  ];

  const handleSelectCategory = (newCat: PostCategory) => {
    setCategory(newCat);
    if (newCat === 'emergency' || newCat === 'tutor') {
      setPayerRole('creator');
    } else {
      setPayerRole('fulfiller');
    }
    if (newCat === 'leftovers') {
      setPriceType('free');
    }
  };

  // AI Refine Text Feature
  const handleAiRefine = () => {
    setIsRefining(true);

    setTimeout(() => {
      setIsRefining(false);
      const targetLoc = isCustomLoc ? (customLocationName || '政大校園') : selectedLocName;
      const currentTitle = title.trim();
      const currentDesc = description.trim();

      if (category === 'emergency') {
        setTitle(currentTitle ? `【校園急救】${currentTitle.replace(/【.*?】/g, '')}` : `【校園急救】${targetLoc} 急需物資支援`);
        setDescription(
          currentDesc
            ? `【求助地點】${targetLoc}\n【急難說明】${currentDesc}\n【付款說明】採線下/轉帳雙向確認，送達後立即確認結案！`
            : `【求助地點】${targetLoc}\n【急難說明】現場急需備用物資支援，求好心政大同學協助送達！\n【感謝回饋】感謝政大學友伸出援手！`
        );
        setTitleEn(`[Urgent Help] Campus Mutual Aid at ${targetLoc}`);
        setDescriptionEn(`Need immediate assistance at ${targetLoc}. Thank you for helping out!`);
      } else if (category === 'leftovers') {
        setTitle(currentTitle ? `【即時剩食】${currentTitle.replace(/【.*?】/g, '')}` : `【即時剩食】${targetLoc} 多出 ${quotaCount} 份餐點免費自取`);
        setDescription(
          currentDesc
            ? `【取餐地點】${targetLoc}\n【餐點份數】共 ${quotaCount} 份\n【餐點資訊】${currentDesc}\n【惜食說明】活動多出乾淨餐點，歡迎政大同學免費領取。`
            : `【取餐地點】${targetLoc}\n【餐點份數】共 ${quotaCount} 份\n【惜食說明】活動剛結束多出餐點，歡迎政大同學自備提袋免費自取，惜食減廢！`
        );
        setTitleEn(`[Leftover Food] ${quotaCount} Free Meals at ${targetLoc}`);
        setDescriptionEn(`${quotaCount} extra meals from campus event available at ${targetLoc}. Free for NCCU students.`);
      } else {
        setTitle(currentTitle ? `【校園互助】${currentTitle.replace(/【.*?】/g, '')}` : `【校園互助】${targetLoc} 需求交流與面交`);
        setDescription(
          currentDesc
            ? `【交涉地點】${targetLoc}\n【詳細內容】${currentDesc}\n【付款確認】採線下現金 / 事前轉帳雙向確認，雙方點擊後完成結案。`
            : `【交涉地點】${targetLoc}\n【詳細內容】校園物品/車票/揪團交流\n【付款確認】線下/轉帳雙向確認結案。`
        );
        setTitleEn(`[Campus Aid] Mutual Exchange at ${targetLoc}`);
        setDescriptionEn(`Campus exchange at ${targetLoc}. Dual payment confirmation supported.`);
      }
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const locName = isCustomLoc ? (customLocationName || '政大校園') : selectedLocName;
    const locZone: CampusZone = (locName.includes('山上') || locName.includes('綜合大樓'))
      ? 'uphill'
      : (locName.includes('舍') ? 'dorms' : 'downhill');

    const mins = timeOption === '15m' ? 15 : timeOption === '30m' ? 30 : timeOption === '1h' ? 60 : 120;
    const isQuotaCategory = category === 'leftovers' || category === 'group_buy';

    setTimeout(() => {
      onCreatePost({
        creatorId: currentUser.id,
        creatorName: currentUser.nickname || currentUser.name,
        creatorGender: currentUser.gender,
        creatorTrustScore: currentUser.trustScore,
        isCreatorAnonymous: isAnonymous,
        creatorAnonAlias: isAnonymous ? `政大隱形同學 #${Math.floor(1000 + Math.random() * 9000)}` : undefined,
        category,
        title: title.trim() || (category === 'leftovers' ? `${locName} 多出 ${quotaCount} 份餐點歡迎自取` : category === 'emergency' ? `${locName} 急需校園支援` : `${locName} 校園互助任務`),
        titleEn: titleEn || title.trim() || 'Campus Mutual Aid Task',
        description: description.trim() || '詳細交涉細節請點選申請接單後於 1-on-1 聊天室溝通。',
        descriptionEn: descriptionEn || description.trim() || 'Campus task. Contact in chat.',
        tags: [
          category === 'emergency' ? '#緊急求救' : category === 'leftovers' ? '#即時剩食' : category === 'group_buy' ? '#揪團預購' : '#校園互助',
          `#${locName.split(' ')[0]}`,
          priceType === 'free' ? '#免費互助' : `#NT$${rewardAmount}`
        ],
        rewardAmount: priceType === 'free' ? 0 : Number(rewardAmount),
        isNegotiable: false,
        escrowDeposit: priceType === 'free' ? 0 : Number(rewardAmount),
        paymentMethod: priceType === 'free' ? 'free_aid' : paymentMethod,
        paymentNote: priceType === 'free' ? undefined : paymentNote.trim() || undefined,
        payerRole: priceType === 'free' ? undefined : payerRole,
        payerMarkedPaid: false,
        payeeConfirmedReceived: false,
        totalQuota: isQuotaCategory ? quotaCount : undefined,
        remainingQuota: isQuotaCategory ? quotaCount : undefined,
        claimedByUserIds: isQuotaCategory ? [] : undefined,
        timeOption,
        remainingMinutes: mins,
        timeRemainingText: timeOption === 'custom_time' ? customTimeText : formatRemainingMinutes(mins, lang),
        status: 'open',
        locationName: locName,
        locationZone: locZone,
        femaleOnlyRecommended: femaleOnly,
        minTrustScoreRequired: 60,
        createdAt: '剛剛',
        expiresAt: timeOption === '15m' ? '15 分鐘後' : timeOption === '30m' ? '30 分鐘後' : '2 小時後',
      });
      setIsSubmitting(false);
      onClose();
    }, 450);
  };

  const showQuotaSelector = category === 'leftovers' || category === 'group_buy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-900 text-white">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              NCCU LOOP · FLEXIBLE TASK ENGINE
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              {lang === 'zh' ? '發布校園任務與互助需求' : 'Create Campus Task & Mutual Aid'}
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
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id as PostCategory)}
                  className={`py-2 px-2.5 rounded-xl border text-center font-medium cursor-pointer transition-colors ${
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
          {showQuotaSelector && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold text-amber-950 block text-xs">
                    {lang === 'zh' ? '開放名額 / 份數' : 'Available Spots / Portions'}
                  </span>
                  <span className="text-[11px] text-amber-800">
                    {lang === 'zh'
                      ? '每領取 1 份自動扣減，歸零才下架 (1~20)'
                      : 'Decrements per claim until 0 left (1-20)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQuotaCount(q => Math.max(1, q - 1))}
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
                  onClick={() => setQuotaCount(q => Math.min(20, q + 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-900 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* AI Refine Button & Title Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-bold">
                {lang === 'zh' ? '任務標題 (空白自由輸入)' : 'Task Title (Custom)'}
              </label>
              <button
                type="button"
                onClick={handleAiRefine}
                disabled={isRefining}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                {isRefining ? (
                  <>
                    <div className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.aiRefining}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3 text-emerald-600" />
                    <span>{lang === 'zh' ? '✨ AI 潤飾 / 翻譯' : '✨ AI Refine / Translate'}</span>
                  </>
                )}
              </button>
            </div>

            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'zh' ? '自由輸入標題 (例：法學院演講多出 5 份便當)...' : 'Enter custom task title...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* Content Description */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {lang === 'zh' ? '詳細需求描述 (自由補充)' : 'Detailed Description'}
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang === 'zh' ? '請說明交付位置、物資細節或連絡方式...' : 'Meeting point, details, or notes...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 leading-relaxed font-sans"
            />
          </div>

          {/* Smart Pickers: Location Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'zh' ? '地點選擇器 (NCCU LBS)' : 'Location Picker'}</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {isCustomLoc ? (customLocationName || '自訂地點') : selectedLocName}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {presetLocations.map(loc => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    setIsCustomLoc(false);
                    setSelectedLocName(loc.name);
                    if (loc.isFemaleDorm) setFemaleOnly(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    !isCustomLoc && selectedLocName === loc.name
                      ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {loc.name}
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
                + 自訂地點...
              </button>
            </div>

            {isCustomLoc && (
              <input
                type="text"
                value={customLocationName}
                onChange={(e) => setCustomLocationName(e.target.value)}
                placeholder={lang === 'zh' ? '請輸入政大自訂地點 (例：達賢二樓、自強十舍)...' : 'Custom location...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            )}
          </div>

          {/* Smart Pickers: Time Range */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'zh' ? '時限設定' : 'Time Limit'}</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-medium">
                {timeOption === '2h' ? '⚡ 預設 2 小時' : timeOption}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setTimeOption('2h')}
                className={`p-2 rounded-xl border text-center cursor-pointer text-xs ${
                  timeOption === '2h' ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                2 小時 (預設)
              </button>
              <button
                type="button"
                onClick={() => setTimeOption('15m')}
                className={`p-2 rounded-xl border text-center cursor-pointer text-xs ${
                  timeOption === '15m' ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                15 分鐘急件
              </button>
              <button
                type="button"
                onClick={() => setTimeOption('30m')}
                className={`p-2 rounded-xl border text-center cursor-pointer text-xs ${
                  timeOption === '30m' ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                30 分鐘
              </button>
              <button
                type="button"
                onClick={() => setTimeOption('custom_time')}
                className={`p-2 rounded-xl border text-center cursor-pointer text-xs ${
                  timeOption === 'custom_time' ? 'bg-slate-900 text-white font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                自訂時間
              </button>
            </div>
            {timeOption === 'custom_time' && (
              <input
                type="text"
                value={customTimeText}
                onChange={(e) => setCustomTimeText(e.target.value)}
                placeholder="例如：今日 14:00 前、本週五中午..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
              />
            )}
          </div>

          {/* Manual Payment Confirmation System (No auto-charge API) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'zh' ? '價格與手動金流確認制' : 'Pricing & Manual Payment'}</span>
              </label>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPriceType('free')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                    priceType === 'free' ? 'bg-emerald-700 text-white font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  免費互助
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType('fixed')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                    priceType === 'fixed' ? 'bg-slate-900 text-white font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  自訂金額
                </button>
              </div>
            </div>

            {priceType === 'fixed' ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-xs">{lang === 'zh' ? '任務/分攤金額：' : 'Amount (NTD):'}</span>
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

                {/* Payment Mode Selection */}
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    {lang === 'zh' ? '選擇支付方式（線下/轉帳雙向確認，不預扣款）：' : 'Select Payment Mode (Dual Confirmation):'}
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
                      💵 面交現金
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
                      📲 事前轉帳（街口 / 台灣 Pay / Line Pay）
                    </button>
                  </div>
                </div>

                {/* Payment Flow Direction */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                  <span>{lang === 'zh' ? '金流角色方向：' : 'Payment Direction:'}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPayerRole('fulfiller')}
                      className={`px-2 py-0.5 rounded-md border cursor-pointer ${
                        payerRole === 'fulfiller' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      對方付給我
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayerRole('creator')}
                      className={`px-2 py-0.5 rounded-md border cursor-pointer ${
                        payerRole === 'creator' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      我付謝禮給對方
                    </button>
                  </div>
                </div>

                {/* Optional Account / Payment Link Note */}
                <div>
                  <label className="text-[11px] text-slate-600 font-medium block mb-1">
                    {lang === 'zh' ? '收款帳號或收款連結備註 (選填)' : 'Payment Account / Link Note (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder={lang === 'zh' ? '例：街口帳號 901234567 / Line Pay 現場掃碼...' : 'e.g. JKOPAY ID / Line Pay QR at meetup...'}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-900 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80">
                ❤️ 本任務為純互助無償分享，無需付款，雙方於聊天室確認即可完成！
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'zh' ? '附加選項 (Additional Options)' : 'Additional Options'}
            </span>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    {lang === 'zh' ? '雙向匿名發布' : 'Post Anonymously'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {lang === 'zh' ? '遮蔽姓名與照片，雙方同意後才可揭示身分' : 'Mask profile; reveal only on mutual consent'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="accent-slate-900 w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    {lang === 'zh' ? '僅限女宿 / 特定條件提醒 (附加標籤)' : 'Female Dorm Reminder (Non-blocking)'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {lang === 'zh' ? '作為友善提醒標籤顯示於卡片中，非強制阻擋' : 'Friendly recommendation tag on card'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={femaleOnly}
                onChange={(e) => setFemaleOnly(e.target.checked)}
                className="accent-rose-600 w-4 h-4 cursor-pointer"
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
                <span>{lang === 'zh' ? '發布中...' : 'Publishing...'}</span>
              ) : priceType === 'free' ? (
                <span>{lang === 'zh' ? '免費發布互助' : 'Publish Free Aid'}</span>
              ) : (
                <span>
                  {lang === 'zh'
                    ? `發布任務（${paymentMethod === 'cash_meetup' ? '面交現金' : '事前轉帳'} · NT$ ${rewardAmount}）`
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
