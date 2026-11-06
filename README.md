<p align="center">
  <img src="public/app-icon.png" width="96" height="96" alt="Second Brain Studio Icon" style="border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
</p>

<h1 align="center">Second Brain Studio</h1>

<p align="center">
  <strong>A lightning-fast, editorial desktop command center for developers, tech leads, and knowledge workers.</strong><br />
  Built with <strong>Tauri 2.0</strong>, <strong>React 19</strong>, <strong>TypeScript</strong>, and <strong>Rust</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2.0-blue?style=flat-square&logo=tauri" alt="Tauri 2.0" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Rust-2021-orange?style=flat-square&logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.x-38bdf8?style=flat-square&logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/macOS-Native-black?style=flat-square&logo=apple" alt="macOS Native" />
</p>

---

Second Brain Studio connects your local **Obsidian / Markdown vaults** directly into a unified desktop cockpit featuring **Thematic Pods**, an **Agile Sprint & Backlog Tracker**, and a context-aware **Local AI Copilot**.

> [!NOTE]
> **No Pre-Built Release Packages:** There are currently no pre-compiled binaries distributed under GitHub Releases. Second Brain Studio is built and run directly from source on your machine. Building locally takes only a few minutes and produces an optimized native macOS application bundle (`Second Brain.app`).

---

## ✨ Key Features

- 🎯 **Project Pods (Team Tasks & LLM Wiki)**:
  - Group notes, task sets, and documentation thematically into dedicated project pods.
  - Automatically synthesize briefings, status reports, and task overviews straight from your notes.
- ⚡️ **Sprint & Backlog Cockpit**:
  - Live bi-directional sync with sprint markdown notes (e.g., `Sprint 66.md`, `Sprint 67.md`).
  - Interactive status cycling directly from the UI (`⏳ Todo` → `🔄 In Progress` → `✅ Done`).
  - Automatic detection of active sprints and a 1-click **Sprint Close Workflow** with carry-over of unfinished tasks.
  - Automatic Jira ticket parsing and clickable deep links (`[GRL-15143](...)`).
- 🤖 **Context-Aware AI Copilot (`⌘J`)**:
  - Conversational assistant equipped with native tools (`search_notes`, `read_note`, `list_folder`).
  - Works with **Local LLMs** (Ollama, LM Studio) or cloud endpoints (any OpenAI-compatible API).
  - 100% private: your vault files never leave your machine when using local models.
- 🔍 **Global Command Palette (`⌘K`)**:
  - Instant fuzzy search across every document, session, and resource in your vaults.
- 📖 **Markdown Viewer**:
  - Rich GitHub-Flavored Markdown rendering with live resolution of `[[Wiki-Links]]`, interactive checklists, and code highlighting.
- 🎨 **Editorial Design & macOS Native**:
  - Swiss typography using Apple native system fonts (SF Pro, New York, SF Mono).
  - Seamless dark and light modes, subtle glassmorphism, and a frameless macOS window.

---

## 🛠️ Prerequisites

Ensure you have the following tools installed on your development machine before cloning:

1. **Node.js** (v18+ recommended):
   ```bash
   node --version
   npm --version
   ```
2. **Rust & Cargo** (required for the native Tauri desktop core):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   Verify installation:
   ```bash
   rustc --version
   cargo --version
   ```
