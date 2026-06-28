import { promises as fs } from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import type { File, Files } from "formidable";
import { buildAnalyzeResult } from "../../lib/compare";
import {
  InstagramExportParseError,
  parseInstagramExport,
} from "../../lib/parse-export";
import type { AnalyzeResult } from "../../lib/types";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type ErrorResponse = {
  error: string;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeResult | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const uploadedFile = await parseUpload(req);
    const buffer = await fs.readFile(uploadedFile.filepath);
    const parsedExport = parseInstagramExport(buffer);
    const result = buildAnalyzeResult(
      parsedExport.following,
      parsedExport.followers,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (isPayloadTooLarge(error)) {
      return res.status(413).json({ error: "Zip file must be 10MB or smaller." });
    }

    if (error instanceof InstagramExportParseError) {
      return res.status(400).json({ error: error.message });
    }

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: "Unexpected upload error." });
  }
}

async function parseUpload(req: NextApiRequest): Promise<File> {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE_BYTES,
    multiples: false,
    keepExtensions: true,
  });

  const [, files] = await form.parse(req);
  const file = pickUploadedFile(files);

  if (!file) {
    throw new Error("Upload an Instagram zip export.");
  }

  if (!file.originalFilename?.toLowerCase().endsWith(".zip")) {
    throw new Error("Upload a .zip file from Instagram.");
  }

  return file;
}

function pickUploadedFile(files: Files<string>): File | null {
  const byExpectedName = files.export;
  const fallback = Object.values(files)[0];
  const file = byExpectedName ?? fallback;

  if (Array.isArray(file)) {
    return file[0] ?? null;
  }

  return file ?? null;
}

function isPayloadTooLarge(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "httpCode" in error &&
    error.httpCode === 413
  );
}
