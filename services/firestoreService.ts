import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    Timestamp,
    getDocs,
    writeBatch,
    limit
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Bet, ExtraGain, AppSettings, Bookmaker, StatusItem, PromotionItem, OriginItem } from "../types";

// Helper to convert Firestore Timestamp to ISO string and vice-versa
const convertDate = (data: any) => {
    if (data.date && data.date instanceof Timestamp) {
        return { ...data, date: data.date.toDate().toISOString() };
    }
    return data;
};

export const FirestoreService = {
    // --- Bets ---
    subscribeToBets: (userId: string, callback: (bets: Bet[]) => void) => {
        const q = query(
            collection(db, "users", userId, "bets"),
            orderBy("date", "desc"),
            limit(100) // Optimization: and only local cached data if needed
        );
        return onSnapshot(q, (snapshot) => {
            const bets = snapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as Bet));
            callback(bets);
        });
    },

    saveBet: async (userId: string, bet: Bet) => {
        console.log("Saving bet:", bet);
        try {
            const betRef = doc(db, "users", userId, "bets", bet.id);

            let dateToSave = new Date(bet.date);
            if (isNaN(dateToSave.getTime())) {
                console.error("Invalid date in bet:", bet.date);
                dateToSave = new Date(); // Fallback to now
            }

            const dataToSave = {
                ...bet,
                date: Timestamp.fromDate(dateToSave)
            };
            await setDoc(betRef, dataToSave, { merge: true });
            console.log("Bet saved successfully");
        } catch (error) {
            console.error("Error in FirestoreService.saveBet:", error);
            throw error;
        }
    },

    deleteBet: async (userId: string, betId: string) => {
        await deleteDoc(doc(db, "users", userId, "bets", betId));
    },

    // --- Extra Gains ---
    subscribeToGains: (userId: string, callback: (gains: ExtraGain[]) => void) => {
        const q = query(
            collection(db, "users", userId, "gains"),
            orderBy("date", "desc"),
            limit(100)
        );
        return onSnapshot(q, (snapshot) => {
            const gains = snapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as ExtraGain));
            callback(gains);
        });
    },

    saveGain: async (userId: string, gain: ExtraGain) => {
        const gainRef = doc(db, "users", userId, "gains", gain.id);
        const dataToSave = {
            ...gain,
            date: Timestamp.fromDate(new Date(gain.date))
        };
        await setDoc(gainRef, dataToSave, { merge: true });
    },

    deleteGain: async (userId: string, gainId: string) => {
        await deleteDoc(doc(db, "users", userId, "gains", gainId));
    },

    // --- Settings ---
    subscribeToSettings: (userId: string, callback: (settings: AppSettings) => void) => {
        const docRef = doc(db, "users", userId, "settings", "preferences");
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                callback(doc.data() as AppSettings);
            }
        });
    },

    saveSettings: async (userId: string, settings: AppSettings) => {
        await setDoc(doc(db, "users", userId, "settings", "preferences"), settings, { merge: true });
    },

    // --- Configurations (Bookmakers, Statuses, etc) ---

    // Generic subscriber for simple collections
    subscribeToCollection: <T>(userId: string, collectionName: string, callback: (items: T[]) => void) => {
        const q = query(collection(db, "users", userId, collectionName));
        return onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
            callback(items);
        });
    },

    // Generic saver
    saveItem: async (userId: string, collectionName: string, item: any) => {
        await setDoc(doc(db, "users", userId, collectionName, item.id), item, { merge: true });
    },

    // Generic deleter
    deleteItem: async (userId: string, collectionName: string, itemId: string) => {
        await deleteDoc(doc(db, "users", userId, collectionName, itemId));
    },

    // Initial Setup (if empty)
    initializeUserData: async (userId: string, initialData: {
        bookmakers: Bookmaker[],
        statuses: StatusItem[],
        promotions: PromotionItem[],
        origins: OriginItem[],
        settings: AppSettings
    }) => {
        const batch = writeBatch(db);

        // 1. Settings Check (The Gatekeeper)
        const settingsRef = doc(db, "users", userId, "settings", "preferences");
        const settingsSnap = await getDocs(query(collection(db, "users", userId, "settings")));

        // STRICT PROTECTION: If settings exist, we assume the user is already initialized.
        // We DO NOT check if other collections are empty because slow connections can report false empty.
        // This prevents overwriting custom bookmakers with defaults.
        if (!settingsSnap.empty) {
            console.log("User settings found. detailed check skipped to protect data.");

            // Optional: Ensure 'initialized' flag is present for future robustness, but don't touch data.
            const settingsData = settingsSnap.docs[0].data();
            if (!settingsData.initialized) {
                batch.set(settingsRef, { initialized: true }, { merge: true });
                await batch.commit();
            }
            return;
        }

        // --- NEW USER FLOW ONLY (Settings are empty) ---
        console.log("New user detected (no settings). Creating default data...");

        // 1. Create Settings
        batch.set(settingsRef, { ...initialData.settings, initialized: true }, { merge: true });

        // 2. Create Defaults for all collections
        initialData.bookmakers.forEach(b => {
            const ref = doc(db, "users", userId, "bookmakers", b.id);
            batch.set(ref, b, { merge: true });
        });

        initialData.statuses.forEach(s => {
            const ref = doc(db, "users", userId, "statuses", s.id);
            batch.set(ref, s, { merge: true });
        });

        initialData.promotions.forEach(p => {
            const ref = doc(db, "users", userId, "promotions", p.id);
            batch.set(ref, p, { merge: true });
        });

        initialData.origins.forEach(o => {
            const ref = doc(db, "users", userId, "origins", o.id);
            batch.set(ref, o, { merge: true });
        });

        await batch.commit();
        console.log("Default data created successfully.");
    },

    // Factory Reset
    factoryReset: async (userId: string) => {
        const collections = ["bets", "gains", "bookmakers", "statuses", "promotions", "origins", "settings"];
        let batch = writeBatch(db);
        let operationCount = 0;

        for (const colName of collections) {
            const colRef = collection(db, "users", userId, colName);
            const snapshot = await getDocs(colRef);

            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                operationCount++;

                if (operationCount >= 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    operationCount = 0;
                }
            }
        }

        await batch.commit();
    },

    // --- Media ---
    uploadImage: async (userId: string, betId: string, base64: string): Promise<string> => {
        // Only upload if it's actually base64
        if (!base64.startsWith('data:')) return base64;

        try {
            const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            const storageRef = ref(storage, `users/${userId}/bets/${betId}/${fileName}`);

            // Upload base64 string
            await uploadString(storageRef, base64, 'data_url');

            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    }
};
