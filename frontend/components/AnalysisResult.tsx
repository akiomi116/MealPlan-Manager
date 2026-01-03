'use client';

import { useState, useEffect } from "react";
import { Check, Edit2, Mic, ShoppingCart, Calendar, Loader2, Utensils, List } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVoiceGuide } from "@/hooks/useVoiceGuide";

interface AnalysisResultProps {
    data: {
        status: string;
        ingredients: string[];
        mealPlan: any[];
        shoppingList: any[];
    };
}

export default function AnalysisResult({ data }: AnalysisResultProps) {
    const { status, ingredients, mealPlan, shoppingList } = data;
    const [isListening, setIsListening] = useState(false);
    const { speak } = useVoiceGuide();

    // Speak status changes
    useEffect(() => {
        if (status === 'analyzing') {
            speak("画像を解析しています。少々お待ちください。");
        } else if (status === 'ingredients_ready') {
            const count = ingredients?.length || 0;
            speak(`食材を${count}個、見つけました。献立を考えています。`);
        } else if (status === 'done') {
            speak("献立と買い物リストができました。画面をご覧ください。");
        }
    }, [status, speak, ingredients]);

    // Web Speech API implementation
    const handleVoiceCorrection = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("お使いのブラウザは音声認識に対応していません。");
            return;
        }

        setIsListening(true);
        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'ja-JP';
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            console.log("Voice Input:", transcript);
            alert(`音声入力: "${transcript}"\n(食材修正ロジックがここに実装されます)`);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    if (status === "waiting" || status === "created") return null;

    return (
        <div className="w-full max-w-6xl mx-auto pb-24">

            <Tabs defaultValue="ingredients" className="w-full">

                {/* Navigation Header */}
                <div className="w-full mb-8 pt-4">
                    <TabsList className="grid w-full grid-cols-3 max-w-[600px] mx-auto bg-slate-100 p-1 rounded-full h-14 border border-slate-200">
                        <TabsTrigger
                            value="ingredients"
                            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500 font-bold tracking-wide transition-all shadow-sm"
                        >
                            <Utensils className="w-4 h-4 mr-2" />
                            認識結果
                        </TabsTrigger>
                        <TabsTrigger
                            value="meal_plan"
                            disabled={status !== 'done'}
                            className="rounded-full data-[state=active]:bg-purple-500 data-[state=active]:text-white text-slate-400 font-bold tracking-wide transition-all"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            献立リスト
                        </TabsTrigger>
                        <TabsTrigger
                            value="shopping_list"
                            disabled={status !== 'done'}
                            className="rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white text-slate-400 font-bold tracking-wide transition-all"
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            買い物リスト
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Tab 1: Ingredients */}
                <TabsContent value="ingredients" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold flex items-center text-slate-900">
                            <div className={`p-3 rounded-full mr-4 ${status === 'analyzing' ? 'bg-yellow-500/20 text-yellow-500 animate-pulse' :
                                status === 'error' ? 'bg-red-500/20 text-red-500' :
                                    'bg-green-500/20 text-green-500'
                                }`}>
                                {status === 'analyzing' ? <Loader2 className="w-8 h-8 animate-spin" /> :
                                    status === 'error' ? <span className="text-2xl font-bold">!</span> :
                                        <Check className="w-8 h-8" />}
                            </div>
                            検出された食材
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-10 px-4 rounded-full border-white/10 hover:bg-white/5 ${isListening ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'text-neutral-300'}`}
                            onClick={handleVoiceCorrection}
                        >
                            <Mic className={`w-4 h-4 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
                            {isListening ? "聞き取り中..." : "音声で修正"}
                        </Button>
                    </div>

                    <div className="bg-white rounded-3xl p-8 min-h-[400px] shadow-xl border border-slate-200">
                        {ingredients && ingredients.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                                {ingredients.map((ing, i) => (
                                    <Badge key={i} variant="secondary" className="px-6 py-3 text-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 transition-colors">
                                        {ing}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-400 italic flex items-center justify-center h-full min-h-[300px]">
                                {status === 'analyzing' ? (
                                    <span className="animate-pulse">画像を解析中... (10~20秒ほどかかります)</span>
                                ) : status === 'error' ? (
                                    <span className="text-red-500 flex items-center gap-2">
                                        解析に失敗しました。もう一度お試しください。
                                    </span>
                                ) : (
                                    "食材が見つかりませんでした。"
                                )}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Tab 2: Meal Plan */}
                <TabsContent value="meal_plan" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-bold text-slate-900 flex items-center mb-6">
                        <Calendar className="w-8 h-8 mr-4 text-purple-400" />
                        今週の献立
                    </h2>
                    <div className="grid gap-6">
                        {mealPlan && mealPlan.map((dayPlan, i) => (
                            <Card key={i} className="bg-white border-transparent overflow-hidden text-slate-700 group shadow-md hover:shadow-lg transition-all">
                                <div className="flex flex-col md:flex-row">
                                    <div className="bg-slate-50 px-6 py-4 md:w-32 flex items-center justify-center md:justify-start font-bold text-slate-900 text-lg md:text-xl uppercase tracking-widest border-b md:border-b-0 md:border-r border-slate-100">
                                        {dayPlan.day}
                                    </div>
                                    <div className="p-6 flex-1 grid sm:grid-cols-3 gap-6 text-sm">
                                        <div>
                                            <span className="text-xs text-slate-400 font-bold block mb-2 tracking-wider">朝食</span>
                                            <span className="text-slate-700 text-base">{dayPlan.meals.breakfast}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400 font-bold block mb-2 tracking-wider">昼食</span>
                                            <span className="text-slate-700 text-base">{dayPlan.meals.lunch}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400 font-bold block mb-2 tracking-wider">夕食</span>
                                            <span className="font-bold text-slate-900 text-lg">{dayPlan.meals.dinner}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Tab 3: Shopping List */}
                <TabsContent value="shopping_list" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-bold text-slate-900 flex items-center mb-6">
                        <ShoppingCart className="w-8 h-8 mr-4 text-blue-400" />
                        買い物リスト
                    </h2>
                    <Card className="bg-white border-transparent shadow-xl rounded-3xl">
                        <CardHeader className="border-b border-slate-100 pb-4">
                            <CardTitle className="text-xl text-slate-900">買うもの</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {shoppingList && shoppingList.map((item, i) => (
                                <div key={i} className="flex items-start justify-between group p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                                    <div className="flex items-center">
                                        <div className="w-5 h-5 rounded border border-slate-300 mr-3 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                                        </div>
                                        <span className="text-slate-800 text-lg">{item.item}</span>
                                    </div>
                                    {item.reason === 'bargain' && (
                                        <Badge variant="outline" className="text-xs px-2 py-1 border-yellow-500/50 text-yellow-600 bg-yellow-500/10">
                                            特売
                                        </Badge>
                                    )}
                                </div>
                            ))}

                            {(!shoppingList || shoppingList.length === 0) && (
                                <div className="text-center py-12 text-slate-400">
                                    必要なものはありません。<br />完璧です！
                                </div>
                            )}

                            <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20 text-lg">
                                スマホに送る
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
