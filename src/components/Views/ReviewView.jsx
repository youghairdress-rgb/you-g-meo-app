import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';

export function ReviewView({
    reviewText,
    setReviewText,
    handleGenerate,
    generatingId,
    generatedContent,
    setGeneratedContent,
    showNotice
}) {
    const [userInfo, setUserInfo] = useState({ name: '', gender: '', age: '', menu: '' });

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in min-h-[400px] font-bold">
            <h2 className="font-bold text-lg flex items-center gap-2 text-blue-500 font-bold tracking-tighter"><MessageSquare size={20} /> 口コミ返信メーカー</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                    <label className="text-xs text-blue-800 block mb-1 font-bold">お名前 (任意)</label>
                    <input
                        type="text"
                        value={userInfo.name}
                        onChange={e => setUserInfo({ ...userInfo, name: e.target.value })}
                        className="w-full p-2 rounded-lg border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="例: 田中様"
                    />
                </div>
                <div>
                    <label className="text-xs text-blue-800 block mb-1 font-bold">性別 (任意)</label>
                    <select
                        value={userInfo.gender}
                        onChange={e => setUserInfo({ ...userInfo, gender: e.target.value })}
                        className="w-full p-2 rounded-lg border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    >
                        <option value="">指定なし</option>
                        <option value="女性">女性</option>
                        <option value="男性">男性</option>
                        <option value="その他">その他</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-blue-800 block mb-1 font-bold">年代 (任意)</label>
                    <select
                        value={userInfo.age}
                        onChange={e => setUserInfo({ ...userInfo, age: e.target.value })}
                        className="w-full p-2 rounded-lg border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    >
                        <option value="">指定なし</option>
                        <option value="10代">10代</option>
                        <option value="20代">20代</option>
                        <option value="30代">30代</option>
                        <option value="40代">40代</option>
                        <option value="50代">50代</option>
                        <option value="60代以上">60代以上</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-blue-800 block mb-1 font-bold">メニュー (任意)</label>
                    <input
                        type="text"
                        value={userInfo.menu}
                        onChange={e => setUserInfo({ ...userInfo, menu: e.target.value })}
                        className="w-full p-2 rounded-lg border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="例: カット+カラー"
                    />
                </div>
            </div>

            <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="お客様の口コミを貼り付けてください..."
                className="w-full h-40 p-5 border rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 shadow-inner font-normal"
            />
            <button
                onClick={() => handleGenerate('review', userInfo)}
                disabled={!reviewText || generatingId === 'review'}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all font-bold"
            >
                真心込めた返信文を作成
            </button>
            {generatedContent['review'] && (
                <div className="mt-6 space-y-3 font-bold animate-in zoom-in-95">
                    <div className="flex justify-between items-center font-bold">
                        <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">AI返信案</span>
                        <button
                            onClick={() => { navigator.clipboard.writeText(generatedContent['review']); showNotice("コピー成功 ✨", "success"); }}
                            className="text-xs bg-gray-100 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 shadow-sm font-bold"
                        >
                            コピー
                        </button>
                    </div>
                    <textarea
                        value={generatedContent['review']}
                        onChange={(e) => setGeneratedContent(prev => ({ ...prev, 'review': e.target.value }))}
                        className="w-full h-56 p-5 bg-blue-50/10 border border-blue-100 rounded-2xl leading-relaxed outline-none font-normal"
                    />
                </div>
            )}
        </div>
    );
}
