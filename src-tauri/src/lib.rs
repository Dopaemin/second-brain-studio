use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            let icon = tauri::include_image!("icons/icon.png");
            TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.center();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    if event.id == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::fs::list_vault_files,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::open_in_editor,
            commands::fs::recent_files,
            commands::todos::parse_todos,
            commands::todos::toggle_todo,
            commands::calendar::get_calendar_events,
            commands::finance::get_finance_data,
            commands::finance::add_finance_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
