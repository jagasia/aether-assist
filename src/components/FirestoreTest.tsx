"use client";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function FirestoreTest() {
  async function test() {
    try {
      console.log("Testing Firestore...");
      const snap = await getDoc(doc(db, "jag", "1"));
      console.log("SUCCESS:", snap.exists(), snap.data());
    } catch (e: any) {
      console.error("FULL FIRESTORE ERROR:", {
        code: e?.code,
        message: e?.message,
        stack: e?.stack,
        customData: e?.customData,
        full: e,
      });
    }
  }

  return (
    <button type="button" onClick={test}>
      Test Firestore
    </button>
  );
}
