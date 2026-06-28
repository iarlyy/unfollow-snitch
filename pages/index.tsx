import Head from "next/head";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AnalyzeResult } from "../lib/types";

type UploadState = "idle" | "uploading" | "success" | "error";

const INSTAGRAM_STEPS = [
  "Open Instagram → Settings → Accounts Center",
  "Go to \"Your information and permissions\"",
  "Tap \"Download your information\"",
  "Choose JSON format, select \"Followers and following\" only",
  "Download the zip and come back here",
];

export default function Home() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [query, setQuery] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const filteredResults = useMemo(() => {
    if (!result) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return result.nonFollowersBack;
    }

    return result.nonFollowersBack.filter(({ username }) =>
      username.includes(normalizedQuery),
    );
  }, [query, result]);

  const followBackRate = result
    ? Math.round(
        ((result.stats.following - result.stats.nonFollowersBack) /
          Math.max(result.stats.following, 1)) *
          100,
      )
    : 0;

  useEffect(() => {
    if (status === "success" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  async function analyzeFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus("error");
      setError("Please upload a .zip file from your Instagram data export.");
      return;
    }

    setStatus("uploading");
    setError("");
    setResult(null);
    setCopied(false);
    setSelectedFileName(file.name);

    const formData = new FormData();
    formData.append("export", file);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as AnalyzeResult | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Upload failed.");
      }

      setResult(data as AnalyzeResult);
      setStatus("success");
    } catch (uploadError) {
      setStatus("error");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong while analyzing the zip.",
      );
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void analyzeFile(file);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];

    if (file) {
      void analyzeFile(file);
    }
  }

  function resetUpload() {
    setStatus("idle");
    setError("");
    setResult(null);
    setQuery("");
    setSelectedFileName("");
    setCopied(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function copyAll() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(
      result.nonFollowersBack.map(({ username }) => username).join("\n"),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const isUploading = status === "uploading";

  return (
    <>
      <Head>
        <title>Unfollow Snitch</title>
        <meta
          name="description"
          content="Find Instagram accounts you follow that do not follow you back."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-sm font-black text-white shadow-lg shadow-rose-500/25">
                US
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Unfollow Snitch</p>
                <p className="text-xs text-zinc-500">Private · No login · No storage</p>
              </div>
            </div>
            {result ? (
              <button
                type="button"
                onClick={resetUpload}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >
                New upload
              </button>
            ) : null}
          </header>

          {/* Upload flow — shown until results arrive */}
          {!result ? (
            <div className="animate-fade-up flex flex-col gap-6">
              <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Who isn&apos;t following you back?
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
                  Upload your Instagram data export. We compare your following
                  list against your followers and show the difference.
                </p>
              </div>

              {/* Upload card */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${
                  isUploading
                    ? "border-zinc-700 bg-zinc-900/80"
                    : isDragging
                      ? "border-rose-400 bg-rose-500/5 scale-[1.01]"
                      : error
                        ? "border-red-500/40 bg-red-500/5"
                        : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                }`}
              >
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  {isUploading ? (
                    <>
                      <div className="relative mb-5 flex size-16 items-center justify-center">
                        <div className="absolute inset-0 animate-pulse-ring rounded-full bg-rose-500/20" />
                        <svg
                          className="animate-spin-slow size-8 text-rose-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="opacity-90"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      </div>
                      <p className="text-base font-semibold text-white">
                        Analyzing your export
                      </p>
                      <p className="mt-1 max-w-xs truncate text-sm text-zinc-400">
                        {selectedFileName}
                      </p>
                      <p className="mt-4 text-xs text-zinc-500">
                        Reading followers &amp; following files…
                      </p>
                    </>
                  ) : (
                    <>
                      <div
                        className={`mb-5 flex size-16 items-center justify-center rounded-2xl transition-colors ${
                          isDragging
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        <UploadIcon />
                      </div>

                      <p className="text-lg font-semibold text-white">
                        {isDragging ? "Drop it here" : "Upload your export"}
                      </p>
                      <p className="mt-1.5 text-sm text-zinc-500">
                        Drag &amp; drop your .zip file, or click below
                      </p>

                      <input
                        ref={inputRef}
                        className="sr-only"
                        type="file"
                        name="export"
                        accept=".zip,application/zip"
                        onChange={handleFileChange}
                      />

                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-white/10 transition hover:bg-zinc-100 active:scale-[0.98]"
                      >
                        Choose .zip file
                      </button>

                      <p className="mt-4 text-xs text-zinc-600">
                        Instagram data export · .zip only
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Error */}
              {error ? (
                <div className="animate-fade-up flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <ErrorIcon />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-red-200">
                      Couldn&apos;t analyze that file
                    </p>
                    <p className="mt-0.5 text-sm text-red-300/80">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setStatus("idle");
                      inputRef.current?.click();
                    }}
                    className="shrink-0 text-xs font-medium text-red-300 underline-offset-2 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              {/* How-to accordion */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
                <button
                  type="button"
                  onClick={() => setHelpOpen((open) => !open)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  aria-expanded={helpOpen}
                >
                  <span className="text-sm font-medium text-zinc-300">
                    Don&apos;t have your export yet?
                  </span>
                  <ChevronIcon open={helpOpen} />
                </button>

                {helpOpen ? (
                  <div className="border-t border-zinc-800 px-5 pb-5 pt-4">
                    <ol className="space-y-3">
                      {INSTAGRAM_STEPS.map((step, index) => (
                        <li key={step} className="flex gap-3 text-sm">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                            {index + 1}
                          </span>
                          <span className="pt-0.5 leading-6 text-zinc-400">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-xs leading-5 text-zinc-600">
                      Export can take a few minutes on Instagram&apos;s side.
                      You only need the followers &amp; following data — nothing
                      else.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Results */}
          {result ? (
            <section ref={resultsRef} className="animate-fade-up flex flex-col gap-6">
              {/* Summary banner */}
              <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Analysis complete
                    </p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {result.stats.nonFollowersBack === 0 ? (
                        "Everyone follows you back!"
                      ) : (
                        <>
                          <span className="text-rose-400">
                            {result.stats.nonFollowersBack.toLocaleString()}
                          </span>{" "}
                          {result.stats.nonFollowersBack === 1
                            ? "account"
                            : "accounts"}{" "}
                          don&apos;t follow back
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {followBackRate}% of people you follow follow you back
                    </p>
                  </div>
                  <div className="hidden shrink-0 rounded-xl bg-zinc-800 px-3 py-2 text-right sm:block">
                    <p className="truncate text-xs text-zinc-500">Source</p>
                    <p className="max-w-[140px] truncate text-xs font-medium text-zinc-300">
                      {selectedFileName}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MiniStat label="Following" value={result.stats.following} />
                  <MiniStat label="Followers" value={result.stats.followers} />
                  <MiniStat
                    label="Not following back"
                    value={result.stats.nonFollowersBack}
                    highlight
                  />
                </div>
              </div>

              {/* List */}
              {result.stats.nonFollowersBack > 0 ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <SearchIcon />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Filter by username…"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={copyAll}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
                    >
                      {copied ? (
                        <>
                          <CheckIcon />
                          Copied
                        </>
                      ) : (
                        <>
                          <CopyIcon />
                          Copy all
                        </>
                      )}
                    </button>
                  </div>

                  <p className="-mt-2 text-xs text-zinc-600">
                    Showing {filteredResults.length} of{" "}
                    {result.stats.nonFollowersBack}
                  </p>

                  <ul className="overflow-hidden rounded-xl border border-zinc-800 divide-y divide-zinc-800/80">
                    {filteredResults.length > 0 ? (
                      filteredResults.map(({ username, profileUrl }) => (
                        <li
                          key={username}
                          className="group flex items-center gap-3 bg-zinc-900/40 px-4 py-3 transition hover:bg-zinc-900/80"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-bold uppercase text-zinc-300">
                            {username.slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              @{username}
                            </p>
                          </div>
                          <a
                            href={profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition group-hover:bg-zinc-800 group-hover:text-rose-400"
                          >
                            View →
                          </a>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-10 text-center text-sm text-zinc-500">
                        No usernames match &ldquo;{query}&rdquo;
                      </li>
                    )}
                  </ul>
                </>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center">
                  <p className="text-4xl">🎉</p>
                  <p className="mt-3 text-sm font-medium text-zinc-300">
                    Your following list is fully mutual
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Every account you follow also follows you back.
                  </p>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}

function MiniStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-3 ${
        highlight
          ? "bg-rose-500/10 ring-1 ring-rose-500/20"
          : "bg-zinc-800/60"
      }`}
    >
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p
        className={`mt-0.5 text-xl font-bold tabular-nums ${
          highlight ? "text-rose-400" : "text-white"
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      className="size-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20 20l-3-3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="size-4 text-emerald-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="mt-0.5 size-5 shrink-0 text-red-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`size-5 text-zinc-500 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}
