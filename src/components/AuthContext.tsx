"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import type { UserProfile } from "../types";

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const isOfflineError = (error: unknown) => {
      if (error && typeof error === "object") {
        const err = error as { code?: string; message?: string };
        return (
          err.code === "unavailable" ||
          /client is offline/i.test(err.message ?? "")
        );
      }
      return false;
    };

    const unsub = onAuthStateChanged(auth!, async (u) => {
      setUser(u);
      if (!u || !db) {
        setProfile(null);
        return;
      }

      const userRef = doc(db, "users", u.uid);

      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
          return;
        }

        const p: UserProfile = {
          uid: u.uid,
          name: u.displayName ?? "",
          email: u.email ?? "",
          createdAt: new Date().toISOString(),
          plan: "free",
          credits: 2000,
        };
        await setDoc(userRef, p, { merge: true });
        setProfile(p);
      } catch (err) {
        if (isOfflineError(err)) {
          console.warn("Firestore is offline; using fallback user state.", err);
          setProfile(null);
          return;
        }

        console.error("Failed to load or create user profile", err);
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth!, provider);
    const u = result.user;
    const userRef = doc(db!, "users", u.uid);
    const profileData: UserProfile = {
      uid: u.uid,
      name: u.displayName ?? "",
      email: u.email ?? "",
      createdAt: new Date().toISOString(),
      plan: "free",
      credits: 2000,
    };
    await setDoc(userRef, profileData, { merge: true });
    setProfile(profileData);
    setUser(u);
  };

  const signOut = async () => {
    await firebaseSignOut(auth!);
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
