import requests
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from database import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_SERVICE_KEY,
    GEMINI_API_KEY
)

from models import (
    ProfileCreate,
    UserSkillCreate,
    TargetJobCreate,
    RoadmapStatusUpdate,
    ProfileUpdate,
    CertificateCreate,
    ProjectCreate,
    CustomSkillCreate,
    SkillWeightRequest
)

from services import calculate_readiness
from fastapi.middleware.cors import CORSMiddleware
import json
client = genai.Client(api_key=GEMINI_API_KEY)

class RecommendedProject(BaseModel):
    title: str = Field(description="A concise portfolio project title")
    description: str = Field(description="A practical project description")
    skills_practiced: list[str] = Field(description="Skills practiced by the project")


class CareerAdvice(BaseModel):
    summary: str = Field(description="A short assessment of the user's career readiness")
    priority_skills: list[str] = Field(description="The most important missing skills to learn first")
    recommended_project: RecommendedProject
    next_steps: list[str] = Field(description="Three to five concrete next steps")


app = FastAPI(
    title="UniPath API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://jisr-rho.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Supabase Headers
# =========================================================

# Public/read-only requests
PUBLIC_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Backend database operations
SERVICE_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}


gemini_client = genai.Client(api_key=GEMINI_API_KEY)


# =========================================================
# Root
# =========================================================

@app.get("/")
def root():
    return {
        "message": "UniPath API is running"
    }


# =========================================================
# Jobs
# =========================================================

@app.get("/jobs")
def get_jobs():
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/jobs?select=*",
            headers=PUBLIC_HEADERS
        )

        response.raise_for_status()
        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# Skills
# =========================================================

@app.get("/skills")
def get_skills():
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/skills?select=*",
            headers=PUBLIC_HEADERS
        )

        response.raise_for_status()
        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# Profile
# =========================================================

