'use client';

import { useState, useEffect } from "react";
import { Check, Edit2, Mic, ShoppingCart, Calendar, Loader2, Utensils } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnalysisResultProps {
    status: string;
    ingredients: string[];
    mealPlan: any[];
    shoppingList: any[];
}

import { useVoiceGuide } from "@/hooks/useVoiceGuide";

export default function AnalysisResult({ status, ingredients, mealPlan, shoppingList }: AnalysisResultProps) {
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
            alert("Web Speech API not supported in this browser.");
            return;
        }

        setIsListening(true);
        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US'; // or 'ja-JP' depending on user preference
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            console.log("Voice Input:", transcript);
            alert(`Voice Command Recognized: "${transcript}"\n(Logic to update ingredients would go here)`);
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
        <div className="w-full max-w-5xl mx-auto space-y-8 pb-24">

            {/* Step 1: Ingredients (Progressive Display) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center text-white">
                        <div className={`p-2 rounded-full mr-3 ${status === 'analyzing' ? 'bg-yellow-500/20 text-yellow-500 animate-pulse' : 'bg-green-500/20 text-green-500'}`}>
                            {status === 'analyzing' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                        </div>
                        Detected Ingredients
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`${isListening ? 'bg-red-500/20 text-red-500 border-red-500' : 'text-neutral-400 border-neutral-800'}`}
                        onClick={handleVoiceCorrection}
                    >
                        <Mic className={`w-4 h-4 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
                        {isListening ? "Listening..." : "Correct with Voice"}
                    </Button>
                </div>

                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                    {ingredients && ingredients.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {ingredients.map((ing, i) => (
                                <Badge key={i} variant="secondary" className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700">
                                    {ing}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <div className="text-neutral-500 italic">
                            {status === 'analyzing' ? "Analyzing images..." : "No ingredients detected."}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Step 2: Meal Plan & Shopping List */}
            {status === 'done' && (
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Meal Plan (2 cols) */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2 space-y-4"
                    >
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            <Calendar className="w-6 h-6 mr-3 text-purple-400" />
                            Weekly Plan
                        </h2>

                        <div className="grid gap-4">
                            {mealPlan && mealPlan.map((dayPlan, i) => (
                                <Card key={i} className="bg-neutral-900/50 border-neutral-800 overflow-hidden text-neutral-200">
                                    <div className="flex flex-col md:flex-row">
                                        <div className="bg-neutral-800/50 px-4 py-3 md:w-32 flex items-center justify-center md:justify-start font-bold text-neutral-400 uppercase tracking-widest text-sm">
                                            {dayPlan.day}
                                        </div>
                                        <div className="p-4 flex-1 grid sm:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-xs text-neutral-500 block mb-1">BREAKFAST</span>
                                                {dayPlan.meals.breakfast}
                                            </div>
                                            <div>
                                                <span className="text-xs text-neutral-500 block mb-1">LUNCH</span>
                                                {dayPlan.meals.lunch}
                                            </div>
                                            <div>
                                                <span className="text-xs text-neutral-500 block mb-1">DINNER</span>
                                                <span className="font-medium text-white">{dayPlan.meals.dinner}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </motion.div>

                    {/* Shopping List (1 col) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-4"
                    >
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            <ShoppingCart className="w-6 h-6 mr-3 text-blue-400" />
                            Shopping List
                        </h2>

                        <Card className="bg-neutral-900/50 border-neutral-800 h-fit sticky top-4">
                            <CardHeader>
                                <CardTitle className="text-lg text-neutral-200">To Buy</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {shoppingList && shoppingList.map((item, i) => (
                                    <div key={i} className="flex items-start justify-between group">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 rounded border border-neutral-600 mr-3 group-hover:border-blue-500 transition-colors" />
                                            <span className="text-neutral-300 text-sm">{item.item}</span>
                                        </div>
                                        {item.reason === 'bargain' && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
                                                SALE
                                            </Badge>
                                        )}
                                    </div>
                                ))}

                                {(!shoppingList || shoppingList.length === 0) && (
                                    <div className="text-center py-8 text-neutral-500 text-sm">
                                        No items needed. <br />You have everything!
                                    </div>
                                )}

                                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                                    Send to Phone
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>

                </div>
            )}
        </div>
    );
}
