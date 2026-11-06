import { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Send,
  X,
  Trash2,
  FileText,
  RefreshCw,
  Sliders,
  ExternalLink,
  Zap,
  Paperclip,
  Link2,
  Plus,
  Search,
  Upload,
  HardDrive,
  FolderOpen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, noteLabel } from "@/lib/utils";
import {
  ChatMessage,
  AttachedFile,
  DEFAULT_CONFIG,
  getStoredConfig,
  saveStoredConfig,
  executeAgentTool,
  AGENT_TOOLS,
  ResponsePacing,
  typeTextNaturally,
  sleep,
  sendAiProxyRequest,
} from "@/lib/aiAgent";
import { useVaultFiles, vaultOfPath } from "@/hooks/useVaultFiles";
import { invoke, isTauri } from "@/lib/backend";

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilePath?: string | null;
  onSelectFile?: (path: string) => void;
  mode: "work" | "private";
}

export function AiCopilotDrawer({
  isOpen,
  onClose,
  activeFilePath,
  onSelectFile,
  mode,
}: AiCopilotDrawerProps) {
  const [config, setConfig] = useState(getStoredConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("ai_chat_messages");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "welcome",
        role: "assistant",
        content: `Hallo! Ich bin dein **LLM Wiki & Knowledge Copilot**. 
Ich kenne deine beiden Vaults (*second-brain* und *personal-brain*) und kann direkt Notizen durchsuchen, Inhalte lesen, Zusammenfassungen erstellen oder neue Aufgaben in deine Inbox schreiben.

Du kannst jetzt auch **Dateien direkt anhängen (📎)** oder im Text mit **[[Notizname]]** oder **@** verlinken!`,
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);
  const [attachActiveNote, setAttachActiveNote] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"ok" | "checking" | "error">("checking");

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // File attachment & linking state
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"attach" | "link">("attach");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTab, setPickerTab] = useState<"all" | "work" | "private">("all");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load vault files for autocomplete & picker
  const { files: workFiles } = useVaultFiles("work");
  const { files: privateFiles } = useVaultFiles("private");

  const allVaultFiles = useMemo(() => {
    const w = (workFiles || []).map((f) => ({ ...f, vault: "work" as const }));
    const p = (privateFiles || []).map((f) => ({ ...f, vault: "private" as const }));
    return [...w, ...p];
  }, [workFiles, privateFiles]);

  const filteredPickerFiles = useMemo(() => {
    let list = allVaultFiles;
    if (pickerTab !== "all") {
      list = list.filter((f) => f.vault === pickerTab);
    }
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.category && f.category.toLowerCase().includes(q)) ||
          f.path.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 40);
  }, [allVaultFiles, pickerTab, pickerSearch]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fullResponseRef = useRef<string | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  // Save chat history
  useEffect(() => {
    try {
      localStorage.setItem("ai_chat_messages", JSON.stringify(messages.slice(-40)));
    } catch {}
  }, [messages]);

  // Listen for external prompt suggestions (e.g. from Pods)
  useEffect(() => {
    const handleAskQuestion = (e: Event) => {
      const customEvent = e as CustomEvent<{ question?: string }>;
      if (customEvent.detail?.question) {
        setInput(customEvent.detail.question);
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 150);
      }
    };
    window.addEventListener("copilot-ask-question", handleAskQuestion);
    return () => window.removeEventListener("copilot-ask-question", handleAskQuestion);
  }, []);

  // Check connectivity to HAI proxy on mount or config change
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await sendAiProxyRequest(config.baseUrl, "/models", config.apiKey, "GET");
        if (active) setConnectionStatus(res?.data ? "ok" : "error");
      } catch {
        if (active) setConnectionStatus("error");
      }
    };
    check();
    return () => {
      active = false;
    };
  }, [config.baseUrl, config.apiKey]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!isOpen) return;
    const now = Date.now();
    if (typingMessageId) {
      if (now - lastScrollTimeRef.current > 90) {
        lastScrollTimeRef.current = now;
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentActivity, isOpen, typingMessageId]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Keyboard shortcut ESC: closes picker first, or drawer if picker closed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (showClearConfirm) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setShowClearConfirm(false);
        } else if (isFilePickerOpen) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setIsFilePickerOpen(false);
        } else {
          e.preventDefault();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose, isFilePickerOpen, showClearConfirm]);

  // Handle Tauri native window drag & drop event if available
  useEffect(() => {
    if (!isTauri() || !isOpen) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        getCurrentWindow()
          .onDragDropEvent((event) => {
            const payload = event.payload;
            if (payload.type === "enter" || payload.type === "over") {
              setIsDragging(true);
            } else if (payload.type === "leave") {
              setIsDragging(false);
            } else if (payload.type === "drop") {
              setIsDragging(false);
              if (payload.paths && payload.paths.length > 0) {
                handleNativePaths(payload.paths);
              }
            }
          })
          .then((unsub) => {
            unlisten = unsub;
          })
          .catch((e) => console.warn("Tauri drag-drop listener error:", e));
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [isOpen]);

  const handleClearClick = () => {
    setShowClearConfirm((v) => !v);
    setShowSettings(false);
  };

  const executeClearChat = () => {
    setMessages([
      {
        id: String(Date.now()),
        role: "assistant",
        content: "Verlauf geleert. Wie kann ich dir jetzt bei deinen Notizen helfen?",
        timestamp: Date.now(),
      },
    ]);
    try {
      localStorage.removeItem("ai_chat_messages");
    } catch {}
    setAttachedFiles([]);
    setIsFilePickerOpen(false);
    setShowClearConfirm(false);
  };

  // Open linked note in editor
  const handleOpenLinkedFile = (rawPathOrTitle: string) => {
    const clean = rawPathOrTitle.replace(/^vault:\/\//, "").trim();
    if (!clean) return;
    if (clean.startsWith("/")) {
      onSelectFile?.(clean);
      return;
    }
    const target = clean.toLowerCase();
    const matched = allVaultFiles.find(
      (f) =>
        f.name.toLowerCase() === target ||
        f.name.toLowerCase() === `${target}.md` ||
        f.path.toLowerCase().endsWith(target) ||
        f.path.toLowerCase().endsWith(`${target}.md`)
    );
    if (matched) {
      onSelectFile?.(matched.path);
    } else {
      onSelectFile?.(clean);
    }
  };

  // Attach a file as prompt context
  const handleAttachFile = (file: {
    path: string;
    name: string;
    vault?: "work" | "private" | "external";
    category?: string;
    content?: string;
    size?: number;
  }) => {
    if (!attachedFiles.some((f) => f.path === file.path)) {
      setAttachedFiles((prev) => [
        ...prev,
        {
          path: file.path,
          name: file.name,
          vault: file.vault || vaultOfPath(file.path),
          category: file.category,
          content: file.content,
          size: file.size,
        },
      ]);
    }
    setIsFilePickerOpen(false);
    setPickerSearch("");
  };

  // Process files selected via native dialog or drag-and-drop
  const handleExternalFiles = async (files: FileList | File[]) => {
    const newAttachments: AttachedFile[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      try {
        const text = await file.text();
        const fullPath = (file as any).path || file.name;
        newAttachments.push({
          path: fullPath,
          name: file.name,
          vault: "external",
          category: "Mac",
          content: text,
          size: file.size,
        });
      } catch (err) {
        console.warn("Konnte Datei nicht lesen:", file.name, err);
        newAttachments.push({
          path: (file as any).path || file.name,
          name: file.name,
          vault: "external",
          category: "Mac",
          size: file.size,
        });
      }
    }

    if (newAttachments.length > 0) {
      setAttachedFiles((prev) => {
        const existingPaths = new Set(prev.map((f) => f.path));
        const filtered = newAttachments.filter((f) => !existingPaths.has(f.path));
        return [...prev, ...filtered];
      });
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Process native paths from Tauri drag & drop
  const handleNativePaths = async (paths: string[]) => {
    const newAttachments: AttachedFile[] = [];

    for (const p of paths) {
      const fileName = p.split("/").pop() || p;
      let content: string | undefined;
      try {
        content = await invoke<string>("read_file", { path: p });
      } catch (err) {
        console.warn("Fehler beim Lesen des nativen Pfads:", p, err);
      }
      newAttachments.push({
        path: p,
        name: fileName,
        vault: "external",
        category: "Mac",
        content,
      });
    }

    if (newAttachments.length > 0) {
      setAttachedFiles((prev) => {
        const existingPaths = new Set(prev.map((f) => f.path));
        const filtered = newAttachments.filter((f) => !existingPaths.has(f.path));
        return [...prev, ...filtered];
      });
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Trigger native PC/Mac file dialog
  const handleBrowsePcClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleExternalFiles(e.target.files);
      setIsFilePickerOpen(false);
    }
  };

  // HTML5 Drag & Drop handlers on Drawer container
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      await handleExternalFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveAttachment = (path: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.path !== path));
  };

  // Insert a wikilink [[Note]] into textarea
  const handleInsertLink = (file: { path: string; name: string }) => {
    const cleanName = file.name.replace(/\.md$/, "");
    const linkMarkdown = `[[${cleanName}]] `;

    if (textareaRef.current) {
      const ta = textareaRef.current;
      const start = ta.selectionStart ?? input.length;
      const end = ta.selectionEnd ?? input.length;
      const before = input.slice(0, start);
      const after = input.slice(end);

      let newBefore = before;
      if (newBefore.endsWith("[[")) {
        newBefore = newBefore.slice(0, -2);
      } else if (newBefore.endsWith("@")) {
        newBefore = newBefore.slice(0, -1);
      }

      const updated = newBefore + linkMarkdown + after;
      setInput(updated);
      setTimeout(() => {
        ta.focus();
        const newPos = newBefore.length + linkMarkdown.length;
        ta.setSelectionRange(newPos, newPos);
      }, 50);
    } else {
      setInput((prev) => prev + " " + linkMarkdown);
    }
    setIsFilePickerOpen(false);
    setPickerSearch("");
  };

  // Autocomplete detection when typing [[ or @
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    const cursor = e.target.selectionStart || val.length;
    const before = val.slice(0, cursor);
    if (before.endsWith("[[") || before.endsWith("@")) {
      setPickerMode("link");
      setPickerSearch("");
      setIsFilePickerOpen(true);
    }
  };

  // Format assistant markdown to transform [[Target]] into clickable links
  const formatAssistantMarkdown = (content: string) => {
    return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
      const t = target.trim();
      const a = (alias || t).trim();
      return `[${a}](vault://${t})`;
    });
  };

  // Render user text with interactive [[WikiLink]] buttons
  const renderUserContent = (text: string) => {
    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const target = match[1].trim();
      const alias = (match[2] || target).trim();
      parts.push(
        <button
          key={match.index}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenLinkedFile(target);
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-medium underline underline-offset-2 transition-colors cursor-pointer align-baseline my-0.5 mx-0.5 shadow-2xs"
          title={`Notiz öffnen: ${target}`}
        >
          <FileText className="w-2.5 h-2.5 inline opacity-85 shrink-0" />
          <span className="truncate max-w-[180px]">{alias}</span>
          <ExternalLink className="w-2 h-2 inline opacity-70 shrink-0" />
        </button>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const handleSend = async (userPrompt?: string) => {
    const rawText = (userPrompt ?? input).trim();
    const filesToAttach = [...attachedFiles];

    if (!rawText && filesToAttach.length === 0) return;
    if (isLoading) return;

    const textToSend =
      rawText ||
      (filesToAttach.length > 0
        ? "Bitte analysiere die angehängte(n) Datei(en) und gib mir eine prägnante Zusammenfassung sowie relevante Kernpunkte."
        : "");

    setInput("");
    setAttachedFiles([]);
    setIsFilePickerOpen(false);

    const userMsgId = String(Date.now());
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        content: textToSend,
        timestamp: Date.now(),
        attachedFiles: filesToAttach.length > 0 ? filesToAttach : undefined,
      },
    ];

    setMessages(newMessages);
    setIsLoading(true);
    setCurrentActivity("Agent denkt nach…");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Natural initial pause for thoughtful, intelligent cadence
      if (config.pacing !== "instant") {
        await sleep(350, controller.signal);
      }
      if (controller.signal.aborted) return;

      // Read attached files context
      let attachedFilesContext = "";
      if (filesToAttach.length > 0) {
        setCurrentActivity("Lese angehängte Dateien…");
        try {
          const contents = await Promise.all(
            filesToAttach.map(async (file) => {
              try {
                const raw =
                  file.content !== undefined
                    ? file.content
                    : await invoke<string>("read_file", { path: file.path });
                const preview =
                  raw.length > 16000
                    ? raw.slice(0, 16000) + "\n\n... [Inhalt vom Copilot für Prompt gekürzt]"
                    : raw;
                const sourceBadge =
                  file.vault === "external"
                    ? "Lokale Datei (Computer / Mac)"
                    : `Vault: ${file.vault?.toUpperCase() || "VAULT"}`;
                return `### DOKUMENT: ${file.name} (${sourceBadge})\nPfad: ${file.path}\n\`\`\`markdown\n${preview}\n\`\`\``;
              } catch (err: any) {
                return `### DOKUMENT: ${file.name} (Pfad: ${file.path})\n(Konnte Dateiinhalt nicht lesen: ${err?.message || err})`;
              }
            })
          );
          attachedFilesContext = `\n\n=== VOM NUTZER ANGEHÄNGTE DATEIEN & INHALTE ===\n${contents.join(
            "\n\n"
          )}\n===============================================`;
        } catch (err) {
          console.warn("Fehler beim Lesen der Dateianhänge:", err);
        }
      }

      // Build conversation payload for OpenAI API
      const activeContext =
        activeFilePath && attachActiveNote
          ? `\n\nAktuell im Editor geöffnete Notiz: ${activeFilePath}`
          : "";

      const attachmentsInstruction = attachedFilesContext
        ? `\n\nHINWEIS ZU DATEIANHÄNGEN:\nDer Nutzer hat Dokumente direkt an diese Anfrage angehängt. Nutze deren Inhalt, um seine Frage fundiert, präzise und direkt zu beantworten:\n${attachedFilesContext}`
        : "";

      const apiMessages: any[] = [
        {
          role: "system",
          content: `${config.systemPrompt}\n\nAktueller Modus des Nutzers im Dashboard: ${mode.toUpperCase()}.${activeContext}${attachmentsInstruction}`,
        },
      ];

      // Convert stored messages to OpenAI format (limit to last 12 for context window)
      for (const m of newMessages.slice(-12)) {
        if (m.role === "user" || m.role === "assistant" || m.role === "tool") {
          const item: any = { role: m.role, content: m.content || "" };
          if (m.tool_calls) item.tool_calls = m.tool_calls;
          if (m.tool_call_id) item.tool_call_id = m.tool_call_id;
          if (m.name) item.name = m.name;
          apiMessages.push(item);
        }
      }

      // Autonomous Tool Loop (Max 5 turns)
      let turn = 0;
      let assistantFinished = false;

      while (!assistantFinished && turn < 5) {
        if (controller.signal.aborted) break;
        turn++;

        const data: any = await sendAiProxyRequest(
          config.baseUrl,
          "/chat/completions",
          config.apiKey,
          "POST",
          {
            model: config.model,
            messages: apiMessages,
            tools: AGENT_TOOLS,
            tool_choice: "auto",
          }
        );

        const choice = data?.choices?.[0];
        const msg = choice?.message;

        if (!msg) throw new Error("Keine Antwort vom Modell erhalten");

        // If model wants to call tools:
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          apiMessages.push(msg);

          for (const tc of msg.tool_calls) {
            if (controller.signal.aborted) break;
            const toolName = tc.function.name;
            const toolArgs = tc.function.arguments;

            let activityLabel = `Führt ${toolName} aus…`;
            try {
              const parsedArgs = JSON.parse(toolArgs || "{}");
              if (toolName === "search_vault") {
                activityLabel = `Durchsuche Vault nach „${parsedArgs.query}“…`;
              } else if (toolName === "read_note") {
                activityLabel = `Lese „${noteLabel(parsedArgs.path)}“…`;
              } else if (toolName === "open_note") {
                activityLabel = `Öffne Notiz: „${noteLabel(parsedArgs.path)}“…`;
              } else if (toolName === "add_todo") {
                activityLabel = `Erstelle Aufgabe: „${parsedArgs.text}“…`;
              } else if (toolName === "create_or_update_note") {
                activityLabel = `Aktualisiere Notiz: „${noteLabel(parsedArgs.path)}“…`;
              }
            } catch {}

            setCurrentActivity(activityLabel);

            // Execute tool locally with onSelectFile context so notes open automatically
            const toolResult = await executeAgentTool(toolName, toolArgs, { onSelectFile });

            // Natural micro-pause so user can perceive the tool action
            if (config.pacing !== "instant") {
              await sleep(280, controller.signal);
            }

            // Append tool response
            apiMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: toolName,
              content: toolResult,
            });
          }
        } else {
          // Model completed its thought and returned final content
          const finalContent = msg.content || "";
          fullResponseRef.current = finalContent;
          setCurrentActivity(null);

          const assistantMsgId = "msg-" + Date.now();
          setTypingMessageId(assistantMsgId);

          // Append assistant message initially empty
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: "assistant",
              content: config.pacing === "instant" ? finalContent : "",
              timestamp: Date.now(),
            },
          ]);

          if (config.pacing !== "instant" && finalContent) {
            // Natural micro-pause before typing starts
            await sleep(180, controller.signal);

            await typeTextNaturally(
              finalContent,
              (currentText) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: currentText } : m
                  )
                );
              },
              controller.signal,
              config.pacing || "natural"
            );
          }

          setTypingMessageId(null);
          fullResponseRef.current = null;
          assistantFinished = true;
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        const errMsg = typeof err === "string" ? err : err?.message || String(err);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            role: "assistant",
            content: `⚠️ **Verbindungsfehler**: ${errMsg}\n\n*Tipp: Prüfe in den Einstellungen oben, ob der HAI-Proxy unter http://127.0.0.1:6655 läuft.*`,
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setTypingMessageId(null);
      setCurrentActivity(null);
      abortControllerRef.current = null;
      fullResponseRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setTypingMessageId(null);
    setIsLoading(false);
    setCurrentActivity(null);
    fullResponseRef.current = null;
  };

  const handleSkipTyping = () => {
    if (typingMessageId && fullResponseRef.current) {
      const full = fullResponseRef.current;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === typingMessageId ? { ...m, content: full } : m))
      );
      setTypingMessageId(null);
      setIsLoading(false);
      setCurrentActivity(null);
      fullResponseRef.current = null;
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredConfig(config);
    setShowSettings(false);
  };

  if (!isOpen) return null;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-[440px] flex flex-col bg-white border-l border-hairline shadow-2xl animate-fadeIn select-none"
    >
      {/* Hidden Native File Input for "aus dem PC suchen" */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-white/94 backdrop-blur-sm border-2 border-dashed border-[var(--accent-cobalt)] m-2 rounded-xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn pointer-events-none shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-cobalt-subtle)] border border-[var(--accent-cobalt-border)] flex items-center justify-center mb-3 shadow-inner">
            <Upload className="w-7 h-7 text-[var(--accent-cobalt)] animate-bounce" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            Dateien hier ablegen
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-[280px] leading-relaxed mb-3">
            Markdown, Textdokumente, Code oder PDFs werden direkt als Kontext für deine Copilot-Anfrage angehängt.
          </p>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--accent-cobalt)] bg-white px-3 py-1 rounded-full border border-[var(--accent-cobalt-border)] shadow-2xs">
            <Sparkles className="w-3 h-3" />
            <span>Bereit für KI-Analyse</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-12 px-4 border-b border-hairline flex items-center justify-between bg-[#fafaf8] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-[5px] bg-[var(--accent-cobalt-subtle)] border border-[var(--accent-cobalt-border)] flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-editorial text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                Knowledge Copilot
              </span>
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  connectionStatus === "ok"
                    ? "bg-emerald-500"
                    : connectionStatus === "checking"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-rose-500"
                )}
                title={
                  connectionStatus === "ok"
                    ? "HAI Proxy verbunden"
                    : connectionStatus === "checking"
                    ? "Verbindung prüfen…"
                    : "Keine Verbindung zu localhost:6655"
                }
              />
            </div>
            <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
              {config.model} • Second Brain Wiki
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            title="Einstellungen (API Key & Endpunkt)"
            className={cn(
              "p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#eaeae4] transition-colors cursor-pointer",
              showSettings && "bg-[#eaeae4] text-[var(--text-primary)]"
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClearClick}
            title="Chatverlauf leeren"
            className={cn(
              "p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-rose-600 hover:bg-[#eaeae4] transition-colors cursor-pointer",
              showClearConfirm && "bg-rose-100 text-rose-600"
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-[1px] bg-hairline mx-0.5" />

          <button
            type="button"
            onClick={onClose}
            title="Schließen (ESC)"
            className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#eaeae4] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-app Clear Confirmation Banner */}
      {showClearConfirm && (
        <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-950 animate-fadeIn shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-medium truncate text-[11.5px]">Chatverlauf leeren?</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={executeClearChat}
              className="px-2.5 py-1 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] shadow-2xs transition-colors cursor-pointer"
            >
              Ja, leeren
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-1 rounded-[4px] bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Settings Dropdown/Drawer */}
      {showSettings && (
        <form
          onSubmit={handleSaveSettings}
          className="p-4 border-b border-hairline bg-[#f8f8f4] text-xs space-y-3 shrink-0"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--text-primary)]">Agent-Konfiguration</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              HAI Proxy: {connectionStatus === "ok" ? "Aktiv ✓" : "Offline ⚠️"}
            </span>
          </div>

          <div>
            <label className="block text-[10.5px] font-mono text-[var(--text-muted)] mb-1">
              Modell
            </label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="w-full px-2 py-1.5 bg-white border border-hairline rounded-[4px] text-xs outline-none"
            >
              <option value="gpt-4.1-mini">gpt-4.1-mini (Schnell & Responsiv - Empfohlen)</option>
              <option value="gpt-4.1">gpt-4.1 (Standard)</option>
              <option value="gpt-5-mini">gpt-5-mini (Intelligent)</option>
              <option value="gpt-5">gpt-5 (Höchste Präzision)</option>
              <option value="gpt-6.1-sol">gpt-6.1-sol (Hyperspace reasoning)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-mono text-[var(--text-muted)] mb-1">
              Antwort-Tempo (Pacing)
            </label>
            <select
              value={config.pacing || "natural"}
              onChange={(e) =>
                setConfig({ ...config, pacing: e.target.value as ResponsePacing })
              }
              className="w-full px-2 py-1.5 bg-white border border-hairline rounded-[4px] text-xs outline-none"
            >
              <option value="natural">🌿 Natürlich & Fließend (Empfohlen)</option>
              <option value="calm">🧘 Ruhig & Bedacht (Entspannt)</option>
              <option value="instant">⚡️ Sofort (Kein Schreib-Effekt)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-mono text-[var(--text-muted)] mb-1">
              Endpunkt URL
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="/hai-api/openai/v1 oder http://127.0.0.1:6655/openai/v1"
              className="w-full px-2 py-1.5 bg-white border border-hairline rounded-[4px] font-mono text-[11px] outline-none"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-mono text-[var(--text-muted)] mb-1">
              API Key (Laufende Session)
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full px-2 py-1.5 bg-white border border-hairline rounded-[4px] font-mono text-[11px] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setConfig(DEFAULT_CONFIG);
                saveStoredConfig(DEFAULT_CONFIG);
              }}
              className="px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Standard wiederherstellen
            </button>
            <button
              type="submit"
              className="editorial-btn editorial-btn-primary px-3 py-1 text-[11px]"
            >
              Speichern
            </button>
          </div>
        </form>
      )}

      {/* Active Note Context Bar */}
      {activeFilePath && (
        <div className="px-4 py-2 border-b border-hairline bg-[#fbfbf9] flex items-center justify-between text-[11px] text-[var(--text-secondary)] shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className="w-3.5 h-3.5 text-[var(--accent-cobalt)] shrink-0" />
            <span className="font-medium truncate">{noteLabel(activeFilePath)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                handleAttachFile({
                  path: activeFilePath,
                  name: noteLabel(activeFilePath),
                  vault: vaultOfPath(activeFilePath),
                })
              }
              className="font-mono text-[9.5px] px-2 py-0.5 rounded border border-[var(--accent-cobalt-border)] bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
              title="Notiz als Datei-Anhang hinzufügen"
            >
              <Paperclip className="w-2.5 h-2.5" />
              <span>Anhängen</span>
            </button>
            <button
              type="button"
              onClick={() => setAttachActiveNote((v) => !v)}
              className={cn(
                "font-mono text-[9.5px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                attachActiveNote
                  ? "bg-white border-hairline text-[var(--text-secondary)]"
                  : "bg-white border-dashed border-hairline text-[var(--text-muted)]"
              )}
              title="Aktive Notiz im Systemprompt einbeziehen"
            >
              {attachActiveNote ? "Im Kontext aktiv" : "Kontext pausiert"}
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        {messages.map((m) => (
          <div
            key={m.id}
            style={{ fontSize: "var(--copilot-font-size, 14.5px)" }}
            className={cn(
              "flex flex-col leading-relaxed",
              m.role === "user" ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "rounded-lg px-3.5 py-2.5 max-w-[92%] shadow-2xs",
                m.role === "user"
                  ? "bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 font-medium"
                  : "bg-[#f9f9f6] dark:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-hairline"
              )}
            >
              {m.role === "user" ? (
                <div className="space-y-1.5 w-full">
                  {/* Attached Files Chips on User Message */}
                  {m.attachedFiles && m.attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1 justify-end">
                      {m.attachedFiles.map((f) => (
                        <button
                          key={f.path}
                          type="button"
                          onClick={() => handleOpenLinkedFile(f.path)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[5px] bg-white/20 dark:bg-black/15 hover:bg-white/30 dark:hover:bg-black/25 text-white dark:text-zinc-900 text-[11px] font-medium transition-all cursor-pointer border border-white/25 dark:border-black/20 shadow-2xs group"
                          title={
                            f.vault === "external"
                              ? `Lokale Datei: ${f.name}`
                              : `Klicke, um „${f.name}“ im Editor zu öffnen`
                          }
                        >
                          {f.vault === "external" ? (
                            <HardDrive className="w-3 h-3 opacity-90 shrink-0" />
                          ) : (
                            <FileText className="w-3 h-3 opacity-90 shrink-0" />
                          )}
                          <span className="truncate max-w-[170px]">{f.name}</span>
                          <span className="text-[8.5px] font-mono opacity-90 uppercase px-1 rounded bg-white/15">
                            {f.vault === "external"
                              ? "Mac"
                              : f.vault || (f.path.includes("personal-brain") ? "privat" : "work")}
                          </span>
                          {f.vault !== "external" && (
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">
                    {renderUserContent(m.content)}
                  </div>
                </div>
              ) : (
                <div className="prose prose-xs max-w-none text-[var(--text-primary)] font-normal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_li]:my-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:bg-black/[0.04] [&_code]:px-1 [&_code]:py-0.2 [&_code]:rounded [&_pre]:my-2 [&_pre]:p-2 [&_pre]:bg-zinc-900 [&_pre]:text-zinc-100 [&_pre]:rounded [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:text-xs [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-semibold">
                  {m.id === typingMessageId && !m.content ? (
                    <span className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] italic py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cobalt)] animate-pulse shrink-0" />
                      <span>Formuliere Antwort…</span>
                    </span>
                  ) : (
                    <>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <button
                              type="button"
                              onClick={() => {
                                if (href) handleOpenLinkedFile(href);
                              }}
                              className="text-[var(--accent-cobalt)] font-medium underline inline-flex items-center gap-1 hover:opacity-80 cursor-pointer"
                              title={href ? `Notiz im Editor öffnen: ${href}` : undefined}
                            >
                              <FileText className="w-2.5 h-2.5 inline opacity-75 shrink-0" />
                              <span>{children}</span>
                              <ExternalLink className="w-2.5 h-2.5 inline opacity-60 shrink-0" />
                            </button>
                          ),
                        }}
                      >
                        {formatAssistantMarkdown(m.content)}
                      </ReactMarkdown>
                      {m.id === typingMessageId && (
                        <span
                          className="inline-block w-1.5 h-3.5 ml-1 align-baseline bg-[var(--accent-cobalt)] animate-pulse rounded-[1px]"
                          title="Tippt…"
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {m.timestamp && (
              <span className="font-mono text-[9px] text-[var(--text-faint)] mt-1 px-1">
                {new Date(m.timestamp).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        ))}

        {/* Live Activity Indicator */}
        {currentActivity && (
          <div className="flex items-center gap-2 p-2.5 rounded-[6px] bg-[var(--accent-cobalt-subtle)] border border-[var(--accent-cobalt-border)] text-xs text-[var(--accent-cobalt)] animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="font-mono text-[11px] truncate">{currentActivity}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Action Prompts */}
      <div className="px-3 py-1.5 border-t border-hairline bg-[#fafaf8] overflow-x-auto flex items-center gap-1.5 shrink-0 no-scrollbar">
        {activeFilePath && (
          <button
            type="button"
            onClick={() => handleSend("Fasse die aktuell geöffnete Notiz prägnant zusammen.")}
            className="px-2 py-0.5 rounded-[4px] bg-white border border-hairline text-[10.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cobalt)] transition-colors whitespace-nowrap cursor-pointer"
          >
            📝 Notiz zusammenfassen
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            handleSend("Welche Notizen und Konzepte gibt es zum Thema Green Ledger und Omni Agent?")
          }
          className="px-2 py-0.5 rounded-[4px] bg-white border border-hairline text-[10.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cobalt)] transition-colors whitespace-nowrap cursor-pointer"
        >
          🔍 Notizen durchsuchen
        </button>
        <button
          type="button"
          onClick={() => handleSend("Welche offenen Todos gibt es aktuell in den Notizen?")}
          className="px-2 py-0.5 rounded-[4px] bg-white border border-hairline text-[10.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cobalt)] transition-colors whitespace-nowrap cursor-pointer"
        >
          📋 Offene Aufgaben prüfen
        </button>
      </div>

      {/* Attached Files Tray (Above Input) */}
      {attachedFiles.length > 0 && (
        <div className="px-3 py-1.5 border-t border-hairline bg-[#fafaf7] flex items-center gap-1.5 flex-wrap shrink-0">
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1 mr-0.5 shrink-0">
            <Paperclip className="w-3 h-3 text-[var(--accent-cobalt)]" />
            Angehängt ({attachedFiles.length}):
          </span>
          {attachedFiles.map((file) => (
            <div
              key={file.path}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-[5px] bg-white border border-hairline text-[11px] text-[var(--text-primary)] shadow-2xs group hover:border-[var(--accent-cobalt-border)] transition-all"
            >
              {file.vault === "external" ? (
                <HardDrive className="w-3 h-3 text-[var(--accent-cobalt)] shrink-0" />
              ) : (
                <FileText className="w-3 h-3 text-[var(--accent-cobalt)] shrink-0" />
              )}
              <span className="font-medium truncate max-w-[150px]" title={file.path}>
                {file.name}
              </span>
              <span
                className={cn(
                  "text-[8.5px] font-mono px-1 py-0.2 rounded uppercase font-medium",
                  file.vault === "work"
                    ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)]"
                    : file.vault === "private"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-purple-50 text-purple-700 border border-purple-200"
                )}
              >
                {file.vault === "work" ? "Work" : file.vault === "private" ? "Privat" : "Mac"}
              </span>
              {file.size !== undefined && (
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  {file.size < 1024
                    ? `${file.size} B`
                    : file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(0)} KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemoveAttachment(file.path)}
                className="p-0.5 rounded text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Diesen Anhang entfernen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setPickerMode("attach");
              setIsFilePickerOpen(true);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border border-dashed border-hairline hover:border-[var(--accent-cobalt)] text-[10.5px] text-[var(--text-muted)] hover:text-[var(--accent-cobalt)] bg-transparent cursor-pointer transition-colors"
            title="Weitere Datei anhängen"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Mehr</span>
          </button>
        </div>
      )}

      {/* Floating File Picker Popover */}
      {isFilePickerOpen && (
        <div className="absolute inset-x-3 bottom-[82px] z-50 bg-white border border-hairline rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[350px] animate-fadeIn">
          {/* Picker Header */}
          <div className="p-2.5 border-b border-hairline bg-[#fafaf8] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {pickerMode === "attach" ? (
                <Paperclip className="w-3.5 h-3.5 text-[var(--accent-cobalt)] shrink-0" />
              ) : (
                <Link2 className="w-3.5 h-3.5 text-[var(--accent-cobalt)] shrink-0" />
              )}
              <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {pickerMode === "attach" ? "Datei als Kontext anfügen" : "Notiz im Chat verlinken"}
              </span>
            </div>

            {/* Vault Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#eeeeea] p-0.5 rounded-[5px] text-[10.5px]">
              <button
                type="button"
                onClick={() => setPickerTab("all")}
                className={cn(
                  "px-2 py-0.5 rounded-[4px] font-medium transition-all cursor-pointer",
                  pickerTab === "all"
                    ? "bg-white text-[var(--text-primary)] shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                Alle ({allVaultFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setPickerTab("work")}
                className={cn(
                  "px-2 py-0.5 rounded-[4px] font-medium transition-all cursor-pointer",
                  pickerTab === "work"
                    ? "bg-white text-[var(--text-primary)] shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                Work ({workFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setPickerTab("private")}
                className={cn(
                  "px-2 py-0.5 rounded-[4px] font-medium transition-all cursor-pointer",
                  pickerTab === "private"
                    ? "bg-white text-[var(--text-primary)] shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                Privat ({privateFiles.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFilePickerOpen(false)}
              className="p-1 rounded hover:bg-[#e6e6de] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
              title="Schließen (ESC)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Input in Picker */}
          <div className="p-2 border-b border-hairline bg-white flex items-center gap-2 shrink-0">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              autoFocus
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Notiz nach Name oder Pfad filtern…"
              className="flex-1 text-xs bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
            />
            {pickerSearch && (
              <button
                type="button"
                onClick={() => setPickerSearch("")}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* PC / Mac File Search Card */}
          <div className="p-2.5 bg-[#f6f6f2] border-b border-hairline flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-white border border-hairline flex items-center justify-center shrink-0 shadow-2xs">
                <HardDrive className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium text-[var(--text-primary)] truncate">
                  Aus dem Computer suchen…
                </p>
                <p className="text-[9.5px] font-mono text-[var(--text-muted)] truncate">
                  Finder-Dateidialog öffnen (Downloads, Dokumente, etc.)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBrowsePcClick}
              className="px-2.5 py-1 rounded-[4px] bg-white hover:bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border border-hairline hover:border-[var(--accent-cobalt-border)] text-[10.5px] font-medium transition-all cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
              title="Dateien vom PC / Mac durchsuchen & anhängen"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Vom Mac</span>
            </button>
          </div>

          {/* Active Note Highlight Bar if available */}
          {activeFilePath && !pickerSearch && (
            <div className="px-3 py-1.5 bg-[var(--accent-cobalt-subtle)] border-b border-[var(--accent-cobalt-border)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-3 h-3 text-[var(--accent-cobalt)] shrink-0" />
                <span className="text-[11px] font-medium text-[var(--accent-cobalt)] truncate">
                  Aktuell: {noteLabel(activeFilePath)}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleAttachFile({
                      path: activeFilePath,
                      name: noteLabel(activeFilePath),
                      vault: vaultOfPath(activeFilePath),
                    })
                  }
                  className="px-2 py-0.5 rounded-[4px] bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 dark:font-semibold text-[10px] font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Paperclip className="w-2.5 h-2.5" />
                  <span>Anhängen</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertLink({
                      path: activeFilePath,
                      name: noteLabel(activeFilePath),
                    })
                  }
                  className="px-2 py-0.5 rounded-[4px] bg-white dark:bg-[var(--bg-subtle)] border border-[var(--accent-cobalt-border)] text-[var(--accent-cobalt)] text-[10px] font-medium hover:bg-white/80 dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Link2 className="w-2.5 h-2.5" />
                  <span>Link</span>
                </button>
              </div>
            </div>
          )}

          {/* File Results List */}
          <div className="flex-1 overflow-y-auto divide-y divide-hairline">
            {filteredPickerFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                Keine passenden Notizen gefunden.
              </div>
            ) : (
              filteredPickerFiles.map((file) => {
                const isAttached = attachedFiles.some((f) => f.path === file.path);
                return (
                  <div
                    key={file.path}
                    className="p-2 hover:bg-[#f6f6f2] flex items-center justify-between gap-2 transition-colors group cursor-default"
                  >
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        if (pickerMode === "attach") {
                          handleAttachFile(file);
                        } else {
                          handleInsertLink(file);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-[var(--accent-cobalt)] shrink-0" />
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {file.name}
                        </span>
                        <span
                          className={cn(
                            "text-[8.5px] font-mono px-1 py-0.2 rounded uppercase shrink-0",
                            file.vault === "work"
                              ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)]"
                              : "bg-emerald-50 text-emerald-700"
                          )}
                        >
                          {file.vault === "work" ? "Work" : "Privat"}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] truncate pl-5">
                        {file.category || file.path.split("/").slice(-2, -1)[0] || "Vault"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAttachFile(file)}
                        disabled={isAttached}
                        className={cn(
                          "px-2 py-1 rounded-[4px] text-[10.5px] font-medium transition-all cursor-pointer flex items-center gap-1",
                          isAttached
                            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                            : "bg-white hover:bg-[var(--accent-cobalt-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent-cobalt)] border border-hairline shadow-2xs"
                        )}
                        title="Als Datei-Kontext für den Prompt anfügen"
                      >
                        <Paperclip className="w-2.5 h-2.5" />
                        <span>{isAttached ? "Angehängt ✓" : "Anhängen"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInsertLink(file)}
                        className="px-2 py-1 rounded-[4px] bg-white hover:bg-[#eaeaec] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-hairline text-[10.5px] font-medium transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Als [[Link]] in Eingabefeld einfügen"
                      >
                        <Link2 className="w-2.5 h-2.5" />
                        <span>Link</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Input Box Toolbar & Textarea */}
      <div className="p-3 border-t border-hairline bg-white shrink-0 relative">
        <div className="flex flex-col gap-1.5 p-2 rounded-[6px] border border-hairline bg-[#fafaf8] focus-within:border-[var(--accent-cobalt)] focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Frage dein Second Brain Wiki… (Enter zum Senden, @ oder [[ für Notizen)"
            className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] resize-none outline-none leading-relaxed"
          />

          {/* Action Toolbar below textarea */}
          <div className="flex items-center justify-between pt-1 border-t border-hairline/60">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPickerMode("attach");
                  setPickerSearch("");
                  setIsFilePickerOpen((v) => !v);
                }}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer",
                  isFilePickerOpen && pickerMode === "attach"
                    ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border border-[var(--accent-cobalt-border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#eaeae4]"
                )}
                title="Notiz aus Vault anhängen (für Prompt-Kontext)"
              >
                <Paperclip className="w-3 h-3 text-[var(--accent-cobalt)]" />
                <span>Vault</span>
              </button>

              <button
                type="button"
                onClick={handleBrowsePcClick}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#eaeae4] transition-colors cursor-pointer"
                title="Dateien vom Computer / Mac suchen & auswählen"
              >
                <FolderOpen className="w-3 h-3 text-[var(--accent-cobalt)]" />
                <span>Vom Mac</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPickerMode("link");
                  setPickerSearch("");
                  setIsFilePickerOpen((v) => !v);
                }}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer",
                  isFilePickerOpen && pickerMode === "link"
                    ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border border-[var(--accent-cobalt-border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#eaeae4]"
                )}
                title="Notiz verlinken ([[...]])"
              >
                <Link2 className="w-3 h-3 text-[var(--accent-cobalt)]" />
                <span>Link</span>
              </button>

              {activeFilePath && !attachedFiles.some((f) => f.path === activeFilePath) && (
                <button
                  type="button"
                  onClick={() => {
                    handleAttachFile({
                      path: activeFilePath,
                      name: noteLabel(activeFilePath),
                      vault: vaultOfPath(activeFilePath),
                    });
                  }}
                  className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#f0f0eb] hover:bg-[#e4e4dc] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border border-hairline/60"
                  title="Aktuell im Editor geöffnete Notiz schnell anhängen"
                >
                  <Plus className="w-2.5 h-2.5 text-[var(--accent-cobalt)]" />
                  <span>+ Aktuelle</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  {typingMessageId && (
                    <button
                      type="button"
                      onClick={handleSkipTyping}
                      className="px-2 py-1 rounded-[4px] bg-[#f0f0ea] dark:bg-white/[0.08] hover:bg-[#e4e4dc] dark:hover:bg-white/[0.12] text-[10.5px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Tipp-Animation überspringen und gesamte Antwort sofort anzeigen"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Sofort</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStop}
                    className="p-1.5 rounded-[4px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                    title="Antwort stoppen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() && attachedFiles.length === 0}
                  className={cn(
                    "p-1.5 px-3 rounded-[5px] transition-all cursor-pointer flex items-center gap-1.5 font-medium shadow-2xs",
                    input.trim() || attachedFiles.length > 0
                      ? "bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 dark:font-semibold hover:opacity-95"
                      : "bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-faint)] dark:text-zinc-500 cursor-not-allowed"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Senden</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
