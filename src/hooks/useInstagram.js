import { useState, useCallback } from 'react';

/**
 * Instagram 投稿用フック
 * JSON Body 方式を採用し、長い URL や動画(REELS)投稿に対応。
 * API Version: v22.0
 */
export function useInstagram(config, saveToCloud) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchInstagramPosts = useCallback(async () => {
        if (!config.instaToken) return;
        setLoading(true);
        try {
            // Business ID の取得
            const accountRes = await fetch(`https://graph.facebook.com/v22.0/me/accounts?access_token=${config.instaToken}&fields=instagram_business_account`);
            const accountData = await accountRes.json();
            const businessId = accountData.data?.[0]?.instagram_business_account?.id;

            if (businessId) {
                if (config.instaBusinessId !== businessId) {
                    const updatedConfig = { ...config, instaBusinessId: businessId };
                    if (saveToCloud) await saveToCloud(updatedConfig, null);
                }

                // 投稿一覧の取得
                const mediaRes = await fetch(`https://graph.facebook.com/v22.0/${businessId}/media?access_token=${config.instaToken}&fields=id,caption,media_url,timestamp&limit=6`);
                const mediaData = await mediaRes.json();
                if (mediaData.data) setPosts(mediaData.data);
            } else {
                throw new Error("Instagram IDが取得できません。FacebookページとInstagramの連携を確認してください。");
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
     * @param {string} mediaUrl - Firebase Storage の公開URL
     * @param {string} caption - キャプション
     * @param {string} type - 'image' | 'video'
     */
    const postToInstagram = useCallback(async (mediaUrl, caption, type = 'image') => {
        if (!config.instaBusinessId || !config.instaToken) throw new Error("Instagram連携未設定");
        if (!mediaUrl) throw new Error("メディアURLが必要です");

        if (caption.length > 2200) {
            throw new Error(`文字数オーバーです！(現在: ${caption.length}文字) 上限は2200文字です。`);
        }

        const isVideo = type === 'video';

        // 1. メディアコンテナの作成 (JSON Body方式)
        const payload = {
            access_token: config.instaToken,
            caption: caption,
        };

        if (isVideo) {
            payload.media_type = 'REELS';
            payload.video_url = mediaUrl;
        } else {
            payload.image_url = mediaUrl;
        }

        const containerRes = await fetch(`https://graph.facebook.com/v22.0/${config.instaBusinessId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const cData = await containerRes.json();

        if (!cData.id || cData.error) {
            console.error("Insta Container Error:", cData);
            throw new Error(`Instagram作成エラー: ${cData.error?.message || "ID取得失敗"}`);
        }

        // 2. メディアの処理完了を待機
        let isReady = false;
        for (let i = 0; i < 20; i++) { // 最大約40秒
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://graph.facebook.com/v22.0/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
            const statusData = await statusRes.json();

            if (statusData.status_code === 'FINISHED') {
                isReady = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                console.error("Media Processing Error:", statusData);
                throw new Error(`Instagram処理エラー: ${statusData.status || "処理失敗"}`);
            }
        }

        if (!isReady) {
            throw new Error("Instagram側での画像/動画処理がタイムアウトしました。");
        }

        // 3. 公開 (Publish)
        const publishRes = await fetch(`https://graph.facebook.com/v22.0/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, {
            method: 'POST'
        });
        const pData = await publishRes.json();

        if (!publishRes.ok || pData.error) {
            console.error("Insta Publish Error:", pData);
            throw new Error(`Instagram公開エラー: ${pData.error?.message || "公開失敗"}`);
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

        // 1. ストーリー用コンテナ作成
        const payload = {
            media_type: 'STORIES',
            access_token: config.instaToken
        };

        if (isVideo) {
            payload.video_url = mediaUrl;
        } else {
            payload.image_url = mediaUrl;
        }

        const containerRes = await fetch(`https://graph.facebook.com/v22.0/${config.instaBusinessId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const cData = await containerRes.json();

        if (!cData.id || cData.error) {
            console.error("Story Container Error:", cData);
            throw new Error(`ストーリー作成エラー: ${cData.error?.message || "ID取得失敗"}`);
        }

        // 2. 待機
        let isReady = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://graph.facebook.com/v22.0/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
            const statusData = await statusRes.json();

            if (statusData.status_code === 'FINISHED') {
                isReady = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                console.error("Story Processing Error:", statusData);
                throw new Error(`ストーリー処理エラー: ${statusData.status || "不明なエラー"}`);
            }
        }

        if (!isReady) throw new Error("ストーリー処理がタイムアウトしました。");

        // 3. 公開
        const publishRes = await fetch(`https://graph.facebook.com/v22.0/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, {
            method: 'POST'
        });
        const pData = await publishRes.json();

        if (!publishRes.ok || pData.error) {
            console.error("Story Publish Error:", pData);
            throw new Error(`ストーリー公開エラー: ${pData.error?.message || "公開失敗"}`);
        }
        return true;
    }, [config]);

    return { posts, loading, fetchInstagramPosts, postToInstagram, postStory };
}
