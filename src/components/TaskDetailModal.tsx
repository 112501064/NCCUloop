import React, { useState } from 'react';
import { PostItem, OrderItem, UserProfile, Language } from '../types';
import { calculateHaversineDistanceMeters, formatDistance } from '../utils/lbs';
import { formatPaymentMethodLabel, formatRemainingMinutes } from '../utils/formatters';
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
} from 'lucide-react';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostItem;
  currentUser: UserProfile;
  existingOrder?: OrderItem | null;
  onApplyAcceptPost: (postId: string) => Promise<{ success: boolean; message: string; order?: OrderItem }>;
  onOpenOrderChat: (order: OrderItem) => void;
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
  lang,
}) => {
  const [isApplying, setIsApplying] = useState<boolean>(false);

  if (!isOpen) return null;
  const t = I18N[lang];

  const distanceMeters = calculateHaversineDistanceMeters(
    currentUser.currentCoordinates,
    post.locationCoordinates
  );
  const formattedDist = formatDistance(distanceMeters);
  const isMyPost = post.creatorId === currentUser.id;
  const hasQuota = post.totalQuota !== undefined && post.remainingQuota !== undefined;
  const isSoldOut = hasQuota && (post.remainingQuota ?? 0) <= 0;

  const displayTime =
    post.remainingMinutes !== undefined
      ? formatRemainingMinutes(post.remainingMinutes, lang)
      : post.timeRemainingText || post.expiresAt;

  const paymentLabel = formatPaymentMethodLabel(post.paymentMethod, lang);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded font-bold uppercase">
              {post.category.toUpperCase()}
            </span>
            <span className="text-slate-400 text-xs">#{post.id.slice(0, 8)}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm">
                {post.isCreatorAnonymous
                  ? post.creatorAnonAlias || (lang === 'zh' ? '政大隱形同學' : 'Anonymous Student')
                  : post.creatorName}
              </span>
              <span className="text-slate-400 font-mono">★{post.creatorTrustScore}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{post.createdAt}</span>
            </div>

            <span className="font-mono text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold shrink-0 tabular-nums">
              {post.rewardAmount === 0 ? t.free : `NT$ ${post.rewardAmount}`}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {lang === 'zh' ? post.title : post.titleEn || post.title}
          </h2>

          {hasQuota && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2 font-bold">
                <Users className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {isSoldOut
                    ? lang === 'zh'
                      ? '名額已領完'
                      : 'All spots claimed'
                    : post.category === 'leftovers'
                      ? lang === 'zh'
                        ? `🍱 剩餘 ${post.remainingQuota} 份可領取`
                        : `🍱 ${post.remainingQuota} portions left`
                      : lang === 'zh'
                        ? `🛒 剩餘 ${post.remainingQuota} 個跟團名額`
                        : `🛒 ${post.remainingQuota} spots left`}
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-800">
                {lang === 'zh' ? '即時扣除名額' : 'Live Quota'}
              </span>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
            {lang === 'zh' ? post.description : post.descriptionEn || post.description}
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold block">
                  {lang === 'zh' ? post.locationName : post.locationNameEn || post.locationName}
                </span>
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {lang === 'zh' ? '付款方式：' : 'Payment: '}
                {paymentLabel}
              </span>
            </div>
            {post.paymentNote && (
              <p className="text-[11px] text-slate-600 pl-5">
                {lang === 'zh' ? '收款備註：' : 'Payment note: '}
                {post.paymentNote}
              </p>
            )}
          </div>

          {post.femaleOnlyRecommended && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-900 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {lang === 'zh'
                  ? '提醒標籤：發布者勾選「建議女性接單」（涉及女宿管制區或個人用品，此為推薦標籤，不作系統強制阻擋）。'
                  : 'Reminder Tag: Female student recommended by creator (non-blocking).'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map((tg, i) => (
              <span key={i} className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {tg}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
          <div className="text-slate-500 text-[11px] truncate">
            {post.rewardAmount === 0
              ? lang === 'zh'
                ? '免費校園互助'
                : 'Free Mutual Aid'
              : lang === 'zh'
                ? `${paymentLabel} · 雙向手動確認`
                : `${paymentLabel} · P2P Confirm`}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {existingOrder ? (
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
            ) : post.status === 'open' && !isSoldOut && !isMyPost ? (
              <button
                type="button"
                disabled={isApplying}
                onClick={handleClaim}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              >
                {isApplying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {hasQuota
                    ? lang === 'zh'
                      ? `我要領取 / 參團 (剩餘 ${post.remainingQuota} 份)`
                      : `Claim Spot (${post.remainingQuota} left)`
                    : lang === 'zh'
                      ? '申請接單 / 開啟對話'
                      : 'Claim Task & Open Chat'}
                </span>
              </button>
            ) : isMyPost ? (
              <span className="px-3 py-2 bg-slate-200 text-slate-700 font-semibold rounded-xl text-[11px]">
                {lang === 'zh' ? '您的發布（可至個人頁管理）' : 'Your Post (Manage in Profile)'}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
