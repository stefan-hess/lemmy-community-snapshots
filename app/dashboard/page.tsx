
"use client";
import React, { useEffect, useState } from "react";

type Community = {
    id?: number | null;
    name: string;
    subscribers: number;
    posts?: number;
    comments?: number;
};

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
                        const data: any = await res.json();
                        // Debug: log the raw API response
                        if (typeof window !== "undefined") {
                            // Only log in browser
                            // eslint-disable-next-line no-console
                            console.log("[Lemmy Dashboard] Raw API response:", data);
                        }
                        // If backend returns a flat `communities` array (name, subscribers, posts, comments), use it directly.
                        if (data && Array.isArray(data.communities)) {
                            setCommunities(data.communities.slice(0, 50));
                        } else {
                            // fallback to older mappings
                            let arr: any[] = [];
                            if (Array.isArray(data)) arr = data;
                            else if (data && Array.isArray(data.stats)) arr = data.stats;
                            else {
                                const arrProp = Object.values(data || {}).find((v) => Array.isArray(v));
                                if (arrProp) arr = arrProp as any[];
                            }
                            const comms: Community[] = arr.map((entry) => {
                                if (entry && entry.community && entry.counts) {
                                    return {
                                        name: entry.community.name,
                                        subscribers: entry.counts.subscribers,
                                        posts: entry.counts.posts,
                                        comments: entry.counts.comments,
                                    };
                                }
                                return {
                                    name: entry?.name ?? "",
                                    subscribers: entry?.subscribers ?? 0,
                                    posts: entry?.posts ?? entry?.totalPosts ?? 0,
                                    comments: entry?.comments ?? 0,
                                } as Community;
                            }).filter(c => c && typeof c.name === "string" && typeof c.subscribers === "number");
                            setCommunities(comms.slice(0, 50));
                        }
                    } catch (err: any) {
                        setError(err.message || "Unknown error");
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
            const data: any = await res.json();
            setCommunities(data.communities?.slice(0,50) ?? []);
        } catch (e: any) {
            setError(e.message || 'Unknown error');
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
                            <th className="px-4 py-2 text-right">Keyword Hits</th>
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
                        .map((c) => (
                                    <tr key={c.id ?? c.name} className="border-t">
                                <td className="px-4 py-2">{c.name}</td>
                                <td className="px-4 py-2 text-right">{typeof c.subscribers === "number" ? c.subscribers.toLocaleString() : 0}</td>
                                <td className="px-4 py-2 text-right">{typeof c.posts === "number" ? c.posts.toLocaleString() : "-"}</td>
                                <td className="px-4 py-2 text-right">{typeof c.comments === "number" ? c.comments.toLocaleString() : "-"}</td>
                                <td className="px-4 py-2 text-right">{typeof (c as any).keywordsCount === "number" ? (c as any).keywordsCount.toLocaleString() : 0}</td>
                                <td className="px-4 py-2 text-left">{(c as any).instance ?? "-"}</td>
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
