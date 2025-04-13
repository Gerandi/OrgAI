from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Table, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.associationproxy import association_proxy

from app.models.base import BaseModel

class Organization(BaseModel):
    """Organization model for high-level structure"""
    __tablename__ = "organizations"

    name = Column(String, index=True)
    description = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    size = Column(Integer, nullable=True)

    # Relationships
    users = relationship("UserOrganization", back_populates="organization")
    departments = relationship("Department", back_populates="organization")
    teams = relationship("Team", back_populates="organization")
    employees = relationship("Employee", back_populates="organization")
    research_projects = relationship("ResearchProject", back_populates="organization") # Added relationship

    # Proxies
    user_list = association_proxy("users", "user")

class Department(BaseModel):
    """Department model for organizational units"""
    __tablename__ = "departments"

    name = Column(String, index=True)
    description = Column(String, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    parent_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="departments")
    parent_department = relationship("Department", remote_side="Department.id", backref="sub_departments")
    teams = relationship("Team", back_populates="department")
    employees = relationship("Employee", back_populates="department")

class Team(BaseModel):
    """Team model for organizational working groups"""
    __tablename__ = "teams"

    name = Column(String, index=True)
    description = Column(String, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    # team_size column removed - will be calculated dynamically
    team_lead_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    # Performance metrics
    performance_score = Column(Float, nullable=True)
    innovation_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="teams")
    department = relationship("Department", back_populates="teams")
    employees = relationship("Employee", back_populates="team", foreign_keys="Employee.team_id")
    team_lead = relationship("Employee", foreign_keys=[team_lead_id])
    research_projects = relationship("ResearchProject", back_populates="team") # Added relationship

class Employee(BaseModel):
    """Employee model for individual organizational members"""
    __tablename__ = "employees"

    employee_id = Column(String, index=True) # Internal employee ID
    name = Column(String, index=True)
    email = Column(String, nullable=True)
    role = Column(String, nullable=True)
    level = Column(Integer, nullable=True) # Hierarchy level

    # Organizational relationships
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    # Metrics
    tenure_months = Column(Float, default=0)
    performance_score = Column(Float, nullable=True)
    skill_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    innovation_score = Column(Float, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="employees")
    department = relationship("Department", back_populates="employees")
    team = relationship("Team", back_populates="employees", foreign_keys=[team_id])
    manager = relationship("Employee", remote_side="Employee.id", backref="direct_reports")

class OrganizationSnapshot(BaseModel):
    """Organization snapshot for tracking changes over time"""
    __tablename__ = "organization_snapshots"

    organization_id = Column(Integer, ForeignKey("organizations.id"))
    snapshot_date = Column(DateTime, index=True)
    employee_count = Column(Integer)
    team_count = Column(Integer)
    avg_tenure = Column(Float)
    avg_performance = Column(Float)
    avg_communication = Column(Float)
    avg_innovation = Column(Float)
    turnover_rate = Column(Float)

    # JSON data for detailed snapshot (stored as string, using SQLAlchemy JSON type would be better with PostgreSQL)
    structure_data = Column(String) # JSON representation of org structure
    network_data = Column(String) # JSON representation of communication network