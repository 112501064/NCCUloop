import React from 'react';
import { UserProfile, Language, EscrowTransaction } from '../types';
import { 
  ShieldCheck, Award, GraduationCap, MapPin, 
  Bell, FileCheck, CheckCircle2, CreditCard, 
  Sparkles, RefreshCw, User, Lock, ExternalLink, LogOut
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: UserProfile;
  escrows: EscrowTransaction[];
  onOpenTranscriptVerify: () => void;
  onToggleSubscription: (tag: string) => void;
  onOpenUserSwitcher: () => void;
  onOpenOnboarding: () => void;
  onLogout: () => void;
  lang: Language;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  escrows,
  onOpenTranscriptVerify,
  onToggleSubscription,
  onOpenUserSwitcher,
  onOpenOnboarding,
  onLogout,
  lang,
}) => {
  return (
    <div className="space-y-4 pb-20 text-xs">
      {/* Student Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-600/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{currentUser.name}</h2>
                <span className="font-mono text-slate-400 text-[11px]">{currentUser.studentId}</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {currentUser.department} · {currentUser.year}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold font-mono mt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Webmail 官方驗證 (@g.nccu.edu.tw)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={onOpenUserSwitcher}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold cursor-pointer"
            >
              切換角色
            </button>
            <button
              onClick={onOpenOnboarding}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer"
            >
              三步驗證
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">信任指數</span>
            <span className="text-base font-bold font-mono text-emerald-800">
              ★{currentUser.trustScore}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">完成任務</span>
            <span className="text-base font-bold font-mono text-slate-900">
              {currentUser.completedTasks} 次
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">履約專戶餘額</span>
            <span className="text-base font-bold font-mono text-slate-900">
              ${currentUser.walletBalance}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Gateways Binding Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span>已綁定金流帳戶 (多元支付)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">ESCROW PROTECTED</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {currentUser.boundPaymentGateways.map(gate => (
            <span key={gate} className="px-3 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono font-semibold text-[11px]">
              ✓ {gate === 'line_pay' ? 'Line Pay' : gate === 'jko_pay' ? '街口支付' : gate === 'taiwan_pay' ? '台灣 Pay' : '信用卡'}
            </span>
          ))}
          <button
            onClick={onOpenOnboarding}
            className="px-2.5 py-1 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-[11px] hover:bg-emerald-50 cursor-pointer"
          >
            + 新增金流
          </button>
        </div>
      </div>

      {/* Transcript OCR Verification Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <span>教務成績單 OCR 資格認證 (Gemini 2.5 Flash)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              上傳成績單截圖自動開通專業科目家教/伴讀接單資格。
            </p>
          </div>
          <button
            onClick={onOpenTranscriptVerify}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800 shrink-0 text-xs"
          >
            上傳認證
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {currentUser.canTutorSubjects.map((sub, i) => (
            <span key={i} className="flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{sub} (A+ 認證)</span>
            </span>
          ))}
        </div>
      </div>

      {/* Subscribed Push Tags */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-1.5 text-slate-900">
          <Bell className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold">推播追蹤標籤 (點擊可開關)</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {['#即時剩食', '#女宿衛生棉', '#經濟學課本', '#交通車票', '#交通共乘', '#二手市集'].map(tag => {
            const isSub = currentUser.subscribedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onToggleSubscription(tag)}
                className={`px-3 py-1 rounded-full text-[11px] font-mono cursor-pointer transition-colors ${
                  isSub ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag} {isSub ? '✓' : '+'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout (Return to Onboarding Gate) */}
      <div className="pt-2">
        <button
          onClick={onLogout}
          className="w-full py-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-2xl font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{lang === 'zh' ? '登出（返回註冊與驗證閘門）' : 'Log Out (Return to Onboarding Gate)'}</span>
        </button>
      </div>
    </div>
  );
};
