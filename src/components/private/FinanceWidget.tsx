import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { GlassPanel } from "../GlassPanel";

interface FinanceEntry {
  date: string;
  amount: number;
  category: string;
  description: string;
  entry_type: string;
}

interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  balance: number;
  entries: FinanceEntry[];
}

const FINANCE_PATH =
  "/Users/I539120/Documents/personal-brain/03 Bereiche/Finanzen/Finanzen.md";

export function FinanceWidget() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "",
    description: "",
    type: "expense",
  });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    invoke<FinanceSummary>("get_finance_data", { financePath: FINANCE_PATH })
      .then(setData)
      .catch((e) => console.error("Failed to load finance data:", e));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async () => {
    if (!form.date) {
      setError("Datum ist ein Pflichtfeld");
      return;
    }
    if (!form.description) {
      setError("Beschreibung ist ein Pflichtfeld");
      return;
    }
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      setError("Betrag muss eine gültige Zahl sein");
      return;
    }
    if (!form.category) {
      setError("Kategorie ist ein Pflichtfeld");
      return;
    }
    setError(null);
    try {
      await invoke("add_finance_entry", {
        financePath: FINANCE_PATH,
        entry: {
          date: form.date,
          amount: parseFloat(form.amount),
          category: form.category,
          description: form.description,
          entry_type: form.type,
        },
      });
    } catch (e) {
      setError(String(e));
      return;
    }
    setForm({ date: new Date().toISOString().slice(0, 10), amount: "", category: "", description: "", type: "expense" });
    setAdding(false);
    refresh();
  };

  return (
    <GlassPanel title="Finanzen">
      {data && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[
            { label: "Einnahmen", val: data.total_income, color: "#4ade80" },
            { label: "Ausgaben", val: data.total_expenses, color: "#f87171" },
            {
              label: "Bilanz",
              val: data.balance,
              color: "var(--accent)",
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {s.label}
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: s.color }}
              >
                {s.val >= 0 ? "+" : ""}
                {s.val.toFixed(0)}€
              </p>
            </div>
          ))}
        </div>
      )}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-3 py-1 rounded-full self-start no-drag"
          style={{
            background: "var(--accent-glow)",
            border: "1px solid var(--accent-border)",
            color: "var(--text-primary)",
          }}
        >
          + Eintrag
        </button>
      ) : (
        <div className="flex flex-col gap-2 no-drag">
          {error && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}
          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((f) => ({ ...f, date: e.target.value }))
            }
            className="text-sm bg-white/5 rounded px-2 py-1 outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          <div className="flex gap-2">
            <input
              placeholder="Betrag €"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              className="flex-1 text-sm bg-white/5 rounded px-2 py-1 outline-none"
              style={{ color: "var(--text-primary)" }}
              type="number"
            />
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value }))
              }
              className="text-sm bg-white/5 rounded px-2 py-1 outline-none"
              style={{ color: "var(--text-primary)" }}
            >
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
            </select>
          </div>
          <input
            placeholder="Kategorie"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            className="text-sm bg-white/5 rounded px-2 py-1 outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          <input
            placeholder="Beschreibung"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="text-sm bg-white/5 rounded px-2 py-1 outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: "var(--accent-glow)",
                border: "1px solid var(--accent-border)",
                color: "var(--text-primary)",
              }}
            >
              Speichern
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="text-xs px-3 py-1 rounded-full"
              style={{ color: "var(--text-secondary)" }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
