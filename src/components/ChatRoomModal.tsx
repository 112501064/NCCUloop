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
import {
  OrderItem,
  OrderMessage,
  UserProfile,
  ReviewItem,
  PaymentDirection,
  Language,
} from '../types';
import { I18N } from '../data/i18n';
import {
  formatPaymentMethodLabel,
  formatRemainingMinutes,
  localizeChatMessageText,
  localizeTimeString,
} from '../utils/formatters';
import { isFemaleDormLocationName } from '../utils/lbs';
import { useAutoTranslateText, useAutoTranslateLocation } from '../hooks/useAutoTranslate';
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
  Star,
  Siren,
  XCircle,
  IdCard,
} from 'lucide-react';

interface ChatRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem;
  currentUser: UserProfile;
  useFirestoreRealtime: boolean;
  existingReview?: ReviewItem | null;
  localMessages?: OrderMessage[];
  onLocalSendMessage?: (orderId: string, text: string) => void;
  onLocalUpdateOrder?: (orderId: string, patch: Partial<OrderItem>) => void;
  onDeclineOrder?: (order: OrderItem) => Promise<void> | void;
  onOpenPeerProfile?: (order: OrderItem) => void;
  onSubmitReview: (params: {
    order: OrderItem;
    rating: number;
    tags: string[];
    comment: string;
  }) => Promise<void> | void;
  onOpenDispute: (order: OrderItem) => void;
  onShowToast: (msg: string) => void;
  lang: Language;
}

const REVIEW_QUICK_TAGS_ZH = ['準時面交', '回覆迅速', '親切友善', '守信用', '說明清楚'];
const REVIEW_QUICK_TAGS_EN = ['Punctual', 'Fast Reply', 'Friendly', 'Reliable', 'Clear Info'];

