import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, FileText, CheckCircle2, Sparkles, Upload, ArrowRight } from 'lucide-react';

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
  if (!isOpen) return null;

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [targetSubject, setTargetSubject] = useState<string>('COMM2001 - 總體經濟學 (商學院必修)');

  const handleSimulateOCR = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setSuccess(true);
      setTimeout(() => {
        onVerifiedSuccess('COMM2001', '總體經濟學');
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-emerald-700 font-bold uppercase tracking-wider">
              MULTIMODAL AI OCR ENGINE
            </div>
            <h3 className="text-base font-bold text-slate-900">
              政大教務系統成績單 OCR 資格自動認證
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
            申請高階家教或專業學門輔導任務時，AI 視覺模組透過政大教務系統截圖自動辨識課程代碼、學期修課紀錄與成績等第，核發專屬徽章。
          </p>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">欲認證輔導科目</label>
            <select
              value={targetSubject}
              onChange={(e) => setTargetSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
            >
              <option value="COMM2001 - 總體經濟學 (商學院必修)">COMM2001 - 總體經濟學 (商學院必修)</option>
              <option value="STAT1001 - 統計學 (一)">STAT1001 - 統計學 (一)</option>
              <option value="MATH1002 - 微積分 (商管數統必修)">MATH1002 - 微積分 (商管數統必修)</option>
              <option value="LAW1001 - 中華民國憲法與法學緒論">LAW1001 - 中華民國憲法與法學緒論</option>
            </select>
          </div>

          {/* Upload preview dropzone */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50 space-y-2">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 block">nccu_transcript_sample.png</span>
              <span className="text-[11px] text-slate-500">政大教務註冊組電子成績單截圖 (含防偽水印)</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              學號: {currentUser.studentId} · 姓名: {currentUser.name}
            </div>
          </div>

          {success ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>OCR 辨識成功！通過授課資格核可</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                AI 辨識結果：<strong>COMM2001 總體經濟學 (等第: A+, 授課教師: 莊教授)</strong>，信賴度 98.4%，已自動開通家教應徵接單權限！
              </p>
            </div>
          ) : (
            <button
              onClick={handleSimulateOCR}
              disabled={analyzing}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Gemini 2.5 Flash OCR 辨識中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>開始 AI 成績單驗證</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
