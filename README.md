# Second Brain Studio 🧠⚡️

> Ein blitzschnelles, editorisch gestaltetes Desktop-Cockpit für Entwickler, Tech-Leads und Wissensarbeiter. Entwickelt mit **Tauri 2.0**, **React 19**, **TypeScript** und **Rust**.

Second Brain Studio verbindet deine lokalen **Obsidian Markdown-Vaults** mit einem agilen **Sprint- & Backlog-Cockpit**, thematischen **Projekt-Pods** und einem kontextbewussten **lokalen KI-Copiloten**.

---

## ✨ Features im Überblick

- 🎯 **Projekt-Pods (Teamaufgabe & LLM Wiki)**:
  - Bündle Notizen, Aufgaben und Wissenssammlungen thematisch in übersichtlichen Pod-Karten.
  - Generiere automatisierte Briefings und Aufgaben-Zusammenfassungen direkt aus deinen Notizen.
- ⚡️ **Sprints & Backlog Cockpit**:
  - Parst und synchronisiert agile Sprint-Notizen direkt aus deinem Markdown-Ordner (z. B. `Sprint 66.md`, `Sprint 67.md`).
  - Interaktives Weiterschalten des Task-Status (`⏳ Offen` → `🔄 In Arbeit` → `✅ Fertig`).
  - Automatische Erkennung des aktiven Sprints und 1-Klick-Workflow für Sprint-Abschluss inklusive **Carry-Over** offener Items.
  - Direkte Verlinkung zu Jira-Tickets (`[GRL-15143](...)`).
- 🤖 **Integrierter KI-Copilot (`⌘J`)**:
  - Konversations-Assistent mit Werkzeugen (`search_notes`, `read_note`, `list_folder`).
  - Funktioniert mit **lokalen LLMs** (Ollama, LM Studio) oder Cloud-Modellen (OpenAI-kompatible APIs).
  - Volle Privatsphäre: Deine Notizen bleiben auf deiner Festplatte.
- 🔍 **Globale Command Palette (`⌘K`)**:
  - Blitzschnelle Fuzzy-Suche über alle Dokumente deines Work- und Private-Vaults.
- 📖 **Markdown Viewer**:
  - Native Darstellung von GitHub-Flavored Markdown mit Live-Auflösung von `[[Wiki-Links]]`, Task-Listen und Code-Highlighting.
- 🎨 **Editorial Design & macOS Native**:
  - Klares, ablenkungsfreies Design mit nativer Schweizer Typografie (Apple SF Pro, New York, SF Mono).
  - Nahtloser Dark Mode & Light Mode mit subtiler Glasoptik und rahmenlosem macOS-Fenster.

---

## 🛠️ Voraussetzungen

Bevor du das Repository klonst, stelle sicher, dass folgende Werkzeuge auf deinem System installiert sind:

1. **Node.js** (Version 18 oder neuer):
   ```bash
   node --version
   npm --version
   ```
2. **Rust & Cargo** (für die native Tauri-Desktop-Engine):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   Überprüfe die Installation:
   ```bash
   rustc --version
   cargo --version
   ```
3. **Plattform-Abhängigkeiten**:
   - **macOS**: Xcode Command Line Tools installieren:
     ```bash
     xcode-select --install
     ```
   - **Linux / Windows**: Siehe die offiziellen [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/).

---

## 🚀 Schnellstart (In 4 Schritten)

### 1. Repository klonen
```bash
git clone https://github.com/Dopaemin/second-brain-studio.git
cd second-brain-studio
```

### 2. Abhängigkeiten installieren
```bash
npm install
```

### 3. Vault-Pfade konfigurieren (Optional vor dem Start)
Kopiere die Beispiel-Umgebungsdatei:
```bash
cp .env.example .env
```
Öffne `.env` und passe die Pfade zu deinen Notizen an:
```dotenv
# Pfad zu deinem primären Arbeits-Vault (z. B. Obsidian)
VITE_WORK_VAULT="/Users/dein-name/Documents/second-brain"

# Pfad zu deinem privaten Vault (optional)
VITE_PRIVATE_VAULT="/Users/dein-name/Documents/personal-brain"

# Lokaler KI-Endpunkt (z. B. Ollama)
VITE_AI_BASE_URL="http://127.0.0.1:11434/v1"
```
*(Hinweis: Du kannst die Pfade auch jederzeit direkt in der App über die Einstellungen anpassen!)*

