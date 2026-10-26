use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct FinanceEntry {
    pub date: String,
    pub amount: f64,
    pub category: String,
    pub description: String,
    pub entry_type: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FinanceSummary {
    pub entries: Vec<FinanceEntry>,
    pub total_income: f64,
    pub total_expenses: f64,
    pub balance: f64,
}

#[tauri::command]
pub fn get_finance_data(finance_path: String) -> Result<FinanceSummary, String> {
    let content = std::fs::read_to_string(&finance_path).unwrap_or_default();
    let mut entries: Vec<FinanceEntry> = Vec::new();

    for line in content.lines() {
        if line.starts_with("| 20") {
            let cols: Vec<&str> = line.split('|').map(|s| s.trim()).collect();
            if cols.len() >= 6 {
                let amount_str = cols[2].replace(['+', '-', ' '], "");
                if let Ok(amount) = amount_str.parse::<f64>() {
                    let signed = if cols[2].contains('-') { -amount } else { amount };
                    entries.push(FinanceEntry {
                        date: cols[1].to_string(),
                        amount: signed.abs(),
                        category: cols[3].to_string(),
                        description: cols[4].to_string(),
                        entry_type: if signed >= 0.0 {
                            "income".into()
                        } else {
                            "expense".into()
                        },
                    });
                }
            }
        }
    }

    let total_income: f64 = entries
        .iter()
        .filter(|e| e.entry_type == "income")
        .map(|e| e.amount)
        .sum();
    let total_expenses: f64 = entries
        .iter()
        .filter(|e| e.entry_type == "expense")
        .map(|e| e.amount)
        .sum();

    Ok(FinanceSummary {
        balance: total_income - total_expenses,
        total_income,
        total_expenses,
        entries,
    })
}

#[tauri::command]
pub fn add_finance_entry(finance_path: String, entry: FinanceEntry) -> Result<(), String> {
    let content = std::fs::read_to_string(&finance_path).unwrap_or_else(|_| {
        "# Finanzen\n\n## Eintr\u{00e4}ge\n\n| Datum | Betrag | Kategorie | Beschreibung | Typ |\n|-------|--------|-----------|--------------|-----|\n".to_string()
    });

    let sign = if entry.entry_type == "income" { "+" } else { "-" };
    let new_row = format!(
        "| {} | {}{:.2} | {} | {} | {} |\n",
        entry.date, sign, entry.amount, entry.category, entry.description, entry.entry_type
    );

    let updated = if content.contains("|-------|") {
        content.replacen(
            "| Typ |\n|-------|--------|-----------|--------------|-----|\n",
            &format!(
                "| Typ |\n|-------|--------|-----------|--------------|-----|\n{}",
                new_row
            ),
            1,
        )
    } else {
        format!("{}\n{}", content, new_row)
    };

    std::fs::write(&finance_path, updated).map_err(|e| e.to_string())
}
