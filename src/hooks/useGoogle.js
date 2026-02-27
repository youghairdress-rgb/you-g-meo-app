import { useState } from 'react';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Google Business Profile 投稿用フック
 * Drive 連携は廃止。GBP API への投稿ロジックのみ保持。
 */
export function useGoogle(config) {

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

    /**
     * GBP に投稿
     * @param {string} summary - 投稿テキスト
     * @param {string|null} mediaUrl - Firebase Storage の公開URL
     * @param {string} mediaType - "image" or "video"
     */
    const postToBusinessProfile = async (summary, mediaUrl = null, mediaType = 'image') => {
        if (!config.accountId || !config.locationId) throw new Error("店舗IDを設定してください");

        if (summary.length > 1500) {
            throw new Error(`文字数オーバーです！現在の文字数: ${summary.length}文字\nGoogle投稿の上限は1500文字です。`);
        }

        const token = await getFreshAccessToken();

        try {
            const postFunction = httpsCallable(functions, 'postToGoogleBusiness');
            await postFunction({
                accessToken: token,
                accountId: config.accountId,
                locationId: config.locationId,
                summary: summary,
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                actionUrl: "https://beauty.hotpepper.jp/slnH000667808/"
            });
            return true;
        } catch (error) {
            console.error("GBP Post Error:", error);
            throw new Error(`Google投稿エラー: ${error.message}`);
        }
    };

    return {
        postToBusinessProfile,
    };
}
