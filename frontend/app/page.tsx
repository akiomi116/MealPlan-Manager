'use client';

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Upload, ArrowRight, ChefHat, Sparkles, Settings, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalysisResult from "@/components/AnalysisResult";
import { useVoiceGuide } from "@/hooks/useVoiceGuide";

// Simple UUID generator fallback for insecure contexts (HTTP)
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Continue to fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [analysisStatus, setAnalysisStatus] = useState("waiting");
  const [analysisResult, setAnalysisResult] = useState({
    ingredients: [],
    mealPlan: [],
    shoppingList: []
  });

  const { speak } = useVoiceGuide();
  const [localIp, setLocalIp] = useState<string>("");

  // Initialize Session
  useEffect(() => {
    setSessionId(generateUUID());

    // Fetch Local IP for QR Code (Needed when running on localhost)
    // Fetch Local IP for QR Code (Needed when running on localhost)
    fetch("/api/network-info")
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Network Info Error: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.ip && data.ip !== "127.0.0.1") {
          setLocalIp(data.ip);
        }
      })
      .catch(err => console.error("Failed to fetch network info", err));

    // Slight delay for better UX on voice start
    setTimeout(() => {
      speak("スマート献立マネージャーへようこそ。画面右側のQRコードを読み取るか、左側のボタンから画像をアップロードしてください。");
    }, 1500);
  }, [speak]);

  // Polling Mechanism
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/status`);
        if (res.ok) {
          try {
            const data = await res.json();
            setAnalysisStatus(data.status);

            // Auto-trigger analysis if just uploaded (Robustness fix)
            if (data.status === 'uploaded') {
              console.log("Auto-triggering analysis from Desktop...");
              fetch(`/api/session/${sessionId}/analyze`, { method: "POST" }).catch(e => console.error("Auto-analyze failed", e));
              // Optimization: Optimistically set status to avoid double trigger
              setAnalysisStatus('analyzing');
            }

            if (["uploaded", "analyzing", "ingredients_ready", "done", "error"].includes(data.status)) {
              if (data.ingredients) setAnalysisResult(prev => ({ ...prev, ingredients: data.ingredients }));
              if (data.meal_plan) setAnalysisResult(prev => ({ ...prev, mealPlan: data.meal_plan }));
              if (data.shopping_list) setAnalysisResult(prev => ({ ...prev, shoppingList: data.shopping_list }));
            }
          } catch (jsonError) {
            console.error("JSON Parse Error on Status:", jsonError);
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const [mobileScanUrl, setMobileScanUrl] = useState("");

  useEffect(() => {
    if (sessionId) {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // If accessed via localhost, use the LAN IP for the QR code so mobile can connect
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && localIp) {
          const port = window.location.port || '3000';
          setMobileScanUrl(`http://${localIp}:${port}/mobile/scan/${sessionId}`);
        } else {
          // Otherwise (ngrok, production w/ domain, or already on LAN IP), use the current origin
          setMobileScanUrl(`${window.location.origin}/mobile/scan/${sessionId}`);
        }
      }
    }
  }, [sessionId, localIp]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative force-split-layout flex flex-col md:flex-row">

      {/* Dynamic Background Effects (Global) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/20 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* LEFT PANE: Tabs (QR, Upload, Settings) */}
      <div className="relative z-10 w-full md:w-1/2 force-split-pane flex flex-col justify-center items-center p-8 md:p-12 lg:p-20 border-b md:border-b-0 md:border-r border-white/5 space-y-12 min-h-[50vh] md:min-h-screen bg-background/50 backdrop-blur-sm order-1 md:order-1">

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Header/Branding for Desktop */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Smart Meal Manager</h1>
            <p className="text-sm text-neutral-400">献立作りを、もっとスマートに。</p>
          </div>

          <div className="glass rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px]" />

            <Tabs defaultValue="mobile" className="w-full relative z-10">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-black/40 p-1 rounded-xl">
                <TabsTrigger value="mobile" className="rounded-lg data-[state=active]:bg-white/20 data-[state=active]:text-white text-neutral-400">スマホ入力</TabsTrigger>
                <TabsTrigger value="pc" className="rounded-lg data-[state=active]:bg-white/20 data-[state=active]:text-white text-neutral-400">画像取込</TabsTrigger>
                <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white/20 data-[state=active]:text-white text-neutral-400">設定</TabsTrigger>
              </TabsList>

              {/* TAB 1: Mobile Scan (QR) */}
              <TabsContent value="mobile" className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 text-blue-300 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <span className="font-semibold tracking-wider text-sm">MOBILE SYNC</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">スマホでスキャン</h2>
                  <p className="text-neutral-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                    QRコードを読み取って、<br />カメラで冷蔵庫の中身を撮影してください。
                  </p>
                </div>

                <div className="relative p-6 bg-white rounded-3xl shadow-inner transform transition-transform hover:scale-105 duration-300 ring-4 ring-white/10">
                  {mobileScanUrl && (
                    <div className="relative">
                      <QRCodeSVG value={mobileScanUrl} size={180} level="H" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <ChefHat className="w-12 h-12 text-black" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full">
                  <div className="flex items-center justify-center text-blue-300 text-xs font-medium animate-pulse bg-blue-500/10 py-2 px-4 rounded-full mx-auto w-fit border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Sparkles className="w-3 h-3 mr-2" />
                    {analysisStatus === 'waiting' && "接続待機中..."}
                    {analysisStatus === 'uploaded' && "画像を受信しました！"}
                    {analysisStatus === 'analyzing' && "AIが献立を解析中..."}
                    {(analysisStatus === 'ingredients_ready' || analysisStatus === 'done') && "解析完了！"}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: PC Upload */}
              <TabsContent value="pc" className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 text-purple-300 mb-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-semibold tracking-wider text-sm">PC UPLOAD</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">画像をアップロード</h2>
                  <p className="text-neutral-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                    PC内にある画像を選択して、<br />直接アップロードできます。
                  </p>
                </div>

                <div
                  className="w-full aspect-square max-w-[220px] rounded-3xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden"
                  onClick={() => document.getElementById('pc-file-upload')?.click()}
                >
                  <input
                    type="file"
                    id="pc-file-upload"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;

                      const formData = new FormData();
                      for (let i = 0; i < files.length; i++) {
                        formData.append("files", files[i]);
                      }

                      try {
                        // Simulate status updates for UX
                        setAnalysisStatus("uploaded");
                        const res = await fetch(`/api/session/${sessionId}/images`, {
                          method: "POST",
                          body: formData
                        });
                        if (res.ok) {
                          setAnalysisStatus("analyzing");
                          // Trigger analysis
                          await fetch(`/api/session/${sessionId}/analyze`, { method: "POST" });
                        }
                      } catch (err) {
                        console.error(err);
                        alert("アップロードに失敗しました");
                        setAnalysisStatus("waiting");
                      }
                    }}
                  />
                  <Upload className="w-12 h-12 text-neutral-500 group-hover:text-white transition-colors mb-4" />
                  <span className="text-sm text-neutral-400 group-hover:text-white font-medium">クリックして選択</span>
                </div>

                <p className="text-xs text-neutral-600">
                  対応フォーマット: JPG, PNG, WEBP
                </p>
              </TabsContent>

              {/* TAB 3: Settings */}
              <TabsContent value="settings" className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-white tracking-tight">設定</h2>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    アプリの設定やアカウント管理
                  </p>
                </div>

                <div className="w-full space-y-4 px-4">
                  <Link href="/settings" className="block">
                    <Button variant="outline" className="w-full justify-between h-14 bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white">
                      <span className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-neutral-400" />
                        詳細設定を開く
                      </span>
                      <ArrowRight className="w-4 h-4 text-neutral-500" />
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => {
                      if (confirm("セッションをリセットしますか？")) {
                        window.location.reload();
                      }
                    }}
                  >
                    セッションをリセット
                  </Button>
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANE: Usage Guide / Results (Visible when waiting) */}
      <div className="relative z-10 w-full md:w-1/2 force-split-pane h-full min-h-[50vh] md:min-h-screen bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/5 order-2 md:order-2">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center space-y-12">
          <div className="space-y-4 max-w-lg">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              スマートな献立作りを、<br />ここから始めましょう。
            </h2>
            <p className="text-neutral-400 text-lg">
              冷蔵庫の中身をスマホで撮るだけ。<br />
              AIが食材を認識し、あなたに代わって献立を考えます。
            </p>
          </div>

          <div className="grid gap-8 text-left max-w-md w-full">
            {/* Step 1 */}
            <div className="flex items-start group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xl mr-6 group-hover:bg-blue-500 group-hover:text-white transition-colors border border-blue-500/20 shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-200 transition-colors">スマホで連携</h3>
                <p className="text-neutral-400 text-sm mb-3">
                  表示されているQRコードを読み取って、<br />スマホとこの画面をつなぎます。
                </p>

                {/* Mobile Standalone Button */}
                <Button
                  className="md:hidden w-full bg-blue-600 hover:bg-blue-500 text-white"
                  onClick={() => window.open(`/mobile/scan/${sessionId}`, '_self')}
                >
                  この端末で撮影する
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xl mr-6 group-hover:bg-purple-500 group-hover:text-white transition-colors border border-purple-500/20 shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-200 transition-colors">パシャっと撮影</h3>
                <p className="text-neutral-400 text-sm">スマホカメラで冷蔵庫や食材を撮影し、<br />そのまま送信してください。</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start group">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center font-bold text-xl mr-6 group-hover:bg-green-500 group-hover:text-white transition-colors border border-green-500/20 shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-green-200 transition-colors">AIにおまかせ</h3>
                <p className="text-neutral-400 text-sm">数秒で食材リストと献立が完成。<br />買い物リストも自動で作られます。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Results Overlay */}
      <AnimatePresence>
        {(analysisStatus !== 'waiting' && analysisStatus !== 'created') && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black overflow-y-auto"
          >
            <div className="min-h-screen p-4 md:p-12 flex justify-center">
              <div className="max-w-5xl w-full relative">
                <div className="absolute top-0 right-0 z-50">
                  <Button
                    onClick={() => setAnalysisResult({ ingredients: [], mealPlan: [], shoppingList: [] })}
                    variant="outline"
                    className="rounded-full h-12 w-12 p-0 border-white/10 bg-black/50 hover:bg-black/70 text-white"
                  >
                    ✕
                  </Button>
                </div>
                <div className="mt-16">
                  <AnalysisResult
                    status={analysisStatus}
                    ingredients={analysisResult.ingredients}
                    mealPlan={analysisResult.mealPlan}
                    shoppingList={analysisResult.shoppingList}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
