import { useLayoutEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MovieProvider } from './context/MovieContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Admission from './pages/Admission';
import About from './pages/About';
import Footer from './components/Footer';
import Explore from './pages/Explore';
import MovieDetail from './pages/MovieDetail';
import Profile from './pages/Profile';

import Directors from './pages/Directors';
import DirectorDetail from './pages/DirectorDetail';
import Movements from './pages/Movements';
import MovementDetail from './pages/MovementDetail';
import Studios from './pages/Studios';
import StudioDetail from './pages/StudioDetail';
import Recommendations from './pages/Recommendations';
import ProjectedBlack from './components/ProjectedBlack';
import Leader from './components/Leader';
import { PageNotFound } from './pages/NotFound';


const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Leader label="Checking it’s you" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location.pathname }} />;
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

function AppRoutes() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-gold selection:text-black overflow-x-clip">
      <ArriveAtTop />
      {/* for the keyboard: straight past the navbar to the page */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:px-4 focus:py-3 focus:bg-gold focus:text-black font-label text-[13px] tracking-[0.14em] uppercase">Skip to the page</a>
      <ProjectedBlack />
      <Navbar />
      <main id="main" tabIndex={-1} className="relative z-10 outline-none">
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

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

        </Routes>
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
