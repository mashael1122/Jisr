import { NavLink, useNavigate } from "react-router-dom"
import { useUser } from "../UserContext"
import { supabase } from "../lib/supabase"
import logo from "../assets/jisr-logo.png.png"

function Sidebar() {
  const navigate = useNavigate()
  const { user } = useUser()

  const email = user?.email || "User"

  const displayName =
    user?.user_metadata?.full_name ||
    email.split("@")[0]

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/auth")
  }

  return (
    <aside className="sidebar">

      <div className="brand">
        <div className="brand-mark">
         <img src={logo} alt="Jisr logo" />
       </div>

       <div>
          <h2>Jisr</h2>
         <span>Career Navigation</span>
        </div>
      </div>


      <nav className="sidebar-nav">

        <NavLink
          to="/"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          Dashboard
        </NavLink>


        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          Profile
        </NavLink>


        <NavLink
          to="/career-goal"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          Career Goal
        </NavLink>


        <NavLink
          to="/roadmap"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          Roadmap
        </NavLink>


        <NavLink
          to="/advisor"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          AI Advisor
        </NavLink>

      </nav>


      <div className="sidebar-footer">

        <div className="user-card">

          <div className="avatar">
            {initials}
          </div>

          <div className="sidebar-user-info">
            <strong>
              {displayName}
            </strong>

            <span>
              {email}
            </span>
          </div>

        </div>


        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Log out
        </button>

      </div>

    </aside>
  )
}

export default Sidebar