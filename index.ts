import { readFile } from "node:fs/promises";
import vdf from "vdf-parser";
import os from "node:os";

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

    
    console.dir(data)

    // libraryfolders.vdf hat eine Struktur, die wir flachklopfen müssen
    const libraries = Object.values(data.libraryfolders);
    
    console.dir(libraries)

    const installedAppIds = libraries.flatMap((lib: any) => 
        Object.keys(lib.apps || {})
    );

    return Promise.all(installedAppIds.map( async id => {
        const p = await checkProton(id)
        return {
            appId: id,
            name: "test",
            protonConfig:  p
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

const games = await getInstalledGames()

console.log(games)