import os from "node:os";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import vdf from "vdf-parser";
import type { Game, ProtonConfig } from "./model";
const STEAM_PATH = `${os.homedir()}/.steam/steam`;

export function isSteamInstalled(): boolean {
    return existsSync(STEAM_PATH);
}

export  function isSteamRunning(): boolean {
    const pidPath = path.join(STEAM_PATH, "steam.pid");
    return existsSync(pidPath);
}

export async function getInstalledGames(): Promise<Game[]> {
    const libPath = `${STEAM_PATH}/steamapps/libraryfolders.vdf`;
    const content = await readFile(libPath, "utf-8");
    const data = vdf.parse(content);

    const libraries = Object.values((data as any).libraryfolders);

    const installDirs: string[] = libraries.map((lib: any) => lib.path);

    const installedAppIds = libraries.flatMap((lib: any) => 
        Object.keys(lib.apps || {})
    );

    return Promise.all(installedAppIds.map( async id => {
        const p = await checkProton(id)
        const name = await getGameName(id, installDirs)
        return {
            appId: id,
            name,
            protonConfig: p
        }
    }));
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