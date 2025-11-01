// lib/auth.ts
// Kullanıcı girişi, kaydı ve oturum yönetimi. Güvenli parse + tipler + validasyon.

export type User = {
  id: string;
  username: string;
  email: string;
  password: string;      // Örnek uygulama için düz saklanıyor
  createdAt: string;
  updatedAt?: string;
};

// UI tarafında localStorage'da tutulan, şifresi olmayan oturum kullanıcısı
export type SessionUser = Omit<User, "password">;

type AuthOk = { success: true; user: User };
type AuthErr = { success: false; error: string };
export type AuthResult = AuthOk | AuthErr;

const USERS_KEY = "users";
const CURRENT_USER_KEY = "currentUser";

const hasWindow = () => typeof window !== "undefined";

function readUsers(): User[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as User[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
}

function emailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const authUtils = {
  // Artık SessionUser alıyor (şifreyi currentUser'da tutmuyoruz)
  saveUser(user: SessionUser) {
    if (!hasWindow()) return;
    try {
      window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch {}
  },

  // currentUser okurken de SessionUser döner
  getCurrentUser(): SessionUser | null {
    if (!hasWindow()) return null;
    try {
      const raw = window.localStorage.getItem(CURRENT_USER_KEY);
      if (!raw) return null;
      const u = JSON.parse(raw) as SessionUser;
      if (!u || typeof u !== "object" || !("id" in u)) return null;
      return u;
    } catch {
      return null;
    }
  },

  logout() {
    if (!hasWindow()) return;
    try {
      window.localStorage.removeItem(CURRENT_USER_KEY);
    } catch {}
  },

  async register(username: string, email: string, password: string): Promise<AuthResult> {
    if (!hasWindow()) return { success: false, error: "localStorage is not available" };

    const uname = (username ?? "").trim();
    const eml = normalizeEmail(email ?? "");
    const pw = (password ?? "").trim();

    if (!uname) return { success: false, error: "Username is required" };
    if (!emailValid(eml)) return { success: false, error: "Invalid email address" };
    if (pw.length < 6) return { success: false, error: "Password must be at least 6 characters" };

    const users = readUsers();
    const exists = users.some((u) => normalizeEmail(u.email) === eml);
    if (exists) return { success: false, error: "User already exists" };

    const newUser: User = {
      id: Date.now().toString(),
      username: uname,
      email: eml,
      password: pw,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);
    return { success: true, user: newUser };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    if (!hasWindow()) return { success: false, error: "localStorage is not available" };

    const eml = normalizeEmail(email ?? "");
    const pw = (password ?? "").trim();

    if (!emailValid(eml)) return { success: false, error: "Invalid email address" };
    if (!pw) return { success: false, error: "Password is required" };

    const users = readUsers();
    const user = users.find((u) => normalizeEmail(u.email) === eml && u.password === pw);
    if (!user) return { success: false, error: "Invalid credentials" };

    return { success: true, user };
  },

  // İsteğe bağlı yardımcılar
  updateUser(userId: string, patch: Partial<Omit<User, "id" | "createdAt">>): SessionUser | null {
    const users = readUsers();
    const i = users.findIndex((u) => u.id === userId);
    if (i === -1) return null;

    const updated: User = {
      ...users[i],
      ...patch,
      updatedAt: new Date().toISOString(),
      ...(patch.email ? { email: normalizeEmail(patch.email) } : null),
    } as User;

    users[i] = updated;
    writeUsers(users);

    const session: SessionUser = { id: updated.id, username: updated.username, email: updated.email, createdAt: updated.createdAt, updatedAt: updated.updatedAt };
    const currentRaw = hasWindow() ? window.localStorage.getItem(CURRENT_USER_KEY) : null;
    if (currentRaw) this.saveUser(session);

    return session;
  },

  listUsers(): User[] {
    return readUsers();
  },
};
