import React, { useState } from 'react';
import { X, Layers, Database, Brain, Code2, MapPin, GitCommit } from 'lucide-react';
import { ArchitectureTab } from './ArchitectureTab';
import { SchemaTab } from './SchemaTab';
import { AiEngineTab } from './AiEngineTab';
import { ApiSpecsTab } from './ApiSpecsTab';

interface TechSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechSpecModal: React.FC<TechSpecModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeSubTab, setActiveSubTab] = useState<'wireframe' | 'lbs' | 'architecture' | 'schema' | 'api_specs'>('wireframe');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-50 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              DOC
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                NCCU LOOP · v3 系統架構、LBS 演算法與 UI Wireframe 規格書
              </h2>
              <p className="text-xs text-slate-500">
                減法設計 4-Tab · LBS 距離計算 (Haversine/PostGIS) · 剩食快閃 · 託管金流
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveSubTab('wireframe')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'wireframe' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. UI 流程 Wireframe
              </button>
              <button
                onClick={() => setActiveSubTab('lbs')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'lbs' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. LBS 演算法
              </button>
              <button
                onClick={() => setActiveSubTab('schema')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'schema' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. 資料庫 Schema
              </button>
              <button
                onClick={() => setActiveSubTab('api_specs')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'api_specs' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                4. API 接口規範
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {/* TAB 1: UI Wireframe Flowchart */}
          {activeSubTab === 'wireframe' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  1. 完整 UI 畫面流程圖 (User Flow Wireframe)
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  實施「UI/UX 減法設計原則」，底欄僅保留 4 個核心 Tab，首頁列表卡片極簡化為 4 個核心元素，點擊卡片方展開詳情。
                </p>

                {/* ASCII & Structured Wireframe Grid */}
                <div className="bg-slate-950 text-slate-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
{`+-----------------------------------------------------------------------------------+
|                        NCCU LOOP 核心用戶旅程 (User Flow)                         |
+-----------------------------------------------------------------------------------+

[步驟 1: 三步開戶]
   │
   ├─► 1. 輸入政大 Webmail (@g.nccu.edu.tw / @nccu.edu.tw) -> 發送 6 位數 OTP
   ├─► 2. 設置基本檔案：必填暱稱/密碼/語言，選填頭像/主要活動區域
   └─► 3. 綁定金流 (選填：街口 / 台灣Pay / Line Pay / 信用卡，可先略過瀏覽)
   │
   ▼
[步驟 2: 大廳 Feed 瀏覽 (LBS 卡片流)]
   │
   ├─► 頂部動態篩選膠囊：[全部] [即時剩食 🍱] [緊急求救 🆘] [交通 🚗] [離我最近 📍]
   └─► 資訊卡片化 (4 大關鍵元素)：
       ┌────────────────────────────────────────────────────────┐
       │ [類別 Badge: 即時剩食 🍱]      [距離 Badge: 📍 綜院 • 80m]  │
       │ 法學院演講結束，多出 5 份便當/茶點免費自取！              │
       │ 剩餘 1h 45m                                [免費自取]   │
       └────────────────────────────────────────────────────────┘
   │
   ▼ (點擊卡片彈出詳情，或點擊發布按鈕)
[步驟 3: 任務發布 (Post Modal)]
   │
   ├─► 標題/內文完全自由自訂 +「✨ AI 潤飾/翻譯」按鈕
   ├─► NCCU 地點選擇器 (綜院、商館、季陶、果夫、研創、莊敬舍、自填)
   ├─► 時限設定 (剩食/二手預設 2 小時清庫存；急救 15m/30m/1h)
   └─► 價格模式：固定 NT$、可議價、或「免費/互助」；預扣款押金暫託
   │
   ▼
[步驟 4: 雙向確認與即時聊天室 (Chats View)]
   │
   ├─► 申請接單 -> 任務為 Pending_Accept -> 發布者點擊「確認接受」
   ├─► 成立 1-on-1 雙語對話室 (支援快捷語、圖片、中英即時翻譯)
   ├─► 雙向匿名模式：預設動物暱稱，可於聊天室發起「公開真實身分邀請」
   └─► 檢舉申訴：任一方可點擊「舉報/求助」，凍結押金並暫停被檢舉者權限
   │
   ▼
[步驟 5: 雙方確認結案與釋放撥款]
   │
   └─► 雙方點擊確認完成 (或 24hr 無異議倒數) -> 託管專戶解除，款項撥給提供者！`}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LBS Distance Algorithm & PostGIS */}
          {activeSubTab === 'lbs' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  2. LBS 距離計算與排序演算法 (Haversine & PostGIS)
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  政大校園地處木柵指南山下與半山腰，任務列表需即時計算發布地標與學生當前 GPS 座標之大圓距離（Great-Circle Distance）。
                </p>

                {/* Mathematical Formulation */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                  <div className="font-mono text-xs font-bold text-slate-800 mb-1">
                    數學公式 (Haversine Formula)：
                  </div>
                  <div className="font-mono text-xs bg-white p-3 rounded border border-slate-200 text-slate-700 overflow-x-auto">
                    {`a = sin²(Δφ/2) + cos(φ1) ⋅ cos(φ2) ⋅ sin²(Δλ/2)
c = 2 ⋅ atan2( √a, √(1−a) )
d = R ⋅ c   (其中 R = 6,371,000 公尺)`}
                  </div>
                </div>

                {/* PostGIS SQL Query */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    PostgreSQL / PostGIS 高性能空間索引檢索：
                  </div>
                  <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
{`-- 1. 空間索引建立 (GIST Index)
CREATE INDEX idx_tasks_geom ON tasks USING GIST(geom_point);

-- 2. 距離計算與「離我最近 (Closest First)」排序查詢
SELECT 
    t.id, 
    t.title, 
    t.category,
    t.reward_amount,
    t.expires_at,
    ST_Distance(t.geom_point::geography, ST_MakePoint($user_lng, $user_lat)::geography) AS distance_meters
FROM tasks t
WHERE t.status = 'open' 
  AND t.expires_at > NOW()
ORDER BY distance_meters ASC
LIMIT 30;`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Schema Tab */}
          {activeSubTab === 'schema' && <SchemaTab />}

          {/* TAB 4: API Specs Tab */}
          {activeSubTab === 'api_specs' && <ApiSpecsTab />}
        </div>
      </div>
    </div>
  );
};
