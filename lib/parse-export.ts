import AdmZip from "adm-zip";
import type { IZipEntry } from "adm-zip";
import { normalizeUsername } from "./compare";
import type { ParsedInstagramExport } from "./types";

const CONNECTIONS_PATH = "connections/followers_and_following/";

type StringListItem = {
  href?: unknown;
  value?: unknown;
  timestamp?: unknown;
};

type RelationshipItem = {
  title?: unknown;
  string_list_data?: unknown;
};

type FollowingExport = {
  relationships_following?: unknown;
};

export class InstagramExportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramExportParseError";
  }
}

export function parseInstagramExport(buffer: Buffer): ParsedInstagramExport {
  let zip: AdmZip;

  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new InstagramExportParseError("Upload a valid Instagram zip export.");
  }

  const entries = zip.getEntries();
  const followingEntry = entries.find(
    (entry) => normalizedEntryName(entry) === `${CONNECTIONS_PATH}following.json`,
  );
  const followerEntries = entries.filter((entry) =>
    /^connections\/followers_and_following\/followers_\d+\.json$/.test(
      normalizedEntryName(entry),
    ),
  );

  if (!followingEntry) {
    throw new InstagramExportParseError(
      "Could not find connections/followers_and_following/following.json in this export.",
    );
  }

  if (followerEntries.length === 0) {
    throw new InstagramExportParseError(
      "Could not find followers_*.json files in this export.",
    );
  }

  const following = parseFollowing(followingEntry);
  const followers = followerEntries.flatMap(parseFollowers);

  return {
    following: uniqueUsernames(following),
    followers: uniqueUsernames(followers),
  };
}

function parseFollowing(entry: IZipEntry): string[] {
  const json = readJson<FollowingExport>(entry);

  if (!Array.isArray(json.relationships_following)) {
    throw new InstagramExportParseError("following.json has an unexpected format.");
  }

  return json.relationships_following
    .filter(isRelationshipItem)
    .map((relationship) => usernameFromFollowingRelationship(relationship))
    .filter(Boolean);
}

function parseFollowers(entry: IZipEntry): string[] {
  const json = readJson<unknown>(entry);

  if (!Array.isArray(json)) {
    throw new InstagramExportParseError(
      `${normalizedEntryName(entry)} has an unexpected format.`,
    );
  }

  return json
    .filter(isRelationshipItem)
    .map((relationship) => usernameFromStringListData(relationship.string_list_data))
    .filter(Boolean);
}

function readJson<T>(entry: IZipEntry): T {
  try {
    return JSON.parse(entry.getData().toString("utf8")) as T;
  } catch {
    throw new InstagramExportParseError(
      `${normalizedEntryName(entry)} contains invalid JSON.`,
    );
  }
}

function usernameFromFollowingRelationship(relationship: RelationshipItem): string {
  if (typeof relationship.title === "string" && relationship.title.trim()) {
    return relationship.title;
  }

  return usernameFromStringListData(relationship.string_list_data);
}

function usernameFromStringListData(data: unknown): string {
  if (!Array.isArray(data)) {
    return "";
  }

  for (const item of data) {
    if (!isStringListItem(item)) {
      continue;
    }

    if (typeof item.value === "string" && item.value.trim()) {
      return item.value;
    }

    if (typeof item.href === "string" && item.href.trim()) {
      return usernameFromHref(item.href);
    }
  }

  return "";
}

function usernameFromHref(href: string): string {
  try {
    const url = new URL(href);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? "";
  } catch {
    return "";
  }
}

function normalizedEntryName(entry: IZipEntry): string {
  return entry.entryName.replace(/\\/g, "/");
}

function uniqueUsernames(usernames: string[]): string[] {
  return Array.from(
    new Set(usernames.map(normalizeUsername).filter(Boolean)),
  );
}

function isRelationshipItem(value: unknown): value is RelationshipItem {
  return typeof value === "object" && value !== null;
}

function isStringListItem(value: unknown): value is StringListItem {
  return typeof value === "object" && value !== null;
}