@app.post("/profile")
def create_profile(profile: ProfileCreate):
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json={
                "id": profile.user_id,
                "full_name": profile.full_name,
                "major": profile.major,
                "university": profile.university,
                "bio": profile.bio
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# User Skills
# =========================================================

@app.post("/user/skills")
def add_user_skill(skill: UserSkillCreate):
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_skills",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json={
                "user_id": skill.user_id,
                "skill_id": skill.skill_id,
                "proficiency": skill.proficiency,
                "source": skill.source
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# Target Job
# =========================================================

@app.post("/user/target-job")
def set_target_job(target: TargetJobCreate):
    try:
        current_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_target_job"
            f"?user_id=eq.{target.user_id}"
            f"&select=job_id",
            headers=SERVICE_HEADERS
        )

        if not current_response.ok:
            raise HTTPException(
                status_code=current_response.status_code,
                detail=current_response.text
            )

        current_data = current_response.json()
        current_job_id = current_data[0]["job_id"] if current_data else None

        if current_job_id != target.job_id:
            delete_response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/roadmap_items"
                f"?user_id=eq.{target.user_id}",
                headers=SERVICE_HEADERS
            )

            if not delete_response.ok:
                raise HTTPException(
                    status_code=delete_response.status_code,
                    detail=delete_response.text
                )

        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_target_job",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "resolution=merge-duplicates,return=representation"
            },
            json={
                "user_id": target.user_id,
                "job_id": target.job_id
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        roadmap_result = None

        if current_job_id != target.job_id:
            roadmap_result = generate_roadmap(target.user_id)

        return {
            "message": "Career goal updated successfully",
            "target_job": response.json(),
            "roadmap": roadmap_result
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    
@app.get("/user/target-job/{user_id}")
def get_target_job(user_id: str):
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_target_job"
            f"?user_id=eq.{user_id}"
            f"&select=job_id,jobs(id,title)",
            headers=SERVICE_HEADERS
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        data = response.json()

        if not data:
            return {
                "job_id": None,
                "job": None
            }

        return {
            "job_id": data[0]["job_id"],
            "job": data[0]["jobs"]
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =========================================================
# Readiness
# =========================================================

@app.get("/user/readiness/{user_id}")
def get_user_readiness(user_id: str):
    try:

        # =====================================================
        # 1. Get user's target job
        # =====================================================

        target_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_target_job"
            f"?user_id=eq.{user_id}"
            f"&select=job_id,jobs(title)",
            headers=SERVICE_HEADERS
        )

        if not target_response.ok:
            raise HTTPException(
                status_code=target_response.status_code,
                detail=target_response.text
            )

        target_data = target_response.json()

        if not target_data:
            raise HTTPException(
                status_code=404,
                detail="Target job not found for this user"
            )

        job_id = target_data[0]["job_id"]
        job_title = target_data[0]["jobs"]["title"]


        # =====================================================
        # 2. Get base required skills for target job
        # =====================================================

        required_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/job_skills"
            f"?job_id=eq.{job_id}"
            f"&select=skill_id,weight,skills(name)",
            headers=SERVICE_HEADERS
        )

        if not required_response.ok:
            raise HTTPException(
                status_code=required_response.status_code,
                detail=required_response.text
            )

        base_required_skills = required_response.json()


        # =====================================================
        # 3. Get user's current skills
        # =====================================================

        user_skills_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_skills"
            f"?user_id=eq.{user_id}"
            f"&select=skill_id,skills(name,category)",
            headers=SERVICE_HEADERS
        )

        if not user_skills_response.ok:
            raise HTTPException(
                status_code=user_skills_response.status_code,
                detail=user_skills_response.text
            )

        user_skills = user_skills_response.json()

        user_skill_ids = {
            skill["skill_id"]
            for skill in user_skills
        }


        # =====================================================
        # 4. Get AI weights for THIS user's skills
        # =====================================================

        ai_weighted_skills = []

        if user_skill_ids:

            skill_ids_filter = ",".join(
                str(skill_id)
                for skill_id in user_skill_ids
            )

            ai_response = requests.get(
                f"{SUPABASE_URL}/rest/v1/ai_job_skill_weights"
                f"?job_id=eq.{job_id}"
                f"&skill_id=in.({skill_ids_filter})"
                f"&weight=gt.0"
                f"&select=skill_id,weight,reason,confidence,skills(name)",
                headers=SERVICE_HEADERS
            )

            if not ai_response.ok:
                raise HTTPException(
                    status_code=ai_response.status_code,
                    detail=ai_response.text
                )

            ai_weighted_skills = ai_response.json()


        # =====================================================
        # 5. Avoid duplicates
        # =====================================================

        base_skill_ids = {
            skill["skill_id"]
            for skill in base_required_skills
        }

        custom_weighted_skills = []

        for skill in ai_weighted_skills:

            # If this skill is already part of job_skills,
            # use the original job weight instead of counting twice.
            if skill["skill_id"] in base_skill_ids:
                continue

            custom_weighted_skills.append({
                "skill_id": skill["skill_id"],
                "weight": skill["weight"],
                "skills": {
                    "name": skill["skills"]["name"]
                }
            })


        # =====================================================
        # 6. Calculate base weighted readiness
        # =====================================================

        base_total_weight = sum(
            skill["weight"]
            for skill in base_required_skills
        )

        base_matched_weight = sum(
            skill["weight"]
            for skill in base_required_skills
            if skill["skill_id"] in user_skill_ids
        )


        # =====================================================
        # 7. Add relevant custom skill weights
        # =====================================================

        custom_weight = sum(
            skill["weight"]
            for skill in custom_weighted_skills
        )

        total_weight = (
            base_total_weight
            + custom_weight
        )

        matched_weight = (
            base_matched_weight
            + custom_weight
        )

        if total_weight == 0:
            readiness = 0
        else:
            readiness = round(
                (matched_weight / total_weight) * 100,
                1
            )


        # =====================================================
        # 8. Build matched + missing lists
        # =====================================================

        matched_skills = []
        missing_skills = []

        for skill in base_required_skills:

            skill_name = skill["skills"]["name"]

            if skill["skill_id"] in user_skill_ids:
                matched_skills.append(skill_name)
            else:
                missing_skills.append(skill_name)


        # Relevant custom skills are matched by definition,
        # because these AI weights were generated for skills
        # already added by the user.
        custom_matched_skills = []

        for skill in custom_weighted_skills:

            skill_name = skill["skills"]["name"]

            matched_skills.append(skill_name)
            custom_matched_skills.append(skill_name)


        # =====================================================
        # 9. Return result
        # =====================================================

        return {
            "target_job": job_title,
            "readiness": readiness,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "custom_matched_skills": custom_matched_skills,
            "base_matched_weight": base_matched_weight,
            "custom_matched_weight": custom_weight,
            "total_weight": total_weight
        }


    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# Generate Roadmap
