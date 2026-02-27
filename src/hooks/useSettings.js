import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';

import { DEFAULT_CONFIG } from '../lib/defaults';

export function useSettings(user) {
    const [synced, setSynced] = useState(false); // Initial sync status
    const [syncStatus, setSyncStatus] = useState('idle');
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [postingRules, setPostingRules] = useState([]);
    const [storyRules, setStoryRules] = useState([]);

    useEffect(() => {
        if (!user) return;
        setSyncStatus('syncing');
        const configPath = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
        const rulesPath = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rules');
        const storyRulesPath = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'storyRules');

        const unsubConfig = onSnapshot(configPath, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setConfig(prev => ({ ...prev, ...data }));
            } else {
                setSyncStatus('saved');
                setSynced(true);
            }
            setSyncStatus('saved');
            setSynced(true);
        }, () => setSyncStatus('idle'));

        const unsubRules = onSnapshot(rulesPath, (snap) => {
            if (snap.exists()) setPostingRules(snap.data().rules || []);
        });

        const unsubStoryRules = onSnapshot(storyRulesPath, (snap) => {
            if (snap.exists()) setStoryRules(snap.data().rules || []);
        });

        return () => { unsubConfig(); unsubRules(); unsubStoryRules(); };
    }, [user]);

    const saveToCloud = async (newConfig, newRules, newStoryRules) => {
        if (!user) return;
        setSyncStatus('syncing');
        try {
            if (newConfig) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), newConfig);
            if (newRules) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rules'), { rules: newRules });
            if (newStoryRules) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'storyRules'), { rules: newStoryRules });
            setSyncStatus('saved');
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    return { config, setConfig, postingRules, setPostingRules, storyRules, setStoryRules, syncStatus, saveToCloud, synced };
}
