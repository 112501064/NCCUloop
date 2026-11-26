import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ReportItem, OrderMessage, Language, DisputeCategory } from '../types';
import {
  X,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  FileWarning,
} from 'lucide-react';

interface AdminReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportItem[];
  useFirestoreRealtime: boolean;
  localOrderMessagesMap: Record<string, OrderMessage[]>;
  onDecideReport: (
    report: ReportItem,
    decision: 'dismissed' | 'confirmed_violation',
    aiSummary: string,
    adminNote: string
  ) => Promise<void> | void;
  lang: Language;
}

function getCategoryLabel(cat: DisputeCategory, lang: Language): string {
  switch (cat) {
    case 'harassment':
      return lang === 'zh' ? '言語騷擾 / 不當言論' : 'Harassment';
    case 'no_show':
      return lang === 'zh' ? '未完成任務 / 放鴿子' : 'No-Show';
    case 'malicious_cancel':
      return lang === 'zh' ? '信用瑕疵 / 惡意棄單' : 'Malicious Cancel';
    case 'fraud':
      return lang === 'zh' ? '詐騙 / 不實商品' : 'Fraud / Fake Item';
    case 'money_dispute':
      return lang === 'zh' ? '金錢糾紛' : 'Payment Dispute';
    case 'impersonation':
      return lang === 'zh' ? '假冒身分' : 'Impersonation';
    default:
      return lang === 'zh' ? '其他爭議' : 'Other';
  }
}

function generateAiRiskSummary(
  report: ReportItem,
  messages: OrderMessage[],
  lang: Language
): string {
  const hasEvidence = Boolean(report.evidenceUrl);
  const fullText = `${report.description} ${messages.map((m) => m.text).join(' ')}`.toLowerCase();

  const riskKeywords = [
    '罵',
    '騷擾',
    '威脅',
    '封鎖',
    '已讀',
    '沒來',
    '放鳥',
    '放鴿子',
    '詐騙',
    '假貨',
    '沒給錢',
    '沒轉帳',
    '棄單',
    'harass',
    'scam',
    'no show',
    'ghost',
    'block',
    'unpaid',
  ];
  const matchedSignals = riskKeywords.filter((kw) => fullText.includes(kw));

  let score = 0;
  if (hasEvidence) score += 35;
  if (report.reasonCategory === 'harassment' || report.reasonCategory === 'fraud' || report.reasonCategory === 'impersonation') {
    score += 30;
  } else if (report.reasonCategory === 'no_show' || report.reasonCategory === 'malicious_cancel' || report.reasonCategory === 'money_dispute') {
    score += 20;
  }
  score += Math.min(25, matchedSignals.length * 8);
  if (report.description.trim().length >= 15) score += 10;

  const riskLevelZh =
    score >= 65
      ? '高風險違規嫌疑（建議核對截圖後裁決扣分）'
      : score >= 40
        ? '中度風險（建議檢視雙方對話脈絡後裁決）'
        : '低風險 / 證據待補強（若無實質違規可考慮駁回）';

  const riskLevelEn =
    score >= 65
      ? 'High Violation Risk (Recommend confirming after verifying screenshot)'
      : score >= 40
        ? 'Moderate Risk (Inspect chat context before deciding)'
        : 'Low Risk / Insufficient Evidence (Consider dismissing if no violation found)';

  if (lang === 'zh') {
    return `【AI 初審風險指數：${score}/100】${riskLevelZh}\n• 憑證完整度：${
      hasEvidence ? '已附佐證截圖憑證（可信度較高）' : '未上傳截圖憑證（建議僅依對話判斷）'
    }\n• 對話紀錄量：共 ${messages.length} 則訊息；偵測到關鍵訊號：${
      matchedSignals.length > 0 ? matchedSignals.join('、') : '無明顯高危關鍵字'
    }`;
  }

  return `[AI Risk Score: ${score}/100] ${riskLevelEn}\n• Evidence: ${
    hasEvidence ? 'Screenshot attached' : 'No screenshot uploaded'
  }\n• Chat Log: ${messages.length} messages; Signals: ${
    matchedSignals.length > 0 ? matchedSignals.join(', ') : 'None detected'
  }`;
}

