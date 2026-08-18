import { useEffect, useState } from "react"
import { useUser } from "../UserContext"

function CareerGoal() {
  const { userId } = useUser()

  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [currentJob, setCurrentJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!userId) return
    async function loadCareerGoal() {
      try {
        const jobsResponse = await fetch(
          "http://127.0.0.1:8000/jobs"
        )

        const currentResponse = await fetch(
          `http://127.0.0.1:8000/user/target-job/${userId}`
        )

        if (!jobsResponse.ok || !currentResponse.ok) {
          throw new Error("Failed to load career goal")
        }

        const jobsData = await jobsResponse.json()
        const currentData = await currentResponse.json()

        setJobs(jobsData)

        if (currentData.job_id) {
          setSelectedJobId(currentData.job_id)
          setCurrentJob(currentData.job)
        }

      } catch (error) {
        console.error(error)
        setMessage("Could not load career goal")
      } finally {
        setLoading(false)
      }
    }

    loadCareerGoal()
  }, [userId])


  async function saveCareerGoal() {
    if (!selectedJobId) {
      setMessage("Please select a career goal")
      return
    }

    try {
      setSaving(true)
      setMessage("")

      const response = await fetch(
        "http://127.0.0.1:8000/user/target-job",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: userId,
            job_id: selectedJobId
          })
        }
      )

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const selectedJob = jobs.find(
        (job) => job.id === selectedJobId
      )

      setCurrentJob(selectedJob)
      setMessage("Career goal updated successfully")

    } catch (error) {
      console.error(error)
      setMessage("Could not update career goal")
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="roadmap-loading">
        Loading career goals...
      </div>
    )
  }


  return (
    <div className="career-goal-page">

      <section className="career-goal-hero">

        <div>
          <p className="card-label">
            Career Goal
          </p>

          <h2>
            Choose where you want to go next.
          </h2>

          <p>
            Select the role you want to target.
            Jisr will calculate your readiness and
            personalize your roadmap around that goal.
          </p>
        </div>

        {currentJob && (
          <div className="current-goal-card">
            <span>Current goal</span>
            <strong>{currentJob.title}</strong>
          </div>
        )}

      </section>


      {message && (
        <div className="profile-message">
          {message}
        </div>
      )}


      <section className="career-options-grid">

        {jobs.map((job) => {
          const selected =
            selectedJobId === job.id

          return (
            <button
              key={job.id}
              className={
                selected
                  ? "career-option selected"
                  : "career-option"
              }
              onClick={() =>
                setSelectedJobId(job.id)
              }
            >

              <div className="career-option-top">

                <div className="career-option-icon">
                  {job.title
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)}
                </div>

                <span className="career-radio">
                  {selected ? "✓" : ""}
                </span>

              </div>


              <h3>
                {job.title}
              </h3>

              <p>
                {job.description}
              </p>

            </button>
          )
        })}

      </section>


      <section className="career-save-bar">

        <div>
          <span>
            Selected role
          </span>

          <strong>
            {
              jobs.find(
                (job) =>
                  job.id === selectedJobId
              )?.title || "None"
            }
          </strong>
        </div>

        <button
          className="primary-button"
          onClick={saveCareerGoal}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save career goal"}
        </button>

      </section>

    </div>
  )
}

export default CareerGoal