import { describe, expect, it } from "bun:test";

import { generateSteamShortcutAppId } from './steam-helper';

describe('generateSteamShortcutAppId', () => {

    it('appId32 should be correctly calculated', () => {
        const result = generateSteamShortcutAppId(
            "/home/christian/.local/share/Steam/steamapps/compatdata/3394774397/pfx/drive_c/Program Files (x86)/Battle.net/Battle.net.exe",
            'Battle.net.exe',
        );
        expect(result.signed).toBe(-1768134405);
    });

});
