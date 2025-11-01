// lib/data.ts
// localStorage'da kullanıcıya özel verileri güvenle saklama / okuma yardımcıları.

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

// İsim alanı: aynı origin'deki farklı projeler çakışmasın
const NAMESPACE = "todoapp";

// Tarayıcı + storage erişimi kontrolü (Safari private vb. durumlar için güvenli)
function storageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasStorage = storageAvailable();

// Tarayıcı dışı durumda veya storage hatasında düşeceğimiz in-memory yedek
const memoryStore = new Map<string, string>();

const buildKey = (userId: string, dataType: string) =>
  `${NAMESPACE}:${userId}:${dataType}`;

// Güvenli (de)seryalizasyon
function safeStringify(v: unknown): string | null {
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Derin kopya (dışarıya mutable referans kaçırmamak için)
// lib/data.ts — clone() fonksiyonunu güncelle
function clone<T>(v: T): T {
  const sc = (globalThis as any).structuredClone as undefined | ((x: unknown) => unknown);
  if (typeof sc === "function") return sc(v) as T;
  const s = safeStringify(v);
  return s ? (JSON.parse(s) as T) : v;
}


export const dataUtils = {
  /**
   * Kullanıcı verisi kaydet.
   *
   * @param userId - benzersiz kullanıcı id
   * @param dataType - "tasks" | "projects" | "templates" gibi tip adı
   * @param data - JSON serileştirilebilir veri
   */
  saveUserData(userId: string, dataType: string, data: JsonValue | unknown) {
    const key = buildKey(userId, dataType);
    const payload = safeStringify(data);
    if (!payload) return; // stringify hatasında sessiz çık

    try {
      if (hasStorage) {
        window.localStorage.setItem(key, payload);
      } else {
        memoryStore.set(key, payload);
      }
    } catch {
      // QuotaExceededError veya başka bir hata: memory fallback
      memoryStore.set(key, payload);
    }
  },

  /**
   * Kullanıcı verisi oku. Bulunamazsa güvenli bir varsayılan döner.
   * Varsayılan olarak `[]` döner (uygulamanın mevcut beklentisini korur).
   */
  getUserData<T = unknown>(userId: string, dataType: string, fallback?: T): T {
    const key = buildKey(userId, dataType);
    try {
      const raw = hasStorage ? window.localStorage.getItem(key) : memoryStore.get(key) ?? null;
      const parsed = safeParse<T>(raw);
      // Mevcut uygulama beklediği gibi: tanımsızda [] döndür.
      if (parsed == null) {
        // Sağlanmışsa özel fallback; yoksa boş dizi
        return (fallback ?? ([] as unknown as T));
      }
      // Dışarıya kopya ver (mutasyon yayılmasın)
      return clone(parsed);
    } catch {
      return (fallback ?? ([] as unknown as T));
    }
  },

  /** Belirli bir veri tipini sil. */
  removeUserData(userId: string, dataType: string) {
    const key = buildKey(userId, dataType);
    try {
      if (hasStorage) window.localStorage.removeItem(key);
      memoryStore.delete(key);
    } catch {
      memoryStore.delete(key);
    }
  },

  /** Kullanıcının tüm dataType anahtarlarını temizle. */
  clearAllForUser(userId: string) {
    try {
      const prefix = `${NAMESPACE}:${userId}:`;
      if (hasStorage) {
        const toRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(prefix)) toRemove.push(k);
        }
        toRemove.forEach((k) => window.localStorage.removeItem(k));
      }
      // memory fallback'i de temizle
      [...memoryStore.keys()].forEach((k) => {
        if (k.startsWith(prefix)) memoryStore.delete(k);
      });
    } catch {
      // no-op
    }
  },

  /** Kullanıcı için mevcut dataType listesini döndür (ör. debug / göç amaçlı). */
  listDataTypes(userId: string): string[] {
    const prefix = `${NAMESPACE}:${userId}:`;
    const set = new Set<string>();
    try {
      if (hasStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            set.add(k.slice(prefix.length));
          }
        }
      }
      for (const k of memoryStore.keys()) {
        if (k.startsWith(prefix)) set.add(k.slice(prefix.length));
      }
    } catch {
      // no-op
    }
    return [...set];
  },
};
