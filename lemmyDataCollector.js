// lemmyDataCollector.js
import fetch from "node-fetch";

// === Configuration ===
export const INSTANCE_URL = "https://lemmy.world"; // Lemmy instance
export const KEYWORDS = ["issue", "pain", "problem", "struggle"]; // keywords to filter posts
export const PAGE_LIMIT = 50; // max posts per request

// Helper: fetch JSON from Lemmy API
export async function fetchJSON(endpoint, params = {}) {
  const url = new URL(endpoint, INSTANCE_URL);
  Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

// === 1. Get list of communities ===
export async function getCommunities() {
  const communities = [];
  let page = 1;
  let more = true;

  while (more) {
    const data = await fetchJSON("/api/v3/community/list", { page });
    communities.push(...data.communities);
    page++;
    more = data.communities.length > 0;
  }
  return communities.map((c) => ({
    id: c.community.id,
    name: c.community.name,
    subscribers: c.community.subscribers,
  }));
}

// === 2. Get posts for a community ===
export async function getCommunityPosts(communityId, limit = PAGE_LIMIT) {
  const data = await fetchJSON("/api/v3/post/list", {
    community_id: communityId,
    limit,
    sort: "New", // sort by latest
  });
  return data.posts.map((p) => ({
    id: p.post.id,
    title: p.post.name,
    content: p.post.body || "",
    published: new Date(p.post.published),
  }));
}

// === 3. Filter posts by keyword ===
export function filterPostsByKeyword(posts, keywords) {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return posts.filter((post) => {
    const text = (post.title + " " + post.content).toLowerCase();
    return lowerKeywords.some((kw) => text.includes(kw));
  });
}

// === 4. Example: calculate post growth ===
// stores post counts per timeframe for basic growth rate
export function calculateGrowth(posts) {
  const now = new Date();
  const counts = { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
  for (const post of posts) {
    const diffDays = (now - post.published) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) counts.daily++;
    if (diffDays <= 7) counts.weekly++;
    if (diffDays <= 30) counts.monthly++;
    if (diffDays <= 365) counts.yearly++;
  }
  return counts;
}

// No main() call or top-level execution for module use
