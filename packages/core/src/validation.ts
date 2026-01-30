import { ValidationError } from "./errors.js";

export function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

export function requireNumber(value: unknown, name: string): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw new ValidationError(`${name} must be a valid number`);
  }
  return num;
}

export function optionalString(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

export function optionalNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

export function optionalBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

export function requireOneOf<T extends string>(
  value: unknown,
  name: string,
  options: readonly T[]
): T {
  const str = requireString(value, name);
  if (!options.includes(str as T)) {
    throw new ValidationError(
      `${name} must be one of: ${options.join(", ")}`
    );
  }
  return str as T;
}

export function parseJsonSafe(input: string, name: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    throw new ValidationError(`${name} contains invalid JSON`);
  }
}
