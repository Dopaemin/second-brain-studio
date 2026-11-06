use serde::{Deserialize, Serialize};
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

#[derive(Serialize, Deserialize, Debug)]
pub struct VaultFile {
    pub path: String,
    pub name: String,
    pub category: String,
    pub modified: u64,
}

/// Directories that are not notes: hidden dirs, dependencies and nested git repos.
pub fn is_ignored_dir(entry: &walkdir::DirEntry, root: &str) -> bool {
    if !entry.file_type().is_dir() {
        return false;
    }
    let name = entry.file_name().to_string_lossy();
    if entry.path() == std::path::Path::new(root) {
        return false;
    }
    name.starts_with('.')
        || name == "node_modules"
        || name == "Library"
        || name == "Packages"
        || entry.path().join(".git").exists()
}

#[tauri::command]
pub fn list_vault_files(vault_path: String) -> Result<Vec<VaultFile>, String> {
    let mut files: Vec<VaultFile> = WalkDir::new(&vault_path)
        .into_iter()
        .filter_entry(|e| !is_ignored_dir(e, &vault_path))
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().map(|x| x == "md").unwrap_or(false)
                && !e.path().to_string_lossy().contains("07 Anh\u{00e4}nge")
                && !e.path().to_string_lossy().contains(".claude")
        })
        .filter_map(|e| {
            let path = e.path().to_string_lossy().to_string();
            let name = e.path().file_stem()?.to_string_lossy().to_string();
            let modified = e
                .metadata()
                .ok()?
                .modified()
                .ok()?
                .duration_since(UNIX_EPOCH)
                .ok()?
                .as_secs();

            let rel = e.path().strip_prefix(&vault_path).ok()?;
            let category = rel
                .components()
                .next()
                .map(|c| c.as_os_str().to_string_lossy().to_string())
                .unwrap_or_else(|| "Root".to_string());

            Some(VaultFile {
                path,
                name,
                category,
                modified,
            })
        })
        .collect();

    files.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(files)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_file_or_folder(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.is_dir() {
        std::fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else if p.exists() {
        std::fs::remove_file(p).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn rename_file_or_folder(from: String, to: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&to).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::rename(&from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_in_editor(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-a")
        .arg("Obsidian")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub category: String,
    pub snippet: String,
}

#[tauri::command]
pub fn search_vault(vault_path: String, query: String) -> Result<Vec<SearchResult>, String> {
    let q = query.to_lowercase();
    if q.is_empty() {
        return Ok(Vec::new());
    }
    let mut results = Vec::new();
    let walker = WalkDir::new(&vault_path)
        .into_iter()
        .filter_entry(|e| {
            !is_ignored_dir(e, &vault_path)
                && !(e.file_type().is_dir() && e.file_name().to_string_lossy() == "06 Archiv")
        })
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|x| x == "md").unwrap_or(false));

    for entry in walker {
        let path_str = entry.path().to_string_lossy().to_string();
        let stem = entry.path().file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let content = match std::fs::read_to_string(&path_str) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let match_title = stem.to_lowercase().contains(&q);
        let match_content = content.to_lowercase().contains(&q);
        if match_title || match_content {
            let snippet = if match_content {
                content
                    .lines()
                    .find(|l| l.to_lowercase().contains(&q))
                    .map(|l| l.trim().chars().take(180).collect::<String>())
                    .unwrap_or_else(|| content.chars().take(150).collect::<String>())
            } else {
                content.lines().next().unwrap_or("").trim().chars().take(150).collect::<String>()
            };
            let rel = entry.path().strip_prefix(&vault_path).ok();
            let category = rel
                .and_then(|r| r.components().next())
                .map(|c| c.as_os_str().to_string_lossy().to_string())
                .unwrap_or_else(|| "Root".to_string());
            results.push(SearchResult {
                path: path_str,
                name: stem,
                category,
                snippet,
            });
            if results.len() >= 30 {
                break;
            }
        }
    }
    Ok(results)
}

#[tauri::command]
pub fn recent_files(vault_path: String, limit: usize) -> Result<Vec<VaultFile>, String> {
    let mut all = list_vault_files(vault_path)?;
    all.truncate(limit);
    Ok(all)
}

