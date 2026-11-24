import React, { useState } from 'react';
import { PostItem, UserProfile, ChatMessage, Language } from '../types';
import { I18N } from '../data/i18n';
import { 
  X, Send, Languages, ShieldAlert, CheckCircle2, 
  UserCheck, UserX, AlertTriangle, ArrowRight, Sparkles, Image as ImageIcon
} from 'lucide-react';

interface ChatRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostItem;
  currentUser: UserProfile;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onRequestRevealIdentity: (postId: string) => void;
  onAcceptRevealIdentity: (postId: string) => void;
  onConfirmCompletion: (postId: string) => void;
  onOpenDispute: (post: PostItem) => void;
  lang: Language;
}

export const ChatRoomModal: React.FC<ChatRoomModalProps> = ({
  isOpen,
  onClose,
  post,
  currentUser,
  messages,
  onSendMessage,
  onRequestRevealIdentity,
  onAcceptRevealIdentity,
  onConfirmCompletion,
  onOpenDispute,
  lang,
}) => {
  if (!isOpen) return null;

  const t = I18N[lang];
  const [inputText, setInputText] = useState<string>('');
  const [translatedMap, setTranslatedMap] = useState<Record<string, boolean>>({});

  const isCreator = currentUser.id === post.creatorId;
  const otherPartyName = isCreator
    ? (post.identityRevealStatus === 'mutual_revealed' 
        ? post.fulfillerName || '接單同學' 
        : (post.fulfillerAnonAlias || '匿名接單同學'))
    : (post.identityRevealStatus === 'mutual_revealed'
        ? post.creatorName
        : (post.creatorAnonAlias || '匿名發布者'));

  const quickPhrases = [
    lang === 'zh' ? '我到宿舍門口了！' : 'I arrived at the dorm entrance!',
    lang === 'zh' ? '已列印完成，正在走過去。' : 'Printed completed, walking over.',
    lang === 'zh' ? '已放在二樓交誼廳桌上！' : 'Placed on the 2F lounge table!',
    lang === 'zh' ? '正在路上，約 5 分鐘後抵達。' : 'On my way, arriving in ~5 mins.',
  ];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const toggleTranslate = (msgId: string) => {
    setTranslatedMap(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const hasMyConfirmed = isCreator 
    ? Boolean(post.creatorConfirmedCompleted) 
    : Boolean(post.fulfillerConfirmedCompleted);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Chat Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-400/50 flex items-center justify-center text-sm font-bold text-white">
                {otherPartyName.slice(0, 1)}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-slate-900"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  {otherPartyName}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  post.identityRevealStatus === 'mutual_revealed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {post.identityRevealStatus === 'mutual_revealed' 
                    ? (lang === 'zh' ? '已公開身分' : 'Real ID Revealed') 
                    : (lang === 'zh' ? '匿名防護中' : 'Anonymous Mode')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                {lang === 'zh' ? post.title : (post.titleEn || post.title)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenDispute(post)}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-500/40 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="發起申訴並凍結押金"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{t.reportDispute}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Identity Reveal & Escrow Action Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          {/* Identity Reveal status */}
          <div className="flex items-center gap-1.5 text-slate-600">
            {post.identityRevealStatus === 'mutual_revealed' ? (
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t.revealedStatus}</span>
              </span>
            ) : post.identityRevealStatus === 'requested_by_creator' && !isCreator ? (
              <button
                onClick={() => onAcceptRevealIdentity(post.id)}
                className="flex items-center gap-1 text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded font-bold cursor-pointer"
              >
                <span>發布者邀請公開身分，點擊同意</span>
              </button>
            ) : post.identityRevealStatus === 'requested_by_fulfiller' && isCreator ? (
              <button
                onClick={() => onAcceptRevealIdentity(post.id)}
                className="flex items-center gap-1 text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded font-bold cursor-pointer"
              >
                <span>接單者邀請公開身分，點擊同意</span>
              </button>
            ) : post.identityRevealStatus?.startsWith('requested') ? (
              <span className="text-amber-700 font-medium">
                {t.revealRequested}
              </span>
            ) : (
              <button
                onClick={() => onRequestRevealIdentity(post.id)}
                className="text-slate-600 hover:text-slate-900 underline decoration-slate-300 cursor-pointer"
              >
                + {t.requestReveal}
              </button>
            )}
          </div>

          {/* Two-party Completion Trigger */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono">
              NT$ {post.rewardAmount} 託管中
            </span>
            <button
              onClick={() => onConfirmCompletion(post.id)}
              disabled={hasMyConfirmed || post.status === 'completed'}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 ${
                post.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : hasMyConfirmed
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {post.status === 'completed'
                  ? (lang === 'zh' ? '已雙向結案' : 'Completed')
                  : hasMyConfirmed
                    ? (lang === 'zh' ? '已確認，等待對方' : 'Awaiting Other Party')
                    : (lang === 'zh' ? '雙向確認結案' : 'Confirm Completion')}
              </span>
            </button>
          </div>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          <div className="text-center my-2">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-mono">
              {lang === 'zh' ? '系統已為本訂單建立端對端加密對話 · 預扣款暫託於履約專戶' : 'End-to-End Chat Initialized · Escrow Funds Held in Custody'}
            </span>
          </div>

          {messages.map(msg => {
            const isMe = msg.senderId === currentUser.id;
            const isTranslated = Boolean(translatedMap[msg.id]);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                  <span>{isMe ? (lang === 'zh' ? '我' : 'Me') : msg.senderName}</span>
                  <span>·</span>
                  <span className="font-mono">{msg.timestamp}</span>
                </div>

                <div className="flex items-end gap-1.5 max-w-[85%]">
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-emerald-700 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs'
                    }`}
                  >
                    <div>{isTranslated && msg.translatedContent ? msg.translatedContent : msg.content}</div>

                    {/* Translation hint if active */}
                    {isTranslated && msg.translatedContent && (
                      <div className="mt-1 pt-1 border-t border-emerald-600/40 text-[10px] text-emerald-100 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI 翻譯自: {msg.content}</span>
                      </div>
                    )}
                  </div>

                  {/* Translate button */}
                  {msg.translatedContent && (
                    <button
                      onClick={() => toggleTranslate(msg.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                      title="AI 中英即時翻譯"
                    >
                      <Languages className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Phrases Strip */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] text-slate-400 shrink-0 font-medium">{t.quickPhrases}:</span>
          {quickPhrases.map((phrase, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSendMessage(phrase)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Message Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSendMessage(lang === 'zh' ? '［圖片物資已拍照確認］' : '[Photo of delivery item sent]')}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="發送照片"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={lang === 'zh' ? '輸入訊息... 支援即時快捷語與一鍵翻譯' : 'Type message... Supports instant AI translation'}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'zh' ? '發送' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
