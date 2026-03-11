/**
 * Parse app version and last updated from docs/mvt.md (Module Version Tracker).
 * Used by the admin dashboard to show version info on one line.
 * Reads the file at request time; overhead is one small file read per dashboard load.
 */

import { readFile } from "fs/promises";
import { join } from "path";

export interface MvtVersionInfo {
  /** From **Last updated:** line (e.g. "2026-02-11") */
  lastUpdated: string | null;
  /** From **App Version:** line (e.g. "1.0 Stable") */
  appVersion: string | null;
}

const LAST_UPDATED_REGEX = /\*\*Last updated:\*\*\s*([^\n]+)/;
const APP_VERSION_REGEX = /\*\*App Version:\*\*\s*([^\n]+)/;

/**
 * Read docs/mvt.md and parse the two version fields.
 * Returns nulls if the file is missing or parsing fails (safe for dashboard).
 */
export async function getMvtVersionInfo(): Promise<MvtVersionInfo> {
  try {
    const pathToMvt = join(process.cwd(), "docs", "mvt.md");
    const content = await readFile(pathToMvt, "utf-8");
    const head = content.slice(0, 800);

    const lastUpdatedMatch = head.match(LAST_UPDATED_REGEX);
    const appVersionMatch = head.match(APP_VERSION_REGEX);

    return {
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : null,
      appVersion: appVersionMatch ? appVersionMatch[1].trim() : null,
    };
  } catch {
    return { lastUpdated: null, appVersion: null };
  }
}
