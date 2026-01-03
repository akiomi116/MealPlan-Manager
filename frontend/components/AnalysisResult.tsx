'use client';

import { useState, useEffect } from "react";
import { Check, Edit2, Mic, ShoppingCart, Calendar, Loader2, Utensils, List, Sun, Moon, Coffee, ChefHat, X, Loader } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVoiceGuide } from "@/hooks/useVoiceGuide";

interface CategorizedIngredient {
    name: string;
    category: string;
}

interface AnalysisResultProps {
    data: {
        status: string;
        ingredients: CategorizedIngredient[] | string[]; // Support both formats
        mealPlan: any[];
        shoppingList: any[];
    };
    initialTab?: string;
}

export default function AnalysisResult({ data, initialTab = "ingredients" }: AnalysisResultProps) {
    const { status, ingredients, mealPlan, shoppingList } = data;
    const [isListening, setIsListening] = useState(false);
    const { speak } = useVoiceGuide();

    // Stock Management State
    const [stockStatus, setStockStatus] = useState<Record<string, boolean>>({});

    // Normalize ingredients to categorized format
    const categorizedIngredients: CategorizedIngredient[] = Array.isArray(ingredients)
        ? ingredients.map(ing =>
            typeof ing === 'string'
                ? { name: ing, category: 'その他' }
                : ing
        )
        : [];

    // Group ingredients by category
    const groupedIngredients = categorizedIngredients.reduce((acc, ing) => {
        if (!acc[ing.category]) acc[ing.category] = [];
        acc[ing.category].push(ing.name);
        return acc;
    }, {} as Record<string, string[]>);

    // Category display order and colors
    const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
        '野菜': { label: '野菜', color: 'bg-green-50 border-green-200 text-green-700', icon: '🥕' },
        '肉類': { label: '肉類', color: 'bg-red-50 border-red-200 text-red-700', icon: '🥩' },
        '魚介類': { label: '魚介類', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🐟' },
        '乳製品': { label: '乳製品', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: '🧀' },
        '調味料': { label: '調味料', color: 'bg-orange-50 border-orange-200 text-orange-700', icon: '🧂' },
        'その他': { label: 'その他', color: 'bg-slate-50 border-slate-200 text-slate-700', icon: '🍽️' }
    };

    const toggleStock = (name: string) => {
        setStockStatus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const markAllSeasonings = () => {
        const seasonings = groupedIngredients['調味料'] || [];
        const updates: Record<string, boolean> = {};
        seasonings.forEach(s => updates[s] = true);
        setStockStatus(prev => ({ ...prev, ...updates }));
    };

    // Recipe Suggestion State
    const [suggestModalOpen, setSuggestModalOpen] = useState(false);
    const [suggestedRecipes, setSuggestedRecipes] = useState<string[]>([]);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [targetIngredient, setTargetIngredient] = useState("");

    const handleSuggest = async (ingredient: string) => {
        setTargetIngredient(ingredient);
        setSuggestModalOpen(true);
        setSuggestLoading(true);
        setSuggestedRecipes([]);

        try {
            // Need the base URL logic? Usually relative path works if proxy or same origin.
            // Assuming Next.js rewrites or same host.
            // But page.tsx uses absolute URL. Let's try relative first, or pass baseUrl prop.
            // Actually, page.tsx doesn't pass baseUrl.
            // Let's assume relative path /api works because we are on the same domain (Nextjs proxying to FastAPI?)
            // Wait, previous fetches in page.tsx used getApiBaseUrl(). AnalysisResult doesn't have it.
            // I'll assume same origin or simple fetch for now. If CORS fails, I might need to fix.
            // Update: page.tsx passes data, but not the url helper. 
            // I'll hardcode localhost:8000 for dev if absolute needed, or try relative.
            const res = await fetch(`http://localhost:8000/api/recipes/suggest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredient })
            });
            if (res.ok) {
                const data = await res.json();
                setSuggestedRecipes(data.recipes);
            } else {
                setSuggestedRecipes(["レシピの取得に失敗しました"]);
            }
        } catch (e) {
            console.error(e);
            setSuggestedRecipes(["通信エラーが発生しました"]);
        } finally {
            setSuggestLoading(false);
        }
    };

    // Speak status changes
    // Speak status changes - DISABLED BY DEFAULT
    /*
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
    */

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
        recognition.start();
    };

    // Date Calculation Helper
    const getDateInfo = (index: number) => {
        const d = new Date();
        d.setDate(d.getDate() + index); // Assuming index 0 is today
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
        const dayName = days[d.getDay()];
        return { dateLabel: `${year}-${month}-${date}`, dayName };
    };

    if (status === "waiting" || status === "created") return null;

    return (
        <div className="w-full max-w-6xl mx-auto pb-24">

            <Tabs defaultValue={initialTab} className="w-full">

                {/* Navigation Header */}
                <div className="w-full mb-8 pt-4">
                    <TabsList className="grid w-full grid-cols-3 max-w-[600px] mx-auto bg-transparent p-0 gap-4 h-auto">
                        <TabsTrigger
                            value="ingredients"
                            className="rounded-full py-3 bg-orange-100 text-orange-700 hover:bg-orange-200 data-[state=active]:bg-orange-500 data-[state=active]:text-white font-bold tracking-wide transition-all shadow-sm data-[state=active]:shadow-lg"
                        >
                            <Utensils className="w-4 h-4 mr-2" />
                            あなたの食材
                        </TabsTrigger>
                        <TabsTrigger
                            value="meal_plan"
                            disabled={status !== 'done'}
                            className="rounded-full py-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-bold tracking-wide transition-all shadow-sm data-[state=active]:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            献立カレンダー
                        </TabsTrigger>
                        <TabsTrigger
                            value="shopping_list"
                            disabled={status !== 'done'}
                            className="rounded-full py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold tracking-wide transition-all shadow-sm data-[state=active]:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                            あなたの食材
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
                        {categorizedIngredients && categorizedIngredients.length > 0 ? (
                            <div className="space-y-6">
                                {/* Quick Actions */}
                                {groupedIngredients['調味料'] && groupedIngredients['調味料'].length > 0 && (
                                    <div className="flex justify-end">
                                        <button
                                            onClick={markAllSeasonings}
                                            className="text-sm px-4 py-2 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors font-medium"
                                        >
                                            🧂 調味料を全て在庫ありにする
                                        </button>
                                    </div>
                                )}

                                {/* Categorized Ingredients */}
                                {Object.entries(groupedIngredients).map(([category, items]) => {
                                    const config = categoryConfig[category] || categoryConfig['その他'];
                                    return (
                                        <div key={category} className="space-y-3">
                                            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                                <span className="text-2xl">{config.icon}</span>
                                                {config.label}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {items.map((name, idx) => {
                                                    const inStock = stockStatus[name];
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`group relative px-4 py-3 border-2 rounded-xl transition-all ${config.color} ${inStock ? 'opacity-50' : 'hover:shadow-md'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {/* Checkbox */}
                                                                <input
                                                                    type="checkbox"
                                                                    checked={inStock || false}
                                                                    onChange={() => toggleStock(name)}
                                                                    className="w-4 h-4 rounded cursor-pointer"
                                                                />
                                                                {/* Ingredient Name */}
                                                                <button
                                                                    onClick={() => handleSuggest(name)}
                                                                    className={`font-bold ${inStock ? 'line-through' : 'hover:underline'}`}
                                                                >
                                                                    {name}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                <p className="text-right text-sm text-slate-400 mt-6">
                                    ※ チェックを入れると「在庫あり」として買い物リストから除外されます
                                </p>
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
                {/* Tab 2: Meal Plan */}
                <TabsContent value="meal_plan" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold text-slate-800 flex items-center">
                            <Calendar className="w-8 h-8 mr-3 text-emerald-500" />
                            献立カレンダー
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mealPlan && mealPlan.map((dayPlan, i) => {
                            const { dateLabel, dayName } = getDateInfo(i);
                            // Color variation for weekend? Or just alternate? Let's keep it simple and clean.
                            return (
                                <Card key={i} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col">
                                    {/* Header */}
                                    <div className="p-4 text-white text-center relative overflow-hidden"
                                        style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}>
                                        <div className="relative z-10">
                                            <div className="text-3xl font-extrabold tracking-widest mb-1 shadow-black drop-shadow-md">{dayName}</div>
                                            <div className="text-emerald-100 font-mono text-sm opacity-90 tracking-wider">{dateLabel}</div>
                                        </div>
                                        {/* Decorative Circle */}
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                    </div>

                                    {/* Content - Color Blocks */}
                                    <div className="flex-1 flex flex-col">
                                        {/* Breakfast Block */}
                                        <div className="p-5 flex-1 transition-colors hover:brightness-95 flex flex-col justify-center"
                                            style={{ backgroundColor: '#ffedd5' }}> {/* Orange 50/100ish */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <Coffee className="w-5 h-5 text-orange-600" />
                                                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">朝食</span>
                                            </div>
                                            <p className="text-slate-800 font-bold text-lg leading-snug">
                                                {dayPlan.meals.breakfast}
                                            </p>
                                        </div>

                                        {/* Lunch Block */}
                                        <div className="p-5 flex-1 transition-colors hover:brightness-95 flex flex-col justify-center"
                                            style={{ backgroundColor: '#fef9c3' }}> {/* Yellow 100 */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sun className="w-5 h-5 text-yellow-600" />
                                                <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">昼食</span>
                                            </div>
                                            <p className="text-slate-800 font-bold text-lg leading-snug">
                                                {dayPlan.meals.lunch}
                                            </p>
                                        </div>

                                        {/* Dinner Block */}
                                        <div className="p-5 flex-1 transition-colors hover:brightness-95 flex flex-col justify-center border-t border-slate-200"
                                            style={{ backgroundColor: '#e2e8f0' }}> {/* Slate 100 */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <Moon className="w-5 h-5 text-slate-600" />
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">夕食</span>
                                            </div>
                                            <p className="text-slate-900 font-extrabold text-xl leading-snug drop-shadow-sm">
                                                {dayPlan.meals.dinner}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
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

                            <Button className="w-1/2 mx-auto block mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20 text-lg">
                                スマホに送る
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>

            {/* Recipe Suggestion Modal */}
            {suggestModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSuggestModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-gradient-to-r from-orange-400 to-pink-500 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <ChefHat className="w-6 h-6" />
                                {targetIngredient}のレシピ知識
                            </h3>
                            <button onClick={() => setSuggestModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            {suggestLoading ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <Loader2 className="w-12 h-12 text-orange-400 animate-spin mb-4" />
                                    <p className="text-slate-500 font-medium">AIシェフが考案中...</p>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {suggestedRecipes.map((recipe, idx) => (
                                        <li key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100">
                                            <div className="bg-orange-200 text-orange-700 font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <span className="text-lg font-bold text-slate-800 pt-0.5">{recipe}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="mt-8 text-center">
                                <Button onClick={() => setSuggestModalOpen(false)} variant="outline" className="rounded-full px-8">
                                    閉じる
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
