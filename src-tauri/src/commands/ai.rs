use serde_json::Value;

#[tauri::command]
pub async fn ai_proxy_request(
    url: String,
    method: String,
    api_key: String,
    body: Option<Value>,
) -> Result<Value, String> {
    // Force IPv4 loopback (127.0.0.1) instead of localhost to avoid macOS IPv6 (::1) ECONNREFUSED
    let target_url = if url.contains("localhost:6655") {
        url.replace("localhost:6655", "127.0.0.1:6655")
    } else {
        url
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|e| format!("Client-Initialisierungsfehler: {}", e))?;

    let mut req = match method.to_uppercase().as_str() {
        "POST" => client.post(&target_url),
        "GET" => client.get(&target_url),
        _ => return Err(format!("Nicht unterstützte HTTP-Methode: {}", method)),
    };

    req = req.header("Authorization", format!("Bearer {}", api_key.trim()));
    req = req.header("Content-Type", "application/json");

    if let Some(json_body) = body {
        req = req.json(&json_body);
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Proxy-Verbindungsfehler zu {}: {}", target_url, e))?;

    let status = resp.status();
    if !status.is_success() {
        let err_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "Unbekannter Fehler".to_string());
        return Err(format!("Proxy-Fehler (Status {}): {}", status, err_text));
    }

    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Antwort-Parsing-Fehler: {}", e))?;

    Ok(json)
}