### 4. Anwendung im Entwicklungsmodus starten
```bash
npm run dev:tauri
```
*(Alternativ: `npx tauri dev`)*

Tauri startet den Vite-Entwicklungsserver und öffnet das native App-Fenster.

---

## ⚙️ Vaults in der App konfigurieren

Falls du keine `.env`-Datei anlegen möchtest oder deine Notizen auf einem anderen Pfad liegen:

1. Drücke in der App **`⌘,`** (oder klicke oben rechts auf das Einstellungen-Icon).
2. Wechsle auf den Reiter **„Knowledge Vaults“**.
3. Trage deine lokalen Verzeichnispfade ein und klicke auf **„Pfade speichern“**.
4. Die App liest deine Ordnerstruktur und Markdown-Notizen sofort live ein!

---

## 🤖 Lokalen KI-Copiloten einrichten (Ollama / LM Studio)

Der Copilot kann mit jedem OpenAI-kompatiblen Endpunkt verbunden werden:

### Mit Ollama:
1. Installiere [Ollama](https://ollama.com/) und lade ein Modell herunter:
   ```bash
   ollama run llama3.1:8b
   ```
2. Öffne die Einstellungen in Second Brain Studio (`⌘,`) → Reiter **„KI Copilot“**.
3. Setze die Endpunkt-URL auf: `http://127.0.0.1:11434/v1`
4. Modellname: `llama3.1:8b`
5. Fertig! Drücke **`⌘J`**, um Notizen zusammenfassen oder durchsuchen zu lassen.

---

## 📦 Produktions-Build erstellen

Um eine fertige `.app` für macOS (oder die entsprechende Binärdatei für dein Betriebssystem) zu bauen:

```bash
npm run build:tauri
```

Das fertige Bundle befindet sich anschließend unter:
- **macOS:** `src-tauri/target/release/bundle/macos/Second Brain.app`
- Zum Installieren einfach nach `/Applications/` kopieren:
  ```bash
  cp -R "src-tauri/target/release/bundle/macos/Second Brain.app" /Applications/
  ```

---

## ⌨️ Tastatur-Kürzel (Cheatsheet)

| Tastenkürzel | Funktion |
| :--- | :--- |
| **`⌘K`** / `Ctrl+K` | Dokumentensuche & Command Palette öffnen |
| **`⌘J`** / `Ctrl+J` | KI Wiki-Copilot Drawer ein-/ausblenden |
| **`⌘,`** / `Ctrl+,` | Einstellungen öffnen (Vaults, Typografie, KI) |
| **`⌘1`** | Zum Arbeits-Wissensraum wechseln |
| **`⌘2`** | Zum privaten Wissensraum wechseln |
| **`ESC`** | Modals, Suchleiste oder Dokumentendetailansicht schließen |

---

## 📂 Projektstruktur

```text
menubar-dashboard/
├── src-tauri/                 # Rust Backend (Tauri 2.0)
│   ├── src/
│   │   ├── commands/         # Native Dateisystem-, Todo-, KI-Befehle
│   │   ├── lib.rs            # Fensterkonfiguration & Menüleiste
│   │   └── main.rs
│   └── tauri.conf.json       # App-Rechte, Fenstermaße, Bundling
├── src/                      # React 19 Frontend
│   ├── components/
│   │   ├── ai/               # AI Copilot Chat-Drawer
│   │   ├── pods/             # Pod-Karten, Modals & Detailansichten
│   │   ├── settings/         # Einstellungs-Modal (Typografie, Vaults, KI)
│   │   ├── work/             # Sprints, Backlogs, Tree-View, Cockpit
│   │   └── CommandPalette.tsx # Globale Schnellsuchleiste
│   ├── hooks/                # React Hooks (useSprintData, usePods, useVaultFiles)
│   ├── lib/                  # Parser & Hilfsfunktionen (sprints.ts, pods.ts)
│   └── App.tsx               # Haupt-App & Tastatur-Handler
├── .env.example              # Vorlage für lokale Pfade
└── README.md
```

---

## 📄 Lizenz

Entwickelt für den persönlichen und produktiven Einsatz. Feedback und Pull Requests sind willkommen!
