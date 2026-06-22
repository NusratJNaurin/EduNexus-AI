# EduNexus AI

> An intelligent, collaborative academic workspace and research sandbox that turns dense research papers into navigable, conversational, and measurable knowledge.

**EduNexus AI** is built for Qatar University researchers, students, and faculty. Instead of scrolling through static PDFs, users interact with uploaded papers through visual knowledge maps, precision metric dashboards, and a source-grounded AI companion designed to reduce hallucinations. The platform includes a Socratic **Viva Pod** oral-defense simulator for students and a **Teacher Evaluation Portal** for cohort analytics and reporting.

---

## Live Demo

**Production URL:** `https://edunexus-ai-ochre.vercel.app/`

---

## Screenshot

<img width="2834" height="1454" alt="Screenshot 2026-06-20 163009" src="https://github.com/user-attachments/assets/00bd4055-0805-44df-b62f-8305de17c204" />


---

## Core Features

- **Visual Methodology Mapping** — Upload research PDFs and render them as interactive relational graphs. Concept nodes represent papers, prerequisites, and research gaps, with draggable canvas positioning and edge relationships stored in Supabase.
- **Precision Metric Isolation** — Automatically extracts and surfaces key document metrics including readability scores, complexity ratings, file size, page count, keyword tags, and confidence indicators in a compact metric matrix.
- **Source-Grounded Chat** — An interactive Q&A assistant anchored to the active document. Queries are sent to a Gemini-powered `/api/chat` route with strict system instructions to confine answers to the uploaded text and reduce AI hallucinations.
- **AI Document Summarization** — On upload, extracted text is summarized via `/api/summarize` to produce a concise 1–2 sentence overview of the paper's core topic and structural pillars.
- **PDF Visual Viewer** — In-browser PDF rendering with `react-pdf` and `pdfjs-dist`, plus client-side text extraction for downstream AI and analytics pipelines.
- **Socratic Viva Pod (Student)** — Record oral-defense responses against selected concept nodes. Audio is transcribed and evaluated by Gemini via `/api/viva`, with feedback logs persisted per node.
- **Teacher Evaluation Portal (Faculty)** — Invite-only class sections, engagement timelines, completion metrics, student roster tracking, and export controls for CSV performance matrices and JSON audit trails.
- **Role-Based Access Control** — Qatar University email verification (`@qu.edu.qa` / `@student.qu.edu.qa`), with distinct workspaces for **Student**, **Researcher**, and **Faculty** profiles enforced by Supabase Row-Level Security.

---

## Student vs. Teacher Frameworks

### Student & Researcher Interface

| Workspace | Description |
|-----------|-------------|
| **Document Interaction Studio** | Upload PDFs, view extracted metrics, read AI summaries, and chat with a document-grounded assistant. |
| **Methodology Graph Workspace** | Explore concept dependency graphs, run the Viva Pod simulator, and practice defending node-level interpretations. |

### Faculty Interface

