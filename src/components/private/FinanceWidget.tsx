import { useCallback, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { invoke } from "@/lib/backend";
import { PRIVATE_VAULT } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

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

const FINANCE_PATH = `${PRIVATE_VAULT}/03 Bereiche/Finanzen/Finanzen.md`;
const QUICK_CATEGORIES = ["Lebensmittel", "Wohnen", "Freizeit", "Abo", "Gehalt", "Investment"];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const eur = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export function FinanceWidget() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: today(),
    amount: "",
    category: "Lebensmittel",
    description: "",
    type: "expense",
  });

  const refresh = useCallback(() => {
    invoke<FinanceSummary>("get_finance_data", { financePath: FINANCE_PATH })
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!form.amount || Number.isNaN(amount) || amount <= 0) return setError("Bitte einen gültigen Betrag eingeben");
    if (!form.description.trim()) return setError("Bitte eine Beschreibung angeben");

    try {
      await invoke("add_finance_entry", {
        financePath: FINANCE_PATH,
        entry: {
          date: form.date,
          amount,
          category: form.category,
          description: form.description.trim(),
          entry_type: form.type,
        },
      });
      setForm({ date: today(), amount: "", category: "Lebensmittel", description: "", type: "expense" });
      setAdding(false);
      setError(null);
      refresh();
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    }
  };

  const entries = data?.entries ?? [];
  const income = data?.total_income ?? 0;
  const expenses = data?.total_expenses ?? 0;
  const balance = data?.balance ?? 0;
  const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expenses) / income) * 100)) : 0;

  return (
    <GlassPanel
      title="Finanzen"
      badge={entries.length ? eur(balance) : undefined}
      className="h-full"
      noPadding
      action={
        !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="editorial-btn editorial-btn-ghost px-1.5 py-0.5 text-[10.5px] font-mono gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Eintrag</span>
          </button>
        )
      }
    >
      <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2.5 rounded-[4px] bg-[#fafaf8] border border-hairline">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--text-muted)]">Einnahmen</span>
            <p className="font-mono text-xs font-semibold text-[var(--text-primary)] mt-1">{eur(income)}</p>
          </div>
          <div className="p-2.5 rounded-[4px] bg-[#fafaf8] border border-hairline">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--text-muted)]">Ausgaben</span>
            <p className="font-mono text-xs font-semibold text-[var(--text-secondary)] mt-1">{eur(expenses)}</p>
          </div>
          <div className="p-2.5 rounded-[4px] bg-[var(--accent-cobalt-subtle)] border border-[var(--accent-cobalt-border)]">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--accent-cobalt)] font-semibold">Saldo</span>
            <p className="font-mono text-xs font-bold text-[var(--accent-cobalt)] mt-1">{eur(balance)}</p>
          </div>
        </div>

        {income > 0 && (
          <div className="mb-3 px-3 py-2 rounded-[4px] bg-[#fafaf8] border border-hairline flex items-center justify-between font-mono text-[11px]">
            <span className="text-[var(--text-muted)]">Sparquote</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1 rounded-full bg-[#e5e5df] overflow-hidden">
                <div className="h-full bg-[var(--accent-cobalt)]" style={{ width: `${Math.min(100, savingsRate)}%` }} />
              </div>
              <span className="font-semibold text-[var(--text-primary)]">{savingsRate}%</span>
            </div>
          </div>
        )}

        {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}

        {adding ? (
          <form onSubmit={submit} className="p-3 rounded-[4px] bg-[#fafaf8] border border-hairline space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
              <span>Neuer Eintrag</span>
              <button type="button" onClick={() => { setAdding(false); setError(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                inputMode="decimal"
                placeholder="Betrag in €"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="editorial-input px-2.5 py-1 text-xs"
                autoFocus
              />
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="editorial-input px-2 py-1 text-xs"
              >
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
              </select>
            </div>
            <input
              placeholder="Beschreibung"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="editorial-input w-full px-2.5 py-1 text-xs"
            />
            <div className="flex flex-wrap gap-1">
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  className={cn(
                    "px-2 py-0.5 rounded-[3px] font-mono text-[9.5px] transition-colors border",
                    form.category === cat
                      ? "bg-[var(--accent-cobalt)] text-white border-transparent"
                      : "bg-white text-[var(--text-muted)] border-hairline hover:bg-[#f0f0eb]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setAdding(false); setError(null); }} className="editorial-btn editorial-btn-ghost px-2.5 py-1 text-xs">
                Abbrechen
              </button>
              <button type="submit" className="editorial-btn editorial-btn-primary px-3 py-1 text-xs">
                Speichern
              </button>
            </div>
          </form>
        ) : (
          <ScrollArea className="flex-1 h-0">
            {entries.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Noch keine Einträge</p>
                <p className="font-mono text-[10.5px] text-[var(--text-muted)]">Mit „Eintrag“ buchst du den ersten</p>
              </div>
            ) : (
              <div className="divide-y divide-hairline">
                {entries.slice(0, 12).map((entry, idx) => (
                  <div key={`${entry.date}-${idx}`} className="flex items-center justify-between py-2 text-xs">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-medium text-[var(--text-primary)] truncate">{entry.description}</p>
                      <p className="font-mono text-[9.5px] text-[var(--text-muted)] mt-0.5">
                        {entry.date} · {entry.category}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-mono font-semibold shrink-0",
                        entry.entry_type === "income" ? "text-[var(--accent-cobalt)]" : "text-[var(--text-secondary)]"
                      )}
                    >
                      {entry.entry_type === "income" ? "+" : "−"}
                      {eur(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </GlassPanel>
  );
}
