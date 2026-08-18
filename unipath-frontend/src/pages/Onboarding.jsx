import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../UserContext"

function Onboarding() {
  const navigate = useNavigate()
  const { userId, user } = useUser()

  const [step, setStep] = useState(1)

  const [profileForm, setProfileForm] = useState({
    major: "",
    university: "",
    bio: ""
  })

  const [allSkills, setAllSkills] = useState([])
  const [selectedSkillIds, setSelectedSkillIds] = useState([])

  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")


  useEffect(() => {
    if (!userId) return

    async function loadOnboardingData() {
      try {
        const [profileResponse, skillsResponse, jobsResponse] =
          await Promise.all([
            fetch(`http://127.0.0.1:8000/profile/${userId}`),
            fetch("http://127.0.0.1:8000/skills"),
            fetch("http://127.0.0.1:8000/jobs")
          ])

        if (
          !profileResponse.ok ||
          !skillsResponse.ok ||
          !jobsResponse.ok
        ) {
          throw new Error("Failed to load onboarding data")
        }

        const profileData = await profileResponse.json()
        const skillsData = await skillsResponse.json()
        const jobsData = await jobsResponse.json()

        setProfileForm({
          major: profileData.major || "",
          university: profileData.university || "",
          bio: profileData.bio || ""
        })

        setAllSkills(skillsData)
        setJobs(jobsData)

      } catch (error) {
        console.error(error)
        setMessage("Could not load onboarding")
      } finally {
        setLoading(false)
      }
    }

    loadOnboardingData()
  }, [userId])


  function handleProfileChange(event) {
    const { name, value } = event.target

    setProfileForm((current) => ({
      ...current,
      [name]: value
    }))
  }


  function toggleSkill(skillId) {
    setSelectedSkillIds((current) => {
      if (current.includes(skillId)) {
        return current.filter((id) => id !== skillId)
      }

      return [...current, skillId]
    })
  }


  function nextStep() {
    setMessage("")

    if (step === 1) {
      if (
        !profileForm.major.trim() ||
        !profileForm.university.trim()
      ) {
        setMessage("Please add your major and university")
        return
      }
    }

    setStep((current) => Math.min(current + 1, 3))
  }


  function previousStep() {
    setMessage("")
    setStep((current) => Math.max(current - 1, 1))
  }


  async function finishOnboarding() {
    if (!selectedJobId) {
      setMessage("Please select a career goal")
      return
    }

    try {
      setSaving(true)
      setMessage("")

      // 1. Update profile
      const profileResponse = await fetch(
        `http://127.0.0.1:8000/profile/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            major: profileForm.major.trim(),
            university: profileForm.university.trim(),
            bio: profileForm.bio.trim()
          })
        }
      )

      if (!profileResponse.ok) {
        throw new Error("Failed to update profile")
      }


      // 2. Add selected skills
      for (const skillId of selectedSkillIds) {
        const skillResponse = await fetch(
          "http://127.0.0.1:8000/user/skills",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              user_id: userId,
              skill_id: skillId,
              proficiency: "Intermediate",
              source: "Manual"
            })
          }
        )

        if (!skillResponse.ok) {
          throw new Error("Failed to save skills")
        }
      }


      // 3. Save career goal
      // This will also generate the roadmap
      const targetResponse = await fetch(
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

      if (!targetResponse.ok) {
        throw new Error("Failed to save career goal")
      }
      if (!targetResponse.ok) {
  throw new Error("Failed to save career goal")
}

const onboardingResponse = await fetch(
  `http://127.0.0.1:8000/profile/${userId}/onboarding-complete`,
  {
    method: "PATCH"
  }
)

if (!onboardingResponse.ok) {
  throw new Error("Failed to complete onboarding")
}

navigate("/")

      navigate("/")

    } catch (error) {
      console.error(error)
      setMessage("Could not complete onboarding")
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="roadmap-loading">
        Preparing your Jisr experience...
      </div>
    )
  }


  return (
    <div className="onboarding-page">

      <div className="onboarding-shell">

        <div className="onboarding-top">

          <div>
            <p className="card-label">
              Welcome to Jisr
            </p>

            <h1>
              Build your career path.
            </h1>

            <p>
              Tell us a little about yourself so Jisr can
              personalize your readiness, roadmap and recommendations.
            </p>
          </div>


          <div className="onboarding-progress">
            <span className={step >= 1 ? "active" : ""}>1</span>
            <div />
            <span className={step >= 2 ? "active" : ""}>2</span>
            <div />
            <span className={step >= 3 ? "active" : ""}>3</span>
          </div>

        </div>


        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}


        {/* STEP 1 */}

        {step === 1 && (
          <section className="onboarding-card">

            <p className="card-label">
              Step 1 of 3
            </p>

            <h2>
              Tell us about yourself
            </h2>

            <p className="muted">
              We already have your name
              {user?.user_metadata?.full_name
                ? `, ${user.user_metadata.full_name}.`
                : "."}
            </p>


            <div className="onboarding-form">

              <div className="profile-field">
                <label>Major *</label>

                <input
                  type="text"
                  name="major"
                  placeholder="e.g. Information Systems"
                  value={profileForm.major}
                  onChange={handleProfileChange}
                />
              </div>


              <div className="profile-field">
                <label>University *</label>

                <input
                  type="text"
                  name="university"
                  placeholder="e.g. King Saud University"
                  value={profileForm.university}
                  onChange={handleProfileChange}
                />
              </div>


              <div className="profile-field">
                <label>Short bio</label>

                <textarea
                  name="bio"
                  rows="4"
                  placeholder="Tell us briefly about your interests..."
                  value={profileForm.bio}
                  onChange={handleProfileChange}
                />
              </div>

            </div>

          </section>
        )}


        {/* STEP 2 */}

        {step === 2 && (
          <section className="onboarding-card">

            <p className="card-label">
              Step 2 of 3
            </p>

            <h2>
              What skills do you already have?
            </h2>

            <p className="muted">
              Select everything that represents your current experience.
              You can change these later.
            </p>


            <div className="skills-selection-grid">

              {allSkills.map((skill) => {
                const selected =
                  selectedSkillIds.includes(skill.id)

                return (
                  <button
                    key={skill.id}
                    type="button"
                    className={
                      selected
                        ? "skill-option selected"
                        : "skill-option"
                    }
                    onClick={() =>
                      toggleSkill(skill.id)
                    }
                  >
                    <span>
                      {skill.name}
                    </span>

                    <span className="skill-option-check">
                      {selected ? "✓" : "+"}
                    </span>
                  </button>
                )
              })}

            </div>

          </section>
        )}


        {/* STEP 3 */}

        {step === 3 && (
          <section className="onboarding-card">

            <p className="card-label">
              Step 3 of 3
            </p>

            <h2>
              Where do you want to go?
            </h2>

            <p className="muted">
              Choose your target role. Jisr will use it to calculate
              your readiness and build your roadmap.
            </p>


            <div className="career-options-grid onboarding-jobs">

              {jobs.map((job) => {
                const selected =
                  selectedJobId === job.id

                return (
                  <button
                    key={job.id}
                    type="button"
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

                    {job.description && (
                      <p>
                        {job.description}
                      </p>
                    )}

                  </button>
                )
              })}

            </div>

          </section>
        )}


        <div className="onboarding-actions">

          {step > 1 ? (
            <button
              className="secondary-button"
              onClick={previousStep}
              disabled={saving}
            >
              Back
            </button>
          ) : (
            <div />
          )}


          {step < 3 ? (
            <button
              className="primary-button"
              onClick={nextStep}
            >
              Continue
            </button>
          ) : (
            <button
              className="primary-button"
              onClick={finishOnboarding}
              disabled={saving}
            >
              {saving
                ? "Building your path..."
                : "Build my path"}
            </button>
          )}

        </div>

      </div>

    </div>
  )
}

export default Onboarding