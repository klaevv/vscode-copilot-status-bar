# Copilot Status Bar

A minimal VS Code extension that shows your GitHub Copilot premium request
quota in the status bar.

## Features

- Shows premium/chat request quota used and time until reset.
- Click the status bar item for a quick-pick summary.
- Warns (yellow) at 75% used and errors (red) at 90% used.
- Uses your existing GitHub sign-in — no separate login required if you're
  already signed in to Copilot in VS Code.

## How it works — please read

GitHub Copilot does not write any local usage/quota log file (unlike some
other AI CLI tools). To show real quota numbers, this extension:

1. Silently reuses your existing GitHub authentication session
   (`vscode.authentication`, scope `user:email`) — the same minimal scope
   Copilot itself uses. No new sign-in prompt appears unless you explicitly
   run **Copilot Status Bar: Sign In to GitHub**.
2. Exchanges that session for a short-lived Copilot token via
   `https://api.github.com/copilot_internal/v2/token`.
3. Fetches quota data from `https://api.github.com/copilot_internal/user`.

**These are undocumented, internal GitHub endpoints** — the same ones the
official GitHub Copilot Chat extension uses internally, but they are not a
published/stable public API. They can change or stop working at any time
without notice. This extension does not request any scopes beyond the
minimum needed, does not persist tokens to disk, and does not send data
anywhere except `api.github.com`. No telemetry.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `copilotStatusBar.refreshIntervalSeconds` | `300` | How often to re-fetch Copilot quota from GitHub. |

## Commands

| Command | Description |
| --- | --- |
| **Copilot Status Bar: Refresh** | Re-fetch and update the status bar. |
| **Copilot Status Bar: Show Usage** | Show the usage summary quick-pick. |
| **Copilot Status Bar: Sign In to GitHub** | Prompt a GitHub sign-in if needed. |

## Development

```sh
npm install
npm run compile
```

Press `F5` to launch an Extension Development Host.

## Limitations

- Relies on an undocumented GitHub API; may break without notice.
- Requires a GitHub account signed in with Copilot access.
- Only shows the premium/chat request quota window (not completions quota).
