import { useState, useCallback } from 'react';

/**
 * Instagram 投稿用フック
 * Cloud Functions プロキシ (getMedia) 方式を採用。
 * これにより Firebase Storage の複雑なURLを避け、Meta API のダウンロード失敗 (Code: 9004) を防ぐ。
 */
export function useInstagram(config, saveToCloud) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchInstagramPosts = useCallback(async () => {
        if (!config.instaToken) return;
        setLoading(true);
        try {
            const version = 'v19.0';
            const accountRes = await fetch(`https://graph.facebook.com/${version}/me/accounts?access_token=${config.instaToken}&fields=instagram_business_account`);
            const accountData = await accountRes.json();
            const businessId = accountData.data?.[0]?.instagram_business_account?.id;

            if (businessId) {
                if (businessId !== config.instaBusinessId) {
                    const updatedConfig = { ...config, instaBusinessId: businessId };
                    if (saveToCloud) await saveToCloud(updatedConfig, null);
                }

                const mediaRes = await fetch(`https://graph.facebook.com/${version}/${businessId}/media?access_token=${config.instaToken}&fields=id,caption,media_url,timestamp&limit=6`);
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
     * @param {string} mediaPath - Firebase Storage 内のパス (e.g., "posts/123.png")
     * @param {string} caption - キャプション
     * @param {string} type - 'image' | 'video'
     */
    const postToInstagram = useCallback(async (mediaPathOrUrl, caption, type = 'image') => {
        if (!config.instaBusinessId || !config.instaToken) throw new Error("Instagram連携未設定");
        if (!mediaPathOrUrl) throw new Error("メディアパスが必要です");

        let mediaPath = mediaPathOrUrl;

        // 安全策: もしフルURL (https://...) が渡された場合、パスへの変換を試みる
        if (mediaPathOrUrl.startsWith('http')) {
            try {
                // Firebase Storage URLからパス部分を抽出する試み
                // https://firebasestorage.googleapis.com/v0/b/.../o/posts%2F123.png?alt=media...
                const decodedUrl = decodeURIComponent(mediaPathOrUrl);
                const match = decodedUrl.match(/\/o\/(.+?)\?/);
                if (match && match[1]) {
                    mediaPath = match[1];
                }
            } catch (e) {
                console.warn("URL to Path conversion failed", e);
            }
        }

        const isVideo = type === 'video';

        // 1. メディアプロキシURLの構築
        // このプロキシ経由で Meta に画像を提供することで、Code 9004 エラーを回避する
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        const proxyBase = `https://us-central1-${projectId}.cloudfunctions.net/getMedia`;
        // Meta のパーサーを助けるためにダミーの拡張子を末尾に付加
        const proxyUrl = `${proxyBase}?path=${encodeURIComponent(mediaPath)}&ext=.${isVideo ? 'mp4' : 'png'}`;

        const params = new URLSearchParams();
        params.append('access_token', config.instaToken);
        params.append('caption', caption);

        if (isVideo) {
            params.append('media_type', 'REELS');
            params.append('video_url', proxyUrl);
        } else {
            // 画像投稿
            params.append('image_url', proxyUrl);
        }

        const version = 'v19.0';
        const containerRes = await fetch(`https://graph.facebook.com/${version}/${config.instaBusinessId}/media`, {
            method: 'POST',
            body: params
        });
        const cData = await containerRes.json();

        if (!cData.id || cData.error) {
            console.error("Insta Container Full Error:", cData);
            const err = cData.error || {};
            throw new Error(`Instaコンテナ作成失敗: ${err.message || "不明"} (Code: ${err.code}) URL: ${proxyUrl.substring(0, 50)}...`);
        }

        // 2. 待機
        let isReady = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://graph.facebook.com/${version}/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
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
        const publishRes = await fetch(`https://graph.facebook.com/${version}/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, {
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
    const postStory = useCallback(async (mediaPathOrUrl, type = 'image') => {
        if (!config.instaBusinessId || !config.instaToken) throw new Error("Instagram連携未設定");
        if (!mediaPathOrUrl) throw new Error("メディアパスが必要です");

        let mediaPath = mediaPathOrUrl;
        if (mediaPathOrUrl.startsWith('http')) {
            try {
                const decodedUrl = decodeURIComponent(mediaPathOrUrl);
                const match = decodedUrl.match(/\/o\/(.+?)\?/);
                if (match && match[1]) {
                    mediaPath = match[1];
                }
            } catch (e) {
                console.warn("URL to Path conversion failed", e);
            }
        }

        const isVideo = type === 'video';
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        const proxyBase = `https://us-central1-${projectId}.cloudfunctions.net/getMedia`;
        const proxyUrl = `${proxyBase}?path=${encodeURIComponent(mediaPath)}&ext=.${isVideo ? 'mp4' : 'png'}`;

        const params = new URLSearchParams();
        params.append('access_token', config.instaToken);
        params.append('media_type', 'STORIES');

        if (isVideo) {
            params.append('video_url', proxyUrl);
        } else {
            params.append('image_url', proxyUrl);
        }

        const version = 'v19.0';
        const containerRes = await fetch(`https://graph.facebook.com/${version}/${config.instaBusinessId}/media`, {
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
            const statusRes = await fetch(`https://graph.facebook.com/${version}/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
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

        const publishRes = await fetch(`https://graph.facebook.com/${version}/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, {
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
