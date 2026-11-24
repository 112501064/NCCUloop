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
  | 'pending_completion' // 階段三：一方確認結案
  | 'completed'          // 雙方確認結案 / 已領完
  | 'disputed'           // 申訴凍結中
  | 'cancelled'
  | 'closed'             // 名額歸零下架
  | 'expired'            // 已過期（可一鍵重新上架）
  | 'refunded';

export type PaymentMethod = 
  | 'cash_meetup'  // 面交現金
  | 'pre_transfer' // 事前轉帳（街口支付 / 台灣 Pay / Line Pay）
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
  bio?: string;
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
  paymentNote?: string; // 選填：收款帳號或收款連結備註
  payerRole?: 'creator' | 'fulfiller'; // 誰付款：求救任務為發布者付款；二手/共乘為接單者付款
  payerMarkedPaid?: boolean; // 付款方已點擊「我已付款」
  payeeConfirmedReceived?: boolean; // 收款方已點擊「確認已收到款項」
  escrowDeposit: number;
  
  // Multi-quota system for leftovers & group_buy
  totalQuota?: number;
  remainingQuota?: number;
  claimedByUserIds?: string[];
  
  timeOption: TimeOption;
  remainingMinutes?: number; // 用於 +30m 延時與動態倒數顯示
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
  createdAtMs?: number;
  expireAtMs?: number;
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

export type OrderStatus =
  | 'pending_confirm'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export interface OrderItem {
  id: string;
  taskId: string;
  taskTitle: string;
  taskTitleEn?: string;
  taskLocation: string;
  taskLocationEn?: string;
  taskPrice: number;
  paymentMethod: PaymentMethod;
  paymentNote?: string;
  payerRole?: 'creator' | 'fulfiller';
  taskExpireAt?: number;
  creatorUid: string;
  creatorName: string;
  creatorEmail?: string;
  creatorAnonymous: boolean;
  creatorAnonAlias?: string;
  accepterUid: string;
  accepterName: string;
  accepterAnonymous: boolean;
  accepterAnonAlias?: string;
  status: OrderStatus;
  creatorPaidConfirmed: boolean;
  accepterPaidConfirmed: boolean;
  creatorDoneConfirmed: boolean;
  accepterDoneConfirmed: boolean;
  revealCreator: boolean;
  revealAccepter: boolean;
  disputeReason?: string;
  disputedByUid?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface OrderMessage {
  id: string;
  text: string;
  senderUid: string;
  senderName: string;
  createdAtMs?: number;
  timestampText?: string;
}

