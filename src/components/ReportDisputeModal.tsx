import React, { useState } from 'react';
import { OrderItem, PostItem, UserProfile, DisputeCategory, Language } from '../types';
import { I18N } from '../data/i18n';
import { X, AlertTriangle, ShieldAlert, Lock } from 'lucide-react';

interface ReportDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: OrderItem | null;
  post?: PostItem | null;
  currentUser: UserProfile;
  onSubmitReport: (params: {
    order?: OrderItem | null;
    post?: PostItem | null;
    category: DisputeCategory;
    description: string;
  }) => Promise<void> | void;
  lang: Language;
}

export const ReportDisputeModal: React.FC<ReportDisputeModalProps> = ({
  isOpen,
  onClose,
  order,
  post,
  currentUser,
  onSubmitReport,
  lang,
}) => {
  const [category, setCategory] = useState<DisputeCategory>('no_show');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || (!order && !post)) return null;

  const t = I18N[lang];

  let targetUserLabel = '';
  let contextTitle = '';
  if (order) {
    const isCreator = currentUser.id === order.creatorUid;
    const bothRevealed = order.revealCreator && order.revealAccepter;
    const peerNick = isCreator ? order.accepterName : order.creatorName;
    const peerReal = isCreator ? order.accepterRealName : order.creatorRealName;
    targetUserLabel = bothRevealed
      ? peerReal
        ? `${peerNick}（${peerReal}）`
        : peerNick
      : lang === 'zh'
        ? '匿名同學'
        : 'Anonymous Peer';
    contextTitle = order.taskTitle;
  } else if (post) {
    targetUserLabel =
      post.isCreatorAnonymous === true
        ? lang === 'zh'
          ? '匿名同學'
          : 'Anonymous Student'
        : post.creatorName;
    contextTitle = post.title;
  }

  const categories: { id: DisputeCategory; label: string }[] = [
    { id: 'no_show', label: t.disputeNoShow },
    { id: 'money_dispute', label: t.disputeMoney },
    { id: 'harassment', label: t.disputeHarassment },
    { id: 'impersonation', label: t.disputeImpersonation },
    { id: 'other', label: t.disputeOther },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitReport({
        order,
        post,
        category,
        description: description.trim() || '校園安全舉報提交',
      });
      setDescription('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold">{t.disputeTitle}</h3>
              <p className="text-[11px] text-rose-200 truncate">
                {lang === 'zh' ? '對象：' : 'Target: '}
                {targetUserLabel} · {contextTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-rose-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Banner */}
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-950 flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            {lang === 'zh'
              ? '提交舉報後將立即受理並留存紀錄；若查證違規成立，違規方信任指數將扣除 10 分。'
              : 'Your report is immediately recorded. Confirmed violations deduct 10 trust points from the offending account.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">{t.disputeReason}</label>
            <div className="space-y-1.5">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    category === cat.id
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="disputeCategory"
                    checked={category === cat.id}
                    onChange={() => setCategory(cat.id)}
                    className="accent-rose-600"
                  />
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {lang === 'zh' ? '補充說明 (選填)' : 'Additional Details (Optional)'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                lang === 'zh'
                  ? '請簡述事發經過、約定時間與具體問題...'
                  : 'Describe timeline, agreed meeting point, and details...'
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-700"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>{lang === 'zh' ? '送出中...' : 'Submitting...'}</span>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t.submitDispute}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
