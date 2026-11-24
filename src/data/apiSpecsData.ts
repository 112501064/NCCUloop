export interface ApiEndpointDoc {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  category: 'Order Lifecycle' | 'Chat & Anonymity' | 'AI & LLM Services' | 'Dispute & Reports' | 'Escrow & Payments';
  headers: Record<string, string>;
  requestBody?: object;
  response200: object;
  responseError?: {
    status: number;
    body: object;
  };
  notes: string;
}

export const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: 'api_apply_claim',
    method: 'POST',
    path: '/api/v1/tasks/:id/apply-claim',
    summary: '階段一：接單申請 (驗證 AI 女宿安全門檻，進入 Pending_Accept)',
    category: 'Order Lifecycle',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN>',
      'Content-Type': 'application/json',
    },
    requestBody: {
      isAnonymous: true,
      applicantNote: '我現在就在季陶樓，可以立刻協助！',
    },
    response200: {
      success: true,
      status: 'pending_accept',
      message: '接單申請已送出，系統已推播通知發布者核准。',
      applicantId: 'user_nccu_lin',
    },
    responseError: {
      status: 403,
      body: {
        error: 'FEMALE_DORM_RESTRICTION_BLOCKED',
        message: '嚴重阻擋：本任務涉及莊敬女生宿舍區域或私密急救物資，AI 安全模組依校規強制限制僅限女宿認證女性同學接單。',
      },
    },
    notes: '若發布者標記女宿限定，後端自動調用 AI Guardrail 比對接單者學籍性別與信任分。',
  },
  {
    id: 'api_approve_fulfiller',
    method: 'POST',
    path: '/api/v1/tasks/:id/approve-fulfiller',
    summary: '階段一轉階段二：發布者核准接單者，正式成立訂單並開啟 1-on-1 聊天室',
    category: 'Order Lifecycle',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN>',
      'Content-Type': 'application/json',
    },
    requestBody: {
      applicantId: 'user_nccu_lin',
    },
    response200: {
      success: true,
      status: 'in_progress',
      chatRoomId: 'chat_room_88921',
      escrowStatus: 'held',
      message: '接單者已確認！任務正式進入 In_Progress 狀態，雙向 1-on-1 聊天室已建立。',
    },
    notes: '訂單成立後自動發送 WebSocket 廣播通知雙方，金流仍維持在第三方履約帳本。',
  },
  {
    id: 'api_send_chat',
    method: 'POST',
    path: '/api/v1/chat/:id/messages',
    summary: '發送 1-on-1 聊天室訊息 (支援快捷語、圖片附件與 AI 即時翻譯)',
    category: 'Chat & Anonymity',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN>',
      'Content-Type': 'application/json',
    },
    requestBody: {
      content: '我到宿舍門口了，正在二樓交誼廳！',
      messageType: 'text',
      requestAutoTranslate: true,
    },
    response200: {
      messageId: 'msg_99214',
      senderId: 'user_nccu_chen',
      content: '我到宿舍門口了，正在二樓交誼廳！',
      translatedContent: 'I arrived at the dorm entrance, currently at the 2F lounge!',
      timestamp: '12:03:15',
    },
    notes: '後端調用 LLM 輕量模型即時產生中英對照翻譯快取，減少跨國籍交流障礙。',
  },
  {
    id: 'api_reveal_identity_req',
    method: 'POST',
    path: '/api/v1/chat/:id/identity-reveal-request',
    summary: '雙向匿名模式：發起「公開真實身分邀請」',
    category: 'Chat & Anonymity',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN>',
      'Content-Type': 'application/json',
    },
    response200: {
      success: true,
      identityRevealStatus: 'requested_by_creator',
      message: '公開身分邀請已發送，需等待對方在聊天室點擊「同意」方會揭曉真實檔案。',
    },
    notes: '任一方發起後，狀態標記為 requested，在對方未同意前維持校園動物匿名遮蔽。',
  },
  {
    id: 'api_reveal_identity_accept',
    method: 'POST',
    path: '/api/v1/chat/:id/identity-reveal-accept',
    summary: '雙向匿名模式：接受公開真實身分（雙方均同意，正式解鎖）',
    category: 'Chat & Anonymity',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN>',
      'Content-Type': 'application/json',
    },
    response200: {
      success: true,
      identityRevealStatus: 'mutual_revealed',
      creatorProfile: { name: '陳巧芸 (Audrey)', studentId: '112501064', department: '國貿系' },
      fulfillerProfile: { name: '林子翔 (Sean)', studentId: '111306028', department: '資管系' },
    },
    notes: '雙方均同意後，系統推播 WebSocket 事件，前端解鎖個人頭像、系級與真實姓名。',
  },
  {
    id: 'api_ai_refine',
    method: 'POST',
    path: '/api/v1/ai/refine-post',
    summary: 'AI 智慧發文潤飾 (Gemini 2.5 Flash Prompt Refinement)',
    category: 'AI & LLM Services',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN>',
      'Content-Type': 'application/json',
    },
    requestBody: {
      rawTitle: '誰在綜合大樓 來不及印報告',
      rawDescription: '等下10點要交 季陶樓 外語專題 彩色5頁 幫印送過來',
      category: 'emergency',
      location: '季陶樓 (外學院/語言中心)',
    },
    response200: {
      refinedTitle: '【山上急救】季陶樓102教室 課堂報告緊急彩印 5頁',
      refinedDescription: '【求助地點】季陶樓外學院教室\n【突發狀況】等等 10:10 需繳交外語專題彩色紙本報告 5 頁，山上影印店大排長龍，求人在綜合院館或自強舍有彩色印表機的同學救援！\n【感謝回饋】已預扣款託管 NT$120，交付後即刻撥款，非常感謝！',
      tags: ['#緊急列印', '#季陶樓', '#山上校區', '#即刻救援'],
    },
    notes: '透過預設 System Prompt 規範格式、校園地點映射與禮貌語氣潤飾。',
  },
  {
    id: 'api_confirm_completion',
    method: 'POST',
    path: '/api/v1/tasks/:id/confirm-completion',
    summary: '階段三：雙方確認結案機制 (雙向確認解凍託管款 / 24小時無異議自動結案)',
    category: 'Order Lifecycle',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN>',
      'Content-Type': 'application/json',
    },
    requestBody: {
      ratingStars: 5,
      reviewText: '送達速度極快，感謝好心同學！',
    },
    response200: {
      success: true,
      status: 'completed',
      bothPartiesConfirmed: true,
      escrowReleased: true,
      payoutAmount: 80.00,
      message: '雙方皆已確認完成結案！預扣款項已正式撥付至提供者帳戶。',
    },
    notes: '若僅單方點擊確認，狀態為 pending_completion 並啟動 24hr 倒數定時器。',
  },
  {
    id: 'api_dispute_report',
    method: 'POST',
    path: '/api/v1/disputes',
    summary: '發起檢舉與訂單申訴 (即時凍結預扣款並暫停接單權限)',
    category: 'Dispute & Reports',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN>',
      'Content-Type': 'application/json',
    },
    requestBody: {
      taskId: 'post_carpool_006',
      reasonCategory: 'no_show',
      description: '約定 12:00 在麥當勞見面，超過 20 分鐘未出現且聊天室不回應。',
    },
    response200: {
      reportId: 'rpt_8829104',
      status: 'frozen_escrow',
      taskStatus: 'disputed',
      message: '申訴已成功立案！系統已即時凍結該筆預扣款，並暫停被檢舉者接單權限。',
      auditCaseId: 'CASE_20261111_0912',
    },
    notes: '立即鎖定金融帳本狀態為 frozen_dispute，防止任一方惡意提款。',
  },
];