# =========================================================

@app.post("/user/roadmap/{user_id}")
def generate_roadmap(user_id: str):
    try:

        # 1. Get target job
        target_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_target_job"
            f"?user_id=eq.{user_id}"
            f"&select=job_id",
            headers=SERVICE_HEADERS
        )

        if not target_response.ok:
            raise HTTPException(
                status_code=target_response.status_code,
                detail=target_response.text
            )

        target_data = target_response.json()

        if not target_data:
            raise HTTPException(
                status_code=404,
                detail="Target job not found"
            )

        job_id = target_data[0]["job_id"]


        # 2. Get required skills
        required_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/job_skills"
            f"?job_id=eq.{job_id}"
            f"&select=skill_id,weight",
            headers=SERVICE_HEADERS
        )

        if not required_response.ok:
            raise HTTPException(
                status_code=required_response.status_code,
                detail=required_response.text
            )

        required_skills = required_response.json()


        # 3. Get current user skills
        user_skills_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_skills"
            f"?user_id=eq.{user_id}"
            f"&select=skill_id",
            headers=SERVICE_HEADERS
        )

        if not user_skills_response.ok:
            raise HTTPException(
                status_code=user_skills_response.status_code,
                detail=user_skills_response.text
            )

        user_skill_ids = {
            item["skill_id"]
            for item in user_skills_response.json()
        }


        # 4. Find missing skills
        missing_skills = [
            skill
            for skill in required_skills
            if skill["skill_id"] not in user_skill_ids
        ]

        # Sort missing skills by importance
        missing_skills.sort(
         key=lambda skill: skill["weight"],
         reverse=True
        )


        if not missing_skills:
            return {
                "message": "No missing skills. Roadmap is already complete."
            }


        # 5. Get existing roadmap items
        existing_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/roadmap_items"
            f"?user_id=eq.{user_id}"
            f"&job_id=eq.{job_id}"
            f"&select=skill_id",
            headers=SERVICE_HEADERS
        )

        if not existing_response.ok:
            raise HTTPException(
                status_code=existing_response.status_code,
                detail=existing_response.text
            )

        existing_skill_ids = {
            item["skill_id"]
            for item in existing_response.json()
        }


        # 6. Only create roadmap items that do not already exist
        roadmap_items = []

        for skill in missing_skills:

            if skill["skill_id"] not in existing_skill_ids:
                roadmap_items.append({
                    "user_id": user_id,
                    "job_id": job_id,
                    "skill_id": skill["skill_id"],
                    "status": "not_started",
                    "priority": skill["weight"]
                })


        if not roadmap_items:
            return {
                "message": "Roadmap already exists for this user."
            }


        # 7. Insert roadmap
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/roadmap_items",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json=roadmap_items
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# Get Roadmap
# =========================================================

@app.get("/user/roadmap/{user_id}")
def get_roadmap(user_id: str):
    try:

        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/roadmap_items"
            f"?user_id=eq.{user_id}"
            f"&select=id,status,priority,skill_id,skills(name)"
            f"&order=priority.desc",
            headers=SERVICE_HEADERS
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# Update Roadmap Status
# =========================================================

