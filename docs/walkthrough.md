# Smart Meal Manager - Phase 2 Walkthrough

**フェーズ2完遂！**
画像解析AI (Gemini) を中心とした、コアとなる「撮影 → 献立」フローが実装完了しました。

## ✨ 実装された機能

1.  **QR Code Handoff (PC-スマホ連携)**
    *   トップページでQRコードを表示。
    *   スマホでスキャンして、専用ページからカメラ撮影 & アップロード。
    *   PC画面が自動的に切り替わり、解析プロセスが開始されます。

2.  **AI Image Analysis (Google Gemini)**
    *   GPT-4oからGoogle Geminiに変更。
    *   冷蔵庫の中身、レシート、チラシ画像を解析。
    *   既存食材を優先した献立と、不足分の買い物リストを生成。

3.  **Progressive UI (段階的表示)**
    *   **Analyzing**: 読み込み中。
    *   **Detected**: まず解析された食材リストを表示。
    *   **Plan & Shop**: 最終的な献立と買い物リストを表示。

4.  **Voice Interaction (音声)**
    *   **Guidance**: トップページを開くと、AIが操作を音声で案内します。
    *   **Result**: 献立が決まると、結果を読み上げます。
    *   **Correction**: マイクボタンで食材リストを音声修正できます。

5.  **Settings (設定)**
    *   トップページ右上の ⚙️ アイコンから設定画面へ。
    *   **文字サイズ**: 大・特大へ変更可能。
    *   **ハイコントラスト**: 白黒反転モードで、視認性を向上。
    *   **音声ガイド**: ON/OFF切り替え。

## 🚀 起動方法

### 1. Database
```bash
docker-compose up -d
```
(既に起動済みの場合はスキップ可)

### 2. Backend (FastAPI)
```bash
cd backend
# 仮想環境が有効であることを確認 (venv)
uvicorn main:app --reload
```
※ `.env` ファイルに `GOOGLE_API_KEY` を設定してください。

### 3. Frontend (Next.js)
```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。
