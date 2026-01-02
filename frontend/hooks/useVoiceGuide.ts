import { useCallback, useEffect, useRef } from 'react';
import { useSettings } from '@/context/SettingsContext';

export function useVoiceGuide() {
    const { voiceEnabled } = useSettings();
    const synth = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            synth.current = window.speechSynthesis;
        }
    }, []);

    const speak = useCallback((text: string) => {
        if (!voiceEnabled || !synth.current) return;

        // Cancel previous
        synth.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP'; // Set to Japanese
        utterance.rate = 0.9; // Slightly slower for elderly
        utterance.pitch = 1.0;

        synth.current.speak(utterance);
    }, [voiceEnabled]);

    const cancel = useCallback(() => {
        if (synth.current) synth.current.cancel();
    }, []);

    return { speak, cancel };
}
