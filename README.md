# 🛡️ VeriFund AI - High-Precision Financial Advisor Copilot & Compliance Verification Platform

**VeriFund AI** is an enterprise-grade Retrieval-Augmented Generation (RAG) Copilot designed specifically for financial advisors, wealth managers, and compliance officers. It ingests complex financial documents (prospectuses, factsheets, regulatory filings) and provides accurate, instantly verifiable answers backed by exact source citations.

---

## 🎯 Executive Summary & Problem Statement

Financial advisory firms maintain tens of thousands of pages of rapidly changing market research, fund prospectuses, factsheets, and regulatory disclosures. Today, advisors navigate disconnected document repositories and static PDF portals while interacting with clients. Because manual verification is slow and standard generic AI models hallucinate facts, advisors risk delivering outdated or non-compliant financial guidance.

**VeriFund AI** solves this problem by combining:
- **Tree-Structured & Hierarchical Document Ingestion:** Preserving parent-child regulatory context and complex 2D financial tables.
- **Temporal & Status-Aware Filtering:** Ensuring answers strictly originate from active, compliance-approved document versions.
- **Split-Screen Interactive Grounding:** Linking every generated answer to page-level, highlighted bounding boxes in original PDF source documents.
- **Automated Guardrails & Disclaimers:** Running real-time faithfulness evaluations and auto-injecting mandatory regulatory disclaimers.

---

## 🚀 Product Vision & Goals

*"The Bloomberg Terminal + Compliance Engine for Advisory Communication"*

1. **Zero-Hallucination Retrieval:** Guarantee that 100% of facts, metrics, and policy rules in responses are grounded in verified firm documents.
2. **Instant Visual Verification:** Enable advisors to inspect and verify the exact source PDF page and bounding box in under 1 second via a split-screen interface.
3. **Temporal Compliance Integrity:** Enforce active document version control with "As-Of" historical auditing capabilities.
4. **Workflow Acceleration:** Reduce time spent verifying fund metrics and preparing compliant client communication by over 70%.

---

## ✨ Product Modules & Functional Specifications

### 1. Document Ingestion & Structural Tree Parser
- **Document Upload:** Support for multi-page financial PDFs.
- **Layout-Aware Extraction:** Detects headings, sections, footnotes, and page numbers. Preserves full hierarchical path in chunk metadata using `pdfplumber` and `LlamaParse`.
- **Dual-Representation Tabular Processing:** Extracts tables into clean JSON/Markdown matrices. Generates semantic summary for embedding while storing raw table for calculation.
- **Contextual Enrichment:** Automatically prepends document title, effective date, and fund ticker to leaf chunks.

### 2. Hybrid Search & Contextual Retrieval Engine
- **Hybrid Retrieval:** Executes parallel vector search (using **Pinecone**) and BM25 keyword matching.
- **Hierarchical Parent Expansion:** Automatically extracts enclosing parent sections when an atomic leaf chunk matches.
- **Re-Ranking Pipeline:** Cross-encoder re-ranker to score and filter chunks.

### 3. Advisor Copilot & Split-Screen Grounding UI
- **Split-Screen Workspace:** Left Pane for Chat/Prompt, Right Pane for high-speed PDF Viewer.
- **Interactive Deep Citations:** Clicking citation pills automatically scrolls to the page and draws a highlighted bounding box over the source paragraph or table.
- **Tone & Persona Toggle:** Toggle between Advisor Mode and Client-Ready Mode.

### 4. Faithfulness Critic & Automated Disclaimer Engine
- **Faithfulness Evaluation Pass:** Computes a Groundedness Score (0–100%) against retrieved chunks.
- **Safety Guardrail:** Rejects responses falling below 85% confidence score.
- **Regulatory Disclaimer Engine:** Appends mandatory disclosure paragraphs based on asset categories.

### 5. Document Versioning & Compliance Audit Manager
- **Metadata Lifecycle:** Documents tagged as APPROVED, DRAFT, SUPERSEDED, or EXPIRED.
- **As-Of Date Selector:** Query knowledge base as it existed on any past date.
- **Audit Logging:** Logs every query, retrieved chunk ID, model output, and user feedback in PostgreSQL.

---

## 👥 Target Users & Personas

- **Financial Advisor / Planner:** Needs instant retrieval during calls, accurate fee & return numbers, and client-ready compliant text.
- **Compliance & Risk Officer:** Needs to ensure advisors use approved materials, audit trail of advisor queries, and fast deprecation of outdated documents.

