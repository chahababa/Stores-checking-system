import { describe, expect, it } from "vitest";

import { validateGitHubActionsOidcClaims } from "@/lib/github-actions-oidc";

const baseClaims = {
  iss: "https://token.actions.githubusercontent.com",
  aud: "stores-checking-system-release-announcement",
  repository: "chahababa/Stores-checking-system",
  ref: "refs/heads/main",
  event_name: "push",
  sha: "39e9b36f7391d65f1a72ee64f77af2fa24ddce5c",
};

describe("validateGitHubActionsOidcClaims", () => {
  it("accepts a push token from this repository main branch for the requested commit", () => {
    expect(
      validateGitHubActionsOidcClaims(baseClaims, {
        repository: "chahababa/Stores-checking-system",
        ref: "refs/heads/main",
        commitSha: "39e9b36f7391d65f1a72ee64f77af2fa24ddce5c",
      }),
    ).toEqual({ valid: true });
  });

  it("rejects tokens from other refs or commits", () => {
    expect(
      validateGitHubActionsOidcClaims(
        { ...baseClaims, ref: "refs/heads/feature", sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        {
          repository: "chahababa/Stores-checking-system",
          ref: "refs/heads/main",
          commitSha: "39e9b36f7391d65f1a72ee64f77af2fa24ddce5c",
        },
      ),
    ).toEqual({ valid: false, reason: "unexpected_ref" });
  });
});
