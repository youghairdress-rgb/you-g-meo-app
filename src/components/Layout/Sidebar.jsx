import React from 'react';
import { Instagram, PenTool, Calendar, MessageSquare, Settings, Camera } from 'lucide-react';

export function Sidebar({ view, setView }) {
    const NavItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setView(id)}
            className={`p-3 rounded-xl flex flex-col md:flex-row items-center gap-2 transition-all ${view === id ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
                }`}
        >
            <Icon size={20} />
            <span className="text-xs uppercase">{label}</span>
        </button>
    );

    return (
        <nav className="md:w-60 flex-shrink-0 flex md:flex-col gap-1 fixed md:static bottom-0 left-0 w-full bg-white md:bg-transparent p-2 md:p-0 border-t md:border-0 z-30 justify-around md:justify-start shadow-up md:shadow-none font-bold">
            <NavItem id="dashboard" icon={Instagram} label="インスタ" />
            <NavItem id="story" icon={Camera} label="ストーリー" />
            <NavItem id="manual" icon={PenTool} label="作成" />
            <NavItem id="schedule" icon={Calendar} label="予約管理" />
            <NavItem id="review" icon={MessageSquare} label="口コミ返信" />
            <NavItem id="settings" icon={Settings} label="設定" />
        </nav>
    );
}
