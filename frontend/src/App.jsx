import { useContext, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import SearchResults from "./pages/SearchResults";
import SavedRecipes from "./pages/SavedRecipes";
import MealPlanner from "./pages/MealPlanner";
import GroceryList from "./pages/GroceryList";
import MealSettings from "./pages/MealSettings";
import DetectIngredients from "./pages/DetectIngredients";
// Admin dashboard is disabled for now.
// Uncomment this import and the /admin route below when you want it back.
// import AdminDashboard from "./pages/AdminDashboard";
import notificationManager from "./services/NotificationManager";

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
      <Routes>

        {/* Redirect to Login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

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
    </BrowserRouter>
  );
}
