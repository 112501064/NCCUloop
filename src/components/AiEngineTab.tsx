import React, { useState } from 'react';
import { AI_ALGORITHMS } from '../data/pseudocodeData';
import { 
  ShieldCheck, Brain, Calculator, MapPin, 
  CheckCircle2, XCircle, AlertTriangle, ArrowUpDown, 
  Clock, ShieldAlert, Sparkles, Sliders
} from 'lucide-react';

export const AiEngineTab: React.FC = () => {
  const [selectedAlgoId, setSelectedAlgoId] = useState<string>('algo_female_dorm_guardrail');

  // Playground 1: Trust Score Calculator State
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [completedTasks, setCompletedTasks] = useState<number>(24);
  const [cancelledCount, setCancelledCount] = useState<number>(1);
  const [disputeCount, setDisputeCount] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(4.9);

  // Trust Score Math Formulation
  const baseScore = isVerified ? 30 : 10;
  const totalAccepted = completedTasks + cancelledCount;
  const fulfillmentRate = totalAccepted === 0 ? 1.0 : (completedTasks + 2.0) / (totalAccepted + 2.0);
  const fulfillmentScore = 35.0 * fulfillmentRate;
  const ratingScore = 25.0 * (avgRating / 5.0);
  const volumeBonus = Math.min(10.0, Math.log2(completedTasks + 1) * 2.0);
  const penalty = (disputeCount * 15.0) + (cancelledCount * 5.0);
  const rawTrustScore = baseScore + fulfillmentScore + ratingScore + volumeBonus - penalty;
  const calculatedTrustScore = Math.round(Math.max(0, Math.min(100, rawTrustScore)));
  const isHighRisk = calculatedTrustScore < 60 || disputeCount >= 2;

  // Playground 2: Female Dorm Guardrail Interactive Test
  const [testGender, setTestGender] = useState<'female' | 'male'>('female');
  const [testVerified, setTestVerified] = useState<boolean>(true);
  const [testScore, setTestScore] = useState<number>(85);
  const [testLocation, setTestLocation] = useState<string>('莊敬一舍二樓女宿 (急救衛生棉)');

  const guardrailDecision = (() => {
    if (!testVerified) {
      return {
        allowed: false,
        code: 'REJECTED_UNVERIFIED_STUDENT',
        message: '阻擋：用戶未完成政大 @nccu.edu.tw Webmail 學生身分驗證。',
      };
    }
    if (testLocation.includes('女宿') && testGender !== 'female') {
      return {
        allowed: false,
        code: 'BLOCKED_GENDER_MISMATCH_DORM_RESTRICTION',
        message: '嚴重阻擋：本任務涉及女生宿舍內部管制區域或私密物資，AI 審核強制限制女性驗證學生接單。',
      };
    }
    if (testScore < 70) {
      return {
        allowed: false,
        code: 'REJECTED_LOW_TRUST_SCORE',
        message: '阻擋：女宿安全與高風險求救任務，接單者信任履歷分數門檻須達 70 分以上 (目前: ' + testScore + ' 分)。',
      };
    }
    return {
      allowed: true,
      code: 'APPROVED_FEMALE_DORM_ACCESS',
      message: '通過：符合女性驗證身分與信譽門檻 (★' + testScore + ')，AI 已核發暫時性交接 OTP 碼。',
    };
  })();

  // Playground 3: Topography Feed Re-ranking Simulator
  const [userZone, setUserZone] = useState<'downhill' | 'uphill'>('downhill');
  const [hasScooter, setHasScooter] = useState<boolean>(false);

  // Sample tasks to simulate ranking
  const simulatedTasks = [
    {
      title: '【極急】女宿生理期衛生棉外送',
      location: '山下 莊敬一舍 (海拔 25m)',
      zone: 'downhill',
      elevation: 25,
      isEmergency: true,
      tags: ['#女宿衛生棉', '#即刻救援'],
    },
    {
      title: '【課堂急印】季陶樓報告彩色列印 5 頁',
      location: '山上 季陶樓 (海拔 110m)',
      zone: 'uphill',
      elevation: 110,
      isEmergency: true,
      tags: ['#緊急列印', '#季陶樓'],
    },
    {
      title: '二手 Mankiw 經濟學原理課本',
      location: '山下 商學院一樓 (海拔 30m)',
      zone: 'downhill',
      elevation: 30,
      isEmergency: false,
      tags: ['#經濟學課本', '#商學院'],
    },
    {
      title: '下大雨機車共乘直達山上綜合院館',
      location: '山下 麥當勞門口 (海拔 22m)',
      zone: 'downhill',
      elevation: 22,
      isEmergency: false,
      tags: ['#共乘', '#山頂綜院'],
    },
  ];

  // Calculate simulated ranking score
  const rankedTasks = [...simulatedTasks].map(task => {
    const userElevation = userZone === 'downhill' ? 28 : 105;
    const elevationDelta = Math.abs(userElevation - task.elevation);
    const topoPenalty = hasScooter ? elevationDelta / 800 : elevationDelta / 120;
    const geoScore = 1.0 / (1.0 + topoPenalty);
    const urgencyScore = task.isEmergency ? 1.8 : 0.4;
    const totalScore = (0.5 * geoScore) + (0.5 * urgencyScore);
    return {
      ...task,
      elevationDelta,
      geoScore: geoScore.toFixed(3),
      totalScore: totalScore.toFixed(3),
    };
  }).sort((a, b) => Number(b.totalScore) - Number(a.totalScore));

  const currentAlgo = AI_ALGORITHMS.find(a => a.id === selectedAlgoId) || AI_ALGORITHMS[0];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">
          AI CORE ENGINE · ALGORITHMIC LOGIC & PSEUDOCODE
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          AI 核心審核、動態信任履歷與智慧推流模組
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
          包含女宿進入安全防護門檻判定、動態信任分計算（Laplace 平滑與反刷單對數衰減）、
          政大垂直海拔高差（山頂/山下）情境推流演算法、以及超時未履約自動全額退款背景工作排程。
        </p>

        {/* Algo Tab Buttons */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
          {AI_ALGORITHMS.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAlgoId(a.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedAlgoId === a.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {a.title.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm Deep Dive: Math + Pseudocode */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-mono text-emerald-700 font-bold uppercase">
              {currentAlgo.category}
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {currentAlgo.title}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {currentAlgo.description}
            </p>
          </div>
        </div>

        {/* Mathematical Formulation */}
        {currentAlgo.mathFormula && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              <span>數學形式化定義 (Formal Mathematical Formulation)</span>
            </div>
            <div className="font-mono text-xs sm:text-sm text-slate-800 bg-white p-3 rounded border border-slate-200/80 overflow-x-auto">
              <code>{currentAlgo.mathFormula}</code>
            </div>
          </div>
        )}

        {/* Pseudocode Editor Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">PSEUDOCODE SPECIFICATION (PRODUCTION ALGORITHM)</span>
            <span className="font-mono text-[11px] text-slate-600">TypeScript / Pythonic Style</span>
          </div>
          <pre className="bg-slate-950 text-slate-200 p-5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
            <code>{currentAlgo.pseudocode}</code>
          </pre>
        </div>

        {/* Key Highlights */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4">
          <span className="text-xs font-bold text-emerald-900 block mb-2">
            演算法核心工程亮點 (Engineering Guardrails & Optimizations)：
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-emerald-800">
            {currentAlgo.keyHighlights.map((hl, i) => (
              <div key={i} className="flex items-start gap-2 bg-white/70 p-2.5 rounded border border-emerald-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{hl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Simulation Playgrounds */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            AI 演算法互動沙盒與即時實驗室 (Interactive Algorithm Sandboxes)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            可即時調整參數，直接驗證女宿安全門檻、信任履歷公式與校園高差推流邏輯
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sandbox 1: Trust Score Calculator */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                即時信任分計算機
              </h3>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                isHighRisk ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isHighRisk ? '高風險帳號' : '優良信譽'}
              </span>
            </div>

            {/* Score Output Card */}
            <div className="bg-slate-900 text-white rounded-lg p-4 text-center">
              <div className="text-[11px] font-mono text-slate-400">CALCULATED TRUST SCORE</div>
              <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">
                {calculatedTrustScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                履約率: {(fulfillmentRate * 100).toFixed(1)}% · 違規扣分: -{penalty}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span>完成任務次數</span>
                  <span className="font-mono font-bold">{completedTasks} 次</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={completedTasks}
                  onChange={(e) => setCompletedTasks(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span>惡意取消/棄單次數 (-5/次)</span>
                  <span className="font-mono font-bold text-amber-700">{cancelledCount} 次</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={cancelledCount}
                  onChange={(e) => setCancelledCount(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span>檢舉糾紛成立 (-15/次)</span>
                  <span className="font-mono font-bold text-rose-700">{disputeCount} 次</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={disputeCount}
                  onChange={(e) => setDisputeCount(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span>互評平均星等 (1.0 - 5.0)</span>
                  <span className="font-mono font-bold">{avgRating.toFixed(1)} ★</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={avgRating}
                  onChange={(e) => setAvgRating(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-600">政大 Webmail 雙重驗證</span>
                <button
                  onClick={() => setIsVerified(!isVerified)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isVerified ? '已驗證 (+30分)' : '未驗證 (+10分)'}
                </button>
              </div>
            </div>
          </div>

          {/* Sandbox 2: Female Dorm Guardrail Inspector */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                女宿安全防護門檻判定
              </h3>
              <span className="text-[11px] font-mono text-slate-400">ZERO TOLERANCE</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">目標任務情境</label>
                <select
                  value={testLocation}
                  onChange={(e) => setTestLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                >
                  <option value="莊敬一舍二樓女宿 (急救衛生棉)">莊敬一舍二樓女宿 (急救衛生棉) [女宿限定]</option>
                  <option value="商學院一樓中庭 (二手經濟學課本)">商學院一樓中庭 (二手課本) [一般開放]</option>
                  <option value="自強六舍男宿 (針線包借用)">自強六舍男宿 (針線包借用) [一般開放]</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">嘗試接單之學生性別</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTestGender('female')}
                    className={`py-1.5 rounded border text-xs font-medium cursor-pointer ${
                      testGender === 'female' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    女性 (Female)
                  </button>
                  <button
                    onClick={() => setTestGender('male')}
                    className={`py-1.5 rounded border text-xs font-medium cursor-pointer ${
                      testGender === 'male' ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    男性 (Male)
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>接單者信任分數</span>
                  <span className="font-mono font-bold">★{testScore} (門檻: 70)</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={testScore}
                  onChange={(e) => setTestScore(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600">學籍信箱雙重驗證</span>
                <input
                  type="checkbox"
                  checked={testVerified}
                  onChange={(e) => setTestVerified(e.target.checked)}
                  className="accent-emerald-600 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Guardrail Output Banner */}
              <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                guardrailDecision.allowed 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {guardrailDecision.allowed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
                  <span>{guardrailDecision.code}</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  {guardrailDecision.message}
                </p>
              </div>
            </div>
          </div>

          {/* Sandbox 3: Topography Feed Re-ranking Simulator */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                校園海拔拓撲推流模擬
              </h3>
              <span className="text-[11px] font-mono text-slate-400">ELEVATION DELTA</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">當前用戶所在校區</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setUserZone('downhill')}
                    className={`py-1.5 rounded border text-xs font-medium cursor-pointer ${
                      userZone === 'downhill' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    山下 (商院/莊敬 28m)
                  </button>
                  <button
                    onClick={() => setUserZone('uphill')}
                    className={`py-1.5 rounded border text-xs font-medium cursor-pointer ${
                      userZone === 'uphill' ? 'bg-sky-50 border-sky-500 text-sky-900' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    山上 (季陶/自強 105m)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-700">具備校園通行機車 (Scooter)</span>
                <input
                  type="checkbox"
                  checked={hasScooter}
                  onChange={(e) => setHasScooter(e.target.checked)}
                  className="accent-emerald-600 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Dynamic Feed Output */}
              <div className="space-y-2 pt-1">
                <span className="text-slate-500 text-[11px] block">推播 Feed 即時動態排序結果：</span>
                {rankedTasks.map((t, idx) => (
                  <div key={idx} className="p-2 rounded border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 truncate">{idx + 1}. {t.title}</div>
                      <div className="text-[10px] text-slate-600">
                        {t.location} · 高差 {t.elevationDelta}m
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-bold text-emerald-700">
                        Score {t.totalScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
