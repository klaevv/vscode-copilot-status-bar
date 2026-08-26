# Copilot Status Bar

A focused VS Code extension that keeps your GitHub Copilot premium-request
quota and reset countdown visible in the status bar.

## Features

- See the percentage of premium requests used and the time until reset.
- Click the status bar item for plan, quota, reset, and last-updated details.
- Get a yellow warning at 75% used and a red warning at 90% used.
- Keep the countdown current without making extra network requests.
- Reuse your existing VS Code GitHub sign-in, with an explicit sign-in command
  available when needed.

## Getting started

1. Install **Copilot Status Bar** from the VS Code Marketplace.
2. Make sure the GitHub account with your Copilot subscription is signed in to
   VS Code.
3. The quota appears in the left side of the status bar after startup.

If the status bar says **Sign in**, click it or run **Copilot Status Bar: Sign
In to GitHub** from the Command Palette.

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
| `copilotStatusBar.countdownUpdateIntervalSeconds` | `60` | How often to update the local reset countdown without making a network request. |

## Commands

| Command | Description |
| --- | --- |
| **Copilot Status Bar: Refresh** | Re-fetch and update the status bar. |
| **Copilot Status Bar: Show Usage** | Show the usage summary quick-pick. |
| **Copilot Status Bar: Sign In to GitHub** | Prompt a GitHub sign-in if needed. |
| **Copilot Status Bar: Show Log** | Open diagnostic output for the latest refresh failures. |
| **Copilot Status Bar: Set Refresh Interval** | Choose how often quota data is fetched. |

## Privacy and security

- Authentication is handled by VS Code's built-in GitHub authentication
  provider with the `user:email` scope.
- Access tokens are held in memory only and are never written to disk.
- Requests are sent only to `https://api.github.com`.
- The extension collects no analytics or telemetry.

## Troubleshooting

- **Sign in is shown:** run **Copilot Status Bar: Sign In to GitHub** and choose
  the GitHub account that has Copilot access.
- **Copilot — is shown:** run **Copilot Status Bar: Show Log** for the response
  status, then try **Copilot Status Bar: Refresh**.
- **Values are marked stale:** the last successful value is being kept visible
  because a refresh failed. Check the log and your network connection.

For bugs and support requests, use the [GitHub issue tracker](https://github.com/klaevv/vscode-copilot-status-bar/issues).

## Development

```sh
npm ci
npm run check
```

Press `F5` to launch an Extension Development Host.

To create an installable Marketplace package:

```sh
npm run package
```

## Limitations

- Relies on an undocumented GitHub API; may break without notice.
- Requires a GitHub account signed in with Copilot access.
- Only shows the premium/chat request quota window (not completions quota).
