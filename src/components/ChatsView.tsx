import React from 'react';
import { OrderItem, UserProfile, Language } from '../types';
import { I18N } from '../data/i18n';
import { formatPaymentMethodLabel, formatRemainingMinutes } from '../utils/formatters';
import { isFemaleDormLocationName } from '../utils/lbs';
import {
  useAutoTranslateText,
  useAutoTranslateLocation,
} from '../hooks/useAutoTranslate';
import { MessageSquare, Clock, ArrowRight, UserCheck } from 'lucide-react';

interface ChatsViewProps {
  orders: OrderItem[];
  currentUser: UserProfile;
  onOpenOrderChat: (order: OrderItem) => void;
  lang: Language;
}

const OrderListCard: React.FC<{
  order: OrderItem;
  currentUser: UserProfile;
  onSelect: (order: OrderItem) => void;
  lang: Language;
}> = ({ order, currentUser, onSelect, lang }) => {
  const t = I18N[lang];
  const isCreator = order.creatorUid === currentUser.id;
  const isFemaleDormOrder = Boolean(
    order.isFemaleDormOnly || isFemaleDormLocationName(order.taskLocation)
  );
  const isNonAnonymousTask = !order.creatorAnonymous;
  const bothRevealed = Boolean(
    isFemaleDormOrder ||
      isNonAnonymousTask ||
      (order.revealCreator === true && order.revealAccepter === true)
  );
  const peerNick = isCreator ? order.accepterName : order.creatorName;
  const peerReal = isCreator ? order.accepterRealName : order.creatorRealName;

  const otherPartyName = bothRevealed
    ? peerReal
      ? `${peerNick}（${peerReal}）`
      : peerNick
    : lang === 'zh'
      ? '匿名同學'
      : 'Anonymous Peer';

  const avatarInitial = bothRevealed ? peerNick.slice(0, 1) : lang === 'zh' ? '匿' : '?';

  const minsLeft = order.taskExpireAt
    ? Math.max(0, Math.round((order.taskExpireAt - Date.now()) / 60000))
    : undefined;
  const displayTime =
    minsLeft !== undefined
      ? formatRemainingMinutes(minsLeft, lang)
      : lang === 'zh'
        ? '進行中'
        : 'Active';

  const displayTitle = useAutoTranslateText(order.taskTitle, lang, order.taskTitleEn);
  const localizedLocation = useAutoTranslateLocation(
    order.taskLocation,
    lang,
    order.taskLocationEn
  );

  const isPendingApproval =
    order.status === 'pending_approval' || order.status === 'pending_confirm';

  const statusBadgeClass =
    order.status === 'in_progress'
      ? 'bg-emerald-100 text-emerald-800'
      : isPendingApproval
        ? 'bg-sky-100 text-sky-800'
        : order.status === 'completed'
          ? 'bg-slate-100 text-slate-700'
          : order.status === 'cancelled'
            ? 'bg-slate-200 text-slate-600'
            : 'bg-rose-100 text-rose-800';

  const statusLabel =
    order.status === 'in_progress'
      ? lang === 'zh'
        ? '進行中'
        : 'In Progress'
      : order.status === 'pending_approval'
        ? isCreator
          ? lang === 'zh'
            ? '待您審核接單申請'
            : 'Review Applicant'
          : lang === 'zh'
            ? '待發布者審核'
            : 'Pending Approval'
        : order.status === 'pending_confirm'
          ? lang === 'zh'
            ? '待發布者確認接單'
            : 'Pending Confirm'
          : order.status === 'completed'
            ? lang === 'zh'
              ? '已結案'
              : 'Completed'
            : order.status === 'cancelled'
              ? lang === 'zh'
                ? '已取消 / 婉拒'
                : 'Declined / Cancelled'
              : lang === 'zh'
                ? '爭議凍結'
                : 'Disputed';

  return (
    <div
      onClick={() => onSelect(order)}
      className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
        isPendingApproval && isCreator
          ? 'border-sky-300 hover:border-sky-400 ring-1 ring-sky-100'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-sm ${
              order.taskCategory === 'emergency'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : isPendingApproval && isCreator
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : 'bg-emerald-700/10 border-emerald-600/30 text-emerald-800'
            }`}
          >
            {avatarInitial}
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${
              order.status === 'completed' || order.status === 'cancelled'
                ? 'bg-slate-400'
                : order.status === 'disputed'
                  ? 'bg-rose-500'
                  : isPendingApproval
                    ? 'bg-sky-500'
                    : 'bg-emerald-500'
            }`}
          ></span>
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-sm truncate">{otherPartyName}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusBadgeClass}`}>
              {statusLabel}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {isCreator ? (lang === 'zh' ? '我發布' : 'Creator') : lang === 'zh' ? '我接單' : 'Accepter'}
            </span>
          </div>

          <p className="text-slate-600 truncate font-medium">{displayTitle}</p>

          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
            <span>
              {lang === 'zh'
                ? `地點：${localizedLocation} · ${formatPaymentMethodLabel(order.paymentMethod, lang)}`
                : `${localizedLocation} · ${formatPaymentMethodLabel(order.paymentMethod, lang)}`}
            </span>
            {isPendingApproval && isCreator && (
              <span className="text-sky-700 font-bold inline-flex items-center gap-0.5 shrink-0">
                · <UserCheck className="w-3 h-3" />
                {lang === 'zh' ? '點擊先看檔案審核' : 'Tap to review profile'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <span className="font-mono font-bold text-emerald-800 text-xs tabular-nums">
          {order.taskPrice === 0 ? t.free : `NT$ ${order.taskPrice}`}
        </span>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 tabular-nums">
          <Clock className="w-3 h-3" />
          <span>{displayTime}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 mt-1" />
      </div>
    </div>
  );
};

export const ChatsView: React.FC<ChatsViewProps> = ({
  orders,
  currentUser,
  onOpenOrderChat,
  lang,
}) => {
  const t = I18N[lang];

  const userOrders = orders.filter(
    (o) => o.creatorUid === currentUser.id || o.accepterUid === currentUser.id
  );

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-700" />
          <span>{t.activeChatsTitle}</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full font-bold tabular-nums">
            {userOrders.length}
          </span>
        </h2>
        <span className="text-xs text-slate-500">
          {lang === 'zh' ? '即時私訊對話' : 'Real-time 1-on-1 Chat'}
        </span>
      </div>

      {userOrders.length === 0 ? (
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
          {userOrders.map((order) => (
            <OrderListCard
              key={order.id}
              order={order}
              currentUser={currentUser}
              onSelect={onOpenOrderChat}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
};
