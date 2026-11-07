import { useLayoutEffect, useRef, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MovieProvider } from './context/MovieContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Footer from './components/Footer';
import ProjectedBlack from './components/ProjectedBlack';
import { markPage } from './hooks/trail';
import { SITE, SITE_TITLE } from './hooks/usePageTitle';

// Home is the way in, so it ships with the app; every other room is its own
// chunk, so a first visit downloads one room rather than all fourteen.
const rooms = {
  Admission: () => import('./pages/Admission'),
  About: () => import('./pages/About'),
  Explore: () => import('./pages/Explore'),
  MovieDetail: () => import('./pages/MovieDetail'),
  Profile: () => import('./pages/Profile'),
  Directors: () => import('./pages/Directors'),
  DirectorDetail: () => import('./pages/DirectorDetail'),
  Movements: () => import('./pages/Movements'),
  MovementDetail: () => import('./pages/MovementDetail'),
  Studios: () => import('./pages/Studios'),
  StudioDetail: () => import('./pages/StudioDetail'),
  Recommendations: () => import('./pages/Recommendations'),
  NotFound: () => import('./pages/NotFound').then(m => ({ default: m.PageNotFound })),
};
const Admission = lazy(rooms.Admission);
const About = lazy(rooms.About);
const Explore = lazy(rooms.Explore);
const MovieDetail = lazy(rooms.MovieDetail);
const Profile = lazy(rooms.Profile);
const Directors = lazy(rooms.Directors);
const DirectorDetail = lazy(rooms.DirectorDetail);
const Movements = lazy(rooms.Movements);
const MovementDetail = lazy(rooms.MovementDetail);
const Studios = lazy(rooms.Studios);
const StudioDetail = lazy(rooms.StudioDetail);
const Recommendations = lazy(rooms.Recommendations);
const PageNotFound = lazy(rooms.NotFound);

// Once the first room is up, fetch the rest while the browser is idle, so
// walking between rooms never waits on the network (and the Directors
// opening's morph into a director's page finds that page ready).
const FetchOtherRooms = () => {
  useEffect(() => {
    const all = () => Object.values(rooms).forEach(load => load().catch(() => { /* fetched again on visit */ }));
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(all, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(all, 2500);
    return () => clearTimeout(id);
  }, []);
  return null;
};


// a page you open starts at its top; Back and Forward are left to each page, which puts you back
// where you were (Home and Explore keep their own note of it). A change within a page (Explore's
// filters) isn't a new page.
const ArriveAtTop = () => {
  const { pathname } = useLocation();
  const navigation = useNavigationType();
  const last = useRef(pathname);
  useLayoutEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    if (navigation !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigation]);
  return null;
};

// every step of the tab's history goes on the trail, so a Back button can name it: a new page, and
// a change within one (Explore's choices keep their own address, under the same title); a page whose
// title comes later (a film, once loaded) puts it there itself (usePageTitle)
const MarkTrail = () => {
  const location = useLocation();
  useEffect(() => {
    markPage({ path: location.pathname, title: document.title === SITE_TITLE ? null : document.title.replace(` · ${SITE}`, '') });
  }, [location]);
  return null;
};

function AppRoutes() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-gold selection:text-black overflow-x-clip">
      <ArriveAtTop />
      <MarkTrail />
      <FetchOtherRooms />
      {/* for the keyboard: straight past the navbar to the page */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:px-4 focus:py-3 focus:bg-gold focus:text-black font-label text-[13px] tracking-[0.14em] uppercase">Skip to the page</a>
      <ProjectedBlack />
      <Navbar />
      <main id="main" tabIndex={-1} className="relative z-10 outline-none">
        {/* a room still on its way holds the screen dark, so the footer doesn't jump up */}
        <Suspense fallback={<div className="min-h-screen" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Admission scene="in" />} />
          <Route path="/register" element={<Admission scene="join" />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/directors" element={<Directors />} />
          <Route path="/directors/:id" element={<DirectorDetail />} />
          <Route path="/movements" element={<Movements />} />
          <Route path="/movements/:slug" element={<MovementDetail />} />
          <Route path="/studios" element={<Studios />} />
          <Route path="/studios/:slug" element={<StudioDetail />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<PageNotFound />} />

          {/* (for everyone: signed out, it's made from what this browser kept) */}
          <Route path="/profile" element={<Profile />} />

        </Routes>
        </Suspense>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <MovieProvider>
          <AppRoutes />
        </MovieProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
