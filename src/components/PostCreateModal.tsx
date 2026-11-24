import React, { useState } from 'react';
import { PostCategory, EmergencySubcategory, CampusZone, PostItem, UserProfile, PaymentMethod, TimeOption, Language } from '../types';
import { NCCU_LOCATIONS } from '../data/mockData';
import { I18N } from '../data/i18n';
import { 
  X, ShieldAlert, CreditCard, Sparkles, CheckCircle2, 
  MapPin, Clock, DollarSign, UserX, Wand2
} from 'lucide-react';

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

  const [category, setCategory] = useState<PostCategory>('emergency');
  const [subcategory, setSubcategory] = useState<EmergencySubcategory>('sanitary_pad');
  
  // Custom Title & Description (No rigid lock-in, starts blank)
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [titleEn, setTitleEn] = useState<string>('');
  const [descriptionEn, setDescriptionEn] = useState<string>('');
  
  // Smart Pickers: Location
  const [selectedLocName, setSelectedLocName] = useState<string>('綜院');
  const [isCustomLoc, setIsCustomLoc] = useState<boolean>(false);
  const [customLocationName, setCustomLocationName] = useState<string>('');
  
  // Smart Pickers: Price & Payment
  const [priceType, setPriceType] = useState<'fixed' | 'free'>('free');
  const [rewardAmount, setRewardAmount] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('line_pay');
  
  // Smart Pickers: Time (Default 2 hours)
  const [timeOption, setTimeOption] = useState<TimeOption>('2h');
  const [customTimeText, setCustomTimeText] = useState<string>('今日 18:00 前');
  
  // Anonymity & Guardrails
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [femaleOnly, setFemaleOnly] = useState<boolean>(false);
  const [minTrustScore, setMinTrustScore] = useState<number>(60);
  
  // AI Refine state
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refineSuccess, setRefineSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Preset location quick buttons
  const presetLocations = [
    { name: '綜院', zone: 'downhill', isFemaleDorm: false },
    { name: '商館', zone: 'downhill', isFemaleDorm: false },
    { name: '季陶樓', zone: 'downhill', isFemaleDorm: false },
    { name: '果夫樓', zone: 'downhill', isFemaleDorm: false },
    { name: '山上綜合大樓', zone: 'uphill', isFemaleDorm: false },
    { name: '莊敬舍', zone: 'dorms', isFemaleDorm: true },
  ];

  // AI Refine Text Feature
  const handleAiRefine = () => {
    setIsRefining(true);
    setRefineSuccess(false);

    setTimeout(() => {
      setIsRefining(false);
      setRefineSuccess(true);

      const targetLoc = isCustomLoc ? (customLocationName || '政大校園') : selectedLocName;
      const currentTitle = title.trim();
      const currentDesc = description.trim();

      if (category === 'emergency') {
        const refinedZhTitle = currentTitle 
          ? `【校園急救】${currentTitle.replace(/【.*?】/g, '')}` 
          : `【校園急救】${targetLoc} 急需物資支援`;
        const refinedZhDesc = currentDesc 
          ? `【求助地點】${targetLoc}\n【急難說明】${currentDesc}\n【互助感謝】感謝政大學友即時援助！已由平台預扣履約保障。` 
          : `【求助地點】${targetLoc}\n【急難說明】現場急需相關備用物資支援，求好心政大同學協助送達！\n【互助感謝】感謝好心政大學友伸出援手！`;
        setTitle(refinedZhTitle);
        setDescription(refinedZhDesc);
        setTitleEn(`[Urgent Help] Campus Mutual Aid at ${targetLoc}`);
        setDescriptionEn(`Need immediate assistance at ${targetLoc}. Thank you for helping out!`);
      } else if (category === 'leftovers') {
        const refinedZhTitle = currentTitle 
          ? `【即時剩食】${currentTitle.replace(/【.*?】/g, '')}` 
          : `【即時剩食】${targetLoc} 鮮食餐點免費自取，惜食不浪費！`;
        const refinedZhDesc = currentDesc 
          ? `【取餐地點】${targetLoc}\n【餐點資訊】${currentDesc}\n【惜食說明】活動多出乾淨餐點，歡迎政大同學自備餐盒前往免費自取。` 
          : `【取餐地點】${targetLoc}\n【餐點資訊】活動多出多份便當餐盒\n【惜食說明】歡迎政大同學自備提袋免費自取，惜食減廢！`;
        setTitle(refinedZhTitle);
        setDescription(refinedZhDesc);
        setTitleEn(`[Leftover Food Rescue] Free Meals Available at ${targetLoc}`);
        setDescriptionEn(`Extra meals from campus event available at ${targetLoc}. Free for NCCU students.`);
      } else {
        const refinedZhTitle = currentTitle 
          ? `【校園互助】${currentTitle.replace(/【.*?】/g, '')}` 
          : `【校園互助】${targetLoc} 需求交流與面交`;
        const refinedZhDesc = currentDesc 
          ? `【交涉地點】${targetLoc}\n【詳細內容】${currentDesc}\n【交易保障】款項透過第三方金流履約專戶預扣，雙向確認無異議後撥款。` 
          : `【交涉地點】${targetLoc}\n【詳細內容】校園二手物資/車票/教學互助\n【交易保障】履約專戶保障，面交雙方確認結案。`;
        setTitle(refinedZhTitle);
        setDescription(refinedZhDesc);
        setTitleEn(`[Campus Aid] Mutual Exchange at ${targetLoc}`);
        setDescriptionEn(`Campus exchange at ${targetLoc}. Escrow protected.`);
      }

      setTimeout(() => setRefineSuccess(false), 3000);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const locName = isCustomLoc ? (customLocationName || '政大校園') : selectedLocName;
    const locZone: CampusZone = (locName.includes('山上') || locName.includes('綜合大樓'))
      ? 'uphill'
      : (locName.includes('舍') ? 'dorms' : 'downhill');

    setTimeout(() => {
      onCreatePost({
        creatorId: currentUser.id,
        creatorName: currentUser.name,
        creatorGender: currentUser.gender,
        creatorTrustScore: currentUser.trustScore,
        isCreatorAnonymous: isAnonymous,
        creatorAnonAlias: isAnonymous ? `政大隱形同學 #${Math.floor(1000 + Math.random() * 9000)}` : undefined,
        category,
        subcategory: category === 'emergency' ? subcategory : undefined,
        title: title || (category === 'leftovers' ? '活動多出餐點免費自取' : category === 'emergency' ? '急需校園物資支援' : '校園物品與互助需求'),
        titleEn: titleEn || title || 'Campus Mutual Aid Task',
        description: description || '詳細面交與互助地點請見標題或直接申請接單於私訊溝通。',
        descriptionEn: descriptionEn || description || 'Campus task. Contact in chat.',
        tags: [
          category === 'emergency' ? '#緊急求救' : category === 'leftovers' ? '#即時剩食' : '#校園互助',
          `#${locName.split(' ')[0]}`,
          priceType === 'free' ? '#免費互助' : `#NT$${rewardAmount}`
        ],
        rewardAmount: priceType === 'free' ? 0 : Number(rewardAmount),
        isNegotiable: false,
        escrowDeposit: priceType === 'free' ? 0 : Number(rewardAmount),
        paymentMethod: priceType === 'free' ? 'free_aid' : paymentMethod,
        timeOption,
        timeRemainingText: timeOption === '2h' 
          ? '⏳ 2 小時' 
          : timeOption === '15m' 
          ? '⚡ 15 分鐘' 
          : timeOption === '30m' 
          ? '🆘 30 分鐘' 
          : customTimeText,
        status: 'open',
        locationName: locName,
        locationZone: locZone,
        femaleOnlyRecommended: femaleOnly,
        minTrustScoreRequired: minTrustScore,
        createdAt: '剛剛',
        expiresAt: timeOption === '15m' ? '15 分鐘後自動退款' : timeOption === '30m' ? '30 分鐘後自動退款' : '2 小時後',
      });
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

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
                { id: 'emergency', label: '🚨 緊急求救', labelEn: '🚨 Emergency SOS' },
                { id: 'marketplace', label: '📦 二手課本用品', labelEn: '📦 Marketplace' },
                { id: 'ticket', label: '🎫 車票票券', labelEn: '🎫 Tickets' },
                { id: 'tutor', label: '🎓 家教伴讀', labelEn: '🎓 Tutoring' },
                { id: 'carpool', label: '🛵 機車共乘', labelEn: '🛵 Ride Share' },
                { id: 'food_share', label: '☕ 剩食團購', labelEn: '☕ Food Share' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as PostCategory)}
                  className={`py-2 px-2.5 rounded-xl border text-center font-medium cursor-pointer transition-colors ${
                    category === cat.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'zh' ? cat.label : cat.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* AI Refine Button & Title Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-bold">
                {lang === 'zh' ? '任務標題 (自由自訂)' : 'Task Title (Custom)'}
              </label>
              
              {/* AI Refine Action */}
              <button
                type="button"
                onClick={handleAiRefine}
                disabled={isRefining}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                title="自動將簡短描述潤飾為排版齊整、語意禮貌之發文"
              >
                {isRefining ? (
                  <>
                    <div className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.aiRefining}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3 text-emerald-600" />
                    <span>{t.aiRefineBtn}</span>
                  </>
                )}
              </button>
            </div>

            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'zh' ? '請輸入發文標題...' : 'Enter post title...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* Content Description */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {lang === 'zh' ? '詳細需求描述 (支援自由換行與補充)' : 'Detailed Description'}
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang === 'zh' ? '請詳述物品情況、交付細節或特殊急難狀況...' : 'Detailed description, meeting instructions, or urgency details...'}
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

            {/* Quick Landmark Capsules */}
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
                placeholder={lang === 'zh' ? '請輸入政大自訂地點 (例：達賢二樓、自強十舍交誼廳...)' : 'Custom location...'}
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
                placeholder="例如：今日 14:00 前、本週五中午、期末考週..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
              />
            )}
          </div>

          {/* Smart Pickers: Price & Escrow Multi-gateway */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'zh' ? '價格模式與預扣保證金 (Escrow)' : 'Pricing & Escrow'}</span>
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
                  <span className="text-slate-600 text-xs">{lang === 'zh' ? '預先扣款押金：' : 'Pre-Auth Escrow Deposit:'}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold font-mono">NT$</span>
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(Number(e.target.value))}
                      className="w-24 bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    {lang === 'zh' ? '第三方履約託管金流 (完成後撥款)：' : 'Escrow Gateway:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'jko_pay', label: '街口支付' },
                      { id: 'taiwan_pay', label: '台灣 Pay' },
                      { id: 'line_pay', label: 'Line Pay' },
                      { id: 'credit_card', label: '信用卡' },
                    ].map(gate => (
                      <button
                        key={gate.id}
                        type="button"
                        onClick={() => setPaymentMethod(gate.id as PaymentMethod)}
                        className={`p-2 rounded-xl border text-center font-semibold cursor-pointer text-xs transition-all ${
                          paymentMethod === gate.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {gate.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-900 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80">
                ❤️ 本任務為純互助無償分享，不進行預扣款，完成後雙方互獲信用評分！
              </div>
            )}
          </div>

          {/* Additional Options (附加選項: 匿名發布、僅限女宿/特定條件提醒) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'zh' ? '附加選項 (Additional Options)' : 'Additional Options'}
            </span>

            {/* Anonymity Toggle */}
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

            {/* Female Dorm / Specific Condition Reminder Tag */}
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
                <span>{lang === 'zh' ? '金流預扣款處理中...' : 'Processing...'}</span>
              ) : priceType === 'free' ? (
                <span>{lang === 'zh' ? '免費發布互助' : 'Publish Free Aid'}</span>
              ) : (
                <span>
                  {lang === 'zh'
                    ? `預扣款 NT$ ${rewardAmount} 並發布（支援街口 / 台灣 Pay / Line Pay）`
                    : `Pre-Authorize NT$ ${rewardAmount} & Publish`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
