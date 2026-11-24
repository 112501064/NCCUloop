import React from 'react';
import { UserProfile, CampusZone, Language } from '../types';
import { I18N } from '../data/i18n';
import { FileCode, Plus, MapPin, Globe } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

interface AppHeaderProps {
  currentUser: UserProfile;
  currentZone: CampusZone;
  onZoneChange: (zone: CampusZone) => void;
  onOpenCreatePost: () => void;
  onOpenUserSwitcher: () => void;
  onOpenTechSpecs: () => void;
  lang: Language;
  onToggleLang: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  currentZone,
  onZoneChange,
  onOpenCreatePost,
  onOpenUserSwitcher,
  onOpenTechSpecs,
  lang,
  onToggleLang,
}) => {
  const t = I18N[lang];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand & Campus Zone selector */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs font-bold font-mono text-sm">
            NL
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>{lang === 'zh' ? APP_CONFIG.appName : APP_CONFIG.appNameEn}</span>
            </div>
            {/* Campus Zone quick pill */}
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="w-3 h-3 text-slate-400" />
              <button
                onClick={() => onZoneChange(currentZone === 'downhill' ? 'uphill' : 'downhill')}
                className="hover:text-slate-800 underline decoration-slate-300 underline-offset-2 cursor-pointer font-medium"
                title={lang === 'zh' ? '點擊切換當前所在地（山下商院/山上季陶樓）' : 'Click to toggle current campus location'}
              >
                {currentZone === 'downhill' ? t.downhill : t.uphill}
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls & Profile */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer font-mono font-semibold"
            title="切換繁體中文 / English"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === 'zh' ? 'EN' : '繁中'}</span>
          </button>

          {/* Tech Spec Doc Button */}
          <button
            onClick={onOpenTechSpecs}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="查看完整系統架構、Schema 與 API 規格"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">{t.techSpecs}</span>
          </button>

          {/* User Persona Switcher */}
          <button
            onClick={onOpenUserSwitcher}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white text-xs text-slate-700 transition-colors cursor-pointer"
            title="點擊切換測試學生角色"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-5 h-5 rounded-full object-cover"
            />
            <span className="font-semibold text-slate-900 hidden sm:inline">
              {lang === 'zh' ? currentUser.name.split(' ')[0] : currentUser.nameEn.split(' ')[0]}
            </span>
            <span className="font-mono text-emerald-700 font-bold">
              ★{currentUser.trustScore}
            </span>
          </button>

          {/* Create Post Action Button */}
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
