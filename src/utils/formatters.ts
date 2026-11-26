import { PaymentMethod, Language } from '../types';

export function formatRemainingMinutes(minutes: number, lang: Language = 'zh'): string {
  if (minutes <= 0) {
    return lang === 'zh' ? '已過期' : 'Expired';
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) {
    return `⏳ ${h}h ${m}m`;
  }
  if (h > 0) {
    return `⏳ ${h}h`;
  }
  return `⏳ ${m}m`;
}

export function formatPaymentMethodLabel(method: PaymentMethod, lang: Language = 'zh'): string {
  switch (method) {
    case 'cash_meetup':
      return lang === 'zh' ? '面交現金' : 'Cash on Meetup';
    case 'pre_transfer':
      return lang === 'zh'
        ? '事前轉帳（街口 / 台灣 Pay / Line Pay）'
        : 'Pre-transfer (JKOPAY / Taiwan Pay / Line Pay)';
    case 'jko_pay':
      return lang === 'zh' ? '事前轉帳（街口支付）' : 'JKOPAY Transfer';
    case 'taiwan_pay':
      return lang === 'zh' ? '事前轉帳（台灣 Pay）' : 'Taiwan Pay Transfer';
    case 'line_pay':
      return lang === 'zh' ? '事前轉帳（Line Pay）' : 'Line Pay Transfer';
    case 'credit_card':
      return lang === 'zh' ? '線下/轉帳確認' : 'Manual Transfer';
    case 'free_aid':
    default:
      return lang === 'zh' ? '免費互助（無須付款）' : 'Free Mutual Aid';
  }
}

export function containsChinese(text?: string): boolean {
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

const SYSTEM_MESSAGE_PAIRS: Array<{ zh: string; en: string }> = [
  {
    zh: '［接單通知］我已申請接單／領取名額，請雙方於此即時聊天室確認交付細節！',
    en: '[Notice] I have requested to take this task. Please coordinate details in this chat!',
  },
  {
    zh: '［接單通知］我已申請接單，請先於聊天室解除匿名並檢視資料後確認接單！',
    en: '[Notice] I applied for this task. Let us reveal profiles first before confirming the order!',
  },
  {
    zh: '［系統通知］發布者已確認接受訂單，請於聊天室約定面交細節！',
    en: '[System] Creator accepted the order. Please coordinate meetup details here!',
  },
  {
    zh: '［系統通知］發布者已正式確認由您接單，訂單成立進行中！',
    en: '[System] Creator officially approved your application. Order is now in progress!',
  },
  {
    zh: '［系統通知］發布者已婉拒此申請，任務名額已重新釋出。',
    en: '[System] Creator declined this application. The task spot has been released.',
  },
  {
    zh: '［付款通知］我已付款完成，請對方確認收款。',
    en: '[Payment] I have completed the payment. Please confirm receipt.',
  },
  {
    zh: '［收款確認］確認已收到款項！',
    en: '[Payment] Confirmed payment received!',
  },
  {
    zh: '［身分揭曉］我已同意解除匿名（雙方皆同意後將顯示暱稱與本名）。',
    en: '[Identity] I agreed to reveal my profile & real name (shown once both agree).',
  },
  {
    zh: '［結案確認］我已確認任務完成，等待對方點擊確認完成。',
    en: '[Completion] I marked this order completed, awaiting peer confirmation.',
  },
  {
    zh: '🎉 雙方皆已確認完成並結案！現在可於下方為對方留下星等評價。',
    en: '🎉 Both parties confirmed completion! You can now leave a star review below.',
  },
  {
    zh: '［已傳送物資 / 轉帳截圖通知］',
    en: '[Photo / transfer receipt notice sent]',
  },
  {
    zh: '我到宿舍門口了！',
    en: 'I arrived at the dorm entrance!',
  },
  {
    zh: '已抵達約定地點。',
    en: 'Arrived at the meeting spot.',
  },
  {
    zh: '已轉帳給您，請查收！',
    en: 'Transferred! Please check.',
  },
  {
    zh: '正在路上，約 5 分鐘後抵達。',
    en: 'On my way, arriving in ~5 mins.',
  },
];

export function localizeChatMessageText(text: string, lang: Language): string {
  const trimmed = text.trim();
  for (const pair of SYSTEM_MESSAGE_PAIRS) {
    if (trimmed === pair.zh || trimmed === pair.en) {
      return lang === 'zh' ? pair.zh : pair.en;
    }
  }
  if (lang === 'en' && trimmed.startsWith('⚠️ 已提交舉報申訴')) {
    return trimmed.replace('⚠️ 已提交舉報申訴', '⚠️ Safety Report Submitted');
  }
  if (lang === 'zh' && trimmed.startsWith('⚠️ Safety Report Submitted')) {
    return trimmed.replace('⚠️ Safety Report Submitted', '⚠️ 已提交舉報申訴');
  }
  return text;
}

const translationCache = new Map<string, string>();

export async function translateTextToEnglish(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';
  if (!containsChinese(clean)) return clean;

  const cached = translationCache.get(clean);
  if (cached) return cached;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=en&dt=t&q=${encodeURIComponent(
      clean
    )}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as unknown;
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = (data[0] as unknown[])
          .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
          .join('')
          .trim();
        if (translated) {
          translationCache.set(clean, translated);
          return translated;
        }
      }
    }
  } catch {
    // try secondary free endpoint
  }

  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      clean.slice(0, 450)
    )}&langpair=zh-TW|en`;
    const res = await fetch(mmUrl);
    if (res.ok) {
      const data = (await res.json()) as { responseData?: { translatedText?: string } };
      const translated = data?.responseData?.translatedText?.trim();
      if (translated) {
        translationCache.set(clean, translated);
        return translated;
      }
    }
  } catch {
    // ignore offline fallback
  }

  return clean;
}
