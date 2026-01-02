'use client';

import { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, Check, X, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function MobileScanPage({ params }: { params: { sessionId: string } }) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isCameraActive, setIsCameraActive] = useState(false);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
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

            const response = await fetch(`/api/session/${params.sessionId}/images`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const data = await response.json();

            // Trigger Analysis immediately after upload
            // In a real app, we might wait or let the main screen trigger it.
            // But for "Snap & Decide", we want it fast.
            try {
                await fetch(`/api/session/${params.sessionId}/analyze`, { method: "POST" });
                alert(`Uploaded & Analysis Started! Check your PC screen.`);
            } catch (err) {
                console.error("Analysis trigger failed", err);
                alert("Uploaded, but failed to start analysis.");
            }

        } catch (error) {
            console.error(error);
            alert("Failed to upload images.");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Camera Viewfinder */}
            <div className="relative flex-1 bg-neutral-900 overflow-hidden rounded-b-3xl">
                {isCameraActive ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-neutral-500">
                        Camera inactive
                    </div>
                )}

                {/* Overlay UI */}
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-mono">
                            ID: {params.sessionId.slice(0, 8)}
                        </div>
                    </div>

                    {/* Recent Thumbs */}
                    <div className="flex space-x-2 overflow-x-auto pb-2 pointer-events-auto">
                        {capturedImages.map((img, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="w-16 h-20 rounded-lg overflow-hidden border-2 border-white/20 bg-black"
                            >
                                <img src={img} className="w-full h-full object-cover" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-8 bg-black space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="text-white">
                        <ImageIcon className="w-6 h-6" />
                    </Button>

                    <button
                        onClick={capturePhoto}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <div className="w-16 h-16 rounded-full bg-white" />
                    </button>

                    <Button variant="ghost" size="icon" className="text-white">
                        {/* Toggle Camera (if needed) */}
                        <Upload className="w-6 h-6" />
                    </Button>
                </div>

                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6 rounded-xl font-bold disabled:opacity-50"
                    disabled={capturedImages.length === 0}
                    onClick={handleUpload}
                >
                    Analyze {capturedImages.length} Items
                </Button>
            </div>
        </div>
    );
}
