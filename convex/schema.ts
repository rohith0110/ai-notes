import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  notes: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    content: v.string(),        // markdown source
    contentText: v.string(),    // plain text mirror for search
    tags: v.array(v.string()),
    category: v.optional(v.string()),
    isArchived: v.boolean(),
    isPublic: v.boolean(),
    shareId: v.optional(v.string()),
    wordCount: v.number(),
    titleIsUserSet: v.boolean(),
    aiSummary: v.optional(v.string()),
    aiActionItems: v.optional(v.array(v.string())),
    aiSuggestedTitle: v.optional(v.string()),
    lastTitleHash: v.optional(v.string()),
    lastSummaryHash: v.optional(v.string()),
    aiUsageCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_archived_updated", ["ownerId", "isArchived"])
    .index("by_share_id", ["shareId"])
    .searchIndex("search_content", {
      searchField: "contentText",
      filterFields: ["ownerId", "isArchived"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["ownerId", "isArchived"],
    }),

  collaborators: defineTable({
    noteId: v.id("notes"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("editor")),
    addedAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_user", ["userId"])
    .index("by_note_user", ["noteId", "userId"]),

  shareRequests: defineTable({
    noteId: v.id("notes"),
    ownerId: v.id("users"),
    requesterId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied"),
    ),
    message: v.optional(v.string()),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_owner_status", ["ownerId", "status"])
    .index("by_note", ["noteId"])
    .index("by_requester_note", ["requesterId", "noteId"]),

  activityLog: defineTable({
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    action: v.union(
      v.literal("created"),
      v.literal("edited"),
      v.literal("archived"),
      v.literal("unarchived"),
      v.literal("deleted"),
      v.literal("shared"),
      v.literal("unshared"),
      v.literal("ai_summary"),
      v.literal("ai_title"),
      v.literal("ai_actions"),
      v.literal("collaborator_added"),
    ),
    createdAt: v.number(),
  })
    .index("by_user_date", ["userId", "createdAt"]),
});
