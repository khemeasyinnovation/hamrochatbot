import { pgTable, serial, text, integer, numeric, customType } from "drizzle-orm/pg-core";
const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
});
export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city"),
  description: text("description"),
  embedding: vector("embedding"),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
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
  title: text("title").notNull(),        // e.g. "Pokhara Overview"
  category: text("category"),            // e.g. "district_guide", "faq"
  content: text("content").notNull(),    // the actual chunk text
  embedding: vector("embedding"),
});