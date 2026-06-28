import type { AnalyzeResult, NonFollowerBack } from "./types";

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function profileUrlFor(username: string): string {
  return `https://www.instagram.com/${username}/`;
}

export function findNonFollowersBack(
  following: string[],
  followers: string[],
): NonFollowerBack[] {
  const followerSet = new Set(followers.map(normalizeUsername).filter(Boolean));

  return Array.from(new Set(following.map(normalizeUsername).filter(Boolean)))
    .filter((username) => !followerSet.has(username))
    .sort((a, b) => a.localeCompare(b))
    .map((username) => ({
      username,
      profileUrl: profileUrlFor(username),
    }));
}

export function buildAnalyzeResult(
  following: string[],
  followers: string[],
): AnalyzeResult {
  const nonFollowersBack = findNonFollowersBack(following, followers);

  return {
    stats: {
      following: following.length,
      followers: followers.length,
      nonFollowersBack: nonFollowersBack.length,
    },
    nonFollowersBack,
  };
}
