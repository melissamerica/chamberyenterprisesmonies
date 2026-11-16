import { QueryClient } from "@tanstack/react-query";
import { createRouter, isRedirect, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it.each(["/", "/anya", "/alec", "/auth", "/app", "/test", "/workspace", "/exec"])("preserves the existing %s destination", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(path);
    expect(matches.at(-1)?.pathname).toBe(path);
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each(["/anya", "/alec", "/app", "/test", "/exec", "/contact", "/pricing", "/security"])("sends shared %s links to the portfolio without authentication", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const match = router.matchRoutes(path).at(-1)!;
    const route = router.routesById[match.routeId];
    expect(route.parentRoute.id).toBe(rootRouteId);
    expect(route.options.beforeLoad).toBeTypeOf("function");
    try {
      (route.options.beforeLoad as () => void)();
      throw new Error("Expected a portfolio redirect");
    } catch (result) {
      expect(isRedirect(result)).toBe(true);
      expect((result as { options: { to: string } }).options.to).toBe("/");
    }
  });

  it("keeps old homepage query links on the portfolio and the workspace behind authentication", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.routesById["/"].options.beforeLoad).toBeUndefined();
    expect(router.routesById["/_authenticated/workspace"].parentRoute.id).toBe("/_authenticated");
    expect(router.routesById["/_authenticated"].options.beforeLoad).toBeTypeOf("function");
    expect(router.routesById["/auth"].options.beforeLoad).toBeUndefined();
    expect(router.routesById["/api/uploads"].options.beforeLoad).toBeUndefined();
  });

  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
