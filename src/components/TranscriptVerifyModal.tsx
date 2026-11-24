import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, FileText, CheckCircle2, Sparkles, Upload } from 'lucide-react';

interface TranscriptVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onVerifiedSuccess: (subjectCode: string, subjectName: string) => void;
}

export const TranscriptVerifyModal: React.FC<TranscriptVerifyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onVerifiedSuccess,
}) => {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [targetSubject, setTargetSubject] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('nccu_transcript_sample.png');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  const handleSimulateOCR = () => {
    const trimmed = targetSubject.trim();
    if (!trimmed) return;

    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setSuccess(true);
      setTimeout(() => {
        onVerifiedSuccess('VERIFIED', trimmed);
        setSuccess(false);
        setTargetSubject('');
      }, 950);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-emerald-700 font-bold uppercase tracking-wider">
              SKILL &amp; TRANSCRIPT VERIFICATION
            </div>
            <h3 className="text-base font-bold text-slate-900">
              上傳修課證明 / 專長認證截圖
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-600 leading-relaxed">
            可自由輸入欲認證的學科、語言檢定、軟體技能或運動項目，並上傳政大修課成績單或相關證照截圖完成標記。
          </p>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              欲認證輔導項目 / 專長名稱（自由輸入）
            </label>
            <input
              type="text"
              value={targetSubject}
              onChange={(e) => setTargetSubject(e.target.value)}
              placeholder="例如：微積分(甲)、日文 N1 檢定、羽球陪練、Premiere 剪輯..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {/* Upload preview dropzone */}
          <label className="block border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center bg-slate-50/50 space-y-2 cursor-pointer transition-colors">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 flex items-center justify-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                {selectedFileName}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                點擊選擇修課紀錄或證照截圖（支援 PNG / JPG / PDF）
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              帳號: {currentUser.studentId} · 暱稱: {currentUser.nickname || currentUser.name}
            </div>
          </label>

          {success ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>證明已送出並通過認證！</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                已將 <strong>{targetSubject}</strong> 加入您的個人專長認證徽章列表。
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSimulateOCR}
              disabled={analyzing || !targetSubject.trim()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>正在核對修課證明截圖...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>送出證明並新增認證項目</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
