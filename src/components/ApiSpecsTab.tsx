import React, { useState } from 'react';
import { API_ENDPOINTS, ApiEndpointDoc } from '../data/apiSpecsData';
import { Send, Check, Copy, Code2, Globe, Shield, Play } from 'lucide-react';

export const ApiSpecsTab: React.FC = () => {
  const [selectedApiId, setSelectedApiId] = useState<string>('api_prepare_escrow');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [executing, setExecuting] = useState<boolean>(false);
  const [mockResponse, setMockResponse] = useState<any>(null);
  const [mockStatus, setMockStatus] = useState<number>(200);
  const [copied, setCopied] = useState<boolean>(false);

  const categories = ['all', 'Auth', 'Posts & Tasks', 'Escrow & Payments', 'Verification & AI', 'Subscriptions'];

  const filteredEndpoints = filterCategory === 'all' 
    ? API_ENDPOINTS 
    : API_ENDPOINTS.filter(e => e.category === filterCategory);

  const currentEndpoint = API_ENDPOINTS.find(e => e.id === selectedApiId) || API_ENDPOINTS[0];

  const handleExecuteMock = () => {
    setExecuting(true);
    setMockResponse(null);
    setTimeout(() => {
      setExecuting(false);
      setMockStatus(200);
      setMockResponse(currentEndpoint.response200);
    }, 450);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">
          RESTFUL & OPENAPI 3.0 SPECIFICATION · API SANDBOX
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          政大互助平台 API 接口設計與互動測試沙盒
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
          包含發文前預扣款保證金建立 (Pre-Auth)、AI 女宿安全審核接單、雙方握手確認撥款、
          超時全額退款、成績單 OCR 辨識、以及標籤推播訂閱之完整 RESTful 規格。
        </p>

        {/* Filter categories */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                filterCategory === cat
                  ? 'bg-emerald-700 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? '全部接口 (All APIs)' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Endpoint List Sidebar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 lg:col-span-4">
          <div className="text-[11px] font-mono text-slate-400 tracking-wider px-2 uppercase">
            ENDPOINTS ({filteredEndpoints.length})
          </div>
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {filteredEndpoints.map(ep => (
              <button
                key={ep.id}
                onClick={() => {
                  setSelectedApiId(ep.id);
                  setMockResponse(null);
                }}
                className={`w-full text-left p-3 rounded-lg text-xs transition-all cursor-pointer border ${
                  selectedApiId === ep.id
                    ? 'bg-emerald-50 border-emerald-300 text-slate-900 shadow-sm'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                    ep.method === 'POST' ? 'bg-emerald-100 text-emerald-800' :
                    ep.method === 'GET' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-slate-800 font-semibold truncate text-[11px]">
                    {ep.path}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  {ep.summary}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detailed API Console & Live Mock Invoker */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 lg:col-span-8 space-y-6">
          {/* Endpoint Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                  currentEndpoint.method === 'POST' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                }`}>
                  {currentEndpoint.method}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-slate-900 break-all">
                  {currentEndpoint.path}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {currentEndpoint.summary}
              </p>
            </div>

            <button
              onClick={handleExecuteMock}
              disabled={executing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm self-start shrink-0 cursor-pointer disabled:opacity-50"
            >
              {executing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>執行中...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>發送測試請求 (Test Call)</span>
                </>
              )}
            </button>
          </div>

          {/* Request Headers */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Request Headers
            </h4>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-xs space-y-1">
              {Object.entries(currentEndpoint.headers).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}:</span>
                  <span className="text-slate-900 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Request Payload */}
          {currentEndpoint.requestBody && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Request JSON Body
                </h4>
                <button
                  onClick={() => handleCopy(JSON.stringify(currentEndpoint.requestBody, null, 2))}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>複製</span>
                </button>
              </div>
              <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800">
                <code>{JSON.stringify(currentEndpoint.requestBody, null, 2)}</code>
              </pre>
            </div>
          )}

          {/* Live Response Panel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Response Output
                </h4>
                {mockResponse && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                    HTTP {mockStatus} OK
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-slate-400">
                {executing ? 'Simulating network latency...' : (mockResponse ? '42ms' : '點擊上方按鈕測試')}
              </span>
            </div>

            <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800 min-h-[140px]">
              <code>
                {mockResponse
                  ? JSON.stringify(mockResponse, null, 2)
                  : JSON.stringify(currentEndpoint.response200, null, 2)}
              </code>
            </pre>
          </div>

          {/* Architecture Notes */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">架構實踐備註：</span>
            <span className="ml-1">{currentEndpoint.notes}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
