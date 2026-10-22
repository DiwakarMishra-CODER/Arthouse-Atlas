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


const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
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
      <ProjectedBlack />
      <Navbar />
      <div className="relative z-10">
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

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

        </Routes>
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
