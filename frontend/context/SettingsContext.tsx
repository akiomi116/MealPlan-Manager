'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type SettingsContextType = {
    fontSize: 'normal' | 'large' | 'extra-large';
    highContrast: boolean;
    voiceEnabled: boolean;
    setFontSize: (size: 'normal' | 'large' | 'extra-large') => void;
    setHighContrast: (enabled: boolean) => void;
    setVoiceEnabled: (enabled: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [fontSize, setFontSize] = useState<'normal' | 'large' | 'extra-large'>('large'); // Default to large for elderly
    const [highContrast, setHighContrast] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true); // Default to voice ON

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('app-settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            setFontSize(parsed.fontSize || 'large');
            setHighContrast(parsed.highContrast || false);
            setVoiceEnabled(parsed.voiceEnabled ?? true);
        }
    }, []);

    // Save on change
    useEffect(() => {
        localStorage.setItem('app-settings', JSON.stringify({ fontSize, highContrast, voiceEnabled }));

        // Apply classes to body for global styling
        document.body.classList.remove('text-normal', 'text-large', 'text-extra-large', 'high-contrast');
        document.body.classList.add(`text-${fontSize}`);
        if (highContrast) document.body.classList.add('high-contrast');

    }, [fontSize, highContrast, voiceEnabled]);

    return (
        <SettingsContext.Provider value={{
            fontSize,
            highContrast,
            voiceEnabled,
            setFontSize,
            setHighContrast,
            setVoiceEnabled,
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within SettingsProvider');
    return context;
};
