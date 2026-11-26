import React, { useState, useEffect } from 'react';
import { collection, query, where, getDoc, getDocs, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  OrderItem,
  UserProfile,
  PublicProfileItem,
  ReviewItem,
  Language,
} from '../types';
import { DEMO_USERS } from '../data/mockData';
import { localizeReviewTag } from '../utils/formatters';
import { isFemaleDormLocationName } from '../utils/lbs';
import {
  useAutoTranslateText,
  useAutoTranslateArray,
} from '../hooks/useAutoTranslate';
import {
  X,
  ShieldCheck,
  UserCheck,
  Star,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  MessageSquare,
  GraduationCap,
} from 'lucide-react';

interface PeerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem;
  currentUser: UserProfile;
  useFirestoreRealtime: boolean;
  localReviews?: ReviewItem[];
  onApproveOrder?: (order: OrderItem) => Promise<void> | void;
  onDeclineOrder?: (order: OrderItem) => Promise<void> | void;
  onRequestMutualReveal?: (order: OrderItem) => Promise<void> | void;
  onOpenChat?: (order: OrderItem) => void;
  lang: Language;
}

const ReviewRow: React.FC<{ rev: ReviewItem; lang: Language }> = ({ rev, lang }) => {
  const translatedTaskTitle = useAutoTranslateText(rev.taskTitle, lang);
  const translatedComment = useAutoTranslateText(rev.comment, lang);
  const translatedTags = useAutoTranslateArray(
    rev.tags.map((tg) => localizeReviewTag(tg, lang)),
    lang
  );

  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-slate-900 truncate">{rev.reviewerName}</span>
          {translatedTaskTitle && (
            <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
              · {translatedTaskTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: rev.rating }).map((_, idx) => (
            <Star key={idx} className="w-3 h-3 fill-amber-400 text-amber-500" />
          ))}
        </div>
      </div>

      {translatedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {translatedTags.map((tg, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-medium"
            >
              {tg}
            </span>
          ))}
        </div>
      )}

      {translatedComment && (
        <p className="text-[11px] text-slate-700 leading-relaxed">{translatedComment}</p>
      )}
    </div>
  );
};

