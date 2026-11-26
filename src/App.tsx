import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { isAdminEmail, isAllowedNccuEmail } from './config/appConfig';
import {
  UserProfile,
  PostItem,
  OrderItem,
  OrderMessage,
  ReviewItem,
  ReportItem,
  CampusZone,
  DisputeCategory,
  Language,
  PaymentMethod,
  PaymentDirection,
  PostCategory,
  TimeOption,
  PostStatus,
  BiologicalSex,
} from './types';
import { DEMO_USERS, INITIAL_POSTS } from './data/mockData';
import { formatRemainingMinutes } from './utils/formatters';
import {
  Coordinates,
  isFemaleDormLocationName,
  localizeLocationName,
} from './utils/lbs';
import { AppHeader } from './components/AppHeader';
import { BottomNavigation, AppNavTab } from './components/BottomNavigation';
import { FeedView } from './components/FeedView';
import { ChatsView } from './components/ChatsView';
import { ProfileView } from './components/ProfileView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { PostCreateModal } from './components/PostCreateModal';
import { TranscriptVerifyModal } from './components/TranscriptVerifyModal';
import { ChatRoomModal } from './components/ChatRoomModal';
import { ReportDisputeModal } from './components/ReportDisputeModal';
import { AdminReviewModal } from './components/AdminReviewModal';
import { OnboardingGate } from './components/OnboardingGate';
import { CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';

const STORAGE_KEYS = {
  ONBOARDED: 'nccu_loop_onboarded_v1',
  USER: 'nccu_loop_user_v1',
  POSTS: 'nccu_loop_posts_v1',
  ORDERS: 'nccu_loop_orders_v1',
  ORDER_MSGS: 'nccu_loop_order_msgs_v1',
  REVIEWS: 'nccu_loop_reviews_v1',
  REPORTS: 'nccu_loop_reports_v1',
  LANG: 'nccu_loop_lang_v1',
};

const isDemoEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeFirestorePaymentMethod(raw: unknown): 'cash_meetup' | 'pre_transfer' | 'free_aid' {
  if (raw === 'cash_meetup' || raw === 'pre_transfer' || raw === 'free_aid') {
    return raw;
  }
  return 'pre_transfer';
}

function normalizePaymentDirection(
  price: number,
  rawDir?: unknown,
  rawPayerRole?: unknown
): PaymentDirection {
  if (price === 0 || rawDir === 'free') return 'free';
  if (rawDir === 'creator_pays' || rawPayerRole === 'creator') return 'creator_pays';
  return 'accepter_pays';
}

function formatRelativeCreatedAt(ms: number | undefined, lang: Language): string {
  if (!ms) return lang === 'zh' ? '剛剛' : 'Just now';
  const diffMin = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (diffMin < 1) return lang === 'zh' ? '剛剛' : 'Just now';
  if (diffMin < 60) return lang === 'zh' ? `${diffMin} 分鐘前` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === 'zh' ? `${diffHr} 小時前` : `${diffHr}h ago`;
  return new Date(ms).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

function mapTaskDocToPostItem(
  docSnap: QueryDocumentSnapshot<DocumentData>,
  lang: Language
): PostItem {
  const d = docSnap.data();
  const createdTs = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
  const createdAtMs = createdTs ? createdTs.getTime() : Date.now();
  const expireAtMs = typeof d.expireAt === 'number' ? d.expireAt : undefined;
  const minsLeft =
    expireAtMs !== undefined
      ? Math.max(0, Math.round((expireAtMs - Date.now()) / 60000))
      : typeof d.remainingMinutes === 'number'
        ? d.remainingMinutes
        : 120;

  const remainingQuantity =
    typeof d.remainingQuantity === 'number'
      ? d.remainingQuantity
      : typeof d.quantity === 'number'
        ? d.quantity
        : 1;
  const totalQuota =
    typeof d.totalQuota === 'number' ? d.totalQuota : Math.max(1, remainingQuantity);
  const price = typeof d.price === 'number' ? d.price : 0;
  const paymentDirection = normalizePaymentDirection(price, d.paymentDirection, d.payerRole);
  const locName = String(d.location || '政大校園');
  const isFemaleDormOnly = Boolean(d.isFemaleDormOnly || isFemaleDormLocationName(locName));

  return {
    id: docSnap.id,
    creatorId: String(d.creatorUid || ''),
    creatorName: String(d.creatorName || '政大同學'),
    creatorRealName: d.creatorRealName ? String(d.creatorRealName) : undefined,
    creatorTrustScore: typeof d.creatorTrustScore === 'number' ? d.creatorTrustScore : 90,
    isCreatorAnonymous: isFemaleDormOnly ? false : Boolean(d.isAnonymous),
    creatorAnonAlias: !isFemaleDormOnly && d.isAnonymous ? '匿名同學' : undefined,
    isFemaleDormOnly,
    category: (d.category as PostCategory) || 'marketplace',
    title: String(d.title || '無標題任務'),
    titleEn: d.titleEn ? String(d.titleEn) : undefined,
    description: String(d.description || ''),
    descriptionEn: d.descriptionEn ? String(d.descriptionEn) : undefined,
    tags: Array.isArray(d.tags) ? d.tags.map(String) : ['#政大互助'],
    rewardAmount: price,
    escrowDeposit: price,
    paymentMethod: (d.paymentMethod as PaymentMethod) || 'free_aid',
    paymentDirection,
    paymentNote: d.paymentNote ? String(d.paymentNote) : undefined,
    payerRole:
      paymentDirection === 'creator_pays'
        ? 'creator'
        : paymentDirection === 'accepter_pays'
          ? 'fulfiller'
          : undefined,
    totalQuota,
    remainingQuota: remainingQuantity,
    timeOption: (d.timeOption as TimeOption) || '2h',
    remainingMinutes: minsLeft,
    timeRemainingText: formatRemainingMinutes(minsLeft, lang),
    status: (d.status as PostStatus) || 'open',
    locationName: locName,
    locationNameEn: localizeLocationName(
      locName,
      'en',
      d.locationEn ? String(d.locationEn) : undefined
    ),
    locationCoordinates: {
      lat: typeof d.locationLat === 'number' ? d.locationLat : 24.9866,
      lng: typeof d.locationLng === 'number' ? d.locationLng : 121.5766,
    },
    locationZone: (d.locationZone as CampusZone) || 'downhill',
    femaleOnlyRecommended: Boolean(d.femaleOnlyRecommended || isFemaleDormOnly),
    minTrustScoreRequired: 60,
    createdAt: formatRelativeCreatedAt(createdAtMs, lang),
    expiresAt: formatRemainingMinutes(minsLeft, lang),
    createdAtMs,
    expireAtMs,
  };
}

function mapOrderDocToOrderItem(docSnap: QueryDocumentSnapshot<DocumentData>): OrderItem {
  const d = docSnap.data();
  const createdTs = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
  const updatedTs = d.updatedAt?.toDate ? (d.updatedAt.toDate() as Date) : null;
  const taskPrice = typeof d.taskPrice === 'number' ? d.taskPrice : 0;
  const paymentDirection = normalizePaymentDirection(taskPrice, d.paymentDirection, d.payerRole);
  const taskLoc = String(d.taskLocation || '政大校園');
  const isFemaleDormOnly = Boolean(d.isFemaleDormOnly || isFemaleDormLocationName(taskLoc));

  return {
    id: docSnap.id,
    taskId: String(d.taskId || ''),
    taskCategory: (d.taskCategory as PostCategory) || 'marketplace',
    taskTitle: String(d.taskTitle || ''),
    taskTitleEn: d.taskTitleEn ? String(d.taskTitleEn) : undefined,
    taskLocation: taskLoc,
    taskLocationEn: d.taskLocationEn
      ? String(d.taskLocationEn)
      : localizeLocationName(taskLoc, 'en'),
    taskPrice,
    paymentMethod: (d.paymentMethod as PaymentMethod) || 'cash_meetup',
    paymentDirection,
    paymentNote: d.paymentNote ? String(d.paymentNote) : undefined,
    payerRole:
      paymentDirection === 'creator_pays'
        ? 'creator'
        : paymentDirection === 'accepter_pays'
          ? 'fulfiller'
          : undefined,
    taskExpireAt: typeof d.taskExpireAt === 'number' ? d.taskExpireAt : undefined,
    isFemaleDormOnly,
    creatorUid: String(d.creatorUid || ''),
    creatorName: String(d.creatorName || '政大同學'),
    creatorRealName: d.creatorRealName ? String(d.creatorRealName) : undefined,
    creatorAnonymous: isFemaleDormOnly ? false : Boolean(d.creatorAnonymous),
    creatorAnonAlias: d.creatorAnonAlias ? String(d.creatorAnonAlias) : undefined,
    accepterUid: String(d.accepterUid || ''),
    accepterName: String(d.accepterName || '政大同學'),
    accepterRealName: d.accepterRealName ? String(d.accepterRealName) : undefined,
    accepterAnonymous: isFemaleDormOnly ? false : Boolean(d.accepterAnonymous),
    accepterAnonAlias: d.accepterAnonAlias ? String(d.accepterAnonAlias) : undefined,
    status: (d.status as OrderItem['status']) || 'pending_approval',
    creatorPaidConfirmed: Boolean(d.creatorPaidConfirmed),
    accepterPaidConfirmed: Boolean(d.accepterPaidConfirmed),
    creatorDoneConfirmed: Boolean(d.creatorDoneConfirmed),
    accepterDoneConfirmed: Boolean(d.accepterDoneConfirmed),
    revealCreator: isFemaleDormOnly ? true : Boolean(d.revealCreator),
    revealAccepter: isFemaleDormOnly ? true : Boolean(d.revealAccepter),
    completedAtMs: typeof d.completedAtMs === 'number' ? d.completedAtMs : undefined,
    disputeReason: d.disputeReason ? String(d.disputeReason) : undefined,
    disputedByUid: d.disputedByUid ? String(d.disputedByUid) : undefined,
    createdAtMs: createdTs ? createdTs.getTime() : Date.now(),
    updatedAtMs: updatedTs ? updatedTs.getTime() : createdTs ? createdTs.getTime() : Date.now(),
  };
}

function mapReviewDocToReviewItem(docSnap: QueryDocumentSnapshot<DocumentData>): ReviewItem {
  const d = docSnap.data();
  const createdTs = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
  return {
    id: docSnap.id,
    orderId: String(d.orderId || ''),
    taskId: String(d.taskId || ''),
    taskTitle: d.taskTitle ? String(d.taskTitle) : undefined,
    taskCategory: (d.taskCategory as PostCategory) || 'marketplace',
    paymentDirection: (d.paymentDirection as PaymentDirection) || undefined,
    reviewerUid: String(d.reviewerUid || ''),
    reviewerName: String(d.reviewerName || '政大同學'),
    revieweeUid: String(d.revieweeUid || ''),
    rating: typeof d.rating === 'number' ? d.rating : 5,
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
    comment: d.comment ? String(d.comment) : '',
    scoreDelta: typeof d.scoreDelta === 'number' ? d.scoreDelta : 0,
    createdAtMs: createdTs ? createdTs.getTime() : Date.now(),
  };
}

function mapReportDocToReportItem(docSnap: QueryDocumentSnapshot<DocumentData>): ReportItem {
  const d = docSnap.data();
  const createdTs = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
  return {
    id: docSnap.id,
    orderId: d.orderId ? String(d.orderId) : undefined,
    taskId: String(d.taskId || ''),
    taskTitle: d.taskTitle ? String(d.taskTitle) : undefined,
    reporterId: String(d.reporterUid || ''),
    reporterEmail: d.reporterEmail ? String(d.reporterEmail) : undefined,
    reportedUserId: d.reportedUid ? String(d.reportedUid) : undefined,
    reportedUserName: d.reportedName ? String(d.reportedName) : undefined,
    reasonCategory: (d.reasonCategory as DisputeCategory) || 'other',
    description: String(d.description || ''),
    evidenceUrl: d.evidenceUrl ? String(d.evidenceUrl) : undefined,
    status: (d.status as ReportItem['status']) || 'pending_review',
    aiSummary: d.aiSummary ? String(d.aiSummary) : undefined,
    adminNote: d.adminNote ? String(d.adminNote) : undefined,
    reviewedBy: d.reviewedBy ? String(d.reviewedBy) : undefined,
    reviewedAtMs: typeof d.reviewedAtMs === 'number' ? d.reviewedAtMs : undefined,
    createdAt: createdTs ? createdTs.toLocaleDateString('zh-TW') : '剛剛',
    createdAtMs: createdTs ? createdTs.getTime() : Date.now(),
  };
}

function calculateScoreDelta(
  rating: number,
  category: PostCategory,
  paymentDirection?: PaymentDirection
): number {
  if (rating >= 4) {
    if (category === 'emergency' || category === 'leftovers' || paymentDirection === 'free') {
      return 2;
    }
    return 1;
  }
  if (rating === 3) return 0;
  return -3;
}

export default function App() {
  const [lang, setLang] = useState<Language>(() =>
    readStorage<Language>(STORAGE_KEYS.LANG, 'zh')
  );
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() =>
    readStorage<boolean>(STORAGE_KEYS.ONBOARDED, false)
  );
  const [currentUser, setCurrentUser] = useState<UserProfile>(() =>
    readStorage<UserProfile>(STORAGE_KEYS.USER, DEMO_USERS[0])
  );

  // Firebase Auth state (Supports both @g.nccu.edu.tw AND @nccu.edu.tw)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [userDocExists, setUserDocExists] = useState<boolean>(false);
  const isFirebaseVerified = Boolean(
    firebaseUser && isAllowedNccuEmail(firebaseUser.email)
  );
  const isAdminUser = isAdminEmail(firebaseUser?.email || currentUser.nccuEmail);

  // Local fallback state (Dev Demo Mode)
  const [localPosts, setLocalPosts] = useState<PostItem[]>(() =>
    readStorage<PostItem[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS)
  );
  const [localOrders, setLocalOrders] = useState<OrderItem[]>(() =>
    readStorage<OrderItem[]>(STORAGE_KEYS.ORDERS, [])
  );
  const [localOrderMessagesMap, setLocalOrderMessagesMap] = useState<Record<string, OrderMessage[]>>(
    () => readStorage<Record<string, OrderMessage[]>>(STORAGE_KEYS.ORDER_MSGS, {})
  );
  const [localReviews, setLocalReviews] = useState<ReviewItem[]>(() =>
    readStorage<ReviewItem[]>(STORAGE_KEYS.REVIEWS, [])
  );
  const [localReports, setLocalReports] = useState<ReportItem[]>(() =>
    readStorage<ReportItem[]>(STORAGE_KEYS.REPORTS, [])
  );

  // Live Firestore synced state
  const [firestorePosts, setFirestorePosts] = useState<PostItem[]>([]);
  const [firestoreOrders, setFirestoreOrders] = useState<OrderItem[]>([]);
  const [firestoreReceivedReviews, setFirestoreReceivedReviews] = useState<ReviewItem[]>([]);
  const [firestoreGivenReviews, setFirestoreGivenReviews] = useState<ReviewItem[]>([]);
  const [firestoreReportsAgainstMe, setFirestoreReportsAgainstMe] = useState<ReportItem[]>([]);
  const [firestoreAdminReports, setFirestoreAdminReports] = useState<ReportItem[]>([]);
  const [ordersReady, setOrdersReady] = useState<boolean>(false);
  const [reviewsReady, setReviewsReady] = useState<boolean>(false);
  const [reportsReady, setReportsReady] = useState<boolean>(false);

  const posts = isFirebaseVerified ? firestorePosts : localPosts;
  const orders = isFirebaseVerified ? firestoreOrders : localOrders;
  const receivedReviews = useMemo(
    () =>
      isFirebaseVerified
        ? firestoreReceivedReviews
        : localReviews.filter((r) => r.revieweeUid === currentUser.id),
    [isFirebaseVerified, firestoreReceivedReviews, localReviews, currentUser.id]
  );
  const givenReviews = useMemo(
    () =>
      isFirebaseVerified
        ? firestoreGivenReviews
        : localReviews.filter((r) => r.reviewerUid === currentUser.id),
    [isFirebaseVerified, firestoreGivenReviews, localReviews, currentUser.id]
  );
  const reportsAgainstMe = useMemo(
    () =>
      isFirebaseVerified
        ? firestoreReportsAgainstMe
        : localReports.filter((r) => r.reportedUserId === currentUser.id),
    [isFirebaseVerified, firestoreReportsAgainstMe, localReports, currentUser.id]
  );
  const adminReports = useMemo(
    () => (isFirebaseVerified ? firestoreAdminReports : localReports),
    [isFirebaseVerified, firestoreAdminReports, localReports]
  );

  // Bottom Navigation tabs: 'feed' | 'flash' | 'chats' | 'profile'
  const [currentNavTab, setCurrentNavTab] = useState<AppNavTab>('feed');
  const [currentZone, setCurrentZone] = useState<CampusZone>('downhill');

  // Modals state
  const [selectedDetailPostId, setSelectedDetailPostId] = useState<string | null>(null);
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const [activeDisputeTarget, setActiveDisputeTarget] = useState<{
    order?: OrderItem | null;
    post?: PostItem | null;
  } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [pendingDeletePost, setPendingDeletePost] = useState<PostItem | null>(null);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Firebase Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null);
        setUserDocExists(false);
        return;
      }

      const email = fbUser.email?.trim() || '';
      if (!isAllowedNccuEmail(email)) {
        await signOut(auth);
        setFirebaseUser(null);
        setUserDocExists(false);
        setIsOnboarded(false);
        return;
      }

      setFirebaseUser(fbUser);

      setCurrentUser((prev) => ({
        ...prev,
        id: fbUser.uid,
        nccuEmail: email,
        studentId: prev.studentId || email.split('@')[0],
        avatar: fbUser.photoURL || prev.avatar,
        isVerifiedStudent: true,
      }));

      try {
        const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
        if (userSnap.exists()) {
          setUserDocExists(true);
          const u = userSnap.data();
          const bioSex: BiologicalSex | undefined =
            u.biologicalSex === 'female' || u.biologicalSex === 'male'
              ? u.biologicalSex
              : undefined;
          setCurrentUser((prev) => ({
            ...prev,
            id: fbUser.uid,
            nccuEmail: email,
            studentId: String(u.studentId || email.split('@')[0]),
            name: String(u.nickname || prev.name),
            nickname: String(u.nickname || prev.nickname),
            realName: u.realName ? String(u.realName) : prev.realName || String(u.nickname || prev.name),
            biologicalSex: bioSex || prev.biologicalSex || 'female',
            department: String(u.department || prev.department),
            year: String(u.year || prev.year),
            dormLocation: String(u.dormLocation || prev.dormLocation),
            bio: u.bio !== undefined ? String(u.bio) : prev.bio,
            gender: (u.gender as UserProfile['gender']) || bioSex || prev.gender,
            zone: (u.zone as CampusZone) || prev.zone,
            canTutorSubjects: Array.isArray(u.canTutorSubjects)
              ? u.canTutorSubjects.map(String)
              : prev.canTutorSubjects,
            subscribedTags: Array.isArray(u.subscribedTags)
              ? u.subscribedTags.map(String)
              : prev.subscribedTags,
            trustScore: typeof u.trustScore === 'number' ? u.trustScore : 90,
            helpCount:
              typeof u.helpCount === 'number'
                ? u.helpCount
                : typeof u.completedTasks === 'number'
                  ? u.completedTasks
                  : 0,
            completedTasks:
              typeof u.completedTasks === 'number' ? u.completedTasks : prev.completedTasks,
            isVerifiedStudent: true,
          }));
        } else {
          setUserDocExists(false);
        }
      } catch {
        setUserDocExists(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener for `tasks`
  useEffect(() => {
    if (!isFirebaseVerified || !firebaseUser) {
      setFirestorePosts([]);
      return;
    }

    const openMap = new Map<string, PostItem>();
    const mineMap = new Map<string, PostItem>();

    const mergeAndSetTasks = () => {
      const merged = new Map<string, PostItem>();
      openMap.forEach((v, k) => merged.set(k, v));
      mineMap.forEach((v, k) => merged.set(k, v));
      const sorted = Array.from(merged.values()).sort(
        (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)
      );
      setFirestorePosts(sorted);
    };

    const qOpen = query(collection(db, 'tasks'), where('status', '==', 'open'));
    const qMine = query(collection(db, 'tasks'), where('creatorUid', '==', firebaseUser.uid));

    const unsubOpen = onSnapshot(
      qOpen,
      (snapshot) => {
        openMap.clear();
        snapshot.docs.forEach((docSnap) => {
          openMap.set(docSnap.id, mapTaskDocToPostItem(docSnap, lang));
        });
        mergeAndSetTasks();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
      }
    );

    const unsubMine = onSnapshot(
      qMine,
      (snapshot) => {
        mineMap.clear();
        snapshot.docs.forEach((docSnap) => {
          mineMap.set(docSnap.id, mapTaskDocToPostItem(docSnap, lang));
        });
        mergeAndSetTasks();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
      }
    );

    return () => {
      unsubOpen();
      unsubMine();
    };
  }, [isFirebaseVerified, firebaseUser, lang]);

  // Real-time Firestore listener for `orders`
  useEffect(() => {
    if (!isFirebaseVerified || !firebaseUser) {
      setFirestoreOrders([]);
      setOrdersReady(false);
      return;
    }

    const creatorOrdersMap = new Map<string, OrderItem>();
    const accepterOrdersMap = new Map<string, OrderItem>();
    let creatorSynced = false;
    let accepterSynced = false;

    const mergeAndSetOrders = () => {
      const merged = new Map<string, OrderItem>();
      creatorOrdersMap.forEach((v, k) => merged.set(k, v));
      accepterOrdersMap.forEach((v, k) => merged.set(k, v));
      const sorted = Array.from(merged.values()).sort(
        (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)
      );
      setFirestoreOrders(sorted);
      if (creatorSynced && accepterSynced) {
        setOrdersReady(true);
      }
    };

    const qAsCreator = query(collection(db, 'orders'), where('creatorUid', '==', firebaseUser.uid));
    const qAsAccepter = query(
      collection(db, 'orders'),
      where('accepterUid', '==', firebaseUser.uid)
    );

    const unsubCreator = onSnapshot(
      qAsCreator,
      (snapshot) => {
        creatorOrdersMap.clear();
        snapshot.docs.forEach((docSnap) => {
          creatorOrdersMap.set(docSnap.id, mapOrderDocToOrderItem(docSnap));
        });
        creatorSynced = true;
        mergeAndSetOrders();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    const unsubAccepter = onSnapshot(
      qAsAccepter,
      (snapshot) => {
        accepterOrdersMap.clear();
        snapshot.docs.forEach((docSnap) => {
          accepterOrdersMap.set(docSnap.id, mapOrderDocToOrderItem(docSnap));
        });
        accepterSynced = true;
        mergeAndSetOrders();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => {
      unsubCreator();
      unsubAccepter();
    };
  }, [isFirebaseVerified, firebaseUser]);

  // Real-time Firestore listeners for `reviews` and `reports`
  useEffect(() => {
    if (!isFirebaseVerified || !firebaseUser) {
      setFirestoreReceivedReviews([]);
      setFirestoreGivenReviews([]);
      setFirestoreReportsAgainstMe([]);
      setFirestoreAdminReports([]);
      setReviewsReady(false);
      setReportsReady(false);
      return;
    }

    let recLoaded = false;
    let givenLoaded = false;

    const qReceived = query(
      collection(db, 'reviews'),
      where('revieweeUid', '==', firebaseUser.uid)
    );
    const qGiven = query(
      collection(db, 'reviews'),
      where('reviewerUid', '==', firebaseUser.uid)
    );
    const qReportsAgainstMe = query(
      collection(db, 'reports'),
      where('reportedUid', '==', firebaseUser.uid)
    );

    const unsubReceived = onSnapshot(
      qReceived,
      (snapshot) => {
        const list = snapshot.docs
          .map(mapReviewDocToReviewItem)
          .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
        setFirestoreReceivedReviews(list);
        recLoaded = true;
        if (recLoaded && givenLoaded) setReviewsReady(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    );

    const unsubGiven = onSnapshot(
      qGiven,
      (snapshot) => {
        const list = snapshot.docs.map(mapReviewDocToReviewItem);
        setFirestoreGivenReviews(list);
        givenLoaded = true;
        if (recLoaded && givenLoaded) setReviewsReady(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    );

    const unsubReports = onSnapshot(
      qReportsAgainstMe,
      (snapshot) => {
        const list = snapshot.docs
          .map(mapReportDocToReportItem)
          .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
        setFirestoreReportsAgainstMe(list);
        setReportsReady(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reports');
      }
    );

    let unsubAdminReports: (() => void) | null = null;
    if (isAdminEmail(firebaseUser.email)) {
      unsubAdminReports = onSnapshot(
        collection(db, 'reports'),
        (snapshot) => {
          const list = snapshot.docs
            .map(mapReportDocToReportItem)
            .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
          setFirestoreAdminReports(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'reports');
        }
      );
    } else {
      setFirestoreAdminReports([]);
    }

    return () => {
      unsubReceived();
      unsubGiven();
      unsubReports();
      unsubAdminReports?.();
    };
  }, [isFirebaseVerified, firebaseUser]);

  // Deterministic live calculation of `helpCount` & `trustScore` (base 90, only confirmed_violation deducts 10)
  const { computedHelpCount, computedTrustScore } = useMemo(() => {
    const completedOrders = orders
      .filter(
        (o) =>
          o.status === 'completed' &&
          (o.creatorUid === currentUser.id || o.accepterUid === currentUser.id)
      )
      .sort(
        (a, b) =>
          (a.completedAtMs ?? a.updatedAtMs ?? a.createdAtMs ?? 0) -
          (b.completedAtMs ?? b.updatedAtMs ?? b.createdAtMs ?? 0)
      );

    const lastCountedByPeer: Record<string, number> = {};
    let helpTotal = 0;

    for (const ord of completedOrders) {
      const peerUid = ord.creatorUid === currentUser.id ? ord.accepterUid : ord.creatorUid;
      const ts = ord.completedAtMs ?? ord.updatedAtMs ?? ord.createdAtMs ?? 0;
      const prevTs = lastCountedByPeer[peerUid];
      if (prevTs === undefined || ts - prevTs >= ONE_DAY_MS) {
        helpTotal += 1;
        lastCountedByPeer[peerUid] = ts;
      }
    }

    const reviewDelta = receivedReviews.reduce((acc, rev) => acc + (rev.scoreDelta || 0), 0);
    const confirmedViolations = reportsAgainstMe.filter(
      (r) => r.status === 'confirmed_violation'
    ).length;

    const score = Math.max(0, Math.min(100, 90 + reviewDelta - confirmedViolations * 10));
    return { computedHelpCount: helpTotal, computedTrustScore: score };
  }, [orders, receivedReviews, reportsAgainstMe, currentUser.id]);

  // Helper to sync non-PII `public_profiles/{uid}`
  const syncPublicProfileToFirestore = async (
    uid: string,
    profile: UserProfile,
    trustScore: number,
    helpCount: number
  ) => {
    const pubPayload: Record<string, unknown> = {
      uid,
      nickname: (profile.nickname || profile.name).slice(0, 64),
      department: (profile.department || '').slice(0, 64),
      year: (profile.year || '').slice(0, 32),
      dormLocation: (profile.dormLocation || '').slice(0, 64),
      bio: (profile.bio || '').slice(0, 300),
      zone: profile.zone || 'downhill',
      canTutorSubjects: (profile.canTutorSubjects || []).slice(0, 30),
      trustScore,
      helpCount,
      updatedAt: serverTimestamp(),
    };
    if (profile.biologicalSex === 'female' || profile.biologicalSex === 'male') {
      pubPayload.biologicalSex = profile.biologicalSex;
    }

    try {
      await setDoc(doc(db, 'public_profiles', uid), pubPayload);
    } catch {
      // keep silent if user doc isn't initialized yet
    }
  };

  // Sync computed trustScore & helpCount back to currentUser, `users/{uid}`, and `public_profiles/{uid}`
  useEffect(() => {
    if (!isOnboarded) return;
    if (isFirebaseVerified && (!ordersReady || !reviewsReady || !reportsReady || !userDocExists)) {
      return;
    }

    if (
      currentUser.trustScore === computedTrustScore &&
      currentUser.helpCount === computedHelpCount
    ) {
      return;
    }

    const updatedProfile: UserProfile = {
      ...currentUser,
      trustScore: computedTrustScore,
      helpCount: computedHelpCount,
      completedTasks: computedHelpCount,
    };
    setCurrentUser(updatedProfile);

    if (isFirebaseVerified && firebaseUser && userDocExists) {
      void updateDoc(doc(db, 'users', firebaseUser.uid), {
        trustScore: computedTrustScore,
        helpCount: computedHelpCount,
        completedTasks: computedHelpCount,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      });
      void syncPublicProfileToFirestore(
        firebaseUser.uid,
        updatedProfile,
        computedTrustScore,
        computedHelpCount
      );
    }
  }, [
    isOnboarded,
    isFirebaseVerified,
    firebaseUser,
    userDocExists,
    ordersReady,
    reviewsReady,
    reportsReady,
    computedTrustScore,
    computedHelpCount,
    currentUser,
  ]);

  // Persist lightweight local cache
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.LANG, JSON.stringify(lang));
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.ONBOARDED, JSON.stringify(isOnboarded));
    } catch {
      // ignore
    }
  }, [isOnboarded]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(localPosts));
    } catch {
      // ignore
    }
  }, [localPosts]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(localOrders));
    } catch {
      // ignore
    }
  }, [localOrders]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.ORDER_MSGS, JSON.stringify(localOrderMessagesMap));
    } catch {
      // ignore
    }
  }, [localOrderMessagesMap]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(localReviews));
    } catch {
      // ignore
    }
  }, [localReviews]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(localReports));
    } catch {
      // ignore
    }
  }, [localReports]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  };

  // Sync verified NCCU user profile to Firestore (`users` + `public_profiles`)
  const syncUserToFirestore = async (profile: UserProfile) => {
    const fbUser = auth.currentUser;
    if (!fbUser || !isAllowedNccuEmail(fbUser.email)) return;

    const userPath = `users/${fbUser.uid}`;
    const userRef = doc(db, 'users', fbUser.uid);
    const nick = (profile.nickname || profile.name).slice(0, 64);
    const real = (profile.realName || nick).slice(0, 64);
    const bioSex: BiologicalSex =
      profile.biologicalSex === 'male' || profile.biologicalSex === 'female'
        ? profile.biologicalSex
        : 'female';

    try {
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        await updateDoc(userRef, {
          nickname: nick,
          realName: real,
          biologicalSex: bioSex,
          department: (profile.department || '').slice(0, 64),
          year: (profile.year || '').slice(0, 32),
          dormLocation: (profile.dormLocation || '').slice(0, 64),
          bio: (profile.bio || '').slice(0, 300),
          gender: bioSex,
          zone: profile.zone || 'downhill',
          canTutorSubjects: (profile.canTutorSubjects || []).slice(0, 30),
          subscribedTags: (profile.subscribedTags || []).slice(0, 30),
          updatedAt: serverTimestamp(),
        });
        setUserDocExists(true);
      } else {
        await setDoc(userRef, {
          uid: fbUser.uid,
          nccuEmail: fbUser.email,
          studentId: (profile.studentId || (fbUser.email || '').split('@')[0]).slice(0, 64),
          nickname: nick,
          realName: real,
          biologicalSex: bioSex,
          department: (profile.department || '').slice(0, 64),
          year: (profile.year || '').slice(0, 32),
          dormLocation: (profile.dormLocation || '').slice(0, 64),
          bio: (profile.bio || '').slice(0, 300),
          gender: bioSex,
          zone: profile.zone || 'downhill',
          canTutorSubjects: (profile.canTutorSubjects || []).slice(0, 30),
          subscribedTags: (profile.subscribedTags || []).slice(0, 30),
          trustScore: 90,
          helpCount: 0,
          completedTasks: 0,
          isVerifiedStudent: true,
          updatedAt: serverTimestamp(),
        });
        setUserDocExists(true);
      }

      await syncPublicProfileToFirestore(
        fbUser.uid,
        { ...profile, biologicalSex: bioSex },
        profile.trustScore ?? 90,
        profile.helpCount ?? 0
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  };

  // Publish new task
  const handleCreatePost = async (newPostData: Partial<PostItem>) => {
    const mins =
      newPostData.remainingMinutes !== undefined ? newPostData.remainingMinutes : 120;
    const expireAtMs = newPostData.expireAtMs ?? Date.now() + mins * 60000;
    const title = (newPostData.title || '無標題任務').trim().slice(0, 160);
    const description = (newPostData.description || '').trim().slice(0, 2000);
    const location = (newPostData.locationName || '總圖書館').trim().slice(0, 100);
    const price = newPostData.rewardAmount !== undefined ? Number(newPostData.rewardAmount) : 0;
    const paymentMethod = normalizeFirestorePaymentMethod(
      price === 0 ? 'free_aid' : newPostData.paymentMethod
    );
    const paymentDirection = normalizePaymentDirection(
      price,
      newPostData.paymentDirection,
      newPostData.payerRole
    );
    const qty = Math.max(1, Math.min(20, newPostData.remainingQuota ?? 1));
    const totalQty = Math.max(qty, Math.min(20, newPostData.totalQuota ?? qty));

    const isFemaleDormTask = Boolean(
      newPostData.isFemaleDormOnly || isFemaleDormLocationName(location)
    );
    const isAnonymous = isFemaleDormTask ? false : Boolean(newPostData.isCreatorAnonymous);
    const myNick = (currentUser.nickname || currentUser.name).slice(0, 64);
    const myReal = (currentUser.realName || myNick).slice(0, 64);

    if (isFirebaseVerified && firebaseUser) {
      const payload: Record<string, unknown> = {
        title,
        description,
        category: newPostData.category || 'marketplace',
        location,
        locationZone: newPostData.locationZone || currentZone,
        locationLat: newPostData.locationCoordinates?.lat ?? 24.9866,
        locationLng: newPostData.locationCoordinates?.lng ?? 121.5766,
        price,
        paymentMethod,
        paymentDirection,
        quantity: qty,
        remainingQuantity: qty,
        totalQuota: totalQty,
        isAnonymous,
        isFemaleDormOnly: isFemaleDormTask,
        femaleOnlyRecommended: isFemaleDormTask || Boolean(newPostData.femaleOnlyRecommended),
        tags: (newPostData.tags || ['#政大互助']).slice(0, 10),
        creatorUid: firebaseUser.uid,
        creatorName: myNick,
        creatorEmail: firebaseUser.email || currentUser.nccuEmail,
        creatorTrustScore: currentUser.trustScore,
        status: 'open',
        timeOption: newPostData.timeOption || '2h',
        remainingMinutes: mins,
        expireAt: expireAtMs,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (isFemaleDormTask) {
        payload.creatorRealName = myReal;
      }
      if (newPostData.titleEn) payload.titleEn = newPostData.titleEn.slice(0, 160);
      if (newPostData.descriptionEn) payload.descriptionEn = newPostData.descriptionEn.slice(0, 2000);
      if (price > 0 && newPostData.paymentNote?.trim()) {
        payload.paymentNote = newPostData.paymentNote.trim().slice(0, 200);
      }
      if (price > 0 && paymentDirection !== 'free') {
        payload.payerRole = paymentDirection === 'creator_pays' ? 'creator' : 'fulfiller';
      }

      try {
        await addDoc(collection(db, 'tasks'), payload);
        showToast(
          lang === 'zh'
            ? `✅「${title.slice(0, 16)}」已發布至大廳！`
            : '✅ Task published to the campus feed!'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'tasks');
      }
      return;
    }

    // Dev demo fallback
    const newId = `post_${Date.now()}`;
    const newPost: PostItem = {
      id: newId,
      creatorId: currentUser.id,
      creatorName: myNick,
      creatorRealName: isFemaleDormTask ? myReal : undefined,
      creatorGender: currentUser.gender,
      creatorTrustScore: currentUser.trustScore,
      isCreatorAnonymous: isAnonymous,
      creatorAnonAlias: isAnonymous ? '匿名同學' : undefined,
      isFemaleDormOnly: isFemaleDormTask,
      category: newPostData.category || 'marketplace',
      subcategory: newPostData.subcategory,
      title,
      titleEn: newPostData.titleEn || title,
      description,
      descriptionEn: newPostData.descriptionEn || description,
      tags: newPostData.tags || ['#政大互助'],
      rewardAmount: price,
      escrowDeposit: price,
      paymentMethod,
      paymentDirection,
      paymentNote: newPostData.paymentNote,
      payerRole:
        paymentDirection === 'creator_pays'
          ? 'creator'
          : paymentDirection === 'accepter_pays'
            ? 'fulfiller'
            : undefined,
      totalQuota: totalQty,
      remainingQuota: qty,
      timeOption: newPostData.timeOption || '2h',
      remainingMinutes: mins,
      timeRemainingText: formatRemainingMinutes(mins, lang),
      status: 'open',
      locationName: location,
      locationNameEn: localizeLocationName(location, 'en', newPostData.locationNameEn),
      locationCoordinates: newPostData.locationCoordinates || { lat: 24.9866, lng: 121.5766 },
      locationZone: newPostData.locationZone || currentZone,
      femaleOnlyRecommended: isFemaleDormTask || Boolean(newPostData.femaleOnlyRecommended),
      minTrustScoreRequired: 60,
      createdAt: '剛剛',
      expiresAt: formatRemainingMinutes(mins, lang),
      createdAtMs: Date.now(),
      expireAtMs,
    };
    setLocalPosts((prev) => [newPost, ...prev]);
    showToast(
      lang === 'zh'
        ? `✅「${newPost.title.slice(0, 16)}」發布成功！`
        : '✅ Task published to campus feed!'
    );
  };

  // Helper: check if a task has active (non-cancelled, non-completed) orders
  const hasActiveOrdersForPost = (postId: string): boolean => {
    return orders.some(
      (o) => o.taskId === postId && o.status !== 'cancelled' && o.status !== 'completed'
    );
  };

  // Edit existing task
  const handleUpdatePost = async (postId: string, updates: Partial<PostItem>) => {
    const existingPost = posts.find((p) => p.id === postId);
    if (!existingPost) return;
    const hasActive = hasActiveOrdersForPost(postId);

    if (hasActive) {
      const cleanDesc = (updates.description || existingPost.description).trim().slice(0, 2000);
      if (isFirebaseVerified && firebaseUser) {
        try {
          await updateDoc(doc(db, 'tasks', postId), {
            description: cleanDesc,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `tasks/${postId}`);
          return;
        }
      } else {
        setLocalPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, description: cleanDesc } : p))
        );
      }
      showToast(
        lang === 'zh' ? '✅ 已更新補充說明！' : '✅ Additional description updated!'
      );
      return;
    }

    const title = (updates.title || existingPost.title).trim().slice(0, 160);
    const description = (updates.description || existingPost.description).trim().slice(0, 2000);
    const location = (updates.locationName || existingPost.locationName).trim().slice(0, 100);
    const price =
      updates.rewardAmount !== undefined ? Number(updates.rewardAmount) : existingPost.rewardAmount;
    const paymentMethod = normalizeFirestorePaymentMethod(
      price === 0 ? 'free_aid' : updates.paymentMethod || existingPost.paymentMethod
    );
    const paymentDirection = normalizePaymentDirection(
      price,
      updates.paymentDirection || existingPost.paymentDirection,
      updates.payerRole || existingPost.payerRole
    );
    const isFemaleDormTask = Boolean(
      updates.isFemaleDormOnly ?? (existingPost.isFemaleDormOnly || isFemaleDormLocationName(location))
    );
    const isAnonymous = isFemaleDormTask
      ? false
      : Boolean(updates.isCreatorAnonymous ?? existingPost.isCreatorAnonymous);
    const mins =
      updates.remainingMinutes !== undefined
        ? updates.remainingMinutes
        : existingPost.remainingMinutes ?? 120;
    const expireAtMs = updates.expireAtMs ?? existingPost.expireAtMs ?? Date.now() + mins * 60000;

    if (isFirebaseVerified && firebaseUser) {
      const patch: Record<string, unknown> = {
        title,
        description,
        location,
        locationZone: updates.locationZone || existingPost.locationZone,
        locationLat:
          updates.locationCoordinates?.lat ?? existingPost.locationCoordinates.lat ?? 24.9866,
        locationLng:
          updates.locationCoordinates?.lng ?? existingPost.locationCoordinates.lng ?? 121.5766,
        price,
        paymentMethod,
        paymentDirection,
        isFemaleDormOnly: isFemaleDormTask,
        femaleOnlyRecommended: isFemaleDormTask || Boolean(updates.femaleOnlyRecommended),
        isAnonymous,
        tags: (updates.tags || existingPost.tags).slice(0, 10),
        timeOption: updates.timeOption || existingPost.timeOption,
        remainingMinutes: mins,
        expireAt: expireAtMs,
        updatedAt: serverTimestamp(),
      };
      if (price > 0 && updates.paymentNote?.trim()) {
        patch.paymentNote = updates.paymentNote.trim().slice(0, 200);
      }
      if (price > 0 && paymentDirection !== 'free') {
        patch.payerRole = paymentDirection === 'creator_pays' ? 'creator' : 'fulfiller';
      }

      try {
        await updateDoc(doc(db, 'tasks', postId), patch);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${postId}`);
        return;
      }
    } else {
      setLocalPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                ...updates,
                title,
                description,
                locationName: location,
                locationNameEn: localizeLocationName(location, 'en'),
                rewardAmount: price,
                escrowDeposit: price,
                paymentMethod,
                paymentDirection,
                isFemaleDormOnly: isFemaleDormTask,
                isCreatorAnonymous: isAnonymous,
                remainingMinutes: mins,
                expireAtMs,
                timeRemainingText: formatRemainingMinutes(mins, lang),
                expiresAt: formatRemainingMinutes(mins, lang),
              }
            : p
        )
      );
    }

    showToast(lang === 'zh' ? '✅ 任務內容已更新！' : '✅ Task updated!');
  };

  // Delete existing task (triggered from in-app confirmation modal)
  const handleRequestDeletePost = (post: PostItem) => {
    if (hasActiveOrdersForPost(post.id)) {
      showToast(
        lang === 'zh'
          ? '⚠️ 已有進行中或待審核的訂單，請先於聊天室處理完畢，不可直接刪除任務。'
          : '⚠️ Cannot delete a task while active orders exist.'
      );
      return;
    }
    setPendingDeletePost(post);
  };

  const handleConfirmDeletePost = async () => {
    if (!pendingDeletePost) return;
    const target = pendingDeletePost;
    setPendingDeletePost(null);

    if (hasActiveOrdersForPost(target.id)) {
      showToast(
        lang === 'zh'
          ? '⚠️ 已有進行中或待審核的訂單，不可刪除任務。'
          : '⚠️ Cannot delete a task while active orders exist.'
      );
      return;
    }

    if (isFirebaseVerified && firebaseUser) {
      try {
        await deleteDoc(doc(db, 'tasks', target.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tasks/${target.id}`);
        return;
      }
    } else {
      setLocalPosts((prev) => prev.filter((p) => p.id !== target.id));
    }

    if (selectedDetailPostId === target.id) {
      setSelectedDetailPostId(null);
    }
    showToast(lang === 'zh' ? '🗑️ 已刪除任務！' : '🗑️ Task deleted!');
  };

  // Claim / Apply for Post: sets initial order status to `pending_approval`
  const handleApplyAcceptPost = async (
    postId: string
  ): Promise<{ success: boolean; message: string; order?: OrderItem }> => {
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return { success: false, message: lang === 'zh' ? '找不到此任務。' : 'Task not found.' };
    }

    if (post.creatorId === currentUser.id) {
      return {
        success: false,
        message: lang === 'zh' ? '不能接自己發布的任務。' : 'Cannot claim your own task.',
      };
    }

    const isFemaleDormTask = Boolean(
      post.isFemaleDormOnly || isFemaleDormLocationName(post.locationName)
    );
    if (isFemaleDormTask && currentUser.biologicalSex !== 'female') {
      return {
        success: false,
        message:
          lang === 'zh'
            ? '此為女宿專屬實名任務，僅限生理女性帳號接單。'
            : 'Female dorm task: only biological female accounts can apply.',
      };
    }

    // Reuse existing non-cancelled order if this exact student already claimed it
    const existingOrder = orders.find(
      (o) =>
        o.taskId === postId &&
        o.accepterUid === currentUser.id &&
        o.status !== 'cancelled'
    );
    if (existingOrder) {
      return {
        success: true,
        message: lang === 'zh' ? '已為您開啟專屬 1-on-1 聊天室！' : 'Opened existing order chat!',
        order: existingOrder,
      };
    }

    const currentRemaining = post.remainingQuota ?? 1;
    if (currentRemaining <= 0 || post.status !== 'open') {
      return {
        success: false,
        message: lang === 'zh' ? '此項目名額已額滿或結束！' : 'Sold out or closed!',
      };
    }

    const myNick = (currentUser.nickname || currentUser.name).slice(0, 64);
    const myReal = (currentUser.realName || myNick).slice(0, 64);
    const paymentMethod = normalizeFirestorePaymentMethod(
      post.rewardAmount === 0 ? 'free_aid' : post.paymentMethod
    );
    const paymentDirection = normalizePaymentDirection(
      post.rewardAmount,
      post.paymentDirection,
      post.payerRole
    );

    if (isFirebaseVerified && firebaseUser) {
      try {
        // 1. Atomically decrement remainingQuantity on parent task; close ONLY when reaching 0
        await runTransaction(db, async (tx) => {
          const taskRef = doc(db, 'tasks', post.id);
          const taskSnap = await tx.get(taskRef);
          if (!taskSnap.exists()) {
            throw new Error('TASK_NOT_FOUND');
          }
          const d = taskSnap.data();
          if (d.status !== 'open') {
            throw new Error('TASK_NOT_OPEN');
          }
          const liveRemaining =
            typeof d.remainingQuantity === 'number'
              ? d.remainingQuantity
              : typeof d.quantity === 'number'
                ? d.quantity
                : 1;
          if (liveRemaining <= 0) {
            throw new Error('SOLD_OUT');
          }
          const nextRemaining = Math.max(0, liveRemaining - 1);
          const taskUpdate: Record<string, unknown> = {
            quantity: nextRemaining,
            remainingQuantity: nextRemaining,
            updatedAt: serverTimestamp(),
          };
          if (nextRemaining === 0) {
            taskUpdate.status = 'closed';
          }
          tx.update(taskRef, taskUpdate);
        });

        // 2. Create independent child Order in `pending_approval`
        const orderPayload: Record<string, unknown> = {
          taskId: post.id,
          taskCategory: post.category,
          taskTitle: post.title.slice(0, 160),
          taskLocation: post.locationName.slice(0, 100),
          taskPrice: post.rewardAmount,
          paymentMethod,
          paymentDirection,
          isFemaleDormOnly: isFemaleDormTask,
          creatorUid: post.creatorId,
          creatorName: post.creatorName.slice(0, 64),
          creatorAnonymous: isFemaleDormTask ? false : Boolean(post.isCreatorAnonymous),
          accepterUid: firebaseUser.uid,
          accepterName: myNick,
          accepterAnonymous: isFemaleDormTask ? false : true,
          status: 'pending_approval',
          creatorPaidConfirmed: false,
          accepterPaidConfirmed: false,
          creatorDoneConfirmed: false,
          accepterDoneConfirmed: false,
          revealCreator: isFemaleDormTask,
          revealAccepter: isFemaleDormTask,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (isFemaleDormTask) {
          orderPayload.creatorRealName = (post.creatorRealName || post.creatorName).slice(0, 64);
          orderPayload.accepterRealName = myReal;
        }
        if (post.titleEn) orderPayload.taskTitleEn = post.titleEn.slice(0, 160);
        if (post.locationNameEn) orderPayload.taskLocationEn = post.locationNameEn.slice(0, 100);
        if (post.paymentNote) orderPayload.paymentNote = post.paymentNote.slice(0, 200);
        if (paymentDirection !== 'free') {
          orderPayload.payerRole = paymentDirection === 'creator_pays' ? 'creator' : 'fulfiller';
        }
        if (post.expireAtMs) orderPayload.taskExpireAt = post.expireAtMs;

        const orderRef = await addDoc(collection(db, 'orders'), orderPayload);

        // 3. Initial claim message
        await addDoc(collection(db, 'orders', orderRef.id, 'messages'), {
          text: isFemaleDormTask
            ? '［接單通知］我已實名申請接單，請雙方確認資料後點擊確認接單！'
            : '［接單通知］我已申請接單，請先於聊天室解除匿名並檢視資料後確認接單！',
          senderUid: firebaseUser.uid,
          senderName: myNick,
          createdAt: serverTimestamp(),
        });

        const createdOrder: OrderItem = {
          id: orderRef.id,
          taskId: post.id,
          taskCategory: post.category,
          taskTitle: post.title,
          taskTitleEn: post.titleEn,
          taskLocation: post.locationName,
          taskLocationEn: post.locationNameEn,
          taskPrice: post.rewardAmount,
          paymentMethod,
          paymentDirection,
          paymentNote: post.paymentNote,
          payerRole:
            paymentDirection === 'creator_pays'
              ? 'creator'
              : paymentDirection === 'accepter_pays'
                ? 'fulfiller'
                : undefined,
          taskExpireAt: post.expireAtMs,
          isFemaleDormOnly: isFemaleDormTask,
          creatorUid: post.creatorId,
          creatorName: post.creatorName,
          creatorRealName: isFemaleDormTask ? post.creatorRealName || post.creatorName : undefined,
          creatorAnonymous: isFemaleDormTask ? false : Boolean(post.isCreatorAnonymous),
          accepterUid: firebaseUser.uid,
          accepterName: myNick,
          accepterRealName: isFemaleDormTask ? myReal : undefined,
          accepterAnonymous: isFemaleDormTask ? false : true,
          status: 'pending_approval',
          creatorPaidConfirmed: false,
          accepterPaidConfirmed: false,
          creatorDoneConfirmed: false,
          accepterDoneConfirmed: false,
          revealCreator: isFemaleDormTask,
          revealAccepter: isFemaleDormTask,
          createdAtMs: Date.now(),
          updatedAtMs: Date.now(),
        };

        return {
          success: true,
          message:
            lang === 'zh'
              ? '✅ 已送出接單申請並建立 1-on-1 聊天室！'
              : '✅ Application sent & 1-on-1 chat opened!',
          order: createdOrder,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        if (msg === 'SOLD_OUT' || msg === 'TASK_NOT_OPEN') {
          return {
            success: false,
            message: lang === 'zh' ? '手慢了一步，此項目名額已領完！' : 'All spots claimed!',
          };
        }
        handleFirestoreError(error, OperationType.CREATE, 'orders');
        return {
          success: false,
          message: lang === 'zh' ? '建立訂單失敗，請稍後再試。' : 'Failed to create order.',
        };
      }
    }

    // Dev demo fallback
    const nextQuota = Math.max(0, currentRemaining - 1);
    setLocalPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              remainingQuota: nextQuota,
              status: nextQuota === 0 ? 'closed' : 'open',
            }
          : p
      )
    );

    const demoOrderId = `order_${Date.now()}`;
    const demoOrder: OrderItem = {
      id: demoOrderId,
      taskId: post.id,
      taskCategory: post.category,
      taskTitle: post.title,
      taskTitleEn: post.titleEn,
      taskLocation: post.locationName,
      taskLocationEn: post.locationNameEn,
      taskPrice: post.rewardAmount,
      paymentMethod,
      paymentDirection,
      paymentNote: post.paymentNote,
      payerRole:
        paymentDirection === 'creator_pays'
          ? 'creator'
          : paymentDirection === 'accepter_pays'
            ? 'fulfiller'
            : undefined,
      taskExpireAt: post.expireAtMs,
      isFemaleDormOnly: isFemaleDormTask,
      creatorUid: post.creatorId,
      creatorName: post.creatorName,
      creatorRealName: isFemaleDormTask ? post.creatorRealName || post.creatorName : undefined,
      creatorAnonymous: isFemaleDormTask ? false : Boolean(post.isCreatorAnonymous),
      accepterUid: currentUser.id,
      accepterName: myNick,
      accepterRealName: isFemaleDormTask ? myReal : undefined,
      accepterAnonymous: isFemaleDormTask ? false : true,
      status: 'pending_approval',
      creatorPaidConfirmed: false,
      accepterPaidConfirmed: false,
      creatorDoneConfirmed: false,
      accepterDoneConfirmed: false,
      revealCreator: isFemaleDormTask,
      revealAccepter: isFemaleDormTask,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
    setLocalOrders((prev) => [demoOrder, ...prev]);
    setLocalOrderMessagesMap((prev) => ({
      ...prev,
      [demoOrderId]: [
        {
          id: `msg_${Date.now()}`,
          text: isFemaleDormTask
            ? '［接單通知］我已實名申請接單，請雙方確認資料後點擊確認接單！'
            : '［接單通知］我已申請接單，請先於聊天室解除匿名並檢視資料後確認接單！',
          senderUid: currentUser.id,
          senderName: myNick,
          createdAtMs: Date.now(),
          timestampText: new Date().toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ],
    }));

    return {
      success: true,
      message:
        lang === 'zh'
          ? '✅ 已送出接單申請並建立專屬 1-on-1 聊天室！'
          : '✅ Application sent & 1-on-1 chat opened!',
      order: demoOrder,
    };
  };

  // Creator declines applicant -> cancel order + restore +1 spot & reopen task
  const handleDeclineOrder = async (order: OrderItem) => {
    if (order.creatorUid !== currentUser.id) return;

    if (isFirebaseVerified && firebaseUser) {
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, 'orders', order.id, 'messages'), {
          text: '［系統通知］發布者已婉拒此申請，任務名額已重新釋出。',
          senderUid: firebaseUser.uid,
          senderName: currentUser.nickname || currentUser.name,
          createdAt: serverTimestamp(),
        });

        await runTransaction(db, async (tx) => {
          const taskRef = doc(db, 'tasks', order.taskId);
          const taskSnap = await tx.get(taskRef);
          if (!taskSnap.exists()) return;
          const d = taskSnap.data();
          if (d.status === 'completed' || d.status === 'cancelled') return;
          const maxQuota = typeof d.totalQuota === 'number' ? d.totalQuota : 20;
          const curQty =
            typeof d.remainingQuantity === 'number'
              ? d.remainingQuantity
              : typeof d.quantity === 'number'
                ? d.quantity
                : 0;
          const nextQty = Math.min(maxQuota, curQty + 1);
          tx.update(taskRef, {
            quantity: nextQty,
            remainingQuantity: nextQty,
            status: d.status === 'closed' ? 'open' : d.status,
            updatedAt: serverTimestamp(),
          });
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
        return;
      }
    } else {
      handleLocalUpdateOrder(order.id, { status: 'cancelled' });
      handleLocalSendMessage(
        order.id,
        '［系統通知］發布者已婉拒此申請，任務名額已重新釋出。'
      );
      setLocalPosts((prev) =>
        prev.map((p) => {
          if (p.id !== order.taskId) return p;
          const maxQ = p.totalQuota ?? 1;
          const nextQ = Math.min(maxQ, (p.remainingQuota ?? 0) + 1);
          return {
            ...p,
            remainingQuota: nextQ,
            status: p.status === 'closed' ? 'open' : p.status,
          };
        })
      );
    }

    showToast(
      lang === 'zh'
        ? '已婉拒此接單申請，任務名額已重新釋出至大廳。'
        : 'Application declined and task spot released.'
    );
  };

  // Dev demo fallback local message & order update
  const handleLocalSendMessage = (orderId: string, text: string) => {
    const newMsg: OrderMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      senderUid: currentUser.id,
      senderName: currentUser.nickname || currentUser.name,
      createdAtMs: Date.now(),
      timestampText: new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setLocalOrderMessagesMap((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), newMsg],
    }));
  };

  const handleLocalUpdateOrder = (orderId: string, patch: Partial<OrderItem>) => {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...patch, updatedAtMs: Date.now() } : o))
    );
  };

  // Post-Completion Mutual Rating & Review Submission
  const handleSubmitReview = async ({
    order,
    rating,
    tags,
    comment,
  }: {
    order: OrderItem;
    rating: number;
    tags: string[];
    comment: string;
  }) => {
    const isCreator = currentUser.id === order.creatorUid;
    const revieweeUid = isCreator ? order.accepterUid : order.creatorUid;
    const category = order.taskCategory || 'marketplace';
    const scoreDelta = calculateScoreDelta(rating, category, order.paymentDirection);
    const myNick = (currentUser.nickname || currentUser.name).slice(0, 64);
    const reviewId = `${order.id}_${currentUser.id}`;

    if (isFirebaseVerified && firebaseUser) {
      const payload: Record<string, unknown> = {
        orderId: order.id,
        taskId: order.taskId,
        taskTitle: order.taskTitle.slice(0, 160),
        taskCategory: category,
        reviewerUid: firebaseUser.uid,
        reviewerName: myNick,
        revieweeUid,
        rating,
        tags: tags.slice(0, 6),
        comment: comment.slice(0, 500),
        scoreDelta,
        createdAt: serverTimestamp(),
      };
      if (order.paymentDirection) {
        payload.paymentDirection = order.paymentDirection;
      }

      try {
        await setDoc(doc(db, 'reviews', reviewId), payload);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `reviews/${reviewId}`);
        return;
      }
    } else {
      const demoReview: ReviewItem = {
        id: reviewId,
        orderId: order.id,
        taskId: order.taskId,
        taskTitle: order.taskTitle,
        taskCategory: category,
        paymentDirection: order.paymentDirection,
        reviewerUid: currentUser.id,
        reviewerName: myNick,
        revieweeUid,
        rating,
        tags: tags.slice(0, 6),
        comment: comment.slice(0, 500),
        scoreDelta,
        createdAtMs: Date.now(),
      };
      setLocalReviews((prev) => [demoReview, ...prev.filter((r) => r.id !== reviewId)]);
    }

    showToast(
      lang === 'zh'
        ? `⭐ 感謝留下 ${rating} 顆星互助評價！`
        : `⭐ Thank you for your ${rating}-star review!`
    );
  };

  // Structured Report Submission (always enters `pending_review`; NO unverified deduction)
  const handleSubmitReport = async ({
    order,
    post,
    category,
    description,
    evidenceUrl,
  }: {
    order?: OrderItem | null;
    post?: PostItem | null;
    category: DisputeCategory;
    description: string;
    evidenceUrl?: string;
  }) => {
    const cleanDesc = description.trim().slice(0, 1000) || '校園安全舉報提交';
    const taskId = order?.taskId || post?.id || '';
    if (!taskId) return;

    const taskTitle = (order?.taskTitle || post?.title || '').slice(0, 160);
    const reportedUid = order
      ? order.creatorUid === currentUser.id
        ? order.accepterUid
        : order.creatorUid
      : post?.creatorId;
    const reportedName = order
      ? order.creatorUid === currentUser.id
        ? order.accepterName
        : order.creatorName
      : post?.creatorName;

    if (isFirebaseVerified && firebaseUser) {
      try {
        const reportPayload: Record<string, unknown> = {
          taskId,
          reporterUid: firebaseUser.uid,
          reporterEmail: (firebaseUser.email || currentUser.nccuEmail).slice(0, 128),
          reasonCategory: category,
          description: cleanDesc,
          status: 'pending_review',
          createdAt: serverTimestamp(),
        };
        if (taskTitle) reportPayload.taskTitle = taskTitle;
        if (order?.id) reportPayload.orderId = order.id;
        if (reportedUid && /^[a-zA-Z0-9_\-]+$/.test(reportedUid)) {
          reportPayload.reportedUid = reportedUid;
        }
        if (reportedName) reportPayload.reportedName = reportedName.slice(0, 64);
        if (evidenceUrl && evidenceUrl.length <= 250000) {
          reportPayload.evidenceUrl = evidenceUrl;
        }

        await addDoc(collection(db, 'reports'), reportPayload);

        if (order) {
          await updateDoc(doc(db, 'orders', order.id), {
            status: 'disputed',
            disputeReason: `${category}: ${cleanDesc}`.slice(0, 1000),
            disputedByUid: firebaseUser.uid,
            updatedAt: serverTimestamp(),
          });

          await addDoc(collection(db, 'orders', order.id, 'messages'), {
            text: `⚠️ 已提交舉報申訴（${category}）：${cleanDesc}`,
            senderUid: firebaseUser.uid,
            senderName: currentUser.nickname || currentUser.name,
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'reports');
      }
    } else {
      const localRep: ReportItem = {
        id: `rep_${Date.now()}`,
        orderId: order?.id,
        taskId,
        taskTitle,
        reporterId: currentUser.id,
        reporterEmail: currentUser.nccuEmail,
        reportedUserId: reportedUid,
        reportedUserName: reportedName,
        reasonCategory: category,
        description: cleanDesc,
        evidenceUrl,
        status: 'pending_review',
        createdAt: new Date().toLocaleDateString('zh-TW'),
        createdAtMs: Date.now(),
      };
      setLocalReports((prev) => [localRep, ...prev]);

      if (order) {
        handleLocalUpdateOrder(order.id, {
          status: 'disputed',
          disputeReason: `${category}: ${cleanDesc}`,
          disputedByUid: currentUser.id,
        });
        handleLocalSendMessage(order.id, `⚠️ 已提交舉報申訴（${category}）：${cleanDesc}`);
      }
    }

    showToast(
      lang === 'zh'
        ? '⚠️ 舉報已送出並進入「待審核」，管理員將依截圖與對話紀錄裁決！'
        : '⚠️ Report submitted for admin review!'
    );
  };

  // Admin Console Decision Handler
  const handleAdminDecideReport = async (
    report: ReportItem,
    decision: 'dismissed' | 'confirmed_violation',
    aiSummary: string,
    adminNote: string
  ) => {
    if (!isAdminUser) return;

    if (isFirebaseVerified && firebaseUser) {
      try {
        await updateDoc(doc(db, 'reports', report.id), {
          status: decision,
          aiSummary: aiSummary.slice(0, 1000),
          adminNote: adminNote.slice(0, 500),
          reviewedBy: (firebaseUser.email || currentUser.nccuEmail).slice(0, 128),
          reviewedAtMs: Date.now(),
        });

        if (
          decision === 'confirmed_violation' &&
          report.reportedUserId &&
          /^[a-zA-Z0-9_\-]+$/.test(report.reportedUserId)
        ) {
          const targetUserRef = doc(db, 'users', report.reportedUserId);
          const targetSnap = await getDoc(targetUserRef).catch(() => null);
          if (targetSnap && targetSnap.exists()) {
            const currentScore =
              typeof targetSnap.data().trustScore === 'number'
                ? targetSnap.data().trustScore
                : 90;
            const nextScore = Math.max(0, currentScore - 10);
            await updateDoc(targetUserRef, {
              trustScore: nextScore,
              updatedAt: serverTimestamp(),
            }).catch(() => undefined);

            const pubRef = doc(db, 'public_profiles', report.reportedUserId);
            const pubSnap = await getDoc(pubRef).catch(() => null);
            if (pubSnap && pubSnap.exists()) {
              await updateDoc(pubRef, {
                trustScore: nextScore,
                updatedAt: serverTimestamp(),
              }).catch(() => undefined);
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `reports/${report.id}`);
        return;
      }
    } else {
      setLocalReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                status: decision,
                aiSummary,
                adminNote,
                reviewedBy: currentUser.nccuEmail,
                reviewedAtMs: Date.now(),
              }
            : r
        )
      );
    }

    showToast(
      decision === 'confirmed_violation'
        ? lang === 'zh'
          ? '✅ 已確認違規並扣除被檢舉者 10 分信任指數。'
          : '✅ Violation confirmed (-10 trust pts).'
        : lang === 'zh'
          ? '✅ 已駁回該筆檢舉（不扣分）。'
          : '✅ Report dismissed.'
    );
  };

  // Campus Location update from FeedView
  const handleUpdateLocation = (coords: Coordinates, areaLabel: string, zone: CampusZone) => {
    setCurrentZone(zone);
    setCurrentUser((prev) => ({
      ...prev,
      currentCoordinates: coords,
      zone,
    }));
    showToast(
      lang === 'zh' ? `📍 已更新目前位置：${areaLabel}` : `📍 Location updated: ${areaLabel}`
    );
  };

  // Quick Task Management (ProfileView): +NT$10 Boost
  const handleAddReward = async (postId: string, delta: number) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const nextReward = post.rewardAmount + delta;
    const nextMethod =
      post.paymentMethod === 'free_aid'
        ? 'cash_meetup'
        : normalizeFirestorePaymentMethod(post.paymentMethod);

    if (isFirebaseVerified && firebaseUser) {
      try {
        await updateDoc(doc(db, 'tasks', postId), {
          price: nextReward,
          paymentMethod: nextMethod,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${postId}`);
      }
    } else {
      setLocalPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                rewardAmount: nextReward,
                escrowDeposit: nextReward,
                paymentMethod: nextMethod,
                payerRole: p.payerRole || 'fulfiller',
              }
            : p
        )
      );
    }

    showToast(
      lang === 'zh'
        ? `💰 已加價 +NT$${delta}！大廳卡片金額已即時更新。`
        : `💰 Boosted reward by +NT$${delta}!`
    );
  };

  // Quick Task Management (ProfileView): +30m Extend
  const handleExtendTime = async (postId: string, minutes: number) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const currentMins = post.remainingMinutes !== undefined ? post.remainingMinutes : 60;
    const nextMins = Math.min(10080, currentMins + minutes);
    const baseMs = post.expireAtMs && post.expireAtMs > Date.now() ? post.expireAtMs : Date.now();
    const nextExpireAt = baseMs + minutes * 60000;

    if (isFirebaseVerified && firebaseUser) {
      try {
        await updateDoc(doc(db, 'tasks', postId), {
          remainingMinutes: nextMins,
          expireAt: nextExpireAt,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${postId}`);
      }
    } else {
      setLocalPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                remainingMinutes: nextMins,
                expireAtMs: nextExpireAt,
                timeRemainingText: formatRemainingMinutes(nextMins, lang),
              }
            : p
        )
      );
    }

    showToast(
      lang === 'zh'
        ? `⏳ 已延長有效時間 +${minutes} 分鐘！`
        : `⏳ Extended duration by +${minutes}m!`
    );
  };

  // Quick Task Management (ProfileView): One-click Republish
  const handleRepublishPost = async (postId: string) => {
    const nextExpireAt = Date.now() + 120 * 60000;

    if (isFirebaseVerified && firebaseUser) {
      try {
        await updateDoc(doc(db, 'tasks', postId), {
          status: 'open',
          remainingMinutes: 120,
          expireAt: nextExpireAt,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${postId}`);
      }
    } else {
      setLocalPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                status: 'open',
                remainingMinutes: 120,
                expireAtMs: nextExpireAt,
                timeRemainingText: formatRemainingMinutes(120, lang),
                expiresAt: formatRemainingMinutes(120, lang),
                createdAt: '剛剛重新上架',
              }
            : p
        )
      );
    }

    showToast(
      lang === 'zh'
        ? '🔄 已一鍵重新上架！倒數計時重設為 2 小時並重新推流至大廳。'
        : '🔄 Republished to Feed with fresh 2h timer!'
    );
  };

  // Editable Profile Info handler
  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    const nextUser: UserProfile = {
      ...currentUser,
      ...updates,
    };
    setCurrentUser(nextUser);
    void syncUserToFirestore(nextUser);
    showToast(lang === 'zh' ? '✅ 個人資料已儲存並同步更新！' : '✅ Profile updated!');
  };

  // Free-text Tutoring / Skills handlers
  const handleAddTutorSkill = (rawSkill: string) => {
    const skill = rawSkill.trim();
    if (!skill) return;
    if (currentUser.canTutorSubjects.includes(skill)) {
      showToast(lang === 'zh' ? `「${skill}」已在專長列表中` : `"${skill}" already added.`);
      return;
    }
    const nextUser: UserProfile = {
      ...currentUser,
      canTutorSubjects: [...currentUser.canTutorSubjects, skill],
    };
    setCurrentUser(nextUser);
    void syncUserToFirestore(nextUser);
    showToast(lang === 'zh' ? `🎓 已新增專長 / 輔導項目：${skill}` : `🎓 Added skill: ${skill}`);
  };

  const handleRemoveTutorSkill = (skill: string) => {
    const nextUser: UserProfile = {
      ...currentUser,
      canTutorSubjects: currentUser.canTutorSubjects.filter((s) => s !== skill),
    };
    setCurrentUser(nextUser);
    void syncUserToFirestore(nextUser);
    showToast(lang === 'zh' ? `已移除項目：${skill}` : `Removed skill: ${skill}`);
  };

  // Editable Followed Tags handlers
  const handleAddFollowedTag = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (currentUser.subscribedTags.includes(formatted)) {
      showToast(lang === 'zh' ? `已追蹤 ${formatted}` : `Already following ${formatted}`);
      return;
    }
    const nextUser: UserProfile = {
      ...currentUser,
      subscribedTags: [...currentUser.subscribedTags, formatted],
    };
    setCurrentUser(nextUser);
    void syncUserToFirestore(nextUser);
    showToast(
      lang === 'zh'
        ? `🔔 已追蹤 ${formatted}！首頁「追蹤推薦」已即時同步更新。`
        : `🔔 Following ${formatted}! Feed recommendations synced.`
    );
  };

  const handleRemoveFollowedTag = (tag: string) => {
    const nextUser: UserProfile = {
      ...currentUser,
      subscribedTags: currentUser.subscribedTags.filter((t) => t !== tag),
    };
    setCurrentUser(nextUser);
    void syncUserToFirestore(nextUser);
    showToast(lang === 'zh' ? `已移除追蹤標籤 ${tag}` : `Unfollowed ${tag}`);
  };

  // Transcript verification success
  const handleTranscriptVerifiedSuccess = (_subjectCode: string, subjectName: string) => {
    const nextSubjects = currentUser.canTutorSubjects.includes(subjectName)
      ? currentUser.canTutorSubjects
      : [...currentUser.canTutorSubjects, subjectName];
    const nextUser: UserProfile = {
      ...currentUser,
      canTutorSubjects: nextSubjects,
    };
    setCurrentUser(nextUser);
    void syncUserToFirestore(nextUser);
    setIsTranscriptModalOpen(false);
    showToast(`🎓 修課證明截圖已核對：已新增「${subjectName}」專長認證！`);
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    try {
      window.localStorage.removeItem(STORAGE_KEYS.ONBOARDED);
      window.localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {
      // ignore
    }
    setFirebaseUser(null);
    setUserDocExists(false);
    setActiveChatOrderId(null);
    setSelectedDetailPostId(null);
    setCurrentNavTab('feed');
    setIsOnboarded(false);
    showToast(
      lang === 'zh'
        ? '已登出帳號，請重新進行政大 Google 帳號驗證。'
        : 'Logged out. Please verify with your NCCU Google account.'
    );
  };

  // Derived live objects for modals
  const selectedDetailPost = selectedDetailPostId
    ? posts.find((p) => p.id === selectedDetailPostId) || null
    : null;

  const existingOrderForDetail = useMemo(() => {
    if (!selectedDetailPost) return null;
    return (
      orders.find(
        (o) =>
          o.taskId === selectedDetailPost.id &&
          (o.creatorUid === currentUser.id || o.accepterUid === currentUser.id) &&
          o.status !== 'cancelled'
      ) || null
    );
  }, [selectedDetailPost, orders, currentUser.id]);

  const activeChatOrder = activeChatOrderId
    ? orders.find((o) => o.id === activeChatOrderId) || null
    : null;

  const existingReviewForActiveOrder = useMemo(() => {
    if (!activeChatOrder) return null;
    return givenReviews.find((r) => r.orderId === activeChatOrder.id) || null;
  }, [activeChatOrder, givenReviews]);

  const myPosts = posts.filter((p) => p.creatorId === currentUser.id);

  // Flash / Urgent active count (respects female-dorm isolation)
  const flashCount = posts.filter((p) => {
    const isFemaleDormTask = Boolean(
      p.isFemaleDormOnly || isFemaleDormLocationName(p.locationName)
    );
    if (isFemaleDormTask && currentUser.biologicalSex !== 'female' && p.creatorId !== currentUser.id) {
      return false;
    }
    const isDelisted =
      p.status === 'expired' ||
      p.status === 'completed' ||
      p.status === 'closed' ||
      p.status === 'refunded' ||
      p.status === 'cancelled' ||
      (p.remainingQuota !== undefined && p.remainingQuota <= 0);
    return !isDelisted && (p.category === 'leftovers' || p.category === 'emergency');
  }).length;

  // Active chats count from live orders
  const activeChatsCount = orders.filter(
    (o) =>
      (o.creatorUid === currentUser.id || o.accepterUid === currentUser.id) &&
      o.status !== 'completed' &&
      o.status !== 'cancelled'
  ).length;

  const pendingReportsCount = adminReports.filter(
    (r) =>
      r.status === 'pending_review' ||
      r.status === 'submitted' ||
      r.status === 'frozen_escrow'
  ).length;

  // Mandatory Onboarding Gate
  if (!isOnboarded) {
    return (
      <div className="relative">
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs flex items-center gap-2 max-w-sm w-full mx-4 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}
        <OnboardingGate
          onComplete={(profileData) => {
            const baseUser = DEMO_USERS[0];
            const updatedNick = profileData.nickname || profileData.name || baseUser.nickname;
            const updatedReal = profileData.realName || updatedNick;
            const fbUid = auth.currentUser?.uid;
            const fbEmail = auth.currentUser?.email || profileData.nccuEmail;
            const bioSex: BiologicalSex =
              profileData.biologicalSex === 'male' || profileData.biologicalSex === 'female'
                ? profileData.biologicalSex
                : 'female';
            const nextUser: UserProfile = {
              ...baseUser,
              ...profileData,
              id: fbUid || profileData.id || baseUser.id,
              nccuEmail: fbEmail || baseUser.nccuEmail,
              name: updatedNick,
              nickname: updatedNick,
              realName: updatedReal,
              biologicalSex: bioSex,
              gender: bioSex,
              trustScore: 90,
              helpCount: 0,
              completedTasks: 0,
              avatar: profileData.avatar || baseUser.avatar,
              isVerifiedStudent: true,
            };
            setCurrentUser(nextUser);
            setIsOnboarded(true);
            void syncUserToFirestore(nextUser);
            showToast(
              lang === 'zh'
                ? '🎉 政大 Google 帳號驗證完成！歡迎進入 NCCU Loop 政大圈圈。'
                : '🎉 NCCU Google account verified! Welcome to NCCU Loop.'
            );
          }}
          onQuickDemoLogin={
            isDemoEnabled
              ? () => {
                  setCurrentUser(DEMO_USERS[0]);
                  setIsOnboarded(true);
                  showToast(
                    lang === 'zh'
                      ? '⚡ 已以測試帳號（政大巧芸）快速登入'
                      : '⚡ Dev quick demo login'
                  );
                }
              : undefined
          }
          lang={lang}
          onToggleLang={handleToggleLang}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Toast notification banner */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs flex items-center gap-2 max-w-sm w-full mx-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Minimalist Top App Header */}
      <AppHeader
        currentZone={currentZone}
        onZoneChange={(zone) => {
          setCurrentZone(zone);
          showToast(
            lang === 'zh'
              ? `已切換至：${zone === 'downhill' ? '山下校區' : '山上校區'}`
              : `Switched to: ${zone === 'downhill' ? 'Downhill Campus' : 'Uphill Campus'}`
          );
        }}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4">
        {currentNavTab === 'feed' && (
          <FeedView
            posts={posts}
            currentUser={currentUser}
            onSelectPost={(post) => setSelectedDetailPostId(post.id)}
            onOpenCreatePost={() => {
              setEditingPost(null);
              setIsCreateModalOpen(true);
            }}
            onOpenOnboarding={() => setCurrentNavTab('profile')}
            onUpdateLocation={handleUpdateLocation}
            mode="feed"
            lang={lang}
          />
        )}

        {currentNavTab === 'flash' && (
          <FeedView
            posts={posts}
            currentUser={currentUser}
            onSelectPost={(post) => setSelectedDetailPostId(post.id)}
            onOpenCreatePost={() => {
              setEditingPost(null);
              setIsCreateModalOpen(true);
            }}
            onOpenOnboarding={() => setCurrentNavTab('profile')}
            onUpdateLocation={handleUpdateLocation}
            mode="flash"
            lang={lang}
          />
        )}

        {currentNavTab === 'chats' && (
          <ChatsView
            orders={orders}
            currentUser={currentUser}
            onOpenOrderChat={(order) => setActiveChatOrderId(order.id)}
            lang={lang}
          />
        )}

        {currentNavTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            myPosts={myPosts}
            receivedReviews={receivedReviews}
            isAdmin={isAdminUser}
            pendingReportsCount={pendingReportsCount}
            onOpenAdminReview={() => setIsAdminModalOpen(true)}
            onUpdateProfile={handleUpdateProfile}
            onAddTutorSkill={handleAddTutorSkill}
            onRemoveTutorSkill={handleRemoveTutorSkill}
            onAddFollowedTag={handleAddFollowedTag}
            onRemoveFollowedTag={handleRemoveFollowedTag}
            onAddReward={(id, delta) => {
              void handleAddReward(id, delta);
            }}
            onExtendTime={(id, mins) => {
              void handleExtendTime(id, mins);
            }}
            onRepublishPost={(id) => {
              void handleRepublishPost(id);
            }}
            onSelectPost={(post) => setSelectedDetailPostId(post.id)}
            onEditPost={(post) => {
              setEditingPost(post);
              setIsCreateModalOpen(true);
            }}
            onDeletePost={handleRequestDeletePost}
            onOpenTranscriptVerify={() => setIsTranscriptModalOpen(true)}
            onLogout={handleLogout}
            lang={lang}
          />
        )}
      </main>

      {/* Symmetric 5-Tab Bottom Navigation Bar */}
      <BottomNavigation
        activeTab={currentNavTab}
        onChangeTab={(tab) => {
          if (tab === 'post') {
            setEditingPost(null);
            setIsCreateModalOpen(true);
          } else {
            setCurrentNavTab(tab);
          }
        }}
        onOpenCreatePost={() => {
          setEditingPost(null);
          setIsCreateModalOpen(true);
        }}
        activeChatsCount={activeChatsCount}
        flashCount={flashCount}
        lang={lang}
      />

      {/* Task Detail Modal */}
      {selectedDetailPost && (
        <TaskDetailModal
          isOpen={Boolean(selectedDetailPost)}
          onClose={() => setSelectedDetailPostId(null)}
          post={selectedDetailPost}
          currentUser={currentUser}
          existingOrder={existingOrderForDetail}
          onApplyAcceptPost={async (id) => {
            const res = await handleApplyAcceptPost(id);
            showToast(res.message);
            return res;
          }}
          onOpenOrderChat={(order) => {
            setActiveChatOrderId(order.id);
          }}
          onReportPost={(post) => {
            setActiveDisputeTarget({ post });
          }}
          onEditPost={(post) => {
            setEditingPost(post);
            setIsCreateModalOpen(true);
          }}
          onDeletePost={handleRequestDeletePost}
          lang={lang}
        />
      )}

      {/* 1-on-1 Real-time Chat Room Modal */}
      {activeChatOrder && (
        <ChatRoomModal
          isOpen={Boolean(activeChatOrder)}
          onClose={() => setActiveChatOrderId(null)}
          order={activeChatOrder}
          currentUser={currentUser}
          useFirestoreRealtime={isFirebaseVerified}
          existingReview={existingReviewForActiveOrder}
          localMessages={localOrderMessagesMap[activeChatOrder.id] || []}
          localReviews={isFirebaseVerified ? [] : localReviews}
          onLocalSendMessage={handleLocalSendMessage}
          onLocalUpdateOrder={handleLocalUpdateOrder}
          onDeclineOrder={handleDeclineOrder}
          onSubmitReview={handleSubmitReview}
          onOpenDispute={(ord) => {
            setActiveChatOrderId(null);
            setActiveDisputeTarget({ order: ord });
          }}
          onShowToast={showToast}
          lang={lang}
        />
      )}

      {/* Structured Report & Dispute Modal */}
      {activeDisputeTarget && (
        <ReportDisputeModal
          isOpen={Boolean(activeDisputeTarget)}
          onClose={() => setActiveDisputeTarget(null)}
          order={activeDisputeTarget.order}
          post={activeDisputeTarget.post}
          currentUser={currentUser}
          onSubmitReport={handleSubmitReport}
          lang={lang}
        />
      )}

      {/* Task Create / Edit Modal */}
      <PostCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPost(null);
        }}
        currentUser={currentUser}
        editingPost={editingPost}
        hasActiveOrders={editingPost ? hasActiveOrdersForPost(editingPost.id) : false}
        onCreatePost={(data) => {
          void handleCreatePost(data);
        }}
        onUpdatePost={handleUpdatePost}
        lang={lang}
      />

      {/* In-App Task Delete Confirmation Dialog */}
      {pendingDeletePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'zh' ? '確認刪除此任務？' : 'Delete This Task?'}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {lang === 'zh'
                    ? `確定要刪除「${pendingDeletePost.title}」嗎？刪除後將從大廳下架且無法復原。`
                    : `Delete "${pendingDeletePost.title}"? This action removes it from the campus feed permanently.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeletePost(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeletePost()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '確認刪除' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Report Review Console Modal */}
      {isAdminUser && (
        <AdminReviewModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          reports={adminReports}
          useFirestoreRealtime={isFirebaseVerified}
          localOrderMessagesMap={localOrderMessagesMap}
          onDecideReport={handleAdminDecideReport}
          lang={lang}
        />
      )}

      {/* Transcript Verification Modal */}
      <TranscriptVerifyModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        currentUser={currentUser}
        onVerifiedSuccess={handleTranscriptVerifiedSuccess}
      />
    </div>
  );
}
