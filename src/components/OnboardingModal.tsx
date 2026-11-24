import React, { useState } from 'react';
import { UserProfile, Language } from '../types';
import { I18N } from '../data/i18n';
import { 
  X, Mail, CheckCircle2, ShieldCheck, CreditCard, 
  User, Lock, Sparkles, ArrowRight, ArrowLeft
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCompleteOnboarding: (updatedProfile: Partial<UserProfile>) => void;
  lang: Language;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCompleteOnboarding,
  lang,
}) => {
  if (!isOpen) return null;
  const t = I18N[lang];

  const [step, setStep] = useState<number>(1);
  
  // Step 1: Mail & OTP
  const [email, setEmail] = useState<string>('112501064@g.nccu.edu.tw');
  const [otpSent, setOtpSent] = useState<boolean>(true);
  const [otpCode, setOtpCode] = useState<string>('849201');
  const [emailError, setEmailError] = useState<string>('');
  
  // Step 2: Profile
  const [nickname, setNickname] = useState<string>(currentUser.nickname || '政大巧芸');
  const [password, setPassword] = useState<string>('••••••••');
  const [selectedZone, setSelectedZone] = useState<string>('downhill');
  const [avatarIndex, setAvatarIndex] = useState<number>(0);
  
  // Step 3: Payment binding (Optional)
  const [boundLinePay, setBoundLinePay] = useState<boolean>(true);
  const [boundJkoPay, setBoundJkoPay] = useState<boolean>(false);
  const [boundTaiwanPay, setBoundTaiwanPay] = useState<boolean>(false);
  const [boundCreditCard, setBoundCreditCard] = useState<boolean>(false);

  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  ];

  const handleSendOtp = () => {
    if (!email.endsWith('@nccu.edu.tw') && !email.endsWith('@g.nccu.edu.tw')) {
      setEmailError(lang === 'zh' ? '僅限定政大學生信箱 (@g.nccu.edu.tw / @nccu.edu.tw)' : 'Requires NCCU webmail');
      return;
    }
    setEmailError('');
    setOtpSent(true);
  };

  const handleFinish = () => {
    const bound: string[] = [];
    if (boundLinePay) bound.push('line_pay');
    if (boundJkoPay) bound.push('jko_pay');
    if (boundTaiwanPay) bound.push('taiwan_pay');
    if (boundCreditCard) bound.push('credit_card');

    onCompleteOnboarding({
      nccuEmail: email,
      nickname,
      avatar: avatars[avatarIndex],
      boundPaymentGateways: bound,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-xs flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center font-mono font-bold text-xs">
              ✓
            </span>
            <div>
              <h3 className="text-sm font-bold">{t.onboardingTitle}</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                STEP {step} OF 3
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="h-1 bg-slate-100 flex">
          <div className={`h-full bg-emerald-600 transition-all ${
            step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'
          }`} />
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* STEP 1: Webmail Verification */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>{t.step1}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'zh'
                  ? '維持高信任度社群：強制驗證政大官方信箱，保障交易與互助安全。'
                  : 'High trust campus community: Requires official NCCU webmail.'}
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">政大 Webmail</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="學號@g.nccu.edu.tw"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="px-3 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800"
                  >
                    發送 OTP
                  </button>
                </div>
                {emailError && <span className="text-rose-600 text-[10px] mt-1 block">{emailError}</span>}
              </div>

              {otpSent && (
                <div className="pt-2">
                  <label className="block text-slate-700 font-semibold mb-1">6 位數驗證碼 (已寄達)</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center font-mono font-bold tracking-widest text-sm text-emerald-800"
                  />
                  <span className="text-[10px] text-emerald-700 block mt-1">✓ 信箱網域驗證已就緒 (112501064@g.nccu.edu.tw)</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full mt-3 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>下一步：設置個人檔案</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 2: Profile Setup */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <User className="w-4 h-4 text-emerald-600" />
                <span>{t.step2}</span>
              </div>

              {/* Avatar selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">選擇預設校園插畫/大頭貼 (選填)</label>
                <div className="flex gap-2">
                  {avatars.map((av, i) => (
                    <img
                      key={i}
                      src={av}
                      alt="avatar"
                      onClick={() => setAvatarIndex(i)}
                      className={`w-11 h-11 rounded-xl object-cover cursor-pointer border-2 transition-all ${
                        avatarIndex === i ? 'border-emerald-600 scale-105 shadow-xs' : 'border-slate-200 opacity-60'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">校園暱稱 (必填)</label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">登入密碼 (必填)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">主要活動區域 (選填，可隨時更換)</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="downhill">山下校區 (商院/莊敬/四維堂)</option>
                  <option value="uphill">山上校區 (綜合院館/季陶樓)</option>
                  <option value="dorms">舍區 (自強舍/莊敬舍)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>下一步：綁定金流 (選填)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Binding (Optional) */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>{t.step3}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'zh'
                  ? '您可以先不綁定金流直接瀏覽；僅在「發布付費任務」或「接單收款」時需要。支援台灣主流支付：'
                  : 'Optional for browsing. Required only when posting paid tasks or receiving payouts:'}
              </p>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Line Pay</span>
                    <span className="text-[10px] text-slate-400 font-mono">快速預授權</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={boundLinePay}
                    onChange={(e) => setBoundLinePay(e.target.checked)}
                    className="accent-emerald-700 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">街口支付 (JKOPAY)</span>
                    <span className="text-[10px] text-slate-400 font-mono">台灣大專最普遍</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={boundJkoPay}
                    onChange={(e) => setBoundJkoPay(e.target.checked)}
                    className="accent-emerald-700 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">台灣 Pay / 學生金融卡</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={boundTaiwanPay}
                    onChange={(e) => setBoundTaiwanPay(e.target.checked)}
                    className="accent-emerald-700 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>完成設定，進入 NCCU LOOP</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
