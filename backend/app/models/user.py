from sqlalchemy import Boolean, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

class User(BaseModel):
    """User model for authentication and permissions"""
    __tablename__ = "users"

    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Relationships
    organizations = relationship("UserOrganization", back_populates="user")
    projects = relationship("UserProject", back_populates="user")

class UserOrganization(BaseModel):
    """Association model between users and organizations"""
    __tablename__ = "user_organizations"

    user_id = Column(Integer, ForeignKey("users.id"))
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    role = Column(String, default="member") # member, admin, owner

    # Relationships
    user = relationship("User", back_populates="organizations")
    organization = relationship("Organization", back_populates="users")

class UserProject(BaseModel):
    """Association model between users and research projects"""
    __tablename__ = "user_projects"

    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("research_projects.id"))
    role = Column(String, default="member") # member, admin, owner

    # Relationships
    user = relationship("User", back_populates="projects")
    project = relationship("ResearchProject", back_populates="users")