import { db } from "../db/client";
import { properties, districts } from "../db/schema";
import { embedText } from "../lib/gemini";
async function seed() {
  const [lakeside] = await db.insert(districts).values({
    name: "Lakeside",
    city: "Pokhara",
    description: "Tourist hub with high rental demand and lakeside land.",
  }).returning();

  const sample = [
    {
      title: "2 Ropani Land in Lakeside",
      address: "Lakeside, Pokhara",
      landArea: "2",
      price: "5000000",
      bedrooms: 0,
      description: "Flat land with road access, ideal for hotel investment near the lake.",
    },
    {
      title: "House in Mahendrapool",
      address: "Mahendrapool, Pokhara",
      landArea: "4 ",
      price: "12000000",
      bedrooms: 4,
      description: "3-storey house close to the city center, good rental income potential.",
    },
  ];

  for (const p of sample) {
    const embedding = await embedText(`${p.title}. ${p.description}`);
    await db.insert(properties).values({ ...p, districtId: lakeside.id, embedding });
    console.log(`Inserted: ${p.title}`);
  }
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });