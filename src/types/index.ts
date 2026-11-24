export type CampusZone = 'downhill' | 'uphill' | 'dorms' | 'off_campus';

export type Language = 'zh' | 'en';

export interface CampusLocation {
  id: string;
  name: string;
  nameEn: string;
  zone: CampusZone;
  coordinates: { lat: number; lng: number };
  elevation: number; // in meters
  isFemaleDorm?: boolean;
}

export type PostCategory = 
  | 'leftovers'   // 即時剩食 🍱 (預設 2 小時有效)
  | 'emergency'   // 緊急求救 🆘 (15m, 30m, 1h)
  | 'traffic'     // 交通 🚗 (共乘/高鐵車票/客運/計程車湊票)
  | 'marketplace' // 二手市集 📦 (課本、體育用品、日常)
  | 'rental'      // 租房轉租 🏠
  | 'tutor'       // 家教伴讀 🎓
  | 'skill'       // 技能教學 💡
  | 'group_buy';  // 揪團預購 🛒

export type EmergencySubcategory = 
  | 'sanitary_pad'    // 衛生棉救援
  | 'needlework'      // 針線包借用
  | 'emergency_print' // 緊急列印救援
  | 'textbook_urgent' // 課本急借
  | 'sports_gear'     // 體育用品
  | 'mask_medical';   // 口罩救援

export type PostStatus = 
  | 'draft'
  | 'open'
  | 'pending_accept'     // 階段一：接單申請中（待發布者確認）
  | 'in_progress'        // 階段二：進行中 & 1-on-1 雙語聊天室開啟
  | 'pending_completion' // 階段三：一方確認（24h 倒數）
  | 'completed'          // 雙方確認結案 & 款項劃撥
  | 'disputed'           // 申訴凍結中
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type PaymentMethod = 
  | 'jko_pay'      // 街口支付 (JKOPAY)
  | 'taiwan_pay'   // 台灣 Pay
  | 'line_pay'     // Line Pay
  | 'credit_card'  // 信用卡 / 學生金融卡
  | 'campus_points'// 平台點數
  | 'free_aid';    // 免費 / 純互助

export type TimeOption = '15m' | '30m' | '1h' | '2h' | 'custom_time' | 'flexible';

export interface UserProfile {
  id: string;
  studentId: string;
  nccuEmail: string;
  name: string;
  nickname: string;
  nameEn: string;
  gender?: 'female' | 'male' | 'undisclosed' | 'other';
  avatar: string;
  department: string;
  departmentEn: string;
  year: string;
  dormLocation: string;
  dormLocationEn: string;
  zone: CampusZone;
  currentCoordinates: { lat: number; lng: number };
  isVerifiedStudent: boolean;
  trustScore: number;
  completedTasks: number;
  disputeCount: number;
  hasScooter: boolean;
  canTutorSubjects: string[];
  subscribedTags: string[];
  walletBalance: number;
  boundPaymentGateways: string[]; // e.g. ['line_pay', 'jko_pay']
}

export interface PostItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorGender?: 'female' | 'male' | 'undisclosed' | 'other';
  creatorTrustScore: number;
  isCreatorAnonymous?: boolean;
  creatorAnonAlias?: string;
  
  category: PostCategory;
  subcategory?: EmergencySubcategory;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  tags: string[];
  
  rewardAmount: number; // NTD (0 for free)
  isNegotiable?: boolean;
  paymentMethod: PaymentMethod;
  escrowDeposit: number;
  
  timeOption: TimeOption;
  timeRemainingText?: string;
  
  status: PostStatus;
  locationName: string;
  locationNameEn?: string;
  locationCoordinates: { lat: number; lng: number };
  locationZone: CampusZone;
  
  // Secondary non-blocking tag as requested
  femaleOnlyRecommended?: boolean; // 次要提醒標籤 (發布者勾選之提醒，非系統強制阻擋)
  minTrustScoreRequired: number;
  
  // 1-on-1 Fulfillment & 2-way handshake
  applicantId?: string;
  applicantName?: string;
  applicantAvatar?: string;
  applicantTrustScore?: number;
  
  fulfillerId?: string;
  fulfillerName?: string;
  isFulfillerAnonymous?: boolean;
  fulfillerAnonAlias?: string;
  
  creatorConfirmedCompleted?: boolean;
  fulfillerConfirmedCompleted?: boolean;
  identityRevealStatus?: 'none' | 'requested_by_creator' | 'requested_by_fulfiller' | 'mutual_revealed';
  
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
  refundedAt?: string;
}

export interface ChatMessage {
  id: string;
  taskId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  isAnonymous?: boolean;
  content: string;
  translatedContent?: string;
  timestamp: string;
  type: 'text' | 'image' | 'system' | 'identity_reveal_request';
}

export type DisputeCategory = 
  | 'no_show'          // 放鴿子 / 未完成
  | 'harassment'       // 言語騷擾
  | 'malicious_cancel' // 信用瑕疵 / 惡意棄單
  | 'fraud'            // 詐騙 / 不實商品
  | 'other';           // 其他

export interface ReportItem {
  id: string;
  taskId: string;
  taskTitle: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reasonCategory: DisputeCategory;
  description: string;
  status: 'frozen_escrow' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface EscrowTransaction {
  id: string;
  postId: string;
  postTitle: string;
  payerId: string;
  payerName: string;
  payeeId?: string;
  payeeName?: string;
  amount: number;
  platformFee: number;
  netPayout: number;
  paymentMethod: PaymentMethod;
  gatewayTransactionId: string;
  status: 'held' | 'released' | 'refunded' | 'frozen_dispute';
  createdAt: string;
  updatedAt: string;
  refundReason?: string;
}
