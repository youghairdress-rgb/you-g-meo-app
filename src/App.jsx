import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useInstagram } from './hooks/useInstagram';
import { useGoogle } from './hooks/useGoogle';
import { useGemini } from './hooks/useGemini';
import { parseGeneratedContent } from './lib/utils';

// Components
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardView } from './components/Views/DashboardView';
import { ManualPostView } from './components/Views/ManualPostView';
import StoryPostView from './components/Views/StoryPostView';
import { ScheduleView } from './components/Views/ScheduleView';
import { ReviewView } from './components/Views/ReviewView';
import { SettingsView } from './components/Views/SettingsView';

export default function App() {
  const user = useAuth();
  const { config, setConfig, postingRules, setPostingRules, storyRules, setStoryRules, syncStatus, saveToCloud } = useSettings(user);
  const { posts, loading, fetchInstagramPosts, postToInstagram, postStory } = useInstagram(config, saveToCloud);
  const { driveCount, driveError, driveFiles, fetchDriveFiles, postToBusinessProfile, getFreshFileUrl } = useGoogle(config);

  // Story Drive Config
  const storyConfig = useMemo(() => ({
    ...config,
    driveFolderId: config.storyDriveFolderId || import.meta.env.VITE_STORY_DRIVE_FOLDER_ID || ""
  }), [config]);

  const { driveFiles: storyDriveFiles, fetchDriveFiles: fetchStoryFiles, getFreshFileUrl: getFreshStoryUrl } = useGoogle(storyConfig);

  const { generatedContent, setGeneratedContent, selectedImage, setSelectedImage, generatingId, generateContent } = useGemini(config);

  // UI State
  const [view, setView] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [upcomingTask, setUpcomingTask] = useState(null);

  // Feature State
  const [postingStatus, setPostingStatus] = useState({});
  const [selectedTarget, setSelectedTarget] = useState('general');
  const [activeKeywords, setActiveKeywords] = useState([]);
  const [manualTopic, setManualTopic] = useState('');
  const [reviewText, setReviewText] = useState('');

  const showNotice = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const toggleKeyword = (kw) => {
    setActiveKeywords(prev => prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]);
  };

  // Schedule Checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // 1. Regular Rules (Automated)
      const matched = postingRules.find(r =>
        (r.type === 'daily' && r.time === currentTime) ||
        (r.type === 'weekly' && r.day === now.getDay() && r.time === currentTime)
      );

      if (matched) {
        if (matched.fileId && matched.topic) {
          showNotice(`自動投稿開始: ${matched.topic}`, 'info');

          (async () => {
            try {
              // 1. Refresh URL
              let freshUrl = matched.imageUrl;
              if (matched.fileId) {
                try {
                  const u = await getFreshFileUrl(matched.fileId);
                  if (u) freshUrl = u;
                } catch (e) { console.error("URL Refresh Error", e); }
              }

              // 2. Generate Content
              // Note: We use existing activeKeywords, which might be risky if they change, but fine for now.
              const generatedText = await generateContent({
                key: `auto-${matched.id}`,
                mode: 'manual',
                promptText: `テーマ: ${matched.topic}`,
                targetAudienceId: matched.target || 'general',
                activeKeywords: activeKeywords
              });

              const parsed = parseGeneratedContent(generatedText);

              // 3. Post
              await postToBusinessProfile(parsed.google, freshUrl);
              await postToInstagram(freshUrl, parsed.instagram);

              showNotice(`自動投稿完了: ${matched.topic}`, "success");
            } catch (e) {
              console.error("Auto Post Error", e);
              showNotice(`自動投稿失敗: ${e.message}`, "error");
            }
          })();
        } else {
          setUpcomingTask(matched);
        }
      }

      // 2. Story Automation (Auto Post)
      if (storyRules && storyRules.length > 0) {
        const matchedStory = storyRules.find(r =>
          (r.type === 'daily' && r.time === currentTime) ||
          (r.type === 'weekly' && r.day === now.getDay() && r.time === currentTime)
        );

        if (matchedStory) {
          showNotice(`自動投稿開始: ストーリー (${matchedStory.time})`, 'info');

          const performPost = async () => {
            let targetUrl = matchedStory.imageUrl;
            // Try to refresh URL if fileId exists
            if (matchedStory.fileId) {
              try {
                const freshUrl = await getFreshStoryUrl(matchedStory.fileId);
                if (freshUrl) targetUrl = freshUrl;
              } catch (e) {
                console.error("URL Refresh Failed:", e);
              }
            }

            await postStory(targetUrl);
          };

          performPost()
            .then(() => showNotice("自動投稿成功！(ストーリー)", "success"))
            .catch(e => showNotice(`自動投稿失敗: ${e.message}`, "error"));
        }
      }

    }, 60000);
    return () => clearInterval(interval);
  }, [postingRules, storyRules, postStory, getFreshStoryUrl, getFreshFileUrl, generateContent, postToBusinessProfile, postToInstagram, activeKeywords]);

  // Initial Drive Fetch
  useEffect(() => {
    if (config.geminiKey && config.driveFolderId) fetchDriveFiles();
  }, [config.geminiKey, config.driveFolderId, fetchDriveFiles]);

  useEffect(() => {
    if (storyConfig.geminiKey && storyConfig.driveFolderId) fetchStoryFiles();
  }, [storyConfig.geminiKey, storyConfig.driveFolderId, fetchStoryFiles]);


  // Handlers
  const handleGenerateWrapper = async (mode, data) => {
    const key = mode === 'instagram' ? data.id : mode;

    let promptText = "";
    if (mode === 'instagram') {
      promptText = `リライト: ${data.caption}`;
    } else if (mode === 'review') {
      const { name, gender, age, menu } = data || {};
      promptText = `
以下の口コミに対する返信文を作成してください。
【条件】
- 100文字〜150文字程度
- 絵文字は使用禁止（顔文字や記号はOK）
- 予約リンクやハッシュタグは一切記述しないでください
- 冒頭は「${name ? name + '様' : 'お客様'}」から始めてください

【顧客情報】
- 名前: ${name || '不明'}
- 性別: ${gender || '不明'}
- 年代: ${age || '不明'}
- 利用メニュー: ${menu || '不明'}

【お客様の口コミ】
${reviewText}
`.trim();
    } else {
      promptText = `テーマ: ${manualTopic}`;
    }

    try {
      await generateContent({
        key,
        mode,
        promptText,
        targetAudienceId: selectedTarget,
        activeKeywords,
        driveFiles
      });
    } catch (e) {
      showNotice("生成失敗", "error");
    }
  };



  // ... inside hooks
  const handlePostToGoogleWrapper = async (key) => {
    setPostingStatus(prev => ({ ...prev, [key]: { ...prev[key], google: 'posting' } }));
    try {
      const content = generatedContent[key];
      const googleText = typeof content === 'string' ? parseGeneratedContent(content).google : content?.google;

      await postToBusinessProfile(googleText, selectedImage[key]?.url);
      showNotice("Google投稿成功！ ✨", "success");
      setPostingStatus(prev => ({ ...prev, [key]: { ...prev[key], google: 'success' } }));
    } catch (e) {
      setPostingStatus(prev => ({ ...prev, [key]: { ...prev[key], google: 'error' } }));
      showNotice("Google失敗: " + e.message, "error");
    }
  };

  const handlePostToInstagramWrapper = async (key) => {
    setPostingStatus(prev => ({ ...prev, [key]: { ...prev[key], insta: 'posting' } }));
    try {
      showNotice("Instagramへ送信中...", "info");

      const content = generatedContent[key];
      const instaText = typeof content === 'string' ? parseGeneratedContent(content).instagram : content?.instagram;

      await postToInstagram(selectedImage[key]?.url, instaText);
      showNotice("Instagram投稿成功！ 📸", "success");
      setPostingStatus(prev => ({ ...prev, [key]: { ...prev[key], insta: 'success' } }));
    } catch (e) {
      setPostingStatus(prev => ({ ...prev, [key]: { ...prev[key], insta: 'error' } }));
      showNotice("Instagram失敗: " + e.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-24 md:pb-0 text-sm">
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-black text-white'}`}>
          {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span className="font-bold tracking-tight">{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-50"><X size={14} /></button>
        </div>
      )}

      <Header
        upcomingTask={upcomingTask}
        onTaskClick={(task) => { setView('manual'); setManualTopic(task.topic); setUpcomingTask(null); }}
      />

      <div className="max-w-5xl mx-auto p-4 flex flex-col md:flex-row gap-6 mt-4">
        <Sidebar view={view} setView={setView} />

        <main className="flex-1 min-w-0 space-y-6">
          {view === 'dashboard' && (
            <DashboardView
              posts={posts}
              loading={loading}
              fetchInstagramPosts={fetchInstagramPosts}
              handleGenerate={handleGenerateWrapper}
              generatingId={generatingId}
              generatedContent={generatedContent}
              setGeneratedContent={setGeneratedContent}
              postingStatus={postingStatus}
              handlePostToGoogle={handlePostToGoogleWrapper}
              handlePostToInstagram={handlePostToInstagramWrapper}
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
              activeKeywords={activeKeywords}
              toggleKeyword={toggleKeyword}
            />
          )}

          {view === 'manual' && (
            <ManualPostView
              manualTopic={manualTopic}
              setManualTopic={setManualTopic}
              handleGenerate={handleGenerateWrapper}
              generatingId={generatingId}
              generatedContent={generatedContent}
              setGeneratedContent={setGeneratedContent}
              selectedImage={selectedImage}
              postingStatus={postingStatus}
              handlePostToGoogle={handlePostToGoogleWrapper}
              handlePostToInstagram={handlePostToInstagramWrapper}
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
              activeKeywords={activeKeywords}
              toggleKeyword={toggleKeyword}
            />
          )}

          {view === 'story' && (
            <StoryPostView
              driveFiles={storyDriveFiles}
              config={config}
              postStory={postStory}
              onRefreshDrive={fetchStoryFiles}
              storyRules={storyRules}
              setStoryRules={setStoryRules}
              saveToCloud={saveToCloud}
            />
          )}

          {view === 'schedule' && (
            <ScheduleView
              postingRules={postingRules}
              setPostingRules={setPostingRules}
              saveToCloud={saveToCloud}
              driveFiles={driveFiles}
            />
          )}

          {view === 'review' && (
            <ReviewView
              reviewText={reviewText}
              setReviewText={setReviewText}
              handleGenerate={handleGenerateWrapper}
              generatingId={generatingId}
              generatedContent={generatedContent}
              setGeneratedContent={setGeneratedContent}
              showNotice={showNotice}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              config={config}
              setConfig={setConfig}
              saveToCloud={saveToCloud}
              driveCount={driveCount}
              driveError={driveError}
            />
          )}
        </main>
      </div>
    </div>
  );
}