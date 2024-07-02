use std::process::Command;

async fn is_git_installed() -> bool {
    let is_git_installed = Command::new("git")
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))
        .map_or(false, |output| output.status.success());

    if !is_git_installed {
        return false;
    } else {
        return true;
    }
}

#[tauri::command]
pub async fn clone_repo(url: String, path: String) -> Result<(), String> {
    let git_installed = is_git_installed().await;
    if git_installed {
        let output = Command::new("git")
            .args(&["clone", &url, &path])
            .output()
            .map_err(|e| format!("Failed to execute command: {}", e))?;

        if output.status.success() {
            Ok(())
        } else {
            let error_message = String::from_utf8_lossy(&output.stderr);
            Err(format!("Failed to clone repository: {}", error_message))
        }
    } else {
        Err("Git is not installed".to_string())
    }
}