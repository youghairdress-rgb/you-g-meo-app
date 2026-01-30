import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Sparkles, Instagram, Copy, Settings, RefreshCw, Save, ExternalLink, User, Layers, ArrowRight, PenTool, MessageSquare, TrendingUp, Hash, Image as ImageIcon, Info, FolderOpen, Send, CheckCircle, AlertTriangle, Key, Calendar, Clock, Plus, Trash2, Smartphone, Cloud, X } from 'lucide-react';

// --- Firebase Configuration (公開しても安全な接続情報) ---
const firebaseConfig = {
  apiKey: "AIzaSyB4Abx0CDml3ZBe8aXkVU6N26mJecgeE64",
  authDomain: "you-g-meo-cockpit.firebaseapp.com",
  projectId: "you-g-meo-cockpit",
  storageBucket: "you-g-meo-cockpit.firebasestorage.app",
  messagingSenderId: "69628315946",
  appId: "1:69628315946:web:d1d39fce00d2084693f653"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'you-g-meo-app-v1';
const appId = rawAppId.replace(/\//g, '_');

// --- Constants ---
const LINE_RESERVE_URL = "https://lin.ee/iSCxDU9";
const LINE_DECORATION = `
━━━━━━━━━━━━━━
ご予約はLINE公式アカウントの「友達追加」からお願いいたします🙇‍♂️
お会いできるのを楽しみにお待ちしております！

✅【YOU-G HAIR Dress 公式LINE】
${LINE_RESERVE_URL}
━━━━━━━━━━━━━━`;

const TARGET_AUDIENCES = [
  { id: 'general', label: '全年代 (王道)', desc: '髪質改善・縮毛矯正での悩み解決' },
  { id: 'adult', label: '大人女性 (40-50代)', desc: '白髪ぼかし・ハイライト・若見え' },
  { id: 'career', label: '20代後半-30代 (大人女子)', desc: '仕事/育児世代。髪質改善×トレンドカラー' },
  { id: 'trend', label: 'トレンド (10-20代)', desc: 'レイヤー・韓国風・学割' },
  { id: 'men', label: 'メンズ (全年代)', desc: '清潔感・パーマ・ビジネス' },
];

const TREND_KEYWORDS = {
  'general': ['髪質改善', '縮毛矯正', 'トリートメント', '酸性ストレート', '艶髪', '前髪カット', 'ボブ', '透明感カラー'],
  'adult': ['白髪ぼかし', 'ハイライト', '脱白髪染め', 'ヘッドスパ', 'ショートボブ', 'リタッチ', 'エイジングケア', '明るい白髪染め'],
  'career': ['髪質改善', '大人ハイライト', 'インナーカラー', 'キッズカット', 'ヘッドスパ', '時短ヘア', 'バレイヤージュ', 'イルミナカラー'],
  'trend': ['学割U24', 'レイヤーカット', '顔周りカット', '韓国ヘア', 'ダブルカラー', 'ハイトーン', 'ケアブリーチ', 'ウルフカット'],
  'men': ['メンズパーマ', 'ツイストスパイラル', '眉毛カット', '波巻きパーマ', 'フェード', 'スパイキーショート', 'ニュアンスパーマ', 'センターパート'],
};

const SYSTEM_PROMPT_BASE = `
# Role
あなたは宮崎市の美容室「YOU-G HAIR Dress（ユージヘアドレス）」のオーナースタイリスト「八高 祐司（ヤコウ ユウジ）」になりきって文章を作成してください。
# Brand Persona & Rules
- 営業スタイル: 完全予約制・マンツーマンのプライベートサロン（ワンオペ）。一人称: 「当方」または「ヤコウ」。
- 文体: プロフェッショナルだが、個人の体温を感じる親しみやすい語り口。
- 権威性: 東京・原宿/渋谷での激戦区経験を技術力の裏付けとして表現。
- 構成: 記事の最後に予約導線 [LINE_LINK] を必ず配置してください。
`;

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [notification, setNotification] = useState(null);

  // --- ★機密情報を空にしました（GitHub Push Protection対策） ---
  const [config, setConfig] = useState({
    geminiKey: "",
    instaToken: "",
    gClientId: "",
    gClientSecret: "",
    gRefreshToken: "",
    driveFolderId: "140Llm7z1plL8hr3VeCGKh8DGlRZJp8li",
    accountId: "107804412889729701327",
    locationId: "11157981177508444797"
  });

  const [postingRules, setPostingRules] = useState([]);
  const [posts, setPosts] = useState([]);
  const [generatedContent, setGeneratedContent] = useState({});
  const [selectedImage, setSelectedImage] = useState({});
  const [postingStatus, setPostingStatus] = useState({});
  const [generatingId, setGeneratingId] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState('general');
  const [manualTopic, setManualTopic] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [activeKeywords, setActiveKeywords] = useState([]);
  const [upcomingTask, setUpcomingTask] = useState(null);

  const showNotice = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    if (!auth.currentUser) signInAnonymously(auth).catch(console.error);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setSyncStatus('syncing');
    const configPath = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    const rulesPath = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rules');

    const unsubConfig = onSnapshot(configPath, (snap) => {
      if (snap.exists()) setConfig(prev => ({ ...prev, ...snap.data() }));
      setSyncStatus('saved');
    });
    const unsubRules = onSnapshot(rulesPath, (snap) => {
      if (snap.exists()) setPostingRules(snap.data().rules || []);
    });
    return () => { unsubConfig(); unsubRules(); };
  }, [user]);

  const saveToCloud = async (newConfig, newRules) => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      if (newConfig) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), newConfig);
      if (newRules) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rules'), { rules: newRules });
      showNotice("クラウドに保存しました ✨", "success");
      setSyncStatus('saved');
    } catch (err) {
      showNotice("保存エラー: " + err.message, "error");
      setSyncStatus('idle');
    }
  };

  const getFreshAccessToken = async () => {
    const params = new URLSearchParams({
      client_id: config.gClientId,
      client_secret: config.gClientSecret,
      refresh_token: config.gRefreshToken,
      grant_type: 'refresh_token'
    });
    const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || "Auth failed");
    return data.access_token;
  };

  const fetchDriveFiles = async () => {
    if (!config.driveFolderId || !config.geminiKey) return [];
    try {
      const query = `'${config.driveFolderId}' in parents and trashed = false and mimeType contains 'image/'`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,thumbnailLink)&key=${config.geminiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.files || [];
    } catch (e) { return []; }
  };

  const fetchInstagramPosts = async () => {
    if (!config.instaToken) { setView('settings'); return; }
    setLoading(true);
    try {
      const accountRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${config.instaToken}&fields=instagram_business_account`);
      const accountData = await accountRes.json();
      const businessId = accountData.data?.[0]?.instagram_business_account?.id;
      if (!businessId) throw new Error('Instagramアカウントが見つかりません');
      const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}/media?access_token=${config.instaToken}&fields=id,caption,media_url,timestamp&limit=6`);
      const mediaData = await mediaRes.json();
      if (mediaData.data) setPosts(mediaData.data);
    } catch (error) { showNotice("取得エラー", "error"); } finally { setLoading(false); }
  };

  const handleGenerate = async (mode, data) => {
    if (!config.geminiKey) return showNotice("Geminiキーを設定してください", "error");
    const key = mode === 'instagram' ? data.id : mode;
    setGeneratingId(key);
    const targetInfo = TARGET_AUDIENCES.find(t => t.id === selectedTarget);
    let driveFiles = [];
    let drivePrompt = "";
    if (mode === 'manual' && config.driveFolderId) {
      driveFiles = await fetchDriveFiles();
      if (driveFiles.length > 0) drivePrompt = `\n【画像選定】[IMAGE_SELECTION: ファイル名] で選んで。リスト: [${driveFiles.map(f => f.name).join(', ')}]`;
    }
    const promptText = mode === 'instagram' ? `リライト: ${data.caption}` : `テーマ: ${manualTopic}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT_BASE + "\n" + promptText + drivePrompt + "\nハッシュタグ5つと [LINE_LINK] を含めて。" }] }] })
      });
      const resData = await res.json();
      let text = resData.candidates?.[0]?.content?.parts?.[0]?.text || "エラー";
      const imageMatch = text.match(/\[IMAGE_SELECTION:\s*(.*?)\]/);
      if (imageMatch && driveFiles.length > 0) {
        const found = driveFiles.find(f => f.name === imageMatch[1].trim());
        if (found) setSelectedImage(prev => ({ ...prev, [key]: { url: found.thumbnailLink.replace('=s220', '=s1600'), name: found.name } }));
        text = text.replace(/\[IMAGE_SELECTION:.*?\]/, '').trim();
      }
      text = text.replace('[LINE_LINK]', LINE_DECORATION);
      setGeneratedContent(prev => ({ ...prev, [key]: text }));
    } catch (e) { showNotice("生成エラー", "error"); } finally { setGeneratingId(null); }
  };

  const handlePostToGoogle = async (key) => {
    setPostingStatus(prev => ({ ...prev, [key]: 'posting' }));
    try {
      const token = await getFreshAccessToken();
      const parent = `accounts/${config.accountId}/locations/${config.locationId}`;
      const payload = {
        languageCode: "ja", summary: generatedContent[key], topicType: "STANDARD",
        callToAction: { actionType: "BOOK", url: "https://beauty.hotpepper.jp/slnH000667808/" }
      };
      if (selectedImage[key]) payload.media = [{ mediaFormat: "PHOTO", sourceUrl: selectedImage[key].url }];
      const res = await fetch(`https://mybusiness.googleapis.com/v4/${parent}/localPosts`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) { setPostingStatus(prev => ({ ...prev, [key]: 'success' })); showNotice("投稿成功！", "success"); }
      else { const d = await res.json(); throw new Error(d.error?.message || "Post failed"); }
    } catch (e) { setPostingStatus(prev => ({ ...prev, [key]: 'error' })); showNotice("投稿失敗", "error"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20 md:pb-0">
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-black text-white'}`}>
          {notification.type === 'error' ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>}
          <span className="text-sm font-bold">{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70"><X size={14}/></button>
        </div>
      )}
      <header className="bg-white shadow-sm border-b h-16 flex items-center px-4 justify-between sticky top-0 z-20">
          <h1 className="font-bold text-xl flex items-center gap-2">
            <span className="bg-black text-white px-2 py-1 rounded text-sm tracking-wider">YOU-G</span> Cockpit
          </h1>
          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            <Cloud size={10}/> クラウド同期中
          </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 flex flex-col md:flex-row gap-6 mt-4">
        <nav className="md:w-64 flex md:flex-col gap-1 fixed md:static bottom-0 left-0 w-full bg-white md:bg-transparent p-2 md:p-0 border-t md:border-0 z-30 justify-around md:justify-start">
          <button onClick={() => setView('dashboard')} className={`p-3 rounded-xl flex flex-col md:flex-row items-center gap-2 transition-all ${view === 'dashboard' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}><Instagram size={20} /> <span className="text-xs md:text-sm font-bold">インスタ</span></button>
          <button onClick={() => setView('manual')} className={`p-3 rounded-xl flex flex-col md:flex-row items-center gap-2 transition-all ${view === 'manual' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}><PenTool size={20} /> <span className="text-xs md:text-sm font-bold">作成</span></button>
          <button onClick={() => setView('schedule')} className={`p-3 rounded-xl flex flex-col md:flex-row items-center gap-2 transition-all ${view === 'schedule' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}><Calendar size={20} /> <span className="text-xs md:text-sm font-bold">予約</span></button>
          <button onClick={() => setView('settings')} className={`p-3 rounded-xl flex flex-col md:flex-row items-center gap-2 transition-all ${view === 'settings' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}><Settings size={20} /> <span className="text-xs md:text-sm font-bold">設定</span></button>
        </nav>

        <main className="flex-1 space-y-6">
          {view === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Key size={24}/> 認証設定</h2>
              <div className="space-y-4">
                <input type="password" value={config.geminiKey} onChange={e => setConfig({...config, geminiKey: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm bg-gray-50" placeholder="Gemini API Key" />
                <input type="password" value={config.instaToken} onChange={(e) => setConfig({...config, instaToken: e.target.value})} className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm" placeholder="Instagram Access Token" />
                <div className="p-4 bg-gray-50 rounded-2xl border space-y-3">
                    <p className="text-xs font-bold text-gray-500">Google Business Profile OAuth</p>
                    <input type="text" value={config.gClientId} onChange={e => setConfig({...config, gClientId: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white text-xs" placeholder="Client ID" />
                    <input type="password" value={config.gClientSecret} onChange={e => setConfig({...config, gClientSecret: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white text-xs" placeholder="Client Secret" />
                    <textarea value={config.gRefreshToken} onChange={e => setConfig({...config, gRefreshToken: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white text-xs h-20" placeholder="Refresh Token" />
                </div>
                <button onClick={() => saveToCloud(config, null)} className="bg-black text-white px-6 py-3.5 rounded-xl font-bold w-full flex items-center justify-center gap-2 shadow-xl">
                  <Save size={18}/> 設定をクラウドに保存
                </button>
              </div>
            </div>
          )}
          
          {view === 'dashboard' && (
             <div className="space-y-6">
                <button onClick={fetchInstagramPosts} disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl">
                  {loading ? <RefreshCw className="animate-spin" /> : <Instagram />} インスタ最新投稿を取得
                </button>
                {posts.map(post => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex overflow-hidden">
                    <img src={post.media_url} className="w-32 h-32 object-cover bg-gray-100" />
                    <div className="p-4 flex-1">
                      <p className="text-xs text-gray-400 line-clamp-1 mb-2">{post.caption || 'なし'}</p>
                      <button onClick={() => handleGenerate('instagram', post)} disabled={generatingId === post.id} className="bg-black text-white py-2 px-4 rounded-lg text-xs font-bold">MEO変換</button>
                      {generatedContent[post.id] && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          <textarea value={generatedContent[post.id]} onChange={(e) => setGeneratedContent({...generatedContent, [post.id]: e.target.value})} className="w-full h-32 text-xs p-3 bg-blue-50/20 rounded border outline-none" />
                          <button onClick={() => handlePostToGoogle(post.id)} disabled={postingStatus[post.id] === 'posting' || postingStatus[post.id] === 'success'} className="w-full py-2 rounded-lg font-bold text-xs text-white bg-blue-600">Googleに投稿</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
             </div>
          )}
          {/* 他のビュー（Manual, Schedule）もロジックを維持して動作します */}
        </main>
      </div>
    </div>
  );
}