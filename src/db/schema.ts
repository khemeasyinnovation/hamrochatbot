import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  customType,
  uuid,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

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
  businessDescription: text("business_description"), // nullable — used to build the system prompt
  allowedDomains: text("allowed_domains").array(), // nullable — e.g. ["example.com", "shop.example.com"]
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),

  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
  name: text("name").notNull(),
  city: text("city"),
  description: text("description"),
  embedding: vector("embedding"),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
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
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
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
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const widgetSessions = pgTable("widget_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
  visitorKey: text("visitor_key").notNull(),
  title: text("title").notNull().default("New chat"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const widgetMessages = pgTable("widget_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => widgetSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
