import React, { useState } from 'react';
import { PostItem, UserProfile, DisputeCategory, Language } from '../types';
import { I18N } from '../data/i18n';
import { X, AlertTriangle, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

interface ReportDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostItem;
  currentUser: UserProfile;
  onSubmitDispute: (postId: string, category: DisputeCategory, description: string) => void;
  lang: Language;
}

export const ReportDisputeModal: React.FC<ReportDisputeModalProps> = ({
  isOpen,
  onClose,
  post,
  currentUser,
  onSubmitDispute,
  lang,
}) => {
  if (!isOpen) return null;

  const t = I18N[lang];
  const [category, setCategory] = useState<DisputeCategory>('no_show');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isCreator = currentUser.id === post.creatorId;
  const targetUserName = isCreator 
    ? (post.fulfillerName || '接單同學')
    : post.creatorName;

  const categories: { id: DisputeCategory; label: string }[] = [
    { id: 'harassment', label: t.disputeHarassment },
    { id: 'no_show', label: t.disputeNoShow },
    { id: 'malicious_cancel', label: t.disputeMaliciousCancel },
    { id: 'fraud', label: t.disputeFraud },
    { id: 'other', label: t.disputeOther },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitDispute(post.id, category, description || '檢舉申訴提交');
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-bold">
                {t.disputeTitle}
              </h3>
              <p className="text-[11px] text-rose-200">
                對象：{targetUserName} · 訂單 #{post.id.slice(0, 10)}
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

        {/* Warning Policy Banner */}
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-950 flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            {lang === 'zh'
              ? '提交申訴後，系統將立即「凍結該筆預扣託管款項」，並暫停被檢舉者接單權限。AI 仲裁日誌將比對雙方聊天紀錄與位置歷程進行判定。'
              : 'Filing a dispute immediately freezes the escrow payment and suspends the respondent\'s claiming rights. AI arbitration logs will cross-examine chat history and geolocation.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">{t.disputeReason}</label>
            <div className="space-y-1.5">
              {categories.map(cat => (
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
              placeholder={lang === 'zh' ? '請簡述事發經過、約定時間與具體違約情形...' : 'Describe timeline, agreed time, and specific violation...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-700"
            />
          </div>

          {/* Action buttons */}
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
                <span>處理中...</span>
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
