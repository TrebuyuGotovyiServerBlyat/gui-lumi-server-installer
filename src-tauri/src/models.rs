use serde::{Deserialize, Serialize};

pub fn default_memory() -> String {
    "2G".to_string()
}

#[derive(Serialize, Clone)]
pub struct JavaCheckResult {
    pub is_installed: bool,
    pub version: Option<String>,
    pub major_version: Option<u32>,
    pub is_compatible: bool,
    pub required_version: String,
}

#[derive(Deserialize, Debug)]
pub struct GeneralSettings {
    pub motd: String,
    #[serde(rename = "server-port")]
    pub server_port: u16,
    #[serde(rename = "max-players")]
    pub max_players: u32,
}

#[derive(Deserialize, Debug)]
pub struct LumiConfig {
    pub general: GeneralSettings,
}

#[derive(Serialize, Default, Clone)]
pub struct ServerInfo {
    pub motd: String,
    pub server_port: u16,
    pub max_players: u32,
    pub core_jar: String,
}

#[derive(Serialize)]
#[serde(tag = "status", content = "data")]
pub enum ScanResult {
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
pub struct SavedServer {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "coreJar")]
    pub core_jar: String,
    #[serde(default = "default_memory")]
    pub xmx: String,
    #[serde(default = "default_memory")]
    pub xms: String,
}

#[derive(Debug, Serialize)]
pub struct ResponseSettings {
    pub motd: String,
    #[serde(rename = "server-port")]
    pub server_port: u16,
    #[serde(rename = "max-players")]
    pub max_players: u32,
}

#[derive(Debug, Serialize)]
pub struct ServerResponse {
    pub id: String,
    pub name: String,
    pub path: String,
    pub status: String,
    #[serde(rename = "coreJar")]
    pub core_jar: String,
    pub settings: ResponseSettings,
    #[serde(rename = "errorMessage")]
    pub error_message: Option<String>,
}
