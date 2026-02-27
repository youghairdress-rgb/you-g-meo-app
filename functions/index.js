const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

exports.postToGoogleBusiness = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check (Optional but recommended)
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    // }

    const { accessToken, locationId, summary, mediaUrl, actionUrl } = data;

    if (!accessToken || !locationId || !summary) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: accessToken, locationId, or summary.');
    }

    try {
        const parent = `locations/${locationId}`;
        const url = `https://business.googleapis.com/v1/${parent}/localPosts`;

        const payload = {
            languageCode: "ja",
            summary: summary,
            topicType: "STANDARD",
            callToAction: {
                actionType: "BOOK",
                url: actionUrl || "https://beauty.hotpepper.jp/slnH000667808/"
            },
            media: mediaUrl ? [{ mediaFormat: "PHOTO", sourceUrl: mediaUrl }] : []
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google API Error:", JSON.stringify(errorData));
            throw new functions.https.HttpsError('unknown', errorData.error?.message || 'Google API Request Failed', errorData);
        }

        const result = await response.json();
        return { success: true, data: result };

    } catch (error) {
        console.error("Function Error:", error);
        // Re-throw HttpsError as is, or wrap others
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', error.message);
    }
});
