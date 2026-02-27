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
    terminate,
    Bytes
} from "firebase/firestore";
import { ref, uploadBytesResumable, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Bet, ExtraGain, AppSettings, Bookmaker, StatusItem, PromotionItem, OriginItem, CaixaAccount, CaixaMovement, CaixaCategory, NotepadNote } from "../types";

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
            setTimeout(() => reject(new Error(`O ${operationName} excedeu o limite de tempo (${timeoutMs / 1000}s). Verifique sua conexão.`)), timeoutMs)
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
        // [CLEANUP] Deleta as fotos associadas
        const photosRef = collection(db, "users", userId, "bets", betId, "photos");
        const photosSnap = await getDocs(photosRef);
        for (const photoDoc of photosSnap.docs) {
            await deleteDoc(photoDoc.ref);
        }
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
        // [CLEANUP] Deleta as fotos associadas
        const photosRef = collection(db, "users", userId, "gains", gainId, "photos");
        const photosSnap = await getDocs(photosRef);
        for (const photoDoc of photosSnap.docs) {
            await deleteDoc(photoDoc.ref);
        }
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

    // --- Caixa (Controle de Caixa) ---
    subscribeToCaixaAccounts: (userId: string, callback: (accounts: CaixaAccount[], isSyncing: boolean) => void) => {
        const q = query(collection(db, "users", userId, "caixa_accounts"), orderBy("name", "asc"));
        return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaixaAccount));
            callback(accounts, snapshot.metadata.hasPendingWrites);
        });
    },

    subscribeToCaixaMovements: (userId: string, callback: (movements: CaixaMovement[], isSyncing: boolean) => void) => {
        const q = query(collection(db, "users", userId, "caixa_movements"), orderBy("date", "desc"), limit(500));
        return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const movements = snapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as CaixaMovement));
            callback(movements, snapshot.metadata.hasPendingWrites);
        });
    },

    saveCaixaAccount: async (userId: string, account: CaixaAccount) => {
        await setDoc(doc(db, "users", userId, "caixa_accounts", account.id), account, { merge: true });
    },

    deleteCaixaAccount: async (userId: string, accountId: string) => {
        await deleteDoc(doc(db, "users", userId, "caixa_accounts", accountId));
    },

    saveCaixaMovement: async (userId: string, movement: CaixaMovement) => {
        const movementRef = doc(db, "users", userId, "caixa_movements", movement.id);
        const dataToSave = {
            ...movement,
            date: Timestamp.fromDate(new Date(movement.date))
        };
        await setDoc(movementRef, dataToSave, { merge: true });
    },

    deleteCaixaMovement: async (userId: string, movementId: string) => {
        await deleteDoc(doc(db, "users", userId, "caixa_movements", movementId));
    },

    saveCaixaCategory: async (userId: string, category: CaixaCategory) => {
        await setDoc(doc(db, "users", userId, "caixa_categories", category.id), category, { merge: true });
    },

    deleteCaixaCategory: async (userId: string, categoryId: string) => {
        await deleteDoc(doc(db, "users", userId, "caixa_categories", categoryId));
    },

    initializeUserData: async (userId: string, initialData: {
        bookmakers: Bookmaker[],
        statuses: StatusItem[],
        promotions: PromotionItem[],
        origins: OriginItem[],
        caixa_categories?: any[],
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
        if (initialData.caixa_categories) {
            initialData.caixa_categories.forEach(c => batch.set(doc(db, "users", userId, "caixa_categories", c.id), c, { merge: true }));
        }
        await batch.commit();
    },

    factoryReset: async (userId: string) => {
        const collections = ["bets", "gains", "bookmakers", "statuses", "promotions", "origins", "settings", "caixa_accounts", "caixa_movements", "caixa_categories"];
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

    // --- Media (Firestore-based Storage - FREE) ---
    uploadImage: async (userId: string, parentId: string, data: Blob | string, type: 'bets' | 'gains' = 'bets'): Promise<string> => {
        // Se já for uma URL (ex: carregando aposta existente), não faz nada
        if (typeof data === 'string' && data.startsWith('http')) return data;

        const uploadToFirestore = async (): Promise<string> => {
            try {
                const photoId = `ph_${Date.now()}_${Math.max(0, Math.floor(Math.random() * 1000000))}`;
                const photoRef = doc(db, "users", userId, type, parentId, "photos", photoId);

                let uint8Array: Uint8Array;

                if (data instanceof Blob) {
                    const arrayBuffer = await data.arrayBuffer();
                    uint8Array = new Uint8Array(arrayBuffer);
                } else if (typeof data === 'string' && data.startsWith('data:')) {
                    // Converter dataUrl para Uint8Array
                    const base64 = data.split(',')[1];
                    const binaryString = window.atob(base64);
                    uint8Array = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        uint8Array[i] = binaryString.charCodeAt(i);
                    }
                } else {
                    throw new Error("Formato de imagem inválido para Firestore");
                }

                // Salva no Firestore (Tamanho máximo do documento: 1MB)
                await withTimeout(
                    setDoc(photoRef, {
                        data: Bytes.fromUint8Array(uint8Array),
                        createdAt: Timestamp.now()
                    }),
                    60000,
                    "Upload de Foto (Firestore)"
                );

                console.info(`[Firestore] Foto ${photoId} salva com sucesso.`);
                return photoId; // Agora o identificador é o ID do documento
            } catch (error) {
                console.error("[Firestore] Erro ao salvar foto no Firestore:", error);
                throw error;
            }
        };

        return uploadToFirestore();
    },

    getPhotoData: async (userId: string, parentId: string, photoId: string, type: 'bets' | 'gains' = 'bets'): Promise<string | null> => {
        try {
            const photoRef = doc(db, "users", userId, type, parentId, "photos", photoId);
            const snap = await getDoc(photoRef);

            if (!snap.exists()) return null;

            const data = snap.data();
            if (!data.data) return null;

            // Converter Uint8Array de volta para Blob/URL
            const blob = new Blob([data.data.toUint8Array()], { type: 'image/webp' });
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error("[Firestore] Erro ao buscar foto:", error);
            return null;
        }
    },

    clearLocalCache: async () => {
        console.warn("[Firestore] Iniciando limpeza de cache local...");

        // Timeout de segurança: Se o Firebase travar, recarregamos de qualquer jeito após 3s
        const safetyTimeout = setTimeout(() => {
            console.error("[Firestore] Limpeza travou. Forçando recarregamento...");
            window.location.reload();
        }, 3000);

        try {
            console.log("[Firestore] Terminando instância...");
            await terminate(db);
            console.log("[Firestore] Limpando IndexedDB...");
            await clearIndexedDbPersistence(db);
            console.log("[Firestore] Cache limpo com sucesso!");
            clearTimeout(safetyTimeout);
            window.location.reload();
        } catch (error) {
            console.error("[Firestore] Erro ao limpar cache:", error);
            clearTimeout(safetyTimeout);
            window.location.reload();
        }
    },

    // --- Bloco de Notas ---
    subscribeToNotes: (userId: string, callback: (notes: NotepadNote[], isSyncing: boolean) => void) => {
        const q = query(collection(db, "users", userId, "notes"), orderBy("createdAt", "desc"));
        return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotepadNote));
            callback(notes, snapshot.metadata.hasPendingWrites);
        });
    },

    saveNote: async (userId: string, note: NotepadNote) => {
        await withTimeout(
            setDoc(doc(db, "users", userId, "notes", note.id), note, { merge: true }),
            30000,
            "Salvamento de Nota (setDoc)"
        );
    },

    deleteNote: async (userId: string, noteId: string) => {
        await withTimeout(
            deleteDoc(doc(db, "users", userId, "notes", noteId)),
            30000,
            "Exclusão de Nota (deleteDoc)"
        );
    }
};
