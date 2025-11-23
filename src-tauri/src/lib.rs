pub mod commands;
pub mod models;
pub mod utils;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_java_version,
            scan_server_folder,
            check_server_status,
            launch_server_terminal,
            stop_server,
            scan_and_check_servers,
            get_total_memory,
            is_dir_empty,
            download_file,
            setup_lumi_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
