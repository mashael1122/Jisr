import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { supabase } from "../lib/supabase"

function DashboardLayout({ children }) {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      setUser(user)
    }

    loadUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/auth")
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-area">
        <Topbar />

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout