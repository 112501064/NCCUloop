import React, { useState } from 'react';
import {
  UserProfile,
  Language,
  PostItem,
  CampusZone,
  ReviewItem,
  BiologicalSex,
} from '../types';
import { formatRemainingMinutes, formatPaymentMethodLabel } from '../utils/formatters';
import { localizeLocationName } from '../utils/lbs';
import {
  ShieldCheck,
  GraduationCap,
  Bell,
  CheckCircle2,
  CreditCard,
  LogOut,
  Clock,
  Plus,
  RotateCcw,
  ClipboardList,
  Pencil,
  Trash2,
  X,
  Check,
  Upload,
  Star,
  ShieldAlert,
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: UserProfile;
  myPosts: PostItem[];
  receivedReviews: ReviewItem[];
  isAdmin?: boolean;
  pendingReportsCount?: number;
  onOpenAdminReview?: () => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onAddTutorSkill: (skill: string) => void;
  onRemoveTutorSkill: (skill: string) => void;
  onAddFollowedTag: (tag: string) => void;
  onRemoveFollowedTag: (tag: string) => void;
  onAddReward: (postId: string, delta: number) => void;
  onExtendTime: (postId: string, minutes: number) => void;
  onRepublishPost: (postId: string) => void;
  onSelectPost: (post: PostItem) => void;
  onEditPost: (post: PostItem) => void;
  onDeletePost: (post: PostItem) => void;
  onOpenTranscriptVerify: () => void;
  onLogout: () => void;
  lang: Language;
}

