const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * postToGoogleBusiness (v2 Callable)
 * Google Business Profile API v4 へ投稿を代行するプロキシ関数。
 */
exports.postToGoogleBusiness = onCall({ region: "us-central1" }, async (request) => {
    // --- 1. パラメータ取得 ---
    const { accessToken, accountId, locationId, summary, mediaUrl, actionUrl } = request.data;

    // --- 2. バリデーション ---
    if (!accessToken || !accountId || !locationId || !summary) {
        throw new HttpsError(
            "invalid-argument",
            "必須パラメータが不足しています (accessToken, accountId, locationId, summary)"
        );
    }

    // --- 3. GBP API v4 へ投稿 ---
    try {
        const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

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

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        // --- 4. 安全なレスポンス処理 ---
        const responseText = await response.text();

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (_parseError) {
            // HTML 等の非 JSON レスポンスが返ってきた場合
            console.error("Non-JSON Response:", responseText.substring(0, 500));
            throw new HttpsError(
                "unknown",
                `Google API が予期しないレスポンスを返しました (HTTP ${response.status}): ${responseText.substring(0, 200)}`
            );
        }

        if (!response.ok) {
            console.error("Google API Error:", JSON.stringify(responseData));
            throw new HttpsError(
                "unknown",
                responseData.error?.message || `Google API エラー (HTTP ${response.status})`,
                responseData
            );
        }

        return { success: true, data: responseData };

    } catch (error) {
        console.error("Function Error:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message);
    }
});
