import { useEffect, useState } from "react"
import { useUser } from "../UserContext"

function Profile() {
  const { userId } = useUser()

  const [profile, setProfile] = useState({
    full_name: "",
    major: "",
    university: "",
    bio: ""
  })

  const [editForm, setEditForm] = useState({
    full_name: "",
    major: "",
    university: "",
    bio: ""
  })

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [toast, setToast] = useState("")

  // Skills
  const [skills, setSkills] = useState([])
  const [allSkills, setAllSkills] = useState([])
  const [selectedSkillIds, setSelectedSkillIds] = useState([])
  const [originalSkillIds, setOriginalSkillIds] = useState([])
  const [managingSkills, setManagingSkills] = useState(false)
  const [savingSkills, setSavingSkills] = useState(false)
  const [customSkillName, setCustomSkillName] = useState("")
  const [customSkillCategory, setCustomSkillCategory] = useState("Technical")
  const [addingCustomSkill, setAddingCustomSkill] = useState(false)

  const [certificates, setCertificates] = useState([])
  const [addingCertificate, setAddingCertificate] = useState(false)
  const [savingCertificate, setSavingCertificate] = useState(false)

  const [certificateForm, setCertificateForm] = useState({
    name: "",
    issuer: "",
    certificate_url: ""
  })

  // Projects
  const [projects, setProjects] = useState([])
  const [addingProject, setAddingProject] = useState(false)
  const [savingProject, setSavingProject] = useState(false)

  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    project_url: ""
  })

  // =========================================
  // Load Profile
  // =========================================

  useEffect(() => {
  if (!userId) return
    async function loadProfile() {
      try {
        const response = await fetch(
          `https://jisr-backend.onrender.com/profile/${userId}`
        )

        if (!response.ok) {
          throw new Error("Failed to load profile")
        }

        const data = await response.json()

        const loadedProfile = {
          full_name: data.full_name || "",
          major: data.major || "",
          university: data.university || "",
          bio: data.bio || ""
        }

        setProfile(loadedProfile)
        setEditForm(loadedProfile)

      } catch (error) {
        console.error("Profile loading error:", error)
        setMessage("Could not load profile")
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [userId])


  // =========================================
  // Load User Skills
  // =========================================

  async function loadUserSkills() {
    try {
      const response = await fetch(
        `https://jisr-backend.onrender.com/user/skills/${userId}`
      )

      if (!response.ok) {
        throw new Error("Failed to load user skills")
      }

      const data = await response.json()

      setSkills(data)

      const ids = data.map((item) => item.skill_id)

      setSelectedSkillIds(ids)
      setOriginalSkillIds(ids)

    } catch (error) {
      console.error("Skills loading error:", error)
    }
  }


  useEffect(() => {
    loadUserSkills()
  }, [])


  // =========================================
  // Load All Skills
  // =========================================

  async function loadAllSkills() {
    try {
      const response = await fetch(
        "https://jisr-backend.onrender.com/skills"
      )

      if (!response.ok) {
        throw new Error("Failed to load skills")
      }

      const data = await response.json()

      setAllSkills(data)

    } catch (error) {
      console.error("All skills loading error:", error)
    }
  }


  // =========================================
  // Edit Profile
  // =========================================

  function startEditing() {
    setEditForm(profile)
    setMessage("")
    setIsEditing(true)
  }


  function cancelEditing() {
    setEditForm(profile)
    setMessage("")
    setIsEditing(false)
  }


  function handleChange(event) {
    const { name, value } = event.target

    setEditForm((current) => ({
      ...current,
      [name]: value
    }))
  }


  async function saveProfile() {
    try {
      setSaving(true)
      setMessage("")

      const response = await fetch(
        `https://jisr-backend.onrender.com/profile/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(editForm)
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const data = await response.json()

      const updatedProfile =
        Array.isArray(data) && data.length > 0
          ? data[0]
          : editForm

      const cleanProfile = {
        full_name:
          updatedProfile.full_name ?? editForm.full_name,

        major:
          updatedProfile.major ?? editForm.major,

        university:
          updatedProfile.university ?? editForm.university,

        bio:
          updatedProfile.bio ?? editForm.bio
      }

      setProfile(cleanProfile)
      setEditForm(cleanProfile)

      setIsEditing(false)
      setMessage("Profile updated successfully")

    } catch (error) {
      console.error(error)
      setMessage("Could not update profile")
    } finally {
      setSaving(false)
    }
  }


  // =========================================
  // Manage Skills
  // =========================================

  async function openSkillsManager() {
    setMessage("")

    await loadAllSkills()
    await loadUserSkills()

    setManagingSkills(true)
  }


  function closeSkillsManager() {
    setSelectedSkillIds(originalSkillIds)
    setManagingSkills(false)
  }


  function toggleSkill(skillId) {
    setSelectedSkillIds((current) => {
      if (current.includes(skillId)) {
        return current.filter((id) => id !== skillId)
      }

      return [...current, skillId]
    })
  }

  async function addCustomSkill() {
  if (!customSkillName.trim()) {
    setMessage("Please enter a skill name")
    return
  }

  try {
    setAddingCustomSkill(true)
    setMessage("")

    const response = await fetch(
      "https://jisr-backend.onrender.com/user/custom-skill",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          name: customSkillName.trim(),
          category: customSkillCategory
        })
      }
    )

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(detail)
    }

    const data = await response.json()
    const newSkillId = data.skill?.id

if (newSkillId) {
  const weightResponse = await fetch(
    "https://jisr-backend.onrender.com/ai/skill-weight",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: userId,
        skill_id: newSkillId
      })
    }
  )

  if (!weightResponse.ok) {
    console.error(
      "AI weighting failed:",
      await weightResponse.text()
    )
  }
}

    // refresh both lists
    await loadAllSkills()
    await loadUserSkills()

    setCustomSkillName("")
    setCustomSkillCategory("Technical")

    setToast(`✓ ${data.skill?.name || "Skill"} added successfully`)

    setTimeout(() => {
       setToast("")
    }, 2500)

  } catch (error) {
    console.error("Custom skill error:", error)
    setMessage("Could not add custom skill")
  } finally {
    setAddingCustomSkill(false)
  }
}
  async function saveSkills() {
    try {
      setSavingSkills(true)
      setMessage("")

      const skillsToAdd = selectedSkillIds.filter(
        (id) => !originalSkillIds.includes(id)
      )

      const skillsToDelete = originalSkillIds.filter(
        (id) => !selectedSkillIds.includes(id)
      )

      // Add new skills
      for (const skillId of skillsToAdd) {
        const response = await fetch(
          "https://jisr-backend.onrender.com/user/skills",
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

        if (!response.ok) {
          const detail = await response.text()
          throw new Error(detail)
        }
      }

      // Delete removed skills
      for (const skillId of skillsToDelete) {
        const response = await fetch(
          `https://jisr-backend.onrender.com/user/skills/${userId}/${skillId}`,
          {
            method: "DELETE"
          }
        )

        if (!response.ok) {
          const detail = await response.text()
          throw new Error(detail)
        }
      }

      await loadUserSkills()

      setManagingSkills(false)
      setMessage("Skills updated successfully")

    } catch (error) {
      console.error("Skill update error:", error)
      setMessage("Could not update skills")
    } finally {
      setSavingSkills(false)
    }
  }




  // =========================================
  // Certificates
  // =========================================

  async function loadCertificates() {
    try {
      const response = await fetch(
        `https://jisr-backend.onrender.com/user/certificates/${userId}`
      )

      if (!response.ok) {
        throw new Error("Failed to load certificates")
      }

      const data = await response.json()
      setCertificates(data)

    } catch (error) {
      console.error("Certificates loading error:", error)
    }
  }


  useEffect(() => {
    loadCertificates()
  }, [])


  function openCertificateForm() {
    setCertificateForm({
      name: "",
      issuer: "",
      certificate_url: ""
    })

    setMessage("")
    setAddingCertificate(true)
  }


  function closeCertificateForm() {
    setAddingCertificate(false)

    setCertificateForm({
      name: "",
      issuer: "",
      certificate_url: ""
    })
  }


  function handleCertificateChange(event) {
    const { name, value } = event.target

    setCertificateForm((current) => ({
      ...current,
      [name]: value
    }))
  }


  async function saveCertificate() {
    if (!certificateForm.name.trim()) {
      setMessage("Certificate name is required")
      return
    }

    try {
      setSavingCertificate(true)
      setMessage("")

      const response = await fetch(
        "https://jisr-backend.onrender.com/user/certificates",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: userId,
            name: certificateForm.name.trim(),
            issuer: certificateForm.issuer.trim() || null,
            certificate_url:
              certificateForm.certificate_url.trim() || null
          })
        }
      )

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail)
      }

      await loadCertificates()

      setAddingCertificate(false)

      setCertificateForm({
        name: "",
        issuer: "",
        certificate_url: ""
      })

      setMessage("Certificate added successfully")

    } catch (error) {
      console.error("Certificate save error:", error)
      setMessage("Could not add certificate")
    } finally {
      setSavingCertificate(false)
    }
  }


  async function deleteCertificate(certificateId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this certificate?"
    )

    if (!confirmed) {
      return
    }

    try {
      setMessage("")

      const response = await fetch(
        `https://jisr-backend.onrender.com/user/certificates/${certificateId}`,
        {
          method: "DELETE"
        }
      )

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail)
      }

      await loadCertificates()

      setMessage("Certificate deleted successfully")

    } catch (error) {
      console.error("Certificate delete error:", error)
      setMessage("Could not delete certificate")
    }
  }


  // =========================================
  // Projects
  // =========================================

  async function loadProjects() {
    try {
      const response = await fetch(
        `https://jisr-backend.onrender.com/user/projects/${userId}`
      )
      if (!response.ok) throw new Error("Failed to load projects")
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error("Projects loading error:", error)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  function openProjectForm() {
    setProjectForm({ title: "", description: "", project_url: "" })
    setMessage("")
    setAddingProject(true)
  }

  function closeProjectForm() {
    setAddingProject(false)
    setProjectForm({ title: "", description: "", project_url: "" })
  }

  function handleProjectChange(event) {
    const { name, value } = event.target
    setProjectForm((current) => ({ ...current, [name]: value }))
  }

  async function saveProject() {
    if (!projectForm.title.trim()) {
      setMessage("Project title is required")
      return
    }

    try {
      setSavingProject(true)
      setMessage("")

      const response = await fetch(
        "https://jisr-backend.onrender.com/user/projects",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            title: projectForm.title.trim(),
            description: projectForm.description.trim() || null,
            project_url: projectForm.project_url.trim() || null
          })
        }
      )

      if (!response.ok) throw new Error(await response.text())

      await loadProjects()
      setAddingProject(false)
      setProjectForm({ title: "", description: "", project_url: "" })
      setMessage("Project added successfully")
    } catch (error) {
      console.error("Project save error:", error)
      setMessage("Could not add project")
    } finally {
      setSavingProject(false)
    }
  }

  async function deleteProject(projectId) {
    if (!window.confirm("Are you sure you want to delete this project?")) return

    try {
      setMessage("")
      const response = await fetch(
        `https://jisr-backend.onrender.com/user/projects/${projectId}`,
        { method: "DELETE" }
      )
      if (!response.ok) throw new Error(await response.text())
      await loadProjects()
      setMessage("Project deleted successfully")
    } catch (error) {
      console.error("Project delete error:", error)
      setMessage("Could not delete project")
    }
  }


  // =========================================
  // Initials
  // =========================================

  const initials =
    profile.full_name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DU"


  // =========================================
  // Loading
  // =========================================

  if (loadingProfile) {
    return (
      <div className="roadmap-loading">
        Loading your profile...
      </div>
    )
  }


  // =========================================
  // Page
  // =========================================

  return (
    <div className="profile-page">
      {toast && (
        <div className="success-toast">
         {toast}
        </div>
      )}
      <section className="profile-hero">

        <div className="profile-avatar">
          {initials}
        </div>

        <div>
          <p className="card-label">
            Profile
          </p>

          <h2>
            {profile.full_name}
          </h2>

          <p>
            {profile.major} · {profile.university}
          </p>
        </div>

        {!isEditing && (
          <button
            className="secondary-button profile-edit-button"
            onClick={startEditing}
          >
            Edit profile
          </button>
        )}

      </section>


      {message && (
        <div className="profile-message">
          {message}
        </div>
      )}


      {/* EDIT PROFILE */}

      {isEditing && (
        <section className="profile-card profile-edit-panel">

          <div className="card-header">
            <div>
              <p className="card-label">
                Edit profile
              </p>

              <h3>
                Update your information
              </h3>
            </div>
          </div>


          <div className="profile-form-grid">

            <div className="profile-field">
              <label>Full name</label>

              <input
                type="text"
                name="full_name"
                value={editForm.full_name}
                onChange={handleChange}
              />
            </div>


            <div className="profile-field">
              <label>Major</label>

              <input
                type="text"
                name="major"
                value={editForm.major}
                onChange={handleChange}
              />
            </div>


            <div className="profile-field">
              <label>University</label>

              <input
                type="text"
                name="university"
                value={editForm.university}
                onChange={handleChange}
              />
            </div>


            <div className="profile-field profile-field-full">
              <label>Bio</label>

              <textarea
                name="bio"
                value={editForm.bio}
                onChange={handleChange}
                rows="4"
              />
            </div>

          </div>


          <div className="profile-form-actions">

            <button
              className="secondary-button"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

          </div>

        </section>
      )}


      {/* MANAGE SKILLS */}

      {managingSkills && (
        <div className="skills-modal-backdrop">

          <div className="skills-modal">

            <div className="skills-modal-header">

              <div>
                <p className="card-label">
                  Manage skills
                </p>

                <h2>
                  What skills do you have?
                </h2>

                <p>
                  Select the skills that best represent your
                  current experience.
                </p>
              </div>

              <button
                className="skills-close"
                onClick={closeSkillsManager}
              >
                ×
              </button>

            </div>

            <div className="custom-skill-box">

  <div>
    <p className="card-label">
      Can't find your skill?
    </p>

    <h3>
      Add a custom skill
    </h3>
  </div>


  <div className="custom-skill-form">

    <select
      value={customSkillCategory}
      onChange={(event) =>
        setCustomSkillCategory(event.target.value)
      }
    >
      <option value="Technical">
        Technical
      </option>

      <option value="Business">
        Business
      </option>

      <option value="Soft">
        Soft
      </option>
    </select>


    <input
      type="text"
      placeholder="e.g. Tableau"
      value={customSkillName}
      onChange={(event) =>
        setCustomSkillName(event.target.value)
      }
    />


    <button
      type="button"
      className="secondary-button"
      onClick={addCustomSkill}
      disabled={addingCustomSkill}
    >
      {addingCustomSkill
        ? "Adding..."
        : "Add skill"}
    </button>

  </div>

</div>
            <div className="skills-selection-grid">

              {allSkills.map((skill) => {
                const selected =
                  selectedSkillIds.includes(skill.id)

                return (
                  <button
                    key={skill.id}
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


            <div className="skills-modal-footer">

              <span>
                {selectedSkillIds.length} skills selected
              </span>

              <div>
                <button
                  className="secondary-button"
                  onClick={closeSkillsManager}
                  disabled={savingSkills}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  onClick={saveSkills}
                  disabled={savingSkills}
                >
                  {savingSkills
                    ? "Saving..."
                    : "Save skills"}
                </button>
              </div>

            </div>

          </div>

        </div>
      )}




      {/* ADD CERTIFICATE */}

      {addingCertificate && (
        <div className="skills-modal-backdrop">

          <div className="certificate-modal">

            <div className="skills-modal-header">

              <div>
                <p className="card-label">
                  New certificate
                </p>

                <h2>Add a certificate</h2>

                <p>
                  Add a professional certification or learning achievement.
                </p>
              </div>

              <button
                className="skills-close"
                onClick={closeCertificateForm}
              >
                ×
              </button>

            </div>


            <div className="certificate-form">

              <div className="profile-field">
                <label>Certificate name *</label>

                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Advanced Agentic AI"
                  value={certificateForm.name}
                  onChange={handleCertificateChange}
                />
              </div>


              <div className="profile-field">
                <label>Issuing organization</label>

                <input
                  type="text"
                  name="issuer"
                  placeholder="e.g. Saudi Digital Academy"
                  value={certificateForm.issuer}
                  onChange={handleCertificateChange}
                />
              </div>


              <div className="profile-field">
                <label>Credential URL</label>

                <input
                  type="url"
                  name="certificate_url"
                  placeholder="https://..."
                  value={certificateForm.certificate_url}
                  onChange={handleCertificateChange}
                />
              </div>

            </div>


            <div className="certificate-modal-footer">

              <button
                className="secondary-button"
                onClick={closeCertificateForm}
                disabled={savingCertificate}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={saveCertificate}
                disabled={savingCertificate}
              >
                {savingCertificate
                  ? "Adding..."
                  : "Add certificate"}
              </button>

            </div>

          </div>

        </div>
      )}


      {/* ADD PROJECT */}

      {addingProject && (
        <div className="skills-modal-backdrop">
          <div className="certificate-modal">
            <div className="skills-modal-header">
              <div>
                <p className="card-label">New project</p>
                <h2>Add a project</h2>
                <p>Add a portfolio project that demonstrates your skills and experience.</p>
              </div>
              <button className="skills-close" onClick={closeProjectForm}>×</button>
            </div>

            <div className="certificate-form">
              <div className="profile-field">
                <label>Project title *</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Customer Analytics Dashboard"
                  value={projectForm.title}
                  onChange={handleProjectChange}
                />
              </div>

              <div className="profile-field">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Briefly describe what you built and the value of the project."
                  value={projectForm.description}
                  onChange={handleProjectChange}
                  rows="4"
                />
              </div>

              <div className="profile-field">
                <label>Project URL</label>
                <input
                  type="url"
                  name="project_url"
                  placeholder="https://github.com/..."
                  value={projectForm.project_url}
                  onChange={handleProjectChange}
                />
              </div>
            </div>

            <div className="certificate-modal-footer">
              <button
                className="secondary-button"
                onClick={closeProjectForm}
                disabled={savingProject}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={saveProject}
                disabled={savingProject}
              >
                {savingProject ? "Adding..." : "Add project"}
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="profile-grid">

        {/* ABOUT */}

        <section className="profile-card">

          <p className="card-label">
            About
          </p>

          <h3>
            Personal information
          </h3>

          <div className="profile-info-list">

            <div className="profile-info-row">
              <span>Full name</span>
              <strong>{profile.full_name}</strong>
            </div>

            <div className="profile-info-row">
              <span>Major</span>
              <strong>{profile.major}</strong>
            </div>

            <div className="profile-info-row">
              <span>University</span>
              <strong>{profile.university}</strong>
            </div>

          </div>

          <div className="profile-bio">
            <span>Bio</span>
            <p>{profile.bio}</p>
          </div>

        </section>


        {/* SKILLS */}

        <section className="profile-card">

          <div className="card-header">

            <div>
              <p className="card-label">
                Skills
              </p>

              <h3>
                Your current skill set
              </h3>
            </div>

            <button
              className="ghost-button"
              onClick={openSkillsManager}
            >
              Manage
            </button>

          </div>


          <div className="profile-tags">

            {skills.length > 0 ? (
              skills.map((item) => (
                <span key={item.skill_id}>
                  {item.skills?.name || "Skill"}
                </span>
              ))
            ) : (
              <p className="muted">
                No skills added yet.
              </p>
            )}

          </div>

        </section>


        {/* CERTIFICATES */}

        <section className="profile-card">

          <div className="card-header">

            <div>
              <p className="card-label">
                Certificates
              </p>

              <h3>
                Learning achievements
              </h3>
            </div>

            <button
              className="ghost-button"
              onClick={openCertificateForm}
            >
              Add certificate
            </button>

          </div>


          <div className="profile-list">

            {certificates.length > 0 ? (
              certificates.map((certificate) => (

                <div
                  className="certificate-list-item"
                  key={certificate.id}
                >

                  <div className="certificate-info">

                    <strong>
                      {certificate.name}
                    </strong>

                    <span>
                      {certificate.issuer || "No issuer"}
                    </span>

                    {certificate.certificate_url && (
                      <a
                        href={certificate.certificate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="certificate-link"
                      >
                        View credential ↗
                      </a>
                    )}

                  </div>


                  <button
                    className="certificate-delete"
                    onClick={() =>
                      deleteCertificate(certificate.id)
                    }
                  >
                    Delete
                  </button>

                </div>

              ))
            ) : (

              <div className="profile-empty-state">
                <p>No certificates added yet.</p>

                <button
                  className="text-button"
                  onClick={openCertificateForm}
                >
                  Add your first certificate →
                </button>
              </div>

            )}

          </div>

        </section>


        {/* PROJECTS */}

        <section className="profile-card">
          <div className="card-header">
            <div>
              <p className="card-label">Projects</p>
              <h3>Portfolio projects</h3>
            </div>

            <button className="ghost-button" onClick={openProjectForm}>
              Add project
            </button>
          </div>

          <div className="profile-list">
            {projects.length > 0 ? (
              projects.map((project) => (
                <div className="certificate-list-item" key={project.id}>
                  <div className="certificate-info">
                    <strong>{project.title}</strong>

                    {project.description && (
                      <span>{project.description}</span>
                    )}

                    {project.project_url && (
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noreferrer"
                        className="certificate-link"
                      >
                        View project ↗
                      </a>
                    )}
                  </div>

                  <button
                    className="certificate-delete"
                    onClick={() => deleteProject(project.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <div className="profile-empty-state">
                <p>No projects added yet.</p>
                <button className="text-button" onClick={openProjectForm}>
                  Add your first project →
                </button>
              </div>
            )}
          </div>
        </section>

      </div>

    </div>
  )
}

export default Profile