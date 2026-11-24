import React from 'react';
import { PostItem, UserProfile, Language, ChatMessage } from '../types';
import { I18N } from '../data/i18n';
import { MessageSquare, Clock, ArrowRight, ShieldAlert, CheckCircle2, AlertOctagon } from 'lucide-react';

interface ChatsViewProps {
  posts: PostItem[];
  currentUser: UserProfile;
  chatMessagesMap: Record<string, ChatMessage[]>;
  onOpenChat: (post: PostItem) => void;
  lang: Language;
}

export const ChatsView: React.FC<ChatsViewProps> = ({
  posts,
  currentUser,
  chatMessagesMap,
  onOpenChat,
  lang,
}) => {
  const t = I18N[lang];

  // Active chats: posts where user is creator or fulfiller and status is in_progress, pending_accept, pending_completion, or disputed
  const activeChatPosts = posts.filter(p => {
    const isParticipant = p.creatorId === currentUser.id || p.fulfillerId === currentUser.id || p.applicantId === currentUser.id;
    return isParticipant && (
      p.status === 'in_progress' || 
      p.status === 'pending_accept' || 
      p.status === 'pending_completion' || 
      p.status === 'disputed'
    );
  });

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-700" />
          <span>{t.activeChatsTitle}</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full font-bold">
            {activeChatPosts.length}
          </span>
        </h2>
        <span className="text-xs text-slate-500">
          {lang === 'zh' ? '訂單成立自動啟動 1-on-1 加密對話' : '1-on-1 Encrypted Chat'}
        </span>
      </div>

      {activeChatPosts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {t.noActiveChats}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeChatPosts.map(post => {
            const isCreator = post.creatorId === currentUser.id;
            const otherPartyName = isCreator
              ? (post.identityRevealStatus === 'mutual_revealed' 
                  ? post.fulfillerName || '接單同學' 
                  : (post.fulfillerAnonAlias || '匿名接單同學'))
              : (post.identityRevealStatus === 'mutual_revealed'
                  ? post.creatorName
                  : (post.creatorAnonAlias || '匿名發布者'));

            const msgs = chatMessagesMap[post.id] || [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

            return (
              <div
                key={post.id}
                onClick={() => onOpenChat(post)}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-emerald-700/10 border border-emerald-600/30 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      {otherPartyName.slice(0, 1)}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-white"></span>
                  </div>

                  <div className="truncate space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {otherPartyName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        post.status === 'in_progress' ? 'bg-emerald-100 text-emerald-800' :
                        post.status === 'pending_accept' ? 'bg-sky-100 text-sky-800' :
                        post.status === 'pending_completion' ? 'bg-purple-100 text-purple-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {post.status === 'in_progress' ? '進行中' :
                         post.status === 'pending_accept' ? '待確認接單' :
                         post.status === 'pending_completion' ? '待結案' : '爭議凍結'}
                      </span>
                    </div>

                    <p className="text-slate-600 truncate font-medium">
                      {lang === 'zh' ? post.title : (post.titleEn || post.title)}
                    </p>

                    <div className="text-[11px] text-slate-400 truncate">
                      {lastMsg ? `${lastMsg.senderName.split(' ')[0]}: ${lastMsg.content}` : '點擊進入對話...'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="font-mono font-bold text-emerald-800 text-xs">
                    NT$ {post.rewardAmount}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{post.timeRemainingText || '30m'}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
