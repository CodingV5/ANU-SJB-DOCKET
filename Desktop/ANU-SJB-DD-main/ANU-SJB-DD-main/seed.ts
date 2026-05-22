import { db } from './src/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const seedData = [
  {
    title: "Constitutional Review vs. AI Autonomy",
    summary: "A landmark case regarding the legal personality of autonomous agents within the SRC jurisdiction.",
    ruling: "The court ruled that while AI agents possess 'limited agency', ultimate legal liability rests with the human operator or organization.",
    tags: ["Constitutional", "Technology"],
    date: Timestamp.fromDate(new Date('2025-10-15'))
  },
  {
    title: "Privacy Rights in Decentralized Networks",
    summary: "Investigation into the balance between public ledger transparency and individual right to be forgotten.",
    ruling: "Individual privacy outweighs protocol transparency when biometric data is involved.",
    tags: ["Privacy", "Digital Rights"],
    date: Timestamp.fromDate(new Date('2025-12-01'))
  },
  {
    title: "The People vs. Global Grid Systems",
    summary: "Class action lawsuit regarding infrastructure downtime and economic damages.",
    ruling: "Infrastructure providers are liable for 'gross negligence' if redundant systems fail to meet the 99.9% uptime mandate.",
    tags: ["Tort", "Infrastructure"],
    date: Timestamp.fromDate(new Date('2026-01-20'))
  }
];

export async function seedPrecedents() {
  const colRef = collection(db, 'precedents');
  for (const p of seedData) {
    await addDoc(colRef, p);
  }
  console.log("Seeding complete");
}
