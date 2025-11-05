"use client";
import React, { useEffect, useState } from "react";

type CommunityStats = {
	name: string;
	subscribers: number;
	totalPosts: number;
	instance: string;
	growth: {
		daily: number;
		weekly: number;
		monthly: number;
		yearly: number;
	};
	prevSubscribers: {
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
	| "growth_yearly"
	| "growth_daily_pct"
	| "growth_weekly_pct"
	| "growth_monthly_pct"
	| "growth_yearly_pct";

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
				// Patch: add instance to each stat from API response
				const data = await res.json() as { stats: CommunityStats[]; communities: any[] };
				if (Array.isArray(data.stats) && Array.isArray(data.communities)) {
					const instanceMap = new Map<string, string>();
					for (const c of data.communities as Array<{ community_name: string; subscribers: number; instance: string }>) {
						instanceMap.set(`${c.community_name}|${c.subscribers}`, c.instance);
					}
					setStats(data.stats.map((stat: CommunityStats) => ({
						...stat,
						instance: instanceMap.get(`${stat.name}|${stat.subscribers}`) ?? "-",
					})));
				} else {
					setStats(data.stats as CommunityStats[]);
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Unknown error";
				setError(msg);
			} finally {
				setLoading(false);
			}
		}
		fetchStats();
	}, []);

	function getSortedStats() {
		const sorted = Array.isArray(stats) ? [...stats] : [];
		// Helper for percentage growth: (growth / previousSubscribers) * 100
		const pct = (delta: number, subs: number) => {
			const prev = subs - (Number.isFinite(delta) ? delta : 0);
			return prev > 0 ? (delta / prev) * 100 : 0;
		};
		switch (sortType) {
			case "subscribers":
				sorted.sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0));
				break;
			case "posts":
				sorted.sort((a, b) => (b.totalPosts || 0) - (a.totalPosts || 0));
				break;
			case "keywords":
				sorted.sort((a, b) => a.name.localeCompare(b.name));
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
			case "growth_daily_pct":
				sorted.sort((a, b) => pct(b.growth.daily, b.prevSubscribers.daily) - pct(a.growth.daily, a.prevSubscribers.daily));
				break;
			case "growth_weekly_pct": {
				// Robust comparator: handle NaN, use secondary keys for stability
				sorted.sort((a, b) => {
					const pctA = pct(a.growth.weekly, a.prevSubscribers.weekly);
					const pctB = pct(b.growth.weekly, b.prevSubscribers.weekly);
					const valA = Number.isFinite(pctA) ? pctA : -Infinity;
					const valB = Number.isFinite(pctB) ? pctB : -Infinity;
					if (valB !== valA) return valB - valA;
					// Secondary: higher subscribers first
					if (b.subscribers !== a.subscribers) return b.subscribers - a.subscribers;
					// Tertiary: alphabetical by name
					return a.name.localeCompare(b.name);
				});
				break;
			}
			case "growth_monthly_pct":
				sorted.sort((a, b) => pct(b.growth.monthly, b.prevSubscribers.monthly) - pct(a.growth.monthly, a.prevSubscribers.monthly));
				break;
			case "growth_yearly_pct":
				sorted.sort((a, b) => pct(b.growth.yearly, b.prevSubscribers.yearly) - pct(a.growth.yearly, a.prevSubscribers.yearly));
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
				{/* Percentage growth sort buttons */}
				<button
					className={`px-3 py-1 rounded border ${sortType === "growth_daily_pct" ? "bg-green-600 text-white" : "bg-white text-green-700 border-green-700"}`}
					onClick={() => setSortType("growth_daily_pct")}
				>
					Highest Daily Growth %
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "growth_weekly_pct" ? "bg-green-600 text-white" : "bg-white text-green-700 border-green-700"}`}
					onClick={() => setSortType("growth_weekly_pct")}
				>
					Highest Weekly Growth %
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "growth_monthly_pct" ? "bg-green-600 text-white" : "bg-white text-green-700 border-green-700"}`}
					onClick={() => setSortType("growth_monthly_pct")}
				>
					Highest Monthly Growth %
				</button>
				<button
					className={`px-3 py-1 rounded border ${sortType === "growth_yearly_pct" ? "bg-green-600 text-white" : "bg-white text-green-700 border-green-700"}`}
					onClick={() => setSortType("growth_yearly_pct")}
				>
					Highest Yearly Growth %
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
							<th className="px-4 py-2 text-right">Instance</th>
							<th className="px-4 py-2 text-right">Daily Growth</th>
							<th className="px-4 py-2 text-right">Weekly Growth</th>
							<th className="px-4 py-2 text-right">Monthly Growth</th>
							<th className="px-4 py-2 text-right">Yearly Growth</th>
						</tr>
					</thead>
					<tbody>
						{getSortedStats().map((c) => {
							// Percentage growth for subscribers: (growth / previousSubscribers) * 100
							const pctStr = (delta: number, prev: number) => {
								const val = prev > 0 ? (delta / prev) * 100 : 0;
								return `${val.toFixed(1)}%`;
							};
							const key = `${c.name}|${c.instance}`;
							return (
								<tr key={key} className="border-t">
									<td className="px-4 py-2">{c.name}</td>
									<td className="px-4 py-2 text-right">{typeof c.subscribers === "number" ? c.subscribers.toLocaleString() : 0}</td>
									<td className="px-4 py-2 text-right">{c.totalPosts}</td>
									<td className="px-4 py-2 text-right">{c.instance ?? "-"}</td>
									<td className="px-4 py-2 text-right">{pctStr(c.growth.daily, c.prevSubscribers.daily)} ({c.growth.daily})</td>
									<td className="px-4 py-2 text-right">{pctStr(c.growth.weekly, c.prevSubscribers.weekly)} ({c.growth.weekly})</td>
									<td className="px-4 py-2 text-right">{pctStr(c.growth.monthly, c.prevSubscribers.monthly)} ({c.growth.monthly})</td>
									<td className="px-4 py-2 text-right">{pctStr(c.growth.yearly, c.prevSubscribers.yearly)} ({c.growth.yearly})</td>
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
