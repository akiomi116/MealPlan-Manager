'use client';

import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Check, Volume2, Type, Eye } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const { fontSize, highContrast, voiceEnabled, setFontSize, setHighContrast, setVoiceEnabled } = useSettings();

    return (
        <div className={`min-h-screen p-6 ${highContrast ? 'bg-white text-black' : 'bg-neutral-950 text-neutral-100'}`}>
            <div className="max-w-3xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex items-center space-x-6">
                    <Link href="/">
                        <Button size="lg" className="w-16 h-16 rounded-full" variant="outline">
                            <ArrowLeft className="w-8 h-8" />
                        </Button>
                    </Link>
                    <h1 className="text-4xl font-bold">アプリの設定</h1>
                </div>

                {/* Font Size */}
                <Section title="文字の大きさ" icon={<Type className="w-8 h-8" />}>
                    <div className="grid grid-cols-3 gap-6">
                        {['normal', 'large', 'extra-large'].map((size) => (
                            <button
                                key={size}
                                onClick={() => setFontSize(size as any)}
                                className={`
                  p-8 rounded-2xl border-4 flex flex-col items-center justify-center space-y-4 transition-all
                  ${fontSize === size
                                        ? 'border-blue-500 bg-blue-500/10 scale-105 shadow-xl'
                                        : 'border-neutral-700 hover:bg-neutral-800'}
                `}
                            >
                                <span className={`font-bold ${size === 'normal' ? 'text-xl' : size === 'large' ? 'text-3xl' : 'text-5xl'}`}>
                                    あ
                                </span>
                                <span className="text-lg font-medium">
                                    {size === 'normal' ? '標準' : size === 'large' ? '大きい' : '特大'}
                                </span>
                                {fontSize === size && <Check className="w-8 h-8 text-blue-500" />}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Volume */}
                <Section title="音声ガイド" icon={<Volume2 className="w-8 h-8" />}>
                    <div className="flex items-center justify-between p-6 bg-neutral-900/50 rounded-3xl border border-neutral-800">
                        <div className="space-y-2">
                            <Label className="text-2xl font-bold">音声を流す</Label>
                            <p className="text-neutral-400">操作の説明や、献立の読み上げを行います。</p>
                        </div>
                        <Switch
                            checked={voiceEnabled}
                            onCheckedChange={setVoiceEnabled}
                            className="scale-150 mr-4"
                        />
                    </div>
                </Section>

                {/* High Contrast */}
                <Section title="見やすさ" icon={<Eye className="w-8 h-8" />}>
                    <div className="flex items-center justify-between p-6 bg-neutral-900/50 rounded-3xl border border-neutral-800">
                        <div className="space-y-2">
                            <Label className="text-2xl font-bold">はっきりした色（白背景）</Label>
                            <p className="text-neutral-400">黒い背景が見にくい場合は、白くて明るい画面にします。</p>
                        </div>
                        <Switch
                            checked={highContrast}
                            onCheckedChange={setHighContrast}
                            className="scale-150 mr-4"
                        />
                    </div>
                </Section>

            </div>
        </div>
    );
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="space-y-6">
            <h2 className="text-3xl font-bold flex items-center gap-4 border-b border-neutral-800 pb-4">
                {icon}
                {title}
            </h2>
            {children}
        </section>
    )
}