const ChatMessageBubble: React.FC<{
  msg: OrderMessage;
  isMe: boolean;
  otherPartyDisplayName: string;
  lang: Language;
}> = ({ msg, isMe, otherPartyDisplayName, lang }) => {
  const baseText = localizeChatMessageText(msg.text, lang);
  const translatedText = useAutoTranslateText(baseText, lang);
  const isSystem = msg.senderUid === 'system';

  if (isSystem) {
    return (
      <div className="text-center my-1.5">
        <span className="inline-block text-[10px] text-slate-500 bg-slate-200/70 px-3 py-1 rounded-xl max-w-[90%]">
          {translatedText}
        </span>
      </div>
    );
  }

  const senderDisplayName = isMe
    ? lang === 'zh'
      ? '我'
      : 'Me'
    : otherPartyDisplayName;

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
        <span>{senderDisplayName}</span>
        <span>·</span>
        <span className="font-mono">
          {localizeTimeString(msg.timestampText || '剛剛', lang)}
        </span>
      </div>

      <div
        className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
          isMe
            ? 'bg-emerald-700 text-white rounded-br-xs'
            : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs'
        }`}
      >
        {translatedText}
      </div>
    </div>
  );
};

export const ChatRoomModal: React.FC<ChatRoomModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUser,
  useFirestoreRealtime,
  existingReview,
  localMessages = [],
  onLocalSendMessage,
  onLocalUpdateOrder,
  onDeclineOrder,
  onOpenPeerProfile,
  onSubmitReview,
  onOpenDispute,
  onShowToast,
  lang,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [firestoreMessages, setFirestoreMessages] = useState<OrderMessage[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isDeclining, setIsDeclining] = useState<boolean>(false);

  // Post-completion review form state
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['準時面交', '親切友善']);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isCreator = currentUser.id === order.creatorUid;
  const isFemaleDormOrder = Boolean(
    order.isFemaleDormOnly || isFemaleDormLocationName(order.taskLocation)
  );
  const isNonAnonymousTask = !order.creatorAnonymous;
  // Revealed when non-anonymous task, female-dorm real-ID task, or mutual consent completed
  const bothRevealed = Boolean(
    isFemaleDormOrder ||
      isNonAnonymousTask ||
      (order.revealCreator === true && order.revealAccepter === true)
  );
  const iRevealed = bothRevealed
    ? true
    : isCreator
      ? order.revealCreator === true
      : order.revealAccepter === true;

  // Real-time messages listener
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
            senderName: String(d.senderName || '匿名同學'),
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

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length]);

  // Automatic English translation hooks (called unconditionally before early return)
  const displayedTaskTitle = useAutoTranslateText(order.taskTitle, lang, order.taskTitleEn);
  const localizedLocation = useAutoTranslateLocation(
    order.taskLocation,
    lang,
    order.taskLocationEn
  );
  const displayedPaymentNote = useAutoTranslateText(order.paymentNote, lang);
  const displayedDisputeReason = useAutoTranslateText(order.disputeReason, lang);

  if (!isOpen) return null;

  const t = I18N[lang];
  const isEmergency = order.taskCategory === 'emergency';
  const isPendingApproval =
    order.status === 'pending_approval' || order.status === 'pending_confirm';
  const isCancelled = order.status === 'cancelled';

  const peerNickname = isCreator ? order.accepterName : order.creatorName;
  const peerRealName = isCreator ? order.accepterRealName : order.creatorRealName;

  const otherPartyDisplayName = bothRevealed
    ? peerRealName
      ? `${peerNickname}（${peerRealName}）`
      : peerNickname
    : lang === 'zh'
      ? '匿名同學'
      : 'Anonymous Peer';

  const otherPartyAvatarChar = bothRevealed
    ? peerNickname.slice(0, 1)
    : lang === 'zh'
      ? '匿'
      : '?';

  // CLEAR PAYMENT DIRECTION: creator_pays | accepter_pays | free
  const effectiveDirection: PaymentDirection =
    order.taskPrice === 0 || order.paymentDirection === 'free'
      ? 'free'
      : order.paymentDirection === 'creator_pays' || order.payerRole === 'creator'
        ? 'creator_pays'
        : 'accepter_pays';

  const isFreeOrder = effectiveDirection === 'free';
  const isPayer =
    (effectiveDirection === 'creator_pays' && isCreator) ||
    (effectiveDirection === 'accepter_pays' && !isCreator);

  const payerConfirmed =
    effectiveDirection === 'creator_pays'
      ? order.creatorPaidConfirmed
      : order.accepterPaidConfirmed;
  const payeeConfirmed =
    effectiveDirection === 'creator_pays'
      ? order.accepterPaidConfirmed
      : order.creatorPaidConfirmed;

  const isPaymentSettled = isFreeOrder || (payerConfirmed && payeeConfirmed);
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
  const directionBadgeText =
    effectiveDirection === 'free'
      ? lang === 'zh'
        ? '0 元免費互助'
        : 'Free Mutual Aid'
      : effectiveDirection === 'creator_pays'
        ? lang === 'zh'
          ? '應付款方：發布者'
          : 'Payer: Creator'
        : lang === 'zh'
          ? '應付款方：接單者'
          : 'Payer: Accepter';

  const quickPhrases = [
    lang === 'zh' ? '我到宿舍門口了！' : 'I arrived at the dorm entrance!',
    lang === 'zh' ? '已抵達約定地點。' : 'Arrived at the meeting spot.',
    lang === 'zh' ? '已轉帳給您，請查收！' : 'Transferred! Please check.',
    lang === 'zh' ? '正在路上，約 5 分鐘後抵達。' : 'On my way, arriving in ~5 mins.',
  ];

  // Helper to update ONLY this Order document
  const updateOrderFields = async (patch: Partial<OrderItem>) => {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, orderPath);
    }
  };

  const sendTextMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isCancelled) return;

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
    if (!inputText.trim() || isSending || isCancelled) return;
    const msg = inputText.trim();
    setInputText('');
    await sendTextMessage(msg);
  };

  const handleConfirmAcceptOrder = async () => {
    await updateOrderFields({ status: 'in_progress' });
    await sendTextMessage(
      lang === 'zh'
        ? '［系統通知］發布者已正式確認由您接單，訂單成立進行中！'
        : '[System] Creator officially approved your application. Order is now in progress!'
    );
    onShowToast(
      lang === 'zh' ? '✅ 已正式確認接單，任務進入進行中！' : '✅ Order officially approved!'
    );
  };

  const handleDeclineClick = async () => {
    if (!onDeclineOrder || isDeclining) return;
    setIsDeclining(true);
    try {
      await onDeclineOrder(order);
    } finally {
      setIsDeclining(false);
    }
  };

  const handleTogglePaymentConfirm = async () => {
    const patch: Partial<OrderItem> = isCreator
      ? { creatorPaidConfirmed: true }
      : { accepterPaidConfirmed: true };
    await updateOrderFields(patch);
    await sendTextMessage(
      isPayer
        ? lang === 'zh'
          ? '［付款通知］我已付款完成，請對方確認收款。'
          : '[Payment] I have completed the payment. Please confirm receipt.'
        : lang === 'zh'
          ? '［收款確認］確認已收到款項！'
          : '[Payment] Confirmed payment received!'
    );
    onShowToast(
      isPayer
        ? lang === 'zh'
          ? '已標記「我已付款」'
          : 'Marked as paid'
        : lang === 'zh'
          ? '已標記「確認已收款」'
          : 'Confirmed receipt'
    );
  };

  const handleConsentReveal = async () => {
    if (isFemaleDormOrder || bothRevealed) return;
    const myNick = currentUser.nickname || currentUser.name;
    const myReal = currentUser.realName || myNick;
    const patch: Partial<OrderItem> = isCreator
      ? {
          revealCreator: true,
          creatorName: myNick,
          creatorRealName: myReal,
        }
      : {
          revealAccepter: true,
          accepterName: myNick,
          accepterRealName: myReal,
        };
    await updateOrderFields(patch);
    await sendTextMessage(
      lang === 'zh'
        ? '［身分揭曉］我已同意解除匿名（雙方皆同意後將顯示暱稱與本名）。'
        : '[Identity] I agreed to reveal my profile & real name (shown once both agree).'
    );
    onShowToast(
      lang === 'zh'
        ? '已同意解除匿名！雙方皆同意後將解鎖對方資料與歷史評價。'
        : 'Agreed to reveal identity!'
    );
  };

  const handleConfirmCompletion = async () => {
    if (!isPaymentSettled || isPendingApproval || isCancelled) return;
    const peerDone = isCreator ? order.accepterDoneConfirmed : order.creatorDoneConfirmed;
    const nextStatus = peerDone ? 'completed' : order.status;
    const patch: Partial<OrderItem> = isCreator
      ? {
          creatorDoneConfirmed: true,
          status: nextStatus,
          ...(peerDone ? { completedAtMs: Date.now() } : {}),
        }
      : {
          accepterDoneConfirmed: true,
          status: nextStatus,
          ...(peerDone ? { completedAtMs: Date.now() } : {}),
        };

    await updateOrderFields(patch);
    await sendTextMessage(
      peerDone
        ? lang === 'zh'
          ? '🎉 雙方皆已確認完成並結案！現在可於下方為對方留下星等評價。'
          : '🎉 Both parties confirmed completion! You can now leave a star review below.'
        : lang === 'zh'
          ? '［結案確認］我已確認任務完成，等待對方點擊確認完成。'
          : '[Completion] I marked this order completed, awaiting peer confirmation.'
    );
    onShowToast(
      peerDone
        ? lang === 'zh'
          ? '🎉 雙方已確認完成並結案！請為本次互助留下評價。'
          : '🎉 Order completed! Please leave a review.'
        : lang === 'zh'
          ? '已送出完成確認，等待對方確認後結案。'
          : 'Marked done, waiting for peer.'
    );
  };

  const toggleReviewTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((tg) => tg !== tag));
    } else if (selectedTags.length < 6) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmitReviewForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      await onSubmitReview({
        order,
        rating,
        tags: selectedTags,
        comment: reviewComment.trim(),
      });
      setReviewComment('');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const tagOptions = lang === 'zh' ? REVIEW_QUICK_TAGS_ZH : REVIEW_QUICK_TAGS_EN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Clean Chat Top Header */}
        <div
          className={`text-white p-3.5 sm:p-4 flex items-center justify-between gap-2 shrink-0 ${
            isEmergency ? 'bg-rose-950' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onOpenPeerProfile?.(order)}
              className="relative shrink-0 cursor-pointer group"
              title={lang === 'zh' ? '查看對方個人檔案與評價' : 'View Peer Profile & Reviews'}
            >
              <div
                className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold text-white transition-transform group-hover:scale-105 ${
                  isEmergency
                    ? 'bg-rose-600/40 border-rose-400/60'
                    : 'bg-emerald-600/30 border-emerald-400/50'
                }`}
              >
                {otherPartyAvatarChar}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-slate-900"></span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isEmergency && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/30 text-rose-100 border border-rose-400/40 flex items-center gap-1 shrink-0">
                    <Siren className="w-2.5 h-2.5" />
                    <span>{lang === 'zh' ? '緊急救援' : 'SOS'}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenPeerProfile?.(order)}
                  className="font-bold text-sm text-white truncate hover:underline cursor-pointer text-left"
                >
                  {otherPartyDisplayName}
                </button>
                {onOpenPeerProfile && (
                  <button
                    type="button"
                    onClick={() => onOpenPeerProfile(order)}
                    className="px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/20 text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                  >
                    <IdCard className="w-3 h-3 text-emerald-300" />
                    <span>{lang === 'zh' ? '查看檔案' : 'Profile'}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 max-w-xs mt-0.5">
                <p className="text-[11px] text-slate-300 truncate">{displayedTaskTitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onOpenDispute(order)}
              disabled={order.status === 'disputed' || order.status === 'completed' || isCancelled}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 disabled:opacity-40 text-rose-200 border border-rose-500/40 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title={lang === 'zh' ? '舉報' : 'Report'}
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{t.reportDispute}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PINNED DEAL SUMMARY CARD */}
        <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 shrink-0">
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-slate-400 shrink-0">{lang === 'zh' ? '地點' : 'Loc'}:</span>
              <span className="font-bold text-slate-800 truncate">{localizedLocation}</span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <Coins className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-slate-400 shrink-0">{lang === 'zh' ? '金額' : 'Amt'}:</span>
              <span className="font-mono font-bold text-emerald-800 tabular-nums truncate">
                {isFreeOrder ? t.free : `NT$ ${order.taskPrice}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <CreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-semibold text-slate-700 truncate">
                {isFreeOrder ? directionBadgeText : `${paymentLabel} · ${directionBadgeText}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-400 shrink-0">{lang === 'zh' ? '剩餘' : 'Time'}:</span>
              <span className="font-mono font-semibold text-slate-700 tabular-nums truncate">
                {displayTime}
              </span>
            </div>

            {displayedPaymentNote && !isFreeOrder && (
              <div className="col-span-2 pt-1 border-t border-slate-200/70 text-[10px] text-slate-600 truncate">
                <span className="font-semibold text-slate-500">
                  {lang === 'zh' ? '收款備註：' : 'Account Note: '}
                </span>
                <span className="font-mono">{displayedPaymentNote}</span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Order State Controls */}
        <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2.5 shrink-0 space-y-2">
          {/* Stage 1: Pending Approval Compact Bar */}
          {isPendingApproval && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-sky-950">
                {isCreator
                  ? lang === 'zh'
                    ? '⏳ 待審核接單申請'
                    : '⏳ Pending applicant approval'
                  : lang === 'zh'
                    ? '⏳ 已送出接單申請，等待發布者審核確認'
                    : '⏳ Application sent, waiting for creator approval'}
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                {!bothRevealed && !iRevealed && (
                  <button
                    type="button"
                    onClick={handleConsentReveal}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer flex items-center gap-1"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>{t.requestReveal}</span>
                  </button>
                )}

                {onOpenPeerProfile && (
                  <button
                    type="button"
                    onClick={() => onOpenPeerProfile(order)}
                    className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-lg font-bold cursor-pointer flex items-center gap-1"
                  >
                    <IdCard className="w-3 h-3" />
                    <span>{lang === 'zh' ? '查看檔案審核' : 'Review Profile'}</span>
                  </button>
                )}

                {isCreator && (
                  <>
                    {onDeclineOrder && (
                      <button
                        type="button"
                        disabled={isDeclining}
                        onClick={() => void handleDeclineClick()}
                        className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>{lang === 'zh' ? '婉拒' : 'Decline'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleConfirmAcceptOrder()}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>{lang === 'zh' ? '確認接單' : 'Confirm'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cancelled Notice */}
          {isCancelled && (
            <div className="bg-slate-200/80 border border-slate-300 rounded-xl px-3 py-2 text-[11px] text-slate-700 font-semibold">
              {lang === 'zh'
                ? '此申請已被發布者婉拒或取消，原任務名額已自動釋出。'
                : 'This application was declined or cancelled; the task spot has been released.'}
            </div>
          )}

          {/* Disputed Notice */}
          {order.status === 'disputed' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] text-rose-800 font-semibold">
              ⚠️ {lang === 'zh' ? '此訂單已送出舉報並暫停進行（待管理員審核）' : 'Order flagged for admin review'}
              {displayedDisputeReason ? `：${displayedDisputeReason}` : ''}
            </div>
          )}

          {/* Stage 2: Role-Specific Payment Confirmation Bar */}
          {!isFreeOrder && !isPendingApproval && !isCancelled && order.status !== 'disputed' && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-2">
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                  {directionBadgeText}
                </span>
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
                      ? '待付款方付款'
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

              {isPayer ? (
                <button
                  type="button"
                  disabled={myPaidConfirmed || order.status === 'completed'}
                  onClick={handleTogglePaymentConfirm}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                    myPaidConfirmed
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                  }`}
                >
                  {myPaidConfirmed
                    ? lang === 'zh'
                      ? '已標記付款 ✓'
                      : 'Marked Paid ✓'
                    : lang === 'zh'
                      ? '我已付款'
                      : 'I Have Paid'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={myPaidConfirmed || order.status === 'completed'}
                  onClick={handleTogglePaymentConfirm}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                    myPaidConfirmed
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs'
                  }`}
                >
                  {myPaidConfirmed
                    ? lang === 'zh'
                      ? '已確認收款 ✓'
                      : 'Confirmed Receipt ✓'
                    : lang === 'zh'
                      ? '確認已收款'
                      : 'Confirm Received'}
                </button>
              )}
            </div>
          )}

          {/* Identity Reveal & Final Completion Row */}
          {!isCancelled && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600">
                {bothRevealed ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>
                      {isFemaleDormOrder
                        ? lang === 'zh'
                          ? '女宿實名保護'
                          : 'Female Dorm Real-ID'
                        : t.revealedStatus}
                    </span>
                  </span>
                ) : iRevealed ? (
                  <span className="text-amber-700 font-medium">{t.revealRequested}</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleConsentReveal}
                    className="text-slate-700 hover:text-slate-900 underline decoration-slate-300 cursor-pointer font-semibold"
                  >
                    + {t.requestReveal}
                  </button>
                )}
              </div>

              {!isPendingApproval && (
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
                        ? '須付款方與收款方完成確認後方可結案'
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
                          ? '完成收付款確認後可結案'
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
              )}
            </div>
          )}
        </div>

        {/* Clean Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          <div className="text-center my-1">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-mono">
              {isFemaleDormOrder
                ? lang === 'zh'
                  ? '女宿實名專屬聊天室 · 保障住宿安全'
                  : 'Female Dorm Real-ID Protected Chat'
                : bothRevealed
                  ? lang === 'zh'
                    ? '1-on-1 即時聊天室 · 點擊上方「查看檔案」可查閱對方評價'
                    : 'Private 1-on-1 Chat · Tap Profile above to view reviews'
                  : lang === 'zh'
                    ? '1-on-1 私密聊天室 · 雙方皆同意解除匿名才顯示真實姓名'
                    : 'Private 1-on-1 Chat · Real names hidden until mutual consent'}
            </span>
          </div>

          {messages.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-[11px]">
              {lang === 'zh'
                ? '尚未有訊息，點擊下方快捷回覆或輸入訊息開始聯絡！'
                : 'No messages yet. Say hello or tap a quick phrase below!'}
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.senderUid === currentUser.id}
              otherPartyDisplayName={otherPartyDisplayName}
              lang={lang}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Post-Completion Mutual Rating & Review Panel */}
        {order.status === 'completed' && (
          <div className="p-3.5 bg-emerald-50/80 border-t border-emerald-200 shrink-0 space-y-2.5">
            {existingReview ? (
              <div className="flex items-center justify-between gap-2 text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold">
                    {lang === 'zh'
                      ? `感謝評價！已給予對方 ${existingReview.rating} 顆星評價`
                      : `Thank you! Rated ${existingReview.rating} stars`}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: existingReview.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReviewForm} className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-emerald-950 text-xs">
                    {lang === 'zh'
                      ? `✨ 為 ${otherPartyDisplayName} 評分（結案互評）`
                      : `✨ Rate ${otherPartyDisplayName}`}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        className="p-0.5 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${
                            starVal <= rating
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Review Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {tagOptions.map((tg) => {
                    const active = selectedTags.includes(tg);
                    return (
                      <button
                        key={tg}
                        type="button"
                        onClick={() => toggleReviewTag(tg)}
                        className={`px-2.5 py-1 rounded-full text-[11px] border cursor-pointer transition-colors ${
                          active
                            ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tg}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={
                      lang === 'zh'
                        ? '寫一句感謝或互助心得（選填）...'
                        : 'Optional review comment...'
                    }
                    className="flex-1 bg-white border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer shrink-0"
                  >
                    {isSubmittingReview
                      ? lang === 'zh'
                        ? '送出中...'
                        : 'Saving...'
                      : lang === 'zh'
                        ? '送出評價'
                        : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Quick Phrases Strip */}
        {!isCancelled && (
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
        )}

        {/* Message Input Bar */}
        <form
          onSubmit={handleSendForm}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <button
            type="button"
            disabled={isCancelled}
            onClick={() =>
              void sendTextMessage(
                lang === 'zh'
                  ? '［已傳送物資 / 轉帳截圖通知］'
                  : '[Photo / transfer receipt notice sent]'
              )
            }
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
            title={lang === 'zh' ? '發送照片通知' : 'Send photo notice'}
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            disabled={isCancelled}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isCancelled
                ? lang === 'zh'
                  ? '此申請已結束'
                  : 'Order closed'
                : lang === 'zh'
                  ? '輸入訊息...'
                  : 'Type a message...'
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending || isCancelled}
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
