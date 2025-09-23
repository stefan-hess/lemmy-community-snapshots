import { NextResponse } from "next/server";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const INSTANCE_URL = "https://lemmy.world";
const LEMMY_JWT = process.env.LEMMY_JWT;
// reuse existing keyword list from lemmyDataCollector.js
const KEYWORDS = ["issue", "pain", "problem", "struggle"];
// Simple in-memory cache to stabilize results across refreshes
// simple per-size cache
const cacheStore = {
  all: { data: null, ts: 0 },
  large: { data: null, ts: 0 },
  medium: { data: null, ts: 0 },
  small: { data: null, ts: 0 },
};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
// per-community cache: maps numeric community id -> { keywordsCount, ts }
const COMMUNITY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const communityCache = new Map();

async function fetchJSON(endpoint, params = {}) {
  const url = new URL(endpoint, INSTANCE_URL);
  Object.keys(params).forEach((k) => url.searchParams.append(k, params[k]));
  const headers = {};
  if (LEMMY_JWT) headers["Authorization"] = `Bearer ${LEMMY_JWT}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function getCommunities(max = 2000) {
  const communities = [];
  let page = 1;
  // fetch pages until we reach `max` or the API returns no more results
  while (communities.length < max) {
    const data = await fetchJSON("/api/v3/community/list", { page, sort: "TopAll" });
    if (!data || !Array.isArray(data.communities) || data.communities.length === 0) break;
    communities.push(...data.communities);
    page++;
    // safety: prevent infinite loops
    if (page > 100) break; // 100 pages * variable page size
  }
  return communities.slice(0, max).map((c) => {
    const cid = c.community?.id ?? null;
    const actor = c.community?.actor_id ?? null;
    const published = c.community?.published ?? null;
    const fallbackId = `${c.community?.name ?? c.community?.title ?? "unknown"}-${published ?? ""}`;
    const uid = cid ? `id-${cid}` : (actor ? `actor-${encodeURIComponent(actor)}` : `fallback-${encodeURIComponent(fallbackId)}`);
    // derive instance hostname from actor_id when available
    let instance = null;
    try {
      if (c.community?.actor_id) instance = new URL(c.community.actor_id).hostname;
    } catch (e) {
      instance = null;
    }
    return {
      id: uid,
      name: c.community?.name ?? c.community?.title ?? "",
      instance,
      subscribers: c.counts && typeof c.counts.subscribers === "number" ? c.counts.subscribers : 0,
      posts: c.counts && typeof c.counts.posts === "number" ? c.counts.posts : 0,
      comments: c.counts && typeof c.counts.comments === "number" ? c.counts.comments : 0,
    };
  });
}

// Fetch pages and return communities matching a predicate until we have `needed` matches or reach maxPages
async function getCommunitiesMatching(predicate, needed = 500, maxPages = 500) {
  const matches = [];
  let page = 1;
  while (matches.length < needed && page <= maxPages) {
    const data = await fetchJSON('/api/v3/community/list', { page, sort: 'TopAll' });
    if (!data || !Array.isArray(data.communities) || data.communities.length === 0) break;
    for (const c of data.communities) {
      const cid = c.community?.id ?? null;
      const actor = c.community?.actor_id ?? null;
      const published = c.community?.published ?? null;
      const fallbackId = `${c.community?.name ?? c.community?.title ?? 'unknown'}-${published ?? ''}`;
      const uid = cid ? `id-${cid}` : (actor ? `actor-${encodeURIComponent(actor)}` : `fallback-${encodeURIComponent(fallbackId)}`);
      let instance = null;
      try {
        if (c.community?.actor_id) instance = new URL(c.community.actor_id).hostname;
      } catch (e) {
        instance = null;
      }
      const obj = {
        id: uid,
        name: c.community?.name ?? c.community?.title ?? '',
        instance,
        subscribers: c.counts && typeof c.counts.subscribers === 'number' ? c.counts.subscribers : 0,
        posts: c.counts && typeof c.counts.posts === 'number' ? c.counts.posts : 0,
        comments: c.counts && typeof c.counts.comments === 'number' ? c.counts.comments : 0,
      };
      if (predicate(obj)) matches.push(obj);
      if (matches.length >= needed) break;
    }
    page++;
  }
  return matches;
}

// fetch recent posts for a community and return an array of { title, content }
async function fetchPostsForCommunity(communityId, limit = 100) {
  try {
    const data = await fetchJSON('/api/v3/post/list', { community_id: communityId, limit, sort: 'New' });
    if (!data || !Array.isArray(data.posts)) return [];
    return data.posts.map((p) => ({ title: p.post?.name ?? '', content: p.post?.body ?? '' }));
  } catch (e) {
    console.error('fetchPostsForCommunity error', e);
    return [];
  }
}

function countKeywordsInText(text, keywords) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    // simple substring occurrences
    let idx = lower.indexOf(k);
    while (idx !== -1) {
      count++;
      idx = lower.indexOf(k, idx + k.length);
    }
  }
  return count;
}

export async function GET(request) {
  try {
    const now = Date.now();
    const qs = new URL(request.url).searchParams;
    const size = (qs.get('size') || 'all').toLowerCase();

    // return cached per-size if present
    if (cacheStore[size] && now - cacheStore[size].ts < CACHE_TTL_MS && cacheStore[size].data) {
      return NextResponse.json({ communities: cacheStore[size].data });
    }

    let communities = await getCommunities(2000);
      // Debug: log first 10 raw candidates before sorting
      console.log("Raw candidates (first 10):", communities.slice(0, 50).map(c => ({ name: c.name, subscribers: c.subscribers })));

      // Ensure subscriber fallback (in case some entries lack counts), preserve id & instance
      communities = communities.map(c => ({
        id: c.id,
        instance: c.instance ?? null,
        name: c.name,
        subscribers: typeof c.subscribers === 'number' ? c.subscribers : 0,
        posts: c.posts,
        comments: c.comments,
      }));

      // Sort by subscribers desc and take top 50
      communities = communities
        .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
        .slice(0, 50)
        .map(({ id, name, instance, subscribers, posts, comments }) => ({ id, name, instance, subscribers, posts, comments }));

    // apply size filter server-side
    function matchesSizeFilter(c, sizeKey) {
      const s = c.subscribers || 0;
      if (sizeKey === 'large') return s > 10000;
      if (sizeKey === 'medium') return s >= 1000 && s <= 9999;
      if (sizeKey === 'small') return s < 1000;
      return true;
    }
    // filter the full candidate set by size first, then sort & take top 50 of that class
    const filteredBySize = communities.filter((c) => matchesSizeFilter(c, size));
    const candidates = filteredBySize
      .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
      .slice(0, 50)
      .map(({ id, name, instance, subscribers, posts, comments }) => ({ id, name, instance, subscribers, posts, comments }));
    // For each prefiltered community, fetch recent posts and compute keyword occurrences
    const POSTS_PER_COMMUNITY = 50;
    const CONCURRENCY = 6; // number of parallel workers

    async function concurrentMap(arr, mapper, concurrency) {
      const results = new Array(arr.length);
      let idx = 0;
      async function worker() {
        while (true) {
          const i = idx++;
          if (i >= arr.length) return;
          try {
            results[i] = await mapper(arr[i], i);
          } catch (e) {
            results[i] = null;
            console.error('concurrentMap mapper error', e);
          }
        }
      }
      const workers = [];
      const nWorkers = Math.min(concurrency, arr.length);
      for (let w = 0; w < nWorkers; w++) workers.push(worker());
      await Promise.all(workers);
      return results;
    }

  const enriched = await concurrentMap(candidates, async (c) => {
      // attempt to extract original numeric community id if present in the id string
      let numericCommunityId = null;
      if (typeof c.id === 'string' && c.id.startsWith('id-')) {
        const raw = c.id.slice(3);
        const n = Number(raw);
        if (!Number.isNaN(n)) numericCommunityId = n;
      }
      let keywordsCount = 0;
      if (numericCommunityId) {
        const cacheEntry = communityCache.get(numericCommunityId);
        const nowMs = Date.now();
        if (cacheEntry && nowMs - cacheEntry.ts < COMMUNITY_CACHE_TTL_MS) {
          keywordsCount = cacheEntry.keywordsCount;
        } else {
          const posts = await fetchPostsForCommunity(numericCommunityId, POSTS_PER_COMMUNITY);
          for (const p of posts) {
            const text = `${p.title} \n ${p.content}`;
            keywordsCount += countKeywordsInText(text, KEYWORDS);
          }
          communityCache.set(numericCommunityId, { keywordsCount, ts: nowMs });
        }
      }
      return { ...c, keywordsCount };
    }, CONCURRENCY);

  // cache per-size and return
  cacheStore[size].data = enriched;
  cacheStore[size].ts = Date.now();
  if (enriched.length > 0) console.log("Top community sample:", JSON.stringify(enriched[0], null, 2));
  return NextResponse.json({ communities: enriched });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}