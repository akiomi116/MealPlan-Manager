# スマート献立マネージャー

画像認識で冷蔵庫の中身を把握し、特売情報と組み合わせて1週間の献立と買い物リストを即座に提案するWebアプリ。

## プロジェクト構成/起動方法

### 1. 前提条件
- Node.js (v18+)
- Python (v3.11+)
- Docker (PostgreSQL用)

### 2. データベース起動
```bash
docker-compose up -d
```
これでPostgreSQLがポート5432で起動します。

### 3. バックエンド (FastAPI)
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```
API Docs: http://localhost:8000/docs

### 4. フロントエンド (Next.js)
```bash
cd frontend
npm run dev
```
http://localhost:3000 にアクセス。

## 構成
- **Frontend**: Next.js (App Router), TypeScript, Shadcn/UI
- **Backend**: FastAPI, SQLAlchemy
- **DB**: PostgreSQL
