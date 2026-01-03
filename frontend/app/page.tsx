'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Monitor,
  Calendar,
  ChefHat,
  BookOpen,
  ArrowRight,
  Sparkles,
  ArrowRightCircle
} from "lucide-react";
import AnalysisResult from "@/components/AnalysisResult";

export default function Home() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mobileScanUrl, setMobileScanUrl] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string>("waiting"); // waiting, uploaded, analyzing, ingredients_ready, done
  const [analysisResult, setAnalysisResult] = useState<any>(null); // To store the fetched result
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // 1. Create Session on Mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/sessions", { method: "POST" });
        if (!res.ok) throw new Error("Failed to create session");
        const data = await res.json();
        setSessionId(data.session_id);
      } catch (err) {
        console.error("Session creation error:", err);
      }
    };
    initSession();
  }, []);

  // 2. Generate QR URL
  useEffect(() => {
    if (sessionId) {
      // For main PC view, the QR leads to the mobile upload page
      const url = `${window.location.origin}/mobile/${sessionId}`;
      setMobileScanUrl(url);
    }
  }, [sessionId]);

  // 3. Poll for Status
  useEffect(() => {
    if (!sessionId) return;

    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/session/${sessionId}/status`);
        if (res.ok) {
          const data = await res.json();
          // data.status: "waiting", "uploaded", "analyzing", "done"
          // If we receive "done" (or ingredients_ready in some versions), we fetch results
          if (data.status === "done" && analysisStatus !== "done") {
            setAnalysisStatus("done");
            // Fetch final result
            const resultRes = await fetch(`http://localhost:8000/api/session/${sessionId}/result`);
            if (resultRes.ok) {
              const resultData = await resultRes.json();
              setAnalysisResult(resultData);
            }
            if (pollingInterval.current) clearInterval(pollingInterval.current);
          } else if (data.status !== analysisStatus && data.status !== "done") {
            setAnalysisStatus(data.status);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [sessionId, analysisStatus]);
  // If analysis is done, show the result view
  if (analysisStatus === "done" && analysisResult) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <AnalysisResult data={analysisResult} />
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => window.location.reload()}>
            トップに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* 1. Header Area */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-bold text-xl">Smart Meal Manager (Layout Test)</h1>
        </div>
      </header>

      {/* 2. Main Layout Container - Forced Width */}
      <main className="w-full max-w-5xl mx-auto px-4 py-12 flex flex-col gap-12">

        {/* Hero Section */}
        <div className="text-center mb-4 px-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-orange-200 rounded-full mb-8 shadow-sm">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-bold text-orange-700 tracking-wide">スマートな献立作りを始めよう</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-8 leading-tight tracking-tight">
            スマートな献立作りを、<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">ここから始めましょう。</span>
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-lg md:text-xl leading-relaxed mb-4">
            冷蔵庫の中身を賢く管理して、AIが食材を認識。<br className="hidden md:block" />
            あなたに代わりぴったりの献立を考えます。
          </p>
        </div>

        {/* Main Feature Grid: Side-by-Side (Smartphone vs PC) */}
        <div className="grid grid-cols-2 gap-16 w-full mb-32">

          {/* LEFT: Smartphone Scan (QR Code) */}
          <div
            className="px-6 py-10 rounded-[2.5rem] shadow-xl shadow-orange-500/20 text-white relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 flex flex-col items-center text-center"
            style={{ background: 'linear-gradient(135deg, #fb923c 0%, #fcd34d 100%)' }}
          >
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm mb-6 inline-flex">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4">スマホで撮影</h3>
            <p className="text-orange-50 font-medium mb-12 leading-relaxed w-full max-w-sm">
              QRコードを読み込んで、<br />
              カメラで冷蔵庫の中身を撮影してください
            </p>

            {/* Status & QR Wrapper */}
            <div className="flex flex-col items-center gap-10 z-20 w-full relative">
              {/* Connection Status - Glassmorphism */}
              <div className="flex-shrink-0 flex items-center gap-3 bg-white/20 backdrop-blur-md border border-white/30 px-8 py-3 rounded-full shadow-lg">
                <div className={`w-4 h-4 rounded-full ${analysisStatus === 'waiting' ? 'bg-orange-300 animate-pulse' : 'bg-green-400'}`} />
                <span className="text-xl font-extrabold tracking-wide text-white drop-shadow-sm">
                  {analysisStatus === 'waiting' && "接続待機中"}
                  {analysisStatus === 'uploaded' && "画像を受信しました"}
                  {analysisStatus === 'analyzing' && "AI解析中..."}
                  {analysisStatus === 'done' && "解析完了"}
                </span>
              </div>

              {/* QR Code Area - Real Logic */}
              <div className="bg-white p-4 rounded-3xl shadow-lg transition-all duration-500 flex-shrink-0">
                {mobileScanUrl ? (
                  <div className="bg-white">
                    <QRCodeSVG value={mobileScanUrl} size={150} level="H" />
                  </div>
                ) : (
                  <div className="w-[150px] h-[150px] bg-slate-100 flex items-center justify-center text-slate-400 rounded-xl">
                    Wait...
                  </div>
                )}
              </div>
            </div>

            {/* Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none mix-blend-overlay" />
          </div>

          {/* RIGHT: PC Upload */}
          <div
            className="p-10 rounded-[2.5rem] shadow-xl shadow-blue-500/20 text-white flex flex-col items-center text-center group hover:scale-[1.01] transition-transform duration-300 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)' }}
          >
            <div className="bg-white/20 p-4 rounded-2xl mb-6 inline-flex backdrop-blur-sm">
              <Monitor className="w-10 h-10" style={{ color: 'white' }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'white' }}>PCから画像を追加</h3>
            <p className="font-medium mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
              PC内の画像を直接アップロードして、<br />すぐに献立作成へ。
            </p>

            {/* Upload Area / Button */}
            <div className="w-full mt-auto flex flex-col items-center">
              <Button
                className="w-[60%] bg-white hover:bg-blue-50 text-blue-600 rounded-full font-bold h-16 shadow-lg shadow-black/10 text-lg flex items-center justify-center gap-3 group-hover:translate-y-[-2px] transition-all"
                onClick={() => document.getElementById('pc-file-upload')?.click()}
              >
                <span className="bg-blue-100 p-1 rounded-full"><ArrowRight className="w-5 h-5 text-blue-600" /></span>
                <span>画像を選択</span>
              </Button>
              <p className="text-xs mt-4 font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                JPG, PNG, WEBP, HEIC に対応しています
              </p>
            </div>

            <input
              type="file"
              id="pc-file-upload"
              className="hidden"
              accept="image/*,.heic,.heif"
              multiple
            // Logic placeholder
            />

            {/* Decor */}
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-50/50 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none" />
          </div>
        </div>

        {/* 3-Column Grid for Features - Styled (Vertical Cards) */}
        <div className="grid grid-cols-3 gap-6 w-full">
          {/* Calendar */}
          <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-100 border border-slate-100 hover:border-green-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group h-full flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner"
              style={{ backgroundColor: '#f0fdf4' }} // green-50
            >
              <Calendar className="w-10 h-10" style={{ color: '#16a34a' }} /> {/* green-600 */}
            </div>
            <h4 className="font-bold text-xl text-slate-900 mb-3">献立カレンダー</h4>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              1週間分の献立を自動で計画。<br />食材の無駄を削減します。
            </p>
          </div>

          {/* AI Recipe */}
          <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-100 border border-slate-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group h-full flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner"
              style={{ backgroundColor: '#fff7ed' }} // orange-50
            >
              <ChefHat className="w-10 h-10" style={{ color: '#ea580c' }} /> {/* orange-600 */}
            </div>
            <h4 className="font-bold text-xl text-slate-900 mb-3">AI レシピ提案</h4>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              冷蔵庫の食材から最適な<br />レシピを瞬時に提案します。
            </p>
          </div>

          {/* Library */}
          <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-100 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group h-full flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner"
              style={{ backgroundColor: '#eff6ff' }} // blue-50
            >
              <BookOpen className="w-10 h-10" style={{ color: '#2563eb' }} /> {/* blue-600 */}
            </div>
            <h4 className="font-bold text-xl text-slate-900 mb-3">レシピライブラリ</h4>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              お気に入りのレシピを保存。<br />いつでもアクセス可能です。
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
