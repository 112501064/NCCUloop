export interface DatabaseTableDoc {
  tableName: string;
  description: string;
  sql: string;
  indexes: string[];
  relations: string[];
}

export const DATABASE_SCHEMAS: DatabaseTableDoc[] = [
  {
    tableName: 'tasks (posts)',
    description: '核心訂單與任務表。涵蓋完整狀態機 (Draft -> Pending_Accept -> In_Progress -> Pending_Completion -> Completed / Disputed / Cancelled_Refunded)、雙向匿名標記與多元金流欄位。',
    sql: `-- 1. 任務與訂單狀態機資料表 (Tasks / Posts Table)
CREATE TYPE task_status_enum AS ENUM (
    'draft', 'open', 'pending_accept', 'in_progress', 'pending_completion', 'completed', 'disputed', 'cancelled', 'expired', 'refunded'
);

CREATE TYPE payment_gateway_enum AS ENUM (
    'line_pay', 'jko_pay', 'taiwan_pay', 'credit_card', 'campus_points', 'free_aid'
);

CREATE TYPE time_type_enum AS ENUM ('urgent_30m', 'specific_time', 'flexible');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category VARCHAR(40) NOT NULL,
    subcategory VARCHAR(40),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    
    -- 價格、多元金流與履約專戶
    reward_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
    escrow_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method payment_gateway_enum NOT NULL DEFAULT 'line_pay',
    
    -- 時間型態
    time_type time_type_enum NOT NULL DEFAULT 'urgent_30m',
    scheduled_time_text VARCHAR(100),
    
    -- 狀態機
    status task_status_enum NOT NULL DEFAULT 'draft',
    
    -- 雙向匿名模式
    is_creator_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    creator_anon_alias VARCHAR(60),
    is_fulfiller_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    fulfiller_anon_alias VARCHAR(60),
    identity_reveal_status VARCHAR(30) NOT NULL DEFAULT 'none' CHECK (identity_reveal_status IN ('none', 'requested_by_creator', 'requested_by_fulfiller', 'mutual_revealed')),
    
    -- 接單與雙向確認機制
    applicant_id UUID REFERENCES users(id),
    fulfiller_id UUID REFERENCES users(id),
    creator_confirmed_completed BOOLEAN NOT NULL DEFAULT FALSE,
    fulfiller_confirmed_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completion_window_expires_at TIMESTAMPTZ, -- 一方確認後 24 小時無異議自動結案
    
    -- 地理位置與女宿防護
    location_name VARCHAR(100) NOT NULL,
    campus_zone VARCHAR(20) NOT NULL CHECK (campus_zone IN ('downhill', 'uphill', 'off_campus')),
    female_only_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    min_trust_score INT NOT NULL DEFAULT 60,
    
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
    indexes: [
      'CREATE INDEX idx_tasks_status_creator ON tasks(status, creator_id);',
      'CREATE INDEX idx_tasks_fulfiller ON tasks(fulfiller_id) WHERE fulfiller_id IS NOT NULL;',
      'CREATE INDEX idx_tasks_completion_window ON tasks(completion_window_expires_at) WHERE status = \'pending_completion\';',
    ],
    relations: [
      'Foreign key to users(creator_id)',
      'Foreign key to users(fulfiller_id)',
      '1-to-many with chat_messages(task_id)',
      '1-to-many with reports(task_id)',
    ],
  },
  {
    tableName: 'chat_messages',
    description: '1-on-1 獨立加密聊天室訊息表。支援文字、快捷語、圖片附件、AI 即時翻譯與雙向匿名邀請。',
    sql: `-- 2. 即時聊天室訊息表 (Chat Messages Table)
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    sender_display_alias VARCHAR(60),
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system', 'identity_reveal_request')),
    content TEXT NOT NULL,
    translated_content TEXT,                         -- AI 預先翻譯快取 (中英雙語)
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
    indexes: [
      'CREATE INDEX idx_chat_task_created ON chat_messages(task_id, created_at ASC);',
      'CREATE INDEX idx_chat_sender ON chat_messages(sender_id);',
    ],
    relations: [
      'Foreign key to tasks(id)',
      'Foreign key to users(sender_id)',
    ],
  },
  {
    tableName: 'reports (disputes)',
    description: '檢舉與訂單申訴紀錄表。觸發預扣款凍結 (Frozen Escrow) 與被檢舉者接單權限暫停。',
    sql: `-- 3. 檢舉與申訴仲裁表 (Reports & Disputes Table)
CREATE TYPE dispute_category_enum AS ENUM (
    'harassment', 'no_show', 'malicious_cancel', 'fraud', 'other'
);

CREATE TYPE dispute_status_enum AS ENUM (
    'pending_investigation', 'frozen_escrow', 'upheld_refunded', 'dismissed'
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_user_id UUID NOT NULL REFERENCES users(id),
    category dispute_category_enum NOT NULL,
    description TEXT NOT NULL,
    evidence_image_urls TEXT[] DEFAULT '{}',
    status dispute_status_enum NOT NULL DEFAULT 'frozen_escrow',
    ai_risk_score NUMERIC(5, 4),                     -- NLP 騷擾與合約比對評分
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
    indexes: [
      'CREATE INDEX idx_reports_task ON reports(task_id);',
      'CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);',
      'CREATE INDEX idx_reports_status ON reports(status);',
    ],
    relations: [
      'Foreign key to tasks(id)',
      'Foreign key to users(reporter_id)',
      'Foreign key to users(reported_user_id)',
    ],
  },
  {
    tableName: 'payment_transactions',
    description: '多元金流與第三方履約專戶表。支援 Line Pay、街口、台灣 Pay、信用卡與點數之預扣、凍結、撥款與退款。',
    sql: `-- 4. 多元金流與履約專戶帳本 (Payment Transactions)
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
    payer_id UUID NOT NULL REFERENCES users(id),
    payee_id UUID REFERENCES users(id),
    gateway VARCHAR(30) NOT NULL CHECK (gateway IN ('line_pay', 'jko_pay', 'taiwan_pay', 'credit_card', 'campus_points', 'free_aid')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_payout NUMERIC(10, 2) NOT NULL CHECK (net_payout >= 0),
    gateway_trade_no VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'frozen_dispute')),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
    indexes: [
      'CREATE INDEX idx_pay_tx_task ON payment_transactions(task_id);',
      'CREATE UNIQUE INDEX idx_pay_trade_no ON payment_transactions(gateway_trade_no);',
    ],
    relations: ['Foreign key to tasks(id)'],
  },
  {
    tableName: 'user_preferences',
    description: '用戶雙語偏好、雙向匿名預設開關與 FCM 標籤推播設備設定。',
    sql: `-- 5. 用戶偏好與語言設定 (User Preferences)
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ui_language VARCHAR(10) NOT NULL DEFAULT 'zh' CHECK (ui_language IN ('zh', 'en')),
    default_anonymity_mode BOOLEAN NOT NULL DEFAULT FALSE,
    fcm_token TEXT,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    subscribed_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
    indexes: ['CREATE INDEX idx_pref_lang ON user_preferences(ui_language);'],
    relations: ['Foreign key to users(id)'],
  },
];