@app.patch("/user/roadmap/{roadmap_id}")
def update_roadmap_status(
    roadmap_id: int,
    update: RoadmapStatusUpdate
):

    allowed_statuses = {
        "not_started",
        "in_progress",
        "completed"
    }

    if update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid roadmap status"
        )

    try:

        # 1. Get roadmap item
        roadmap_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/roadmap_items"
            f"?id=eq.{roadmap_id}"
            f"&select=id,user_id,skill_id,status",
            headers=SERVICE_HEADERS
        )

        if not roadmap_response.ok:
            raise HTTPException(
                status_code=roadmap_response.status_code,
                detail=roadmap_response.text
            )

        roadmap_data = roadmap_response.json()

        if not roadmap_data:
            raise HTTPException(
                status_code=404,
                detail="Roadmap item not found"
            )

        roadmap_item = roadmap_data[0]

        user_id = roadmap_item["user_id"]
        skill_id = roadmap_item["skill_id"]


        # 2. Prepare update
        update_payload = {
            "status": update.status
        }

        if update.status == "completed":
            update_payload["completed_at"] = datetime.now(
                timezone.utc
            ).isoformat()
        else:
            update_payload["completed_at"] = None


        # 3. Update roadmap item
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/roadmap_items"
            f"?id=eq.{roadmap_id}",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json=update_payload
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )


        # 4. If completed, add skill to user_skills
        if update.status == "completed":

            skill_check = requests.get(
                f"{SUPABASE_URL}/rest/v1/user_skills"
                f"?user_id=eq.{user_id}"
                f"&skill_id=eq.{skill_id}"
                f"&select=id",
                headers=SERVICE_HEADERS
            )

            if not skill_check.ok:
                raise HTTPException(
                    status_code=skill_check.status_code,
                    detail=skill_check.text
                )

            existing_skill = skill_check.json()

            if not existing_skill:

                skill_response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/user_skills",
                    headers={
                        **SERVICE_HEADERS,
                        "Prefer": "return=representation"
                    },
                    json={
                        "user_id": user_id,
                        "skill_id": skill_id,
                        "proficiency": "Beginner",
                        "source": "Roadmap"
                    }
                )

                if not skill_response.ok:
                    raise HTTPException(
                        status_code=skill_response.status_code,
                        detail=skill_response.text
                    )


        return {
            "message": "Roadmap status updated successfully",
            "roadmap_item": response.json()
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =========================================================
# AI Career Advisor
# =========================================================
@app.post("/ai/advisor/{user_id}")
def ai_advisor(user_id: str):
    try:
        # =========================================
        # 1. Get weighted readiness
        # =========================================

        readiness = get_user_readiness(user_id)


        # =========================================
        # 2. Get current target job id
        # =========================================

        target_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_target_job"
            f"?user_id=eq.{user_id}"
            f"&select=job_id",
            headers=SERVICE_HEADERS
        )

        if not target_response.ok:
            raise HTTPException(
                status_code=target_response.status_code,
                detail=target_response.text
            )

        target_data = target_response.json()

        job_id = (
            target_data[0]["job_id"]
            if target_data
            else None
        )


        # =========================================
        # 3. Get current roadmap
        # =========================================

        roadmap_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/roadmap_items"
            f"?user_id=eq.{user_id}"
            f"&select=id,status,priority,skills(name)"
            f"&order=priority.desc",
            headers=SERVICE_HEADERS
        )

        roadmap_items = []

        if roadmap_response.ok:
            roadmap_items = roadmap_response.json()


        roadmap_context = []

        for item in roadmap_items:
            roadmap_context.append({
                "skill": item["skills"]["name"],
                "priority": item["priority"],
                "status": item["status"]
            })


        # =========================================
        # 4. Get AI-weighted custom skills
        # =========================================

        custom_skill_names = readiness.get(
            "custom_matched_skills",
            []
        )

        custom_skill_context = []

        if custom_skill_names and job_id:

            custom_weights_response = requests.get(
                f"{SUPABASE_URL}/rest/v1/ai_job_skill_weights"
                f"?job_id=eq.{job_id}"
                f"&weight=gt.0"
                f"&select=weight,reason,confidence,skills(name)",
                headers=SERVICE_HEADERS
            )

            if custom_weights_response.ok:

                all_weights = custom_weights_response.json()

                for item in all_weights:

                    skill_name = item["skills"]["name"]

                    if skill_name in custom_skill_names:

                        custom_skill_context.append({
                            "skill": skill_name,
                            "weight": item["weight"],
                            "reason": item["reason"],
                            "confidence": item["confidence"]
                        })


        # =========================================
        # 5. Build fallback advice
        # =========================================

        priority_missing = readiness["missing_skills"][:3]

        fallback_advice = {
            "summary": (
                f"You are currently {readiness['readiness']}% ready for the "
                f"{readiness['target_job']} role. Focus on the highest-priority "
                "missing skills while continuing to strengthen your current skills."
            ),

            "priority_skills": priority_missing,

            "recommended_project": {
                "title": f"{readiness['target_job']} Portfolio Project",

                "description": (
                    "Build a practical project that combines your strongest "
                    "current skills with at least two important missing skills."
                ),

                "skills_practiced": priority_missing
            },

            "next_steps": (
                [
                    f"Start working on {skill}."
                    for skill in priority_missing
                ]
                if priority_missing
                else [
                    "Polish your portfolio.",
                    "Prepare role-specific interview examples.",
                    "Apply your skills through a practical project."
                ]
            ),

            "source": "fallback"
        }


        # =========================================
        # 6. Build AI prompt
        # =========================================

        prompt = f"""
You are the AI Career Advisor inside Jisr, a career-readiness platform
for university students and entry-level professionals.

Use ONLY the information provided below.

Do not invent:
- certificates
- work experience
- education
- projects
- skills

TARGET ROLE
{readiness['target_job']}

WEIGHTED CAREER READINESS
{readiness['readiness']}%

CURRENT MATCHED SKILLS
{', '.join(readiness['matched_skills']) or 'None listed'}

MISSING CORE SKILLS
{', '.join(readiness['missing_skills']) or 'None'}

AI-ASSESSED CUSTOM SKILLS
{custom_skill_context if custom_skill_context else 'None'}

CURRENT ROADMAP
{roadmap_context if roadmap_context else 'No roadmap items'}

WEIGHT BREAKDOWN
Base matched weight: {readiness.get('base_matched_weight', 0)}
Custom matched weight: {readiness.get('custom_matched_weight', 0)}
Total evaluated weight: {readiness.get('total_weight', 0)}

INSTRUCTIONS

1. Give a short assessment of the user's current readiness.

2. Prioritize the most important missing skills.

3. Respect roadmap progress:
   - Do not recommend starting a skill already marked completed.
   - If a high-priority skill is not started, prioritize it.
   - If a skill is already in progress, recommend continuing it.

4. Recognize relevant custom skills and explain how they strengthen the profile.

5. Recommend ONE achievable portfolio project.

6. The project should combine:
   - existing strengths
   - important missing skills

7. Give 3 to 5 concrete next steps.

8. Keep the advice realistic for a university student or entry-level candidate.

9. Do not exaggerate readiness or claim that the user is guaranteed to qualify for a job.
"""


        # =========================================
        # 7. Ask Gemini
        # =========================================

        response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.25,
                response_mime_type="application/json",
                response_schema=CareerAdvice
            )
        )


        # =========================================
        # 8. Parse Gemini response
        # =========================================

        if response.parsed is not None:

            result = response.parsed.model_dump()

        else:

            result = CareerAdvice.model_validate_json(
                response.text
            ).model_dump()


        result["source"] = "gemini"

        return result


    except Exception as e:

        print(
            "AI Advisor error:",
            str(e)
        )

        try:
            return fallback_advice

        except Exception:
            raise HTTPException(
                status_code=500,
                detail="AI Advisor failed"
            )

