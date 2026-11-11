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
 *  2. Fetch that entity's P18 (image) claim, which points to a Commons file
 *     (for the "Logos" category, P154 (logo image) is tried first instead,
 *     since a brand's logo artwork lives on P154, falling back to P18).
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
  "10Clues-SeedScript/1.0 (https://github.com/phouston67-bit/ClueWho; contact via GitHub issues)";
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

/** Search Wikidata for an entity matching `name`. For person categories,
 *  prefers the first candidate that is "instance of" human (P31 -> Q5),
 *  since common names (e.g. athletes, musicians) often collide with
 *  unrelated human namesakes ranked lower by Wikidata's search. For
 *  non-person categories (Landmarks, Stadiums, Logos), this preference is
 *  skipped entirely and the top search result is used directly - searching
 *  for a human match there actively causes wrong results (e.g. "Puma" would
 *  resolve to the cougar/animal taxon over the Puma brand, "Anfield" would
 *  resolve to an unrelated e-sports player over the football stadium, and
 *  "Taj Mahal" would resolve to the blues musician over the monument). */
async function searchWikidataQid(
  name: string,
  preferHuman = true
): Promise<string | null> {
  const searchUrl =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=` +
    `${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json`;
  const result = await fetchJson<WikidataSearchResult>(searchUrl);
  if (!result.search || result.search.length === 0) return null;

  if (preferHuman) {
    // Check each candidate (in rank order) for "instance of human" (P31 -> Q5),
    // and prefer the first one that qualifies.
    for (const candidate of result.search) {
      const isHuman = await isWikidataHuman(candidate.id);
      if (isHuman) return candidate.id;
    }
  }
  // Fall back to (or, for non-person categories, always use) the top search
  // result even if we couldn't confirm P31=Q5 (e.g. the claim is missing or
  // differently structured).
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

/** Resolve a Wikidata QID's image claim to a Commons file name.
 *  Prefers P154 (logo image) when `preferLogo` is set (used for the "Logos"
 *  category, since a brand's logo artwork lives on P154, not the P18 photo
 *  claim used for people/places), falling back to P18 either way. */
async function getCommonsFileName(
  qid: string,
  preferLogo = false
): Promise<string | null> {
  const entity = await fetchWikidataEntity(qid);
  const claims = entity.entities[qid]?.claims ?? {};
  const propertyOrder = preferLogo ? ["P154", "P18"] : ["P18", "P154"];
  for (const property of propertyOrder) {
    const value = (claims[property] ?? [])[0]?.mainsnak?.datavalue?.value;
    if (typeof value === "string") return value;
  }
  return null;
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

/** Categories whose subject is a place/brand, not a person - see
 *  `searchWikidataQid`'s doc comment for why these must skip the
 *  "prefer human" search heuristic. */
const NON_PERSON_CATEGORIES = new Set(["Landmarks", "Stadiums", "Logos"]);

async function seedPerson(person: Person): Promise<Person> {
  try {
    const preferHuman = !NON_PERSON_CATEGORIES.has(person.category);
    const qid =
      person.wikidataId ?? (await searchWikidataQid(person.name, preferHuman));
    if (!qid) {
      console.warn(`  [skip] No Wikidata entity found for "${person.name}".`);
      return person;
    }

    const fileName = await getCommonsFileName(qid, person.category === "Logos");
    if (!fileName) {
      console.warn(
        `  [skip] "${person.name}" (${qid}) has no P18/P154 image claim on Wikidata.`
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
