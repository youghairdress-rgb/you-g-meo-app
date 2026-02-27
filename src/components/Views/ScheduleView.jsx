import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Save, Image as ImageIcon, X, Film } from 'lucide-react';
import { DAYS } from '../../lib/constants';

export function ScheduleView({ postingRules, setPostingRules, saveToCloud, storageFiles = [] }) {
    const [selectingRuleId, setSelectingRuleId] = useState(null);

    const addRule = () => {
        setPostingRules([...postingRules, { id: Date.now(), type: 'daily', time: '10:00', topic: '', target: 'general', imageUrl: null, thumbnailUrl: null, mediaType: 'image' }]);
    };

    const updateRule = (id, key, value) => {
        setPostingRules(postingRules.map(x => x.id === id ? { ...x, [key]: value } : x));
    };

    const deleteRule = (id) => {
        setPostingRules(postingRules.filter(x => x.id !== id));
    };

    const handleSelectMedia = (ruleId, file) => {
        updateRule(ruleId, 'imageUrl', file.url);
        updateRule(ruleId, 'thumbnailUrl', file.url);
        updateRule(ruleId, 'mediaType', file.mediaType);
        setSelectingRuleId(null);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6 animate-in fade-in border border-gray-100 min-h-[400px] font-bold">
            {selectingRuleId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
                            <h3 className="font-bold text-lg">自動投稿するメディアを選択</h3>
                            <button onClick={() => setSelectingRuleId(null)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {storageFiles && storageFiles.length > 0 ? storageFiles.map(file => (
                                <div key={file.fullPath} onClick={() => handleSelectMedia(selectingRuleId, file)} className="cursor-pointer hover:opacity-75 relative aspect-square group">
                                    {file.mediaType === 'video' ? (
                                        <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                                            <Film size={24} className="text-white" />
                                        </div>
                                    ) : (
                                        <img src={file.url} className="w-full h-full object-cover rounded-lg border shadow-sm group-hover:scale-105 transition-transform" />
                                    )}
                                </div>
                            )) : (
                                <p className="col-span-full text-center text-gray-500 py-8">メディアが見つかりません。「記事作成」画面でアップロードしてください。</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-xl flex items-center gap-2 text-blue-600 tracking-tighter font-bold"><Calendar size={24} /> 投稿スケジュール管理 (自動)</h2>
                <button onClick={addRule} className="bg-black text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm font-bold"><Plus size={14} /> 予約追加</button>
            </div>
            <div className="space-y-4 font-bold">
                {postingRules.map(rule => (
                    <div key={rule.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-3 shadow-sm font-bold">
                        <div className="flex flex-col md:flex-row gap-2 w-full items-start md:items-center">
                            <div className="flex items-center gap-2">
                                {rule.thumbnailUrl ? (
                                    <img src={rule.thumbnailUrl} className="w-12 h-12 rounded object-cover border bg-white" />
                                ) : (
                                    <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center border text-gray-400"><ImageIcon size={20} /></div>
                                )}
                                <button
                                    onClick={() => setSelectingRuleId(rule.id)}
                                    className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors ${rule.thumbnailUrl ? 'bg-white hover:bg-gray-50 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                >
                                    {rule.thumbnailUrl ? 'メディア変更' : 'メディア選択'}
                                </button>
                            </div>

                            <select
                                value={rule.type}
                                onChange={e => updateRule(rule.id, 'type', e.target.value)}
                                className="p-2.5 border rounded-lg outline-none bg-white font-bold text-sm"
                            >
                                <option value="daily">毎日</option>
                                <option value="weekly">毎週</option>
                            </select>
                            {rule.type === 'weekly' && (
                                <select
                                    value={rule.day}
                                    onChange={e => updateRule(rule.id, 'day', parseInt(e.target.value))}
                                    className="p-2.5 border rounded-lg outline-none bg-white font-bold text-sm"
                                >
                                    {DAYS.map((d, i) => <option key={i} value={i}>{d}曜日</option>)}
                                </select>
                            )}
                            <input
                                type="time"
                                value={rule.time}
                                onChange={e => updateRule(rule.id, 'time', e.target.value)}
                                className="p-2.5 border rounded-lg outline-none bg-white font-bold text-sm"
                            />
                            <input
                                type="text"
                                value={rule.topic}
                                onChange={e => updateRule(rule.id, 'topic', e.target.value)}
                                placeholder="投稿テーマ (例: 今日のスタイル)"
                                className="flex-1 p-2.5 border rounded-lg outline-none bg-white font-normal text-sm w-full md:w-auto"
                            />
                            <button onClick={() => deleteRule(rule.id)} className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors font-bold ml-auto md:ml-0"><Trash2 size={20} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => saveToCloud(null, postingRules)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest"><Save size={18} /> 予約設定を保存</button>
        </div>
    );
}
