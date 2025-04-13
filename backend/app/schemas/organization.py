from pydantic import BaseModel, Field, validator
from typing import Optional, List

# Organization schemas
class OrganizationBase(BaseModel):
    name: str = Field(..., description="Name of the organization")
    description: Optional[str] = Field(None, description="Description of the organization")
    industry: Optional[str] = Field(None, description="Industry sector of the organization")
    size: Optional[int] = Field(None, ge=1, description="Number of employees in the organization")

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the organization")
    description: Optional[str] = Field(None, description="Description of the organization")
    industry: Optional[str] = Field(None, description="Industry sector of the organization")
    size: Optional[int] = Field(None, ge=1, description="Number of employees in the organization")

class OrganizationResponse(OrganizationBase):
    id: int
    
    class Config:
        orm_mode = True

# Department schemas
class DepartmentBase(BaseModel):
    name: str = Field(..., description="Name of the department")
    organization_id: int = Field(..., description="ID of the organization this department belongs to")
    description: Optional[str] = Field(None, description="Description of the department")
    parent_department_id: Optional[int] = Field(None, description="ID of the parent department, if any")

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the department")
    description: Optional[str] = Field(None, description="Description of the department")
    parent_department_id: Optional[int] = Field(None, description="ID of the parent department, if any")

class DepartmentResponse(DepartmentBase):
    id: int
    
    class Config:
        orm_mode = True

# Team schemas
class TeamBase(BaseModel):
    name: str = Field(..., description="Name of the team")
    organization_id: int = Field(..., description="ID of the organization this team belongs to")
    description: Optional[str] = Field(None, description="Description of the team")
    department_id: Optional[int] = Field(None, description="ID of the department this team belongs to")
    team_lead_id: Optional[int] = Field(None, description="ID of the employee who leads this team")
    performance_score: Optional[float] = Field(None, ge=0, le=100, description="Performance score (0-100)")
    innovation_score: Optional[float] = Field(None, ge=0, le=100, description="Innovation score (0-100)")
    communication_score: Optional[float] = Field(None, ge=0, le=100, description="Communication score (0-100)")

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the team")
    description: Optional[str] = Field(None, description="Description of the team")
    department_id: Optional[int] = Field(None, description="ID of the department this team belongs to")
    team_lead_id: Optional[int] = Field(None, description="ID of the employee who leads this team")
    performance_score: Optional[float] = Field(None, ge=0, le=100, description="Performance score (0-100)")
    innovation_score: Optional[float] = Field(None, ge=0, le=100, description="Innovation score (0-100)")
    communication_score: Optional[float] = Field(None, ge=0, le=100, description="Communication score (0-100)")

class TeamResponse(TeamBase):
    id: int
    team_size: int = Field(..., description="Number of employees in the team (calculated)")
    
    class Config:
        orm_mode = True

# Employee schemas
class EmployeeBase(BaseModel):
    name: str = Field(..., description="Employee name")
    employee_id: str = Field(..., description="Internal employee ID")
    organization_id: int = Field(..., description="ID of the organization this employee belongs to")
    email: Optional[str] = Field(None, description="Employee email address")
    role: Optional[str] = Field(None, description="Employee role or job title")
    level: Optional[int] = Field(None, ge=1, description="Hierarchy level (1=highest)")
    department_id: Optional[int] = Field(None, description="ID of the department this employee belongs to")
    team_id: Optional[int] = Field(None, description="ID of the team this employee belongs to")
    manager_id: Optional[int] = Field(None, description="ID of this employee's manager")
    
    # Metrics
    tenure_months: Optional[float] = Field(0, ge=0, description="Tenure in months")
    performance_score: Optional[float] = Field(None, ge=0, le=100, description="Performance score (0-100)")
    skill_score: Optional[float] = Field(None, ge=0, le=100, description="Skill level score (0-100)")
    communication_score: Optional[float] = Field(None, ge=0, le=100, description="Communication score (0-100)")
    innovation_score: Optional[float] = Field(None, ge=0, le=100, description="Innovation score (0-100)")

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Employee name")
    email: Optional[str] = Field(None, description="Employee email address")
    role: Optional[str] = Field(None, description="Employee role or job title")
    level: Optional[int] = Field(None, ge=1, description="Hierarchy level (1=highest)")
    department_id: Optional[int] = Field(None, description="ID of the department this employee belongs to")
    team_id: Optional[int] = Field(None, description="ID of the team this employee belongs to")
    manager_id: Optional[int] = Field(None, description="ID of this employee's manager")
    
    # Metrics
    tenure_months: Optional[float] = Field(None, ge=0, description="Tenure in months")
    performance_score: Optional[float] = Field(None, ge=0, le=100, description="Performance score (0-100)")
    skill_score: Optional[float] = Field(None, ge=0, le=100, description="Skill level score (0-100)")
    communication_score: Optional[float] = Field(None, ge=0, le=100, description="Communication score (0-100)")
    innovation_score: Optional[float] = Field(None, ge=0, le=100, description="Innovation score (0-100)")

class EmployeeResponse(EmployeeBase):
    id: int
    
    class Config:
        orm_mode = True