import React, { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserProfile, Language, CampusZone, BiologicalSex } from '../types';
import { APP_CONFIG, isAllowedNccuEmail } from '../config/appConfig';
import { NccuLoopLogo } from './NccuLoopLogo';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Globe,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface OnboardingGateProps {
  onComplete: (userProfile: Partial<UserProfile>) => void;
  onQuickDemoLogin?: () => void;
  lang: Language;
  onToggleLang: () => void;
}

const isDemoEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true';

export const OnboardingGate: React.FC<OnboardingGateProps> = ({
  onComplete,
  onQuickDemoLogin,
  lang,
  onToggleLang,
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Firebase Google Authentication (@g.nccu.edu.tw or @nccu.edu.tw)
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [verifiedUid, setVerifiedUid] = useState<string>('');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [verifiedAvatar, setVerifiedAvatar] = useState<string>('');

  // Step 2: Basic Profile (Nickname + Real Name + Required Biological Sex)
  const [nickname, setNickname] = useState<string>('');
  const [realName, setRealName] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<CampusZone>('downhill');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | null>(null);

  // Step 3: Preferred Offline / Transfer Payment Methods (Optional)
  const [selectedGateways, setSelectedGateways] = useState<string[]>(['line_pay', 'jko_pay']);

  const handleNccuGoogleSignIn = async () => {
    setAuthError('');
    setIsSigningIn(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email?.trim() || '';

      if (!isAllowedNccuEmail(email)) {
        await signOut(auth);
        setAuthError(
          lang === 'zh'
            ? '僅限政大校園信箱 (@g.nccu.edu.tw 或 @nccu.edu.tw) 登入使用'
            : 'Only @g.nccu.edu.tw or @nccu.edu.tw accounts are allowed.'
        );
        return;
      }

      setVerifiedUid(user.uid);
      setVerifiedEmail(email);
      setVerifiedAvatar(user.photoURL || '');
      const display = user.displayName?.trim() || '';
      if (!nickname.trim()) {
        setNickname(display || email.split('@')[0]);
      }
      if (!realName.trim() && display) {
        setRealName(display);
      }
      setStep(2);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(
          lang === 'zh'
            ? '已取消 Google 登入視窗，請再試一次。'
            : 'Google sign-in popup closed. Please try again.'
        );
      } else {
        setAuthError(
          lang === 'zh'
            ? 'Google 登入驗證失敗，請確認網路連線或稍後再試。'
            : 'Google sign-in failed. Please try again.'
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleVerifyStep2 = () => {
    if (!nickname.trim() || !realName.trim() || !biologicalSex) return;
    setStep(3);
  };

  const handleFinish = (withPayment: boolean) => {
    const emailPrefix = verifiedEmail.split('@')[0] || 'nccu_member';
    const sex: BiologicalSex = biologicalSex || 'female';
    onComplete({
      id: verifiedUid || undefined,
      nccuEmail: verifiedEmail,
      studentId: emailPrefix,
      nickname: nickname.trim(),
      realName: realName.trim(),
      name: nickname.trim(),
      nameEn: nickname.trim(),
      avatar: verifiedAvatar || undefined,
      biologicalSex: sex,
      gender: sex,
      zone: selectedZone,
      trustScore: 90,
      helpCount: 0,
      completedTasks: 0,
      isVerifiedStudent: true,
      boundPaymentGateways: withPayment ? selectedGateways : [],
    });
  };

  const toggleGateway = (gatewayId: string) => {
    if (selectedGateways.includes(gatewayId)) {
      setSelectedGateways(selectedGateways.filter((g) => g !== gatewayId));
    } else {
      setSelectedGateways([...selectedGateways, gatewayId]);
    }
  };

  const paymentOptions = [
    {
      id: 'jko_pay',
      name: lang === 'zh' ? '街口支付 (JKOPAY)' : 'JKOPAY',
      desc: lang === 'zh' ? '線下或聊天室轉帳確認' : 'Manual transfer confirmation',
      icon: '⚡',
    },
    {
      id: 'taiwan_pay',
      name: lang === 'zh' ? '台灣 Pay' : 'Taiwan Pay',
      desc: lang === 'zh' ? '學生金融卡即時轉帳' : 'Bank transfer',
      icon: '🏛️',
    },
    {
      id: 'line_pay',
      name: 'Line Pay',
      desc: lang === 'zh' ? '好友轉帳與現場掃碼' : 'Line Pay transfer / QR',
      icon: '💬',
    },
    {
      id: 'cash_meetup',
      name: lang === 'zh' ? '面交現金' : 'Cash on Meetup',
      desc: lang === 'zh' ? '校園碰面現場點清付款' : 'Cash exchange at campus meetup',
      icon: '💵',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between items-center p-4 sm:p-6 font-sans relative">
      {/* Top Bar with fixed Bilingual Toggle */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <NccuLoopLogo size="sm" />
          <span className="font-bold text-slate-900 text-sm tracking-tight hidden sm:inline">
            {lang === 'zh' ? '政大圈圈' : APP_CONFIG.appNameEn}
          </span>
        </div>

        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          title="切換語言 / Toggle Language"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{lang === 'zh' ? 'English' : '繁體中文'}</span>
        </button>
      </header>

      {/* Center Card Gate */}
      <main className="w-full max-w-md my-auto py-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-1">
              <NccuLoopLogo size="lg" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {lang === 'zh' ? '政大圈圈' : APP_CONFIG.appNameEn}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              {lang === 'zh' ? APP_CONFIG.tagline : APP_CONFIG.taglineEn}
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  step === s
                    ? 'w-8 bg-emerald-600'
                    : step > s
                      ? 'w-4 bg-slate-800'
                      : 'w-4 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* STEP 1: Firebase Google Authentication (@g.nccu.edu.tw or @nccu.edu.tw) */}
          {step === 1 && (
            <div className="space-y-5 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  STEP 1 / 3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'zh' ? '政大專屬身分驗證' : 'NCCU Google Verification'}
                </h2>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'zh'
                    ? '請使用 @g.nccu.edu.tw 或 @nccu.edu.tw 帳號登入，確保校園安全互助環境。'
                    : 'Please sign in with your @g.nccu.edu.tw or @nccu.edu.tw account.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {lang === 'zh'
                    ? '支援政大學生 (@g.nccu.edu.tw) 與教職員 (@nccu.edu.tw) 信箱驗證，外部帳號無法進入。'
                    : 'Supports verified @g.nccu.edu.tw student and @nccu.edu.tw faculty/staff accounts.'}
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleNccuGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2.5"
                >
                  {isSigningIn ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.14H1.02v3.14C3.03 21.17 7.19 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.03 14.03c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.17H1.02C.37 7.47 0 8.95 0 10.67c0 1.72.37 3.2 1.02 4.5l4.01-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.19 0 3.03 2.83 1.02 7.03l4.01 3.14c.98-2.95 3.73-5.14 6.97-5.14Z"
                      />
                    </svg>
                  )}
                  <span>
                    {isSigningIn
                      ? lang === 'zh'
                        ? '正在驗證政大 Google 帳號...'
                        : 'Verifying NCCU Google Account...'
                      : lang === 'zh'
                        ? '使用政大 Google 帳號登入 (Sign in with NCCU)'
                        : 'Sign in with NCCU Google Account'}
                  </span>
                </button>

                {authError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Basic Profile Setup (Nickname + Real Name + Required Biological Sex) */}
          {step === 2 && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  STEP 2 / 3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'zh' ? '建立個人檔案' : 'Create Profile'}
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{verifiedEmail}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'zh' ? '校園暱稱 (必填)' : 'Nickname (Required)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={lang === 'zh' ? '例：政大巧芸、山道騎手' : 'e.g. Audrey'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'zh' ? '真實姓名 (必填)' : 'Real Name (Required)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    placeholder={lang === 'zh' ? '例：陳巧芸' : 'e.g. Audrey Chen'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 -mt-2">
                {lang === 'zh'
                  ? '平時大廳與個人主頁僅顯示「暱稱」；唯有雙方同意解除匿名或女宿實名任務時，才顯示「暱稱（本名）」。'
                  : 'Only your nickname is shown publicly unless both parties consent or for female-dorm safety tasks.'}
              </p>

              {/* Required Biological Sex */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {lang === 'zh' ? '生理性別 (必填 · 用於宿舍安全防護)' : 'Biological Sex (Required)'}
                  </label>
                  <span className="text-[10px] text-rose-600 font-semibold">
                    {lang === 'zh' ? '女宿任務隔離依據' : 'For dorm safety'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'female', zh: '生理女', en: 'Female' },
                    { id: 'male', zh: '生理男', en: 'Male' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setBiologicalSex(g.id as BiologicalSex)}
                      className={`py-2.5 px-3 rounded-xl border text-xs text-center cursor-pointer transition-all ${
                        biologicalSex === g.id
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lang === 'zh' ? g.zh : g.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Capsule Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === 'zh' ? '系統語言偏好' : 'Language Preference'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (lang !== 'zh') onToggleLang();
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      lang === 'zh'
                        ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    繁體中文
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (lang !== 'en') onToggleLang();
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      lang === 'en'
                        ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Campus Zone Capsules */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === 'zh' ? '常駐校區 (選填)' : 'Frequent Campus Area'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'downhill', zh: '山下校區', en: 'Downhill' },
                    { id: 'uphill', zh: '山上校區', en: 'Uphill' },
                    { id: 'dorms', zh: '宿舍區', en: 'Dorms' },
                  ].map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setSelectedZone(z.id as CampusZone)}
                      className={`py-2 px-2 rounded-xl border text-xs text-center cursor-pointer transition-all ${
                        selectedZone === z.id
                          ? 'bg-emerald-50 text-emerald-950 border-emerald-600 font-bold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lang === 'zh' ? z.zh : z.en}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
                  {lang === 'zh' ? '上一步' : 'Back'}
                </button>
                <button
                  type="button"
                  disabled={!nickname.trim() || !realName.trim() || !biologicalSex}
                  onClick={handleVerifyStep2}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{lang === 'zh' ? '前往步驟 3 (付款偏好)' : 'Next Step (Payment)'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preferred Payment Setup (Optional) */}
          {step === 3 && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  STEP 3 / 3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'zh' ? '偏好的支付與收款方式' : 'Preferred Payment Methods'}
                </h2>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'zh'
                    ? '本平台採「線下現金 / 事前轉帳雙向確認制」，不會自動扣款。勾選常用工具供發單快速預填：'
                    : 'Uses offline/manual payment confirmation (no auto-charge). Select preferred methods:'}
                </p>
              </div>

              <div className="space-y-2">
                {paymentOptions.map((opt) => {
                  const isChecked = selectedGateways.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleGateway(opt.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{opt.icon}</span>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{opt.name}</div>
                          <div className="text-[10px] text-slate-500">{opt.desc}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="accent-emerald-600 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleFinish(true)}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'zh' ? '儲存偏好，進入大廳' : 'Save & Enter NCCU Loop'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFinish(false)}
                  className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-medium transition-colors cursor-pointer text-center"
                >
                  {lang === 'zh' ? '稍後再說，直接進入大廳' : 'Skip for now, enter lobby directly'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ← {lang === 'zh' ? '返回修改基本資料' : 'Back to Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full max-w-4xl flex items-center justify-between py-2 text-[11px] text-slate-400">
        <span>© 2026 {APP_CONFIG.appNameEn} · National Chengchi University</span>
        <div className="flex items-center gap-3">
          <span>{lang === 'zh' ? '政大校園實名驗證' : 'Verified NCCU Account'}</span>
          {isDemoEnabled && onQuickDemoLogin && (
            <button
              type="button"
              onClick={onQuickDemoLogin}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2 cursor-pointer"
            >
              {lang === 'zh' ? 'Demo 快速登入' : 'Quick Demo Login'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
