import React, { useState } from 'react';
import { UserProfile, Language, CampusZone } from '../types';
import { APP_CONFIG } from '../config/appConfig';
import { I18N } from '../data/i18n';
import { 
  Mail, CheckCircle2, ShieldCheck, CreditCard, 
  User, Lock, Sparkles, ArrowRight, ArrowLeft, Globe, Zap
} from 'lucide-react';

interface OnboardingGateProps {
  onComplete: (userProfile: Partial<UserProfile>) => void;
  onQuickDemoLogin: () => void;
  lang: Language;
  onToggleLang: () => void;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({
  onComplete,
  onQuickDemoLogin,
  lang,
  onToggleLang,
}) => {
  const t = I18N[lang];
  const [step, setStep] = useState<number>(1);

  // Step 1: NCCU Webmail & OTP
  const [email, setEmail] = useState<string>('112501064@g.nccu.edu.tw');
  const [emailError, setEmailError] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(true);
  const [otpCode, setOtpCode] = useState<string>('849201');

  // Step 2: Basic Profile
  const [nickname, setNickname] = useState<string>('政大巧芸 (Audrey)');
  const [password, setPassword] = useState<string>('nccu2026pass');
  const [selectedZone, setSelectedZone] = useState<CampusZone>('downhill');
  const [selectedGender, setSelectedGender] = useState<'undisclosed' | 'female' | 'male'>('female');

  // Step 3: Payment Bindings (Optional)
  const [selectedGateways, setSelectedGateways] = useState<string[]>(['line_pay', 'jko_pay']);

  const handleSendOtp = () => {
    if (!email.endsWith('@nccu.edu.tw') && !email.endsWith('@g.nccu.edu.tw')) {
      setEmailError(lang === 'zh' 
        ? '請輸入有效的政大學生信箱 (@g.nccu.edu.tw 或 @nccu.edu.tw)' 
        : 'Please enter a valid NCCU webmail (@g.nccu.edu.tw or @nccu.edu.tw)');
      return;
    }
    setEmailError('');
    setOtpSent(true);
  };

  const handleVerifyStep1 = () => {
    if (!email.endsWith('@nccu.edu.tw') && !email.endsWith('@g.nccu.edu.tw')) {
      setEmailError(lang === 'zh' ? '信箱網域必須為政大官方 Webmail' : 'Requires NCCU webmail domain');
      return;
    }
    if (otpCode.trim().length !== 6) {
      setEmailError(lang === 'zh' ? '請輸入 6 位數驗證碼' : 'Enter 6-digit OTP code');
      return;
    }
    setEmailError('');
    setStep(2);
  };

  const handleVerifyStep2 = () => {
    if (!nickname.trim()) return;
    setStep(3);
  };

  const handleFinish = (withPayment: boolean) => {
    onComplete({
      nccuEmail: email,
      nickname: nickname.trim(),
      name: nickname.trim(),
      gender: selectedGender,
      zone: selectedZone,
      isVerifiedStudent: true,
      boundPaymentGateways: withPayment ? selectedGateways : [],
    });
  };

  const toggleGateway = (gatewayId: string) => {
    if (selectedGateways.includes(gatewayId)) {
      setSelectedGateways(selectedGateways.filter(g => g !== gatewayId));
    } else {
      setSelectedGateways([...selectedGateways, gatewayId]);
    }
  };

  const paymentOptions = [
    { id: 'jko_pay', name: '街口支付 (JKOPAY)', desc: '台灣大專生覆蓋率最高', icon: '⚡' },
    { id: 'taiwan_pay', name: '台灣 Pay', desc: '公私立大學金融卡綁定', icon: '🏛️' },
    { id: 'line_pay', name: 'Line Pay', desc: '社群即時快速預授權', icon: '💬' },
    { id: 'credit_card', name: '信用卡 / 學生金融卡', desc: '國際 Visa / Mastercard', icon: '💳' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between items-center p-4 sm:p-6 font-sans relative">
      {/* Top Bar with fixed Bilingual Toggle */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            NL
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight hidden sm:inline">
            {lang === 'zh' ? APP_CONFIG.appName : APP_CONFIG.appNameEn}
          </span>
        </div>

        {/* Minimalist Bilingual Toggle Button */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          title="切換語言 / Toggle Language"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{lang === 'zh' ? 'English' : '繁體中文'}</span>
        </button>
      </header>

      {/* Center Card Gate (Airbnb & Linear Clean Modern Aesthetic) */}
      <main className="w-full max-w-md my-auto py-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-xs mb-1">
              NL
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {lang === 'zh' ? APP_CONFIG.appName : APP_CONFIG.appNameEn}
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

          {/* STEP 1: NCCU Webmail Verification */}
          {step === 1 && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  STEP 1 / 3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'zh' ? '政大專屬身分驗證' : 'NCCU Webmail Verification'}
                </h2>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'zh'
                    ? '為維持高信任度與互助履約，限政大學生信箱驗證註冊。'
                    : 'Requires verified NCCU student webmail to access campus network.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === 'zh' ? '政大學生信箱' : 'NCCU Email Address'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="學號@g.nccu.edu.tw"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                  >
                    {lang === 'zh' ? '發送驗證碼' : 'Send OTP'}
                  </button>
                </div>
                {emailError && (
                  <p className="text-[11px] text-rose-600 font-medium">{emailError}</p>
                )}
              </div>

              {otpSent && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-700">
                      {lang === 'zh' ? '6 位數 OTP 驗證碼' : '6-Digit OTP Code'}
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      ✓ {lang === 'zh' ? '模擬驗證碼已寄發' : 'Demo OTP Ready'}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="849201"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-center font-mono font-bold tracking-widest text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-slate-400 text-center">
                    {lang === 'zh' ? '（輸入任意 6 碼或點擊下一步即可通過驗證）' : '(Enter any 6 digits to verify)'}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyStep1}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>{lang === 'zh' ? '驗證信箱並前往步驟 2' : 'Verify & Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 2: Basic Profile Setup */}
          {step === 2 && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  STEP 2 / 3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'zh' ? '建立個人檔案' : 'Create Profile'}
                </h2>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'zh'
                    ? '設定校內暱稱與安全密碼，選填個人校園偏好。'
                    : 'Set up your nickname, password, and campus preferences.'}
                </p>
              </div>

              {/* Required: Nickname & Password */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'zh' ? '校園暱稱 (必填)' : 'Nickname (Required)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="例如：政大巧芸、山道小騎士"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'zh' ? '設定密碼 (必填)' : 'Password (Required)'}
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位密碼"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Optional: Language Capsule Buttons */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === 'zh' ? '系統語言偏好' : 'Language Preference'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { if (lang !== 'zh') onToggleLang(); }}
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
                    onClick={() => { if (lang !== 'en') onToggleLang(); }}
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

              {/* Optional: Campus Zone Capsules */}
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

              {/* Optional: Gender Tag Capsules */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {lang === 'zh' ? '性別標籤 (選填)' : 'Gender Tag (Optional)'}
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'zh' ? '僅用於附加任務提醒' : 'For secondary task filters only'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'undisclosed', zh: '不公開', en: 'Hidden' },
                    { id: 'female', zh: '生理女', en: 'Female' },
                    { id: 'male', zh: '生理男', en: 'Male' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGender(g.id as any)}
                      className={`py-2 px-2 rounded-xl border text-xs text-center cursor-pointer transition-all ${
                        selectedGender === g.id
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lang === 'zh' ? g.zh : g.en}
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
                  disabled={!nickname.trim()}
                  onClick={handleVerifyStep2}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{lang === 'zh' ? '前往步驟 3 (金流)' : 'Next Step (Payment)'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preferred Payment & Escrow Setup (Optional) */}
          {step === 3 && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  STEP 3 / 3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'zh' ? '偏好的支付與收款方式' : 'Optional Payment Setup'}
                </h2>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'zh'
                    ? '可先行綁定，發布付費任務或接單收款時自動履約；亦可稍後再綁定。'
                    : 'Bind preferred payment gateway for escrow or skip to browse freely.'}
                </p>
              </div>

              {/* Supported Escrow Gateways */}
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
                        onChange={() => {}} // Handled by container onClick
                        className="accent-emerald-600 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons: 先綁定 or 稍後再說，直接進入大廳 */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleFinish(true)}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'zh' ? '先綁定，完成設置進入大廳' : 'Bind & Enter NCCU Loop'}</span>
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

      {/* Tiny unobtrusive Quick Demo Login Link at bottom corner */}
      <footer className="w-full max-w-4xl flex items-center justify-between py-2 text-[11px] text-slate-400">
        <span>© 2026 {APP_CONFIG.appNameEn} · National Chengchi University</span>
        <button
          onClick={onQuickDemoLogin}
          className="text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer"
          title="以測試帳號 (Audrey Chen) 快速登入"
        >
          {lang === 'zh' ? '⚡ Demo 快速登入' : '⚡ Quick Demo Login'}
        </button>
      </footer>
    </div>
  );
};
