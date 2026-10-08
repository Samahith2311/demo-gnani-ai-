# SunoSamjho Live

> **"Break Language Barriers. Have Real Conversations."**

SunoSamjho Live is an open-source real-time multilingual voice communication platform designed to enable natural, low-latency conversation across Indian languages. Built with **Gnani AI** (Prisma, Evon, and Timbre), it connects speakers across languages through voice-to-voice communication.

```
Person A (Hindi) ──[ Microphone / VAD ]──► Gnani Prisma (STT)
                                                 │
                                                 ▼
Person B (Kannada) ◄──[ Timbre (TTS) ]──◄ Gnani Evon (NMT & NLU)
```

---

## Key Capabilities

- **Two-Way Voice-to-Voice Rooms:** Cryptographically generated room codes (`SJ-XXXXX`) connecting participants in real time.
- **Audio Capture & VAD Engine:** Native browser `AudioContext` with Voice Activity Detection, silence segmentation, and feedback loop prevention (gates mic capture during TTS synthesis).
- **Sequential Playback Queue:** Guarantees translated utterances play in order without acoustic overlap.
- **Explain Simply Mode:** Powered by Gnani Evon reasoning to rephrase complex phrases into plain, accessible language in the user's native tongue.
- **Privacy by Design:** Zero raw audio persistence. Utterances are processed purely in ephemeral memory buffers. User-controlled transcripts can be viewed, searched, exported, or permanently deleted.
- **Developer Ecosystem:** REST API and TypeScript SDK (`@sunosamjho/sdk`) with token-bucket rate limiting, SHA-256 hashed API keys, and comprehensive documentation.

---

## Monorepo Architecture

```
sunosamjho/
├── apps/
│   └── web/                   # React 18 + Vite Web App & Original Design System
├── packages/
│   └── sdk/                   # @sunosamjho/sdk TypeScript Client & EventEmitter
├── services/
│   ├── api/                   # Express + WebSocket Real-Time Conversation Server
│   └── gnani/                 # Gnani AI Provider Layer (Prisma, Evon, Timbre)
├── docs/                      # Architectural & API Guides
├── examples/
│   ├── javascript/            # Node.js Vanilla JS SDK sample
│   ├── typescript/            # TypeScript SDK sample
│   └── react/                 # React hook conversation sample
├── supabase/
│   └── migrations/            # Versioned SQL migrations with RLS policies
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── .env.example
```

---

## Quick Start

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher

### 2. Installation
```bash
# Clone the repository and install dependencies across workspaces
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

To connect to official **Gnani AI** services, supply your credentials in `.env`:
```env
GNANI_API_KEY=your_gnani_api_key
GNANI_API_KEY_ID=your_key_id
GNANI_API_KEY_SECRET=your_secret_key
GNANI_API_BASE_URL=https://api.gnani.ai
```

*Note: For local offline development without Gnani credentials, keep `ENABLE_MOCK_PROVIDER=true`. The UI will visibly display a "MOCK MODE" banner, and this mode is strictly prohibited from running when `NODE_ENV=production`.*

### 4. Running the Application
```bash
npm run dev
```
- **Web Application:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:4000](http://localhost:4000)
- **WebSocket Gateway:** `ws://localhost:4000/api/v1/realtime/:conversationId`

---

## Testing & Quality

Run the test suite across packages and services:
```bash
npm test
```
The suite verifies:
- Cryptographic room code collision resistance and alphabet safety.
- SHA-256 API key generation and hashing.
- Mock speech provider security lock-out in production environments.
- SDK initialization, typed errors, and conversation event emitter semantics.

---

## Verified Language Matrix

The following Indian languages are supported by the integrated Gnani AI pipeline:

| Language | BCP-47 Code | Native Script | STT (Prisma) | NMT (Evon) | TTS (Timbre) |
|---|---|---|:---:|:---:|:---:|
| **Hindi** | `hi-IN` | हिन्दी | ✅ | ✅ | ✅ |
| **Kannada** | `kn-IN` | ಕನ್ನಡ | ✅ | ✅ | ✅ |
| **Tamil** | `ta-IN` | தமிழ் | ✅ | ✅ | ✅ |
| **Telugu** | `te-IN` | తెలుగు | ✅ | ✅ | ✅ |
| **Marathi** | `mr-IN` | मराठी | ✅ | ✅ | ✅ |
| **Bengali** | `bn-IN` | বাংলা | ✅ | ✅ | ✅ |
| **Gujarati** | `gu-IN` | ગુજરાતી | ✅ | ✅ | ✅ |
| **Malayalam** | `ml-IN` | മലയാളം | ✅ | ✅ | ✅ |
| **Indian English**| `en-IN` | English | ✅ | ✅ | ✅ |
