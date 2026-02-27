import { useState, useCallback } from 'react';

export function useGoogleDrive(config) {
    const [driveFiles, setDriveFiles] = useState([]);
    const [loading, setLoading] = useState(false);

    const getFreshAccessToken = async () => {
        const params = new URLSearchParams({
            client_id: config.gClientId,
            client_secret: config.gClientSecret,
            refresh_token: config.gRefreshToken,
            grant_type: 'refresh_token'
        });
        const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
        const data = await res.json();
        if (!res.ok) throw new Error("Drive Token Error: " + (data.error_description || data.error));
        return data.access_token;
    };

    const fetchDriveFiles = useCallback(async () => {
        if (!config.gRefreshToken) return;
        setLoading(true);
        try {
            const token = await getFreshAccessToken();
            const folderId = import.meta.env.VITE_DRIVE_FOLDER_ID;

            // フォルダ内の画像・動画ファイルを最新順に取得
            const query = `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`;
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&orderBy=createdTime desc&pageSize=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.files) {
                const formatted = data.files.map(f => ({
                    id: f.id,
                    name: f.name,
                    mimeType: f.mimeType,
                    mediaType: f.mimeType.startsWith('video/') ? 'video' : 'image',
                    // 高解像度のサムネイル
                    thumbnail: f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+.*$/, '=s0') : null,
                    // Instagram投稿に使用する直接URL
                    url: f.webContentLink || `https://drive.google.com/uc?id=${f.id}&export=download`
                }));
                setDriveFiles(formatted);
            }
        } catch (error) {
            console.error("Drive Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    }, [config]);

    return { driveFiles, loading, fetchDriveFiles };
}
