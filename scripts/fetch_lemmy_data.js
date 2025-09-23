#!/usr/bin/env node
import fs from "fs";
import fetch from "node-fetch";

const INSTANCE_URL = "https://lemmy.world";
const CSV_FILE = "lemmy_communities.csv";

// --- fetch all communities ---
async function fetchJSON(endpoint, params = {}) {
    const url = new URL(endpoint, INSTANCE_URL);
    Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function getCommunities() {
  const PAGE_SIZE = 100;
    const out = [];
    let page = 1;
    while (true) {
  const data = await fetchJSON(`/api/v3/community/list`, { page, limit: PAGE_SIZE });
    if (!data?.communities?.length) break;
    out.push(...data.communities);
    if (data.communities.length < PAGE_SIZE) break;
    page++;
    }
    return out.map(c => ({
    name: c.community?.name ?? "",
    instance: c.community?.actor_id ? new URL(c.community.actor_id).hostname : "",
    subscribers: c.counts?.subscribers ?? 0,
    posts: c.counts?.posts ?? 0,
    comments: c.counts?.comments ?? 0
    }));
}

(async () => {
    const date = new Date().toISOString();
    const communities = await getCommunities();

  // sort by subscribers for consistency
    communities.sort((a, b) => b.subscribers - a.subscribers);

  // If the CSV does not exist, create header
    if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(
        CSV_FILE,
        "date,name,instance,subscribers,posts,comments\n",
        "utf8"
    );
    }

    const rows = communities.map(c =>
    `${date},"${c.name}","${c.instance}",${c.subscribers},${c.posts},${c.comments}`
    );

    fs.appendFileSync(CSV_FILE, rows.join("\n") + "\n", "utf8");
    console.log(`Appended ${communities.length} rows for ${date}`);
})();
