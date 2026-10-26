use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct CalendarEvent {
    pub title: String,
    pub start: String,
    pub end: String,
    pub calendar: String,
}

#[tauri::command]
pub fn get_calendar_events() -> Result<Vec<CalendarEvent>, String> {
    let script = r#"
        set output to ""
        set startDate to current date
        set endDate to startDate + (7 * days)

        tell application "Calendar"
            repeat with c in calendars
                set evts to (every event of c whose start date >= startDate and start date <= endDate)
                repeat with e in evts
                    set evtTitle to summary of e
                    set evtStart to start date of e
                    set evtEnd to end date of e
                    set calName to name of c
                    set output to output & evtTitle & "|||" & (evtStart as string) & "|||" & (evtEnd as string) & "|||" & calName & (ASCII character 10)
                end repeat
            end repeat
        end tell
        return output
    "#;

    let result = std::process::Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| e.to_string())?;

    if !result.status.success() {
        let err = String::from_utf8_lossy(&result.stderr).to_string();
        return Err(err);
    }

    let raw = String::from_utf8_lossy(&result.stdout).to_string();
    let events: Vec<CalendarEvent> = raw
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.split("|||").collect();
            if parts.len() == 4 {
                Some(CalendarEvent {
                    title: parts[0].to_string(),
                    start: parts[1].to_string(),
                    end: parts[2].to_string(),
                    calendar: parts[3].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(events)
}
