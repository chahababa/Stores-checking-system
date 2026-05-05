import { createPublicKey, createVerify } from "node:crypto";

export const GITHUB_ACTIONS_OIDC_AUDIENCE = "stores-checking-system-release-announcement";

const GITHUB_ACTIONS_ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${GITHUB_ACTIONS_ISSUER}/.well-known/jwks`;

type Claims = Record<string, unknown>;

type ValidationExpectation = {
  repository: string;
  ref: string;
  commitSha: string;
};

export type ClaimsValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function isObject(value: unknown): value is Claims {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJsonPart(value: string): Claims | null {
  try {
    const parsed: unknown = JSON.parse(base64UrlDecode(value).toString("utf8"));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function validateGitHubActionsOidcClaims(
  claims: Claims,
  expected: ValidationExpectation,
): ClaimsValidationResult {
  if (claims.iss !== GITHUB_ACTIONS_ISSUER) {
    return { valid: false, reason: "unexpected_issuer" };
  }

  if (claims.aud !== GITHUB_ACTIONS_OIDC_AUDIENCE) {
    return { valid: false, reason: "unexpected_audience" };
  }

  if (claims.repository !== expected.repository) {
    return { valid: false, reason: "unexpected_repository" };
  }

  if (claims.ref !== expected.ref) {
    return { valid: false, reason: "unexpected_ref" };
  }

  if (claims.event_name !== "push") {
    return { valid: false, reason: "unexpected_event" };
  }

  if (claims.sha !== expected.commitSha) {
    return { valid: false, reason: "unexpected_commit" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === "number" && claims.exp < now) {
    return { valid: false, reason: "expired" };
  }

  if (typeof claims.nbf === "number" && claims.nbf > now + 60) {
    return { valid: false, reason: "not_yet_valid" };
  }

  return { valid: true };
}

async function fetchJwks() {
  const response = await fetch(JWKS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub Actions JWKS: ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isObject(data) || !Array.isArray(data.keys)) {
    throw new Error("Invalid GitHub Actions JWKS response");
  }

  return data.keys.filter(isObject);
}

export async function verifyGitHubActionsOidcToken(
  token: string,
  expected: ValidationExpectation,
): Promise<ClaimsValidationResult> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "malformed_token" };
  }

  const header = readJsonPart(parts[0]);
  const claims = readJsonPart(parts[1]);
  if (!header || !claims) {
    return { valid: false, reason: "malformed_token" };
  }

  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    return { valid: false, reason: "unsupported_token_header" };
  }

  const jwks = await fetchJwks();
  const jwk = jwks.find((key) => key.kid === header.kid);
  if (!jwk) {
    return { valid: false, reason: "unknown_key" };
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();

  const validSignature = verifier.verify(
    createPublicKey({ key: jwk, format: "jwk" }),
    base64UrlDecode(parts[2]),
  );
  if (!validSignature) {
    return { valid: false, reason: "invalid_signature" };
  }

  return validateGitHubActionsOidcClaims(claims, expected);
}
