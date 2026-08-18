import { BrowserRouter, Routes, Route } from "react-router-dom"

import DashboardLayout from "./layouts/DashboardLayout"

import Dashboard from "./pages/Dashboard"
import AIAdvisor from "./pages/AIAdvisor"
import Roadmap from "./pages/Roadmap"
import Profile from "./pages/Profile"
import CareerGoal from "./pages/CareerGoal"
import Auth from "./pages/Auth"

import ProtectedRoute from "./components/ProtectedRoute"
import { UserProvider } from "./UserContext"

import Onboarding from "./pages/Onboarding"

import "./App.css"


function App() {
  return (
    <BrowserRouter>
      <UserProvider>

        <Routes>

        {/* Login / Sign Up */}
        <Route
          path="/auth"
          element={<Auth />}
        />

        <Route
          path="/onboarding"
          element={
        <ProtectedRoute>
           <Onboarding />
        </ProtectedRoute>
         }
        />


        {/* Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Career Goal */}
        <Route
          path="/career-goal"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CareerGoal />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Roadmap */}
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Roadmap />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* AI Advisor */}
        <Route
          path="/advisor"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AIAdvisor />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

       </Routes>

      </UserProvider>
    </BrowserRouter>
  )
}


export default App