| Workspace | Description |
|-----------|-------------|
| **Teacher Evaluation Portal** | Create invite-only class sections, monitor student engagement, track document activity, and export cohort performance data. |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) with [React 19](https://react.dev/) |
| **Language** | TypeScript |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) — maroon & gold semantic design tokens |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) + [Lucide React](https://lucide.dev/) icons |
| **Fonts** | Geist Sans & Geist Mono (`next/font`) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) with Row-Level Security |
| **Auth** | Supabase Auth (QU email domain restriction) |
| **Storage** | Supabase Storage (`documents` bucket) |
| **AI** | [Google Gemini 2.5 Flash](https://ai.google.dev/) via `@google/genai` |
| **PDF Processing** | `react-pdf`, `pdfjs-dist` |
| **Math Rendering** | KaTeX / `react-katex` |
| **Analytics** | [Vercel Analytics](https://vercel.com/analytics) (production only) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## Project Structure

```
EduNexus-AI-Layout/
├── app/                              # Next.js App Router (root)
│   ├── api/                          # API route handlers
│   │   ├── chat/route.ts             # POST — Source-grounded document Q&A via Gemini
│   │   ├── summarize/route.ts        # POST — AI document summarization
│   │   └── viva/route.ts             # POST — Viva Pod audio transcription & evaluation
│   ├── globals.css                   # Tailwind v4 theme tokens & global styles
│   ├── layout.tsx                    # Root layout, fonts, Vercel Analytics provider
│   └── page.tsx                      # Main shell — auth state, routing, view switching
│
├── components/                       # React components (feature + UI)
│   ├── access-gate.tsx               # QU email sign-up / sign-in form
│   ├── document-studio.tsx           # PDF upload, metrics display, chat studio
│   ├── methodology-graph.tsx         # Interactive concept graph + Viva Pod simulator
│   ├── teacher-portal.tsx            # Faculty analytics dashboard & export controls
│   ├── PdfVisualViewer.tsx           # In-browser PDF renderer (react-pdf/pdfjs-dist)
│   ├── sidebar.tsx                   # Role-aware navigation sidebar
│   ├── topbar.tsx                    # Workspace header with user menu
│   └── ui/                           # shadcn/ui primitive components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── table.tsx
│       └── ... (other primitives)
│
├── hooks/                            # Custom React hooks
│   └── use-api.ts                    # API request hook with loading/error states
│
├── lib/                              # Core utilities, clients, and business logic
│   ├── api-client.ts                 # Typed Supabase client wrapper
│   ├── crud.ts                       # Supabase CRUD helper functions
│   ├── pdfWorker.ts                  # Client-side PDF text extraction worker
│   ├── supabase.ts                   # Browser Supabase client initialization
│   ├── utils.ts                      # Tailwind class merging (cn utility)
│   ├── utils_clients.ts              # SSR-safe Supabase client (browser)
│   ├── utils_server.ts               # SSR-safe Supabase client (server)
│   ├── utils_middleware.ts           # Middleware Supabase client
│   └── api/                          # AI/API integration modules
│       ├── gemini.ts                 # Google Gemini client & prompt templates
│       └── validation.ts             # Input validation schemas
│
├── lib/types/                        # TypeScript type definitions
│   └── index.ts                      # Shared interfaces (User, Document, Node, etc.)
│
├── scripts/                          # Database & migration scripts
│   └── 001_edunexus_schema.sql       # Full Supabase schema, RLS policies, triggers
│
├── public/                           # Static assets
│   ├── apple-icon.png
│   ├── icon-dark-32x32.png
│   ├── icon-light-32x32.png
│   ├── icon.svg
│   ├── placeholder-logo.png
│   ├── placeholder-logo.svg
│   ├── placeholder-user.jpg
│   ├── placeholder.jpg
│   └── placeholder.svg
│
├── .gitignore                        # Git ignore rules
├── .pnpmrc                           # pnpm configuration
├── components.json                   # shadcn/ui component registry
├── next-env.d.ts                     # Next.js TypeScript declarations
├── next.config.mjs                   # Next.js configuration
├── package.json                      # Dependencies & scripts
├── pnpm-lock.yaml                    # Locked dependency tree
├── pnpm-workspace.yaml               # pnpm workspace config
├── postcss.config.mjs                # PostCSS configuration (Tailwind)
├── react-katex.d.ts                  # KaTeX type declarations
├── tsconfig.json                     # TypeScript configuration
├── README.md                         # This file
├── README.pdf                        # PDF version of README
├── README.png                        # README preview image
└── SECURITY_REVIEW.md                # Security audit & review notes
```

---

## Directory Deep Dive

### `app/` — Next.js App Router

The root application directory using Next.js 16 App Router conventions.

| Path | Purpose |
|------|---------|
| `app/api/chat/route.ts` | Handles POST requests for document-grounded Q&A. Receives user query + document context, constructs a Gemini prompt with strict source constraints, and returns the AI response. |
| `app/api/summarize/route.ts` | Accepts extracted PDF text, sends to Gemini for academic summarization, returns a 1–2 sentence overview. |
| `app/api/viva/route.ts` | Accepts multipart form data (audio blob + concept node ID), transcribes via Gemini, evaluates the response against rubric criteria, and persists feedback. |
| `app/globals.css` | Tailwind v4 `@theme` blocks defining maroon/gold semantic tokens, CSS custom properties, and base resets. |
| `app/layout.tsx` | Root layout wrapping all pages. Imports Geist Sans/Mono fonts, renders `Topbar` and `Sidebar`, and injects Vercel Analytics in production. |
| `app/page.tsx` | Main application shell. Manages auth state via Supabase, handles view routing (Document Studio / Methodology Graph / Teacher Portal), and conditionally renders feature components based on user role. |

### `components/` — Feature & UI Components

#### Feature Components

| Component | Responsibility |
|-----------|----------------|
| `access-gate.tsx` | Authentication gate. Renders sign-up/sign-in forms with QU email domain validation (`@qu.edu.qa`, `@student.qu.edu.qa`). Handles role selection (Student, Faculty, Researcher) during registration. |
| `document-studio.tsx` | Primary student/researcher workspace. Manages PDF upload flow, displays extracted metrics (readability, complexity, page count), renders AI summary, and hosts the source-grounded chat interface. |
| `methodology-graph.tsx` | Interactive concept graph workspace. Renders draggable nodes (papers, prerequisites, research gaps) with edge relationships. Integrates Viva Pod for oral-defense practice on selected nodes. |
| `teacher-portal.tsx` | Faculty-only dashboard. Displays class sections, student engagement timelines, document activity metrics, and provides CSV/JSON export functionality. |
| `PdfVisualViewer.tsx` | In-browser PDF rendering component using `react-pdf` and `pdfjs-dist`. Handles page navigation, zoom, and client-side text extraction for AI processing. |
| `sidebar.tsx` | Role-aware navigation. Shows/hides menu items based on user role (Student/Researcher vs Faculty). Includes links to Document Studio, Methodology Graph, and Teacher Portal. |
| `topbar.tsx` | Application header. Displays user profile, role badge, and global actions (sign out, theme toggle). |

#### UI Primitives (`components/ui/`)

shadcn/ui components built on Radix UI primitives and styled with Tailwind CSS. Includes `button`, `card`, `dialog`, `input`, `label`, `select`, `table`, and other accessible primitives.

### `lib/` — Core Logic & Utilities

| Module | Responsibility |
|--------|----------------|
| `api-client.ts` | Typed wrapper around Supabase client. Provides reusable methods for common queries (fetch documents, get nodes, etc.). |
| `crud.ts` | Generic CRUD helper functions for Supabase tables. Abstracts common create/read/update/delete patterns. |
| `pdfWorker.ts` | Client-side PDF text extraction using `pdfjs-dist`. Runs in a Web Worker to avoid blocking the main thread during document processing. |
| `supabase.ts` | Browser-side Supabase client initialization using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. |
| `utils.ts` | Utility functions including `cn()` for Tailwind class merging (uses `clsx` + `tailwind-merge`). |
| `utils_clients.ts` | SSR-safe Supabase client for browser components. Handles cookie-based session management. |
| `utils_server.ts` | SSR-safe Supabase client for server components and API routes. Uses service role key when available. |
| `utils_middleware.ts` | Supabase client configured for Next.js middleware (auth token refresh, route protection). |
| `api/gemini.ts` | Google Gemini 2.5 Flash integration. Contains prompt templates for chat, summarization, and Viva Pod evaluation. Handles streaming responses and error states. |
| `api/validation.ts` | Input validation schemas using Zod. Validates API request payloads (chat messages, audio files, document metadata). |

### `lib/types/` — TypeScript Definitions

Centralized type definitions for the application domain:

- `User` — Supabase auth user + profile (role, full_name, academic_domain)
- `ResearchDocument` — Uploaded PDF metadata (id, owner_id, file_name, page_count, metrics, summary)
- `ConceptNode` — Graph node (id, document_id, type, label, description, position)
- `ClassSection` — Faculty-created class (id, teacher_id, section_name, invite_code)
- `SectionEnrollment` — Student enrollment record (id, section_id, student_id)
- `VivaFeedback` — Viva Pod evaluation result (id, node_id, user_id, transcript, score, feedback)

### `scripts/` — Database & Migrations

| Script | Purpose |
|--------|---------|
| `001_edunexus_schema.sql` | Complete Supabase database schema. Defines tables (`profiles`, `research_documents`, `class_sections`, `section_enrollments`, `concept_nodes`), enums (`user_role`, `concept_node_type`), Row-Level Security policies, triggers (`handle_new_user()`), and storage bucket policies. |

### `public/` — Static Assets

Application icons, placeholder images, and static files served directly by Next.js.

---

## Data Flow

### Document Upload & Processing

```
User uploads PDF
    ↓
PdfVisualViewer extracts text (client-side)
    ↓
Text sent to /api/summarize
    ↓
Gemini generates academic summary
    ↓
Document metadata + summary saved to Supabase
    ↓
PDF file stored in Supabase Storage (documents bucket)
    ↓
Metrics extracted (page count, readability, etc.)
    ↓
Document appears in user's Document Studio
```

### Source-Grounded Chat

```
User asks question in Document Studio
    ↓
Query + document context sent to /api/chat
    ↓
Gemini prompt constructed with strict source constraints
    ↓
AI response returned (grounded in uploaded text)
    ↓
Response displayed in chat interface
```

### Viva Pod Oral Defense

```
User selects concept node in Methodology Graph
    ↓
Records audio response
    ↓
Audio blob + node ID sent to /api/viva
    ↓
Gemini transcribes audio
    ↓
Gemini evaluates response against rubric
    ↓
Feedback (score, transcript, critique) saved to Supabase
    ↓
Results displayed to user
```

---

## Prerequisites

Before running EduNexus AI locally, ensure you have:

- **Node.js** 18.17 or later
- **pnpm** (recommended — project includes `pnpm-lock.yaml`)
- A **Supabase** project with Auth, Database, and Storage enabled
- A **Google Gemini API key** ([Google AI Studio](https://aistudio.google.com/))
- A **Vercel** account (for production deployment)

---

## Environment Variables

Create a `.env.local` file in the project root. This file is git-ignored and must never be committed.

```bash
# Supabase — public (client-safe)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_or_publishable_key

# Alternative key name also supported:
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini — server-side only (NEVER expose to the client)
GEMINI_API_KEY=your_gemini_api_key

# Optional — for future server-side admin operations
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

| Variable | Scope | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client | Yes |
| `GEMINI_API_KEY` | Server | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | No |

---

## Supabase Setup

### 1. Run the database schema

In the Supabase SQL Editor, execute the full schema script:

```bash
# File: scripts/001_edunexus_schema.sql
```

This script provisions:

- **Tables:** `profiles`, `research_documents`, `class_sections`, `section_enrollments`, `concept_nodes`
- **Enums:** `user_role` (`student`, `faculty`, `researcher`), `concept_node_type` (`paper`, `prerequisite`, `research_gap`)
- **Row-Level Security** policies for all tables
- **Triggers:** `handle_new_user()` auto-creates a profile on sign-up
- **Storage policies** for the `documents` bucket

### 2. Create the Storage bucket

In Supabase Dashboard → **Storage**, create a bucket named `documents` and ensure authenticated users can upload and read files per the storage policies in the schema script.

### 3. Configure Auth

Enable **Email/Password** authentication in Supabase Auth settings. The application enforces Qatar University email domains at the client level (`@qu.edu.qa` and `@student.qu.edu.qa`).

---

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
pnpm build
pnpm start
```

### Lint

```bash
pnpm lint
```

---

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | `POST` | Document-grounded Q&A powered by Gemini 2.5 Flash |
| `/api/summarize` | `POST` | Generates a concise academic summary from extracted PDF text |
| `/api/viva` | `POST` | Transcribes and evaluates Viva Pod audio responses (multipart form) |

---

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set all environment variables from `.env.local` in the Vercel project settings.
4. Deploy — Vercel Analytics activates automatically in production.

```bash
# Optional: deploy via Vercel CLI
pnpm add -g vercel
vercel
```

After deployment, update the **Live Demo** URL at the top of this README.

---

## Authentication & Roles

- **Sign Up** — Requires a valid QU email, full name, role selection (Student / Faculty / Researcher), and academic domain.
- **Sign In** — Email and password via Supabase Auth.
- **Faculty** — Routed to the Teacher Evaluation Portal on login.
- **Student / Researcher** — Routed to the Document Interaction Studio; the Teacher Portal is hidden and access-denied if attempted.

---

## License

This project is developed as part of the Qatar University academic knowledge workspace initiative. Contact the project maintainers for licensing and usage terms.

---

## Acknowledgments

Built with [Next.js](https://nextjs.org/), [Supabase](https://supabase.com/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), and [Google Gemini](https://ai.google.dev/) — designed to help learners develop the habits of rigorous academic thinking.