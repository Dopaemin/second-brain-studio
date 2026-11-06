use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TodoItem {
    pub text: String,
    pub checked: bool,
    pub file_path: String,
    pub line_index: usize,
}

#[tauri::command]
pub fn parse_todos(vault_path: String) -> Result<Vec<TodoItem>, String> {
    let mut todos: Vec<TodoItem> = Vec::new();

    let walker = walkdir::WalkDir::new(&vault_path)
        .into_iter()
        .filter_entry(|e| {
            !super::fs::is_ignored_dir(e, &vault_path)
                && !(e.file_type().is_dir() && e.file_name().to_string_lossy() == "06 Archiv")
        })
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().map(|x| x == "md").unwrap_or(false)
                && !e.path().to_string_lossy().contains(".claude")
        });

    for entry in walker {
        let path = entry.path().to_string_lossy().to_string();
        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for (i, line) in content.lines().enumerate() {
            let trimmed = line.trim_start();
            if trimmed.starts_with("- [ ] ") {
                todos.push(TodoItem {
                    text: trimmed[6..].to_string(),
                    checked: false,
                    file_path: path.clone(),
                    line_index: i,
                });
            } else if trimmed.starts_with("- [x] ") {
                todos.push(TodoItem {
                    text: trimmed[6..].to_string(),
                    checked: true,
                    file_path: path.clone(),
                    line_index: i,
                });
            }
        }
    }

    Ok(todos)
}

#[tauri::command]
pub fn toggle_todo(file_path: String, line_index: usize, checked: bool) -> Result<(), String> {
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let lines: Vec<&str> = content.lines().collect();

    if line_index >= lines.len() {
        return Err("Line index out of bounds".to_string());
    }

    let new_line_owned: String = if checked {
        lines[line_index].replacen("- [ ] ", "- [x] ", 1)
    } else {
        lines[line_index].replacen("- [x] ", "- [ ] ", 1)
    };

    let mut new_lines: Vec<String> = lines.iter().map(|l| l.to_string()).collect();
    new_lines[line_index] = new_line_owned;
    let mut new_content = new_lines.join("\n");
    if content.ends_with('\n') {
        new_content.push('\n');
    }
    std::fs::write(&file_path, new_content).map_err(|e| e.to_string())
}
