import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { OrderItem, PostItem, UserProfile, DisputeCategory, Language } from '../types';
import { I18N } from '../data/i18n';
import { X, AlertTriangle, ShieldAlert, Lock, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

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
    evidenceUrl?: string;
  }) => Promise<void> | void;
  lang: Language;
}

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_ERROR'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('IMAGE_LOAD_ERROR'));
      img.onload = () => {
        const maxDim = 900;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('CANVAS_ERROR'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        if (dataUrl.length > 200000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        }
        if (dataUrl.length > 235000) {
          // Further shrink dimensions if still dense
          const scale = 0.7;
          canvas.width = Math.max(200, Math.round(width * scale));
          canvas.height = Math.max(200, Math.round(height * scale));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

async function uploadEvidenceWithFallback(
  file: File,
  compressedDataUrl: string,
  userId: string
): Promise<string> {
  if (!auth.currentUser) {
    return compressedDataUrl;
  }

  try {
    const res = await fetch(compressedDataUrl);
    const blob = await res.blob();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40) || 'evidence.jpg';
    const storageRef = ref(storage, `report_evidence/${userId}/${Date.now()}_${safeName}`);

    const uploadTask = uploadBytes(storageRef, blob, { contentType: 'image/jpeg' }).then((snap) =>
      getDownloadURL(snap.ref)
    );
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('STORAGE_TIMEOUT')), 4000)
    );

    const downloadUrl = await Promise.race([uploadTask, timeoutPromise]);
    if (downloadUrl && downloadUrl.length <= 240000) {
      return downloadUrl;
    }
    return compressedDataUrl;
  } catch {
    return compressedDataUrl;
  }
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
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || (!order && !post)) return null;

  const t = I18N[lang];

  let targetUserLabel = '';
  let contextTitle = '';
  if (order) {
    const isCreator = currentUser.id === order.creatorUid;
    const bothRevealed = Boolean(
      order.isFemaleDormOnly || (order.revealCreator && order.revealAccepter)
    );
    const peerNick = isCreator ? order.accepterName : order.creatorName;
    const peerReal = isCreator ? order.accepterRealName : order.creatorRealName;
    targetUserLabel = bothRevealed
      ? peerReal
        ? `${peerNick}（${peerReal}）`
        : peerNick
      : lang === 'zh'
        ? '匿名同學'
        : 'Anonymous Peer';
    contextTitle = lang === 'zh' ? order.taskTitle : order.taskTitleEn || order.taskTitle;
  } else if (post) {
    targetUserLabel =
      post.isCreatorAnonymous === true && !post.isFemaleDormOnly
        ? lang === 'zh'
          ? '匿名同學'
          : 'Anonymous Student'
        : post.creatorName;
    contextTitle = lang === 'zh' ? post.title : post.titleEn || post.title;
  }

  const categories: { id: DisputeCategory; label: string }[] = [
    { id: 'harassment', label: t.disputeHarassment },
    { id: 'no_show', label: t.disputeNoShow },
    {
      id: 'malicious_cancel',
      label: lang === 'zh' ? '信用瑕疵 / 惡意棄單' : 'Malicious Cancel / Bad Faith',
    },
    { id: 'fraud', label: lang === 'zh' ? '詐騙 / 不實商品' : 'Fraud / Misleading Item' },
    { id: 'money_dispute', label: t.disputeMoney },
    { id: 'impersonation', label: t.disputeImpersonation },
    { id: 'other', label: t.disputeOther },
  ];

  const handleSelectEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError(
        lang === 'zh' ? '請選擇圖片檔案（JPG / PNG / WebP）。' : 'Please choose an image file.'
      );
      return;
    }

    setIsProcessingImage(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setEvidenceFile(file);
      setEvidencePreviewUrl(compressed);
    } catch {
      setUploadError(
        lang === 'zh' ? '圖片讀取失敗，請改用其他截圖檔案。' : 'Failed to process image.'
      );
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleClearEvidence = () => {
    setEvidenceFile(null);
    setEvidencePreviewUrl('');
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalEvidenceUrl: string | undefined;
      if (evidencePreviewUrl && evidenceFile) {
        finalEvidenceUrl = await uploadEvidenceWithFallback(
          evidenceFile,
          evidencePreviewUrl,
          currentUser.id
        );
      } else if (evidencePreviewUrl) {
        finalEvidenceUrl = evidencePreviewUrl;
      }

      await onSubmitReport({
        order,
        post,
        category,
        description:
          description.trim() ||
          (lang === 'zh' ? '校園安全舉報提交' : 'Campus safety report submitted'),
        evidenceUrl: finalEvidenceUrl,
      });
      setDescription('');
      handleClearEvidence();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-xs flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-rose-950 text-white p-4 flex items-center justify-between shrink-0">
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

        {/* Policy Banner: Pending Review (No Unverified Deduction) */}
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-950 flex items-start gap-2 shrink-0">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            {lang === 'zh'
              ? '檢舉送出後將進入「待審核」並凍結爭議訂單（不會未經審核直接扣分），交由管理員依對話紀錄與佐證截圖裁決；確認違規才扣除 10 分信任指數。'
              : 'Submitted reports enter pending review without automatic penalties. Admins inspect chat logs and evidence screenshots before deciding (-10 trust pts only if confirmed).'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">{t.disputeReason}</label>
            <div className="grid grid-cols-1 gap-1.5">
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
              {lang === 'zh' ? '詳細事發說明 (選填)' : 'Incident Details (Optional)'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                lang === 'zh'
                  ? '請簡述事發經過、約定時間與具體問題...'
                  : 'Describe timeline, agreed meeting point, and issue...'
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-700"
            />
          </div>

          {/* Evidence Upload + Preview Thumbnail */}
          <div className="space-y-2">
            <label className="block text-slate-700 font-bold">
              {lang === 'zh'
                ? '上傳佐證截圖 / 憑證 (建議附上，有助加速審核)'
                : 'Upload Evidence Screenshot (Recommended)'}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectEvidence}
              className="hidden"
            />

            {!evidencePreviewUrl ? (
              <button
                type="button"
                disabled={isProcessingImage}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-3 border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50 hover:bg-rose-50/40 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-600 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 text-rose-600" />
                <span className="font-semibold text-[11px]">
                  {isProcessingImage
                    ? lang === 'zh'
                      ? '圖片壓縮處理中...'
                      : 'Processing image...'
                    : lang === 'zh'
                      ? '點擊選擇聊天截圖、轉帳或面交憑證照片'
                      : 'Tap to attach chat / receipt screenshot'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {lang === 'zh' ? '支援 JPG / PNG / WebP（自動最佳化大小）' : 'JPG / PNG / WebP'}
                </span>
              </button>
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold min-w-0">
                    <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {evidenceFile?.name || (lang === 'zh' ? '已附佐證截圖' : 'Evidence attached')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearEvidence}
                    className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{lang === 'zh' ? '移除' : 'Remove'}</span>
                  </button>
                </div>
                <img
                  src={evidencePreviewUrl}
                  alt="Evidence preview"
                  className="w-full max-h-40 object-contain rounded-lg border border-slate-200 bg-white"
                />
              </div>
            )}

            {uploadError && (
              <p className="text-[11px] text-rose-600 font-semibold">{uploadError}</p>
            )}
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
              disabled={isSubmitting || isProcessingImage}
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
