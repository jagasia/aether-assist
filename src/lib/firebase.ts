import { initializeApp, getApps, getApp, SDK_VERSION } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const isBrowser = typeof window !== "undefined";

function installFirestoreRequestLogger() {
  if (!isBrowser) return;

  const fireHost = "firestore.googleapis.com";
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    try {
      // TypeScript எர்ரரைத் தவிர்க்க input-ன் டைப்பைச் சரியாகக் கண்டறிந்து url எடுத்தல்
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input && "url" in input) {
        url = (input as any).url;
      }

      if (typeof url === "string" && url.includes(fireHost)) {
        console.log("Firestore fetch request:", {
          url,
          method: init?.method ?? (typeof input !== "string" && "method" in input ? (input as any).method : "GET"),
        });
      }
    } catch (fetchLoggerError) {
      console.warn("Firestore fetch logger failed", fetchLoggerError);
    }

    return originalFetch(input, init);
  };

  const originalOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
    try {
      const urlString = typeof url === "string" ? url : url.toString();
      if (urlString.includes(fireHost)) {
        console.log("Firestore XHR open:", { method, url: urlString });
        this.addEventListener("readystatechange", function () {
          if (this.readyState === 4) {
            console.log("Firestore XHR response:", {
              status: this.status,
              responseURL: this.responseURL,
              url: urlString,
            });
          }
        });
      }
    } catch (xhrLoggerError) {
      console.warn("Firestore XHR logger failed", xhrLoggerError);
    }
    return originalOpen.apply(this, [method, url, ...args]);
  };
}

function logFirestoreInternalSettings() {
  if (!isBrowser) return;

  const internal: Record<string, unknown> = {
    constructorName: db.constructor?.name,
    dbObjectKeys: Object.keys(db).slice(0, 20),
  };

  try {
    const delegate = (db as any)?._delegate;
    internal.delegateType = delegate?.constructor?.name ?? null;
    internal.databaseId = delegate?._databaseId ?? null;
    internal.settings = delegate?._settings ?? null;
    internal.host = delegate?._settings?.host ?? null;
    internal.ssl = delegate?._settings?.ssl ?? null;
    internal.persistenceKey = delegate?._persistenceKey ?? null;
    internal.internalKeys = delegate ? Object.getOwnPropertyNames(delegate).filter((key) => key.startsWith("_")) : [];
  } catch (internalError) {
    internal.error = String(internalError);
  }

  console.log("Firestore internal settings:", internal);
}

if (isBrowser) {
  const appsCount = getApps().length;
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? null;

  installFirestoreRequestLogger();
  logFirestoreInternalSettings();

  console.group("Firebase runtime diagnostics");
  console.log("Firebase app name:", app.name);
  console.log("Firebase projectId:", app.options.projectId);
  console.log("Firebase config (injected):", firebaseConfig);
  console.log("Firebase apps count:", appsCount);
  console.log("Firestore emulator host:", emulatorHost);
  console.log("Firebase SDK version:", SDK_VERSION);
  console.groupEnd();

  (async () => {
    try {
      const testRef = doc(db, "jag", "1");
      const snap = await getDoc(testRef);
      console.log("Firestore connectivity test result:", {
        exists: snap.exists(),
        id: snap.id,
        data: snap.exists() ? snap.data() : null,
      });
    } catch (error) {
      console.error("Firestore connectivity test failed", {
        code: (error as any)?.code,
        message: (error as any)?.message,
        customData: (error as any)?.customData,
        stack: (error as any)?.stack,
        error,
      });
    }
  })();
}
