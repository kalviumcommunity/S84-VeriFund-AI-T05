# 🛡️ VeriFund AI

**VeriFund AI** is an enterprise-grade Retrieval-Augmented Generation (RAG) Copilot designed specifically for financial advisors and compliance officers. It ingests complex financial documents (prospectuses, factsheets, regulatory filings) and provides accurate, instantly verifiable answers backed by exact source citations.

---

## ✨ Key Features & Functionality

1. **AI Financial Copilot**
   - Ask natural language questions about funds, fees, and market risks.
   - Powered by **Gemini 1.5 Flash** for fast, highly accurate financial reasoning.
   - **Real-Time Streaming:** Responses are streamed via WebSockets token-by-token for an ultra-fast user experience.
   - Employs a strict **RAG architecture**—the AI only answers based on approved uploaded documents, eliminating hallucinations.

2. **Document Ingestion Pipeline**
   - Upload multi-page financial PDFs.
   - **Advanced Parsing:** Extracts raw text and complex tabular matrices using **LlamaParse** (if API key provided) or local `pdfplumber`.
   - Automatically generates vector embeddings locally (free of cost) using `all-MiniLM-L6-v2`.
   - Stores vectors in **Pinecone** for lightning-fast semantic retrieval.

3. **Compliance & Audit Trails**
   - **Role-Based Access Control (RBAC):** Distinct roles for Advisors, Compliance Officers, and Admins via secure JWT Authentication.
   - **Groundedness Scoring:** Every AI response receives a confidence score based on the retrieved context.
   - **Query Auditing:** All interactions are logged into PostgreSQL, allowing compliance teams to review flagged queries.

4. **Split-Pane Workspace UI**
   - Chat with the Copilot on the left while reviewing the exact referenced PDF source on the right.
   - **Interactive Citation Sync:** Click on an AI citation (e.g., `[Page 4]`), and the native PDF iframe automatically jumps to that exact page.
   - Responsive, pixel-perfect design built with React, Tailwind CSS, and Lucide Icons.

---

## 🏗️ Technology Stack

### Frontend
- **React.js (Vite)**
- **TypeScript**
- **Tailwind CSS**
- **Axios** for API communication
- **React Router** for protected navigation

### Backend
- **FastAPI** (Python)
- **SQLAlchemy** (PostgreSQL ORM)
- **Alembic** (Database Migrations)
- **PyJWT & passlib** (Authentication)

### AI & Data Pipeline
- **Google Gemini 1.5** (Generative LLM)
- **HuggingFace Sentence Transformers** (Local Vector Embeddings)
- **Pinecone** (Vector Database)
- **pdfplumber** (PDF parsing and OCR)

---

## 🚀 Installation & Setup

### Prerequisites
Before you begin, ensure you have the following accounts and credentials ready:
1. **NeonDB:** Get a serverless PostgreSQL connection string from [neon.tech](https://neon.tech/).
2. **Pinecone:** Get an API key from [pinecone.io](https://www.pinecone.io/) and create an index named `verifund-index` with **Dimensions: 384**.
3. **Google AI Studio:** Get a Gemini API key from [aistudio.google.com](https://aistudio.google.com/).
4. **Node.js** and **Python 3.9+** installed on your machine.

### 1. Clone & Configure Environments
```bash
# Set up Backend Environment
cd backend
cp .env.example .env
# Open backend/.env and paste your NeonDB, Pinecone, and Gemini keys.

# Set up Frontend Environment
cd ../frontend
cp .env.example .env
# The default API URL (http://localhost:8000/api/v1) is already set.
```

### 2. Backend Setup
```bash
cd backend
# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate  # On Windows
# source venv/bin/activate # On Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run Database Migrations to create tables
alembic revision --autogenerate -m "Initial tables"
alembic upgrade head

# Start the FastAPI Server
uvicorn app.main:app --reload
```
*The backend API will be running at `http://localhost:8000`.*

### 3. Frontend Setup
Open a **new terminal** window:
```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The web app will be running at `http://localhost:5173`.*

---

## 📖 Usage Guide

1. **Sign In:** Navigate to `http://localhost:5173`. Use the secure login portal to authenticate your session.
2. **Upload Documents:** Go to the **Documents** tab and upload a financial PDF (like a Factsheet). The backend will automatically parse the layout, chunk the text, generate vector embeddings, and save it to Pinecone.
3. **Ask the Copilot:** Go to the **Copilot** tab. Ask a question regarding the document you just uploaded (e.g., *"What is the annual expense ratio?"*). 
4. **Review Citations:** The Copilot will generate a response, cite the specific page/chunk, and present the raw document on the right side of your screen.
5. **Audit Logs:** Compliance officers can navigate to the **Audit** tab to view historical queries, groundedness scores, and flagged interactions.

---
*Built with precision for the future of Financial Advisory.*
