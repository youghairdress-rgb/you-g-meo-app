import React, { useState, useRef } from 'react';
import { Clock, Calendar, Trash2, Upload, Film } from 'lucide-react';

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function StoryPostView({
    storageFiles = [],
    config,
    postStory,
    onUpload,
    uploading,
    uploadProgress,
    onRefreshFiles,
    onDeleteFile,
    storyRules = [],
    setStoryRules,
    saveToCloud
}) {
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [isPosting, setIsPosting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    // Schedule State
    const [scheduleMode, setScheduleMode] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ type: 'daily', day: 0, time: '20:00' });

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await onUpload(file);
            setMessage({ type: 'success', text: 'アップロード完了！' });
        } catch (err) {
            setMessage({ type: 'error', text: `アップロード失敗: ${err.message}` });
        }
        e.target.value = '';
    };

    const handlePost = async () => {
        if (!selectedMedia) return;
        setIsPosting(true);
        setMessage({ type: 'info', text: 'ストーリー投稿中...' });

        try {
            await postStory(selectedMedia.url, selectedMedia.mediaType || 'image');
            setMessage({ type: 'success', text: 'ストーリー投稿に成功しました！🎉' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsPosting(false);
        }
    };

    const handleSchedule = async () => {
        if (!selectedMedia) return;
        const newRule = {
            id: Date.now(),
            ...scheduleForm,
            imageUrl: selectedMedia.url,
            thumbnailUrl: selectedMedia.url,
            mediaType: selectedMedia.mediaType,
        };
        const newRules = [...storyRules, newRule];
        setStoryRules(newRules);
        await saveToCloud(null, null, newRules);
        setScheduleMode(false);
        setMessage({ type: 'success', text: '配信予約を完了しました！📅' });
    };

    const handleDeleteRule = async (id) => {
        if (!confirm('この予約を削除しますか？')) return;
        const newRules = storyRules.filter(r => r.id !== id);
        setStoryRules(newRules);
        await saveToCloud(null, null, newRules);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-xl">📸</span> ストーリーズ投稿 & 予約
                </h2>

                <p className="text-sm text-gray-500 mb-6 font-bold">
                    画像・動画を選択して「即時投稿」するか、時間を指定して「定期配信」に登録できます。
                </p>

                {/* Upload & Gallery */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-gray-700">1. メディアを選択</label>
                        <div className="flex gap-2">
                            <button onClick={onRefreshFiles} className="text-xs text-blue-500 hover:underline font-bold">再読み込み</button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="bg-black text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 font-bold hover:bg-gray-800"
                            >
                                <Upload size={12} /> アップロード
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                        </div>
                    </div>

                    {uploading && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    )}

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto border p-2 rounded bg-gray-50">
                        {storageFiles.length > 0 ? storageFiles.map(file => (
                            <div
                                key={file.fullPath}
                                className={`cursor-pointer border-2 rounded overflow-hidden relative aspect-square transition-all group ${selectedMedia?.url === file.url ? 'border-orange-500 ring-2 ring-orange-200' : 'border-transparent hover:border-gray-300'}`}
                            >
                                {file.mediaType === 'video' ? (
                                    <div onClick={() => setSelectedMedia(file)} className="w-full h-full bg-gray-800 flex items-center justify-center">
                                        <Film size={24} className="text-white" />
                                    </div>
                                ) : (
                                    <img onClick={() => setSelectedMedia(file)} src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteFile(file.fullPath); }}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        )) : (
                            <p className="col-span-full text-center text-gray-400 py-8 text-sm">画像をアップロードしてください</p>
                        )}
                    </div>
                </div>

                {/* Selected Preview */}
                {selectedMedia && (
                    <div className="mb-6 flex justify-center bg-gray-900 rounded-lg p-4">
                        {selectedMedia.mediaType === 'video' ? (
                            <video src={selectedMedia.url} controls className="max-h-96 rounded" />
                        ) : (
                            <img src={selectedMedia.url} alt="Preview" className="max-h-96 object-contain" />
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-4">
                    {message.text && (
                        <div className={`text-center p-3 rounded-lg w-full font-bold ${message.type === 'error' ? 'bg-red-50 text-red-600' : message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex gap-4 w-full md:w-3/4">
                        <button
                            onClick={handlePost}
                            disabled={!selectedMedia || isPosting}
                            className={`flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2 ${!selectedMedia || isPosting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:scale-[1.02]'}`}
                        >
                            {isPosting ? '送信中...' : '今すぐ投稿'}
                        </button>

                        <button
                            onClick={() => setScheduleMode(!scheduleMode)}
                            disabled={!selectedMedia}
                            className={`flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2 ${!selectedMedia ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]'}`}
                        >
                            <Clock size={18} />
                            定期配信に登録
                        </button>
                    </div>
                </div>

                {/* Schedule Form */}
                {scheduleMode && selectedMedia && (
                    <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                            <Calendar size={18} /> 定期配信の設定
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <select
                                value={scheduleForm.type}
                                onChange={e => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                                className="p-3 border rounded-xl font-bold outline-none"
                            >
                                <option value="daily">毎日</option>
                                <option value="weekly">毎週</option>
                            </select>

                            {scheduleForm.type === 'weekly' && (
                                <select
                                    value={scheduleForm.day}
                                    onChange={e => setScheduleForm({ ...scheduleForm, day: parseInt(e.target.value) })}
                                    className="p-3 border rounded-xl font-bold outline-none"
                                >
                                    {DAYS.map((d, i) => <option key={i} value={i}>{d}曜日</option>)}
                                </select>
                            )}

                            <input
                                type="time"
                                value={scheduleForm.time}
                                onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                                className="p-3 border rounded-xl font-bold outline-none"
                            />
                        </div>
                        <button
                            onClick={handleSchedule}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all"
                        >
                            このメディアと設定で保存する
                        </button>
                    </div>
                )}
            </div>

            {/* Registered Schedules List */}
            {storyRules.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock size={20} /> 配信予定リスト
                    </h3>
                    <div className="space-y-3">
                        {storyRules.map(rule => (
                            <div key={rule.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <img src={rule.thumbnailUrl} alt="Thumb" className="w-16 h-16 object-cover rounded-lg border bg-white" />
                                <div className="flex-1">
                                    <div className="font-bold text-gray-700 flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded ${rule.type === 'daily' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                            {rule.type === 'daily' ? '毎日' : '毎週'}
                                        </span>
                                        {rule.type === 'weekly' && <span>{DAYS[rule.day]}曜日</span>}
                                        <span className="text-lg font-mono">{rule.time}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
