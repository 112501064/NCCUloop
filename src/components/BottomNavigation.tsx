import React from 'react';
import { Compass, MessageSquare, Plus, User } from 'lucide-react';
import { Language } from '../types';
import { I18N } from '../data/i18n';

export type AppNavTab = 'feed' | 'chats' | 'post' | 'profile';

interface BottomNavigationProps {
  activeTab: AppNavTab;
  onChangeTab: (tab: AppNavTab) => void;
  onOpenCreatePost: () => void;
  activeChatsCount?: number;
  lang: Language;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenCreatePost,
  activeChatsCount = 1,
  lang,
}) => {
  const t = I18N[lang];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-sm">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
        {/* Tab 1: 📍 大廳 (Feed) */}
        <button
          onClick={() => onChangeTab('feed')}
          className={`flex flex-col items-center justify-center gap-1 w-16 py-1 text-center transition-colors cursor-pointer ${
            activeTab === 'feed' ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[11px]">{t.tabFeed}</span>
        </button>

        {/* Tab 2: 💬 訊息 (Chats) */}
        <button
          onClick={() => onChangeTab('chats')}
          className={`relative flex flex-col items-center justify-center gap-1 w-16 py-1 text-center transition-colors cursor-pointer ${
            activeTab === 'chats' ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {activeChatsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                {activeChatsCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">{t.tabChats}</span>
        </button>

        {/* Tab 3: ➕ 發布 (Floating Action Button) */}
        <button
          onClick={onOpenCreatePost}
          className="flex flex-col items-center justify-center -mt-5 cursor-pointer group"
          title={lang === 'zh' ? '發布新任務' : 'Create Task'}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-lg group-hover:bg-emerald-800 transition-all group-active:scale-95">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] text-slate-500 font-bold mt-1">{t.tabPost}</span>
        </button>

        {/* Tab 4: 👤 個人 (Profile) */}
        <button
          onClick={() => onChangeTab('profile')}
          className={`flex flex-col items-center justify-center gap-1 w-16 py-1 text-center transition-colors cursor-pointer ${
            activeTab === 'profile' ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[11px]">{t.tabProfile}</span>
        </button>
      </div>
    </nav>
  );
};
