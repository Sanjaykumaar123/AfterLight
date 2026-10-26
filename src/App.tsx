import { useCallback, useEffect, useState } from 'react';
import {
  CelestialTarget,
  CURATED_TARGETS,
  findTargetById,
  searchCuratedTargets,
} from './data/objects';
import { parseCoordinatePair, SkyCoordinates } from './lib/astronomy';
import { AppRoute, Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ExplorerPage, ExplorerTab } from './pages/ExplorerPage';
import { ObservationsPage } from './pages/ObservationsPage';
import { ObjectDetailPage } from './pages/ObjectDetailPage';
import { DiscoveriesPage } from './pages/DiscoveriesPage';
import { AboutPage } from './pages/AboutPage';
import { LenisProvider, useLenisInstance } from './lib/lenisContext';

const DEFAULT_TARGET = CURATED_TARGETS[2]; // WISE 0855

function AppContent() {
  const [route, setRoute] = useState<AppRoute>('home');
  const [selectedObjectId, setSelectedObjectId] = useState<string>(DEFAULT_TARGET.id);
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const lenis = useLenisInstance();

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      lenis?.resize();
    });

    if (pendingAnchor) {
      const el = document.getElementById(pendingAnchor);
      if (el) {
        if (lenis) {
          lenis.scrollTo(el, { offset: -64, duration: 1.1 });
        } else {
          el.scrollIntoView({ behavior: 'smooth' });
        }
        setPendingAnchor(null);
      }
      return () => cancelAnimationFrame(rafId);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
    if (lenis) {
      lenis.scrollTo(0, { immediate: true, force: true });
    }

    return () => cancelAnimationFrame(rafId);
  }, [route, selectedObjectId, pendingAnchor, lenis]);

  // Explorer state
  const [explorerTarget, setExplorerTarget] = useState<CelestialTarget | null>(
    DEFAULT_TARGET
  );
  const [explorerCoords, setExplorerCoords] = useState<SkyCoordinates>({
    raDeg: DEFAULT_TARGET.raDeg,
    decDeg: DEFAULT_TARGET.decDeg,
  });
  const [explorerLabel, setExplorerLabel] = useState<string>(DEFAULT_TARGET.name);
  const [explorerTab, setExplorerTab] = useState<ExplorerTab>('viewer');

  const navigate = useCallback((nextRoute: AppRoute, anchor?: string) => {
    setRoute(nextRoute);
    setPendingAnchor(anchor ?? null);
  }, []);

  const openObjectDetail = useCallback((objectId: string) => {
    setSelectedObjectId(objectId);
    setRoute('detail');
    setPendingAnchor(null);
  }, []);

  const launchExplorer = useCallback(
    (target: CelestialTarget, tab: ExplorerTab = 'viewer') => {
      setExplorerTarget(target);
      setExplorerCoords({ raDeg: target.raDeg, decDeg: target.decDeg });
      setExplorerLabel(target.name);
      setExplorerTab(tab);
      setRoute('explore');
      setPendingAnchor(null);
    },
    []
  );

  const resolveAndOpenQuery = useCallback(
    async (rawQuery: string): Promise<string | null> => {
      const query = rawQuery.trim();
      if (!query) return 'Please enter an object name or coordinate pair.';

      // 1. Check exact or fuzzy curated object matches first
      const localMatches = searchCuratedTargets(query);
      if (localMatches.length > 0) {
        launchExplorer(localMatches[0], 'viewer');
        return null;
      }

      // 2. Check direct J2000 coordinate parsing
      const parsed = parseCoordinatePair(query);
      if (parsed) {
        setExplorerTarget(null);
        setExplorerCoords({ raDeg: parsed.raDeg, decDeg: parsed.decDeg });
        setExplorerLabel(`Sky Region (${parsed.raHms}, ${parsed.decDms})`);
        setExplorerTab('viewer');
        setRoute('explore');
        setPendingAnchor(null);
        return null;
      }

      // 3. Query backend CDS Sesame name resolver
      try {
        const resp = await fetch(
          `/api/archive/resolve?q=${encodeURIComponent(query)}`
        );
        const data = (await resp.json()) as {
          ok: boolean;
          raDeg?: number;
          decDeg?: number;
          name?: string;
          error?: string;
        };
        if (resp.ok && data.ok && typeof data.raDeg === 'number' && typeof data.decDeg === 'number') {
          setExplorerTarget(null);
          setExplorerCoords({ raDeg: data.raDeg, decDeg: data.decDeg });
          setExplorerLabel(data.name || query);
          setExplorerTab('viewer');
          setRoute('explore');
          setPendingAnchor(null);
          return null;
        }
        return (
          data.error ||
          `Could not resolve "${query}". Try a preconfigured target or J2000 coordinates (e.g. "08h55m10.831s -07d14m42.53s").`
        );
      } catch {
        return `Unable to reach object resolver for "${query}". Enter J2000 coordinates (e.g. "08h55m10.831s -07d14m42.53s") or select a Featured Cosmic Object.`;
      }
    },
    [launchExplorer]
  );

  const detailTarget = findTargetById(selectedObjectId) ?? DEFAULT_TARGET;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#202124]">
      <Header
        currentRoute={route}
        onNavigate={(r) => navigate(r)}
        onSearchSubmit={(q) => {
          void resolveAndOpenQuery(q);
        }}
      />

      <div className="flex-1">
        {route === 'home' && (
          <HomePage
            onSelectObject={openObjectDetail}
            onOpenExplorerWithQuery={resolveAndOpenQuery}
            onNavigateExplore={() => navigate('explore')}
          />
        )}

        {route === 'explore' && (
          <ExplorerPage
            initialTarget={explorerTarget}
            initialCoords={explorerCoords}
            initialLabel={explorerLabel}
            initialTab={explorerTab}
            onOpenObjectDetail={openObjectDetail}
          />
        )}

        {route === 'observations' && (
          <ObservationsPage
            onSelectObject={openObjectDetail}
            onExploreObject={(t) => launchExplorer(t, 'viewer')}
          />
        )}

        {route === 'detail' && (
          <ObjectDetailPage
            target={detailTarget}
            onNavigateHome={() => navigate('home')}
            onNavigateObservations={() => navigate('observations')}
            onSelectObject={openObjectDetail}
            onLaunchExplorer={launchExplorer}
          />
        )}

        {route === 'discoveries' && (
          <DiscoveriesPage
            onOpenExplorerRadar={(targetId) => {
              const t = findTargetById(targetId) ?? DEFAULT_TARGET;
              launchExplorer(t, 'radar');
            }}
          />
        )}

        {route === 'about' && (
          <AboutPage onNavigateExplore={() => navigate('explore')} />
        )}
      </div>

      <Footer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <LenisProvider>
      <AppContent />
    </LenisProvider>
  );
}
