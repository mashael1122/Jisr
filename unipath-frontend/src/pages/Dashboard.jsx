import { useEffect, useState } from "react"
import { useUser } from "../UserContext"

function Dashboard() {
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(true)

  const { userId, loadingUser } = useUser()

  useEffect(() => {
  if (!userId) return
    async function loadReadiness() {
      try {
        const response = await fetch(
          `https://jisr-backend.onrender.com/user/readiness/${userId}`
        )

        if (!response.ok) {
          throw new Error("Failed to load readiness")
        }

        const data = await response.json()
        setReadiness(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadReadiness()
}, [userId])

  const readinessValue = readiness?.readiness || 0
  const matchedSkills = readiness?.matched_skills || []
  const missingSkills = readiness?.missing_skills || []
  const targetJob = readiness?.target_job || "Target role"

  return (
    <div className="dashboard-grid">

      <section className="readiness-card">
        <div className="card-header">
          <div>
            <p className="card-label">Career readiness</p>
            <h2>{targetJob}</h2>
          </div>

          <span className="status-pill">
            {readinessValue >= 70 ? "Strong" : "On track"}
          </span>
        </div>

        <div className="readiness-content">
          <div
            className="readiness-ring"
            style={{
              background: `conic-gradient(
                var(--accent) 0deg ${readinessValue * 3.6}deg,
                #eceef4 ${readinessValue * 3.6}deg 360deg
              )`
            }}
          >
            <div className="ring-inner">
              <strong>
                {loading ? "..." : `${Math.round(readinessValue)}%`}
              </strong>
              <span>ready</span>
            </div>
          </div>

          <div className="readiness-copy">
            <h3>You’re building a solid foundation.</h3>

            <p>
              You currently match {matchedSkills.length} required skills for
              your target role. Keep working through your roadmap to improve
              your readiness.
            </p>

            <button className="text-button">
              View full skill gap →
            </button>
          </div>
        </div>
      </section>


      <section className="mini-card">
        <p className="card-label">Target role</p>

        <h3>{targetJob}</h3>

        <p className="muted">
          Your current career goal
        </p>

        <div className="mini-divider" />

        <span className="small-meta">
          {matchedSkills.length} of{" "}
          {matchedSkills.length + missingSkills.length} skills matched
        </span>
      </section>


      <section className="mini-card">
        <p className="card-label">Current focus</p>

        <h3>
          {missingSkills.length > 0
            ? missingSkills[0]
            : "All skills matched"}
        </h3>

        <p className="muted">
          Highest-priority missing skill
        </p>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${readinessValue}%`
            }}
          />
        </div>

        <span className="small-meta">
          Roadmap in progress
        </span>
      </section>


      <section className="skills-card">
        <div className="card-header">
          <div>
            <p className="card-label">Skill overview</p>
            <h3>Your strongest foundation</h3>
          </div>

          <button className="ghost-button">
            View all
          </button>
        </div>

        <div className="skill-list">
          {matchedSkills.length > 0 ? (
            matchedSkills.map((skill) => (
              <div className="skill-row" key={skill}>
                <span>{skill}</span>
                <strong>Matched</strong>
              </div>
            ))
          ) : (
            <p className="muted">
              No matched skills yet.
            </p>
          )}
        </div>
      </section>


    </div>
  )
}

export default Dashboard