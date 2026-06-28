import { promises as fs } from "fs";
import path from "path";
import AdmZip from "adm-zip";
import {
  InstagramExportParseError,
  parseInstagramExport,
} from "../lib/parse-export";

describe("parseInstagramExport", () => {
  it("extracts followers and following from an Instagram export zip", async () => {
    const zip = new AdmZip();
    zip.addFile(
      "connections/followers_and_following/following.json",
      await readFixture("following.json"),
    );
    zip.addFile(
      "connections/followers_and_following/followers_1.json",
      await readFixture("followers_1.json"),
    );

    expect(parseInstagramExport(zip.toBuffer())).toEqual({
      following: [
        "alice_dev",
        "bob.codes",
        "carol_builds",
        "dave.design",
        "eve_snaps",
        "frank.photos",
      ],
      followers: ["alice_dev", "bob.codes", "carol_builds", "dave.design"],
    });
  });

  it("reports a useful error when required files are missing", () => {
    const zip = new AdmZip();
    zip.addFile("not-instagram.json", Buffer.from("{}"));

    expect(() => parseInstagramExport(zip.toBuffer())).toThrow(
      InstagramExportParseError,
    );
  });
});

function readFixture(fileName: string): Promise<Buffer> {
  return fs.readFile(path.join(process.cwd(), "fixtures", fileName));
}
