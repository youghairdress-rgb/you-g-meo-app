export const DEFAULT_CONFIG = {
    geminiKey: import.meta.env.VITE_GEMINI_KEY || "",
    instaToken: import.meta.env.VITE_INSTAGRAM_TOKEN || "",
    gClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    gClientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "",
    gRefreshToken: import.meta.env.VITE_GOOGLE_REFRESH_TOKEN || "",
    driveFolderId: import.meta.env.VITE_DRIVE_FOLDER_ID || "",
    accountId: import.meta.env.VITE_ACCOUNT_ID || "",
    locationId: import.meta.env.VITE_LOCATION_ID || "",
    instaBusinessId: "" // Will be fetched automatically
};