---

## 🏗️ System Architecture & Technology Stack

### Frontend User Interface
- **React 19 & TypeScript (Vite)**
- **Tailwind CSS & shadcn/ui**
- **react-pdf-highlighter** for interactive split-screen visual grounding.
- **Lucide React** for icons.

### Backend API Gateway & RAG Pipeline
- **Python 3.11+ & FastAPI:** Handles auth, rate-limiting, and orchestrates queries.
- **LlamaIndex / LangChain & Rank-BM25** for retrieval.
- **Ingestion & OCR:** `LlamaParse`, `pdfplumber`, `Unstructured.io`.

### Data Storage & AI Models
- **PostgreSQL:** Relational data and logs (auth, audit logs, metadata).
- **Pinecone:** High-performance Vector Database for embeddings.
- **Google Gemini 1.5 Pro/Flash:** For fast, highly accurate financial reasoning and text synthesis.
- **Sentence Transformers (`all-MiniLM-L6-v2` / `text-embedding-3-small`):** For dense vector generation.

---

## 🔐 Security & Compliance Requirements

- **Role-Based Access Control (RBAC):** Advisor, Compliance Officer, and Admin tiers (JWT Auth).
- **Data Protection & Encryption:** TLS 1.3 enforced, AES-256 encryption at rest.
- **Strict Source Isolation:** Prompt engineering prevents reliance on pre-trained numerical knowledge.
- **Sanitization & Input Validation:** XSS filtering, parameterized SQL, and rate limiting.

---

## 🔌 API Design

- `POST /api/v1/auth/login` - Authenticate user and return JWT.
- `POST /api/v1/auth/register` - Register a new user.
- `GET /api/v1/auth/me` - Retrieve current user profile.
- `POST /api/v1/documents/upload` - Upload PDF and trigger ingestion.
- `GET /api/v1/documents` - List documents with filters.
- `GET /api/v1/documents/{id}/view` - Retrieve document content for viewing.
- `PATCH /api/v1/documents/{id}/status` - Update document lifecycle status.
- `DELETE /api/v1/documents/{id}` - Delete document.
- `POST /api/v1/copilot/query` - Primary query endpoint supporting streaming response.
- `POST /api/v1/copilot/evaluate` - Internal endpoint to run faithfulness critic.
- `GET /api/v1/copilot/history` - Retrieve query history for auditing.

---

## ⚙️ Installation & Setup

### Prerequisites
Before you begin, ensure you have the following accounts and credentials ready:
1. **NeonDB / PostgreSQL:** Get a serverless connection string from [neon.tech](https://neon.tech/) or use a local PostgreSQL DB.
2. **Pinecone:** Get an API key from [pinecone.io](https://www.pinecone.io/) and create an index named `verifund-index` with **Dimensions: 384**.
3. **Google AI Studio:** Get a Gemini API key from [aistudio.google.com](https://aistudio.google.com/).
4. **Node.js** (v18+) and **Python 3.9+** installed on your machine.

### 1. Clone & Configure Environments
```bash
# Set up Backend Environment
cd backend
cp .env.example .env
# Open backend/.env and paste your DB URL, Pinecone, and Gemini keys.

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
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

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
4. **Review Citations:** The Copilot will generate a response, cite the specific page/chunk, and present the raw document on the right side of your screen with visual bounding boxes.
5. **Audit Logs:** Compliance officers can navigate to the **Audit** tab to view historical queries, groundedness scores, and flagged interactions.

---

## 📈 Future Enhancements (Post-MVP)

- **Call Whisperer:** Real-time audio transcription during client phone calls to passively pull up relevant fund factsheets.
- **Automated CRM Sync:** Two-way integration with Salesforce and Outlook to fact-check drafted emails.
- **Multi-Document Comparative Matrix:** Side-by-side comparative table generation for up to 4 funds.
- **Cryptographic Audit Log:** Logging document citation hashes to a low-cost, tamper-proof ledger.

---

## 🎯 Success Metrics & KPIs

- **Faithfulness Rate:** ≥ 98% of evaluated responses pass source verification.
- **Citation Accuracy:** 100% of generated claims have clickable citations pointing to valid coordinates.
- **Verification Speedup:** Average document look-up time reduced from 5 minutes to less than 15 seconds.
- **Advisor Usability Score:** System Usability Scale (SUS) score above 85.

---

*Built with precision for the future of Financial Advisory.*
