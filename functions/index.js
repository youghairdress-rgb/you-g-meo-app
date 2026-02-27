const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * postToGoogleBusiness (v2 Callable)
 * Google Business Profile API v4 へ投稿を代行するプロキシ関数。
 * Firebase Storage の公開URLをそのまま GBP API に渡すシンプル構成。
 */
exports.postToGoogleBusiness = onCall({ region: "us-central1" }, async (request) => {
    // --- 1. パラメータ取得 ---
    const { accessToken, accountId, locationId, summary, mediaUrl, mediaType, actionUrl } = request.data;

    // --- 2. バリデーション ---
    if (!accessToken || !accountId || !locationId || !summary) {
        throw new HttpsError(
            "invalid-argument",
            "必須パラメータが不足しています (accessToken, accountId, locationId, summary)"
        );
    }

    try {
        // --- 3. ペイロード構築 ---
        // ID のサニタイズ (accounts/ や locations/ プレフィックスが重複しないようにする)
        const cleanAccountId = accountId.includes("/") ? accountId.split("/").pop().trim() : accountId.trim();
        const cleanLocationId = locationId.includes("/") ? locationId.split("/").pop().trim() : locationId.trim();

        const url = `https://mybusiness.googleapis.com/v4/accounts/${cleanAccountId}/locations/${cleanLocationId}/localPosts`;

        const payload = {
            languageCode: "ja",
            summary: summary.trim(),
            topicType: "STANDARD",
            callToAction: {
                actionType: "BOOK",
                url: (actionUrl || "https://beauty.hotpepper.jp/slnH000667808/").trim(),
            },
        };

        // メディアがあれば追加
        if (mediaUrl) {
            const mediaFormat = mediaType === "video" ? "VIDEO" : "PHOTO";
            payload.media = [{ mediaFormat, sourceUrl: mediaUrl.trim() }];
        }

        console.log(`GBP 投稿開始: URL=${url}`);
        console.log("ペイロード:", JSON.stringify(payload));

        // --- 4. GBP API へ送信 ---
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        // --- 5. 安全なレスポンス処理 ---
        const responseText = await response.text();

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (_parseError) {
            console.error("Non-JSON Response:", responseText.substring(0, 500));
            throw new HttpsError(
                "unknown",
                `Google API が予期しないレスポンスを返しました (HTTP ${response.status}): ${responseText.substring(0, 200)}`
            );
        }

        if (!response.ok) {
            // エラー詳細を深くログに出力
            console.error("Google API Error Full Response:", JSON.stringify(responseData, null, 2));

            const errorMessage = responseData.error?.message || `Google API エラー (HTTP ${response.status})`;
            const errorDetails = responseData.error?.details || [];

            throw new HttpsError(
                "invalid-argument", // 400 の場合は明示的に invalid-argument に寄せる
                `${errorMessage} (詳細は関数ログを確認してください)`,
                { error: responseData.error }
            );
        }

        return { success: true, data: responseData };

    } catch (error) {
        console.error("Function Error:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message);
    }
});

/**
 * getMedia (v2 Https)
 * Meta/Instagramのスクレイパー向けに、Firebase Storageのファイルを
 * クリーンなURL（クエリパラメータ無しの .png / .mp4 形式に見えるURL）で提供するプロキシ。
 */
exports.getMedia = onRequest({ region: "us-central1", cors: true, invoker: 'public' }, async (req, res) => {
    const filePath = req.query.path;
    if (!filePath) {
        return res.status(400).send("Path missing");
    }

    try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);

        const [exists] = await file.exists();
        if (!exists) {
            console.warn(`File not found: ${filePath}`);
            return res.status(404).send("File not found");
        }

        const [metadata] = await file.getMetadata();

        // ブラウザやMetaが正しく認識できるようヘッダーを設定
        res.setHeader("Content-Type", metadata.contentType || "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=3600");

        // ストリームで転送
        file.createReadStream().pipe(res);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).send("Internal Server Error");
    }
});
