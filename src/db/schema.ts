import { pgTable, serial, text, integer, numeric, customType, uuid, timestamp, jsonb, boolean, index, bigint } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(3072)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
});

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  embedKey: text("embed_key").notNull().unique(),
  widgetColor: text("widget_color"), // e.g. "#123A3E", nullable
  widgetPosition: text("widget_position"), // "bottom-right" | "bottom-left", nullable
  businessDescription: text("business_description"),
  allowedDomains: text("allowed_domains").array(),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(),
  city: text("city"),
  description: text("description"),
  embedding: vector("embedding"),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  title: text("title").notNull(),
  districtId: integer("district_id"),
  address: text("address"),
  landArea: numeric("land_area"),
  price: numeric("price"),
  bedrooms: integer("bedrooms"),
  projectName: text("project_name"),
  description: text("description"),
  embedding: vector("embedding"),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  title: text("title").notNull(),
  category: text("category"),
  content: text("content").notNull(),
  embedding: vector("embedding"),
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull().default("New chat"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const widgetSessions = pgTable("widget_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  visitorKey: text("visitor_key").notNull(),
  title: text("title").notNull().default("New chat"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const widgetMessages = pgTable("widget_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => widgetSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  transactionUuid: text("transaction_uuid").notNull().unique(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull().default("PENDING"),
  refId: text("ref_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Actual provider HTTP attempts. Missing usage is NULL, including incomplete requests.
export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id),
  userId: uuid("user_id"),
  sessionId: uuid("session_id"),
  surface: text("surface").notNull(),
  task: text("task").notNull(),
  operation: text("operation").notNull(),
  mode: text("mode").notNull().default("managed"),
  provider: text("provider").notNull().default("google"),
  model: text("model").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  status: text("status").notNull().default("pending"),
  httpStatus: integer("http_status"),
  tokensIn: bigint("tokens_in", { mode: "number" }),
  tokensOut: bigint("tokens_out", { mode: "number" }),
  tokensTotal: bigint("tokens_total", { mode: "number" }),
  tokensCached: bigint("tokens_cached", { mode: "number" }),
  tokensReasoning: bigint("tokens_reasoning", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, table => [index("ai_usage_org_created_idx").on(table.orgId, table.createdAt), index("ai_usage_user_created_idx").on(table.userId, table.createdAt)]);
