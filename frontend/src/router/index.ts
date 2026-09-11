import { useCallback, useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "library" }
  | { name: "item-detail"; id: string }
  | { name: "add" }
  | { name: "query"; initialQuestion?: string };

export function parseRoute(pathname: string, search: string): Route {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search);

  if (cleanPath === "/" || cleanPath === "") {
    return { name: "home" };
  }

  if (cleanPath === "/library") {
    return { name: "library" };
  }

  const libraryDetailMatch = cleanPath.match(/^\/library\/(.+)$/);
  if (libraryDetailMatch && libraryDetailMatch[1]) {
    return {
      name: "item-detail",
      id: decodeURIComponent(libraryDetailMatch[1]),
    };
  }

  if (cleanPath === "/add") {
    return { name: "add" };
  }

  if (cleanPath === "/query") {
    const q = params.get("q") || undefined;
    return { name: "query", initialQuestion: q };
  }

  return { name: "home" };
}

export function navigate(to: string): void {
  if (window.location.pathname + window.location.search === to) return;
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRouter() {
  const [currentPath, setCurrentPath] = useState(
    () => window.location.pathname + window.location.search,
  );
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname, window.location.search),
  );

  useEffect(() => {
    const handleLocationChange = () => {
      const full = window.location.pathname + window.location.search;
      setCurrentPath(full);
      setRoute(parseRoute(window.location.pathname, window.location.search));
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const goTo = useCallback((path: string) => {
    navigate(path);
  }, []);

  return {
    route,
    path: currentPath,
    navigate: goTo,
  };
}
