const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * postToGoogleBusiness (v2 Callable)
 * フロントエンドから httpsCallable で呼び出される。
 * Google Business Profile API へ投稿を代行するプロキシ関数。
 */
exports.postToGoogleBusiness = onCall({ region: "us-central1" }, async (request) => {
    // --- 1. パラメータ取得 ---
    const { accessToken, locationId, summary, mediaUrl, actionUrl } = request.data;

    // --- 2. バリデーション ---
    if (!accessToken || !locationId || !summary) {
        throw new HttpsError(
            "invalid-argument",
            "必須パラメータが不足しています (accessToken, locationId, summary)"
        );
    }

    // --- 3. GBP API へ投稿 ---
    try {
        const parent = `locations/${locationId}`;
        const url = `https://business.googleapis.com/v1/${parent}/localPosts`;

        const payload = {
            languageCode: "ja",
            summary: summary,
            topicType: "STANDARD",
            callToAction: {
                actionType: "BOOK",
                url: actionUrl || "https://beauty.hotpepper.jp/slnH000667808/",
            },
            media: mediaUrl
                ? [{ mediaFormat: "PHOTO", sourceUrl: mediaUrl }]
                : [],
        };

        // Node 18 の組み込み fetch を使用（node-fetch 不要）
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google API Error:", JSON.stringify(errorData));
            throw new HttpsError(
                "unknown",
                errorData.error?.message || "Google API リクエストに失敗しました",
                errorData
            );
        }

        const result = await response.json();
        return { success: true, data: result };

    } catch (error) {
        console.error("Function Error:", error);
        // HttpsError はそのまま再スロー、それ以外はラップ
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message);
    }
});
