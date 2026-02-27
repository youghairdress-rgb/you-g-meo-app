import React, { useRef } from 'react';
import { PenTool, RefreshCw, Sparkles, Upload, Trash2, Image as ImageIcon, Film } from 'lucide-react';
import { TargetSelector } from '../Shared/TargetSelector';

export function ManualPostView({
    manualTopic,
    setManualTopic,
    handleGenerate,
    generatingId,
    generatedContent,
    setGeneratedContent,
    selectedImage,
    setSelectedImage,
    postingStatus,
    handlePostToGoogle,
    handlePostToInstagram,
    selectedTarget,
    setSelectedTarget,
    activeKeywords,
    toggleKeyword,
    storageFiles = [],
    onUpload,
    uploading,
    uploadProgress,
    onRefreshFiles,
    onDeleteFile
}) {
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await onUpload(file);
        } catch (err) {
            console.error('Upload failed:', err);
        }
        e.target.value = '';
    };

    const handleSelectMedia = (file) => {
        setSelectedImage(prev => ({
            ...prev,
            'manual': { url: file.url, name: file.name, mediaType: file.mediaType, fullPath: file.fullPath }
        }));
    };

    return (
        <div className="space-y-6">
            <TargetSelector
                selectedTarget={selectedTarget}
                setSelectedTarget={setSelectedTarget}
                activeKeywords={activeKeywords}
                toggleKeyword={toggleKeyword}
            />

            {/* メディア管理エリア */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-lg flex items-center gap-2 text-orange-500 tracking-tighter">
                        <ImageIcon size={20} /> メディア管理（投稿用）
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={onRefreshFiles} className="text-xs text-blue-500 hover:underline font-bold">再読み込み</button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="bg-black text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm font-bold hover:bg-gray-800 transition-all"
                        >
                            <Upload size={14} /> アップロード
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {uploading && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto border p-2 rounded-xl bg-gray-50">
                    {storageFiles.length > 0 ? storageFiles.map(file => (
                        <div
                            key={file.fullPath}
                            className={`cursor-pointer border-2 rounded-lg overflow-hidden relative aspect-square group transition-all ${selectedImage['manual']?.url === file.url ? 'border-orange-500 ring-2 ring-orange-200' : 'border-transparent hover:border-gray-300'}`}
                        >
                            {file.mediaType === 'video' ? (
                                <div onClick={() => handleSelectMedia(file)} className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <Film size={24} className="text-white" />
                                </div>
                            ) : (
                                <img onClick={() => handleSelectMedia(file)} src={file.url} alt={file.name} className="w-full h-full object-cover" />
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteFile(file.fullPath); }}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    )) : (
                        <p className="col-span-full text-center text-gray-400 py-8 text-sm">
                            画像をアップロードしてください
                        </p>
                    )}
                </div>
            </div>

            {/* 記事作成エリア */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in">
                <h2 className="font-bold text-lg flex items-center gap-2 text-pink-500 tracking-tighter">
                    <PenTool size={20} /> 記事作成・同時投稿
                </h2>
                <textarea
                    value={manualTopic}
                    onChange={(e) => setManualTopic(e.target.value)}
                    placeholder="今日のテーマを入力..."
                    className="w-full h-32 p-5 border rounded-2xl bg-gray-50 outline-none resize-none focus:ring-2 focus:ring-pink-100 shadow-inner"
                />
                <button
                    onClick={() => handleGenerate('manual')}
                    disabled={generatingId === 'manual'}
                    className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-gray-800 transition-all uppercase tracking-widest"
                >
                    {generatingId === 'manual' ? <RefreshCw className="animate-spin" /> : <Sparkles className="text-yellow-400" />} AI記事生成
                </button>

                {generatedContent['manual'] && (
                    <div className="mt-8 pt-8 border-t space-y-5 animate-in slide-in-from-bottom-2">
                        {selectedImage['manual'] && (
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 relative">
                                {selectedImage['manual'].mediaType === 'video' ? (
                                    <div className="w-24 h-24 bg-gray-800 rounded-xl flex items-center justify-center"><Film size={24} className="text-white" /></div>
                                ) : (
                                    <img src={selectedImage['manual'].url} className="w-24 h-24 object-cover rounded-xl shadow-sm border border-white" alt="selected" />
                                )}
                                <div className="space-y-1 font-bold">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">選定メディア (Storage)</p>
                                    <p className="font-bold text-xs text-gray-700">{selectedImage['manual'].name}</p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="font-bold text-xs text-blue-600">Google投稿用</label>
                                <textarea
                                    value={typeof generatedContent['manual'] === 'string' ? generatedContent['manual'] : generatedContent['manual']?.google || ''}
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setGeneratedContent(prev => {
                                            const current = prev['manual'];
                                            const isStr = typeof current === 'string';
                                            return {
                                                ...prev,
                                                'manual': {
                                                    google: newVal,
                                                    instagram: isStr ? current : current.instagram
                                                }
                                            };
                                        });
                                    }}
                                    className="w-full h-64 p-4 bg-blue-50/10 border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="font-bold text-xs text-pink-600">Instagram投稿用</label>
                                <textarea
                                    value={typeof generatedContent['manual'] === 'string' ? generatedContent['manual'] : generatedContent['manual']?.instagram || ''}
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setGeneratedContent(prev => {
                                            const current = prev['manual'];
                                            const isStr = typeof current === 'string';
                                            return {
                                                ...prev,
                                                'manual': {
                                                    google: isStr ? current : current.google,
                                                    instagram: newVal
                                                }
                                            };
                                        });
                                    }}
                                    className="w-full h-64 p-4 bg-pink-50/10 border border-pink-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-200"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                onClick={() => handlePostToGoogle('manual')}
                                disabled={postingStatus['manual']?.google === 'posting' || postingStatus['manual']?.google === 'success'}
                                className={`py-4 rounded-2xl font-bold text-white shadow-xl transition-all ${postingStatus['manual']?.google === 'success' ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Googleに投稿
                            </button>
                            <button
                                onClick={() => handlePostToInstagram('manual')}
                                disabled={postingStatus['manual']?.insta === 'posting' || postingStatus['manual']?.insta === 'success'}
                                className={`py-4 rounded-2xl font-bold text-white shadow-xl transition-all ${postingStatus['manual']?.insta === 'success' ? 'bg-green-500' : 'bg-pink-600 hover:bg-pink-700'}`}
                            >
                                Instagramに投稿
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
