"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function DebugPage() {
	const dbState = useQuery(api.debugDatabase.debugDatabase);

	if (!dbState) {
		return <div>Loading...</div>;
	}

	return (
		<div className="container mx-auto py-8">
			<h1 className="text-2xl font-bold mb-4">Database Debug</h1>
			
			<div className="space-y-6">
				<div>
					<h2 className="text-xl font-semibold mb-2">Users ({dbState.users.length})</h2>
					<pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
						{JSON.stringify(dbState.users, null, 2)}
					</pre>
				</div>

				<div>
					<h2 className="text-xl font-semibold mb-2">Subscriptions ({dbState.subscriptions.length})</h2>
					<pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
						{JSON.stringify(dbState.subscriptions, null, 2)}
					</pre>
				</div>

				<div>
					<h2 className="text-xl font-semibold mb-2">Purchases ({dbState.purchases.length})</h2>
					<pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
						{JSON.stringify(dbState.purchases, null, 2)}
					</pre>
				</div>

				<div>
					<h2 className="text-xl font-semibold mb-2">Courses ({dbState.courses.length})</h2>
					<pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
						{JSON.stringify(dbState.courses, null, 2)}
					</pre>
				</div>
			</div>
		</div>
	);
} 