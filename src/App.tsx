import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  UserProfile,
  PostItem,
  OrderItem,
  OrderMessage,
  CampusZone,
  DisputeCategory,
  Language,
  PaymentMethod,
  PostCategory,
  TimeOption,
  PostStatus,
} from './types';
import { DEMO_USERS, INITIAL_POSTS } from './data/mockData';
import { formatRemainingMinutes } from './utils/formatters';
import { AppHeader } from './components/AppHeader';
import { BottomNavigation, AppNavTab } from './components/BottomNavigation';
import { FeedView } from './components/FeedView';
import { ChatsView } from './components/ChatsView';
import { ProfileView } from './components/ProfileView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TechSpecModal } from './components/TechSpecModal';
import { PostCreateModal } from './components/PostCreateModal';
import { TranscriptVerifyModal } from './components/TranscriptVerifyModal';
import { ChatRoomModal } from './components/ChatRoomModal';
import { ReportDisputeModal } from './components/ReportDisputeModal';
import { OnboardingGate } from './components/OnboardingGate';
import { CheckCircle2 } from 'lucide-react';

const STORAGE_KEYS = {
  ONBOARDED: 'nccu_loop_onboarded_v1',
  USER: 'nccu_loop_user_v1',
  POSTS: 'nccu_loop_posts_v1',
  ORDERS: 'nccu_loop_orders_v1',
  ORDER_MSGS: 'nccu_loop_order_msgs_v1',
  LANG: 'nccu_loop_lang_v1',
};

const isDemoEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true';

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

