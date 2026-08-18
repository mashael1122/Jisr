import { useEffect, useState } from "react"
import { useUser } from "../UserContext"   

function Roadmap() {
  const { userId } = useUser()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  async function loadRoadmap() {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/user/roadmap/${userId}`
      )

      if (!response.ok) {
        throw new Error("Failed to load roadmap")
      }

      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return
    loadRoadmap()
  }, [userId])

  async function updateStatus(id, status) {
    try {
      setUpdatingId(id)

      const response = await fetch(
        `http://127.0.0.1:8000/user/roadmap/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status
          })
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update roadmap")
      }

      await loadRoadmap()
    } catch (error) {
      console.error(error)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="roadmap-loading">
        Loading your roadmap...
      </div>
    )
  }

  return (
    <div className="roadmap-page">

      <section className="roadmap-intro">
        <div>
          <p className="card-label">Career Roadmap</p>
          <h2>Your next skills, prioritized.</h2>
          <p>
            Complete each skill to improve your career readiness
            and move closer to your target role.
          </p>
        </div>
      </section>

      <section className="roadmap-list">
        {items.map((item, index) => {
          const skillName = item.skills?.name || "Skill"

          return (
            <article
              className={`roadmap-item ${item.status}`}
              key={item.id}
            >
              <div className="roadmap-number">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="roadmap-main">
                <div className="roadmap-title-row">
                  <div>
                    <h3>{skillName}</h3>
                    <span className="priority-label">
                      Priority {item.priority}
                    </span>
                  </div>

                  <span className={`roadmap-status ${item.status}`}>
                    {item.status === "completed"
                      ? "Completed"
                      : item.status === "in_progress"
                      ? "In progress"
                      : "Not started"}
                  </span>
                </div>

                <div className="roadmap-actions">
                  <button
                    className={
                      item.status === "not_started"
                        ? "roadmap-action active"
                        : "roadmap-action"
                    }
                    onClick={() =>
                      updateStatus(item.id, "not_started")
                    }
                    disabled={updatingId === item.id}
                  >
                    Not started
                  </button>

                  <button
                    className={
                      item.status === "in_progress"
                        ? "roadmap-action active"
                        : "roadmap-action"
                    }
                    onClick={() =>
                      updateStatus(item.id, "in_progress")
                    }
                    disabled={updatingId === item.id}
                  >
                    In progress
                  </button>

                  <button
                    className={
                      item.status === "completed"
                        ? "roadmap-action active completed"
                        : "roadmap-action"
                    }
                    onClick={() =>
                      updateStatus(item.id, "completed")
                    }
                    disabled={updatingId === item.id}
                  >
                    Completed
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </section>

    </div>
  )
}

export default Roadmap