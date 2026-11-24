import React, { useState } from 'react';
import { TECH_STACK_RECOMMENDATIONS, SYSTEM_TOPOLOGY_STEPS } from '../data/architectureData';
import { 
  Server, Shield, Cpu, Database, CreditCard, 
  MapPin, CheckCircle2, ArrowRight, Layers, Bell, 
  Clock, Sparkles
} from 'lucide-react';

export const ArchitectureTab: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('escrow');

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">
            NCCU CAMPUS P2P MUTUAL AID PLATFORM · ARCHITECTURE SPECIFICATION
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            政大學生專屬互助與交易平台 · 系統全棧架構設計
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            針對國立政治大學校園依山傍水之特殊地形（山下商院/莊敬舍至山上季陶樓/綜合院館垂直高差 80m-110m）、
            女生宿舍安全隱私保護、第三方行動金流（Line Pay/街口）發文預扣款保證金機制、以及成績單 OCR 資格認證所打造之生產級高可靠系統架構。
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              高可用 ACID 金流保障
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Shield className="w-4 h-4 text-emerald-600" />
              女宿零容忍安全隔離防護
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <MapPin className="w-4 h-4 text-emerald-600" />
              校園海拔拓撲推流引擎
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Architecture Topology Canvas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              1. 系統拓撲與分散式微服務互動圖 (System Topology Diagram)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              點擊下方各層級組件檢視其職責邊界、安全隔離機制與技術選型實踐
            </p>
          </div>
        </div>

        {/* Visual C4 Diagram Grid */}
        <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 space-y-6">
          {/* Layer 1: Client & Ingress */}
          <div>
            <div className="text-[11px] font-mono text-slate-400 tracking-wider mb-2">
              CLIENT LAYER & EDGE GATEWAY
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div 
                onClick={() => setSelectedService('client')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'client' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Next.js 15 PWA Client</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Mobile Web</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  提供政大學生免下載即開即用體驗，支援 Web Push 急救通報與手機地理定位。
                </p>
              </div>

              <div 
                onClick={() => setSelectedService('gateway')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'gateway' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Cloudflare Edge & WAF</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Security</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  DDoS 防禦、政大網域速率限制 (Rate Limiting 60 req/min)、JWT 邊緣簽章檢驗。
                </p>
              </div>

              <div 
                onClick={() => setSelectedService('notification')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'notification' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">WebSocket & FCM Gateway</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Real-time</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  支援女宿急救廣播、訂閱標籤即時彈窗、以及接單雙方即時位置共享。
                </p>
              </div>
            </div>
          </div>

          {/* Connection flow indicators */}
          <div className="flex items-center justify-center gap-2 text-slate-600 font-mono text-xs">
            <span>↓ gRPC / REST API / Secure WebSocket</span>
          </div>

          {/* Layer 2: Core Microservices */}
          <div>
            <div className="text-[11px] font-mono text-slate-400 tracking-wider mb-2">
              CORE APPLICATION & AI ENGINE TIER
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div 
                onClick={() => setSelectedService('auth')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'auth' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-400">Auth & SSO Service</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Go 1.23</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  政大 Webmail 雙重驗證、性別學籍綁定、女宿通行許可權限管理。
                </p>
              </div>

              <div 
                onClick={() => setSelectedService('escrow')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'escrow' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Escrow Ledger Service</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Line Pay / 街口</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  發文預扣款 (Pre-auth)、雙方完成撥款、超時自動全額退款狀態機。
                </p>
              </div>

              <div 
                onClick={() => setSelectedService('ai_guardrail')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'ai_guardrail' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">AI Guardrail & OCR</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Gemini Multimodal</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  成績單 OCR 自動審核授課資格、女宿安全區域與敏感詞即時過濾。
                </p>
              </div>

              <div 
                onClick={() => setSelectedService('dispatch')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'dispatch' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-400">Smart Dispatch Worker</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">pgvector + Geo</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  計算山頂/山下高差權重、機車擁有狀態、興趣標籤與動態信任評分。
                </p>
              </div>
            </div>
          </div>

          {/* Connection flow indicators */}
          <div className="flex items-center justify-center gap-2 text-slate-600 font-mono text-xs">
            <span>↓ ACID Transactions & Distributed Locks</span>
          </div>

          {/* Layer 3: Storage & Queue */}
          <div>
            <div className="text-[11px] font-mono text-slate-400 tracking-wider mb-2">
              PERSISTENCE, QUEUES & PAYMENT GATEWAYS
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div 
                onClick={() => setSelectedService('postgres')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'postgres' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">PostgreSQL 16</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Relational ACID</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  儲存用戶、任務狀態、金融託管帳本、AI 信任分與 RLS 安全策略。
                </p>
              </div>

              <div 
                onClick={() => setSelectedService('redis')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'redis' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Redis 7 + BullMQ</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Redlock & Queue</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  超時自動退款排程 (30分/24hr)、即時地理位置索引、接單分散式鎖。
                </p>
              </div>

              <div 
                onClick={() => setSelectedService('payment_gateways')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 'payment_gateways' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">3rd-Party Payment APIs</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">FinTech</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  Line Pay V3 API、綠界科技 (ECPay)、街口支付。提供 Pre-Auth 押金預凍結。
                </p>
              </div>

              <div 
                onClick={() => setSelectedService('s3')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedService === 's3' 
                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Encrypted Storage (S3/R2)</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">Encrypted</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  成績單 OCR 暫存、學生證雙面照片加密存儲，支援 7 天自動生命週期清除。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Service Detailed Inspector */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              組件深度分析 (Architecture Component Deep Dive)
            </span>
            <span className="text-xs font-mono text-slate-500">
              STATUS: PRODUCTION ARCHITECTURE READY
            </span>
          </div>

          {selectedService === 'escrow' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                金融託管與預扣款引擎 (Escrow Ledger Engine)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                本模組為確保學生發布付費任務（如女宿急救 $80、二手課本 $650、高鐵票 $215）時，承接者不會被惡意跑單或棄單。
                在貼文正式出現在校園推流前，發文者必須完成第三方金流預扣款（Line Pay Pre-Authorization 或平台點數凍結）。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-900 block">1. 預先扣款 (Pre-Auth Hold)</span>
                  <span className="text-slate-500 mt-1 block">資金暫存於銀行/第三方金流履約專戶，平台記帳為 held 狀態。</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-900 block">2. 雙方握手確認 (Handshake Release)</span>
                  <span className="text-slate-500 mt-1 block">任務完成時，雙方以 OTP 碼完成履約，扣除手續費後款項撥款給接單同學。</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-900 block">3. 超時/取消自動退款 (Zero-Fee Refund)</span>
                  <span className="text-slate-500 mt-1 block">時限到達無人接單或自主撤文，Worker 呼叫金流原路退回 100% 押金。</span>
                </div>
              </div>
            </div>
          )}

          {selectedService === 'ai_guardrail' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                AI 女宿防護邊界與 OCR 資格認證引擎 (AI Guardrails & Multimodal OCR)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                整合政大學籍安全體系。當發布地點涉及莊敬宿舍群（女宿）或包含女性個人急救物資（如衛生棉）時，
                AI 審核模組執行零容忍檢驗：僅允許性別驗證為女性、且 AI 信任分數 $\ge 70$ 之學生接單。
                同時提供 Gemini 2.5 Flash 成績單 OCR 模組，可自動辨識教務系統成績單截圖並授權特定學門家教資格。
              </p>
            </div>
          )}

          {selectedService === 'dispatch' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                校園海拔拓撲推流 (NCCU Topography-Aware Dispatch)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                政大最具挑戰性之校園特色為山下（商學院、莊敬舍、四維堂）與山上（季陶樓、綜合院館、自強舍）之間的劇烈高差。
                一般走路需耗費 20-25 分鐘或等待校園公車。演算法根據接單者是否備有「機車」、當前海拔位置、以及任務急迫性動態計算體力與時間成本，實現最佳化推播。
              </p>
            </div>
          )}

          {!['escrow', 'ai_guardrail', 'dispatch'].includes(selectedService) && (
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {selectedService} 組件架構規範
              </h3>
              <p className="text-sm text-slate-600">
                該組件採用現代雲端原生架構標準設計，符合政大學生隱私與資訊安全規範，支援容器化水平彈性擴展與零信任網路存取控制。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* End-to-End Escrow & Task Sequence */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            2. 任務生命週期與履約預扣款序列圖 (End-to-End Lifecycle Sequence)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            發布者 (Payer) → 金流預扣款 → AI 女宿審核 → 接單者履約 → OTP 撥款 / 超時全額退款
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
          <div className="min-w-[720px] space-y-4">
            <div className="grid grid-cols-4 gap-4 text-center pb-3 border-b border-slate-200 font-semibold text-xs text-slate-700">
              <div className="bg-slate-100 py-2 rounded">發布學生 (Payer)</div>
              <div className="bg-emerald-50 text-emerald-800 py-2 rounded border border-emerald-200">後端核心 API & AI 審核</div>
              <div className="bg-sky-50 text-sky-800 py-2 rounded border border-sky-200">第三方金流 (Line Pay / 綠界)</div>
              <div className="bg-amber-50 text-amber-800 py-2 rounded border border-amber-200">接單學生 (Fulfiller)</div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                <span className="font-mono text-emerald-700 font-bold w-12">01.</span>
                <span className="w-1/4 font-medium text-slate-800">建立貼文與填寫報酬 ($80)</span>
                <span className="flex-1 text-slate-600">呼叫 `/api/v1/posts/prepare-escrow`，檢查女宿限制與標籤合法性</span>
                <span className="text-slate-400 font-mono">POST</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-emerald-50/50 rounded-lg">
                <span className="font-mono text-emerald-700 font-bold w-12">02.</span>
                <span className="w-1/4 font-medium text-slate-800">第三方金流預授權扣款</span>
                <span className="flex-1 text-slate-600">轉跳 Line Pay / 街口完成付款授權，平台暫託款項，狀態更新為 open</span>
                <span className="text-emerald-700 font-mono">PRE-AUTH</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                <span className="font-mono text-emerald-700 font-bold w-12">03.</span>
                <span className="w-1/4 font-medium text-slate-800">AI 推流與女宿安全門檻過濾</span>
                <span className="flex-1 text-slate-600">依據海拔距離與標籤推播；若為女宿衛生棉，嚴格限制限女性且信任分 &gt; 70 者接單</span>
                <span className="text-amber-700 font-mono">AI GUARD</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-sky-50/50 rounded-lg">
                <span className="font-mono text-emerald-700 font-bold w-12">04.</span>
                <span className="w-1/4 font-medium text-slate-800">接單履約與物資送達</span>
                <span className="flex-1 text-slate-600">接單者前往莊敬一舍交誼廳交付衛生棉，發布者核發 6 位數交接 OTP 碼</span>
                <span className="text-sky-700 font-mono">HANDSHAKE</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="font-mono text-emerald-700 font-bold w-12">05-A</span>
                <span className="w-1/4 font-medium text-emerald-900">雙方確認完成撥款 (Release)</span>
                <span className="flex-1 text-emerald-800">系統即時將 $80 撥款至接單同學帳戶（急救求救 0% 手續費），信任分同步提升</span>
                <span className="text-emerald-700 font-bold font-mono">SUCCESS</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                <span className="font-mono text-amber-700 font-bold w-12">05-B</span>
                <span className="w-1/4 font-medium text-amber-900">超時未接單 / 取消發文 (Refund)</span>
                <span className="flex-1 text-amber-800">排程 Worker 偵測到 30 分鐘超時無人接單，自動觸發金流 API 原路 100% 全額退款</span>
                <span className="text-amber-700 font-bold font-mono">AUTO-REFUND</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack Recommendation Matrix */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            3. 全棧架構技術棧選型矩陣 (Production Tech Stack Selection)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            各層技術之職責分工、實作標準與架構權衡分析 (Architecture Trade-offs)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TECH_STACK_RECOMMENDATIONS.map((item, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  {item.layer}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  TIER {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1">
                {item.technology}
              </h3>
              <p className="text-xs text-slate-700 mt-2 font-medium">
                職責：{item.role}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-600">架構決策原因：</span>{item.rationale}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
