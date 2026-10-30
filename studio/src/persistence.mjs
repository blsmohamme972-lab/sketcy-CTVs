import { snapshot, validateProject } from "./model.mjs";
const DB = "sketcy-studio-v1",
  STORE = "documents";
let dbPromise;
function database() {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(new Error("Close another Studio tab to unlock local recovery."));
  }));
}
export async function recover() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get("latest");
    r.onsuccess = () => {
      try {
        if (r.result) validateProject(r.result.project);
        resolve(r.result ?? null);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
  });
}
async function persist(project) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(
      { project, savedAt: new Date().toISOString() },
      "latest",
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Local save was aborted."));
  });
}
export class Autosave {
  constructor(onStatus) {
    this.onStatus = onStatus;
    this.timer = null;
    this.revision = 0;
    this.chain = Promise.resolve();
    this.pending = null;
  }
  schedule(project) {
    const revision = ++this.revision;
    clearTimeout(this.timer);
    this.pending = snapshot(project);
    this.onStatus("pending");
    this.timer = setTimeout(() => this.flush(revision), 500);
  }
  flush(revision = this.revision) {
    clearTimeout(this.timer);
    if (!this.pending) return this.chain;
    const p = this.pending;
    this.pending = null;
    this.chain = this.chain
      .catch(() => {})
      .then(() => persist(p))
      .then(() => {
        if (revision === this.revision) this.onStatus("saved");
      })
      .catch((e) => {
        if (revision === this.revision) this.onStatus("error", e);
      });
    return this.chain;
  }
}
