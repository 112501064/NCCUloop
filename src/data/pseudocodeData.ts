export interface AlgorithmDoc {
  id: string;
  title: string;
  category: string;
  mathFormula?: string;
  description: string;
  pseudocode: string;
  keyHighlights: string[];
}

export const AI_ALGORITHMS: AlgorithmDoc[] = [
  {
    id: 'algo_female_dorm_guardrail',
    title: '1. 女宿進入與急救任務 AI 門檻安全審核 (Female Dorm Safe-Zone Guardrail)',
    category: '安全防護 & 門檻判定',
    description: '當任務指定地點為女宿（莊敬一/二/三舍、自強十舍女宿區等）或含有女性私密用品（如衛生棉急救）時，系統發動零容忍審核，僅允許具備女宿通行資格與高信任分的女性驗證帳號接單。',
    mathFormula: 'Gate(u, p) = (IsFemale(u) ∧ Verified(u)) ∧ (Trust(u) \\ge 70) ∧ (RiskScore_{NLP}(p) < 0.2)',
    pseudocode: `/**
 * Algorithm 1: Female Dorm Access & Sensitive SOS Security Guardrail
 * Input:
 *   - user: Current authenticated applicant (UserProfile)
 *   - post: Target emergency task (PostItem)
 * Output:
 *   - Decision: { allowed: boolean, reasonCode: string, auditLog: object }
 */

FUNCTION ValidateFemaleDormTaskAccess(user: UserProfile, post: PostItem) -> GuardrailResult:
    
    // Step 1: 檢查該任務是否含有女宿限定或敏感關鍵字
    isSensitiveTask = post.femaleOnlyRestricted OR 
                      IsFemaleDormLocation(post.locationName) OR 
                      ContainsSensitiveKeywords(post.title, post.tags, ["衛生棉", "女宿", "二樓交誼廳"])

    IF NOT isSensitiveTask:
        // 一般非敏感任務，僅需通過一般信任分檢查
        IF user.trustScore < post.minTrustScoreRequired:
            RETURN Result(allowed=FALSE, reason="TRUST_SCORE_BELOW_POST_MINIMUM")
        RETURN Result(allowed=TRUE, reason="PUBLIC_TASK_APPROVED")

    // Step 2: 嚴格核對用戶性別與學籍驗證狀態
    IF NOT user.isVerifiedStudent:
        LogSecurityAudit(user.id, post.id, "REJECTED_UNVERIFIED_STUDENT")
        RETURN Result(allowed=FALSE, reason="REQUIRES_VERIFIED_NCCU_STUDENT_STATUS")

    IF user.gender != "female":
        // 任何非女性身分者嘗試接取女宿內部求救任務，立即阻擋並記錄審計日誌
        LogSecurityAudit(user.id, post.id, "BLOCKED_GENDER_MISMATCH_DORM_RESTRICTION")
        RETURN Result(
            allowed=FALSE, 
            reason="FEMALE_DORM_ACCESS_RESTRICTED: 本任務涉及女生宿舍區域或隱私物資，僅限政大女宿認證女同學接單協助。"
        )

    // Step 3: 信任分防護門檻判定 (防止新創空號或糾紛帳號進入女宿)
    FEMALE_DORM_MIN_TRUST = 70
    IF user.trustScore < FEMALE_DORM_MIN_TRUST:
        LogSecurityAudit(user.id, post.id, "REJECTED_LOW_TRUST_SCORE")
        RETURN Result(
            allowed=FALSE, 
            reason="TRUST_SCORE_INSUFFICIENT: 涉及宿舍安全任務，接單者信任履歷分數須達 70 分以上。"
        )

    // Step 4: NLP 詐騙與惡意騷擾探測 (Prompt Injection & Anomaly Detection)
    riskScore = AI_NLP_EvaluateSafety(post.description, user.id)
    IF riskScore > 0.35:
        FlagForAdminReview(post.id)
        RETURN Result(allowed=FALSE, reason="FLAGGED_SAFETY_ANOMALY")

    // 通過全部審核，核發暫時性一次性交接驗證碼 (Handshake OTP)
    handshakeOTP = GenerateCryptographicOTP(user.id, post.id, ttl_minutes=30)
    LogSecurityAudit(user.id, post.id, "APPROVED_FEMALE_DORM_ACCESS")
    
    RETURN Result(allowed=TRUE, reason="ACCESS_GRANTED", otp=handshakeOTP)`,
    keyHighlights: [
      '政大 Webmail 雙重驗證 + 學籍性別欄位強制綁定，阻絕虛擬偽造帳號',
      '信任分門檻強制過濾（< 70 分禁止接單進入女宿）',
      '阻擋事件即時寫入 ai_verification_audits，支援防騷擾頻率限制（Rate-limiting）',
    ],
  },
  {
    id: 'algo_trust_score_engine',
    title: '2. 動態信任履歷評分模型 (Dynamic Trust Score Algorithm)',
    category: '信譽模型 & 風險防護',
    description: '量化學生在平台上的歷史履約表現、評價品質與違規紀錄，並給予時間衰減懲罰與防刷單機制。高單價或敏感任務需高於指定門檻。',
    mathFormula: 'Score = \\min\\Big(100, \\max\\big(0, S_{base} + 35 \\cdot R_{fulfill} + 25 \\cdot \\frac{AvgRating}{5} + B_{volume} - 15 \\cdot N_{dispute} - 5 \\cdot N_{cancel}\\big)\\Big)',
    pseudocode: `/**
 * Algorithm 2: Dynamic Campus Trust Score Engine
 * Invoked: Upon task completion, cancellation, review submission, or dispute verdict.
 */

FUNCTION CalculateUserTrustScore(userId: UUID) -> TrustScoreResult:
    user = DB.Users.FindById(userId)
    history = DB.TaskFulfillments.GetCompletedByUser(userId)
    disputes = DB.Disputes.GetUpheldAgainstUser(userId)
    reviews = DB.Reviews.GetForUser(userId)

    // 1. 基礎驗證分 (政大學生身分認證保障)
    baseScore = user.isVerifiedStudent ? 30.0 : 10.0

    // 2. 履約率得分 (最高 35 分)
    // 考量冷啟動平滑化 (Laplace Smoothing) 避免新用戶 1 次成功就得 100%
    totalAccepted = history.totalCount + history.userCancelledCount
    IF totalAccepted == 0:
        fulfillmentRate = 1.0 // 預設滿履約
    ELSE:
        // 拉普拉斯平滑: (完成次數 + 2) / (總接單數 + 2)
        fulfillmentRate = (history.completedCount + 2.0) / (totalAccepted + 2.0)
    fulfillmentScore = 35.0 * fulfillmentRate

    // 3. 雙方互評評分平均 (最高 25 分)
    IF reviews.count == 0:
        ratingScore = 20.0 // 新人預設 4.0 星相當分數
    ELSE:
        avgStars = reviews.sumStars / reviews.count // 1.0 - 5.0
        ratingScore = 25.0 * (avgStars / 5.0)

    // 4. 歷史交易量信用累積加成 (最高 10 分)
    // 依對數曲線遞增，防止大量小額洗單刷分 (Logarithmic Anti-Farming)
    volumeBonus = Math.min(10.0, Math.log2(history.completedCount + 1) * 2.0)

    // 5. 違規與放鴿子扣分項 (Penalty)
    // 成立之檢舉案每次重扣 15 分；主動惡意取消任務扣 5 分
    penalty = (disputes.count * 15.0) + (history.userCancelledCount * 5.0)

    rawScore = baseScore + fulfillmentScore + ratingScore + volumeBonus - penalty
    finalScore = Math.round(Math.max(0.0, Math.min(100.0, rawScore)))

    // 6. 風險等級劃分
    isHighRisk = (finalScore < 60) OR (disputes.count >= 2)

    DB.AITrustScores.Upsert({
        userId: userId,
        overallScore: finalScore,
        fulfillmentRate: fulfillmentRate,
        isHighRiskFlagged: isHighRisk,
        lastCalculatedAt: Now(),
        calculationBreakdown: {
            base: baseScore,
            fulfillment: fulfillmentScore,
            rating: ratingScore,
            volumeBonus: volumeBonus,
            penalty: penalty
        }
    })

    RETURN { score: finalScore, isHighRisk: isHighRisk }`,
    keyHighlights: [
      '拉普拉斯平滑（Laplace Smoothing）解決冷啟動過度波動問題',
      '對數交易量加成（Logarithmic Volume Bonus）嚴防互刷小額衝分',
      '糾紛成立即時階梯重扣，低於 60 分觸發高風險鎖定，限制接單權限',
    ],
  },
  {
    id: 'algo_smart_feed_ranking',
    title: '3. 校園拓撲與畫像智慧推流演算法 (NCCU Topography & Profile Smart Feed)',
    category: '智慧推流 & 推薦演算法',
    description: '針對政大獨特「山下（商院/莊敬舍）↔ 山上（季陶樓/綜合院館/自強舍）」高差 80m-110m 拓撲環境，結合任務緊急程度、空閒時間、用戶畫像與交通工具進行綜合排序。',
    mathFormula: 'RankScore(p, u) = w_1 \\cdot Sim(Tags_p, Profile_u) + w_2 \\cdot \\frac{1}{1 + D_{topo}(p, u)} + w_3 \\cdot Urgency(p) + w_4 \\cdot Trust(p_{author})',
    pseudocode: `/**
 * Algorithm 3: NCCU Topography-Aware Feed Ranking
 * Generates personalized post feed for the student on the app home screen.
 */

FUNCTION GeneratePersonalizedCampusFeed(user: UserProfile, candidatePosts: List<PostItem>) -> List<ScoredPost>:
    scoredList = []

    FOR post IN candidatePosts:
        // 排除已完成或非開放之任務
        IF post.status != "open":
            CONTINUE

        // 排除當前用戶不符合硬性條件之任務 (如女宿限制但用戶為男性)
        IF post.femaleOnlyRestricted AND user.gender != "female":
            CONTINUE
        IF user.trustScore < post.minTrustScoreRequired:
            CONTINUE

        // 1. 地理與海拔高差懲罰函數 (Topography & Elevation Delta)
        // 政大山下(25m) 到 山上(110m) 攀爬體力消耗極大
        spatialDistance = HaversineDistance(user.coordinates, post.coordinates) // 公里
        elevationDelta = Math.abs(user.elevation - post.elevationMeters) // 公尺

        IF user.hasScooter:
            // 擁有機車用戶對海拔差敏感度大幅降低 (乘載力強)
            topoEffort = spatialDistance + (elevationDelta / 800.0)
        ELSE:
            // 步行或等校車用戶，高差給予重罰 (跨越山上山下需等巡迴公車)
            topoEffort = spatialDistance + (elevationDelta / 120.0)

        geoScore = 1.0 / (1.0 + topoEffort) // 0.0 - 1.0

        // 2. 標籤與個人興趣/專長語意契合度 (Vector & Keyword Affinity)
        matchedTagsCount = Intersect(post.tags, user.subscribedTags).length
        tagBonus = Math.min(1.0, matchedTagsCount * 0.35)

        // 3. 專長與修課匹配 (如家教/課本借用正好修過相同課程代碼)
        skillBonus = 0.0
        IF post.requiredSubjectCourseCode != NULL:
            IF post.requiredSubjectCourseCode IN user.verifiedCourseCodes:
                skillBonus = 0.8 // 強力推薦給修過該課的高分學長姊

        // 4. 時間急迫性指數 (Urgency Boost)
        // 緊急求救 (衛生棉/緊急列印) 權重指數型提升
        urgencyWeight = 0.0
        IF post.category == "emergency":
            minutesLeft = (post.expiresAt - Now()).toMinutes()
            urgencyWeight = Math.max(0.5, 2.5 * Math.exp(-minutesLeft / 30.0))

        // 5. 綜合推薦排序得分 (Final Weighted Sum)
        finalRankScore = (0.35 * geoScore) + 
                         (0.25 * tagBonus) + 
                         (0.20 * skillBonus) + 
                         (0.20 * urgencyWeight)

        scoredList.Append({ post: post, rankScore: finalRankScore, geoEffort: topoEffort })

    // 依分數降序排列，提供即時推播與 Feed 首頁
    RETURN SortDescendingBy(scoredList, key="rankScore")`,
    keyHighlights: [
      '政大校園垂直海拔高差 (Elevation Delta) 懲罰函數，符合政大依山傍水地理實情',
      '動態辨識學生是否備有机車 (Scooter)，若有車則優化山上跨區任務分派',
      '緊急求救類別（如女宿衛生棉、緊急列印）具時間指數衰減之最高優先級 Boost',
    ],
  },
  {
    id: 'algo_escrow_auto_refund',
    title: '4. 履約保障與超時預扣款自動全額退款排程 (Escrow Timeout & Refund Worker)',
    category: '分散式金流 & 履約機制',
    description: '保障發布者資金安全。當任務設定之時限過期且無人接單，或發布者取消、或團購未達門檻，分散式排程器立即發動冪等第三方金流全額退款（無平台手續費）。',
    mathFormula: 'RefundCondition = (Status == \'open\' \\land Now() > ExpiresAt) \\lor (CancelByAuthor == TRUE)',
    pseudocode: `/**
 * Algorithm 4: Distributed Escrow Auto-Refund & Settlement Worker
 * Managed via: BullMQ Cron Worker + Redis Redlock
 * Frequency: Scans every 60 seconds
 */

FUNCTION ProcessExpiredEscrowWorker():
    // Step 1: 取得分散式鎖，確保多個 Pod/Worker 不會重複觸發退款
    lockKey = "lock:escrow:auto_refund_batch"
    redisLock = AcquireRedlock(lockKey, ttl_seconds=30)
    IF NOT redisLock.success:
        Log("Worker skipped: another node is processing.")
        RETURN

    TRY:
        // Step 2: 查詢所有已逾期但仍處於 open 狀態且款項為 held 之貼文
        expiredPosts = DB.Posts.Query("""
            SELECT p.id, p.title, p.creator_id, e.id AS escrow_id, e.gross_amount, 
                   e.gateway_transaction_id, e.payment_method
            FROM posts p
            JOIN escrow_transactions e ON p.id = e.post_id
            WHERE p.status = 'open' 
              AND p.expires_at <= NOW()
              AND e.status = 'held'
            FOR UPDATE SKIP LOCKED; -- 避免並發競爭
        """)

        FOR item IN expiredPosts:
            DB.Transaction(FUNCTION(tx):
                // Step 3: 更新貼文狀態為 EXPIRED，防止有人同時接單
                tx.Posts.Update(item.id, { status: "expired" })

                // Step 4: 呼叫第三方金流退款 API (Line Pay / 綠界 / 街口)
                refundPayload = {
                    transactionId: item.gateway_transaction_id,
                    refundAmount: item.gross_amount, // 全額退款 (無扣除任何手續費)
                    refundReason: "NCCU_TASK_TIMEOUT_NO_FULFILLMENT_AUTO_REFUND",
                    idempotencyKey: "REFUND_" + item.escrow_id
                }

                gatewayResponse = PaymentGateway.ExecuteRefund(item.payment_method, refundPayload)

                IF gatewayResponse.isSuccess:
                    // Step 5: 更新金融帳本為 REFUNDED
                    tx.EscrowTransactions.Update(item.escrow_id, {
                        status: "refunded",
                        refundedAt: Now(),
                        refundReason: "超時未有人接單，系統自動全額原路退款",
                        autoRefundWorkerId: "WORKER_POD_01"
                    })

                    // Step 6: 發送退款成功推播通知與 Email 給發文學生
                    NotificationService.SendPush(item.creator_id, {
                        title: "【退款成功通知】您的互助任務已全額退款",
                        body: Format("任務「%s」因超時未有同學接單，預扣款 NT$%d 已退回您的 %s。", 
                                     item.title, item.gross_amount, item.payment_method)
                    })
                ELSE:
                    // 金流介接失敗，寫入警報進入人工稽核隊列 (Dead Letter Queue)
                    tx.Rollback()
                    AlertFinancialOps(item.escrow_id, gatewayResponse.errorMessage)
            )
    FINALLY:
        ReleaseRedlock(redisLock)`,
    keyHighlights: [
      'PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` 杜絕多節點競爭',
      '嚴格原路全額退款（無平台手續費），保障政大學生權益',
      '整合 Line Pay / 綠界 冪等金鑰（Idempotency Key），防止重複退款',
    ],
  },
];
