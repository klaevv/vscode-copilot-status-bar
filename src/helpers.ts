import * as vscode from "vscode";
import { CachedConfiguration, DisplayMode } from "./types";

export class Helpers {
    // Private constructor to prevent instantiation of this utility class.
    private constructor() { }
    /**
     * Rounds a number to the specified number of decimal places.
     * Defaults to 3 decimal places if not specified.
     */
    public static roundTo(value: number, decimalPlaces: number = 3): number {
        const factor = Math.pow(10, decimalPlaces);

        //prevent division by zero when decimalPlaces is 0
        if (factor === 0)
            return Math.round(value);

        return Math.round(value * factor) / factor;
    }

    public static tryParseNumber(input: any): { success: true; value: number; valueIsFinite: boolean } | { success: false, value: null; valueIsFinite: boolean } {
        const value = Number(input);

        if (input?.toString()?.trim() === "" || !Number.isFinite(value)) {
            return { success: false, value: null, valueIsFinite: false };
        }

        return { success: true, value: value, valueIsFinite: Number.isFinite(value) };
    }
}


/**
 * Helper class for managing the extension configuration.
 * Provides methods to load and cache the extension configuration, and to react to configuration changes.
 */
export class ConfigurationHelper {
    private constructor(context: vscode.ExtensionContext) {
        this._cachedConfig = this.loadConfiguration();

        // Listen for configuration changes and update the cached configuration accordingly.
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(event => {
                if (event.affectsConfiguration('copilotStatusBar.DisplayMode')) {
                    this._cachedConfig = this.loadConfiguration();
                }
            })
        );
    }

    private static instance: ConfigurationHelper | null = null;

    private _cachedConfig: CachedConfiguration;

    public static get CurrentConfig(): CachedConfiguration {
        return this.instance!._cachedConfig;
    }

    public static init(context: vscode.ExtensionContext): void {
        this.instance = new ConfigurationHelper(context);
    }


    private loadConfiguration(): CachedConfiguration {
        const config = vscode.workspace.getConfiguration('copilotStatusBar');

        const rawDisplayMode = config.get<string>('DisplayMode', 'Used');

        // Validate and normalize the configuration once.
        const displayMode: DisplayMode = rawDisplayMode === 'Remaining' ? 'Remaining' : 'Used';

        return {
            displayMode,
            showRemaining: displayMode === 'Remaining'
        };
    }
}