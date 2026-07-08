/**
 * db.ts — A tiny, zero-dependency JSON database.
 * Runs entirely on the local filesystem so the app works with no external
 * services, no Docker, no API keys. Good for a showcase / self-hosted demo.
 * (For production you would swap this for Postgres/SQLite — the interface is
 * intentionally small.)
 */
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface UsageEntry {
  id: string;
  userId: string;
  /** ISO date (YYYY-MM-DD) the usage is attributed to */
  date: string;
  /** how many prompts were logged in this entry */
  prompts: number;
  energyWh: number;
  waterMl: number;
  co2g: number;
  regionId: string;
  createdAt: string;
}

interface DBShape {
  users: User[];
  usage: UsageEntry[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY_DB: DBShape = { users: [], usage: [] };

/** Simple in-process write queue so concurrent writes don't clobber each other. */
let writeChain: Promise<unknown> = Promise.resolve();

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

async function read(): Promise<DBShape> {
  await ensureFile();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DBShape>;
    return { users: parsed.users ?? [], usage: parsed.usage ?? [] };
  } catch {
    return { ...EMPTY_DB };
  }
}

/** Serialised read-modify-write to keep the JSON file consistent. */
function mutate<T>(fn: (db: DBShape) => { db: DBShape; result: T }): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await read();
    const { db: next, result } = fn(db);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(next, null, 2), "utf8");
    return result;
  };
  const p = writeChain.then(run, run);
  // keep the chain alive but don't let a rejection break future writes
  writeChain = p.then(
    () => undefined,
    () => undefined,
  );
  return p;
}

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/* --------------------------------- users -------------------------------- */

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await read();
  const target = email.trim().toLowerCase();
  return db.users.find((u) => u.email === target);
}

export async function getUserById(userId: string): Promise<User | undefined> {
  const db = await read();
  return db.users.find((u) => u.id === userId);
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  return mutate((db) => {
    const email = input.email.trim().toLowerCase();
    if (db.users.some((u) => u.email === email)) {
      throw new Error("EMAIL_TAKEN");
    }
    const user: User = {
      id: id(),
      name: input.name.trim(),
      email,
      passwordHash: input.passwordHash,
      createdAt: now(),
    };
    return { db: { ...db, users: [...db.users, user] }, result: user };
  });
}

/* --------------------------------- usage -------------------------------- */

export async function addUsage(input: {
  userId: string;
  date: string;
  prompts: number;
  energyWh: number;
  waterMl: number;
  co2g: number;
  regionId: string;
}): Promise<UsageEntry> {
  return mutate((db) => {
    const entry: UsageEntry = {
      id: id(),
      createdAt: now(),
      ...input,
    };
    return { db: { ...db, usage: [...db.usage, entry] }, result: entry };
  });
}

export async function getUsageForUser(userId: string): Promise<UsageEntry[]> {
  const db = await read();
  return db.usage
    .filter((u) => u.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
