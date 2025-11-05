import fs from "fs";
import path from "path";

function parseCSVLine(line) {
  // Handles quoted fields and commas inside quotes
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export async function GET() {
  const csvPath = path.join(process.cwd(), "lemmy_communities.csv");
  if (!fs.existsSync(csvPath)) {
    return new Response(JSON.stringify({ communities: [], stats: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const lines = fs.readFileSync(csvPath, "utf8").split("\n").filter(Boolean);
  if (lines.length < 2) {
    return new Response(JSON.stringify({ communities: [], stats: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const header = parseCSVLine(lines[0]).map((h) => h.replace(/"/g, ""));
  const communities = lines.slice(1).map((line) => {
    const cols = parseCSVLine(line);
    return {
      fetch_date: cols[0]?.replace(/"/g, ""),
      community_name: cols[1]?.replace(/"/g, ""),
      instance: cols[2]?.replace(/"/g, ""),
      subscribers: Number(cols[3]?.replace(/"/g, "")),
      posts: Number(cols[4]?.replace(/"/g, "")),
      comments: Number(cols[5]?.replace(/"/g, "")),
    };
  });

  // Group by community_name + instance for growth calculation
  const communityMap = new Map();
  for (const c of communities) {
    const key = `${c.community_name}|${c.instance}`;
    if (!communityMap.has(key)) communityMap.set(key, []);
    communityMap.get(key).push(c);
  }

  // For each community, sort by fetch_date ascending
  const stats = [];
  for (const [key, entries] of communityMap.entries()) {
    const sorted = entries.slice().sort((a, b) => new Date(a.fetch_date) - new Date(b.fetch_date));
    const latest = sorted[sorted.length - 1];
    const name = latest.community_name;
    const subscribers = latest.subscribers;
    const totalPosts = latest.posts;
    // Growth calculations (use subscriber count)
    function getGrowthAndPrev(days) {
      const cutoff = new Date(latest.fetch_date);
      cutoff.setDate(cutoff.getDate() - days);
      const past = sorted.findLast((e) => new Date(e.fetch_date) <= cutoff);
      if (!past) return { delta: 0, prev: 0 };
      return { delta: subscribers - past.subscribers, prev: past.subscribers };
    }
    const daily = getGrowthAndPrev(1);
    const weekly = getGrowthAndPrev(7);
    const monthly = getGrowthAndPrev(30);
    const yearly = getGrowthAndPrev(365);
    const growth = {
      daily: daily.delta,
      weekly: weekly.delta,
      monthly: monthly.delta,
      yearly: yearly.delta,
    };
    const prevSubscribers = {
      daily: daily.prev,
      weekly: weekly.prev,
      monthly: monthly.prev,
      yearly: yearly.prev,
    };
    // Keyword matches not available in CSV, set to 0
    stats.push({
      name,
      subscribers,
      totalPosts,
      keywordMatches: 0,
      growth,
      prevSubscribers,
    });
  }

  return new Response(JSON.stringify({ communities, stats }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}