const GRADE_SUGGESTIONS = ['大一', '大二', '大三', '大四', '碩一', '碩二', '交換生'];

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  myPosts,
  receivedReviews,
  isAdmin = false,
  pendingReportsCount = 0,
  onOpenAdminReview,
  onUpdateProfile,
  onAddTutorSkill,
  onRemoveTutorSkill,
  onAddFollowedTag,
  onRemoveFollowedTag,
  onAddReward,
  onExtendTime,
  onRepublishPost,
  onSelectPost,
  onEditPost,
  onDeletePost,
  onOpenTranscriptVerify,
  onLogout,
  lang,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editNickname, setEditNickname] = useState<string>(currentUser.nickname || currentUser.name);
  const [editRealName, setEditRealName] = useState<string>(currentUser.realName || '');
  const [editBiologicalSex, setEditBiologicalSex] = useState<BiologicalSex>(
    currentUser.biologicalSex || 'female'
  );
  const [editDepartment, setEditDepartment] = useState<string>(currentUser.department);
  const [editYear, setEditYear] = useState<string>(currentUser.year);
  const [editDormLocation, setEditDormLocation] = useState<string>(currentUser.dormLocation);
  const [editZone, setEditZone] = useState<CampusZone>(currentUser.zone);
  const [editBio, setEditBio] = useState<string>(currentUser.bio || '');

  const [newSkillText, setNewSkillText] = useState<string>('');
  const [newTagText, setNewTagText] = useState<string>('');

  const handleOpenEdit = () => {
    setEditNickname(currentUser.nickname || currentUser.name);
    setEditRealName(currentUser.realName || '');
    setEditBiologicalSex(currentUser.biologicalSex || 'female');
    setEditDepartment(currentUser.department);
    setEditYear(currentUser.year);
    setEditDormLocation(currentUser.dormLocation);
    setEditZone(currentUser.zone);
    setEditBio(currentUser.bio || '');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = editNickname.trim() || currentUser.name;
    const cleanReal = editRealName.trim() || currentUser.realName || cleanNick;
    onUpdateProfile({
      nickname: cleanNick,
      realName: cleanReal,
      name: cleanNick,
      biologicalSex: editBiologicalSex,
      gender: editBiologicalSex,
      department: editDepartment.trim() || '未填寫系別',
      year: editYear.trim() || '政大學生',
      dormLocation: editDormLocation.trim() || '山下校區',
      zone: editZone,
      bio: editBio.trim(),
    });
    setIsEditingProfile(false);
  };

  const handleSubmitSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newSkillText.trim();
    if (!cleaned) return;
    onAddTutorSkill(cleaned);
    setNewSkillText('');
  };

  const handleSubmitTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newTagText.trim();
    if (!cleaned) return;
    onAddFollowedTag(cleaned);
    setNewTagText('');
  };

  return (
    <div className="space-y-4 pb-24 text-xs">
      {/* Admin Console Entry (ONLY visible for whitelisted Admin emails) */}
      {isAdmin && onOpenAdminReview && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>{lang === 'zh' ? '🛡️ 案件審核後台' : '🛡️ Admin Review Console'}</span>
                {pendingReportsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
                    {pendingReportsCount} {lang === 'zh' ? '件待審' : 'pending'}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                {lang === 'zh'
                  ? '審核檢舉佐證截圖、聊天紀錄與 AI 違規風險評估'
                  : 'Review evidence screenshots, chat logs & AI risk summaries'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAdminReview}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer shrink-0 transition-colors"
          >
            {lang === 'zh' ? '進入審核' : 'Open'}
          </button>
        </div>
      )}

      {/* Student Profile Card (Nickname + Real Name Dual-Track + Biological Sex) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.nickname || currentUser.name}
              className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-600/30 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {currentUser.nickname || currentUser.name}
                </h2>
                <span className="font-mono text-slate-400 text-[11px]">{currentUser.studentId}</span>
                {currentUser.biologicalSex && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      currentUser.biologicalSex === 'female'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-sky-50 text-sky-800 border border-sky-200'
                    }`}
                  >
                    {currentUser.biologicalSex === 'female'
                      ? lang === 'zh'
                        ? '生理女'
                        : 'Female'
                      : lang === 'zh'
                        ? '生理男'
                        : 'Male'}
                  </span>
                )}
              </div>
              {currentUser.realName && (
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {lang === 'zh'
                    ? `本名：${currentUser.realName}（僅雙向解除匿名或女宿實名任務時顯示）`
                    : `Real Name: ${currentUser.realName} (shown only on mutual reveal)`}
                </p>
              )}
              <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                {currentUser.department} · {currentUser.year} ·{' '}
                {localizeLocationName(currentUser.dormLocation, lang, currentUser.dormLocationEn)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold font-mono mt-1 truncate">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{currentUser.nccuEmail}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {!isEditingProfile && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <Pencil className="w-3 h-3" />
                <span>{lang === 'zh' ? '編輯資料' : 'Edit Profile'}</span>
              </button>
            )}
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
              {lang === 'zh' ? '政大實名驗證' : 'VERIFIED'}
            </span>
          </div>
        </div>

        {/* Bio display */}
        {!isEditingProfile && currentUser.bio && (
          <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 leading-relaxed">
            {currentUser.bio}
          </p>
        )}

        {/* Inline Editable Profile Form */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {lang === 'zh' ? '暱稱 (公開顯示)' : 'Nickname (Public)'}
                </label>
                <input
                  type="text"
                  required
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  placeholder="輸入校園暱稱"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {lang === 'zh' ? '真實姓名 (解除匿名時顯示)' : 'Real Name (Mutual Reveal)'}
                </label>
                <input
                  type="text"
                  required
                  value={editRealName}
                  onChange={(e) => setEditRealName(e.target.value)}
                  placeholder="輸入真實姓名"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>
            </div>

            {/* Required Biological Sex Selector for Dorm Safety */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {lang === 'zh'
                  ? '生理性別 (必填 · 用於女宿安全隔離保護)'
                  : 'Biological Sex (Required · Dorm Safety)'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditBiologicalSex('female')}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    editBiologicalSex === 'female'
                      ? 'bg-rose-50 border-rose-500 text-rose-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {lang === 'zh' ? '生理女 (Female)' : 'Female'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditBiologicalSex('male')}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    editBiologicalSex === 'male'
                      ? 'bg-sky-50 border-sky-500 text-sky-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {lang === 'zh' ? '生理男 (Male)' : 'Male'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {lang === 'zh' ? '系別 (Department)' : 'Department'}
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="例如：法律系、資科系、企管系"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {lang === 'zh' ? '年級 (Grade)' : 'Grade'}
                </label>
                <input
                  type="text"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="例如：大三、碩一、交換生"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {GRADE_SUGGESTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditYear(g)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] border cursor-pointer transition-colors ${
                        editYear === g
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {lang === 'zh' ? '常駐活動區域' : 'Frequent Area'}
                </label>
                <input
                  type="text"
                  value={editDormLocation}
                  onChange={(e) => setEditDormLocation(e.target.value)}
                  placeholder="例如：莊敬外舍、總圖、自強十舍"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {lang === 'zh' ? '主要校區定位' : 'Primary Campus Zone'}
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'downhill', label: lang === 'zh' ? '山下' : 'Downhill' },
                    { id: 'uphill', label: lang === 'zh' ? '山上' : 'Uphill' },
                    { id: 'dorms', label: lang === 'zh' ? '舍區' : 'Dorms' },
                  ].map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setEditZone(z.id as CampusZone)}
                      className={`py-2 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                        editZone === z.id
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {lang === 'zh' ? '自我介紹簡述 (選填)' : 'Short Bio (Optional)'}
              </label>
              <textarea
                rows={2}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="簡單介紹你的出沒時段、專長或平常可以幫忙的事項..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '儲存個人資料' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Metric Badges */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">
              {lang === 'zh' ? '信任指數' : 'Trust Score'}
            </span>
            <span className="text-base font-bold font-mono text-emerald-800 tabular-nums">
              ★{currentUser.trustScore}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">
              {lang === 'zh' ? '互助次數' : 'Help Count'}
            </span>
            <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
              {currentUser.helpCount} {lang === 'zh' ? '次' : ''}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">
              {lang === 'zh' ? '我的發布' : 'My Posts'}
            </span>
            <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
              {myPosts.length} {lang === 'zh' ? '筆' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Received Mutual Reviews Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>{lang === 'zh' ? '互助評價紀錄' : 'Received Reviews'}</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            {receivedReviews.length} {lang === 'zh' ? '則評價' : 'reviews'}
          </span>
        </div>

        {receivedReviews.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-[11px]">
            {lang === 'zh'
              ? '尚無評價紀錄。完成校園任務與互助並獲好評即可累積信任指數！'
              : 'No reviews yet. Complete campus orders to earn trust points!'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {receivedReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-900 truncate">{rev.reviewerName}</span>
                    {rev.taskTitle && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                        · {rev.taskTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="w-3 h-3 fill-amber-400 text-amber-500" />
                    ))}
                  </div>
                </div>

                {rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rev.tags.map((tg, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-medium"
                      >
                        {tg}
                      </span>
                    ))}
                  </div>
                )}

                {rev.comment && (
                  <p className="text-[11px] text-slate-700 leading-relaxed">{rev.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free-text Tutoring / Skills Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <span>
                {lang === 'zh' ? '欲認證輔導項目 / 專長能力' : 'Tutoring & Skills'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lang === 'zh'
                ? '自由輸入任何學科、檢定或實作技能；可另行上傳修課證明截圖加強信任度。'
                : 'Type any subject, certificate, or skill. Upload transcript proof optionally.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTranscriptVerify}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer shrink-0 text-[11px] flex items-center gap-1 border border-slate-200"
          >
            <Upload className="w-3 h-3" />
            <span>{lang === 'zh' ? '上傳修課截圖' : 'Upload Proof'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmitSkill} className="flex items-center gap-2">
          <input
            type="text"
            value={newSkillText}
            onChange={(e) => setNewSkillText(e.target.value)}
            placeholder={
              lang === 'zh'
                ? '自由輸入項目（如：微積分(甲)、日文 N1 檢定、羽球陪練）'
                : 'e.g. Calculus, JLPT N1, Badminton coaching...'
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!newSkillText.trim()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '新增' : 'Add'}</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {currentUser.canTutorSubjects.length === 0 ? (
            <span className="text-[11px] text-slate-400">
              {lang === 'zh' ? '尚未新增專長或輔導項目' : 'No skills added yet.'}
            </span>
          ) : (
            currentUser.canTutorSubjects.map((sub) => (
              <span
                key={sub}
                className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-medium"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{sub}</span>
                <button
                  type="button"
                  onClick={() => onRemoveTutorSkill(sub)}
                  className="text-emerald-700 hover:text-rose-600 rounded-full p-0.5 cursor-pointer transition-colors"
                  title={lang === 'zh' ? '移除此項目' : 'Remove'}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Editable Followed Tags */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-900">
            <Bell className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold">
              {lang === 'zh' ? '我的追蹤標籤' : 'Followed Tags'}
            </h3>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">
            {lang === 'zh' ? '即時同步大廳「追蹤推薦」' : 'Syncs with Feed'}
          </span>
        </div>

        <form onSubmit={handleSubmitTag} className="flex items-center gap-2">
          <input
            type="text"
            value={newTagText}
            onChange={(e) => setNewTagText(e.target.value)}
            placeholder={
              lang === 'zh'
                ? '+ 新增追蹤標籤（如：#法學院便當、#女宿衛生棉）'
                : '+ Add followed tag (e.g. #Leftovers, #Economics)...'
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!newTagText.trim()}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '追蹤' : 'Follow'}</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {currentUser.subscribedTags.length === 0 ? (
            <span className="text-[11px] text-slate-400">
              {lang === 'zh' ? '尚未追蹤任何標籤' : 'No followed tags yet.'}
            </span>
          ) : (
            currentUser.subscribedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-slate-900 text-white pl-3 pr-1.5 py-1 rounded-full text-[11px] font-mono font-medium"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFollowedTag(tag)}
                  className="p-0.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer transition-colors"
                  title={lang === 'zh' ? '移除追蹤' : 'Unfollow tag'}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* My Published Tasks & Full Edit/Delete Management */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-emerald-700" />
            <span>{lang === 'zh' ? '我的發布紀錄（快速管理）' : 'My Published Tasks'}</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            {lang === 'zh' ? '編輯、刪除、加價與延時' : 'Edit, Delete & Manage'}
          </span>
        </div>

        {myPosts.length === 0 ? (
          <div className="p-5 bg-slate-50 rounded-xl text-center text-slate-400 text-xs">
            {lang === 'zh' ? '尚未發布任何校園任務' : 'No published tasks yet.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {myPosts.map((post) => {
              const isExpired = post.status === 'expired' || post.status === 'refunded';
              const isClosed =
                post.status === 'completed' ||
                post.status === 'cancelled' ||
                post.status === 'closed';
              const displayTime =
                post.remainingMinutes !== undefined
                  ? formatRemainingMinutes(post.remainingMinutes, lang)
                  : post.timeRemainingText || post.expiresAt;
              const isQuotaCat = post.category === 'leftovers' || post.category === 'group_buy';
              const localizedLoc = localizeLocationName(
                post.locationName,
                lang,
                post.locationNameEn
              );

              return (
                <div
                  key={post.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => onSelectPost(post)}
                      className="min-w-0 cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isExpired
                              ? 'bg-slate-200 text-slate-600'
                              : isClosed
                                ? 'bg-emerald-100 text-emerald-800'
                                : post.status === 'in_progress'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isExpired
                            ? lang === 'zh'
                              ? '已過期'
                              : 'Expired'
                            : isClosed
                              ? lang === 'zh'
                                ? '已額滿 / 結案'
                                : 'Closed'
                              : post.status === 'in_progress'
                                ? lang === 'zh'
                                  ? '進行中'
                                  : 'In Progress'
                                : lang === 'zh'
                                  ? '大廳推流中'
                                  : 'Live in Feed'}
                        </span>
                        <span className="text-[11px] text-slate-500">{localizedLoc}</span>
                        {isQuotaCat && post.totalQuota !== undefined && post.totalQuota > 1 && (
                          <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            {lang === 'zh'
                              ? `剩 ${post.remainingQuota}/${post.totalQuota} 份`
                              : `${post.remainingQuota}/${post.totalQuota} left`}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs group-hover:underline line-clamp-1">
                        {lang === 'zh' ? post.title : post.titleEn || post.title}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-emerald-800 text-xs block tabular-nums">
                        {post.rewardAmount === 0
                          ? lang === 'zh'
                            ? '免費'
                            : 'Free'
                          : `NT$ ${post.rewardAmount}`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center justify-end gap-0.5 mt-0.5 tabular-nums">
                        <Clock className="w-3 h-3" />
                        {displayTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                    <span className="text-[10px] text-slate-400 truncate">
                      {formatPaymentMethodLabel(post.paymentMethod, lang)}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {!isClosed && (
                        <>
                          {isExpired ? (
                            <button
                              type="button"
                              onClick={() => onRepublishPost(post.id)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{lang === 'zh' ? '重新上架' : 'Republish'}</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onAddReward(post.id, 10)}
                                className="px-2 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] flex items-center gap-0.5 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{lang === 'zh' ? 'NT$10 加價' : '+NT$10'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onExtendTime(post.id, 30)}
                                className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] flex items-center gap-0.5 cursor-pointer transition-colors"
                              >
                                <Clock className="w-3 h-3" />
                                <span>{lang === 'zh' ? '+30m' : '+30m'}</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => onEditPost(post)}
                            className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>{lang === 'zh' ? '編輯' : 'Edit'}</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeletePost(post)}
                        className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === 'zh' ? '刪除' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preferred Payment Methods */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span>{lang === 'zh' ? '偏好收付款方式' : 'Preferred Payment Methods'}</span>
          </h3>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {(currentUser.boundPaymentGateways.length > 0
            ? currentUser.boundPaymentGateways
            : ['cash_meetup']
          ).map((gate) => (
            <span
              key={gate}
              className="px-3 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono font-semibold text-[11px]"
            >
              ✓{' '}
              {gate === 'line_pay'
                ? 'Line Pay'
                : gate === 'jko_pay'
                  ? lang === 'zh'
                    ? '街口支付'
                    : 'JKOPAY'
                  : gate === 'taiwan_pay'
                    ? lang === 'zh'
                      ? '台灣 Pay'
                      : 'Taiwan Pay'
                    : gate === 'cash_meetup'
                      ? lang === 'zh'
                        ? '面交現金'
                        : 'Cash'
                      : lang === 'zh'
                        ? '線下轉帳'
                        : 'Bank Transfer'}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">
          {lang === 'zh'
            ? '採用面交現金或轉帳後雙方於聊天室確認，不儲存銀行或第三方金流密碼。'
            : 'Offline cash or bank transfer confirmed directly by both students in chat.'}
        </p>
      </div>

      {/* Logout */}
      <div className="pt-2">
        <button
          onClick={onLogout}
          className="w-full py-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-2xl font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>
            {lang === 'zh'
              ? '登出帳號（返回政大學生登入驗證）'
              : 'Log Out (Return to NCCU Sign-In)'}
          </span>
        </button>
      </div>
    </div>
  );
};
