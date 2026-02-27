import { useState, useCallback } from 'react';

/**
 * Instagram 投稿用フック
 * URLSearchParams 方式を採用し、安定性を極限まで高めた実装。
 * API Version: v19.0 (実績重視)
 */
export function useInstagram(config, saveToCloud) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchInstagramPosts = useCallback(async () => {
        if (!config.instaToken) return;
        setLoading(true);
        try {
            const accountRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${config.instaToken}&fields=instagram_business_account`);
            const accountData = await accountRes.json();
            const businessId = accountData.data?.[0]?.instagram_business_account?.id;

            if (businessId) {
                if (businessId !== config.instaBusinessId) {
                    const updatedConfig = { ...config, instaBusinessId: businessId };
                    if (saveToCloud) await saveToCloud(updatedConfig, null);
                }

                const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}/media?access_token=${config.instaToken}&fields=id,caption,media_url,timestamp&limit=6`);
                const mediaData = await mediaRes.json();
                if (mediaData.data) setPosts(mediaData.data);
            }
        } catch (error) {
            console.error(error);
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

        // 1. コンテナ作成 (URLSearchParams方式)
        const params = new URLSearchParams();
        params.append('access_token', config.instaToken);
        params.append('caption', caption);

        if (isVideo) {
            params.append('media_type', 'REELS');
            params.append('video_url', mediaUrl.trim());
        } else {
            // フィード画像の場合は media_type を省略（Code 9004 回避）
            params.append('image_url', mediaUrl.trim());
        }

        const containerRes = await fetch(`https://graph.facebook.com/v19.0/${config.instaBusinessId}/media`, {
            method: 'POST',
            body: params
        });
        const cData = await containerRes.json();

        if (!cData.id || cData.error) {
            console.error("Insta Container Full Error:", cData);
            const err = cData.error || {};
            throw new Error(`Insta作成失敗: ${err.message || "不明"} (Code: ${err.code})`);
        }

        // 2. 待機
        let isReady = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://graph.facebook.com/v19.0/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
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

        if (!isReady) throw new Error("Instagram処理タイムアウト");

        // 3. 公開
        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, {
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
        const params = new URLSearchParams();
        params.append('access_token', config.instaToken);
        params.append('media_type', 'STORIES');

        if (isVideo) {
            params.append('video_url', mediaUrl.trim());
        } else {
            params.append('image_url', mediaUrl.trim());
        }

        const containerRes = await fetch(`https://graph.facebook.com/v19.0/${config.instaBusinessId}/media`, {
            method: 'POST',
            body: params
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
            const statusRes = await fetch(`https://graph.facebook.com/v19.0/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
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

        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, {
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