export const AdminReviewModal: React.FC<AdminReviewModalProps> = ({
  isOpen,
  onClose,
  reports,
  useFirestoreRealtime,
  localOrderMessagesMap,
  onDecideReport,
  lang,
}) => {
  const [filterTab, setFilterTab] = useState<'pending' | 'resolved'>('pending');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loadedMessages, setLoadedMessages] = useState<OrderMessage[]>([]);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState<boolean>(false);
  const [aiDraftByReport, setAiDraftByReport] = useState<Record<string, string>>({});
  const [adminNoteByReport, setAdminNoteByReport] = useState<Record<string, string>>({});
  const [isDeciding, setIsDeciding] = useState<boolean>(false);

  const pendingReports = reports.filter(
    (r) =>
      r.status === 'pending_review' ||
      r.status === 'submitted' ||
      r.status === 'frozen_escrow'
  );
  const resolvedReports = reports.filter(
    (r) => r.status === 'confirmed_violation' || r.status === 'dismissed'
  );

  const activeList = filterTab === 'pending' ? pendingReports : resolvedReports;
  const selectedReport =
    activeList.find((r) => r.id === selectedReportId) || activeList[0] || null;

  useEffect(() => {
    if (!isOpen || !selectedReport?.orderId) {
      setLoadedMessages([]);
      return;
    }

    const orderId = selectedReport.orderId;
    if (!useFirestoreRealtime || !auth.currentUser) {
      setLoadedMessages(localOrderMessagesMap[orderId] || []);
      return;
    }

    let cancelled = false;
    setIsLoadingMsgs(true);
    getDocs(query(collection(db, 'orders', orderId, 'messages'), orderBy('createdAt', 'asc')))
      .then((snap) => {
        if (cancelled) return;
        const msgs: OrderMessage[] = snap.docs.map((dSnap) => {
          const d = dSnap.data();
          const ts = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
          return {
            id: dSnap.id,
            text: String(d.text || ''),
            senderUid: String(d.senderUid || ''),
            senderName: String(d.senderName || '同學'),
            createdAtMs: ts ? ts.getTime() : Date.now(),
            timestampText: ts
              ? ts.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
              : '',
          };
        });
        setLoadedMessages(msgs);
      })
      .catch(() => {
        if (!cancelled) setLoadedMessages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMsgs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedReport?.id, selectedReport?.orderId, useFirestoreRealtime, localOrderMessagesMap]);

  if (!isOpen) return null;

  const isSelectedPending =
    selectedReport &&
    (selectedReport.status === 'pending_review' ||
      selectedReport.status === 'submitted' ||
      selectedReport.status === 'frozen_escrow');

  const handleRunAiSummary = () => {
    if (!selectedReport) return;
    const summary = generateAiRiskSummary(selectedReport, loadedMessages, lang);
    setAiDraftByReport((prev) => ({
      ...prev,
      [selectedReport.id]: summary,
    }));
  };

  const handleDecision = async (decision: 'dismissed' | 'confirmed_violation') => {
    if (!selectedReport || isDeciding) return;
    setIsDeciding(true);
    try {
      const summary =
        aiDraftByReport[selectedReport.id] ||
        selectedReport.aiSummary ||
        generateAiRiskSummary(selectedReport, loadedMessages, lang);
      const note = adminNoteByReport[selectedReport.id] || '';
      await onDecideReport(selectedReport, decision, summary, note);
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">
                {lang === 'zh' ? '🛡️ 案件審核後台 (Admin Console)' : '🛡️ Report Review Console'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {lang === 'zh'
                  ? '檢視雙方對話紀錄、佐證截圖與 AI 違規風險摘要後裁決'
                  : 'Inspect chat transcripts, evidence screenshots & AI risk summary'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setFilterTab('pending');
              setSelectedReportId(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
              filterTab === 'pending'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {lang === 'zh' ? `待審核案件 (${pendingReports.length})` : `Pending (${pendingReports.length})`}
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterTab('resolved');
              setSelectedReportId(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
              filterTab === 'resolved'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {lang === 'zh' ? `已結案紀錄 (${resolvedReports.length})` : `Resolved (${resolvedReports.length})`}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Report List */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto p-3 space-y-2 max-h-48 md:max-h-none bg-slate-50/60">
            {activeList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-[11px]">
                {filterTab === 'pending'
                  ? lang === 'zh'
                    ? '目前沒有待審核的檢舉案件。'
                    : 'No pending reports.'
                  : lang === 'zh'
                    ? '尚無已結案的審核紀錄。'
                    : 'No resolved reports.'}
              </div>
            ) : (
              activeList.map((rep) => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => setSelectedReportId(rep.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-white border-slate-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                        {getCategoryLabel(rep.reasonCategory, lang)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{rep.createdAt}</span>
                    </div>
                    <p className="font-bold text-slate-900 truncate">
                      {rep.taskTitle || rep.taskId}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{rep.description}</p>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Inspection Pane */}
          <div className="md:col-span-8 overflow-y-auto p-4 sm:p-5 space-y-4">
            {!selectedReport ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 space-y-2">
                <FileWarning className="w-8 h-8 text-slate-300" />
                <p>{lang === 'zh' ? '請於左側選擇一筆案件檢視詳情' : 'Select a report to inspect'}</p>
              </div>
            ) : (
              <>
                {/* Meta & Status */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {selectedReport.taskTitle || selectedReport.taskId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedReport.status === 'confirmed_violation'
                          ? 'bg-rose-100 text-rose-800'
                          : selectedReport.status === 'dismissed'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedReport.status === 'confirmed_violation'
                        ? lang === 'zh'
                          ? '已確認違規（-10分）'
                          : 'Confirmed (-10 pts)'
                        : selectedReport.status === 'dismissed'
                          ? lang === 'zh'
                            ? '已駁回檢舉'
                            : 'Dismissed'
                          : lang === 'zh'
                            ? '待審核 (Pending)'
                            : 'Pending Review'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p>
                      <span className="font-semibold">
                        {lang === 'zh' ? '檢舉人：' : 'Reporter: '}
                      </span>
                      {selectedReport.reporterEmail || selectedReport.reporterId}
                    </p>
                    <p>
                      <span className="font-semibold">
                        {lang === 'zh' ? '被檢舉人：' : 'Reported User: '}
                      </span>
                      {selectedReport.reportedUserName || selectedReport.reportedUserId || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold">
                        {lang === 'zh' ? '檢舉說明：' : 'Description: '}
                      </span>
                      {selectedReport.description}
                    </p>
                  </div>
                </div>

                {/* Evidence Screenshot */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{lang === 'zh' ? '佐證截圖 / 憑證' : 'Evidence Screenshot'}</span>
                  </h4>
                  {selectedReport.evidenceUrl ? (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <img
                        src={selectedReport.evidenceUrl}
                        alt="Report evidence"
                        className="w-full max-h-60 object-contain rounded-lg bg-white"
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-[11px]">
                      {lang === 'zh' ? '檢舉人未附上佐證圖片。' : 'No evidence screenshot uploaded.'}
                    </div>
                  )}
                </div>

                {/* Chat Transcript */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{lang === 'zh' ? '雙方訂單對話紀錄' : 'Order Chat Transcript'}</span>
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-44 overflow-y-auto space-y-2">
                    {!selectedReport.orderId ? (
                      <p className="text-slate-400 text-[11px]">
                        {lang === 'zh'
                          ? '此檢舉來自大廳公開貼文，無 1-on-1 訂單對話紀錄。'
                          : 'Reported directly from lobby task (no order chat).'}
                      </p>
                    ) : isLoadingMsgs ? (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{lang === 'zh' ? '讀取對話紀錄中...' : 'Loading messages...'}</span>
                      </div>
                    ) : loadedMessages.length === 0 ? (
                      <p className="text-slate-400 text-[11px]">
                        {lang === 'zh' ? '無聊天對話紀錄。' : 'No chat messages.'}
                      </p>
                    ) : (
                      loadedMessages.map((m) => (
                        <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span className="font-bold text-slate-700">{m.senderName}</span>
                            <span className="font-mono">{m.timestampText}</span>
                          </div>
                          <p className="text-[11px] text-slate-800">{m.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* AI Risk Summary */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <span>
                        {lang === 'zh' ? 'AI 違規風險摘要（初審輔助）' : 'AI Violation Risk Summary'}
                      </span>
                    </span>
                    {isSelectedPending && (
                      <button
                        type="button"
                        onClick={handleRunAiSummary}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>
                          {lang === 'zh' ? '一鍵執行 AI 風險評估' : 'Run AI Assessment'}
                        </span>
                      </button>
                    )}
                  </div>

                  {(aiDraftByReport[selectedReport.id] || selectedReport.aiSummary) ? (
                    <p className="text-[11px] text-emerald-950 whitespace-pre-line leading-relaxed bg-white/80 border border-emerald-200 rounded-lg p-2.5">
                      {aiDraftByReport[selectedReport.id] || selectedReport.aiSummary}
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-800">
                      {lang === 'zh'
                        ? '點擊右上按鈕，依對話關鍵訊號與憑證完整度自動生成違規風險評估摘要。'
                        : 'Click above to assess evidence completeness and chat risk signals.'}
                    </p>
                  )}
                </div>

                {/* Admin Decision Controls */}
                {isSelectedPending ? (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {lang === 'zh' ? '管理員審核備註 (選填)' : 'Admin Decision Note (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={adminNoteByReport[selectedReport.id] || ''}
                        onChange={(e) =>
                          setAdminNoteByReport((prev) => ({
                            ...prev,
                            [selectedReport.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          lang === 'zh'
                            ? '輸入裁決說明（例：經比對截圖確有未到場情事）...'
                            : 'Optional review note...'
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isDeciding}
                        onClick={() => void handleDecision('dismissed')}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {lang === 'zh' ? '駁回檢舉（不扣分）' : 'Dismiss Report'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isDeciding}
                        onClick={() => void handleDecision('confirmed_violation')}
                        className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'zh'
                            ? '確認違規（扣 10 分信任指數）'
                            : 'Confirm Violation (-10 Trust)'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  selectedReport.adminNote && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700">
                      <span className="font-bold">
                        {lang === 'zh' ? '審核備註：' : 'Admin Note: '}
                      </span>
                      {selectedReport.adminNote}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
