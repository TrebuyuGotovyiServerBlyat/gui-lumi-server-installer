use crate::models::{LumiConfig, ScanResult, ServerInfo};
use fs2::FileExt;
use std::fs::{self, OpenOptions};
use std::path::Path;

pub fn check_server_status_internal(server_path: &str) -> String {
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

pub fn scan_server_folder_internal(server_path: &str) -> Result<ScanResult, String> {
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
