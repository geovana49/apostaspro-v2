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
    getDoc,
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
    subscribeToBets: (userId: string, callback: (bets: Bet[]) => void, onError?: (err: any) => void) => {
        const q = query(
            collection(db, "users", userId, "bets"),
            orderBy("date", "desc"),
            limit(100)
        );
        return onSnapshot(q, (snapshot) => {
            const bets = snapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as Bet));
            callback(bets);
        }, (error) => {
            console.error("Snapshot error (Bets):", error);
            if (onError) onError(error);
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
    subscribeToGains: (userId: string, callback: (gains: ExtraGain[]) => void, onError?: (err: any) => void) => {
        const q = query(
            collection(db, "users", userId, "gains"),
            orderBy("date", "desc"),
            limit(100)
        );
        return onSnapshot(q, (snapshot) => {
            const gains = snapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as ExtraGain));
            callback(gains);
        }, (error) => {
            console.error("Snapshot error (Gains):", error);
            if (onError) onError(error);
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
    subscribeToSettings: (userId: string, callback: (settings: AppSettings | null) => void, onError?: (err: any) => void) => {
        const docRef = doc(db, "users", userId, "settings", "preferences");
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                callback(doc.data() as AppSettings);
            } else {
                console.log("Settings document not found, returning null");
                callback(null);
            }
        }, (error) => {
            console.error("Snapshot error (Settings):", error);
            if (onError) onError(error);
        });
    },

    saveSettings: async (userId: string, settings: AppSettings) => {
        await setDoc(doc(db, "users", userId, "settings", "preferences"), settings, { merge: true });
    },

    // --- Configurations (Bookmakers, Statuses, etc) ---

    // Generic subscriber for simple collections
    subscribeToCollection: <T>(userId: string, collectionName: string, callback: (items: T[]) => void, onError?: (err: any) => void) => {
        const q = query(collection(db, "users", userId, collectionName));
        return onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
            callback(items);
        }, (error) => {
            console.error(`Snapshot error (${collectionName}):`, error);
            if (onError) onError(error);
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

    // Initial Setup (if empty or migration needed)
    initializeUserData: async (userId: string, initialData: {
        bookmakers: Bookmaker[],
        statuses: StatusItem[],
        promotions: PromotionItem[],
        origins: OriginItem[],
        settings: AppSettings
    }) => {
        const batch = writeBatch(db);

        // 1. Check for Legacy Data (Migration Bridge)
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            // If it has 'bets' array, it's a legacy document
            if (data.bets && Array.isArray(data.bets) && !data.migratedToV2) {
                console.log("Legacy data detected! Starting migration to V2 (sub-collections)...");

                // Migrate Bets
                data.bets.forEach((bet: Bet) => {
                    const ref = doc(db, "users", userId, "bets", bet.id);
                    batch.set(ref, { ...bet, date: Timestamp.fromDate(new Date(bet.date)) }, { merge: true });
                });

                // Migrate Gains
                if (data.gains) {
                    data.gains.forEach((gain: ExtraGain) => {
                        const ref = doc(db, "users", userId, "gains", gain.id);
                        batch.set(ref, { ...gain, date: Timestamp.fromDate(new Date(gain.date)) }, { merge: true });
                    });
                }

                // Migrate Configs
                if (data.bookmakers) {
                    data.bookmakers.forEach((b: Bookmaker) => {
                        const ref = doc(db, "users", userId, "bookmakers", b.id);
                        batch.set(ref, b, { merge: true });
                    });
                }

                if (data.statuses) {
                    data.statuses.forEach((s: StatusItem) => {
                        const ref = doc(db, "users", userId, "statuses", s.id);
                        batch.set(ref, s, { merge: true });
                    });
                }

                // Migrate Settings
                const settingsRef = doc(db, "users", userId, "settings", "preferences");
                batch.set(settingsRef, { ...(data.settings || initialData.settings), initialized: true }, { merge: true });

                // Mark legacy doc as migrated
                batch.update(userDocRef, { migratedToV2: true });

                await batch.commit();
                console.log("Migration to V2 completed successfully.");
                return;
            }
        }

        // 2. Normal Initialization (Check Settings collection)
        const settingsRef = doc(db, "users", userId, "settings", "preferences");
        const settingsSnap = await getDocs(query(collection(db, "users", userId, "settings")));

        if (!settingsSnap.empty) {
            console.log("User settings found. detailed check skipped to protect data.");
            return;
        }

        // --- NEW USER FLOW ONLY ---
        console.log("New user detected. Creating default data...");
        batch.set(settingsRef, { ...initialData.settings, initialized: true }, { merge: true });

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
