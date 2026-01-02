'use client';

import { useState, useRef, useEffect, use } from "react";
import { Camera, Image as ImageIcon, Check, X, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function MobileScanPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = use(params);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isCameraActive, setIsCameraActive] = useState(false);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        // Safety check for insecure contexts (HTTP) where mediaDevices is undefined
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn("Camera API ignored: Secure context required.");
            setIsCameraActive(false);
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setIsCameraActive(true);
        } catch (err) {
            console.error("Camera access denied:", err);
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg");
            setCapturedImages(prev => [...prev, dataUrl]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setCapturedImages(prev => [...prev, ev.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleShutter = () => {
        if (isCameraActive) {
            capturePhoto();
        } else {
            fileInputRef.current?.click();
        }
    };

    const handleUpload = async () => {
        if (capturedImages.length === 0) return;

        try {
            const formData = new FormData();

            // Convert data URLs to Blobs
            for (let i = 0; i < capturedImages.length; i++) {
                const res = await fetch(capturedImages[i]);
                const blob = await res.blob();
                formData.append("files", blob, `image_${i}.jpg`);
            }

            const response = await fetch(`/api/session/${sessionId}/images`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();

            // Trigger Analysis immediately after upload
            // In a real app, we might wait or let the main screen trigger it.
            // But for "Snap & Decide", we want it fast.
            try {
                await fetch(`/api/session/${sessionId}/analyze`, { method: "POST" });
                alert(`送信完了！PCの画面を確認してください。`);
            } catch (err) {
                console.error("Analysis trigger failed", err);
                alert("送信はできましたが、解析の開始に失敗しました。");
            }

        } catch (error) {
            console.error(error);
            console.error(error);
            alert(`画像のアップロードに失敗しました。\n${error}`);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-black text-white flex flex-col font-sans">
            {/* Top Controls Area */}
            <div className="p-6 pt-8 pb-4 bg-neutral-900 rounded-b-[2rem] shadow-2xl z-20 space-y-6">
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />

                {/* Top Controls: Side-by-Side Layout */}
                <div className="flex items-stretch gap-4">
                    {/* Shutter Button (Left, Large) */}
                    <button
                        onClick={handleShutter}
                        className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 transition-all rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-neutral-700 shadow-lg min-h-[140px]"
                        aria-label="写真を撮る"
                    >
                        <div className="w-16 h-16 rounded-full border-[4px] border-white flex items-center justify-center">
                            <div className={`w-12 h-12 rounded-full transition-colors ${isCameraActive ? 'bg-white' : 'bg-white/90'}`} />
                        </div>
                        <span className="text-lg font-bold text-white tracking-widest mt-1">撮影</span>
                    </button>

                    {/* Analyze Button (Right, Large) */}
                    <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xl rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:border disabled:border-neutral-700 disabled:opacity-100 min-h-[140px] flex flex-col items-center justify-center gap-2 whitespace-normal h-auto py-2 px-2"
                        disabled={capturedImages.length === 0}
                        onClick={handleUpload}
                    >
                        {capturedImages.length === 0 ? (
                            <>
                                <span className="text-3xl opacity-50">☝️</span>
                                <span className="text-sm">写真が必要です</span>
                            </>
                        ) : (
                            <>
                                <span className="text-2xl">解析する</span>
                                <span className="text-sm opacity-80">({capturedImages.length}枚)</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Camera Viewfinder (Takes remaining space below) */}
            <div className="relative flex-1 bg-black overflow-hidden mt-[-1rem] pt-6 z-10">
                {isCameraActive ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400 space-y-4 p-6">
                        <Camera className="w-16 h-16 opacity-20" />
                        {/* Instruction text removed as per request */}
                    </div>
                )}

                {/* Overlay: Captured Thumbs (at bottom of viewfinder) */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex space-x-3 overflow-x-auto pb-2 pointer-events-auto min-h-[90px]">
                        {capturedImages.map((img, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="w-20 h-24 rounded-lg overflow-hidden border-2 border-white/50 bg-black flex-shrink-0 shadow-md"
                            >
                                <img src={img} className="w-full h-full object-cover" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
