import { lazy, Suspense, useContext, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
// Admin dashboard is disabled for now.
// Uncomment this import and the /admin route below when you want it back.
// import AdminDashboard from "./pages/AdminDashboard";
import notificationManager from "./services/NotificationManager";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
const Landing = lazy(() => import("./pages/Landing"));
const MobileSearch = lazy(() => import("./pages/MobileSearch"));
const Profile = lazy(() => import("./pages/Profile"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const SavedRecipes = lazy(() => import("./pages/SavedRecipes"));
const MealPlanner = lazy(() => import("./pages/MealPlanner"));
const GroceryList = lazy(() => import("./pages/GroceryList"));
const MealSettings = lazy(() => import("./pages/MealSettings"));
const DetectIngredients = lazy(() => import("./pages/DetectIngredients"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const Premium = lazy(() => import("./pages/Premium"));

function PageLoader() {
  return (
    <div style={{ padding: "48px", textAlign: "center", fontWeight: 700 }}>
      Loading...
    </div>
  );
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.search]);

  return null;
}

function RootRoute() {
  const { user, token } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    return isMobileUA || isSmallScreen || isStandalone;
  });

  useEffect(() => {
    const handleResize = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
      setIsMobile(isMobileUA || isSmallScreen || isStandalone);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (user && token) {
    return <Navigate to="/home" replace />;
  }

  if (isMobile) {
    return <Login />;
  }

  return <Landing />;
}

export default function App() {
  const { user, token } = useContext(AuthContext);

  useEffect(() => {
    if (user && token) {
      notificationManager.initializeFromSavedSettings(token);
    } else {
      notificationManager.resetInitialization();
    }
  }, [user, token]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* Root route: Desktop shows Landing, Mobile / App shows Login (if logged out) */}
          <Route path="/" element={<RootRoute />} />

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<LegalPage />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/contact" element={<LegalPage />} />
          <Route path="/about" element={<LegalPage />} />

          {/* Protected Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/premium"
            element={
              <ProtectedRoute>
                <Premium />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mobile-search"
            element={
              <ProtectedRoute>
                <MobileSearch />
              </ProtectedRoute>
            }
          />

          {/* AI Search + Saved Recipes */}
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchResults />
              </ProtectedRoute>
            }
          />

          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedRecipes />
              </ProtectedRoute>
            }
          />

          {/* Meal Planning & Grocery */}
          <Route
            path="/meal-planner"
            element={
              <ProtectedRoute>
                <MealPlanner />
              </ProtectedRoute>
            }
          />

          <Route
            path="/grocery-list"
            element={
              <ProtectedRoute>
                <GroceryList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/meal-settings"
            element={
              <ProtectedRoute>
                <MealSettings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/detect"
            element={
              <ProtectedRoute>
                <DetectIngredients />
              </ProtectedRoute>
            }
          />

          {/*
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          */}

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
