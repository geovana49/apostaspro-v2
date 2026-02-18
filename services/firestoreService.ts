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
    limit,
    clearIndexedDbPersistence,
    terminate
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

// Helper for timeout wrapped promises
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${operationName} demorou mais de ${timeoutMs / 1000}s`)), timeoutMs)
        )
    ]);
};

export const FirestoreService = {
    // --- Bets ---
    subscribeToBets: (userId: string, callback: (bets: Bet[], isSyncing: boolean) => void, onError?: (err: any) => void) => {
        const q = query(
            collection(db, "users", userId, "bets"),
            orderBy("date", "desc")
        );
        return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const bets = snapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as Bet));
            callback(bets, snapshot.metadata.hasPendingWrites);
        }, (error) => {
            console.error("Snapshot error (Bets):", error);
            if (onError) onError(error);
        });
    },

    saveBet: async (userId: string, bet: Bet) => {
        console.info("[Firestore] Iniciando saveBet para ID:", bet.id);
        try {
            const betRef = doc(db, "users", userId, "bets", bet.id);

            let dateToSave = new Date(bet.date);
            if (isNaN(dateToSave.getTime())) {
                console.error("Data inválida na aposta:", bet.date);
                dateToSave = new Date(); // Fallback
            }

            const dataToSave = {
                ...bet,
                date: Timestamp.fromDate(dateToSave)
            };

            await withTimeout(
                setDoc(betRef, dataToSave, { merge: true }),
                300000,
                "Salvamento de Aposta (setDoc)"
            );

            console.info("[Firestore] saveBet concluído com sucesso.");
        } catch (error) {
            console.error("[Firestore] Erro em saveBet:", error);
            throw error;
        }
    },

    deleteBet: async (userId: string, betId: string) => {
        await deleteDoc(doc(db, "users", userId, "bets", betId));
    },

    // --- Extra Gains ---
    subscribeToGains: (userId: string, callback: (gains: ExtraGain[], isSyncing: boolean) => void, onError?: (err: any) => void) => {
        const q = query(
            collection(db, "users", userId, "gains"),
            orderBy("date", "desc")
        );
        return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const gains = snapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as ExtraGain));
            callback(gains, snapshot.metadata.hasPendingWrites);
        }, (error) => {
            console.error("Snapshot error (Gains):", error);
            if (onError) onError(error);
        });
    },

    saveGain: async (userId: string, gain: ExtraGain) => {
        console.info("[Firestore] Iniciando saveGain para ID:", gain.id);
        try {
            const gainRef = doc(db, "users", userId, "gains", gain.id);
            let dateToSave = new Date(gain.date);
            if (isNaN(dateToSave.getTime())) dateToSave = new Date();

            const dataToSave = {
                ...gain,
                date: Timestamp.fromDate(dateToSave)
            };

            await withTimeout(
                setDoc(gainRef, dataToSave, { merge: true }),
                300000,
                "Salvamento de Ganho (setDoc)"
            );

            console.info("[Firestore] saveGain concluído com sucesso.");
        } catch (error) {
            console.error("[Firestore] Erro em saveGain:", error);
            throw error;
        }
    },

    deleteGain: async (userId: string, gainId: string) => {
        await deleteDoc(doc(db, "users", userId, "gains", gainId));
    },

    // --- Settings ---
    subscribeToSettings: (userId: string, callback: (settings: AppSettings | null, isSyncing: boolean) => void, onError?: (err: any) => void) => {
        const docRef = doc(db, "users", userId, "settings", "preferences");
        return onSnapshot(docRef, { includeMetadataChanges: true }, (snapshot) => {
            const isSyncing = (snapshot as any).metadata?.hasPendingWrites || false;
            if (snapshot.exists()) {
                callback(snapshot.data() as AppSettings, isSyncing);
            } else {
                console.log("Settings document not found, returning null");
                callback(null, isSyncing);
            }
        }, (error) => {
            console.error("Snapshot error (Settings):", error);
            if (onError) onError(error);
        });
    },

    saveSettings: async (userId: string, settings: AppSettings) => {
        await setDoc(doc(db, "users", userId, "settings", "preferences"), settings, { merge: true });
    },

    // --- Configurations ---

    subscribeToCollection: <T>(userId: string, collectionName: string, callback: (items: T[], isSyncing: boolean) => void, onError?: (err: any) => void) => {
        const q = query(collection(db, "users", userId, collectionName));
        return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
            callback(items, snapshot.metadata.hasPendingWrites);
        }, (error) => {
            console.error(`Snapshot error (${collectionName}):`, error);
            if (onError) onError(error);
        });
    },

    saveItem: async (userId: string, collectionName: string, item: any) => {
        await setDoc(doc(db, "users", userId, collectionName, item.id), item, { merge: true });
    },

    deleteItem: async (userId: string, collectionName: string, itemId: string) => {
        await deleteDoc(doc(db, "users", userId, collectionName, itemId));
    },

    initializeUserData: async (userId: string, initialData: {
        bookmakers: Bookmaker[],
        statuses: StatusItem[],
        promotions: PromotionItem[],
        origins: OriginItem[],
        settings: AppSettings
    }) => {
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.bets && Array.isArray(data.bets) && !data.migratedToV2) {
                console.info("[Migration] Migrando dados para V2...");

                const itemsToMigrate: { ref: any, data: any }[] = [];

                data.bets.forEach((bet: Bet) => {
                    itemsToMigrate.push({
                        ref: doc(db, "users", userId, "bets", bet.id),
                        data: { ...bet, date: Timestamp.fromDate(new Date(bet.date)) }
                    });
                });

                if (data.gains) {
                    data.gains.forEach((gain: ExtraGain) => {
                        itemsToMigrate.push({
                            ref: doc(db, "users", userId, "gains", gain.id),
                            data: { ...gain, date: Timestamp.fromDate(new Date(gain.date)) }
                        });
                    });
                }

                if (data.bookmakers) {
                    data.bookmakers.forEach((b: Bookmaker) => {
                        itemsToMigrate.push({ ref: doc(db, "users", userId, "bookmakers", b.id), data: b });
                    });
                }

                if (data.statuses) {
                    data.statuses.forEach((s: StatusItem) => {
                        itemsToMigrate.push({ ref: doc(db, "users", userId, "statuses", s.id), data: s });
                    });
                }

                itemsToMigrate.push({
                    ref: doc(db, "users", userId, "settings", "preferences"),
                    data: { ...(data.settings || initialData.settings), initialized: true }
                });

                for (let i = 0; i < itemsToMigrate.length; i += 400) {
                    const migrationBatch = writeBatch(db);
                    itemsToMigrate.slice(i, i + 400).forEach(item => migrationBatch.set(item.ref, item.data, { merge: true }));
                    await migrationBatch.commit();
                }

                await setDoc(userDocRef, { migratedToV2: true }, { merge: true });
                console.info("[Migration] Migração concluída.");
                return;
            }
        }

        const settingsRef = doc(db, "users", userId, "settings", "preferences");
        const settingsSnap = await getDocs(query(collection(db, "users", userId, "settings")));
        if (!settingsSnap.empty) return;

        console.info("[Initialization] Criando dados iniciais para novo usuário...");
        const batch = writeBatch(db);
        batch.set(settingsRef, { ...initialData.settings, initialized: true }, { merge: true });
        initialData.bookmakers.forEach(b => batch.set(doc(db, "users", userId, "bookmakers", b.id), b, { merge: true }));
        initialData.statuses.forEach(s => batch.set(doc(db, "users", userId, "statuses", s.id), s, { merge: true }));
        initialData.promotions.forEach(p => batch.set(doc(db, "users", userId, "promotions", p.id), p, { merge: true }));
        initialData.origins.forEach(o => batch.set(doc(db, "users", userId, "origins", o.id), o, { merge: true }));
        await batch.commit();
    },

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
        if (!base64.startsWith('data:')) return base64;

        return withTimeout(
            (async () => {
                const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
                const storageRef = ref(storage, `users/${userId}/bets/${betId}/${fileName}`);
                await uploadString(storageRef, base64, 'data_url');
                return await getDownloadURL(storageRef);
            })(),
            300000,
            "Upload de Imagem (Firebase Storage)"
        );
    },

    clearLocalCache: async () => {
        try {
            await terminate(db);
            await clearIndexedDbPersistence(db);
            console.log("Persistence cleared successfully.");
            window.location.reload();
        } catch (error) {
            console.error("Error clearing persistence:", error);
            window.location.reload();
        }
    }
};