export const PeerProfileModal: React.FC<PeerProfileModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUser,
  useFirestoreRealtime,
  localReviews = [],
  onApproveOrder,
  onDeclineOrder,
  onRequestMutualReveal,
  onOpenChat,
  lang,
}) => {
  const [peerProfile, setPeerProfile] = useState<PublicProfileItem | null>(null);
  const [peerReviews, setPeerReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isDeclining, setIsDeclining] = useState<boolean>(false);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);

  const isCreator = currentUser.id === order.creatorUid;
  const peerUid = isCreator ? order.accepterUid : order.creatorUid;
  const isFemaleDormOrder = Boolean(
    order.isFemaleDormOnly || isFemaleDormLocationName(order.taskLocation)
  );
  const isNonAnonymousTask = !order.creatorAnonymous;
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

  useEffect(() => {
    if (!isOpen || !bothRevealed || !peerUid) {
      setPeerProfile(null);
      setPeerReviews([]);
      return;
    }

    let cancelled = false;

    const loadPeerDetails = async () => {
      if (!useFirestoreRealtime || !auth.currentUser) {
        const demoPeer = DEMO_USERS.find((u) => u.id === peerUid);
        const fallbackProf: PublicProfileItem = demoPeer
          ? {
              uid: demoPeer.id,
              nickname: demoPeer.nickname,
              biologicalSex: demoPeer.biologicalSex,
              department: demoPeer.department,
              year: demoPeer.year,
              dormLocation: demoPeer.dormLocation,
              zone: demoPeer.zone,
              bio: demoPeer.bio,
              canTutorSubjects: demoPeer.canTutorSubjects,
              trustScore: demoPeer.trustScore,
              helpCount: demoPeer.helpCount,
            }
          : {
              uid: peerUid,
              nickname: isCreator ? order.accepterName : order.creatorName,
              department: '政大學生',
              year: '在校生',
              trustScore: 90,
              helpCount: 0,
            };
        if (!cancelled) {
          setPeerProfile(fallbackProf);
          setPeerReviews(
            localReviews
              .filter((r) => r.revieweeUid === peerUid)
              .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
          );
        }
        return;
      }

      setIsLoading(true);
      try {
        const [profSnap, revSnap] = await Promise.all([
          getDoc(doc(db, 'public_profiles', peerUid)).catch(() => null),
          getDocs(query(collection(db, 'reviews'), where('revieweeUid', '==', peerUid))).catch(
            () => null
          ),
        ]);

        if (cancelled) return;

        if (profSnap && profSnap.exists()) {
          const d = profSnap.data();
          setPeerProfile({
            uid: String(d.uid || peerUid),
            nickname: String(d.nickname || (isCreator ? order.accepterName : order.creatorName)),
            biologicalSex:
              d.biologicalSex === 'female' || d.biologicalSex === 'male'
                ? d.biologicalSex
                : undefined,
            department: String(d.department || '政大學生'),
            year: String(d.year || '在校生'),
            dormLocation: d.dormLocation ? String(d.dormLocation) : undefined,
            bio: d.bio ? String(d.bio) : undefined,
            canTutorSubjects: Array.isArray(d.canTutorSubjects)
              ? d.canTutorSubjects.map(String)
              : [],
            trustScore: typeof d.trustScore === 'number' ? d.trustScore : 90,
            helpCount: typeof d.helpCount === 'number' ? d.helpCount : 0,
          });
        } else {
          setPeerProfile({
            uid: peerUid,
            nickname: isCreator ? order.accepterName : order.creatorName,
            department: '政大驗證同學',
            year: '在校生',
            trustScore: 90,
            helpCount: 0,
          });
        }

        if (revSnap) {
          const revs: ReviewItem[] = revSnap.docs
            .map((docSnap) => {
              const d = docSnap.data();
              const ts = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
              return {
                id: docSnap.id,
                orderId: String(d.orderId || ''),
                taskId: String(d.taskId || ''),
                taskTitle: d.taskTitle ? String(d.taskTitle) : undefined,
                taskCategory: d.taskCategory || 'marketplace',
                reviewerUid: String(d.reviewerUid || ''),
                reviewerName: String(d.reviewerName || '政大同學'),
                revieweeUid: String(d.revieweeUid || ''),
                rating: typeof d.rating === 'number' ? d.rating : 5,
                tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
                comment: d.comment ? String(d.comment) : '',
                scoreDelta: typeof d.scoreDelta === 'number' ? d.scoreDelta : 0,
                createdAtMs: ts ? ts.getTime() : Date.now(),
              };
            })
            .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
          setPeerReviews(revs);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPeerDetails();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    bothRevealed,
    peerUid,
    useFirestoreRealtime,
    isCreator,
    order.accepterName,
    order.creatorName,
    localReviews,
  ]);

  const displayTaskTitle = useAutoTranslateText(order.taskTitle, lang, order.taskTitleEn);
  const displayDept = useAutoTranslateText(peerProfile?.department || '政大學生', lang);
  const displayYear = useAutoTranslateText(peerProfile?.year || '', lang);
  const displayBio = useAutoTranslateText(peerProfile?.bio, lang);
  const displaySkills = useAutoTranslateArray(peerProfile?.canTutorSubjects || [], lang);

  if (!isOpen) return null;

  const isPendingApproval =
    order.status === 'pending_approval' || order.status === 'pending_confirm';
  const peerNickname = isCreator ? order.accepterName : order.creatorName;
  const peerRealName = isCreator ? order.accepterRealName : order.creatorRealName;

  const peerDisplayName = bothRevealed
    ? peerRealName
      ? `${peerNickname}（${peerRealName}）`
      : peerNickname
    : lang === 'zh'
      ? '匿名同學'
      : 'Anonymous Peer';

  const handleApproveClick = async () => {
    if (!onApproveOrder || isApproving) return;
    setIsApproving(true);
    try {
      await onApproveOrder(order);
    } finally {
      setIsApproving(false);
    }
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

  const handleRevealClick = async () => {
    if (!onRequestMutualReveal || isRevealing) return;
    setIsRevealing(true);
    try {
      await onRequestMutualReveal(order);
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-xs flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              {isPendingApproval && isCreator
                ? lang === 'zh'
                  ? '接單申請審核'
                  : 'APPLICANT REVIEW'
                : lang === 'zh'
                  ? '對方公開檔案與評價'
                  : 'PEER PROFILE & REVIEWS'}
            </div>
            <h3 className="text-sm font-bold truncate mt-0.5">{peerDisplayName}</h3>
            <p className="text-[11px] text-slate-300 truncate">{displayTaskTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!bothRevealed ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-950 text-xs">
                    {lang === 'zh'
                      ? '🛡️ 匿名保護中：尚未解除匿名'
                      : '🛡️ Anonymous Protection Active'}
                  </h4>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    {iRevealed
                      ? lang === 'zh'
                        ? '您已同意解除匿名，等待對方於申請／聊天室同意後，即可同步查看對方本名、系級、信任指數與歷史評價。'
                        : 'You agreed to reveal your profile. Waiting for the peer to consent before details unlock.'
                      : lang === 'zh'
                        ? '此任務採用匿名發布。雙方皆同意解除匿名後，即可查看彼此真實姓名、系級與歷史互助評價紀錄。'
                        : 'This task is posted anonymously. Mutual consent unlocks real names, department, and past reviews.'}
                  </p>
                </div>
              </div>

              {!iRevealed && onRequestMutualReveal && (
                <button
                  type="button"
                  disabled={isRevealing}
                  onClick={() => void handleRevealClick()}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isRevealing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>
                    {lang === 'zh'
                      ? '發起 / 同意雙向解除匿名請求'
                      : 'Request / Consent to Mutual Reveal'}
                  </span>
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
              <span>{lang === 'zh' ? '載入對方檔案與歷史評價中...' : 'Loading peer profile...'}</span>
            </div>
          ) : (
            <>
              {/* Profile Summary Card */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white font-bold text-base flex items-center justify-center shrink-0">
                      {peerNickname.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {peerDisplayName}
                      </h4>
                      <p className="text-[11px] text-slate-600 truncate">
                        {displayDept}
                        {displayYear ? ` · ${displayYear}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{lang === 'zh' ? '政大實名' : 'Verified'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white border border-emerald-200/80 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">
                      {lang === 'zh' ? '信任指數' : 'Trust Score'}
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-800">
                      ★ {peerProfile?.trustScore ?? 90}
                    </span>
                  </div>
                  <div className="bg-white border border-emerald-200/80 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">
                      {lang === 'zh' ? '互助次數' : 'Help Count'}
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {peerProfile?.helpCount ?? 0} {lang === 'zh' ? '次' : 'helps'}
                    </span>
                  </div>
                </div>

                {displayBio && (
                  <p className="text-[11px] text-slate-700 bg-white/80 border border-emerald-200/70 rounded-xl px-3 py-2 leading-relaxed">
                    {displayBio}
                  </p>
                )}

                {displaySkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    {displaySkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-900 text-[10px] font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Historical Reviews */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>{lang === 'zh' ? '歷史互助評價' : 'Historical Reviews'}</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    {peerReviews.length} {lang === 'zh' ? '則' : 'reviews'}
                  </span>
                </div>

                {peerReviews.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-[11px]">
                    {lang === 'zh'
                      ? '尚無過往互助評價紀錄（初始信任指數為 90 分）。'
                      : 'No prior reviews yet (baseline trust score: 90).'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {peerReviews.map((rev) => (
                      <ReviewRow key={rev.id} rev={rev} lang={lang} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2">
          {isPendingApproval && isCreator && onApproveOrder && onDeclineOrder ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isDeclining || isApproving}
                  onClick={() => void handleDeclineClick()}
                  className="py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeclining ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{lang === 'zh' ? '❌ 婉拒申請' : '❌ Decline'}</span>
                </button>

                <button
                  type="button"
                  disabled={isApproving || isDeclining}
                  onClick={() => void handleApproveClick()}
                  className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isApproving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{lang === 'zh' ? '✅ 確認由他接單' : '✅ Confirm Applicant'}</span>
                </button>
              </div>

              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenChat(order);
                  }}
                  className="w-full py-1.5 text-[11px] text-slate-500 hover:text-slate-900 font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>
                    {lang === 'zh' ? '先進入聊天室詢問細節' : 'Message in chat before deciding'}
                  </span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
            >
              {lang === 'zh' ? '關閉並返回聊天室' : 'Close & Return to Chat'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
