import { useState, useCallback } from 'react';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

export function useGoogle(config) {
    const [driveCount, setDriveCount] = useState(0);
    const [driveError, setDriveError] = useState("");
    const [driveFiles, setDriveFiles] = useState([]);

    const getFreshAccessToken = async () => {
        const params = new URLSearchParams({
            client_id: config.gClientId, client_secret: config.gClientSecret,
            refresh_token: config.gRefreshToken, grant_type: 'refresh_token'
        });
        const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
        const data = await res.json();
        if (!res.ok) {
            console.error("OAuth Error:", data);
            throw new Error(`Google認証エラー: ${data.error_description || data.error || "詳細不明"}`);
        }
        return data.access_token;
    };

    const fetchDriveFiles = useCallback(async (targetConfig = config) => {
        if (!targetConfig.driveFolderId || !targetConfig.geminiKey) return [];
        try {
            const query = `'${targetConfig.driveFolderId}' in parents and trashed = false and mimeType contains 'image/'`;
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,thumbnailLink,webContentLink,mimeType)&key=${targetConfig.geminiKey}`;
            const res = await fetch(url);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error?.message || res.statusText);
            }
            const data = await res.json();
            const files = data.files || [];
            setDriveFiles(files);
            setDriveCount(files.length);
            return files;
        } catch (e) {
            console.error("Drive Fetch Error:", e);
            setDriveError(e.message);
            return [];
        }
    }, [config]);

    const testDriveConnection = useCallback(async () => {
        setDriveError("");
        await fetchDriveFiles();
    }, [fetchDriveFiles]);

    const postToBusinessProfile = async (summary, mediaUrl) => {
        if (!config.accountId || !config.locationId) throw new Error("店舗IDを設定してください");

        if (summary.length > 1500) {
            throw new Error(`文字数オーバーです！現在の文字数: ${summary.length}文字\nGoogle投稿の上限は1500文字です。「記事作成・同時投稿」画面で文章を少し短く編集してから、もう一度ボタンを押してください。`);
        }

        const token = await getFreshAccessToken();

        try {
            const postFunction = httpsCallable(functions, 'postToGoogleBusiness');
            await postFunction({
                accessToken: token,
                locationId: config.locationId,
                summary: summary,
                mediaUrl: mediaUrl,
                actionUrl: "https://beauty.hotpepper.jp/slnH000667808/"
            });
            return true;
        } catch (error) {
            console.error("GBP Post Error:", error);
            throw new Error(`Google投稿エラー: ${error.message}`);
        }
    };

    const getFreshFileUrl = async (fileId) => {
        if (!config.geminiKey) return null;
        try {
            const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,thumbnailLink,webContentLink&key=${config.geminiKey}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            let finalUrl = data.thumbnailLink ? data.thumbnailLink.replace(/=s\d+.*$/, '=s0') : data.webContentLink;
            if (!finalUrl && data.id) finalUrl = `https://drive.google.com/thumbnail?id=${data.id}&sz=w4096`;

            console.log("Fresh Google URL Generated:", finalUrl);
            return finalUrl;
        } catch (e) {
            console.error("Drive Refresh Error:", e);
            return null;
        }
    };

    return {
        driveCount,
        driveError,
        driveFiles,
        fetchDriveFiles,
        testDriveConnection,
        postToBusinessProfile,
        getFreshFileUrl
    };
}
