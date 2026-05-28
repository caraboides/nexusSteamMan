import os from "node:os";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import vdf from "vdf-parser";
import path from "node:path";
import type { Game, ProtonConfig } from "./model";
import { writeFileSync } from 'fs';
import { parseBuffer, parseFile, writeBuffer, writeFile } from 'steam-shortcut-editor';
const STEAM_PATH = `${os.homedir()}/.steam/steam`;

export function isSteamInstalled(): boolean {
    return existsSync(STEAM_PATH);
}

export function isSteamRunning(): boolean {
    const pidPath = path.join(STEAM_PATH, "../", "steam.pid");
    if (!existsSync(pidPath)) {
        return false;
    }
    const content = readFileSync(pidPath, "utf-8");;
    const pid = parseInt(content.trim(), 10);
    try {
        // Try to send signal 0 to the process to check if it's running
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}

export async function getInstalledGames(accountId: string): Promise<Game[]> {
    const libPath = `${STEAM_PATH}/steamapps/libraryfolders.vdf`;
    const content = await readFile(libPath, "utf-8");
    const data = vdf.parse(content);

    const libraries = Object.values((data as any).libraryfolders);

    const installDirs: string[] = libraries.map((lib: any) => lib.path);

    const installedAppIds = libraries.flatMap((lib: any) =>
        Object.keys(lib.apps || {})
    );

    return Promise.all(installedAppIds.map(async id => {
        const p = await checkProton(id)
        const name = await getGameName(id, installDirs)
        return {
            appId: id,
            accountId,
            name,
            protonConfig: p
        }
    }));
}

export async function getAccountId(): Promise<string | undefined> {
    const loginusersPath = `${STEAM_PATH}/config/loginusers.vdf`;
    const fileContent = await readFile(loginusersPath, 'utf-8');
    const data = vdf.parse(fileContent) as any;

    // Die oberste Ebene ist "users"
    const users = data.users;
    // Nimm den User, der zuletzt eingeloggt war ("MostRecent" : 1)
    const steamId64 = Object.keys(users).find(id => users[id].MostRecent === 1);

    if (steamId64) {
        // Umrechnung von SteamID64 zu AccountID
        // Formel: AccountID = SteamID64 - 76561197960265728
        const accountId = BigInt(steamId64) - 76561197960265728n;
        return accountId.toString();
    }
    return undefined;
}

async function checkProton(appId: string): Promise<ProtonConfig> {
    const configPath = `${STEAM_PATH}/config/config.vdf`;
    const content = await readFile(configPath, "utf-8");
    const data: any = vdf.parse(content);
    const mapping = data.InstallConfigStore.Software.Valve.Steam.CompatToolMapping;
    if (mapping && mapping[appId]) {
        return { appId, mode: "Proton", tool: mapping[appId].name };
    }
    return { appId, mode: "Native/Default" };
}

async function getGameName(appId: string, installDirs: string[]): Promise<string> {
    for (const dir of installDirs) {
        const manifestPath = path.join(dir, "steamapps", `appmanifest_${appId}.acf`);
        if (existsSync(manifestPath)) {
            const content = await readFile(manifestPath, "utf-8");
            const data: any = vdf.parse(content);
            return data.AppState?.name || appId;
        }
    }
    return appId;
}

export async function addNexusSupport(game: Game): Promise<void> {
    const shortcutPath = `${STEAM_PATH}/userdata/${game.accountId}/config/shortcuts.vdf`;
    const nexusEntry = {
        appname: "Nexus Mod Manager for " + game.name,
        exe: "\"/path/to/vortex.exe\"",
        StartDir: "\"/path/to/dir/\"",
        icon: "",
        LaunchOptions: "",
        IsHidden: 0,
        AllowDesktopConfig: 1,
        AllowOverlay: 1,
        OpenVR: 0,
        Devkit: 0,
        DevkitGameID: "",
        LastPlayTime: 0,
        tags: ["Tools"]
    }
    // Laden, Hinzufügen und Speichern (Binary VDF)
    const buffer = readFileSync(shortcutPath);
    let shortcuts = parseBuffer(buffer);
    shortcuts.push(nexusEntry);
    writeFileSync(shortcutPath, writeBuffer(shortcuts));
}