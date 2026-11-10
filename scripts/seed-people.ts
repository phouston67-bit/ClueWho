/**
 * scripts/seed-people.ts
 *
 * Populates/refreshes `data/people.json` with real, freely-licensed photos
 * resolved from Wikidata + Wikimedia Commons.
 *
 * Why Wikidata/Commons specifically: Commons only hosts images that are
 * public domain or under a free license (e.g. CC BY-SA), each with a
 * machine-readable license + attribution string. We deliberately do NOT
 * scrape arbitrary Wikipedia article lead images, because many of those
 * (especially for historical figures, book covers, or film stills) are
 * non-free "fair use" images that Wikipedia is legally allowed to display
 * contextually but that are NOT safe for a third party to redistribute.
 *
 * Algorithm per person:
 *  1. Resolve a Wikidata QID - either the `wikidataId` already set on the
 *     person, or by searching Wikidata by name (wbsearchentities),
 *     preferring results that are "instance of" human (P31 -> Q5).
 *  2. Fetch that entity's P18 (image) claim, which points to a Commons file.
 *  3. Resolve the Commons file via the Commons API's `imageinfo` action,
 *     requesting `extmetadata`, to get the direct file URL, license short
 *     name, and a ready-to-display attribution/credit string.
 *  4. Write the result back into the matching entry of data/people.json.
 *
 * Usage:
 *   npm run seed              # refresh every person missing/with TODO image
 *   npm run seed -- --force   # re-resolve every person, even ones already set
 *
 * This script is intentionally dependency-free (uses global fetch, Node 18+)
 * and safe to re-run; it never deletes curated fact data, only the `image`
 * (and optionally `wikidataId`) fields.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Person } from "../lib/types";

const DATA_PATH = path.resolve(__dirname, "../data/people.json");
const USER_AGENT =
  "ClueWho-SeedScript/1.0 (https://github.com/phouston67-bit/ClueWho; contact via GitHub issues)";
const FORCE = process.argv.includes("--force");

interface WikidataSearchResult {
  search: Array<{ id: string; label?: string; description?: string }>;
}

interface WikidataEntityResponse {
  entities: Record<
    string,
    {
      claims: Record<
        string,
        Array<{
          mainsnak?: {
            datavalue?: { value: unknown };
          };
        }>
      >;
    }
  >;
}

interface CommonsImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: Array<{
          url: string;
          thumburl?: string;
          descriptionurl?: string;
          extmetadata?: Record<string, { value: string }>;
        }>;
      }
    >;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return (await res.json()) as T;
}

/** Search Wikidata for a human entity matching `name`, preferring exact P31=Q5 matches. */
async function searchWikidataQid(name: string): Promise<string | null> {
  const searchUrl =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=` +
    `${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json`;
  const result = await fetchJson<WikidataSearchResult>(searchUrl);
  if (!result.search || result.search.length === 0) return null;

  // Check each candidate (in rank order) for "instance of human" (P31 -> Q5),
  // and prefer the first one that qualifies.
  for (const candidate of result.search) {
    const isHuman = await isWikidataHuman(candidate.id);
    if (isHuman) return candidate.id;
  }
  // Fall back to the top search result even if we couldn't confirm P31=Q5
  // (e.g. the claim is missing or differently structured).
  return result.search[0].id;
}

async function isWikidataHuman(qid: string): Promise<boolean> {
  try {
    const entity = await fetchWikidataEntity(qid);
    const claims = entity.entities[qid]?.claims ?? {};
    const instanceOf = claims["P31"] ?? [];
    return instanceOf.some((claim) => {
      const value = claim.mainsnak?.datavalue?.value as
        | { id?: string }
        | undefined;
      return value?.id === "Q5";
    });
  } catch {
    return false;
  }
}

async function fetchWikidataEntity(qid: string): Promise<WikidataEntityResponse> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  return fetchJson<WikidataEntityResponse>(url);
}

/** Resolve a Wikidata QID's P18 (image) claim to a Commons file name. */
async function getCommonsFileName(qid: string): Promise<string | null> {
  const entity = await fetchWikidataEntity(qid);
  const claims = entity.entities[qid]?.claims ?? {};
  const imageClaims = claims["P18"] ?? [];
  const value = imageClaims[0]?.mainsnak?.datavalue?.value;
  return typeof value === "string" ? value : null;
}

interface ResolvedImage {
  commonsFileUrl: string;
  sourcePageUrl: string;
  license: string;
  attribution: string;
}

/** Resolve a Commons file name to its direct URL, license, and attribution string. */
async function resolveCommonsImage(
  fileName: string
): Promise<ResolvedImage | null> {
  const title = `File:${fileName}`;
  // Always request a scaled thumbnail (iiurlwidth) in addition to the
  // original file URL. Some Commons originals are TIFF/SVG/etc., which
  // browsers can't render directly in an <img> tag - the thumbnail is
  // always re-encoded to a web-safe raster format (JPEG/PNG), and it's
  // also a more mobile-friendly payload size than a full-resolution original.
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      title
    )}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json`;
  const result = await fetchJson<CommonsImageInfoResponse>(url);
  const pages = result.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  const license =
    meta["LicenseShortName"]?.value ??
    meta["UsageTerms"]?.value ??
    "See Wikimedia Commons for license";
  const artist = stripHtml(meta["Artist"]?.value ?? "Unknown author");
  const credit = stripHtml(meta["Credit"]?.value ?? "Wikimedia Commons");
  const attribution = `${artist} via Wikimedia Commons (${credit}), licensed under ${license}.`;

  return {
    commonsFileUrl: info.thumburl ?? info.url,
    sourcePageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${title}`,
    license,
    attribution,
  };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

function needsSeeding(person: Person): boolean {
  if (FORCE) return true;
  return (
    !person.image?.commonsFileUrl ||
    person.image.commonsFileUrl.startsWith("TODO") ||
    person.image.license === "TODO"
  );
}

async function seedPerson(person: Person): Promise<Person> {
  try {
    const qid = person.wikidataId ?? (await searchWikidataQid(person.name));
    if (!qid) {
      console.warn(`  [skip] No Wikidata entity found for "${person.name}".`);
      return person;
    }

    const fileName = await getCommonsFileName(qid);
    if (!fileName) {
      console.warn(
        `  [skip] "${person.name}" (${qid}) has no P18 image claim on Wikidata.`
      );
      return { ...person, wikidataId: qid };
    }

    const resolved = await resolveCommonsImage(fileName);
    if (!resolved) {
      console.warn(
        `  [skip] Could not resolve Commons file "${fileName}" for "${person.name}".`
      );
      return { ...person, wikidataId: qid };
    }

    console.log(`  [ok]   ${person.name} -> ${resolved.commonsFileUrl}`);
    return {
      ...person,
      wikidataId: qid,
      image: {
        commonsFileUrl: resolved.commonsFileUrl,
        sourcePageUrl: resolved.sourcePageUrl,
        license: resolved.license,
        attribution: resolved.attribution,
      },
    };
  } catch (err) {
    console.warn(
      `  [error] Failed to seed "${person.name}": ${(err as Error).message}`
    );
    return person;
  }
}

async function main() {
  const raw = readFileSync(DATA_PATH, "utf-8");
  const people: Person[] = JSON.parse(raw);

  console.log(
    `Seeding images for ${people.length} people from Wikidata + Wikimedia Commons...\n` +
      (FORCE ? "(--force: re-resolving every entry)\n" : "")
  );

  const updated: Person[] = [];
  for (const person of people) {
    if (!needsSeeding(person)) {
      updated.push(person);
      continue;
    }
    console.log(`Resolving "${person.name}" (${person.category})...`);
    const result = await seedPerson(person);
    updated.push(result);
    // Be a polite API citizen: small delay between requests.
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2) + "\n", "utf-8");

  const resolvedCount = updated.filter(
    (p) => !p.image.commonsFileUrl.startsWith("TODO")
  ).length;
  console.log(
    `\nDone. ${resolvedCount}/${updated.length} people now have a resolved Commons image.`
  );
  if (resolvedCount < updated.length) {
    console.log(
      "Some people are still missing a resolved image (TODO placeholders remain). " +
        "Re-run `npm run seed` (optionally with --force), or set an explicit `wikidataId` " +
        "on that person in data/people.json if the name search is ambiguous."
    );
  }
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
