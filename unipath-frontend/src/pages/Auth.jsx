import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import logo from "../assets/jisr-logo.png.png"

function Auth() {
  const navigate = useNavigate()

  const [mode, setMode] = useState("login")

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: ""
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setLoading(true)
      setMessage("")

      // =========================
      // SIGN UP
      // =========================
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.full_name
            }
          }
        })

        if (error) {
          throw error
        }

        const newUser = data.user

        if (newUser) {
          const profileResponse = await fetch(
            "http://127.0.0.1:8000/profile",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                user_id: newUser.id,
                full_name: form.full_name,
                major: "",
                university: "",
                bio: ""
              })
            }
          )

          if (!profileResponse.ok) {
            console.error(
              "Profile creation failed:",
              await profileResponse.text()
            )
          }

          if (data.session) {
             navigate("/onboarding")
             return
          }
        }

        setMessage(
          "Account created successfully. You can now sign in."
        )

        setForm({
          full_name: "",
          email: "",
          password: ""
        })

        return
      }

      // =========================
      // SIGN IN
      // =========================

      const { error } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        })

      if (error) {
        throw error
      }

      const {
  data: { user }
} = await supabase.auth.getUser()

if (!user) {
  throw new Error("User not found")
}

const profileResponse = await fetch(
  `http://127.0.0.1:8000/profile/${user.id}`
)

if (!profileResponse.ok) {
  throw new Error("Could not load profile")
}

const profile = await profileResponse.json()

if (profile.onboarding_completed) {
  navigate("/")
} else {
  navigate("/onboarding")
}

    } catch (error) {
      console.error(error)
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">

      <section className="auth-brand-panel">

        <div className="auth-brand">

          <div className="brand-mark auth-brand-mark">
            <img src={logo} alt="Jisr logo" />
          </div>

          <div>
            <h2>Jisr</h2>
            <span>Career Intelligence</span>
          </div>

        </div>


        <div className="auth-brand-copy">

          <p className="card-label">
            Build your career with clarity
          </p>

          <h1>
            Turn your skills into a path forward.
          </h1>

          <p>
            Jisr analyzes your current skills, career goal,
            readiness and roadmap to help you make smarter
            career decisions.
          </p>

        </div>


        <div className="auth-feature-list">
          <span>Career readiness analysis</span>
          <span>Personalized skill roadmap</span>
          <span>AI-powered career recommendations</span>
        </div>

      </section>


      <section className="auth-form-panel">

        <div className="auth-form-card">

          <div className="auth-heading">

            <p className="card-label">
              {mode === "login"
                ? "Welcome back"
                : "Create your account"}
            </p>

            <h2>
              {mode === "login"
                ? "Sign in to Jisr"
                : "Start your career journey"}
            </h2>

            <p>
              {mode === "login"
                ? "Continue building your personalized career roadmap."
                : "Create an account to build your personalized career profile."}
            </p>

          </div>


          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            {mode === "signup" && (
              <div className="profile-field">

                <label>
                  Full name
                </label>

                <input
                  type="text"
                  name="full_name"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                />

              </div>
            )}


            <div className="profile-field">

              <label>
                Email address
              </label>

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />

            </div>


            <div className="profile-field">

              <label>
                Password
              </label>

              <input
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
                minLength="6"
                required
              />

            </div>


            {message && (
              <div className="auth-message">
                {message}
              </div>
            )}


            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>

          </form>


          <div className="auth-switch">

            <span>
              {mode === "login"
                ? "New to Jisr?"
                : "Already have an account?"}
            </span>

            <button
              type="button"
              onClick={() => {
                setMessage("")
                setMode(
                  mode === "login"
                    ? "signup"
                    : "login"
                )
              }}
            >
              {mode === "login"
                ? "Create account"
                : "Sign in"}
            </button>

          </div>

        </div>

      </section>

    </div>
  )
}

export default Auth