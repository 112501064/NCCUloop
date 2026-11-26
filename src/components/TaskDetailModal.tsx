import React, { useState } from 'react';
import { PostItem, OrderItem, UserProfile, Language } from '../types';
import {
  calculateHaversineDistanceMeters,
  formatDistance,
  isFemaleDormLocationName,
} from '../utils/lbs';
import {
  formatPaymentMethodLabel,
  formatRemainingMinutes,
  localizeTimeString,
} from '../utils/formatters';
import {
  useAutoTranslateText,
  useAutoTranslateLocation,
  useAutoTranslateArray,
} from '../hooks/useAutoTranslate';
import { I18N } from '../data/i18n';
import {
  X,
  MapPin,
  Clock,
  ShieldAlert,
  MessageSquare,
  CreditCard,
  Users,
  Loader2,
  Flag,
  Pencil,
  Trash2,
  Siren,
  Lock,
} from 'lucide-react';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostItem;
  currentUser: UserProfile;
  existingOrder?: OrderItem | null;
  onApplyAcceptPost: (
    postId: string
  ) => Promise<{ success: boolean; message: string; order?: OrderItem }>;
  onOpenOrderChat: (order: OrderItem) => void;
  onReportPost: (post: PostItem) => void;
  onEditPost: (post: PostItem) => void;
  onDeletePost: (post: PostItem) => void;
  lang: Language;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  post,
  currentUser,
  existingOrder,
  onApplyAcceptPost,
  onOpenOrderChat,
  onReportPost,
  onEditPost,
  onDeletePost,
  lang,
}) => {
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const displayTitle = useAutoTranslateText(post.title, lang, post.titleEn);
  const displayDesc = useAutoTranslateText(post.description, lang, post.descriptionEn);
  const displayPaymentNote = useAutoTranslateText(post.paymentNote, lang);
  const displayLocation = useAutoTranslateLocation(
    post.locationName,
    lang,
    post.locationNameEn
  );
  const displayTags = useAutoTranslateArray(post.tags, lang);

  if (!isOpen) return null;
  const t = I18N[lang];

  const distanceMeters = calculateHaversineDistanceMeters(
    currentUser.currentCoordinates,
    post.locationCoordinates
  );
  const formattedDist = formatDistance(distanceMeters);

  const isMyPost = post.creatorId === currentUser.id;
  const isEmergency = post.category === 'emergency';
  const isLeftovers = post.category === 'leftovers';
  const isGroupBuy = post.category === 'group_buy';
  const isFemaleDormTask = Boolean(
    post.isFemaleDormOnly || isFemaleDormLocationName(post.locationName)
  );
  const isBlockedBySex = isFemaleDormTask && currentUser.biologicalSex !== 'female';

  // STRICT QUOTA GUARD: Only leftovers & group_buy show quota blocks (NEVER emergency SOS!)
  const showQuotaPanel =
    (isLeftovers || isGroupBuy) &&
    post.totalQuota !== undefined &&
    post.remainingQuota !== undefined;
  const isSoldOut = showQuotaPanel && (post.remainingQuota ?? 0) <= 0;

  const displayTime =
    post.remainingMinutes !== undefined
      ? formatRemainingMinutes(post.remainingMinutes, lang)
      : post.timeRemainingText || post.expiresAt;

  const paymentLabel = formatPaymentMethodLabel(post.paymentMethod, lang);
  const directionLabel =
    post.rewardAmount === 0 || post.paymentDirection === 'free'
      ? lang === 'zh'
        ? '0 元免費互助'
        : 'Free Mutual Aid'
      : post.paymentDirection === 'creator_pays' || post.payerRole === 'creator'
        ? lang === 'zh'
          ? '應付款方：發布者'
          : 'Payer: Creator'
        : lang === 'zh'
          ? '應付款方：接單者'
          : 'Payer: Accepter';

  const handleClaim = async () => {
    setIsApplying(true);
    try {
      const res = await onApplyAcceptPost(post.id);
      if (res.success) {
        onClose();
        if (res.order) {
          onOpenOrderChat(res.order);
        }
      }
    } finally {
      setIsApplying(false);
    }
  };

  const categoryBadgeLabel = isEmergency
    ? lang === 'zh'
      ? '🆘 緊急求救'
      : '🆘 EMERGENCY SOS'
    : isLeftovers
      ? lang === 'zh'
        ? '🍱 即時剩食'
        : '🍱 LEFTOVERS'
      : isGroupBuy
        ? lang === 'zh'
          ? '🛒 揪團預購'
          : '🛒 GROUP BUY'
        : post.category.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden text-xs flex flex-col max-h-[90vh]">
        {/* Header (Red Emergency Styling for SOS, Slate for standard) */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 text-white ${
            isEmergency
              ? 'bg-rose-950 border-rose-800'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1 ${
                isEmergency
                  ? 'bg-rose-500/30 text-rose-100 border border-rose-400/50'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
              }`}
            >
              {isEmergency && <Siren className="w-3 h-3" />}
              <span>{categoryBadgeLabel}</span>
            </span>
            {isFemaleDormTask && (
              <span className="text-[10px] bg-rose-500/25 text-rose-100 border border-rose-300/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>{lang === 'zh' ? '女宿實名專屬' : 'Female Dorm · Real-ID'}</span>
              </span>
            )}
            {post.isCreatorAnonymous === true && !isFemaleDormTask && (
              <span className="text-[10px] bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-semibold">
                {lang === 'zh' ? '🛡️ 匿名防護中' : '🛡️ Anonymous'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!isMyPost && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReportPost(post);
                }}
                className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-500/40 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3 h-3 text-rose-300" />
                <span>{t.reportDispute}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Creator Header Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm">
                {isFemaleDormTask
                  ? post.creatorRealName
                    ? `${post.creatorName}（${post.creatorRealName}）`
                    : post.creatorName
                  : post.isCreatorAnonymous === true
                    ? lang === 'zh'
                      ? '匿名同學'
                      : 'Anonymous Member'
                    : post.creatorName}
              </span>
              {post.isCreatorAnonymous === true && !isFemaleDormTask && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {lang === 'zh' ? '🛡️ 匿名防護中' : '🛡️ Anonymous'}
                </span>
              )}
              <span className="text-slate-400 font-mono">★{post.creatorTrustScore}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{localizeTimeString(post.createdAt, lang)}</span>
            </div>

            <span className="font-mono text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold shrink-0 tabular-nums">
              {post.rewardAmount === 0 ? t.free : `NT$ ${post.rewardAmount}`}
            </span>
          </div>

          {/* Emergency SOS Banner */}
          {isEmergency && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-900 text-xs font-semibold">
              <Siren className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {lang === 'zh'
                  ? '校園緊急求助：若您在附近且能提供協助，請點擊下方按鈕立刻聯絡！'
                  : 'Urgent Campus SOS: Tap below to help immediately if you are nearby!'}
              </span>
            </div>
          )}

          {/* Female Dorm Safety Policy Banner */}
          {isFemaleDormTask && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-950 text-xs font-semibold">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{t.femaleLockNotice}</span>
            </div>
          )}

          {/* Auto-translated Title */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {displayTitle}
            </h2>
          </div>

          {/* Quota Panel — STRICTLY ONLY for leftovers & group_buy */}
          {showQuotaPanel && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2 font-bold">
                <Users className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {isSoldOut
                    ? lang === 'zh'
                      ? '名額已額滿'
                      : 'All spots claimed'
                    : isLeftovers
                      ? lang === 'zh'
                        ? `🍱 剩餘 ${post.remainingQuota} 份可領取`
                        : `🍱 ${post.remainingQuota} portions left`
                      : lang === 'zh'
                        ? `🛒 剩餘 ${post.remainingQuota} 個跟團名額`
                        : `🛒 ${post.remainingQuota} group-buy spots left`}
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-800">
                {lang === 'zh' ? `總名額 ${post.totalQuota} 份` : `${post.totalQuota} total`}
              </span>
            </div>
          )}

          {/* Auto-translated Description */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
            {displayDesc}
          </div>

          {/* Location & Distance */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold block">{displayLocation}</span>
                <span className="text-[11px] text-emerald-800">
                  {lang === 'zh' ? '目前距您約' : 'Approx. distance:'} <strong>{formattedDist}</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-700 bg-white/90 px-2.5 py-1 rounded-lg border border-emerald-200 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{displayTime}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {lang === 'zh' ? '付款方式：' : 'Payment: '}
                  {paymentLabel}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {directionLabel}
              </span>
            </div>
            {displayPaymentNote && (
              <p className="text-[11px] text-slate-600 pl-5">
                {lang === 'zh' ? '收款備註：' : 'Payment note: '}
                {displayPaymentNote}
              </p>
            )}
          </div>

          {post.femaleOnlyRecommended && !isFemaleDormTask && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-900 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {lang === 'zh'
                  ? '提醒標籤：發布者勾選「建議女性接單」。'
                  : 'Reminder Tag: Female participant recommended.'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {displayTags.map((tg, i) => (
              <span
                key={i}
                className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md"
              >
                {tg}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 bg-slate-50">
          <div className="text-slate-500 text-[11px] truncate">
            {post.rewardAmount === 0
              ? lang === 'zh'
                ? '免費校園互助'
                : 'Free Mutual Aid'
              : `${paymentLabel} · ${directionLabel}`}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isMyPost ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditPost(post);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '編輯任務' : 'Edit Task'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDeletePost(post);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '刪除任務' : 'Delete'}</span>
                </button>
              </>
            ) : existingOrder ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrderChat(existingOrder);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '進入專屬 1-on-1 聊天室' : 'Open Order Chat'}</span>
              </button>
            ) : isBlockedBySex ? (
              <span className="px-3 py-2 bg-rose-100 text-rose-800 font-bold rounded-xl text-[11px]">
                {lang === 'zh' ? '僅限生理女性接單' : 'Biological Female Only'}
              </span>
            ) : post.status === 'open' && !isSoldOut ? (
              <button
                type="button"
                disabled={isApplying}
                onClick={handleClaim}
                className={`px-5 py-2.5 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
                  isEmergency
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isApplying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isEmergency
                    ? lang === 'zh'
                      ? '前往協助 / 我可以幫忙'
                      : 'Help Now / I Can Help'
                    : isLeftovers
                      ? lang === 'zh'
                        ? `我要領取剩食 (剩餘 ${post.remainingQuota} 份)`
                        : `Claim Meal (${post.remainingQuota} left)`
                      : isGroupBuy
                        ? lang === 'zh'
                          ? `我要參團 (剩餘 ${post.remainingQuota} 名額)`
                          : `Join Group Buy (${post.remainingQuota} left)`
                        : lang === 'zh'
                          ? '申請接單 / 開啟對話'
                          : 'Apply & Open Chat'}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
