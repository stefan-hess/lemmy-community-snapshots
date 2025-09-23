"use client";
import React, { useEffect, useState } from "react";

type CommunityStats = {
	name: string;
	subscribers: number;
	totalPosts: number;
	keywordMatches: number;
	growth: {
		daily: number;
		weekly: number;
		monthly: number;
		yearly: number;
	};
};

type SortType =
	| "subscribers"
	| "posts"
	| "keywords"
	| "growth_daily"
	| "growth_weekly"
	| "growth_monthly"
	| "growth_yearly";

export default function DashboardPage() {
	const [stats, setStats] = useState<CommunityStats[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sortType, setSortType] = useState<SortType>("subscribers");

	useEffect(() => {
		async function fetchStats() {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/lemmy-dashboard");
				if (!res.ok) throw new Error("Failed to fetch dashboard data");
				const data = (await res.json()) as { stats: CommunityStats[] };
				setStats(data.stats);
			} catch (err: any) {
				setError(err.message || "Unknown error");
			} finally {
				setLoading(false);
			}
		}
		fetchStats();
	}, []);

	function getSortedStats() {
		const sorted = [...stats];
		switch (sortType) {
			case "subscribers":
				sorted.sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0));
				break;
			case "posts":
				sorted.sort((a, b) => (b.totalPosts || 0) - (a.totalPosts || 0));
				break;
			case "keywords":
				sorted.sort((a, b) => (b.keywordMatches || 0) - (a.keywordMatches || 0));
				break;
			case "growth_daily":
				sorted.sort((a, b) => (b.growth.daily || 0) - (a.growth.daily || 0));
				break;
			case "growth_weekly":
				sorted.sort((a, b) => (b.growth.weekly || 0) - (a.growth.weekly || 0));
				break;
			case "growth_monthly":
				sorted.sort((a, b) => (b.growth.monthly || 0) - (a.growth.monthly || 0));
				break;
			case "growth_yearly":
				sorted.sort((a, b) => (b.growth.yearly || 0) - (a.growth.yearly || 0));
				break;
		}
		return sorted;
	}

	return (
		<main className="max-w-4xl mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6">Lemmy Community Dashboard</h1>
			<div className="mb-4 flex flex-wrap gap-2">
				<button
					className={`px-3 py-1 rounded border ${sortType === "subscribers" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border-blue-600"}`}
					onClick={() => setSortType("subscribers")}
				>
					Most Subscribers
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "posts" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border-blue-600"}`}
					onClick={() => setSortType("posts")}
				>
					Most Posts
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "keywords" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border-blue-600"}`}
					onClick={() => setSortType("keywords")}
				>
					Most Keywords
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "growth_daily" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border-blue-600"}`}
					onClick={() => setSortType("growth_daily")}
				>
					Highest Daily Growth
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "growth_weekly" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border-blue-600"}`}
					onClick={() => setSortType("growth_weekly")}
				>
					Highest Weekly Growth
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "growth_monthly" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border-blue-600"}`}
					onClick={() => setSortType("growth_monthly")}
				>
					Highest Monthly Growth
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "growth_yearly" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border-blue-600"}`}
					onClick={() => setSortType("growth_yearly")}
				>
					Highest Yearly Growth
				</button>
			</div>
			{loading && <div>Loading data...</div>}
			{error && <div className="text-red-600">Error: {error}</div>}
			{!loading && !error && (
				<table className="min-w-full border border-gray-300 rounded-lg overflow-hidden text-sm">
					<thead className="bg-gray-100">
						<tr>
							<th className="px-4 py-2 text-left">Community</th>
							<th className="px-4 py-2 text-right">Subscribers</th>
							<th className="px-4 py-2 text-right">Total Posts</th>
							<th className="px-4 py-2 text-right">Keyword Matches</th>
							<th className="px-4 py-2 text-right">Growth % (24h/7d/30d/1y)</th>
						</tr>
					</thead>
					<tbody>
									{getSortedStats().map((c) => {
										const pct = (n: number) => c.totalPosts > 0 ? ((n / c.totalPosts) * 100).toFixed(1) + "%" : "0%";
										return (
											<tr key={c.name} className="border-t">
												<td className="px-4 py-2">{c.name}</td>
												<td className="px-4 py-2 text-right">{typeof c.subscribers === "number" ? c.subscribers.toLocaleString() : 0}</td>
												<td className="px-4 py-2 text-right">{c.totalPosts}</td>
												<td className="px-4 py-2 text-right">{c.keywordMatches}</td>
												<td className="px-4 py-2 text-right">
													{pct(c.growth.daily)} / {pct(c.growth.weekly)} / {pct(c.growth.monthly)} / {pct(c.growth.yearly)}
												</td>
											</tr>
										);
									})}
					</tbody>
				</table>
			)}
			<p className="mt-6 text-gray-500 text-sm">
				Data is fetched from Lemmy communities and filtered for posts containing keywords: <b>issue, pain, problem, struggle</b>.
			</p>
		</main>
	);
}
