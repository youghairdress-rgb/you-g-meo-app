import React from 'react';
import { User } from 'lucide-react';
import { TARGET_AUDIENCES, TREND_KEYWORDS } from '../../lib/constants';

export function TargetSelector({ selectedTarget, setSelectedTarget, activeKeywords, toggleKeyword }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-in fade-in font-bold">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 font-bold">
                <h2 className="flex items-center gap-2 text-gray-700 tracking-tighter font-bold">
                    <User size={18} /> ターゲット設定
                </h2>
                <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full md:w-auto p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold"
                >
                    {TARGET_AUDIENCES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
            </div>
            <div className="flex flex-wrap gap-2">
                {TREND_KEYWORDS[selectedTarget]?.map(kw => (
                    <button
                        key={kw}
                        onClick={() => toggleKeyword(kw)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${activeKeywords.includes(kw)
                                ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                                : 'bg-white text-gray-500 border-gray-200'
                            }`}
                    >
                        #{kw}
                    </button>
                ))}
            </div>
        </div>
    );
}
