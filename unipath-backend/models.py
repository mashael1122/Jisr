from pydantic import BaseModel
from typing import Optional


class ProfileCreate(BaseModel):
    user_id: str
    full_name: Optional[str] = None
    major: Optional[str] = None
    university: Optional[str] = None
    bio: Optional[str] = None


class UserSkillCreate(BaseModel):
    user_id: str
    skill_id: int
    proficiency: Optional[str] = None
    source: str = "Manual"


class TargetJobCreate(BaseModel):
    user_id: str
    job_id: int

class RoadmapStatusUpdate(BaseModel):
    status: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    major: Optional[str] = None
    university: Optional[str] = None
    bio: Optional[str] = None

class CertificateCreate(BaseModel):
    user_id: str
    name: str
    issuer: Optional[str] = None
    certificate_url: Optional[str] = None

class ProjectCreate(BaseModel):
    user_id: str
    title: str
    description: Optional[str] = None
    project_url: Optional[str] = None

class CustomSkillCreate(BaseModel):
    user_id: str
    name: str
    category:str

class SkillWeightRequest(BaseModel):
    user_id: str
    skill_id: int