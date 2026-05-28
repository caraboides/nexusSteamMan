import { select, confirm, isCancel, cancel, intro, outro } from "@clack/prompts";
import { getInstalledGames, getAccountId, isSteamInstalled, isSteamRunning } from "./steam-helper";
import { info } from "console";

async function main() {
    intro("Add Nexus Mods to your Steam proton games")
    if (!isSteamInstalled()) {
        outro("Steam is not installed. Please install Steam and try again.")
        process.exit(0)
    }

    if (isSteamRunning()) {
        outro("Steam is running. Please close Steam and try again.")
        process.exit(0)
    }

    const accountId = await getAccountId();

    if (!accountId) {
        outro("No Steam user found. Please log in to Steam and try again.")
        process.exit(0)
    }

    info("Scanning for installed games... for user " + accountId)
    const games = (await getInstalledGames()).filter(g => g.protonConfig.mode === "Proton");
    if (games.length === 0) {
        outro("No proton games found. Please install at least one game with proton and try again.")
        process.exit(0)
    }

    const selected = await select({
        message: "For which game do you want to add Nexus Mods support?",
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

    const shouldProceed = await confirm({
        message: 'Do you want to add Nexus Mods support to this game?',
    });

    if (isCancel(shouldProceed) || !shouldProceed) {
        console.log('Operation cancelled');
        process.exit(0);
    } else {
        console.log('Proceeding...');
    }

    outro(`Ausgewählt: ${selected.name} (${selected.appId})`)
}

await main()