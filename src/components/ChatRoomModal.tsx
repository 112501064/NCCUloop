import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { OrderItem, OrderMessage, UserProfile, Language } from '../types';
import { I18N } from '../data/i18n';
import { formatPaymentMethodLabel, formatRemainingMinutes } from '../utils/formatters';
import {
  X,
  Send,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
  Image as ImageIcon,
  MapPin,
  Clock,
  CreditCard,
  Coins,
  Lock,
  UserPlus,
} from 'lucide-react';

interface ChatRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem;
  currentUser: UserProfile;
  useFirestoreRealtime: boolean;
  localMessages?: OrderMessage[];
  onLocalSendMessage?: (orderId: string, text: string) => void;
  onLocalUpdateOrder?: (orderId: string, patch: Partial<OrderItem>) => void;
  onOpenDispute: (order: OrderItem) => void;
  onShowToast: (msg: string) => void;
  lang: Language;
}

export const ChatRoomModal: React.FC<ChatRoomModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUser,
  useFirestoreRealtime,
  localMessages = [],
  onLocalSendMessage,
  onLocalUpdateOrder,
  onOpenDispute,
  onShowToast,
  lang,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [firestoreMessages, setFirestoreMessages] = useState<OrderMessage[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Real-time Firestore listener on orders/{orderId}/messages (ordered by createdAt asc)
  useEffect(() => {
    if (!isOpen || !useFirestoreRealtime || !auth.currentUser) {
      return;
    }

    const messagesPath = `orders/${order.id}/messages`;
    const q = query(collection(db, 'orders', order.id, 'messages'), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: OrderMessage[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const createdTs = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
          return {
            id: docSnap.id,
            text: String(d.text || ''),
            senderUid: String(d.senderUid || ''),
            senderName: String(d.senderName || '政大同學'),
            createdAtMs: createdTs ? createdTs.getTime() : Date.now(),
            timestampText: createdTs
              ? createdTs.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
              : '剛剛',
          };
        });
        setFirestoreMessages(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, messagesPath);
      }
    );

    return () => unsubscribe();
  }, [isOpen, order.id, useFirestoreRealtime]);

  const messages = useFirestoreRealtime ? firestoreMessages : localMessages;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length]);

  if (!isOpen) return null;

  const t = I18N[lang];
  const isCreator = currentUser.id === order.creatorUid;
  const bothRevealed = order.revealCreator && order.revealAccepter;
  const iRevealed = isCreator ? order.revealCreator : order.revealAccepter;

  const otherPartyName = isCreator
    ? bothRevealed || !order.accepterAnonymous
      ? order.accepterName
      : order.accepterAnonAlias || (lang === 'zh' ? '匿名接單同學' : 'Anonymous Peer')
    : bothRevealed || !order.creatorAnonymous
      ? order.creatorName
      : order.creatorAnonAlias || (lang === 'zh' ? '匿名發布者' : 'Anonymous Creator');

  const isPaidTask = order.taskPrice > 0;
  const isPayer =
    (order.payerRole === 'creator' && isCreator) ||
    (order.payerRole !== 'creator' && !isCreator);

  const payerConfirmed =
    order.payerRole === 'creator'
      ? order.creatorPaidConfirmed
      : order.accepterPaidConfirmed;
  const payeeConfirmed =
    order.payerRole === 'creator'
      ? order.accepterPaidConfirmed
      : order.creatorPaidConfirmed;

  const isPaymentSettled = !isPaidTask || (payerConfirmed && payeeConfirmed);
  const myPaidConfirmed = isCreator
    ? order.creatorPaidConfirmed
    : order.accepterPaidConfirmed;
  const myDoneConfirmed = isCreator
    ? order.creatorDoneConfirmed
    : order.accepterDoneConfirmed;

  const minsLeft = order.taskExpireAt
    ? Math.max(0, Math.round((order.taskExpireAt - Date.now()) / 60000))
    : undefined;
  const displayTime =
    minsLeft !== undefined
      ? formatRemainingMinutes(minsLeft, lang)
      : lang === 'zh'
        ? '有效中'
        : 'Active';

  const paymentLabel = formatPaymentMethodLabel(order.paymentMethod, lang);

  const quickPhrases = [
    lang === 'zh' ? '我到宿舍門口了！' : 'I arrived at the dorm entrance!',
    lang === 'zh' ? '已列印完成，正在走過去。' : 'Printed completed, walking over.',
    lang === 'zh' ? '已轉帳給您，請查收！' : 'Transferred! Please check.',
    lang === 'zh' ? '正在路上，約 5 分鐘後抵達。' : 'On my way, arriving in ~5 mins.',
  ];

  // Helper to update order document in Firestore (or local fallback)
  const updateOrderFields = async (
    patch: Partial<OrderItem>,
    alsoUpdateTaskStatus?: 'in_progress' | 'completed'
  ) => {
    if (!useFirestoreRealtime || !auth.currentUser) {
      onLocalUpdateOrder?.(order.id, patch);
      return;
    }

    const orderPath = `orders/${order.id}`;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      if (alsoUpdateTaskStatus && order.taskId) {
        try {
          await updateDoc(doc(db, 'tasks', order.taskId), {
            status: alsoUpdateTaskStatus,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // multi-quota or creator-only guard: ignore if task is already closed/shared
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, orderPath);
    }
  };

  const sendTextMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    if (!useFirestoreRealtime || !auth.currentUser) {
      onLocalSendMessage?.(order.id, trimmed);
      return;
    }

    const messagesPath = `orders/${order.id}/messages`;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'orders', order.id, 'messages'), {
        text: trimmed,
        senderUid: currentUser.id,
        senderName: currentUser.nickname || currentUser.name,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, messagesPath);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const msg = inputText.trim();
    setInputText('');
    await sendTextMessage(msg);
  };

  const handleConfirmAcceptOrder = async () => {
    await updateOrderFields({ status: 'in_progress' }, 'in_progress');
    await sendTextMessage(
      lang === 'zh'
        ? '［系統狀態］發布者已點擊「確認接受訂單」，任務正式進入進行中！'
        : '[Status] Creator confirmed the order. Task is now In Progress!'
    );
    onShowToast(lang === 'zh' ? '✅ 已確認接受訂單！' : '✅ Order accepted!');
  };

  const handleTogglePaymentConfirm = async () => {
    const patch: Partial<OrderItem> = isCreator
      ? { creatorPaidConfirmed: true }
      : { accepterPaidConfirmed: true };
    await updateOrderFields(patch);
    await sendTextMessage(
      isPayer
        ? lang === 'zh'
          ? '［金流確認］我已付款完成，請對方查收。'
          : '[Payment] Marked as paid.'
        : lang === 'zh'
          ? '［金流確認］確認已收到款項！'
          : '[Payment] Confirmed payment received!'
    );
    onShowToast(
      isPayer
        ? lang === 'zh'
          ? '已標記「我已付款」'
          : 'Marked as paid'
        : lang === 'zh'
          ? '已標記「確認已收到款項」'
          : 'Confirmed receipt'
    );
  };

  const handleConsentReveal = async () => {
    const patch: Partial<OrderItem> = isCreator
      ? { revealCreator: true }
      : { revealAccepter: true };
    await updateOrderFields(patch);
    await sendTextMessage(
      lang === 'zh'
        ? `［身分揭曉］${currentUser.nickname || currentUser.name} 已同意解除匿名（雙方皆同意即公開真實姓名）。`
        : '[Identity] Agreed to reveal identity.'
    );
    onShowToast(
      lang === 'zh'
        ? '已同意解除匿名！雙方皆同意後將立即顯示真實名稱。'
        : 'Agreed to reveal identity!'
    );
  };

  const handleConfirmCompletion = async () => {
    if (!isPaymentSettled) return;
    const peerDone = isCreator ? order.accepterDoneConfirmed : order.creatorDoneConfirmed;
    const nextStatus = peerDone ? 'completed' : order.status;
    const patch: Partial<OrderItem> = isCreator
      ? { creatorDoneConfirmed: true, status: nextStatus }
      : { accepterDoneConfirmed: true, status: nextStatus };

    await updateOrderFields(patch, peerDone ? 'completed' : undefined);
    await sendTextMessage(
      peerDone
        ? lang === 'zh'
          ? '🎉 雙方皆已確認任務完成並結案！'
          : '🎉 Both parties confirmed completion!'
        : lang === 'zh'
          ? '［結案確認］我已確認任務完成，等待對方點擊結案。'
          : '[Completion] Marked task done, awaiting peer confirmation.'
    );
    onShowToast(
      peerDone
        ? lang === 'zh'
          ? '🎉 雙方已確認完成並結案！'
          : '🎉 Order completed!'
        : lang === 'zh'
          ? '已送出完成確認，等待對方確認後結案。'
          : 'Marked done, waiting for peer.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Chat Header */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-400/50 flex items-center justify-center text-sm font-bold text-white">
                {otherPartyName.slice(0, 1)}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-slate-900"></span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white truncate">{otherPartyName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                    bothRevealed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {bothRevealed
                    ? lang === 'zh'
                      ? '已公開身分'
                      : 'ID Revealed'
                    : lang === 'zh'
                      ? '匿名防護中'
                      : 'Anonymous'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                {lang === 'zh' ? order.taskTitle : order.taskTitleEn || order.taskTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onOpenDispute(order)}
              disabled={order.status === 'disputed' || order.status === 'completed'}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 disabled:opacity-40 text-rose-200 border border-rose-500/40 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title={lang === 'zh' ? '舉報申訴' : 'Report / Dispute'}
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

        {/* PINNED DEAL SUMMARY CARD (Fixed at top, never scrolls away) */}
        <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 shrink-0">
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-slate-400 shrink-0">{lang === 'zh' ? '地點' : 'Loc'}:</span>
              <span className="font-bold text-slate-800 truncate">
                {lang === 'zh' ? order.taskLocation : order.taskLocationEn || order.taskLocation}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <Coins className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-slate-400 shrink-0">{lang === 'zh' ? '金額' : 'Amt'}:</span>
              <span className="font-mono font-bold text-emerald-800 tabular-nums truncate">
                {order.taskPrice === 0 ? t.free : `NT$ ${order.taskPrice}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <CreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-400 shrink-0">{lang === 'zh' ? '付款' : 'Pay'}:</span>
              <span className="font-semibold text-slate-700 truncate">{paymentLabel}</span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-400 shrink-0">{lang === 'zh' ? '剩餘' : 'Time'}:</span>
              <span className="font-mono font-semibold text-slate-700 tabular-nums truncate">
                {displayTime}
              </span>
            </div>

            {order.paymentNote && (
              <div className="col-span-2 pt-1 border-t border-slate-200/70 text-[10px] text-slate-600 truncate">
                <span className="font-semibold text-slate-500">
                  {lang === 'zh' ? '收款備註：' : 'Account Note: '}
                </span>
                <span className="font-mono">{order.paymentNote}</span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Firestore State Controls (Accept Order, Payment Confirm, Anonymity Reveal, Completion) */}
        <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2.5 shrink-0 space-y-2">
          {/* Pending Creator Confirmation Banner */}
          {order.status === 'pending_confirm' && (
            <div className="flex items-center justify-between gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-[11px]">
              <span className="font-semibold text-sky-900">
                {isCreator
                  ? lang === 'zh'
                    ? '對方申請接單，請確認是否接受：'
                    : 'Peer requested this task:'
                  : lang === 'zh'
                    ? '⏳ 已送出接單申請，等待發布者點擊確認接受...'
                    : '⏳ Waiting for creator to confirm order...'}
              </span>
              {isCreator && (
                <button
                  type="button"
                  onClick={handleConfirmAcceptOrder}
                  className="px-3 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{lang === 'zh' ? '確認接受訂單' : 'Accept Order'}</span>
                </button>
              )}
            </div>
          )}

          {/* Disputed Notice */}
          {order.status === 'disputed' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] text-rose-800 font-semibold">
              ⚠️ {lang === 'zh' ? '此訂單已被標記為爭議申訴凍結中' : 'Order flagged for dispute'}
              {order.disputeReason ? `：${order.disputeReason}` : ''}
            </div>
          )}

          {/* Manual P2P Payment Confirmation Bar (Paid Tasks) */}
          {isPaidTask && order.status !== 'disputed' && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-2">
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold ${
                    payerConfirmed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {payerConfirmed
                    ? lang === 'zh'
                      ? '✓ 付款方已付款'
                      : '✓ Payer Paid'
                    : lang === 'zh'
                      ? '待付款方確認'
                      : 'Awaiting Payment'}
                </span>
                <span className="text-slate-300">→</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold ${
                    payeeConfirmed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {payeeConfirmed
                    ? lang === 'zh'
                      ? '✓ 收款方已收款'
                      : '✓ Payee Received'
                    : lang === 'zh'
                      ? '待收款方確認'
                      : 'Awaiting Receipt'}
                </span>
              </div>

              <button
                type="button"
                disabled={myPaidConfirmed || order.status === 'completed'}
                onClick={handleTogglePaymentConfirm}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                  myPaidConfirmed
                    ? 'bg-emerald-100 text-emerald-800 cursor-default'
                    : isPayer
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs'
                }`}
              >
                {myPaidConfirmed
                  ? isPayer
                    ? lang === 'zh'
                      ? '已標記付款 ✓'
                      : 'Marked Paid ✓'
                    : lang === 'zh'
                      ? '已確認收款 ✓'
                      : 'Confirmed Receipt ✓'
                  : isPayer
                    ? lang === 'zh'
                      ? '我已付款'
                      : 'I Have Paid'
                    : lang === 'zh'
                      ? '確認已收到款項'
                      : 'Confirm Received'}
              </button>
            </div>
          )}

          {/* Identity Reveal & Final Completion Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              {bothRevealed ? (
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{t.revealedStatus}</span>
                </span>
              ) : iRevealed ? (
                <span className="text-amber-700 font-medium">
                  {lang === 'zh' ? '已同意解除匿名，等待對方同意' : 'Agreed to reveal, awaiting peer'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleConsentReveal}
                  className="text-slate-700 hover:text-slate-900 underline decoration-slate-300 cursor-pointer font-semibold"
                >
                  + {lang === 'zh' ? '同意解除匿名' : 'Consent to Reveal ID'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmCompletion}
              disabled={
                !isPaymentSettled ||
                myDoneConfirmed ||
                order.status === 'completed' ||
                order.status === 'disputed'
              }
              title={
                !isPaymentSettled
                  ? lang === 'zh'
                    ? '須雙方完成「我已付款」與「確認已收到款項」後方可結案'
                    : 'Both payment confirmations required'
                  : undefined
              }
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                order.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800 cursor-default'
                  : !isPaymentSettled
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : myDoneConfirmed
                      ? 'bg-amber-100 text-amber-800 cursor-default'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs cursor-pointer'
              }`}
            >
              {!isPaymentSettled && order.status !== 'completed' ? (
                <Lock className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>
                {order.status === 'completed'
                  ? lang === 'zh'
                    ? '已完成並結案'
                    : 'Completed'
                  : !isPaymentSettled
                    ? lang === 'zh'
                      ? '雙向確認金流後解鎖結案'
                      : 'Confirm Payment First'
                    : myDoneConfirmed
                      ? lang === 'zh'
                        ? '已確認，等待對方'
                        : 'Awaiting Peer'
                      : lang === 'zh'
                        ? '確認完成並結案'
                        : 'Confirm & Complete'}
              </span>
            </button>
          </div>
        </div>

        {/* Message Thread Body (Real-time Firestore Subcollection) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          <div className="text-center my-1">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-mono">
              {lang === 'zh'
                ? '即時 1-on-1 對話已連線 · 雙方狀態按鈕將同步更新'
                : 'Live 1-on-1 Chat Connected · Real-time Sync Active'}
            </span>
          </div>

          {messages.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-[11px]">
              {lang === 'zh'
                ? '尚未有訊息，點擊下方快捷回覆或輸入訊息開始聯絡！'
                : 'No messages yet. Say hello or tap a quick phrase below!'}
            </div>
          )}

          {messages.map((msg) => {
            const isSystem = msg.senderUid === 'system' || msg.text.startsWith('［') || msg.text.startsWith('[');
            if (isSystem && msg.senderUid === 'system') {
              return (
                <div key={msg.id} className="text-center my-1.5">
                  <span className="inline-block text-[10px] text-slate-500 bg-slate-200/70 px-3 py-1 rounded-xl max-w-[90%]">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.senderUid === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                  <span>{isMe ? (lang === 'zh' ? '我' : 'Me') : msg.senderName}</span>
                  <span>·</span>
                  <span className="font-mono">{msg.timestampText || '剛剛'}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                    isMe
                      ? 'bg-emerald-700 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Phrases Strip */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] text-slate-400 shrink-0 font-medium">{t.quickPhrases}:</span>
          {quickPhrases.map((phrase, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void sendTextMessage(phrase)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Message Input Bar */}
        <form onSubmit={handleSendForm} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              void sendTextMessage(
                lang === 'zh' ? '［已傳送物資 / 轉帳截圖通知］' : '[Photo / transfer receipt sent]'
              )
            }
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title={lang === 'zh' ? '發送照片通知' : 'Send photo notice'}
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              lang === 'zh'
                ? '輸入訊息... 即時寫入 Firestore 聊天室'
                : 'Type message... Real-time sync'
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
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
