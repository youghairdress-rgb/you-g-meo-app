import React from 'react';
import { Key, Instagram, FolderOpen, AlertTriangle, Save } from 'lucide-react';

export function SettingsView({ config, setConfig, saveToCloud, driveCount, driveError }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6 border border-gray-100 font-bold animate-in fade-in">
            <h2 className="text-xl flex items-center gap-2 tracking-tighter text-gray-900 font-bold"><Key size={24} /> 認証・同期設定</h2>
            <div className="space-y-6 font-bold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 font-bold">
                        <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Gemini API Key</label>
                        <input
                            type="password"
                            value={config.geminiKey}
                            onChange={e => setConfig({ ...config, geminiKey: e.target.value })}
                            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black font-normal"
                        />
                    </div>
                    <div className="space-y-2 font-bold">
                        <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Meta Token</label>
                        <input
                            type="password"
                            value={config.instaToken}
                            onChange={e => setConfig({ ...config, instaToken: e.target.value })}
                            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black font-normal"
                        />
                    </div>
                </div>
                <div className="space-y-2 p-4 bg-purple-50 rounded-2xl border border-purple-100 font-bold">
                    <label className="text-xs text-purple-600 tracking-widest flex items-center gap-2 uppercase font-bold">
                        <Instagram size={14} /> Instagram Business ID
                    </label>
                    <input
                        type="text"
                        value={config.instaBusinessId}
                        onChange={e => setConfig({ ...config, instaBusinessId: e.target.value })}
                        className="w-full p-2 border rounded-lg bg-white font-mono text-xs outline-none font-normal font-bold"
                        placeholder="自動取得されます"
                    />
                </div>
                <div className="space-y-2 font-bold">
                    <label className="text-xs text-gray-400 flex justify-between uppercase tracking-widest font-bold">
                        <span>Google Drive Folder ID (投稿用)</span>
                        <div className="flex items-center gap-2 font-bold">
                            {driveError ? (
                                <span className="text-red-500 flex items-center gap-1 font-bold"><AlertTriangle size={10} /> Error</span>
                            ) : (
                                <span className={`${driveCount > 0 ? 'text-green-600' : 'text-orange-500'} flex items-center gap-1 font-bold`}>
                                    <FolderOpen size={10} /> {driveCount}件 認識
                                </span>
                            )}
                        </div>
                    </label>
                    <input
                        type="text"
                        value={config.driveFolderId}
                        onChange={e => setConfig({ ...config, driveFolderId: e.target.value })}
                        className="w-full p-3 border rounded-xl bg-gray-50 font-mono outline-none font-normal"
                    />
                </div>
                <div className="space-y-2 font-bold">
                    <label className="text-xs text-gray-400 flex justify-between uppercase tracking-widest font-bold">
                        <span>Story Drive Folder ID (ストーリーズ用)</span>
                    </label>
                    <input
                        type="text"
                        value={config.storyDriveFolderId || ''}
                        onChange={e => setConfig({ ...config, storyDriveFolderId: e.target.value })}
                        className="w-full p-3 border rounded-xl bg-gray-50 font-mono outline-none font-normal"
                        placeholder="ドライブのフォルダID"
                    />
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 font-bold">
                    <h3 className="text-sm font-bold text-gray-700 tracking-widest decoration-gray-300 underline underline-offset-4 uppercase font-bold">Business Profile Credentials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[10px] font-normal font-bold">
                        <div className="space-y-1 font-bold">
                            <label className="text-gray-400 uppercase font-bold">Account ID</label>
                            <input type="text" value={config.accountId} onChange={e => setConfig({ ...config, accountId: e.target.value })} className="w-full p-2 border rounded bg-white font-bold" />
                        </div>
                        <div className="space-y-1 font-bold">
                            <label className="text-gray-400 uppercase font-bold">Location ID</label>
                            <input type="text" value={config.locationId} onChange={e => setConfig({ ...config, locationId: e.target.value })} className="w-full p-2 border rounded bg-white font-bold" />
                        </div>
                    </div>
                    <div className="space-y-3 pt-2 font-normal font-bold">
                        <input type="text" value={config.gClientId} onChange={e => setConfig({ ...config, gClientId: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white outline-none font-mono text-[10px] font-bold" placeholder="Client ID" />
                        <input type="password" value={config.gClientSecret} onChange={e => setConfig({ ...config, gClientSecret: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white outline-none font-mono text-[10px] font-bold" placeholder="Client Secret" />
                        <textarea value={config.gRefreshToken} onChange={e => setConfig({ ...config, gRefreshToken: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white h-20 font-mono outline-none text-[10px] leading-tight font-bold" placeholder="Refresh Token" />
                    </div>
                </div>
                <button onClick={() => saveToCloud(config, null)} className="bg-black text-white px-8 py-4 rounded-2xl font-bold w-full flex items-center justify-center gap-2 hover:bg-gray-800 shadow-2xl transition-all font-bold uppercase tracking-widest font-bold"><Save size={20} /> 設定を保存して同期</button>
            </div>
        </div>
    );
}
