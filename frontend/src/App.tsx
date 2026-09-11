import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { useRouter } from "./router";
import { fetchItems, Item } from "./services/api";
import { AddView } from "./views/AddView";
import { AskAiView } from "./views/AskAiView";
import { DashboardView } from "./views/DashboardView";
import { ItemDetailView } from "./views/ItemDetailView";
import { LibraryView } from "./views/LibraryView";

export default function App() {
  const { route, navigate } = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const data = await fetchItems();
      setItems(data);
    } catch {
      // API unavailable or starting up
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchItems()
      .then((data) => {
        if (!ignore) {
          setItems(data);
          setLoadingItems(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setLoadingItems(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="app-layout">
      <Sidebar currentRoute={route} onNavigate={navigate} />

      <div className="app-main-wrapper">
        <TopBar onNavigate={navigate} />

        <main className="app-main-content">
          {route.name === "home" && (
            <DashboardView
              items={items}
              loadingItems={loadingItems}
              onRefresh={loadItems}
              onNavigate={navigate}
            />
          )}

          {route.name === "add" && (
            <AddView onIngested={loadItems} onNavigate={navigate} />
          )}

          {route.name === "library" && (
            <LibraryView
              items={items}
              loadingItems={loadingItems}
              onRefresh={loadItems}
              onNavigate={navigate}
            />
          )}

          {route.name === "item-detail" && (
            <ItemDetailView id={route.id} items={items} onNavigate={navigate} />
          )}

          {route.name === "query" && (
            <AskAiView
              initialQuestion={route.initialQuestion}
              onNavigate={navigate}
            />
          )}
        </main>
      </div>
    </div>
  );
}
