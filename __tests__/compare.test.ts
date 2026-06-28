import { buildAnalyzeResult, findNonFollowersBack } from "../lib/compare";

describe("findNonFollowersBack", () => {
  it("returns following usernames missing from followers", () => {
    expect(
      findNonFollowersBack(
        ["alice_dev", "bob.codes", "eve_snaps", "frank.photos"],
        ["alice_dev", "bob.codes"],
      ),
    ).toEqual([
      {
        username: "eve_snaps",
        profileUrl: "https://www.instagram.com/eve_snaps/",
      },
      {
        username: "frank.photos",
        profileUrl: "https://www.instagram.com/frank.photos/",
      },
    ]);
  });

  it("normalizes usernames before comparing", () => {
    expect(findNonFollowersBack([" Alice_Dev ", "EVE_SNAPS"], ["alice_dev"]))
      .toEqual([
        {
          username: "eve_snaps",
          profileUrl: "https://www.instagram.com/eve_snaps/",
        },
      ]);
  });
});

describe("buildAnalyzeResult", () => {
  it("includes counts and sorted profile links", () => {
    expect(
      buildAnalyzeResult(["frank.photos", "alice_dev", "eve_snaps"], ["alice_dev"]),
    ).toEqual({
      stats: {
        following: 3,
        followers: 1,
        nonFollowersBack: 2,
      },
      nonFollowersBack: [
        {
          username: "eve_snaps",
          profileUrl: "https://www.instagram.com/eve_snaps/",
        },
        {
          username: "frank.photos",
          profileUrl: "https://www.instagram.com/frank.photos/",
        },
      ],
    });
  });
});
