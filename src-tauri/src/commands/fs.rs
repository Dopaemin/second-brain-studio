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

#[tauri::command]
pub fn list_vault_files(vault_path: String) -> Result<Vec<VaultFile>, String> {
    let mut files: Vec<VaultFile> = WalkDir::new(&vault_path)
        .into_iter()
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
    std::fs::write(&path, content).map_err(|e| e.to_string())
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

#[tauri::command]
pub fn recent_files(vault_path: String, limit: usize) -> Result<Vec<VaultFile>, String> {
    let mut all = list_vault_files(vault_path)?;
    all.truncate(limit);
    Ok(all)
}
