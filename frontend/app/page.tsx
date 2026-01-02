'use client';

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Camera, Upload, Smartphone, ArrowRight, ChefHat, Sparkles, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AnalysisResult from "@/components/AnalysisResult";
import { useVoiceGuide } from "@/hooks/useVoiceGuide";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [showQR, setShowQR] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("waiting");
  const [analysisResult, setAnalysisResult] = useState({
    ingredients: [],
    mealPlan: [],
    shoppingList: []
  });

  const { speak } = useVoiceGuide();

  useEffect(() => {
    // Generate a unique session ID for this visit
    setSessionId(crypto.randomUUID());

    // Voice Greeting
    setTimeout(() => {
      speak("スマート献立マネージャーへようこそ。冷蔵庫の写真を撮るか、スマートフォンでQRコードを読み取ってください。");
    }, 1000);
  }, [speak]);

  // Poll for session status
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/status`);
        if (res.ok) {
          const data = await res.json();
          setAnalysisStatus(data.status);

          if (data.status === "uploaded" || data.status === "analyzing" || data.status === "ingredients_ready" || data.status === "done") {
            setShowQR(false); // Close modal when process starts

            // Update results if available
            if (data.ingredients) {
              setAnalysisResult(prev => ({ ...prev, ingredients: data.ingredients }));
            }
            if (data.meal_plan) {
              setAnalysisResult(prev => ({ ...prev, mealPlan: data.meal_plan }));
            }
            if (data.shopping_list) {
              setAnalysisResult(prev => ({ ...prev, shoppingList: data.shopping_list }));
            }
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000); // Poll every 2s

    return () => clearInterval(interval);
  }, [sessionId]);

  const mobileScanUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/mobile/scan/${sessionId}`
    : '';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-neutral-800">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 container mx-auto px-4 h-screen flex flex-col justify-center items-center">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 space-y-6 max-w-2xl"
        >
          <div className="flex justify-center mb-6 relative">
            <Link href="/settings" className="absolute top-0 right-0 p-4">
              <Settings className="w-10 h-10 text-neutral-400 hover:text-white transition-colors" />
            </Link>
            <div className="p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800 backdrop-blur-sm shadow-2xl">
              <ChefHat className="w-12 h-12 text-neutral-200" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
            Smart Meal Manager
          </h1>
          <p className="text-xl text-neutral-400 font-light leading-relaxed">
            Snap your fridge. Get a weekly plan.<br />
            <span className="text-neutral-500">No inventory management required.</span>
          </p>
        </motion.div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Card 1: Mobile Handoff (Recommended) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Card className="h-full bg-neutral-900/50 border-neutral-800 backdrop-blur hover:bg-neutral-900/80 transition-colors group cursor-pointer"
              onClick={() => {
                speak("QRコードを表示します。スマートフォンで読み取ってください。");
                setShowQR(true);
              }}
            >
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4 h-full justify-center">
                <div className="p-4 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Smartphone className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Use Mobile Camera</h3>
                  <p className="text-neutral-400 text-sm">Scan a QR code to snap photos via your phone. Best for PC users.</p>
                </div>
                <Button variant="outline" className="mt-4 border-neutral-700 hover:bg-neutral-800 text-neutral-300">
                  Show QR Code <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2: Direct Upload / Webcam */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Card className="h-full bg-neutral-900/50 border-neutral-800 backdrop-blur hover:bg-neutral-900/80 transition-colors group cursor-pointer">
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4 h-full justify-center">
                <div className="p-4 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Upload className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Upload or Webcam</h3>
                  <p className="text-neutral-400 text-sm">Upload existing photos or use this device's camera directly.</p>
                </div>
                <Button variant="outline" className="mt-4 border-neutral-700 hover:bg-neutral-800 text-neutral-300">
                  Select Files <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* QR Modal Overlay */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setShowQR(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white text-neutral-900 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Scan with Phone</h3>
                  <p className="text-neutral-500 text-sm">
                    Open your camera and scan to start analyzing your fridge.
                  </p>
                </div>

                <div className="flex justify-center p-4 bg-neutral-100 rounded-xl">
                  {mobileScanUrl && (
                    <QRCodeSVG
                      value={mobileScanUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  )}
                </div>

                <div className="text-xs text-neutral-400 font-mono break-all">
                  Session: {sessionId.slice(0, 8)}...
                </div>

                <div className="animate-pulse flex items-center justify-center text-blue-600 text-sm font-medium">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Waiting for connection...
                </div>

                <Button
                  onClick={() => setShowQR(false)}
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
                >
                  Cancel
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROGRESSIVE RESULTS */}
        <div className="w-full mt-12">
          <AnalysisResult
            status={analysisStatus}
            ingredients={analysisResult.ingredients}
            mealPlan={analysisResult.mealPlan}
            shoppingList={analysisResult.shoppingList}
          />
        </div>

      </main>
    </div>
  );
}
