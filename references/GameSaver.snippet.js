// From the Viva code, for reference only:
const GameSaver = (() => {
    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('quest-viva-saves', 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('saves')) {
                    db.createObjectStore('saves', { keyPath: ['gameId', 'slotIndex'] });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function ensurePersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persisted();
            if (isPersisted) {
                console.log('Storage is already persistent.');
                return true;
            }

            const granted = await navigator.storage.persist();
            if (granted) {
                console.log('Storage permission granted: persistent!');
            } else {
                console.warn('Persistent storage request was denied.');
            }
            return granted;
        } else {
            console.warn('StorageManager API not supported.');
            return false;
        }
    }

    async function saveGame(gameId, slotIndex, dataUint8Array, name) {
        const db = await openDatabase();
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');

        const entry = {
            gameId,
            slotIndex,
            data: dataUint8Array,
            name,
            timestamp: new Date()
        };

        store.put(entry);
        
        return tx.complete || tx.done || new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = rej;
        });
    }

    async function listSaves(gameId) {
        const db = await openDatabase();
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');

        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const slots = request.result
                    .filter(entry => entry.gameId === gameId)
                    .map(entry => ({
                        slotIndex: entry.slotIndex,
                        name: entry.name || null,
                        timestamp: entry.timestamp || null,
                    }));

                resolve(slots);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function loadGame(gameId, slotIndex) {
        const db = await openDatabase();
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.get([gameId, slotIndex]);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => reject(request.error);
        });
    }
    
    let persistenceRequested = false;
    
    return {
        save: async () => {
            const saveData = $("#divOutput").html();
            const result = await WebPlayer.uiSaveGame(saveData);
            await saveGame(WebPlayer.gameId, 0, result,
                "Saved game at " + new Date().toISOString().replace('T', ' ').substring(0, 19));
            addText("Game saved.<br>");
            if (!persistenceRequested) {
                await ensurePersistentStorage();
                persistenceRequested = true;
            }
        },
        listSaves: async () => {
            return await listSaves(WebPlayer.gameId);
        },
        load: async(slotIndex) => {
            return await loadGame(WebPlayer.gameId, slotIndex);
        }
    }
})();