import { useState, useCallback } from 'react';

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
                if (config.instaBusinessId !== businessId) {
                    // Sync new ID back to settings
                    const updatedConfig = { ...config, instaBusinessId: businessId };
                    if (saveToCloud) await saveToCloud(updatedConfig, null);
                }

                const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}/media?access_token=${config.instaToken}&fields=id,caption,media_url,timestamp&limit=6`);
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

    const postToInstagram = useCallback(async (imageUrl, caption) => {
        if (!config.instaBusinessId || !config.instaToken) throw new Error("Instagram連携未設定");
        if (!imageUrl) throw new Error("画像が必要です");

        // Character limit check (2200 chars for Instagram)
        if (caption.length > 2200) {
            throw new Error(`文字数オーバーです！現在の文字数: ${caption.length}文字\nInstagram投稿の上限は2200文字です。「記事作成・同時投稿」画面でInstagram用の文章を短く編集してください。`);
        }

        // Container
        const container = await fetch(`https://graph.facebook.com/v19.0/${config.instaBusinessId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${config.instaToken}`, { method: 'POST' });
        const cData = await container.json();

        if (!cData.id || cData.error) {
            console.error("Insta Container Error:", cData);
            throw new Error(`Insta作成エラー: ${cData.error?.message || "ID取得失敗"}`);
        }

        // Wait for container to be ready (Media Status)
        let isReady = false;
        for (let i = 0; i < 15; i++) { // Max ~30s
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://graph.facebook.com/v19.0/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
            const statusData = await statusRes.json();

            if (statusData.status_code === 'FINISHED') {
                isReady = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                console.error("Media Processing Error:", statusData);
                throw new Error(`Insta画像処理エラー: ${statusData.status || "不明なエラー"}`);
            }
        }

        if (!isReady) {
            throw new Error("Insta画像処理がタイムアウトしました。しばらく待ってから再試行してください。");
        }

        // Publish
        const publish = await fetch(`https://graph.facebook.com/v19.0/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, { method: 'POST' });
        const pData = await publish.json();

        if (!publish.ok || pData.error) {
            console.error("Insta Publish Error:", pData);
            throw new Error(`Insta公開エラー: ${pData.error?.message || "公開失敗"}`);
        }
        return true;
    }, [config]);

    const postStory = useCallback(async (imageUrl, caption = "") => {
        if (!config.instaBusinessId || !config.instaToken) throw new Error("Instagram連携未設定");
        if (!imageUrl) throw new Error("画像が必要です");

        // Container (STORY type)
        // Use JSON body to ensure media_type is respected
        const container = await fetch(`https://graph.facebook.com/v21.0/${config.instaBusinessId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: imageUrl,
                media_type: 'STORIES',
                access_token: config.instaToken
            })
        });

        const cData = await container.json();

        if (!cData.id || cData.error) {
            console.error("Story Container Error:", cData);
            throw new Error(`ストーリー作成エラー: ${cData.error?.message || "ID取得失敗"}`);
        }

        // Wait for container to be ready
        let isReady = false;
        for (let i = 0; i < 15; i++) { // Max ~30s
            await new Promise(r => setTimeout(r, 2000));
            // Check status (v21.0)
            const statusRes = await fetch(`https://graph.facebook.com/v21.0/${cData.id}?access_token=${config.instaToken}&fields=status_code,status`);
            const statusData = await statusRes.json();

            if (statusData.status_code === 'FINISHED') {
                isReady = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                console.error("Story Media Processing Error:", statusData);
                throw new Error(`ストーリー画像処理エラー: ${statusData.status || "不明なエラー"}`);
            }
        }

        if (!isReady) {
            throw new Error("ストーリー画像処理がタイムアウトしました。");
        }

        // Publish (v21.0)
        const publish = await fetch(`https://graph.facebook.com/v21.0/${config.instaBusinessId}/media_publish?creation_id=${cData.id}&access_token=${config.instaToken}`, { method: 'POST' });
        const pData = await publish.json();

        if (!publish.ok || pData.error) {
            console.error("Story Publish Error:", pData);
            throw new Error(`ストーリー公開エラー: ${pData.error?.message || "公開失敗"}`);
        }
        return true;
    }, [config]);

    return { posts, loading, fetchInstagramPosts, postToInstagram, postStory };
}
