import { useEffect, useState } from "react"
import { useUser } from "../UserContext"

function AIAdvisor() {

  const [advisor, setAdvisor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const { userId } = useUser()

  useEffect(() => {
    if (!userId) return
    async function loadAdvisor() {
      try {
        const response = await fetch(
          `https://jisr-backend.onrender.com/ai/advisor/${userId}`,
          {
            method: "POST"
          }
        )

        if (!response.ok) {
          throw new Error("Failed to load AI recommendations")
        }

        const data = await response.json()
        setAdvisor(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAdvisor()
  }, [userId])

  if (loading) {
    return (
      <div className="advisor-loading">
        <div className="loading-orb">✦</div>
        <h2>Analyzing your career path...</h2>
        <p>Jisr AI is preparing personalized recommendations.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="advisor-error">
        <h2>Couldn’t load recommendations</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="advisor-page">

      <section className="advisor-hero">
        <div className="advisor-icon-large">✦</div>

        <div>
          <p className="card-label">AI Career Advisor</p>
          <h2>Your personalized career strategy</h2>
          <p>
            Recommendations based on your current skills,
            career readiness and target role.
          </p>
        </div>
      </section>


      <section className="advisor-summary-card">
        <p className="card-label">Career assessment</p>
        <h3>Where you stand</h3>

        <p className="advisor-summary">
          {advisor?.summary}
        </p>
      </section>


      <div className="advisor-two-column">

        <section className="advisor-section-card">
          <p className="card-label">Priority skills</p>
          <h3>Focus here next</h3>

          <div className="priority-list">
            {advisor?.priority_skills?.map((skill, index) => (
              <div className="priority-item" key={skill}>
                <span className="priority-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span>{skill}</span>
              </div>
            ))}
          </div>
        </section>


        <section className="advisor-project-card">
          <div className="project-badge">
            Recommended project
          </div>

          <h3>
            {advisor?.recommended_project?.title}
          </h3>

          <p>
            {advisor?.recommended_project?.description}
          </p>

          <div className="project-skills">
            {advisor?.recommended_project?.skills_practiced?.map(
              (skill) => (
                <span key={skill}>
                  {skill}
                </span>
              )
            )}
          </div>
        </section>

      </div>


      <section className="next-steps-card">
        <div>
          <p className="card-label">Action plan</p>
          <h3>Your next steps</h3>
        </div>

        <div className="next-steps-list">
          {advisor?.next_steps?.map((step, index) => (
            <div className="next-step" key={index}>
              <div className="step-check">
                {index + 1}
              </div>

              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

export default AIAdvisor