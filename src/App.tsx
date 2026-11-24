import React, { useState } from 'react';
import { 
  UserProfile, PostItem, CampusZone, EscrowTransaction, 
  ChatMessage, DisputeCategory, Language 
} from './types';
import { DEMO_USERS, INITIAL_POSTS, INITIAL_ESCROWS, INITIAL_CHAT_MESSAGES } from './data/mockData';
import { I18N } from './data/i18n';
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
import { OnboardingModal } from './components/OnboardingModal';
import { OnboardingGate } from './components/OnboardingGate';
import { APP_CONFIG } from './config/appConfig';
import { CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  // Mandatory Onboarding Gate: user starts at full-screen onboarding on page load
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);

  // Bottom Navigation strictly 4 core tabs: 'feed' | 'chats' | 'post' | 'profile'
  const [currentNavTab, setCurrentNavTab] = useState<AppNavTab>('feed');
  const [currentZone, setCurrentZone] = useState<CampusZone>('downhill');
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[0]); // Audrey Chen
  const [posts, setPosts] = useState<PostItem[]>(INITIAL_POSTS);
  const [escrows, setEscrows] = useState<EscrowTransaction[]>(INITIAL_ESCROWS);
  const [chatMessagesMap, setChatMessagesMap] = useState<Record<string, ChatMessage[]>>(INITIAL_CHAT_MESSAGES);

  // Modals state
  const [selectedDetailPost, setSelectedDetailPost] = useState<PostItem | null>(null);
  const [activeChatPost, setActiveChatPost] = useState<PostItem | null>(null);
  const [activeDisputePost, setActiveDisputePost] = useState<PostItem | null>(null);
  const [isTechSpecOpen, setIsTechSpecOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState<boolean>(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = I18N[lang];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleLang = () => {
    setLang(prev => (prev === 'zh' ? 'en' : 'zh'));
  };

  // Add new post (Pay-to-Post Escrow)
  const handleCreatePost = (newPostData: Partial<PostItem>) => {
    const newId = `post_${Date.now()}`;
    const newPost: PostItem = {
      id: newId,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorGender: currentUser.gender,
      creatorTrustScore: currentUser.trustScore,
      isCreatorAnonymous: newPostData.isCreatorAnonymous,
      creatorAnonAlias: newPostData.creatorAnonAlias,
      category: newPostData.category || 'marketplace',
      subcategory: newPostData.subcategory,
      title: newPostData.title || '無標題任務',
      titleEn: newPostData.titleEn || newPostData.title || 'Untitled Task',
      description: newPostData.description || '',
      descriptionEn: newPostData.descriptionEn || newPostData.description || '',
      tags: newPostData.tags || ['#政大互助'],
      rewardAmount: newPostData.rewardAmount !== undefined ? newPostData.rewardAmount : 0,
      isNegotiable: newPostData.isNegotiable,
      escrowDeposit: newPostData.escrowDeposit !== undefined ? newPostData.escrowDeposit : 0,
      paymentMethod: newPostData.paymentMethod || 'free_aid',
      timeOption: newPostData.timeOption || '2h',
      timeRemainingText: newPostData.timeOption === '2h' ? '剩餘 2 小時' : '剩餘 30 分鐘',
      status: 'open',
      locationName: newPostData.locationName || '政大校園',
      locationNameEn: newPostData.locationNameEn || newPostData.locationName || 'NCCU Campus',
      locationCoordinates: newPostData.locationCoordinates || { lat: 24.9863, lng: 121.5754 },
      locationZone: newPostData.locationZone || currentZone,
      femaleOnlyRecommended: Boolean(newPostData.femaleOnlyRecommended),
      minTrustScoreRequired: newPostData.minTrustScoreRequired || 60,
      identityRevealStatus: 'none',
      createdAt: '剛剛',
      expiresAt: newPostData.timeOption === '2h' ? '2 小時後到期' : '30 分鐘後到期',
    };

    // Add escrow record if payment involved
    if (newPost.rewardAmount > 0) {
      const newEscrow: EscrowTransaction = {
        id: `escrow_tx_${Date.now()}`,
        postId: newId,
        postTitle: newPost.title,
        payerId: currentUser.id,
        payerName: currentUser.name,
        amount: newPost.rewardAmount,
        platformFee: newPost.category === 'emergency' ? 0 : Math.round(newPost.rewardAmount * 0.05),
        netPayout: newPost.rewardAmount,
        paymentMethod: newPost.paymentMethod,
        gatewayTransactionId: `${newPost.paymentMethod.toUpperCase()}_${Date.now()}`,
        status: 'held',
        createdAt: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        updatedAt: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
      };
      setEscrows([newEscrow, ...escrows]);
    }

    setPosts([newPost, ...posts]);
    showToast(lang === 'zh'
      ? `✅「${newPost.title.slice(0, 16)}...」發布成功！已向校園推流。`
      : `✅ Task published! Broadcasting across NCCU.`);
  };

  // Phase 1: Apply to claim task (Non-blocking female dorm reminder)
  const handleApplyAcceptPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return { success: false, message: '找不到此任務。' };

    // Transition to Phase 1: pending_accept
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          status: 'pending_accept',
          applicantId: currentUser.id,
          applicantName: currentUser.name,
          applicantAvatar: currentUser.avatar,
          applicantTrustScore: currentUser.trustScore,
        };
      }
      return p;
    }));

    return {
      success: true,
      message: lang === 'zh'
        ? `接單申請已送出！系統已通知發布者確認。發布者確認後將開啟 1-on-1 雙語聊天室。`
        : `Claim application sent! Awaiting creator confirmation.`,
    };
  };

  // Phase 1 -> Phase 2: Creator approves applicant
  const handleApproveFulfiller = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !post.applicantId) return;

    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          status: 'in_progress',
          fulfillerId: p.applicantId,
          fulfillerName: p.applicantName,
          fulfillerAnonAlias: `政大互助同學 #${Math.floor(1000 + Math.random() * 9000)}`,
        };
      }
      return p;
    }));

    // Initialize initial system chat message
    if (!chatMessagesMap[postId]) {
      setChatMessagesMap(prev => ({
        ...prev,
        [postId]: [
          {
            id: `msg_sys_${Date.now()}`,
            taskId: postId,
            senderId: 'system',
            senderName: 'NCCU LOOP 系統',
            senderAvatar: '',
            content: '訂單成立！1-on-1 聊天室已開啟。雙方可使用下方快捷語或一鍵中英翻譯溝通。',
            translatedContent: 'Order initialized! Chat open. Supports quick phrases and AI translation.',
            timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            type: 'system',
          },
        ],
      }));
    }

    showToast(lang === 'zh' ? '已確認接單！1-on-1 聊天室已開啟。' : 'Claim approved! 1-on-1 chat open.');
  };

  // Send message in 1-on-1 Chat
  const handleSendMessage = (postId: string, content: string) => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      taskId: postId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      isAnonymous: false,
      content,
      translatedContent: content.includes('宿舍')
        ? 'I arrived at the dorm entrance!'
        : content.includes('列印')
        ? 'Printing finished, walking over now.'
        : `[English translation of: ${content}]`,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };

    setChatMessagesMap(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newMsg],
    }));
  };

  // Anonymity: Request Reveal Identity
  const handleRequestRevealIdentity = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const isCreator = currentUser.id === post.creatorId;

    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          identityRevealStatus: isCreator ? 'requested_by_creator' : 'requested_by_fulfiller',
        };
      }
      return p;
    }));

    handleSendMessage(postId, `［系統提示：${currentUser.name} 發起了「公開真實身分邀請」，需雙方均同意後方會揭曉個人檔案］`);
    showToast(lang === 'zh' ? '已發送身分公開邀請，等待對方確認。' : 'Identity reveal requested.');
  };

  // Anonymity: Accept Reveal Identity
  const handleAcceptRevealIdentity = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          identityRevealStatus: 'mutual_revealed',
        };
      }
      return p;
    }));

    handleSendMessage(postId, '［系統提示：雙方已同意公開真實身分！已在對話中解鎖個人照片與學號］');
    showToast(lang === 'zh' ? '雙方已確認公開身分！' : 'Mutual identity reveal completed!');
  };

  // Phase 3: Two-party Completion & Escrow Release
  const handleConfirmCompletion = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const isCreator = currentUser.id === post.creatorId;

    let willFullyComplete = false;
    if (isCreator && post.fulfillerConfirmedCompleted) {
      willFullyComplete = true;
    } else if (!isCreator && post.creatorConfirmedCompleted) {
      willFullyComplete = true;
    }

    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          creatorConfirmedCompleted: isCreator ? true : p.creatorConfirmedCompleted,
          fulfillerConfirmedCompleted: !isCreator ? true : p.fulfillerConfirmedCompleted,
          status: willFullyComplete ? 'completed' : 'pending_completion',
          completedAt: willFullyComplete ? '剛剛' : p.completedAt,
        };
      }
      return p;
    }));

    if (willFullyComplete) {
      // Release escrow funds
      setEscrows(escrows.map(e => {
        if (e.postId === postId) {
          return {
            ...e,
            status: 'released',
            payeeId: post.fulfillerId,
            payeeName: post.fulfillerName,
          };
        }
        return e;
      }));

      // Update trust score & balance
      setCurrentUser(prev => ({
        ...prev,
        walletBalance: prev.walletBalance + post.rewardAmount,
        trustScore: Math.min(100, prev.trustScore + 1),
        completedTasks: prev.completedTasks + 1,
      }));

      showToast(lang === 'zh'
        ? '🎉 雙方皆已確認完成結案！保證金已劃撥給提供者，信任履歷 +1！'
        : '🎉 Both parties confirmed! Escrow funds released.');
    } else {
      showToast(lang === 'zh'
        ? '您已確認完成！已進入 24 小時倒數，待對方確認後款項將自動劃撥。'
        : 'You confirmed completion! Awaiting other party confirmation.');
    }
  };

  // Report & Dispute Submission
  const handleSubmitDispute = (postId: string, category: DisputeCategory, description: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          status: 'disputed',
        };
      }
      return p;
    }));

    // Freeze escrow
    setEscrows(escrows.map(e => {
      if (e.postId === postId) {
        return {
          ...e,
          status: 'frozen_dispute',
          refundReason: `申訴凍結中: ${category} - ${description}`,
        };
      }
      return e;
    }));

    showToast(lang === 'zh'
      ? '⚠️ 申訴已立案！系統已即時凍結該筆預扣款，並暫停被檢舉者接單權限。'
      : '⚠️ Dispute filed! Escrow funds frozen and respondent privileges suspended.');
  };

  // Timeout auto-refund simulation
  const handleRefundPost = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          status: 'refunded',
          refundedAt: '剛剛',
        };
      }
      return p;
    }));

    setEscrows(escrows.map(e => {
      if (e.postId === postId) {
        return {
          ...e,
          status: 'refunded',
          refundReason: '任務超時無人接單，排程 Worker 自動 100% 全額原路退刷',
        };
      }
      return e;
    }));

    showToast(lang === 'zh'
      ? '💸 任務超時未成單，Line Pay / 街口 預扣款 100% 全額原路退回！'
      : '💸 Timeout refund triggered: 100% full refund returned.');
  };

  // Toggle tag subscriptions
  const handleToggleSubscription = (tag: string) => {
    const exists = currentUser.subscribedTags.includes(tag);
    const newTags = exists
      ? currentUser.subscribedTags.filter(t => t !== tag)
      : [...currentUser.subscribedTags, tag];

    setCurrentUser({
      ...currentUser,
      subscribedTags: newTags,
    });

    showToast(exists ? `已取消訂閱 ${tag}` : `已成功訂閱 ${tag}！當校園有相符任務建立時將即時推播通知。`);
  };

  // Transcript verification success
  const handleTranscriptVerifiedSuccess = (subjectCode: string, subjectName: string) => {
    setCurrentUser(prev => ({
      ...prev,
      canTutorSubjects: [...prev.canTutorSubjects, subjectName],
      trustScore: Math.min(100, prev.trustScore + 3),
    }));
    setIsTranscriptModalOpen(false);
    showToast(`🎓 教務處成績單 OCR 辨識通過：已取得 ${subjectCode} ${subjectName} A+ 授課認證！`);
  };

  // Active chats count
  const activeChatsCount = posts.filter(p => {
    const isParticipant = p.creatorId === currentUser.id || p.fulfillerId === currentUser.id || p.applicantId === currentUser.id;
    return isParticipant && (p.status === 'in_progress' || p.status === 'pending_accept' || p.status === 'pending_completion');
  }).length;

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
            setCurrentUser(prev => ({
              ...prev,
              ...profileData,
              isVerifiedStudent: true,
            }));
            setIsOnboarded(true);
            showToast(lang === 'zh' ? '🎉 註冊驗證完成！歡迎進入 NCCU Loop 政大圈圈。' : '🎉 Welcome to NCCU Loop!');
          }}
          onQuickDemoLogin={() => {
            setCurrentUser(DEMO_USERS[0]); // Audrey Chen
            setIsOnboarded(true);
            showToast(lang === 'zh' ? '⚡ 已以測試學生 (Audrey Chen) 快速登入大廳' : '⚡ Quick demo login as Audrey Chen');
          }}
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
          showToast(`已切換至：${zone === 'downhill' ? '山下校區 (綜院/商館 28m)' : '山上校區 (綜合大樓 105m)'}`);
        }}
        onOpenCreatePost={() => setIsCreateModalOpen(true)}
        onOpenUserSwitcher={() => setIsUserSwitcherOpen(true)}
        onOpenTechSpecs={() => setIsTechSpecOpen(true)}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* Main App Content Viewport (Strict 4-Tab Architecture) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4">
        {/* TAB 1: 📍 大廳 (Feed) */}
        {currentNavTab === 'feed' && (
          <FeedView
            posts={posts}
            currentUser={currentUser}
            onSelectPost={(post) => setSelectedDetailPost(post)}
            onOpenCreatePost={() => setIsCreateModalOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            lang={lang}
          />
        )}

        {/* TAB 2: 💬 訊息 (Chats) */}
        {currentNavTab === 'chats' && (
          <ChatsView
            posts={posts}
            currentUser={currentUser}
            chatMessagesMap={chatMessagesMap}
            onOpenChat={(post) => setActiveChatPost(post)}
            lang={lang}
          />
        )}

        {/* TAB 4: 👤 個人 (Profile) */}
        {currentNavTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            escrows={escrows}
            onOpenTranscriptVerify={() => setIsTranscriptModalOpen(true)}
            onToggleSubscription={handleToggleSubscription}
            onOpenUserSwitcher={() => setIsUserSwitcherOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onLogout={() => {
              setIsOnboarded(false);
              showToast(lang === 'zh' ? '已安全登出，返回註冊與驗證閘門。' : 'Logged out. Returned to onboarding.');
            }}
            lang={lang}
          />
        )}
      </main>

      {/* Strict 4-Tab Bottom Navigation Bar */}
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
        lang={lang}
      />

      {/* Clean Card Task Detail Modal */}
      {selectedDetailPost && (
        <TaskDetailModal
          isOpen={Boolean(selectedDetailPost)}
          onClose={() => setSelectedDetailPost(null)}
          post={selectedDetailPost}
          currentUser={currentUser}
          onApplyAcceptPost={(id) => {
            const res = handleApplyAcceptPost(id);
            if (res.success) {
              showToast(res.message);
            }
            return res;
          }}
          onApproveFulfiller={handleApproveFulfiller}
          onOpenChat={(p) => setActiveChatPost(p)}
          onConfirmCompletion={handleConfirmCompletion}
          onRefundPost={handleRefundPost}
          lang={lang}
        />
      )}

      {/* Dedicated 1-on-1 Chat Room Modal */}
      {activeChatPost && (
        <ChatRoomModal
          isOpen={Boolean(activeChatPost)}
          onClose={() => setActiveChatPost(null)}
          post={activeChatPost}
          currentUser={currentUser}
          messages={chatMessagesMap[activeChatPost.id] || []}
          onSendMessage={(content) => handleSendMessage(activeChatPost.id, content)}
          onRequestRevealIdentity={handleRequestRevealIdentity}
          onAcceptRevealIdentity={handleAcceptRevealIdentity}
          onConfirmCompletion={handleConfirmCompletion}
          onOpenDispute={(p) => {
            setActiveChatPost(null);
            setActiveDisputePost(p);
          }}
          lang={lang}
        />
      )}

      {/* Report & Dispute Modal */}
      {activeDisputePost && (
        <ReportDisputeModal
          isOpen={Boolean(activeDisputePost)}
          onClose={() => setActiveDisputePost(null)}
          post={activeDisputePost}
          currentUser={currentUser}
          onSubmitDispute={handleSubmitDispute}
          lang={lang}
        />
      )}

      {/* 3-Step Student Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentUser={currentUser}
        onCompleteOnboarding={(updated) => {
          setCurrentUser(prev => ({ ...prev, ...updated }));
          showToast(lang === 'zh' ? '三步驗證完成！歡迎進入 NCCU LOOP。' : 'Onboarding completed!');
        }}
        lang={lang}
      />

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
        onCreatePost={handleCreatePost}
        lang={lang}
      />

      {/* Transcript OCR Verification Modal */}
      <TranscriptVerifyModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        currentUser={currentUser}
        onVerifiedSuccess={handleTranscriptVerifiedSuccess}
      />

      {/* Student Persona Switcher Modal */}
      {isUserSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden text-xs">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase">
                  SIMULATE STUDENT PERSONA
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  切換測試學生角色
                </h3>
              </div>
              <button
                onClick={() => setIsUserSwitcherOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-2.5">
              {DEMO_USERS.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    setIsUserSwitcherOpen(false);
                    showToast(`已切換學生：${u.name} (★${u.trustScore})`);
                  }}
                  className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    currentUser.id === u.id
                      ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{u.name}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{u.studentId}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {u.department} · {u.dormLocation}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="font-mono text-emerald-700 font-bold">★{u.trustScore}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{u.boundPaymentGateways.join(', ')}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
