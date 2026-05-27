import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import vdf from "vdf-parser";
import os from "node:os";
import { select, isCancel, cancel, intro, outro } from "@clack/prompts";

const STEAM_PATH = `${os.homedir()}/.steam/steam`;

type ProtonConfig = {appId: string, mode: string, tool?: string}

type Game = {
    appId: String
    name: String
    protonConfig: ProtonConfig
}

async function getInstalledGames(): Promise<Game[]> {
    const libPath = `${STEAM_PATH}/steamapps/libraryfolders.vdf`;
    const content = await readFile(libPath, "utf-8");
    const data = vdf.parse(content);

    const libraries = Object.values(data.libraryfolders);

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

// Um zu prüfen, ob es Nativ oder Proton ist:
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

async function main() {
    intro("NexusSteamMan")

    const games = await getInstalledGames()

    const selected = await select({
        message: "Für welches Spiel sollen Nexus Mods installiert werden?",
        options: games.map(g => ({
            value: g,
            label: g.name as string,
            hint: g.appId as string,
        })),
    })

    if (isCancel(selected)) {
        cancel("Vorgang abgebrochen")
        process.exit(0)
    }

    outro(`Ausgewählt: ${selected.name} (${selected.appId})`)
}

await main()