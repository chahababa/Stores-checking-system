export function normalizePathname(pathname: string | null | undefined) {
  if (!pathname) {
    return "/";
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }

  return pathname;
}

export function isNavigationLinkActive(pathname: string | null | undefined, href: string) {
  const currentPathname = normalizePathname(pathname);
  const normalizedHref = normalizePathname(href);

  if (normalizedHref === "/") {
    return currentPathname === "/";
  }

  return currentPathname === normalizedHref || currentPathname.startsWith(`${normalizedHref}/`);
}
