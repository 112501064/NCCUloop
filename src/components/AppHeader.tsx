import React from 'react';
import { UserProfile, CampusZone, Language } from '../types';
import { I18N } from '../data/i18n';
import { Plus, MapPin, Globe, ShieldCheck } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { NccuLoopLogo } from './NccuLoopLogo';

interface AppHeaderProps {
  currentUser: UserProfile;
  currentZone: CampusZone;
  onZoneChange: (zone: CampusZone) => void;
  onOpenCreatePost: () => void;
  onOpenProfile: () => void;
  lang: Language;
  onToggleLang: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  currentZone,
  onZoneChange,
  onOpenCreatePost,
  onOpenProfile,
  lang,
  onToggleLang,
}) => {
  const t = I18N[lang];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand & Campus Zone quick toggle */}
        <div className="flex items-center gap-3 min-w-0">
          <NccuLoopLogo size="sm" className="shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5 truncate">
              <span>{lang === 'zh' ? '政大圈圈' : APP_CONFIG.appNameEn}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <button
                onClick={() => onZoneChange(currentZone === 'downhill' ? 'uphill' : 'downhill')}
                className="hover:text-slate-800 underline decoration-slate-300 underline-offset-2 cursor-pointer font-medium truncate"
                title={lang === 'zh' ? '點擊切換校區位置' : 'Click to switch campus area'}
              >
                {currentZone === 'downhill' ? t.downhill : t.uphill}
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls & Single Verified Profile */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer font-mono font-semibold"
            title="切換繁體中文 / English"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === 'zh' ? 'EN' : '繁中'}</span>
          </button>

          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs text-slate-700 transition-colors cursor-pointer"
            title={currentUser.nccuEmail}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-900 hidden sm:inline max-w-[90px] truncate">
              {currentUser.nickname || currentUser.name}
            </span>
            <span className="font-mono text-emerald-700 font-bold tabular-nums">
              ★{currentUser.trustScore}
            </span>
          </button>

          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.post}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
