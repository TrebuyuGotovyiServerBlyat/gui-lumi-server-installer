use fs2::FileExt;
use once_cell::sync::Lazy;
use rayon::prelude::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::path::Path;
use std::process::Command;
use sysinfo::System;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn default_memory() -> String {
    "2G".to_string()
}

#[derive(Serialize, Clone)]
struct JavaCheckResult {
    is_installed: bool,
    version: Option<String>,
    major_version: Option<u32>,
    is_compatible: bool,
    required_version: String,
}

#[derive(Deserialize, Debug)]
struct GeneralSettings {
    motd: String,
    #[serde(rename = "server-port")]
    server_port: u16,
    #[serde(rename = "max-players")]
    max_players: u32,
}

#[derive(Deserialize, Debug)]
struct LumiConfig {
    general: GeneralSettings,
}

#[derive(Serialize, Default, Clone)]
struct ServerInfo {
    motd: String,
    server_port: u16,
    max_players: u32,
    core_jar: String,
}

#[derive(Serialize)]
#[serde(tag = "status", content = "data")]
enum ScanResult {
    Valid {
        config: ServerInfo,
        jars: Vec<String>,
    },
    NoSettings,
    NoJars,
    NeedCoreSelection {
        jars: Vec<String>,
        config: ServerInfo,
    },
}

#[derive(Debug, Serialize, Deserialize)]
struct SavedServer {
    id: String,
    name: String,
    path: String,
    #[serde(rename = "coreJar")]
    core_jar: String,
    #[serde(default = "default_memory")]
    xmx: String,
    #[serde(default = "default_memory")]
    xms: String,
}

#[derive(Debug, Serialize)]
struct ResponseSettings {
    motd: String,
    #[serde(rename = "server-port")]
    server_port: u16,
    #[serde(rename = "max-players")]
    max_players: u32,
}

#[derive(Debug, Serialize)]
struct ServerResponse {
    id: String,
    name: String,
    path: String,
    status: String,
    #[serde(rename = "coreJar")]
    core_jar: String,
    settings: ResponseSettings,
    #[serde(rename = "errorMessage")]
    error_message: Option<String>,
}

static JAVA_VERSION_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"(?s).*version "(\d+)(?:.(\d+))?.*""#).unwrap());

#[tauri::command]
async fn get_total_memory() -> u64 {
    let mut sys = System::new();
    sys.refresh_memory();
    sys.total_memory()
}

fn check_server_status_internal(server_path: &str) -> String {
    let path = Path::new(server_path).join("players").join("LOCK");

    if !path.exists() {
        return "unknown".to_string();
    }

    let file = match OpenOptions::new().write(true).open(&path) {
        Ok(f) => f,
        Err(_) => return "unknown".to_string(),
    };

    match file.try_lock_exclusive() {
        Ok(_) => "offline".to_string(),
        Err(_) => "online".to_string(),
    }
}

fn scan_server_folder_internal(server_path: &str) -> Result<ScanResult, String> {
    let path = Path::new(server_path);
    let mut jar_files: Vec<String> = Vec::new();

    if !path.exists() {
        return Ok(ScanResult::NoSettings);
    }

    let entries = fs::read_dir(path).map_err(|e| format!("Read dir error: {}", e))?;

    for entry in entries.flatten() {
        let p = entry.path();

        if p.is_file() {
            if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
                if ext.eq_ignore_ascii_case("jar") {
                    if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                        jar_files.push(name.to_string());
                    }
                }
            }
        }
    }

    if jar_files.is_empty() {
        return Ok(ScanResult::NoJars);
    }

    let settings_path = path.join("settings.yml");

    if !settings_path.exists() {
        return Ok(ScanResult::NoSettings);
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings.yml: {}", e))?;

    let config: LumiConfig =
        serde_yaml::from_str(&content).map_err(|e| format!("YAML parse error: {}", e))?;

    let server_info = ServerInfo {
        motd: config.general.motd,
        server_port: config.general.server_port,
        max_players: config.general.max_players,
        core_jar: String::new(),
    };

    if jar_files.len() == 1 {
        let mut chosen = server_info.clone();
        chosen.core_jar = jar_files[0].clone();
        return Ok(ScanResult::Valid {
            config: chosen,
            jars: jar_files,
        });
    }

    Ok(ScanResult::NeedCoreSelection {
        jars: jar_files,
        config: server_info,
    })
}

#[tauri::command]
async fn check_java_version(required_version_str: String) -> JavaCheckResult {
    let required_major: u32 = required_version_str.parse().unwrap_or(21);

    let mut result = JavaCheckResult {
        is_installed: false,
        version: None,
        major_version: None,
        is_compatible: false,
        required_version: required_version_str.clone(),
    };

    let mut cmd = Command::new("java");
    cmd.arg("-version");

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output();

    match output {
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);

            if let Some(captures) = JAVA_VERSION_REGEX.captures(&stderr) {
                result.is_installed = true;

                let major_str = captures.get(1).map_or("", |m| m.as_str());
                let mut major_ver: u32 = 0;

                if major_str == "1" {
                    if let Some(minor_match) = captures.get(2) {
                        major_ver = minor_match.as_str().parse().unwrap_or(0);
                    }
                } else {
                    major_ver = major_str.parse().unwrap_or(0);
                }

                result.major_version = Some(major_ver);

                if let Some(full_version_match) = stderr.split('"').nth(1) {
                    result.version = Some(full_version_match.to_string());
                }

                if major_ver >= required_major {
                    result.is_compatible = true;
                }
            }
        }
        Err(_) => {
            result.is_installed = false;
        }
    }

    result
}

