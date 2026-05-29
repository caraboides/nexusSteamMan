import os from "node:os";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import vdf from "vdf-parser";
import path from "node:path";
import type { Game, ProtonConfig } from "./model";
import { parseBuffer, parseFile, writeBuffer, writeFile } from 'steam-shortcut-editor';
import { intro, outro, spinner, cancel } from '@clack/prompts';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import SevenZip from "7z-wasm";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";

const STEAM_PATH = `${os.homedir()}/.steam/steam`;
const NEXUS_DOWNLOAD_URL = "https://github.com/Nexus-Mods/Nexus-Mod-Manager/releases/download/0.88.4/NMM_0.88.4_Archive.7z";

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

async function downloadFile(url: string, fileName: string): Promise<string> {
    intro(`Download-Manager gestartet`);

    const s = spinner();
    const filePath = join(tmpdir(), fileName);

    try {
        const response = await fetch(url);

        if (!response.ok) throw new Error(`Server antwortete mit ${response.status}`);

        const totalSize = parseInt(response.headers.get('content-length') || '0');
        const reader = response.body?.getReader();
        const writer = createWriteStream(filePath);

        if (!reader) throw new Error('Konnte Stream nicht lesen');

        s.start('Initialisiere Download...');

        let receivedLength = 0;

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            receivedLength += value.length;
            writer.write(value);

            // Fortschritt berechnen und Spinner-Text aktualisieren
            if (totalSize) {
                const step = Math.round((receivedLength / totalSize) * 20);
                const percentage = ((receivedLength / totalSize) * 100).toFixed(0);

                // Progress Bar String bauen: [##########----------] 50%
                const bar = '█'.repeat(step) + '░'.repeat(20 - step);
                s.message(`Lade herunter: [${bar}] ${percentage}%`);
            } else {
                s.message(`Lade herunter: ${(receivedLength / 1024 / 1024).toFixed(2)} MB empfangen...`);
            }
        }

        writer.end();
        s.stop('Download abgeschlossen!');
        outro(`Datei gespeichert unter: ${filePath}`);
        return filePath;
    } catch (err: any) {
        s.stop('Fehler beim Download');
        cancel(err.message);
        process.exit(1);
    }
}


async function extractAndCapture(archivePath: string, outputDir: string) {
    const hostAbsoluteArchive = resolve(archivePath);
    const hostAbsoluteOut = resolve(outputDir);
    const hostArchiveDir = dirname(hostAbsoluteArchive);
    const archiveFilename = basename(hostAbsoluteArchive);

    await mkdir(hostAbsoluteOut, { recursive: true });
    const s = spinner();
    s.start('Extracting archive...');
    // 1. Variablen für die Ausgabe vorbereiten
    let stdoutData = "";
    let stderrData = "";

    // 2. Das WASM-Modul mit Custom-Ausgabekanälen initialisieren
    const sevenZip = await SevenZip({
        // Abfangen von stdout
        print: (text: string) => {
            stdoutData += text + "\n";
        },
        // Abfangen von stderr (Fehlermeldungen)
        printErr: (text: string) => {
            stderrData += text + "\n";
        }
    });

    // 3. Virtuelle Ordner mounten (wie vorher)
    const vArchiveDir = "/mnt_archive";
    const vOutDir = "/mnt_out";
    sevenZip.FS.mkdir(vArchiveDir);
    sevenZip.FS.mkdir(vOutDir);
    sevenZip.FS.mount(sevenZip.NODEFS, { root: hostArchiveDir }, vArchiveDir);
    sevenZip.FS.mount(sevenZip.NODEFS, { root: hostAbsoluteOut }, vOutDir);

    const wasmArchivePath = `${vArchiveDir}/${archiveFilename}`;

    // 4. Den Befehl ausführen (schreibt jetzt lautlos in unsere Variablen)
    sevenZip.callMain(["x", wasmArchivePath, `-o${vOutDir}`, "-y"]);

    // Wenn stderrData nicht leer ist, gab es kritische Fehler auf C-Ebene
    if (stderrData) {
        console.error("Kritische Fehler beim Entpacken:", stderrData);
    }
    s.stop('Extraction completed!');
    return stdoutData;
}

export async function addNexusSupport(game: Game): Promise<void> {
    const shortcutPath = `${STEAM_PATH}/userdata/${game.accountId}/config/shortcuts.vdf`;
    const nexusEntry = {
        appname: "Nexus Mod Manager for " + game.name,
        exe: "\"/path/to/vortex.exe\"",
        StartDir: "\"/path/to/dir/\"",
        icon: "",
        LaunchOptions: "LaunchOptions here",
        IsHidden: 0,
        AllowDesktopConfig: 1,
        AllowOverlay: 1,
        OpenVR: 0,
        Devkit: 0,
        DevkitGameID: "",
        LastPlayTime: 0,
        tags: ["Tools", "Nexus Mods"]
    }
    const buffer = readFileSync(shortcutPath);
    let shortcuts = parseBuffer(buffer);
    console.log("Current shortcuts:", shortcuts);
    shortcuts.shortcuts.push(nexusEntry);
    //writeFileSync(shortcutPath, writeBuffer(shortcuts));

    // Download Nexus
    const nexusArchivePath = await downloadFile(NEXUS_DOWNLOAD_URL, "nexus_mod_manager.7z");
    console.log("Nexus archive downloaded to:", nexusArchivePath);

    // Extract Nexus to game directory to ${STEAM_PATH}/steamapps/compatdata/${game.appId}/pfx/drive_c/Program Files/Nexus
    await extractAndCapture(nexusArchivePath, `${STEAM_PATH}/steamapps/compatdata/${game.appId}/pfx/drive_c/Program Files/Nexus`);


    // Create CompLayer symbolic link, for nexus entry to game compdata

}