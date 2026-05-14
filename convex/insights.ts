import { query } from "./_generated/server";
import { getCurrentUser } from "./lib";

const DAY = 24 * 60 * 60 * 1000;

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const active = notes.filter((n) => !n.isArchived);
    const archived = notes.filter((n) => n.isArchived);

    const tagCounts = new Map<string, number>();
    for (const n of active) {
      for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    const topTags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const recent = [...active]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .map((n) => ({
        _id: n._id,
        title: n.title,
        updatedAt: n.updatedAt,
        wordCount: n.wordCount,
        tags: n.tags,
      }));

    const aiUsage = notes.reduce((acc, n) => acc + (n.aiUsageCount ?? 0), 0);

    // Weekly activity (last 7 days) from activityLog
    const sinceWeek = Date.now() - 7 * DAY;
    const recentLog = await ctx.db
      .query("activityLog")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("createdAt", sinceWeek),
      )
      .collect();

    const buckets: { day: string; date: number; edits: number; ai: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i * DAY);
      day.setHours(0, 0, 0, 0);
      buckets.push({
        day: day.toLocaleDateString(undefined, { weekday: "short" }),
        date: day.getTime(),
        edits: 0,
        ai: 0,
      });
    }
    for (const entry of recentLog) {
      const bucketIdx = buckets.findIndex(
        (b, i) =>
          entry.createdAt >= b.date &&
          (i === buckets.length - 1 || entry.createdAt < buckets[i + 1].date),
      );
      if (bucketIdx === -1) continue;
      if (entry.action.startsWith("ai_")) buckets[bucketIdx].ai += 1;
      else if (
        entry.action === "edited" ||
        entry.action === "created"
      )
        buckets[bucketIdx].edits += 1;
    }

    const aiByKind: Record<string, number> = {
      summary: 0,
      title: 0,
      actions: 0,
    };
    for (const entry of recentLog) {
      if (entry.action === "ai_summary") aiByKind.summary += 1;
      else if (entry.action === "ai_title") aiByKind.title += 1;
      else if (entry.action === "ai_actions") aiByKind.actions += 1;
    }

    return {
      totalNotes: active.length,
      archivedNotes: archived.length,
      totalWords: active.reduce((a, n) => a + n.wordCount, 0),
      publicNotes: active.filter((n) => n.isPublic).length,
      topTags,
      recent,
      aiUsageTotal: aiUsage,
      aiByKindWeek: aiByKind,
      weeklyActivity: buckets,
    };
  },
});
