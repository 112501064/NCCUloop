import React, { useState } from 'react';
import { OrderItem, UserProfile, DisputeCategory, Language } from '../types';
import { I18N } from '../data/i18n';
import { X, AlertTriangle, ShieldAlert, Lock } from 'lucide-react';

interface ReportDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem;
  currentUser: UserProfile;
  onSubmitDispute: (order: OrderItem, category: DisputeCategory, description: string) => Promise<void> | void;
  lang: Language;
}

export const ReportDisputeModal: React.FC<ReportDisputeModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUser,
  onSubmitDispute,
  lang,
}) => {
  const [category, setCategory] = useState<DisputeCategory>('no_show');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const t = I18N[lang];
  const isCreator = currentUser.id === order.creatorUid;
  const bothRevealed = order.revealCreator && order.revealAccepter;
  const targetUserName = isCreator
    ? bothRevealed || !order.accepterAnonymous
      ? order.accepterName
      : order.accepterAnonAlias || '匿名接單同學'
    : bothRevealed || !order.creatorAnonymous
      ? order.creatorName
      : order.creatorAnonAlias || '匿名發布者';

  const categories: { id: DisputeCategory; label: string }[] = [
    { id: 'harassment', label: t.disputeHarassment },
    { id: 'no_show', label: t.disputeNoShow },
    { id: 'malicious_cancel', label: t.disputeMaliciousCancel },
    { id: 'fraud', label: t.disputeFraud },
    { id: 'other', label: t.disputeOther },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitDispute(order, category, description.trim() || '檢舉申訴提交');
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
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-bold">{t.disputeTitle}</h3>
              <p className="text-[11px] text-rose-200">
                對象：{targetUserName} · 訂單 #{order.id.slice(0, 10)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-rose-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Banner */}
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-950 flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            {lang === 'zh'
              ? '提交申訴後，訂單狀態將即時標記為「爭議凍結」，並留存雙方對話紀錄供校園管理端查核。'
              : 'Filing a dispute immediately flags this order as disputed and preserves chat logs for review.'}
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
                  className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
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
              {lang === 'zh' ? '詳細情況描述 (選填)' : 'Detailed Incident Description'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                lang === 'zh'
                  ? '請簡述事發經過、約定時間與具體問題...'
                  : 'Describe timeline, agreed time, and specific issue...'
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
                  <span>{lang === 'zh' ? '送出舉報並標記爭議' : 'Submit Report'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
