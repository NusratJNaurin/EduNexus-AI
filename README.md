# EduNexus AI

> An intelligent, collaborative academic workspace and research sandbox that turns dense research papers into navigable, conversational, and measurable knowledge.

**EduNexus AI** is built for Qatar University researchers, students, and faculty. Instead of scrolling through static PDFs, users interact with uploaded papers through visual knowledge maps, precision metric dashboards, and a source-grounded AI companion designed to reduce hallucinations. The platform includes a Socratic **Viva Pod** oral-defense simulator for students and a **Teacher Evaluation Portal** for cohort analytics and reporting.

---

## Live Demo

**Production URL:** `https://edunexus-ai-ochre.vercel.app/`

---

## Screenshot

<!-- Replace the placeholder below with your deployed screenshot -->
![EduNexus AI — Document Studio, Methodology Graph, and Teacher Portal](./docs/screenshot-placeholder.png)

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
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Source-grounded document Q&A
│   │   ├── summarize/route.ts   # AI document summarization
│   │   └── viva/route.ts        # Viva Pod audio transcription & evaluation
│   ├── globals.css              # Tailwind v4 theme tokens
│   ├── layout.tsx               # Root layout, fonts, Vercel Analytics
│   └── page.tsx                 # Main shell — auth, routing, view switching
├── components/
│   ├── access-gate.tsx          # QU email sign-up / sign-in
│   ├── document-studio.tsx      # PDF upload, metrics, chat studio
│   ├── methodology-graph.tsx    # Concept graph + Viva Pod
│   ├── teacher-portal.tsx       # Faculty analytics & exports
│   ├── PdfVisualViewer.tsx      # In-browser PDF renderer
│   ├── sidebar.tsx              # Role-aware navigation
│   ├── topbar.tsx               # Workspace header
│   └── ui/                      # shadcn/ui primitives
├── lib/
│   ├── crud.js                  # Supabase CRUD helpers
│   ├── pdfWorker.ts             # Client-side PDF text extraction
│   ├── supabase.js              # Browser Supabase client
│   ├── utils.ts                 # Tailwind class merging
│   ├── utils_clients.ts         # SSR Supabase client (browser)
│   ├── utils_server.ts          # SSR Supabase client (server)
│   └── utils_middleware.ts      # Middleware Supabase client
├── scripts/
│   └── 001_edunexus_schema.sql  # Full Supabase schema, RLS, triggers
├── public/
│   └── icon.svg
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── components.json              # shadcn/ui configuration
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