#[tauri::command]
async fn scan_server_folder(server_path: String) -> Result<ScanResult, String> {
    scan_server_folder_internal(&server_path)
}

#[tauri::command]
async fn check_server_status(server_path: String) -> String {
    check_server_status_internal(&server_path)
}

#[tauri::command]
async fn scan_and_check_servers(servers: Vec<SavedServer>) -> Vec<ServerResponse> {
    servers
        .into_par_iter()
        .map(|saved| {
            let scan_result = scan_server_folder_internal(&saved.path);

            let mut response_settings = ResponseSettings {
                motd: "".to_string(),
                server_port: 0,
                max_players: 0,
            };

            match scan_result {
                Ok(res) => match res {
                    ScanResult::NoSettings => ServerResponse {
                        id: saved.id,
                        name: saved.name,
                        path: saved.path,
                        status: "error".to_string(),
                        core_jar: saved.core_jar,
                        settings: response_settings,
                        error_message: Some("Settings missing".to_string()),
                    },
                    ScanResult::NoJars => ServerResponse {
                        id: saved.id,
                        name: saved.name,
                        path: saved.path,
                        status: "error".to_string(),
                        core_jar: saved.core_jar,
                        settings: response_settings,
                        error_message: Some("No jars found".to_string()),
                    },
                    ScanResult::Valid { config, jars }
                    | ScanResult::NeedCoreSelection { config, jars } => {
                        response_settings = ResponseSettings {
                            motd: config.motd,
                            server_port: config.server_port,
                            max_players: config.max_players,
                        };

                        let effective_core = if !saved.core_jar.is_empty() {
                            saved.core_jar.clone()
                        } else {
                            "core.jar".to_string()
                        };

                        if !jars.contains(&effective_core) {
                            return ServerResponse {
                                id: saved.id,
                                name: saved.name,
                                path: saved.path,
                                status: "error".to_string(),
                                core_jar: effective_core.clone(),
                                settings: response_settings,
                                error_message: Some(format!(
                                    "Core file '{}' not found",
                                    effective_core
                                )),
                            };
                        }

                        let status = check_server_status_internal(&saved.path);

                        ServerResponse {
                            id: saved.id,
                            name: saved.name,
                            path: saved.path,
                            status,
                            core_jar: effective_core,
                            settings: response_settings,
                            error_message: None,
                        }
                    }
                },
                Err(e) => ServerResponse {
                    id: saved.id,
                    name: saved.name,
                    path: saved.path,
                    status: "error".to_string(),
                    core_jar: saved.core_jar,
                    settings: response_settings,
                    error_message: Some(e),
                },
            }
        })
        .collect()
}

#[tauri::command]
async fn launch_server_terminal(
    path: String,
    core_jar: String,
    xmx: String,
    xms: String,
) -> Result<u32, String> {
    let server_path = Path::new(&path);
    let jar_path = server_path.join(&core_jar);

    if !jar_path.exists() {
        return Err(format!(
            "Core file not found: {}\nPlease check server settings or select another core.",
            jar_path.display()
        ));
    }

    let xmx_arg = format!("-Xmx{}", xmx);
    let xms_arg = format!("-Xms{}", xms);

    #[cfg(target_os = "windows")]
    {
        let java_cmd = format!("java {} {} -jar \"{}\" nogui", xmx_arg, xms_arg, core_jar);

        let ps_script = format!(
            "$host.UI.RawUI.WindowTitle = 'Minecraft Server'; Set-Location -Path '{}'; {}; Read-Host 'Press Enter to exit...'",
            path,
            java_cmd
        );

        let child = Command::new("powershell")
            .args(["-NoLogo", "-NoExit", "-Command", &ps_script])
            .spawn()
            .map_err(|e| e.to_string())?;

        Ok(child.id())
    }

    #[cfg(target_os = "linux")]
    {
        let shell_cmd = format!(
            "cd \"{}\" && {}; exec bash",
            path,
            format!("java {} {} -jar \"{}\" nogui", xmx_arg, xms_arg, core_jar)
        );

        let terminals = [
            ("gnome-terminal", vec!["--", "bash", "-c"]),
            ("konsole", vec!["-e", "bash", "-c"]),
            ("xfce4-terminal", vec!["-x", "bash", "-c"]),
            ("xterm", vec!["-e", "bash", "-c"]),
            ("kitty", vec!["-e", "bash", "-c"]),
            ("alacritty", vec!["-e", "bash", "-c"]),
        ];

        for (term, args) in terminals {
            let mut cmd = Command::new(term);
            cmd.args(&args).arg(&shell_cmd);

            if let Ok(child) = cmd.spawn() {
                return Ok(child.id());
            }
        }

        let child = Command::new("x-terminal-emulator")
            .args(["-e", "bash", "-c", &shell_cmd])
            .spawn()
            .map_err(|_| "No supported terminal emulator found.".to_string())?;

        Ok(child.id())
    }
}

#[tauri::command]
async fn stop_server(pid: u32) -> Result<(), String> {
    println!("Force killing server process with PID: {}", pid);

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F", "/T"])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!(
                "Taskkill warning (process might be already dead): {}",
                stderr
            );
        }
    }

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("kill").args(["-9", &pid.to_string()]).output();

        if let Err(e) = output {
            println!("Kill command failed (process might be already dead): {}", e);
        }
    }

    Ok(())
}

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
            get_total_memory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
