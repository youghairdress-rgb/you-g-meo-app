import React from 'react';
import { RefreshCw, Instagram, Sparkles } from 'lucide-react';
import { TargetSelector } from '../Shared/TargetSelector';

export function DashboardView({
    posts,
    loading,
    fetchInstagramPosts,
    handleGenerate,
    generatingId,
    generatedContent,
    setGeneratedContent,
    postingStatus,
    handlePostToGoogle,
    handlePostToInstagram,
    selectedTarget,
    setSelectedTarget,
    activeKeywords,
    toggleKeyword
}) {
    return (
        <div className="space-y-6 animate-in fade-in">
            <TargetSelector
                selectedTarget={selectedTarget}
                setSelectedTarget={setSelectedTarget}
                activeKeywords={activeKeywords}
                toggleKeyword={toggleKeyword}
            />

            <button onClick={fetchInstagramPosts} disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl hover:opacity-90 transition-opacity">
                {loading ? <RefreshCw className="animate-spin" /> : <Instagram />} 最新投稿を取得
            </button>

            <div className="grid gap-6">
                {posts.map(post => (
                    <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden font-bold">
                        <img src={post.media_url} className="md:w-1/3 aspect-square object-cover bg-gray-100" alt="Insta" />
                        <div className="p-4 flex-1 flex flex-col">
                            <p className="text-xs text-gray-400 line-clamp-1 mb-4 italic font-normal">"{post.caption || 'なし'}"</p>
                            <button
                                onClick={() => handleGenerate('instagram', post)}
                                disabled={generatingId === post.id}
                                className="bg-black text-white py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 shadow-sm transition-all"
                            >
                                {generatingId === post.id ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} className="text-yellow-400" />} この投稿をMEOリライト
                            </button>

                            {generatedContent[post.id] && (
                                <div className="mt-4 space-y-3 border-t pt-4 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="font-bold text-xs text-blue-600">Google投稿用</label>
                                            <textarea
                                                value={typeof generatedContent[post.id] === 'string' ? generatedContent[post.id] : generatedContent[post.id]?.google || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setGeneratedContent(prev => {
                                                        const current = prev[post.id];
                                                        const isStr = typeof current === 'string';
                                                        return {
                                                            ...prev,
                                                            [post.id]: {
                                                                google: newVal,
                                                                instagram: isStr ? current : current.instagram
                                                            }
                                                        };
                                                    });
                                                }}
                                                className="w-full h-48 p-4 bg-blue-50/20 rounded-xl border border-blue-100 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="font-bold text-xs text-pink-600">Instagram投稿用</label>
                                            <textarea
                                                value={typeof generatedContent[post.id] === 'string' ? generatedContent[post.id] : generatedContent[post.id]?.instagram || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setGeneratedContent(prev => {
                                                        const current = prev[post.id];
                                                        const isStr = typeof current === 'string';
                                                        return {
                                                            ...prev,
                                                            [post.id]: {
                                                                google: isStr ? current : current.google,
                                                                instagram: newVal
                                                            }
                                                        };
                                                    });
                                                }}
                                                className="w-full h-48 p-4 bg-pink-50/20 rounded-xl border border-pink-100 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handlePostToGoogle(post.id)}
                                            disabled={postingStatus[post.id]?.google === 'posting' || postingStatus[post.id]?.google === 'success'}
                                            className={`py-2.5 rounded-xl font-bold text-xs shadow-md ${postingStatus[post.id]?.google === 'success' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}
                                        >
                                            Google投稿
                                        </button>
                                        <button
                                            onClick={() => handlePostToInstagram(post.id)}
                                            disabled={postingStatus[post.id]?.insta === 'posting' || postingStatus[post.id]?.insta === 'success'}
                                            className={`py-2.5 rounded-xl font-bold text-xs shadow-md ${postingStatus[post.id]?.insta === 'success' ? 'bg-green-500 text-white' : 'bg-pink-600 text-white'}`}
                                        >
                                            Insta投稿
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
