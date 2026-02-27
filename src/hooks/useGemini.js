import { useState } from 'react';
import { SYSTEM_PROMPT_BASE, TARGET_AUDIENCES, LINE_DECORATION } from '../lib/constants';
import { parseGeneratedContent } from '../lib/utils';

export function useGemini(config) {
    const [generatedContent, setGeneratedContent] = useState({});
    const [selectedImage, setSelectedImage] = useState({});
    const [generatingId, setGeneratingId] = useState(null);

    const generateContent = async ({
        key,      // 'manual', 'review', or post.id
        mode,     // 'instagram', 'review', 'manual'
        promptText,
        targetAudienceId,
        activeKeywords,
        driveFiles = []
    }) => {
        if (!config.geminiKey) throw new Error("Geminiキーを設定してください");

        setGeneratingId(key);
        setGeneratedContent(prev => ({ ...prev, [key]: '' }));
        setSelectedImage(prev => ({ ...prev, [key]: null }));

        // Prepare prompt
        const drivePrompt = driveFiles.length > 0 ? `\n【重要：画像選定】記事の内容に合うものを1つ選び [IMAGE_SELECTION: ファイル名] と末尾に記載。リスト: [${driveFiles.map(f => f.name).join(', ')}]` : "";
        const targetLabel = TARGET_AUDIENCES.find(t => t.id === targetAudienceId)?.label || "全年代";
        const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        const context = `\n現在日時: ${today}\nターゲット: ${targetLabel}\n強調語: ${activeKeywords?.join(',') || ''}`;

        const fullPrompt = SYSTEM_PROMPT_BASE + context + drivePrompt + "\n" + promptText;

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });
            const resData = await res.json();
            let text = resData.candidates?.[0]?.content?.parts?.[0]?.text || "エラー";

            // Image selection logic
            const imageMatch = text.match(/\[IMAGE_SELECTION:\s*([^\]]+)\]/i);
            if (imageMatch) {
                const found = driveFiles.find(f => f.name.toLowerCase().includes(imageMatch[1].trim().toLowerCase()));
                if (found) {
                    let finalUrl = found.thumbnailLink ? found.thumbnailLink.replace(/=s\d+.*$/, '=s0') : found.webContentLink;
                    if (!finalUrl) finalUrl = `https://drive.google.com/thumbnail?id=${found.id}&sz=w4096`;

                    setSelectedImage(prev => ({ ...prev, [key]: { url: finalUrl, name: found.name, id: found.id } }));
                }
                text = text.replace(/\[IMAGE_SELECTION:.*?\]/gi, '').trim();
            }

            // text = text.replace('[LINE_LINK]', LINE_DECORATION); // Removed global replacement

            // Parse content for Manual/Rewrite modes, keep raw for Review
            if (key === 'review') {
                const reviewText = text.replace('[LINE_LINK]', LINE_DECORATION);
                setGeneratedContent(prev => ({ ...prev, [key]: reviewText }));
            } else {
                const parsed = parseGeneratedContent(text);
                parsed.google = (parsed.google || "").replace('[LINE_LINK]', LINE_DECORATION);
                parsed.instagram = (parsed.instagram || "").replace('[LINE_LINK]', "https://lin.ee/iSCxDU9\nプロフィールのリンクからもLINE予約ができます♪");
                setGeneratedContent(prev => ({ ...prev, [key]: parsed }));
            }
            return text;
        } catch (e) {
            console.error(e);
            throw e;
        } finally {
            setGeneratingId(null);
        }
    };

    return {
        generatedContent,
        setGeneratedContent,
        selectedImage,
        setSelectedImage,
        generatingId,
        generateContent
    };
}
