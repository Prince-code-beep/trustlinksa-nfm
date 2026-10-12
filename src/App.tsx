import { useEffect, useState, type ComponentType } from "react";
import { Route, Switch, Link, useLocation, Router as WouterRouter } from "wouter";
import { modules as discoveredModules } from "./.generated/mockup-components";
type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;
function _resolveComponent(mod: Record<string, unknown>, name: string): ComponentType | undefined {
  const fns = Object.values(mod).filter((v) => typeof v === "function") as ComponentType[];
  return (mod.default as ComponentType) || (mod.Preview as ComponentType) || (mod[name] as ComponentType) || fns[fns.length - 1];
}
function PreviewRenderer({ componentPath, modules }: { componentPath: string; modules: ModuleMap }) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false; setComponent(null); setError(null);
    async function load() {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) { setError(`No component found at ${componentPath}.tsx`); return; }
      try {
        const mod = await loader(); if (cancelled) return;
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) { setError(`No exported React component found in ${componentPath}.tsx`); return; }
        setComponent(() => comp);
      } catch (e) { if (!cancelled) setError(`Failed to load preview.\n${e instanceof Error? e.message : String(e)}`); }
    }
    void load(); return () => { cancelled = true; };
  }, [componentPath, modules]);
  if (error) return <pre style={{ color: "red", padding: "2rem", whiteSpace: "pre-wrap" }}>{error}</pre>;
  if (!Component) return <div className="min-h-screen grid place-items-center text-zinc-400">Loading {componentPath}...</div>;
  return <Component />;
}
function getBasePath() { return import.meta.env.BASE_URL.replace(/\/$/, ""); }
function usePreviewPath() {
  const [path] = useLocation(); const basePath = getBasePath();
  const local = basePath && path.startsWith(basePath)? path.slice(basePath.length) || "/" : path;
  const m = local.match(/^\/preview\/(.+)$/); return m? m[1] : null;
}
function Home() {
  const mockups = Object.keys(discoveredModules).map(k => k.replace("./components/mockups/", "").replace(".tsx",""));
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg"><span className="w-8 h-8 bg-zinc-900 text-white rounded-lg grid place-items-center">TL</span> TrustLink</div>
          <Link href="/track/TL-88421" className="px-4 py-2 bg-zinc-900 text-white rounded-full text-sm">View Demo Tracking</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-bold">TrustLink</h1>
        <p className="text-zinc-500 mt-2">Escrow • Verification • Tracking</p>
        <ul className="mt-6 space-y-1">{mockups.map(m => <li key={m}><Link href={`/preview/${m}`} className="text-sm underline">{m}</Link> — <Link href={`/track/${m}`} className="text-sm text-zinc-500 underline">/track</Link></li>)}</ul>
      </main>
    </div>
  );
}
function AppRoutes() {
  const previewPath = usePreviewPath();
  if (previewPath) return <PreviewRenderer componentPath={previewPath} modules={discoveredModules} />;
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/track/:id?"><PreviewRenderer componentPath="OrderTracking" modules={discoveredModules} /></Route>
      <Route><div className="min-h-screen grid place-items-center"><div className="text-center"><h1 className="text-2xl font-bold">404</h1><Link href="/" className="underline">Home</Link></div></div></Route>
    </Switch>
  );
}
function getRouterBase() { const b = getBasePath(); return b || "/"; }
export default function App() { return <WouterRouter base={getRouterBase()}><AppRoutes /></WouterRouter>; }