@app.patch("/profile/{user_id}")
def update_profile(user_id: str, profile: ProfileUpdate):
    try:
        payload = {
            key: value
            for key, value in profile.model_dump().items()
            if value is not None
        }

        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json=payload
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/profile/{user_id}")
def get_profile(user_id: str):
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles"
            f"?id=eq.{user_id}"
            f"&select=id,full_name,major,university,bio,onboarding_completed",
            headers=SERVICE_HEADERS
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        data = response.json()

        if not data:
            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

        return data[0]

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/user/skills/{user_id}")
def get_user_skills(user_id: str):
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_skills"
            f"?user_id=eq.{user_id}"
            f"&select=id,skill_id,proficiency,source,skills(name)",
            headers=SERVICE_HEADERS
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.delete("/user/skills/{user_id}/{skill_id}")
def delete_user_skill(user_id: str, skill_id: int):
    try:
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/user_skills"
            f"?user_id=eq.{user_id}"
            f"&skill_id=eq.{skill_id}",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return {
            "message": "Skill removed successfully",
            "deleted": response.json()
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/user/certificates/{user_id}")
def get_user_certificates(user_id: str):
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_certificates"
            f"?user_id=eq.{user_id}"
            f"&select=id,user_id,name,issuer,certificate_url,created_at"
            f"&order=created_at.desc",
            headers=SERVICE_HEADERS
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/user/certificates")
def add_user_certificate(certificate: CertificateCreate):
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_certificates",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json={
                "user_id": certificate.user_id,
                "name": certificate.name,
                "issuer": certificate.issuer,
                "certificate_url": certificate.certificate_url
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.delete("/user/certificates/{certificate_id}")
def delete_user_certificate(certificate_id: int):
    try:
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/user_certificates"
            f"?id=eq.{certificate_id}",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return {
            "message": "Certificate deleted successfully",
            "deleted": response.json()
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/user/projects/{user_id}")
def get_user_projects(user_id: str):
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_projects"
            f"?user_id=eq.{user_id}"
            f"&select=id,user_id,title,description,project_url,created_at"
            f"&order=created_at.desc",
            headers=SERVICE_HEADERS
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/user/projects")
def add_user_project(project: ProjectCreate):
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_projects",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json={
                "user_id": project.user_id,
                "title": project.title,
                "description": project.description,
                "project_url": project.project_url
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.delete("/user/projects/{project_id}")
def delete_user_project(project_id: int):
    try:
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/user_projects"
            f"?id=eq.{project_id}",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return {
            "message": "Project deleted successfully",
            "deleted": response.json()
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.patch("/profile/{user_id}/onboarding-complete")
def complete_onboarding(user_id: str):
    try:
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json={
                "onboarding_completed": True
            }
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/user/custom-skill")
def add_custom_skill(skill: CustomSkillCreate):
    try:
        skill_name = skill.name.strip()

        if not skill_name:
            raise HTTPException(
                status_code=400,
                detail="Skill name is required"
            )
        allowed_categories = {
             "Technical",
             "Business",
             "Soft"
            }

        if skill.category not in allowed_categories:
          raise HTTPException(
        status_code=400,
        detail="Invalid skill category"
         )

        # Check if the skill already exists
        existing_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/skills"
            f"?name=ilike.{skill_name}"
            f"&select=id,name,category",
            headers=SERVICE_HEADERS
        )

        if not existing_response.ok:
            raise HTTPException(
                status_code=existing_response.status_code,
                detail=existing_response.text
            )

        existing = existing_response.json()

        if existing:
            skill_id = existing[0]["id"]
            created_skill = existing[0]

        else:
            # Create the new skill
            create_response = requests.post(
                f"{SUPABASE_URL}/rest/v1/skills",
                headers={
                    **SERVICE_HEADERS,
                    "Prefer": "return=representation"
                },
                json={
                    "name": skill_name,
                    "category": skill.category
                }
            )

            if not create_response.ok:
                raise HTTPException(
                    status_code=create_response.status_code,
                    detail=create_response.text
                )

            created_skill = create_response.json()[0]
            skill_id = created_skill["id"]

        # Check if user already has it
        user_skill_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_skills"
            f"?user_id=eq.{skill.user_id}"
            f"&skill_id=eq.{skill_id}"
            f"&select=id",
            headers=SERVICE_HEADERS
        )

        if not user_skill_response.ok:
            raise HTTPException(
                status_code=user_skill_response.status_code,
                detail=user_skill_response.text
            )

        if not user_skill_response.json():
            add_response = requests.post(
                f"{SUPABASE_URL}/rest/v1/user_skills",
                headers={
                    **SERVICE_HEADERS,
                    "Prefer": "return=representation"
                },
                json={
                    "user_id": skill.user_id,
                    "skill_id": skill_id,
                    "proficiency": "Intermediate",
                    "source": "Manual"
                }
            )

            if not add_response.ok:
                raise HTTPException(
                    status_code=add_response.status_code,
                    detail=add_response.text
                )

        return {
            "message": "Custom skill added successfully",
            "skill": created_skill
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/ai/skill-weight")
def generate_skill_weight(request: SkillWeightRequest):
    try:
        # 1. Get current target job
        target_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_target_job"
            f"?user_id=eq.{request.user_id}"
            f"&select=job_id,jobs(id,title)",
            headers=SERVICE_HEADERS
        )

        if not target_response.ok:
            raise HTTPException(
                status_code=target_response.status_code,
                detail=target_response.text
            )

        target_data = target_response.json()

        if not target_data:
            raise HTTPException(
                status_code=400,
                detail="User has no target job"
            )

        job_id = target_data[0]["job_id"]
        job_title = target_data[0]["jobs"]["title"]

        # 2. Get skill details
        skill_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/skills"
            f"?id=eq.{request.skill_id}"
            f"&select=id,name,category",
            headers=SERVICE_HEADERS
        )

        if not skill_response.ok:
            raise HTTPException(
                status_code=skill_response.status_code,
                detail=skill_response.text
            )

        skill_data = skill_response.json()

        if not skill_data:
            raise HTTPException(
                status_code=404,
                detail="Skill not found"
            )

        skill = skill_data[0]

        # 3. Check cache
        cached_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/ai_job_skill_weights"
            f"?job_id=eq.{job_id}"
            f"&skill_id=eq.{request.skill_id}"
            f"&select=*",
            headers=SERVICE_HEADERS
        )

        if not cached_response.ok:
            raise HTTPException(
                status_code=cached_response.status_code,
                detail=cached_response.text
            )

        cached = cached_response.json()

        if cached:
            return {
                "cached": True,
                "result": cached[0]
            }

        # 4. Ask Gemini for relevance weight
        prompt = f"""
You are evaluating how relevant a skill is to a specific target job.

Target job:
{job_title}

Skill:
{skill["name"]}

Skill category:
{skill["category"]}

Evaluate the skill only in relation to this target job.

Weight rules:
3 = Core skill that is highly important for the role
2 = Important skill that provides significant value
1 = Supporting skill that can help but is not essential
0 = Not relevant to the role

Provide:
- weight from 0 to 3
- a short reason
- confidence from 0 to 1

Be realistic and conservative.
"""

        ai_response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "weight": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 3
                        },
                        "reason": {
                            "type": "string"
                        },
                        "confidence": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                        }
                    },
                    "required": [
                        "weight",
                        "reason",
                        "confidence"
                    ]
                }
            )
        )

        result = json.loads(ai_response.text)

        weight = int(result["weight"])
        reason = str(result["reason"]).strip()
        confidence = float(result["confidence"])

        # Extra validation
        if weight not in [0, 1, 2, 3]:
            raise HTTPException(
                status_code=500,
                detail="Invalid AI weight"
            )

        confidence = max(
            0.0,
            min(confidence, 1.0)
        )

        # 5. Save AI evaluation
        save_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/ai_job_skill_weights",
            headers={
                **SERVICE_HEADERS,
                "Prefer": "return=representation"
            },
            json={
                "job_id": job_id,
                "skill_id": request.skill_id,
                "weight": weight,
                "reason": reason,
                "confidence": confidence,
                "source": "AI"
            }
        )

        if not save_response.ok:
            raise HTTPException(
                status_code=save_response.status_code,
                detail=save_response.text
            )

        saved = save_response.json()[0]

        return {
            "cached": False,
            "result": saved
        }

    except HTTPException:
        raise

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI skill weighting failed: {str(e)}"
        )