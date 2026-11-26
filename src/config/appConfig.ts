/**
 * NCCU Loop 平台全域自訂設定 (Customizable App Configuration)
 * 供開發者隨時調整 App 名稱、註冊頁標語、政大地標清單、支援金流與預設過期時限。
 */

export interface AppConfig {
  appName: string;
  appNameEn: string;
  tagline: string;
  taglineEn: string;
  primaryColor: string; // 主色調，預設深岩灰 #0F172A
  accentColor: string;  // 強調色，預設翡翠綠 #10B981
  bgWhite: string;
  bgSubtle: string;
  campusLocations: string[];
  campusLocationsEn: string[];
  paymentMethods: string[];
  defaultExpireHours: number;
}

export const APP_CONFIG: AppConfig = {
  // App 名稱與標語
  appName: "NCCU Loop 政大圈圈",
  appNameEn: "NCCU Loop",
  tagline: "政大人專屬的即時校園互助圈",
  taglineEn: "Real-time Campus Mutual Aid Network for NCCU",

  // 視覺主色與強調色
  primaryColor: "#0F172A", // 深岩灰 (Primary Slate)
  accentColor: "#10B981",  // 翡翠綠 (Accent Emerald - 距離與即時剩食)
  bgWhite: "#FFFFFF",
  bgSubtle: "#F8FAFC",

  // 政大校園地標快速清單 (可自行增減)
  campusLocations: [
    "綜院",
    "商館",
    "行政大樓",
    "季陶樓",
    "果夫樓",
    "百年樓",
    "山上綜合大樓",
    "藝文中心",
    "莊敬舍",
    "自強舍",
    "水岸運動公園"
  ],
  campusLocationsEn: [
    "General Bldg (Law/Social)",
    "Commerce Bldg",
    "Admin Bldg Plaza",
    "JiTao Hall",
    "Guofu Hall",
    "Bainian Hall",
    "Uphill Complex",
    "Arts Center",
    "ZhuangJing Dorms",
    "ZiQiang Dorms",
    "Riverside Sports Park"
  ],

  // 支援的託管金流管道
  paymentMethods: [
    "街口支付",
    "台灣 Pay",
    "Line Pay",
    "信用卡"
  ],

  // 預設過期時限 (小時) - 適合即時清剩食與二手出清，避免久置
  defaultExpireHours: 2,
};

export const ADMIN_EMAILS: string[] = [
  '112501064@g.nccu.edu.tw',
  'admin@nccu.edu.tw',
  'admin@g.nccu.edu.tw',
  'ncculoop.admin@nccu.edu.tw',
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function isAllowedNccuEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return lower.endsWith('@g.nccu.edu.tw') || lower.endsWith('@nccu.edu.tw');
}