3. **Platform Dependencies**:
   - **macOS**: Install Xcode Command Line Tools:
     ```bash
     xcode-select --install
     ```
   - **Linux / Windows**: Refer to the official [Tauri Prerequisites Guide](https://v2.tauri.app/start/prerequisites/).

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Dopaemin/second-brain-studio.git
cd second-brain-studio
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Vault Paths (Optional)
Copy the example environment template:
```bash
cp .env.example .env
```
Open `.env` and set the paths to your local Markdown directories:
```dotenv
# Path to your work/primary knowledge vault (e.g., Obsidian vault)
VITE_WORK_VAULT="/Users/username/Documents/second-brain"

# Path to your personal/private vault (optional)
VITE_PRIVATE_VAULT="/Users/username/Documents/personal-brain"

# Local AI endpoint (e.g., Ollama or LM Studio)
VITE_AI_BASE_URL="http://127.0.0.1:11434/v1"
```
*(Tip: You can also configure or change vault paths anytime inside the app settings!)*

### 4. Launch in Development Mode
```bash
npm run dev:tauri
```
*(Or alternatively: `npx tauri dev`)*

Tauri will compile the Rust core, start the Vite dev server, and open the desktop application window.

---

## ⚙️ Configuring Vaults Inside the App

If you prefer not to create a `.env` file, you can set your paths directly in the UI:

1. Open **Settings** by pressing **`⌘,`** (or clicking the sliders icon in the top header).
2. Switch to the **„Knowledge Vaults“** tab.
3. Enter the absolute path to your Obsidian or Markdown folders and click **„Pfade speichern“** (Save Paths).
4. The studio will instantly index and display your folder tree and notes live!

---

## 🤖 Connecting a Local LLM (Ollama / LM Studio)

Second Brain Studio connects out-of-the-box with any OpenAI-compatible API:

### Using Ollama:
1. Install [Ollama](https://ollama.com/) and download a model of your choice:
   ```bash
   ollama run llama3.1:8b
   ```
2. In Second Brain Studio, press **`⌘,`** → navigate to the **„KI Copilot“** tab.
3. Set the Endpoint URL to: `http://127.0.0.1:11434/v1`
4. Set Model Name to: `llama3.1:8b`
5. Press **`⌘J`** anywhere in the app to ask questions about your notes, brainstorm solutions, or search across documents.

---

## 📦 Building from Source (Local macOS `.app`)

Since there are no pre-packaged release binaries, you can build your own optimized production bundle with one command:

```bash
npm run build:tauri
```

Once compilation completes, the standalone app will be located at:
```text
src-tauri/target/release/bundle/macos/Second Brain.app
```

To install it into your system Applications folder:
```bash
cp -R "src-tauri/target/release/bundle/macos/Second Brain.app" /Applications/
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`⌘K`** / `Ctrl+K` | Open Command Palette / Global Document Search |
| **`⌘J`** / `Ctrl+J` | Toggle AI Wiki-Copilot Drawer |
| **`⌘,`** / `Ctrl+,` | Open Settings (Vaults, Typography, AI) |
| **`⌘1`** | Switch to Work Knowledge Space |
| **`⌘2`** | Switch to Private Knowledge Space |
| **`ESC`** | Close Modals, Command Palette, or Document Viewer |

---

## 📂 Project Architecture

```text
second-brain-studio/
├── src-tauri/                 # Rust Core (Tauri 2.0)
│   ├── src/
│   │   ├── commands/         # Native filesystem, todo parser, AI bridge
│   │   ├── lib.rs            # Window configuration & macOS titlebar styling
│   │   └── main.rs
│   └── tauri.conf.json       # Bundle settings, permissions, window specs
├── src/                      # Frontend Application (React 19 + TypeScript)
│   ├── components/
│   │   ├── ai/               # AI Copilot chat drawer & tool renderers
│   │   ├── pods/             # Project pod cards, detail view & modals
│   │   ├── settings/         # Settings modal (Vaults, Typography, AI)
│   │   ├── work/             # Sprint dashboard, cockpit, file tree
│   │   └── CommandPalette.tsx # Global fuzzy search palette
│   ├── hooks/                # Custom React hooks (useSprintData, usePods, useVaultFiles)
│   ├── lib/                  # Markdown & frontmatter parsers (sprints.ts, pods.ts)
│   └── App.tsx               # Main layout and global shortcut handlers
├── .env.example              # Environment variables template
└── README.md
```

---

## 📄 License

Built for personal and professional productivity. Issues and pull requests are warmly welcomed!
