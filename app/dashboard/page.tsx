
"use client";
import React, { useEffect, useState } from "react";

type Community = {
    fetch_date: string;
    community_name: string;
    instance: string;
    subscribers: number;
    posts: number;
    comments: number;
};

type DashboardResponse = {
    communities: Community[];
};

function isDashboardResponse(x: unknown): x is DashboardResponse {
    return !!x && typeof x === "object" && Array.isArray((x as { communities?: unknown }).communities);
}

function parseCommunityEntry(entry: unknown): Community | null {
    if (!entry || typeof entry !== "object") return null;
    const e = entry as Record<string, unknown>;
    return {
        fetch_date: typeof e.fetch_date === "string" ? e.fetch_date : "",
        community_name: typeof e.community_name === "string" ? e.community_name : "",
        instance: typeof e.instance === "string" ? e.instance : "",
        subscribers: typeof e.subscribers === "number" ? e.subscribers : Number(e.subscribers),
        posts: typeof e.posts === "number" ? e.posts : Number(e.posts),
        comments: typeof e.comments === "number" ? e.comments : Number(e.comments),
    };
}

export default function DashboardPage() {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(10);
    const [sizeFilter, setSizeFilter] = useState<'all' | 'large' | 'medium' | 'small'>('all');

    useEffect(() => {
                async function fetchCommunities(selectedSize: string = 'all') {
                    setLoading(true);
                    setError(null);
                    try {
                        const res = await fetch(`/api/lemmy-dashboard?size=${encodeURIComponent(selectedSize)}`);
                        if (!res.ok) throw new Error("Failed to fetch dashboard data");
                        const data: unknown = await res.json();
                        // Debug: log the raw API response
                        if (typeof window !== "undefined") {
                            // Only log in browser
                            console.log("[Lemmy Dashboard] Raw API response:", data);
                        }
                        // If backend returns a flat `communities` array (name, subscribers, posts, comments), use it directly.
                        if (isDashboardResponse(data)) {
                            if (!Array.isArray(data.communities)) {
                                console.error("API response 'communities' is not an array:", data.communities);
                                setCommunities([]);
                            } else {
                                const comms: Community[] = data.communities
                                    .map((entry) => parseCommunityEntry(entry))
                                    .filter((c): c is Community => !!c && typeof c.community_name === "string" && typeof c.subscribers === "number");
                                setCommunities(comms.slice(0, 50));
                            }
                        } else {
                            setCommunities([]);
                        }
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "Unknown error";
                        setError(msg);
                    } finally {
                        setLoading(false);
                    }
                }
        fetchCommunities();
    }, []);

    // call this when filter button pressed
    async function selectSizeAndFetch(size: 'all' | 'large' | 'medium' | 'small') {
        setSizeFilter(size);
        setVisibleCount(10);
        setLoading(true);
        try {
            const res = await fetch(`/api/lemmy-dashboard?size=${encodeURIComponent(size)}`);
            if (!res.ok) throw new Error('Failed to fetch dashboard data');
            const data: unknown = await res.json();
            if (isDashboardResponse(data)) {
                if (!Array.isArray(data.communities)) {
                    console.error("API response 'communities' is not an array:", data.communities);
                    setCommunities([]);
                } else {
                    setCommunities(data.communities.slice(0, 50));
                }
            } else {
                setCommunities([]);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Lemmy Community Dashboard</h1>
            <p className="mb-4 text-gray-700">Overview of the 50 largest communities by subscriber count.</p>
            {loading && <div>Loading data...</div>}
            {error && <div className="text-red-600">Error: {error}</div>}
            {!loading && !error && (
                <>
                <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => selectSizeAndFetch('all')} className={`px-3 py-1 rounded ${sizeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>All</button>
                    <button onClick={() => selectSizeAndFetch('large')} className={`px-3 py-1 rounded ${sizeFilter === 'large' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Large &gt;10,000</button>
                    <button onClick={() => selectSizeAndFetch('medium')} className={`px-3 py-1 rounded ${sizeFilter === 'medium' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Medium 1,000–9,999</button>
                    <button onClick={() => selectSizeAndFetch('small')} className={`px-3 py-1 rounded ${sizeFilter === 'small' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Small &lt;1,000</button>
                </div>

                <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2 text-left">Community</th>
                            <th className="px-4 py-2 text-right">Subscribers</th>
                            <th className="px-4 py-2 text-right">Posts</th>
                            <th className="px-4 py-2 text-right">Comments</th>
                            {/* Keyword Hits column removed */}
                            <th className="px-4 py-2 text-left">Instance</th>
                        </tr>
                    </thead>
                        <tbody>
                        {communities
                        .filter((c) => {
                            const s = c.subscribers || 0;
                            if (sizeFilter === 'large') return s > 10000;
                            if (sizeFilter === 'medium') return s >= 1000 && s <= 9999;
                            if (sizeFilter === 'small') return s < 1000;
                            return true;
                        })
                        .slice(0, visibleCount)
                        .map((c, idx) => (
                            <tr key={c.fetch_date + c.community_name + c.instance + idx} className="border-t">
                                <td className="px-4 py-2">{c.community_name}</td>
                                <td className="px-4 py-2 text-right">{typeof c.subscribers === "number" ? c.subscribers.toLocaleString() : 0}</td>
                                <td className="px-4 py-2 text-right">{typeof c.posts === "number" ? c.posts.toLocaleString() : "-"}</td>
                                <td className="px-4 py-2 text-right">{typeof c.comments === "number" ? c.comments.toLocaleString() : "-"}</td>
                                <td className="px-4 py-2 text-left">{c.instance ?? "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-4 flex gap-2">
                            {visibleCount < communities.length && (
                                <button onClick={() => setVisibleCount((v) => Math.min(communities.length, v + 50))} className="px-3 py-1 bg-blue-600 text-white rounded">Show more</button>
                            )}
                            {visibleCount > 10 && (
                                <button onClick={() => setVisibleCount(10)} className="px-3 py-1 bg-gray-200 rounded">Show less</button>
                            )}
                            <div className="ml-auto text-sm text-gray-600">Showing {Math.min(visibleCount, communities.length)} of {communities.length}</div>
                        </div>
                        </>
                    )}
        </main>
    );
}
