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
  ArrowLeft,
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
  const [initialTab, setInitialTab] = useState<string>("ingredients");
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Helper helper to determine API Base URL
  const getApiBaseUrl = () => {
    // If running on client, use hostname (localhost or 192.168.x.x) + port 8000
    if (typeof window !== "undefined") {
      return `http://${window.location.hostname}:8000`;
    }
    return "http://localhost:8000";
  };

  // 1. Create Session on Mount
  useEffect(() => {
    const initSession = async () => {
      // Restore from storage if available
      const savedId = sessionStorage.getItem("smm_session_id");
      if (savedId) {
        setSessionId(savedId);
        return;
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/sessions`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to create session");
        const data = await res.json();
        setSessionId(data.session_id);
        sessionStorage.setItem("smm_session_id", data.session_id);
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
      const url = `${window.location.origin}/mobile/scan/${sessionId}`;
      setMobileScanUrl(url);
    }
  }, [sessionId]);

  // --- History Management ---
  const [history, setHistory] = useState<{ id: string, date: string, ingredients: string[] }[]>([]);

  useEffect(() => {
    // Load history on mount
    const saved = localStorage.getItem("smm_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (sId: string, result: any) => {
    const newEntry = {
      id: sId,
      date: new Date().toLocaleString('ja-JP'),
      ingredients: result.ingredients || []
    };

    setHistory(prev => {
      // Avoid duplicates
      const filtered = prev.filter(h => h.id !== sId);
      const updated = [newEntry, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem("smm_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Poll for Status (Updated with Auto-Save)
  useEffect(() => {
    if (!sessionId) return;

    pollingInterval.current = setInterval(async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/session/${sessionId}/status`);
        if (res.ok) {
          const data = await res.json();

          if (data.status === "done" && analysisStatus !== "done") {
            // Status changed to DONE
            setAnalysisStatus("done");

            // Fetch result
            const resultRes = await fetch(`${baseUrl}/api/session/${sessionId}/result`);
            if (resultRes.ok) {
              const resultData = await resultRes.json();
              setAnalysisResult(resultData);

              // AUTO SAVE to History
              saveToHistory(sessionId, resultData);
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

  // Load History Item
  const loadHistoryItem = async (histId: string) => {
    try {
      setAnalysisStatus("loading"); // Show loading state
      setAnalysisResult(null);

      // Fetch fresh data from backend (or use local if we cached full data, but backend is safer)
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/session/${histId}/result`);
      if (res.ok) {
        const data = await res.json();
        setSessionId(histId);
        setAnalysisStatus("done");
        setAnalysisResult(data);
        sessionStorage.setItem("smm_session_id", histId); // Set as active
      } else {
        setAnalysisStatus("waiting");
        alert("この履歴データはサーバーに見つかりませんでした（古い可能性があります）");
      }
    } catch (e) {
      setAnalysisStatus("waiting");
      alert("データの読み込みに失敗しました");
    }
  };

  if (analysisStatus === "done" && analysisResult) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Result Header */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <h2 className="font-bold text-lg text-slate-700">解析結果</h2>
          <Button variant="ghost" onClick={() => {
            sessionStorage.removeItem("smm_session_id");
            window.location.reload();
          }} className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 gap-2">
            <ArrowLeft className="w-4 h-4" />
            トップに戻る
          </Button>
        </header>

        <div className="p-4 pt-8">
          <AnalysisResult data={analysisResult} initialTab={initialTab} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        .animate-custom-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-bold text-xl">Smart Meal Manager</h1>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 py-12 flex flex-col gap-12 relative">
        {/* Loading Overlay */}
        {analysisStatus === "loading" && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
            <p className="text-xl font-bold text-slate-700">履歴を読み込み中...</p>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-4 px-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-orange-200 rounded-full mb-8 shadow-sm">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-bold text-orange-700 tracking-wide">スマートな献立作りを始めよう</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-8 leading-tight tracking-tight">
            スマートな献立作りを、<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">ここから始めましょう。</span>
          </h2>
        </div>

        {/* History Section (Visible if history exists) */}
        {history.length > 0 && (
          <div className="w-full mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2" /> 最近の履歴
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div key={item.id}
                  onClick={() => {
                    setInitialTab("meal_plan");
                    loadHistoryItem(item.id);
                  }}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 cursor-pointer transition-all">
                  <div className="text-xs text-slate-400 mb-2">{item.date}</div>
                  <div className="flex flex-wrap gap-1">
                    {item.ingredients.slice(0, 5).map((ing, i) => (
                      <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{ing}</span>
                    ))}
                    {item.ingredients.length > 5 && <span className="text-xs text-slate-400">...</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Feature Grid: Side-by-Side (Smartphone vs PC) */}
        <div className="grid grid-cols-2 gap-8 w-full mb-32">
          {/* Scan Card */}
          <div className="px-6 py-10 rounded-[2.5rem] shadow-xl shadow-orange-500/20 text-white relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 flex flex-col items-center text-center"
            style={{ background: 'linear-gradient(135deg, #fb923c 0%, #fcd34d 100%)' }}>
            <Smartphone className="w-12 h-12 mb-4 text-white" />
            <h3 className="text-2xl font-bold mb-2">スマホでスキャン</h3>
            <p className="mb-8 opacity-90">QRコードを読み取って撮影</p>

            {/* QR Display */}
            <div className="bg-white p-4 rounded-3xl shadow-lg">
              {mobileScanUrl ? (
                <QRCodeSVG value={mobileScanUrl} size={140} />
              ) : (
                <div className="w-[140px] h-[140px] bg-slate-100 animate-pulse rounded-xl" />
              )}
            </div>

            <div className="mt-8 flex items-center gap-2 bg-white/20 px-6 py-2 rounded-full backdrop-blur-md">
              <div className={`w-3 h-3 rounded-full ${analysisStatus === 'waiting' ? 'bg-orange-300 animate-custom-blink' : 'bg-green-400'}`} />
              <span className="font-bold">
                {analysisStatus === 'waiting' && <span className="animate-custom-blink">接続待機中...</span>}
                {analysisStatus === 'uploaded' && "画像受信！"}
                {analysisStatus === 'analyzing' && "解析中..."}
              </span>
            </div>
          </div>

          {/* RIGHT: PC Upload */}
          <div
            className="p-10 rounded-[2.5rem] shadow-xl shadow-blue-500/20 text-white flex flex-col items-center text-center group hover:scale-[1.01] transition-transform duration-300 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)' }}
          >
            <div className="bg-white/20 p-4 rounded-2xl mb-6 inline-flex backdrop-blur-sm">
              <Monitor className="w-10 h-10" style={{ color: 'white' }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'white' }}>PCからアップロード</h3>
            <p className="font-medium mb-8 leading-relaxed" style={{ color: 'white' }}>
              保存済みの画像を使用
            </p>

            {/* Upload Area / Button */}
            <div className="w-full mt-auto flex flex-col items-center">
              <Button
                // Modified: Narrower (50%) and Taller (4x height ~ h-24 or similar)
                className="w-[50%] bg-white hover:bg-blue-50 text-blue-900 rounded-full font-bold h-24 shadow-lg shadow-black/20 text-lg flex flex-row gap-3 items-center justify-center group-hover:translate-y-[-2px] transition-all"
                onClick={() => document.getElementById('pc-file-upload')?.click()}
                style={{ borderRadius: '9999px' }} // Force rounded corners
              >
                <ArrowRight className="w-6 h-6 text-blue-600" />
                <span style={{ color: '#1e3a8a' }}>画像ファイルを選択</span>
              </Button>
              <p className="text-xs mt-6 font-medium" style={{ color: 'white' }}>
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
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-50/20 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none" />
          </div>
        </div>

        {/* Bottom Feature Cards (Separate) */}
        <div className="grid grid-cols-3 gap-8 w-full text-white">

          {/* Calendar */}
          <div
            className="flex flex-col items-center text-center group cursor-pointer rounded-[2.5rem] p-10 shadow-xl shadow-green-900/20 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            onClick={() => {
              const saved = localStorage.getItem("smm_history");
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  if (parsed.length > 0) {
                    setInitialTab("meal_plan");
                    loadHistoryItem(parsed[0].id);
                  } else {
                    alert("履歴がありません");
                  }
                } catch (e) {
                  console.error(e);
                }
              } else {
                alert("履歴がありません");
              }
            }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg bg-white/90 backdrop-blur">
              <Calendar className="w-10 h-10 text-emerald-600" />
            </div>
            <h4 className="font-bold text-xl mb-3 text-white">献立カレンダー</h4>
            <p className="text-sm font-medium leading-relaxed text-white/90">
              1週間分の献立を自動で計画。<br />食材の無駄を削減します。
            </p>
          </div>

          {/* AI Recipe */}
          <div
            className="flex flex-col items-center text-center group cursor-pointer rounded-[2.5rem] p-10 shadow-xl shadow-orange-900/20 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
            onClick={() => { }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg bg-white/90 backdrop-blur">
              <ChefHat className="w-10 h-10 text-orange-600" />
            </div>
            <h4 className="font-bold text-xl mb-3 text-white">AI レシピ提案</h4>
            <p className="text-sm font-medium leading-relaxed text-white/90">
              冷蔵庫の食材から最適な<br />レシピを瞬時に提案します。
            </p>
          </div>

          {/* Library */}
          <div
            className="flex flex-col items-center text-center group cursor-pointer rounded-[2.5rem] p-10 shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
            onClick={() => { }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg bg-white/90 backdrop-blur">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h4 className="font-bold text-xl mb-3 text-white">レシピライブラリ</h4>
            <p className="text-sm font-medium leading-relaxed text-white/90">
              お気に入りのレシピを保存。<br />いつでもアクセス可能です。
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
