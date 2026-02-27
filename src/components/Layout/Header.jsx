import React from 'react';
import { Clock, Cloud } from 'lucide-react';

export function Header({ upcomingTask, onTaskClick }) {
    return (
        <header className="bg-white shadow-sm border-b h-16 flex items-center px-4 justify-between sticky top-0 z-20">
            <h1 className="font-bold text-xl flex items-center gap-2">
                <span className="bg-black text-white px-2 py-1 rounded text-sm tracking-tighter uppercase font-bold">YOU-G</span> Cockpit
            </h1>
            <div className="flex items-center gap-2">
                {upcomingTask && (
                    <div
                        className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-[10px] font-bold animate-pulse cursor-pointer"
                        onClick={() => onTaskClick(upcomingTask)}
                    >
                        <Clock size={10} className="inline mr-1" />投稿時間！
                    </div>
                )}
                <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-tighter font-bold">
                    <Cloud size={10} /> Cloud Synced
                </div>
            </div>
        </header>
    );
}
