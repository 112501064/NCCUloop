import React from 'react';
import { Home, Zap, Plus, MessageCircle, User } from 'lucide-react';
import { Language } from '../types';
import { I18N } from '../data/i18n';

export type AppNavTab = 'feed' | 'flash' | 'post' | 'chats' | 'profile';

interface BottomNavigationProps {
  activeTab: AppNavTab;
  onChangeTab: (tab: AppNavTab) => void;
  onOpenCreatePost: () => void;
  activeChatsCount?: number;
  flashCount?: number;
  lang: Language;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenCreatePost,
  activeChatsCount = 0,
  flashCount = 0,
  lang,
}) => {
  const t = I18N[lang];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-sm">
      <div className="max-w-lg mx-auto px-2 h-16 grid grid-cols-5 items-center">
        {/* 1. 大廳 (Feed) - Home Icon */}
        <button
          type="button"
          onClick={() => onChangeTab('feed')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === 'feed'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'feed' ? 'stroke-[2.3]' : ''}`} />
          <span className="text-[11px]">{t.tabFeed}</span>
        </button>

        {/* 2. 快閃/急件 (Flash) - Leftovers (2h) + Emergency SOS */}
        <button
          type="button"
          onClick={() => onChangeTab('flash')}
          className={`relative flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === 'flash'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <Zap className={`w-5 h-5 ${activeTab === 'flash' ? 'stroke-[2.3]' : ''}`} />
            {flashCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold flex items-center justify-center tabular-nums">
                {flashCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">{t.tabFlash}</span>
        </button>

        {/* 3. 發布 (Post) - Centered Circular Action Button */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={onOpenCreatePost}
            className="flex flex-col items-center justify-center -mt-5 cursor-pointer group"
            title={lang === 'zh' ? '發布新任務' : 'Create Task'}
          >
            <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg ring-4 ring-white group-hover:bg-emerald-700 transition-all group-active:scale-95">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] text-slate-600 font-bold mt-1">{t.tabPost}</span>
          </button>
        </div>

        {/* 4. 訊息 (Chats) - MessageCircle Icon + Unread Red Dot */}
        <button
          type="button"
          onClick={() => onChangeTab('chats')}
          className={`relative flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === 'chats'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <MessageCircle className={`w-5 h-5 ${activeTab === 'chats' ? 'stroke-[2.3]' : ''}`} />
            {activeChatsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-2xs tabular-nums">
                {activeChatsCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">{t.tabChats}</span>
        </button>

        {/* 5. 個人 (Profile) - User Icon */}
        <button
          type="button"
          onClick={() => onChangeTab('profile')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'text-slate-900 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.3]' : ''}`} />
          <span className="text-[11px]">{t.tabProfile}</span>
        </button>
      </div>
    </nav>
  );
};
