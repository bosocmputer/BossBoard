/**
 * lib/client-profiles.ts
 *
 * JSON-file-backed CRUD for client profiles.
 * Stored at ~/.bossboard/client-profiles.json
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

export interface ClientProfile {
  id: string;
  name: string;
  taxId?: string; // เลขประจำตัวผู้เสียภาษี 13 หลัก
  businessType?: string; // e.g. "บริษัทจำกัด", "ห้างหุ้นส่วนจำกัด"
  vatRegistered?: boolean;
  fiscalYearEnd?: string; // e.g. "31 ธันวาคม"
  accountingStandard?: "TFRS" | "NPAEs"; // มาตรฐานการบัญชี
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

const DATA_DIR = path.join(os.homedir(), ".bossboard");
const DATA_FILE = path.join(DATA_DIR, "client-profiles.json");

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAll(): ClientProfile[] {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ClientProfile[];
  } catch {
    return [];
  }
}

function writeAll(profiles: ClientProfile[]): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(profiles, null, 2), "utf-8");
}

export function listClientProfiles(): ClientProfile[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getClientProfile(id: string): ClientProfile | null {
  return readAll().find((p) => p.id === id) ?? null;
}

export function createClientProfile(
  data: Omit<ClientProfile, "id" | "createdAt" | "updatedAt">
): ClientProfile {
  const profiles = readAll();
  const now = new Date().toISOString();
  const profile: ClientProfile = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  profiles.push(profile);
  writeAll(profiles);
  return profile;
}

export function updateClientProfile(
  id: string,
  data: Partial<Omit<ClientProfile, "id" | "createdAt">>
): ClientProfile | null {
  const profiles = readAll();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  profiles[idx] = { ...profiles[idx], ...data, updatedAt: new Date().toISOString() };
  writeAll(profiles);
  return profiles[idx];
}

export function deleteClientProfile(id: string): boolean {
  const profiles = readAll();
  const filtered = profiles.filter((p) => p.id !== id);
  if (filtered.length === profiles.length) return false;
  writeAll(filtered);
  return true;
}
