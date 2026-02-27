import React, { useState } from 'react';
import { RefreshCw, Instagram, Sparkles, Image as ImageIcon, Video, Send } from 'lucide-react';
import { TargetSelector } from '../Shared/TargetSelector';

export function InstaPostView({
    driveFiles,
    loadingDrive,
    onRefreshDrive,
    handleGenerate,
    generatingId,
    generatedContent,
    setGeneratedContent,
    postingStatus,
    handlePostToInstagram,
    selectedTarget,
    setSelectedTarget,
    activeKeywords,
    toggleKeyword,
    selectedImage,
    setSelectedImage
}) {
    const [filter, setFilter] = useState('all'); // all, image, video

    const filteredFiles = driveFiles.filter(f => {
        if (filter === 'all') return true;
        return f.mediaType === filter;
    });

    const handleFileSelect = (file) => {
        setSelectedImage(prev => ({
            ...prev,
            'insta_post': { url: file.url, name: file.name, mediaType: file.mediaType, id: file.id }
        }));
    };

    const currentSelected = selectedImage['insta_post'];

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* ターゲット選択 */}
            <TargetSelector
                selectedTarget={selectedTarget}
                setSelectedTarget={setSelectedTarget}
                activeKeywords={activeKeywords}
                toggleKeyword={toggleKeyword}
            />

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-pink-50 to-white">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-pink-600">
                        <Instagram size={24} /> Instagram 投稿作成
                    </h2>
                    <button
                        onClick={onRefreshDrive}
                        disabled={loadingDrive}
                        className="p-2 hover:bg-pink-100 rounded-full transition-colors text-pink-500"
                    >
                        <RefreshCw size={20} className={loadingDrive ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* メディア選択エリア */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700">Google Drive から画像/動画を選択</label>
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg text-[10px]">
                                {['all', 'image', 'video'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilter(t)}
                                        className={`px-3 py-1 rounded-md transition-all ${filter === t ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                                    >
                                        {t === 'all' ? '全て' : t === 'image' ? '画像' : '動画'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                            {loadingDrive ? (
                                <div className="col-span-full py-12 flex flex-col items-center gap-3 text-gray-400">
                                    <RefreshCw className="animate-spin" />
                                    <span className="text-xs">ドライブから読み込み中...</span>
                                </div>
                            ) : filteredFiles.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-gray-400 text-xs">
                                    ファイルが見つかりません
                                </div>
                            ) : (
                                filteredFiles.map(file => (
                                    <button
                                        key={file.id}
                                        onClick={() => handleFileSelect(file)}
                                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${currentSelected?.id === file.id ? 'border-pink-500 ring-2 ring-pink-200' : 'border-transparent hover:border-gray-200'
                                            }`}
                                    >
                                        <img src={file.thumbnail || file.url} className="w-full h-full object-cover" alt={file.name} loading="lazy" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        {file.mediaType === 'video' && (
                                            <div className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-md">
                                                <Video size={10} />
                                            </div>
                                        )}
                                        {currentSelected?.id === file.id && (
                                            <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                                                <div className="bg-white rounded-full p-1 text-pink-500 shadow-lg">
                                                    <RefreshCw size={12} />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* AI 生成・編集エリア */}
                    {currentSelected && (
                        <div className="space-y-4 pt-6 border-t animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-4">
                                <img src={currentSelected.url} className="w-20 h-20 rounded-xl object-cover shadow-sm bg-gray-50" />
                                <div className="flex-1 space-y-2">
                                    <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                        {currentSelected.mediaType === 'image' ? <ImageIcon size={12} /> : <Video size={12} />}
                                        {currentSelected.name}
                                    </div>
                                    <button
                                        onClick={() => handleGenerate('insta_post', { id: 'insta_post' })}
                                        disabled={generatingId === 'insta_post'}
                                        className="w-full bg-black text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg text-sm"
                                    >
                                        {generatingId === 'insta_post' ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} className="text-yellow-400" />}
                                        インスタ専用記事をAI作成
                                    </button>
                                </div>
                            </div>

                            {generatedContent['insta_post'] && (
                                <div className="space-y-4 animate-in fade-in zoom-in-95">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-pink-600 uppercase tracking-widest">Instagram 投稿用テキスト</label>
                                        <textarea
                                            value={typeof generatedContent['insta_post'] === 'string' ? generatedContent['insta_post'] : generatedContent['insta_post']?.instagram || ''}
                                            onChange={(e) => {
                                                const newVal = e.target.value;
                                                setGeneratedContent(prev => ({
                                                    ...prev,
                                                    'insta_post': {
                                                        ...prev['insta_post'],
                                                        instagram: newVal
                                                    }
                                                }));
                                            }}
                                            className="w-full h-64 p-5 bg-pink-50/20 rounded-2xl border border-pink-100 outline-none focus:ring-2 focus:ring-pink-200 transition-all font-bold text-sm leading-relaxed"
                                            placeholder="ここにInstagram用の文章が生成されます..."
                                        />
                                    </div>

                                    <button
                                        onClick={() => handlePostToInstagram('insta_post')}
                                        disabled={postingStatus['insta_post']?.insta === 'posting' || postingStatus['insta_post']?.insta === 'success'}
                                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl transition-all ${postingStatus['insta_post']?.insta === 'success'
                                                ? 'bg-green-500 text-white cursor-default'
                                                : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 active:scale-[0.98]'
                                            }`}
                                    >
                                        {postingStatus['insta_post']?.insta === 'posting' ? (
                                            <>
                                                <RefreshCw className="animate-spin" />
                                                <span>送信中...</span>
                                            </>
                                        ) : postingStatus['insta_post']?.insta === 'success' ? (
                                            <>
                                                <Send size={18} />
                                                <span>投稿完了！</span>
                                            </>
                                        ) : (
                                            <>
                                                <Instagram size={18} />
                                                <span>Instagram に投稿</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
