export interface TechStackItem {
  layer: string;
  technology: string;
  role: string;
  rationale: string;
}

export const TECH_STACK_RECOMMENDATIONS: TechStackItem[] = [
  {
    layer: 'Frontend Client',
    technology: 'Next.js 15 / React 19 + PWA + Tailwind CSS',
    role: 'Cross-platform mobile web app optimized for fast thumb gestures, geolocation, and Web Push.',
    rationale: 'Zero App Store gatekeeper delays, instant updates for campus emergencies, high responsiveness, and native-grade PWA push notifications on iOS & Android.',
  },
  {
    layer: 'API Gateway & Edge',
    technology: 'Cloudflare Workers + NGINX Ingress',
    role: 'SSL termination, DDoS mitigation, rate limiting (防刷單/防掃瞄), and JWT validation.',
    rationale: 'Protects backend from sudden traffic spikes during campus power outages or exam weeks; performs edge geo-IP verification and Webmail domain whitelisting.',
  },
  {
    layer: 'Backend Microservices / Modular Monolith',
    technology: 'Go (Golang 1.23) & Node.js (NestJS / TypeScript)',
    role: 'Core Business API, Escrow Ledger Engine, State Machine, and Realtime WebSocket Gateway.',
    rationale: 'Go provides high concurrency, ultra-low memory footprint and sub-millisecond latencies for escrow lockups and dispatching. NestJS powers developer productivity for complex user/post business logic.',
  },
  {
    layer: 'AI Guardrail & Vision OCR Engine',
    technology: 'Python FastAPI + Google Gemini 2.5 Flash / FastText',
    role: 'Transcript OCR verification, automated prompt/content guardrails, and gender/dorm clearance check.',
    rationale: 'Gemini 2.5 Flash delivers multimodal OCR for student transcripts/IDs in under 700ms with high Taiwanese academic terminology accuracy.',
  },
  {
    layer: 'Smart Dispatch & Recommendation',
    technology: 'Python Celery + pgvector + Redis Geo',
    role: 'Calculates campus topographic distances (Hilltop vs Downhill elevation penalty) and user affinity scores.',
    rationale: 'pgvector allows semantic matching on post descriptions and student skills/tags, while Redis Geo handles instantaneous radius querying.',
  },
  {
    layer: 'Primary Relational Database',
    technology: 'PostgreSQL 16 (with Row-Level Security & pgvector)',
    role: 'ACID transactional source of truth for users, posts, financial escrows, and trust score history.',
    rationale: 'Financial ledger requires strict ACID guarantees and row-level locks (SELECT FOR UPDATE) to prevent double-spending or race conditions during rapid task acceptance.',
  },
  {
    layer: 'Cache & Task Queue',
    technology: 'Redis 7 (Cluster) + BullMQ',
    role: 'Session caching, rate limiting, distributed locking (Redlock), and delayed jobs for escrow auto-refunds.',
    rationale: 'BullMQ handles delayed job queues for 30m/1hr/24hr auto-refund timers with automatic retry and dead-letter queues.',
  },
  {
    layer: 'Payment Gateway Integration',
    technology: 'Line Pay SDK, ECPay (綠界), JKO Pay (街口)',
    role: 'Pay-to-Post pre-authorization escrow deposit, capture, and partial/full refund API.',
    rationale: 'Over 92% of Taiwanese university students utilize Line Pay and ECPay. Pre-auth hold with webhooks ensures zero fraud risk.',
  },
  {
    layer: 'Object Storage & Encrypted Bucket',
    technology: 'Cloudflare R2 / AWS S3 with KMS',
    role: 'Encrypted storage for student ID card selfies, course enrollment screenshots, and transcript OCR inputs.',
    rationale: 'Short-lived signed URLs with automatic 7-day lifecycle purge protect sensitive student personal data (PII compliance).',
  },
];

export const SYSTEM_TOPOLOGY_STEPS = [
  {
    title: '1. 用戶身份認證與雙重驗證 (SSO & Webmail OTP)',
    desc: '所有註冊用戶必須具備政大 @nccu.edu.tw 或 @g.nccu.edu.tw 電子郵件信箱。系統透過 SMTP 與校園 OAuth SSO 驗證學籍，並結合政大 iNCCU / 教務選課系統身分核實。',
  },
  {
    title: '2. 發文前預扣款與多元金流整合 (Pay-to-Post & Escrow)',
    desc: '支援 Line Pay、街口 (JKOPAY)、台灣 Pay、信用卡與平台點數。發布時於第三方金流預扣款暫存於平台履約專戶，提供 100% 超時退款與雙向撥款保護。',
  },
  {
    title: '3. 三階段訂務狀態機 (3-Phase Task Lifecycle State Machine)',
    desc: '從 Draft -> Open -> Pending_Accept (接單申請) -> In_Progress (發布者確認 & 開啟聊天室) -> Pending_Completion (雙方結案確認 / 24hr 倒數) -> Completed。如遇爭議則進入 Disputed 凍結押金。',
  },
  {
    title: '4. 即時通訊與雙向匿名模式 (1-on-1 Chat & Anonymity Reveal)',
    desc: '訂單成立自動開通加密 1-on-1 房間，預設以校園動物暱稱匿名保護隱私。聊天室內支援快捷回覆、一鍵 AI 中英即時翻譯，並支援雙向「公開真實身分」握手流程。',
  },
  {
    title: '5. AI 智慧發文潤飾 (Gemini 2.5 Flash LLM Refine Engine)',
    desc: '整合 LLM 提示工程，將學生簡短零散之想法（如「來不及印報告 誰在綜合大樓」）自動轉化為結構清晰、語意禮貌、包含地點與時限之優質發文。',
  },
];

export const TASK_STATE_MACHINE_DOC = {
  states: [
    { name: 'Draft', desc: '用戶編輯中，尚未完成金流預授權' },
    { name: 'Open', desc: '金流預扣款成功，向校園廣播推流，等待同學接單' },
    { name: 'Pending_Accept', desc: '階段一：接單者發起申請，等待發布者審核確認' },
    { name: 'In_Progress', desc: '階段二：發布者確認接受，自動建立 1-on-1 聊天室' },
    { name: 'Pending_Completion', desc: '階段三：其中一方確認完成，啟動 24hr 無異議自動結案倒數' },
    { name: 'Completed', desc: '雙方皆確認完成，履約專戶保證金解凍劃撥給提供者' },
    { name: 'Disputed', desc: '任一方發起檢舉，款項立即凍結，暫停被檢舉者權限' },
    { name: 'Cancelled_Refunded', desc: '無人接單超時或自主撤回，金流 API 執行 100% 全額退款' },
  ]
};

