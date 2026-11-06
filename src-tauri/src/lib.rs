use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Remove native macOS titlebar separator line (the white/gray line in dark mode)
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                use objc::runtime::Object;
                use objc::{msg_send, sel, sel_impl};
                if let Ok(ns_window_ptr) = window.ns_window() {
                    unsafe {
                        let ns_window = ns_window_ptr as *mut Object;
                        // NSTitlebarSeparatorStyleNone = 0
                        let _: () = msg_send![ns_window, setTitlebarSeparatorStyle: 0isize];
                    }
                }
            }

            // Native macOS Application Menu (Edit, Copy, Paste, Undo, Window, etc.)
            let app_menu = Menu::default(app.handle())?;
            app.set_menu(app_menu)?;

            let app_title = MenuItem::with_id(app, "title", "Second Brain Studio", false, None::<&str>)?;
            let toggle = MenuItem::with_id(app, "toggle", "Workspace anzeigen", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app.handle())?;
            let quit = MenuItem::with_id(app, "quit", "Beenden", true, Some("CmdOrCtrl+Q"))?;
            let tray_menu = Menu::with_items(app, &[&app_title, &toggle, &sep, &quit])?;

            let icon = tauri::include_image!("icons/icon.png");
            TrayIconBuilder::new()
                .icon(icon)
                .menu(&tray_menu)
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
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "toggle" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // On macOS, closing window hides it into the tray companion
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::fs::list_vault_files,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_folder,
            commands::fs::delete_file_or_folder,
            commands::fs::rename_file_or_folder,
            commands::fs::reveal_in_finder,
            commands::fs::open_in_editor,
            commands::fs::recent_files,
            commands::fs::search_vault,
            commands::todos::parse_todos,
            commands::todos::toggle_todo,
            commands::calendar::get_calendar_events,
            commands::finance::get_finance_data,
            commands::finance::add_finance_entry,
            commands::ai::ai_proxy_request,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
                if !has_visible_windows {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        });
}
