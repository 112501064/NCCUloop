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
      return lang === 'zh' ? '事前轉帳（街口 / 台灣 Pay / Line Pay）' : 'Pre-transfer (JKOPAY / Taiwan Pay / Line Pay)';
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
