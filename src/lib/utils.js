
/**
 * AI生成テキストをGoogleとInstagram用に分割する
 * @param {string} fullText 
 * @returns {{ google: string, instagram: string }}
 */
export const parseGeneratedContent = (fullText) => {
    if (!fullText) return { google: "", instagram: "" };

    // Default fallback (if markers are missing, return full text for both to avoid empty posts, but warn)
    let googleText = fullText;
    let instaText = fullText;

    // Split by markers
    const googleMarker = "【Google投稿】";
    const instaMarker = "【Instagram】";

    if (fullText.includes(googleMarker) && fullText.includes(instaMarker)) {
        // Extract Google part
        const googleStart = fullText.indexOf(googleMarker) + googleMarker.length;
        const instaStart = fullText.indexOf(instaMarker);

        // Google text is between Google marker and Instagram marker (or vice-versa depending on order)
        if (googleStart < instaStart) {
            googleText = fullText.substring(googleStart, instaStart).trim();
            instaText = fullText.substring(instaStart + instaMarker.length).trim();
        } else {
            // Instagram comes first? (Unlikely with current prompt but possible)
            const googlePart = fullText.substring(googleStart).trim();
            googleText = googlePart;
            instaText = fullText.substring(instaStart + instaMarker.length, fullText.indexOf(googleMarker)).trim();
        }
    }

    // Cleaning: Remove markdown bolding (**), section headers (###) if any remain
    const clean = (text) => text.replace(/\*\*/g, '').replace(/^###\s+/gm, '').trim();

    return {
        google: clean(googleText),
        instagram: clean(instaText)
    };
};
