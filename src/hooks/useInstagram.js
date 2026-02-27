import { useState, useCallback } from 'react';

/**
 * Instagram 投稿用フック
 * JSON Body 方式を採用し、長い URL や動画(REELS)投稿に対応。
 * API Version: v21.0
 */
export function useInstagram(config, saveToCloud) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchInstagramPosts = useCallback(async () => {
        if (!config.instaToken) return;
        setLoading(true);
        try {
            const accountRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${config.instaToken}&fields=instagram_business_account`);
            const accountData = await accountRes.json();
            const businessId = accountData.data?.[0]?.instagram_business_account?.id;

            if (businessId) {
                if (config.instaBusinessId !== businessId) {
                    const updatedConfig = { ...config, instaBusinessId: businessId };
                    if (saveToCloud) await saveToCloud(updatedConfig, null);
                }

                const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${businessId}/media?access_token=${config.instaToken}&fields=id,caption,media_url,timestamp&limit=6`);
                const mediaData = await mediaRes.json();
                if (mediaData.data) setPosts(mediaData.data);
            } else {
                throw new Error("Instagram IDが取得できません");
            }
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [config, saveToCloud]);

    /**
     * フィード/リール投稿
     */
    const postToInstagram = useCallback(async (mediaUrl, caption, type = 'image') => {
        if (!config.instaBusinessId || !config.instaToken) throw new Error("Instagram連携未設定");
        if (!mediaUrl) throw new Error("メディアURLが必要です");

        const isVideo = type === 'video';

        // 1. コンテナ作成
        // IMAGE/REELS を明示的に指定する
        const payload = {
            caption: caption,
            access_token: config.instaToken // Bodyに含める
        };

        if (isVideo) {
            payload.media_type = 'REELS';
            payload.video_url = mediaUrl.trim();
        } else {
            payload.media_type = 'IMAGE'; // 明示的に指定
            payload.image_url = mediaUrl.trim();
        }

        const containerRes = await fetch(`https://graph.facebook.com/v21.0/${config.instaBusinessId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const cData = await containerRes.json();

        if (!cData.id || cData.error) {
            console.error("Insta Container Full Error:", cData);
            const err = cData.error || {};
            throw new Error(`Insta作成失敗: ${err.message || "不明"} (Code: ${err.code})`);
        }

        // 2. 処理完了待機
        let isReady = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://graph.facebook.com/v21.0/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
            const statusData = await statusRes.json();

            if (statusData.status_code === 'FINISHED') {
                isReady = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                console.error("Media Processing Full Error:", statusData);
                throw new Error(`Instagram処理エラー: ${statusData.status || "処理失敗"}`);
            }
        }

        if (!isReady) throw new Error("Instagram画像/動画処理タイムアウト");

        // 3. 公開
        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, {
            method: 'POST'
        });
        const pData = await publishRes.json();

        if (!publishRes.ok || pData.error) {
            console.error("Insta Publish Full Error:", pData);
            const err = pData.error || {};
            throw new Error(`Instagram公開失敗: ${err.message} (Code: ${err.code})`);
        }
        return true;
    }, [config]);

    /**
     * ストーリーズ投稿
     */
    const postStory = useCallback(async (mediaUrl, type = 'image') => {
        if (!config.instaBusinessId || !config.instaToken) throw new Error("Instagram連携未設定");
        if (!mediaUrl) throw new Error("メディアURLが必要です");

        const isVideo = type === 'video';
        const payload = {
            media_type: 'STORIES',
            access_token: config.instaToken
        };

        if (isVideo) {
            payload.video_url = mediaUrl.trim();
        } else {
            payload.image_url = mediaUrl.trim();
        }

        const containerRes = await fetch(`https://graph.facebook.com/v21.0/${config.instaBusinessId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const cData = await containerRes.json();

        if (!cData.id || cData.error) {
            console.error("Story Container Full Error:", cData);
            const err = cData.error || {};
            throw new Error(`ストーリー作成失敗: ${err.message} (Code: ${err.code})`);
        }

        let isReady = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://graph.facebook.com/v21.0/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
            const statusData = await statusRes.json();

            if (statusData.status_code === 'FINISHED') {
                isReady = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                console.error("Story Processing Full Error:", statusData);
                throw new Error(`ストーリー処理失敗: ${statusData.status}`);
            }
        }

        if (!isReady) throw new Error("ストーリー処理タイムアウト");

        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, {
            method: 'POST'
        });
        const pData = await publishRes.json();

        if (!publishRes.ok || pData.error) {
            console.error("Story Publish Full Error:", pData);
            const err = pData.error || {};
            throw new Error(`ストーリー公開失敗: ${err.message}`);
        }
        return true;
    }, [config]);

    return { posts, loading, fetchInstagramPosts, postToInstagram, postStory };
}
