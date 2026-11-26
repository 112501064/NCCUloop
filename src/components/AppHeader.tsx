import React from 'react';
import { CampusZone, Language } from '../types';
import { I18N } from '../data/i18n';
import { MapPin, Globe } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { NccuLoopLogo } from './NccuLoopLogo';

interface AppHeaderProps {
  currentZone: CampusZone;
  onZoneChange: (zone: CampusZone) => void;
  lang: Language;
  onToggleLang: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentZone,
  onZoneChange,
  lang,
  onToggleLang,
}) => {
  const t = I18N[lang];

  const zoneLabel =
    currentZone === 'uphill'
      ? t.uphill
      : currentZone === 'dorms'
        ? t.dorms
        : currentZone === 'off_campus'
          ? t.off_campus
          : t.downhill;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <NccuLoopLogo size="sm" className="shrink-0" />
          <div className="text-sm font-bold tracking-tight text-slate-900 truncate">
            {lang === 'zh' ? '政大圈圈' : APP_CONFIG.appNameEn}
          </div>
        </div>

        {/* Minimal Right Controls: Location Status Capsule + Bilingual Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onZoneChange(currentZone === 'downhill' ? 'uphill' : 'downhill')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold transition-colors cursor-pointer"
            title={lang === 'zh' ? '點擊切換校區定位' : 'Switch campus zone'}
          >
            <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
            <span>{zoneLabel}</span>
          </button>

          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer font-mono font-semibold"
            title="切換繁體中文 / English"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === 'zh' ? 'EN' : '繁中'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