function formatRelativeCreatedAt(ms: number | undefined, lang: Language): string {
  if (!ms) return lang === 'zh' ? '剛剛' : 'Just now';
  const diffMin = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (diffMin < 1) return lang === 'zh' ? '剛剛' : 'Just now';
  if (diffMin < 60) return lang === 'zh' ? `${diffMin} 分鐘前` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === 'zh' ? `${diffHr} 小時前` : `${diffHr}h ago`;
  return new Date(ms).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

function mapTaskDocToPostItem(docSnap: QueryDocumentSnapshot<DocumentData>, lang: Language): PostItem {
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

  const hasQuantity = typeof d.quantity === 'number';
  const totalQuota =
    typeof d.totalQuota === 'number' ? d.totalQuota : hasQuantity ? Math.max(1, d.quantity) : undefined;

  return {
    id: docSnap.id,
    creatorId: String(d.creatorUid || ''),
    creatorName: String(d.creatorName || '政大同學'),
    creatorTrustScore: typeof d.creatorTrustScore === 'number' ? d.creatorTrustScore : 80,
    isCreatorAnonymous: Boolean(d.isAnonymous),
    creatorAnonAlias: d.isAnonymous ? `政大隱形同學 #${docSnap.id.slice(0, 4)}` : undefined,
    category: (d.category as PostCategory) || 'marketplace',
    title: String(d.title || '無標題任務'),
    titleEn: d.titleEn ? String(d.titleEn) : undefined,
    description: String(d.description || ''),
    descriptionEn: d.descriptionEn ? String(d.descriptionEn) : undefined,
    tags: Array.isArray(d.tags) ? d.tags.map(String) : ['#政大互助'],
    rewardAmount: typeof d.price === 'number' ? d.price : 0,
    escrowDeposit: typeof d.price === 'number' ? d.price : 0,
    paymentMethod: (d.paymentMethod as PaymentMethod) || 'free_aid',
    paymentNote: d.paymentNote ? String(d.paymentNote) : undefined,
    payerRole: d.payerRole === 'creator' || d.payerRole === 'fulfiller' ? d.payerRole : undefined,
    totalQuota,
    remainingQuota: hasQuantity ? d.quantity : undefined,
    timeOption: (d.timeOption as TimeOption) || '2h',
    remainingMinutes: minsLeft,
    timeRemainingText: formatRemainingMinutes(minsLeft, lang),
    status: (d.status as PostStatus) || 'open',
    locationName: String(d.location || '政大校園'),
    locationNameEn: String(d.location || 'NCCU Campus'),
    locationCoordinates: {
      lat: typeof d.locationLat === 'number' ? d.locationLat : 24.9863,
      lng: typeof d.locationLng === 'number' ? d.locationLng : 121.5754,
    },
    locationZone: (d.locationZone as CampusZone) || 'downhill',
    femaleOnlyRecommended: Boolean(d.femaleOnlyRecommended),
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

  return {
    id: docSnap.id,
    taskId: String(d.taskId || ''),
    taskTitle: String(d.taskTitle || ''),
    taskTitleEn: d.taskTitleEn ? String(d.taskTitleEn) : undefined,
    taskLocation: String(d.taskLocation || '政大校園'),
    taskLocationEn: d.taskLocationEn ? String(d.taskLocationEn) : undefined,
    taskPrice: typeof d.taskPrice === 'number' ? d.taskPrice : 0,
    paymentMethod: (d.paymentMethod as PaymentMethod) || 'cash_meetup',
    paymentNote: d.paymentNote ? String(d.paymentNote) : undefined,
    payerRole: d.payerRole === 'creator' || d.payerRole === 'fulfiller' ? d.payerRole : undefined,
    taskExpireAt: typeof d.taskExpireAt === 'number' ? d.taskExpireAt : undefined,
    creatorUid: String(d.creatorUid || ''),
    creatorName: String(d.creatorName || '政大同學'),
    creatorAnonymous: Boolean(d.creatorAnonymous),
    creatorAnonAlias: d.creatorAnonAlias ? String(d.creatorAnonAlias) : undefined,
    accepterUid: String(d.accepterUid || ''),
    accepterName: String(d.accepterName || '政大同學'),
    accepterAnonymous: Boolean(d.accepterAnonymous),
    accepterAnonAlias: d.accepterAnonAlias ? String(d.accepterAnonAlias) : undefined,
    status: (d.status as OrderItem['status']) || 'pending_confirm',
    creatorPaidConfirmed: Boolean(d.creatorPaidConfirmed),
    accepterPaidConfirmed: Boolean(d.accepterPaidConfirmed),
    creatorDoneConfirmed: Boolean(d.creatorDoneConfirmed),
    accepterDoneConfirmed: Boolean(d.accepterDoneConfirmed),
    revealCreator: Boolean(d.revealCreator),
    revealAccepter: Boolean(d.revealAccepter),
    disputeReason: d.disputeReason ? String(d.disputeReason) : undefined,
    disputedByUid: d.disputedByUid ? String(d.disputedByUid) : undefined,
    createdAtMs: createdTs ? createdTs.getTime() : Date.now(),
    updatedAtMs: updatedTs ? updatedTs.getTime() : createdTs ? createdTs.getTime() : Date.now(),
  };
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

  // Firebase Auth user state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const isFirebaseVerified = Boolean(
    firebaseUser && firebaseUser.email?.toLowerCase().endsWith('@g.nccu.edu.tw')
  );

  // Local fallback state (used only in Dev Demo Mode when auth.currentUser is null)
  const [localPosts, setLocalPosts] = useState<PostItem[]>(() =>
    readStorage<PostItem[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS)
  );
  const [localOrders, setLocalOrders] = useState<OrderItem[]>(() =>
    readStorage<OrderItem[]>(STORAGE_KEYS.ORDERS, [])
  );
  const [localOrderMessagesMap, setLocalOrderMessagesMap] = useState<Record<string, OrderMessage[]>>(
    () => readStorage<Record<string, OrderMessage[]>>(STORAGE_KEYS.ORDER_MSGS, {})
  );

  // Live Firestore synced state
  const [firestorePosts, setFirestorePosts] = useState<PostItem[]>([]);
  const [firestoreOrders, setFirestoreOrders] = useState<OrderItem[]>([]);

  const posts = isFirebaseVerified ? firestorePosts : localPosts;
  const orders = isFirebaseVerified ? firestoreOrders : localOrders;

  // Bottom Navigation strictly 4 core tabs: 'feed' | 'flash' | 'chats' | 'profile' (+ center '+發布')
  const [currentNavTab, setCurrentNavTab] = useState<AppNavTab>('feed');
  const [currentZone, setCurrentZone] = useState<CampusZone>('downhill');

  // Modals state (store IDs for live-synced items)
  const [selectedDetailPostId, setSelectedDetailPostId] = useState<string | null>(null);
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const [activeDisputeOrder, setActiveDisputeOrder] = useState<OrderItem | null>(null);
  const [isTechSpecOpen, setIsTechSpecOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Firebase Auth observer: enforce @g.nccu.edu.tw and hydrate profile from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null);
        return;
      }

      const email = fbUser.email?.trim() || '';
      if (!email.toLowerCase().endsWith('@g.nccu.edu.tw')) {
        await signOut(auth);
        setFirebaseUser(null);
        setIsOnboarded(false);
        return;
      }

      setFirebaseUser(fbUser);

      // Keep local currentUser.id synced with real Firebase UID
      setCurrentUser((prev) => ({
        ...prev,
        id: fbUser.uid,
        nccuEmail: email,
        studentId: prev.studentId || email.split('@')[0],
        avatar: fbUser.photoURL || prev.avatar,
        isVerifiedStudent: true,
      }));

      // Hydrate profile from Firestore users/{uid} if already onboarded
      try {
        const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
        if (userSnap.exists()) {
          const u = userSnap.data();
          setCurrentUser((prev) => ({
            ...prev,
            id: fbUser.uid,
            nccuEmail: email,
            studentId: String(u.studentId || email.split('@')[0]),
            name: String(u.nickname || prev.name),
            nickname: String(u.nickname || prev.nickname),
            department: String(u.department || prev.department),
            year: String(u.year || prev.year),
            dormLocation: String(u.dormLocation || prev.dormLocation),
            bio: u.bio !== undefined ? String(u.bio) : prev.bio,
            gender: (u.gender as UserProfile['gender']) || prev.gender,
            zone: (u.zone as CampusZone) || prev.zone,
            canTutorSubjects: Array.isArray(u.canTutorSubjects)
              ? u.canTutorSubjects.map(String)
              : prev.canTutorSubjects,
            subscribedTags: Array.isArray(u.subscribedTags)
              ? u.subscribedTags.map(String)
              : prev.subscribedTags,
            trustScore: typeof u.trustScore === 'number' ? u.trustScore : prev.trustScore,
            completedTasks:
              typeof u.completedTasks === 'number' ? u.completedTasks : prev.completedTasks,
            isVerifiedStudent: true,
          }));
        }
      } catch {
        // user doc might not exist yet before Step 2 onboarding completes
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener for `tasks` (open feed + my own tasks)
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

  // Real-time Firestore listener for `orders` (creatorUid == uid OR accepterUid == uid)
  useEffect(() => {
    if (!isFirebaseVerified || !firebaseUser) {
      setFirestoreOrders([]);
      return;
    }

    const creatorOrdersMap = new Map<string, OrderItem>();
    const accepterOrdersMap = new Map<string, OrderItem>();

    const mergeAndSetOrders = () => {
      const merged = new Map<string, OrderItem>();
      creatorOrdersMap.forEach((v, k) => merged.set(k, v));
      accepterOrdersMap.forEach((v, k) => merged.set(k, v));
      const sorted = Array.from(merged.values()).sort(
        (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)
      );
      setFirestoreOrders(sorted);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  };

  // Sync verified NCCU user profile to Firestore when signed in via Firebase Auth
  const syncUserToFirestore = async (profile: UserProfile) => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email?.toLowerCase().endsWith('@g.nccu.edu.tw')) return;

    const userPath = `users/${fbUser.uid}`;
    const userRef = doc(db, 'users', fbUser.uid);

    try {
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        await updateDoc(userRef, {
          nickname: (profile.nickname || profile.name).slice(0, 64),
          department: (profile.department || '').slice(0, 64),
          year: (profile.year || '').slice(0, 32),
          dormLocation: (profile.dormLocation || '').slice(0, 64),
          bio: (profile.bio || '').slice(0, 300),
          gender: profile.gender || 'undisclosed',
          zone: profile.zone || 'downhill',
          canTutorSubjects: (profile.canTutorSubjects || []).slice(0, 30),
          subscribedTags: (profile.subscribedTags || []).slice(0, 30),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, {
          uid: fbUser.uid,
          nccuEmail: fbUser.email,
          studentId: (profile.studentId || fbUser.email.split('@')[0]).slice(0, 64),
          nickname: (profile.nickname || profile.name).slice(0, 64),
          department: (profile.department || '').slice(0, 64),
          year: (profile.year || '').slice(0, 32),
          dormLocation: (profile.dormLocation || '').slice(0, 64),
          bio: (profile.bio || '').slice(0, 300),
          gender: profile.gender || 'undisclosed',
          zone: profile.zone || 'downhill',
          canTutorSubjects: (profile.canTutorSubjects || []).slice(0, 30),
          subscribedTags: (profile.subscribedTags || []).slice(0, 30),
          trustScore: 80,
          completedTasks: 0,
          isVerifiedStudent: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  };

  // Publish new task (Real-time Firestore `addDoc` or dev-demo fallback)
  const handleCreatePost = async (newPostData: Partial<PostItem>) => {
    const mins =
      newPostData.remainingMinutes !== undefined
        ? newPostData.remainingMinutes
        : newPostData.timeOption === '15m'
          ? 15
          : newPostData.timeOption === '30m'
            ? 30
            : newPostData.timeOption === '1h'
              ? 60
              : 120;

    const expireAtMs = Date.now() + mins * 60000;
    const title = (newPostData.title || '無標題任務').trim().slice(0, 160);
    const description = (newPostData.description || '').trim().slice(0, 2000);
    const location = (newPostData.locationName || '政大校園').trim().slice(0, 100);
    const price = newPostData.rewardAmount !== undefined ? Number(newPostData.rewardAmount) : 0;
    const paymentMethod = normalizeFirestorePaymentMethod(
      price === 0 ? 'free_aid' : newPostData.paymentMethod
    );

    if (isFirebaseVerified && firebaseUser) {
      const payload: Record<string, unknown> = {
        title,
        description,
        category: newPostData.category || 'marketplace',
        location,
        locationZone: newPostData.locationZone || currentZone,
        locationLat: newPostData.locationCoordinates?.lat ?? 24.9863,
        locationLng: newPostData.locationCoordinates?.lng ?? 121.5754,
        price,
        paymentMethod,
        isAnonymous: Boolean(newPostData.isCreatorAnonymous),
        femaleOnlyRecommended: Boolean(newPostData.femaleOnlyRecommended),
        tags: (newPostData.tags || ['#政大互助']).slice(0, 10),
        creatorUid: firebaseUser.uid,
        creatorName: (currentUser.nickname || currentUser.name).slice(0, 64),
        creatorEmail: firebaseUser.email || currentUser.nccuEmail,
        creatorTrustScore: currentUser.trustScore,
        status: 'open',
        timeOption: newPostData.timeOption || '2h',
        remainingMinutes: mins,
        expireAt: expireAtMs,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (newPostData.titleEn) payload.titleEn = newPostData.titleEn.slice(0, 160);
      if (newPostData.descriptionEn) payload.descriptionEn = newPostData.descriptionEn.slice(0, 2000);
      if (price > 0 && newPostData.paymentNote?.trim()) {
        payload.paymentNote = newPostData.paymentNote.trim().slice(0, 200);
      }
      if (price > 0 && newPostData.payerRole) {
        payload.payerRole = newPostData.payerRole;
      }
      if (newPostData.remainingQuota !== undefined) {
        payload.quantity = Math.max(1, Math.min(20, newPostData.remainingQuota));
        payload.totalQuota = Math.max(1, Math.min(20, newPostData.totalQuota ?? newPostData.remainingQuota));
      }

      try {
        await addDoc(collection(db, 'tasks'), payload);
        showToast(
          lang === 'zh'
            ? `✅「${title.slice(0, 16)}」已寫入雲端！同學大廳同步可見。`
            : '✅ Task published to Firestore real-time feed!'
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
      creatorName: currentUser.nickname || currentUser.name,
      creatorGender: currentUser.gender,
      creatorTrustScore: currentUser.trustScore,
      isCreatorAnonymous: newPostData.isCreatorAnonymous,
      creatorAnonAlias: newPostData.creatorAnonAlias,
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
      paymentNote: newPostData.paymentNote,
      payerRole: newPostData.payerRole,
      totalQuota: newPostData.totalQuota,
      remainingQuota: newPostData.remainingQuota,
      timeOption: newPostData.timeOption || '2h',
      remainingMinutes: mins,
      timeRemainingText: formatRemainingMinutes(mins, lang),
      status: 'open',
      locationName: location,
      locationNameEn: newPostData.locationNameEn || location,
      locationCoordinates: newPostData.locationCoordinates || { lat: 24.9863, lng: 121.5754 },
      locationZone: newPostData.locationZone || currentZone,
      femaleOnlyRecommended: Boolean(newPostData.femaleOnlyRecommended),
      minTrustScoreRequired: 60,
      createdAt: '剛剛',
      expiresAt: formatRemainingMinutes(mins, lang),
      createdAtMs: Date.now(),
      expireAtMs,
    };
    setLocalPosts((prev) => [newPost, ...prev]);
    showToast(
      lang === 'zh'
        ? `✅「${newPost.title.slice(0, 16)}」發布成功！已推流至大廳。`
        : '✅ Task published to campus feed!'
    );
  };

  // Claim / Apply for Post: Creates `orders` doc + decrements quota if applicable + opens 1-on-1 chat
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

    // Reuse existing non-cancelled order if this student already claimed it
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

    const hasQuota = post.totalQuota !== undefined && post.remainingQuota !== undefined;
    if (hasQuota && (post.remainingQuota ?? 0) <= 0) {
      return {
        success: false,
        message: lang === 'zh' ? '此項目名額已領完！' : 'Sold out!',
      };
    }

    const myName = (currentUser.nickname || currentUser.name).slice(0, 64);
    const paymentMethod = normalizeFirestorePaymentMethod(
      post.rewardAmount === 0 ? 'free_aid' : post.paymentMethod
    );

    if (isFirebaseVerified && firebaseUser) {
      try {
        // 1. If quota task, atomically decrement quantity (and close when reaching 0)
        if (hasQuota) {
          const currentQty = post.remainingQuota ?? 1;
          const taskUpdate: Record<string, unknown> = {
            quantity: increment(-1),
            updatedAt: serverTimestamp(),
          };
          if (currentQty <= 1) {
            taskUpdate.status = 'closed';
          }
          await updateDoc(doc(db, 'tasks', post.id), taskUpdate);
        }

        // 2. Create order document in Firestore
        const orderPayload: Record<string, unknown> = {
          taskId: post.id,
          taskTitle: post.title.slice(0, 160),
          taskLocation: post.locationName.slice(0, 100),
          taskPrice: post.rewardAmount,
          paymentMethod,
          creatorUid: post.creatorId,
          creatorName: post.creatorName.slice(0, 64),
          creatorAnonymous: Boolean(post.isCreatorAnonymous),
          accepterUid: firebaseUser.uid,
          accepterName: myName,
          accepterAnonymous: false,
          status: 'pending_confirm',
          creatorPaidConfirmed: false,
          accepterPaidConfirmed: false,
          creatorDoneConfirmed: false,
          accepterDoneConfirmed: false,
          revealCreator: false,
          revealAccepter: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (post.titleEn) orderPayload.taskTitleEn = post.titleEn.slice(0, 160);
        if (post.locationNameEn) orderPayload.taskLocationEn = post.locationNameEn.slice(0, 100);
        if (post.paymentNote) orderPayload.paymentNote = post.paymentNote.slice(0, 200);
        if (post.payerRole) orderPayload.payerRole = post.payerRole;
        if (post.expireAtMs) orderPayload.taskExpireAt = post.expireAtMs;
        if (post.creatorAnonAlias) orderPayload.creatorAnonAlias = post.creatorAnonAlias.slice(0, 64);

        const orderRef = await addDoc(collection(db, 'orders'), orderPayload);

        // 3. Send initial message into orders/{orderId}/messages
        await addDoc(collection(db, 'orders', orderRef.id, 'messages'), {
          text:
            lang === 'zh'
              ? `［接單通知］我已申請接單／領取名額，請雙方於此即時聊天室確認交付細節！`
              : '[Claim] I claimed this task. Let us coordinate details here!',
          senderUid: firebaseUser.uid,
          senderName: myName,
          createdAt: serverTimestamp(),
        });

        const createdOrder: OrderItem = {
          id: orderRef.id,
          taskId: post.id,
          taskTitle: post.title,
          taskTitleEn: post.titleEn,
          taskLocation: post.locationName,
          taskLocationEn: post.locationNameEn,
          taskPrice: post.rewardAmount,
          paymentMethod,
          paymentNote: post.paymentNote,
          payerRole: post.payerRole,
          taskExpireAt: post.expireAtMs,
          creatorUid: post.creatorId,
          creatorName: post.creatorName,
          creatorAnonymous: Boolean(post.isCreatorAnonymous),
          creatorAnonAlias: post.creatorAnonAlias,
          accepterUid: firebaseUser.uid,
          accepterName: myName,
          accepterAnonymous: false,
          status: 'pending_confirm',
          creatorPaidConfirmed: false,
          accepterPaidConfirmed: false,
          creatorDoneConfirmed: false,
          accepterDoneConfirmed: false,
          revealCreator: false,
          revealAccepter: false,
          createdAtMs: Date.now(),
          updatedAtMs: Date.now(),
        };

        const msg = hasQuota
          ? lang === 'zh'
            ? '✅ 已成功領取 1 份並建立 1-on-1 聊天室！'
            : '✅ Spot claimed! 1-on-1 chat opened.'
          : lang === 'zh'
            ? '✅ 已申請接單並建立專屬 1-on-1 聊天室！'
            : '✅ Claimed task! 1-on-1 chat opened.';

        return { success: true, message: msg, order: createdOrder };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
        return {
          success: false,
          message: lang === 'zh' ? '建立訂單失敗，請稍後再試。' : 'Failed to create order.',
        };
      }
    }

    // Dev demo fallback
    if (hasQuota) {
      const nextQuota = Math.max(0, (post.remainingQuota ?? 1) - 1);
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
    }

    const demoOrderId = `order_${Date.now()}`;
    const demoOrder: OrderItem = {
      id: demoOrderId,
      taskId: post.id,
      taskTitle: post.title,
      taskTitleEn: post.titleEn,
      taskLocation: post.locationName,
      taskLocationEn: post.locationNameEn,
      taskPrice: post.rewardAmount,
      paymentMethod,
      paymentNote: post.paymentNote,
      payerRole: post.payerRole,
      taskExpireAt: post.expireAtMs,
      creatorUid: post.creatorId,
      creatorName: post.creatorName,
      creatorAnonymous: Boolean(post.isCreatorAnonymous),
      creatorAnonAlias: post.creatorAnonAlias,
      accepterUid: currentUser.id,
      accepterName: myName,
      accepterAnonymous: false,
      status: 'pending_confirm',
      creatorPaidConfirmed: false,
      accepterPaidConfirmed: false,
      creatorDoneConfirmed: false,
      accepterDoneConfirmed: false,
      revealCreator: false,
      revealAccepter: false,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
    setLocalOrders((prev) => [demoOrder, ...prev]);
    setLocalOrderMessagesMap((prev) => ({
      ...prev,
      [demoOrderId]: [
        {
          id: `msg_${Date.now()}`,
          text: '［接單通知］我已申請接單／領取名額，請雙方於此即時聊天室確認交付細節！',
          senderUid: currentUser.id,
          senderName: myName,
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
          ? '✅ 已建立專屬 1-on-1 聊天室！'
          : '✅ 1-on-1 chat opened!',
      order: demoOrder,
    };
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
      prev.map((o) =>
        o.id === orderId ? { ...o, ...patch, updatedAtMs: Date.now() } : o
      )
    );
  };

  // Report & Dispute Submission (Firestore `orders` update + `reports` create)
  const handleSubmitDispute = async (
    order: OrderItem,
    category: DisputeCategory,
    description: string
  ) => {
    const cleanDesc = description.trim().slice(0, 1000) || '檢舉申訴提交';

    if (isFirebaseVerified && firebaseUser) {
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'disputed',
          disputeReason: `${category}: ${cleanDesc}`.slice(0, 1000),
          disputedByUid: firebaseUser.uid,
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, 'reports'), {
          orderId: order.id,
          taskId: order.taskId,
          reporterUid: firebaseUser.uid,
          reasonCategory: category,
          description: cleanDesc,
          status: 'frozen_escrow',
          createdAt: serverTimestamp(),
        });

        await addDoc(collection(db, 'orders', order.id, 'messages'), {
          text: `⚠️ 已提交爭議申訴（${category}）：${cleanDesc}`,
          senderUid: firebaseUser.uid,
          senderName: currentUser.nickname || currentUser.name,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'reports');
      }
    } else {
      handleLocalUpdateOrder(order.id, {
        status: 'disputed',
        disputeReason: `${category}: ${cleanDesc}`,
        disputedByUid: currentUser.id,
      });
      handleLocalSendMessage(order.id, `⚠️ 已提交爭議申訴（${category}）：${cleanDesc}`);
    }

    showToast(
      lang === 'zh'
        ? '⚠️ 檢舉申訴已送出！系統已標記爭議凍結並留存紀錄。'
        : '⚠️ Dispute submitted and recorded.'
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

  // Quick Task Management (ProfileView): One-click Republish (Reset 2h countdown & open)
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
      trustScore: Math.min(100, currentUser.trustScore + 3),
    };
    setCurrentUser(nextUser);
    void syncUserToFirestore(nextUser);
    setIsTranscriptModalOpen(false);
    showToast(`🎓 修課證明截圖已核對：已新增「${subjectName}」專長認證！`);
  };

  // Logout: Sign out of Firebase Auth, clear local session, return to OnboardingGate Step 1
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore if already signed out
    }
    try {
      window.localStorage.removeItem(STORAGE_KEYS.ONBOARDED);
      window.localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {
      // ignore
    }
    setFirebaseUser(null);
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

  const myPosts = posts.filter((p) => p.creatorId === currentUser.id);

  // Flash / Urgent active count (2h leftovers + emergency SOS)
  const flashCount = posts.filter((p) => {
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

  // Mandatory Onboarding Gate: First screen check
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
            const updatedName = profileData.nickname || profileData.name || baseUser.name;
            const fbUid = auth.currentUser?.uid;
            const fbEmail = auth.currentUser?.email || profileData.nccuEmail;
            const nextUser: UserProfile = {
              ...baseUser,
              ...profileData,
              id: fbUid || profileData.id || baseUser.id,
              nccuEmail: fbEmail || baseUser.nccuEmail,
              name: updatedName,
              nickname: updatedName,
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
                      ? '⚡ 已以開發模式測試學生 (Audrey Chen) 快速登入'
                      : '⚡ Dev quick demo login as Audrey Chen'
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

      {/* Main Native App Header */}
      <AppHeader
        currentUser={currentUser}
        currentZone={currentZone}
        onZoneChange={(zone) => {
          setCurrentZone(zone);
          showToast(
            `已切換至：${zone === 'downhill' ? '山下校區 (綜院/商館 28m)' : '山上校區 (綜合大樓 105m)'}`
          );
        }}
        onOpenCreatePost={() => setIsCreateModalOpen(true)}
        onOpenProfile={() => setCurrentNavTab('profile')}
        onOpenTechSpecs={() => setIsTechSpecOpen(true)}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* Main App Content Viewport (5-Tab Architecture) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4">
        {/* TAB 1: 大廳 (Feed) */}
        {currentNavTab === 'feed' && (
          <FeedView
            posts={posts}
            currentUser={currentUser}
            onSelectPost={(post) => setSelectedDetailPostId(post.id)}
            onOpenCreatePost={() => setIsCreateModalOpen(true)}
            onOpenOnboarding={() => setCurrentNavTab('profile')}
            mode="feed"
            lang={lang}
          />
        )}

        {/* TAB 2: 快閃/急件 (Flash) */}
        {currentNavTab === 'flash' && (
          <FeedView
            posts={posts}
            currentUser={currentUser}
            onSelectPost={(post) => setSelectedDetailPostId(post.id)}
            onOpenCreatePost={() => setIsCreateModalOpen(true)}
            onOpenOnboarding={() => setCurrentNavTab('profile')}
            mode="flash"
            lang={lang}
          />
        )}

        {/* TAB 4: 訊息 (Chats) */}
        {currentNavTab === 'chats' && (
          <ChatsView
            orders={orders}
            currentUser={currentUser}
            onOpenOrderChat={(order) => setActiveChatOrderId(order.id)}
            lang={lang}
          />
        )}

        {/* TAB 5: 個人 (Profile) */}
        {currentNavTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            myPosts={myPosts}
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
            setIsCreateModalOpen(true);
          } else {
            setCurrentNavTab(tab);
          }
        }}
        onOpenCreatePost={() => setIsCreateModalOpen(true)}
        activeChatsCount={activeChatsCount}
        flashCount={flashCount}
        lang={lang}
      />

      {/* Clean Card Task Detail Modal */}
      {selectedDetailPost && (
        <TaskDetailModal
          isOpen={Boolean(selectedDetailPost)}
          onClose={() => setSelectedDetailPostId(null)}
          post={selectedDetailPost}
          currentUser={currentUser}
          existingOrder={existingOrderForDetail}
          onApplyAcceptPost={async (id) => {
            const res = await handleApplyAcceptPost(id);
            if (res.success) {
              showToast(res.message);
            } else {
              showToast(res.message);
            }
            return res;
          }}
          onOpenOrderChat={(order) => {
            setActiveChatOrderId(order.id);
          }}
          lang={lang}
        />
      )}

      {/* Dedicated 1-on-1 Real-time Chat Room Modal */}
      {activeChatOrder && (
        <ChatRoomModal
          isOpen={Boolean(activeChatOrder)}
          onClose={() => setActiveChatOrderId(null)}
          order={activeChatOrder}
          currentUser={currentUser}
          useFirestoreRealtime={isFirebaseVerified}
          localMessages={localOrderMessagesMap[activeChatOrder.id] || []}
          onLocalSendMessage={handleLocalSendMessage}
          onLocalUpdateOrder={handleLocalUpdateOrder}
          onOpenDispute={(ord) => {
            setActiveChatOrderId(null);
            setActiveDisputeOrder(ord);
          }}
          onShowToast={showToast}
          lang={lang}
        />
      )}

      {/* Report & Dispute Modal */}
      {activeDisputeOrder && (
        <ReportDisputeModal
          isOpen={Boolean(activeDisputeOrder)}
          onClose={() => setActiveDisputeOrder(null)}
          order={activeDisputeOrder}
          currentUser={currentUser}
          onSubmitDispute={handleSubmitDispute}
          lang={lang}
        />
      )}

      {/* Tech Spec Modal (Wireframe, LBS Haversine, Schema, API Specs) */}
      <TechSpecModal
        isOpen={isTechSpecOpen}
        onClose={() => setIsTechSpecOpen(false)}
      />

      {/* Flexible Task Create Modal */}
      <PostCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        onCreatePost={(data) => {
          void handleCreatePost(data);
        }}
        lang={lang}
      />

      {/* Transcript OCR Verification Modal */}
      <TranscriptVerifyModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        currentUser={currentUser}
        onVerifiedSuccess={handleTranscriptVerifiedSuccess}
      />
    </div>
  );
}
