import React, { useState } from 'react';
import { DATABASE_SCHEMAS } from '../data/schemaData';
import { Database, Copy, Check, Table, Key, Link2, Sparkles } from 'lucide-react';

export const SchemaTab: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [copied, setCopied] = useState<boolean>(false);

  const currentSchema = DATABASE_SCHEMAS.find(s => s.tableName === selectedTable) || DATABASE_SCHEMAS[0];

  const handleCopySql = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = () => {
    const allSql = DATABASE_SCHEMAS.map(s => s.sql).join('\n\n-- ' + '='.repeat(60) + '\n\n');
    handleCopySql(allSql);
  };

  return (
    <div className="space-y-10">
      {/* Overview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">
              POSTGRESQL 16 · RELATIONAL & VECTOR SCHEMA DESIGN
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              政大互助平台資料庫 Schema 與關聯模型設計
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
              遵循 ACID 交易原則與嚴格外鍵限制，涵蓋學生身分驗證 (@nccu.edu.tw)、女宿安全標記、
              金流預扣款帳本 (Escrow Ledger)、AI 信任履歷模型、與標籤推播訂閱。
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>複製完整 DDL 腳本</span>
            </button>
          </div>
        </div>

        {/* ER Summary Badges */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">涵蓋核心資料表：</span>
          {DATABASE_SCHEMAS.map(s => (
            <button
              key={s.tableName}
              onClick={() => setSelectedTable(s.tableName)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                selectedTable === s.tableName
                  ? 'bg-emerald-700 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {s.tableName}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Table Selector Sidebar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 lg:col-span-1">
          <div className="text-[11px] font-mono text-slate-400 tracking-wider px-2 py-1 uppercase">
            SCHEMAS ({DATABASE_SCHEMAS.length})
          </div>
          {DATABASE_SCHEMAS.map(t => (
            <button
              key={t.tableName}
              onClick={() => setSelectedTable(t.tableName)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                selectedTable === t.tableName
                  ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Table className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{t.tableName}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Schema Detail & SQL Code Viewer */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono text-slate-900">
                  {currentSchema.tableName}
                </h2>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                  POSTGRESQL TABLE
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {currentSchema.description}
              </p>
            </div>

            <button
              onClick={() => handleCopySql(currentSchema.sql)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors self-start shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>複製 DDL</span>
            </button>
          </div>

          {/* SQL Code Block */}
          <div className="relative">
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              <code>{currentSchema.sql}</code>
            </pre>
          </div>

          {/* Indexes & Performance Constraints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <Key className="w-3.5 h-3.5 text-amber-600" />
                索引優化與約束 (Indexes & Constraints)
              </h4>
              <ul className="space-y-1.5 text-xs font-mono text-slate-700">
                {currentSchema.indexes.map((idx, i) => (
                  <li key={i} className="bg-white p-2 rounded border border-slate-200/80 break-all">
                    {idx}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                實體關聯 (Entity Relationships)
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {currentSchema.relations.map((rel, i) => (
                  <li key={i} className="bg-white p-2 rounded border border-slate-200/80 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>{rel}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Database Architectural Insights */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          資料庫架構設計核心規範 (Database Architectural Rationale)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">
              1. 預扣款保證金一致性 (ACID Escrow)
            </span>
            所有的保證金凍結、撥款與退款均包含在單一資料庫 Transaction 內，採用 `SELECT ... FOR UPDATE` 阻止同一任務被多人同時搶單衝突。
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">
              2. 隱私與女宿分級存取 (Row-Level Security)
            </span>
            透過 PostgreSQL RLS（行級安全性），非女性認證帳號無法直接查詢女宿內部特定床位/房號等敏感情資，僅能在通過 AI 審核後獲取必要交付聯絡資訊。
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">
              3. 向量擴展與標籤檢索 (pgvector & GIN Index)
            </span>
            `posts.tags` 欄位建立 GIN 倒排索引，支援高並發關鍵字推播匹配；結合 pgvector 支援語意向量搜尋與家教能力自動匹配。
          </div>
        </div>
      </div>
    </div>
  );
};
