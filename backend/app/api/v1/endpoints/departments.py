from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.models.user import User, UserOrganization
from app.models.organization import Organization, Department, Team, Employee

router = APIRouter()

@router.get("/", response_model=List[dict])
def list_departments(
    organization_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List departments, optionally filtered by organization
    """
    query = db.query(Department)

    if organization_id:
        # Check if user has access to organization
        user_org = db.query(UserOrganization)\
            .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == organization_id)\
            .first()

        if not user_org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this organization"
            )

        query = query.filter(Department.organization_id == organization_id)
    else:
        # If no organization_id, list departments from all orgs user has access to
        user_orgs = db.query(UserOrganization.organization_id).filter(UserOrganization.user_id == current_user.id).all()
        org_ids = [org.organization_id for org in user_orgs]
        query = query.filter(Department.organization_id.in_(org_ids))


    departments = query.offset(skip).limit(limit).all()

    result = []
    for dept in departments:
        # Count employees in department
        employees_count = db.query(Employee).filter(Employee.department_id == dept.id).count()

        # Count teams in department
        teams_count = db.query(Team).filter(Team.department_id == dept.id).count()

        result.append({
            "id": dept.id,
            "name": dept.name,
            "description": dept.description,
            "organization_id": dept.organization_id,
            "parent_department_id": dept.parent_department_id,
            "employees_count": employees_count,
            "teams_count": teams_count,
            "created_at": dept.created_at,
            "updated_at": dept.updated_at
        })

    return result

@router.get("/{dept_id}", response_model=dict)
def get_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get department details
    """
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Check if user has access to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == department.organization_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this department's organization"
        )

    # Count employees in department
    employees_count = db.query(Employee).filter(Employee.department_id == dept_id).count()

    # Count teams in department
    teams_count = db.query(Team).filter(Team.department_id == dept_id).count()

    # Get parent department info
    parent_department = None
    if department.parent_department_id:
        parent = db.query(Department).filter(Department.id == department.parent_department_id).first()
        if parent:
            parent_department = {
                "id": parent.id,
                "name": parent.name
            }

    return {
        "id": department.id,
        "name": department.name,
        "description": department.description,
        "organization_id": department.organization_id,
        "parent_department_id": department.parent_department_id,
        "parent_department": parent_department,
        "employees_count": employees_count,
        "teams_count": teams_count,
        "created_at": department.created_at,
        "updated_at": department.updated_at
    }

@router.post("/", response_model=dict)
def create_department(
    dept_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new department
    """
    # Check if organization exists and user has admin rights
    org_id = dept_data.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization ID is required"
        )

    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Check if parent department exists in the same organization
    parent_dept_id = dept_data.get("parent_department_id")
    if parent_dept_id:
        parent_dept = db.query(Department)\
            .filter(Department.id == parent_dept_id, Department.organization_id == org_id)\
            .first()

        if not parent_dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent department not found in this organization"
            )

    # Create department
    department = Department(
        name=dept_data["name"],
        description=dept_data.get("description"),
        organization_id=org_id,
        parent_department_id=parent_dept_id
    )

    db.add(department)
    db.commit()
    db.refresh(department)

    return {
        "id": department.id,
        "name": department.name,
        "description": department.description,
        "organization_id": department.organization_id,
        "parent_department_id": department.parent_department_id,
        "created_at": department.created_at,
        "updated_at": department.updated_at
    }

@router.put("/{dept_id}", response_model=dict)
def update_department(
    dept_id: int,
    dept_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update department details
    """
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == department.organization_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Check if parent department exists in the same organization
    parent_dept_id = dept_data.get("parent_department_id")
    if parent_dept_id is not None and parent_dept_id != department.parent_department_id:
        # Can't set itself as parent
        if parent_dept_id == dept_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department cannot be its own parent"
            )

        if parent_dept_id: # If a new parent ID is provided
            parent_dept = db.query(Department)\
                .filter(Department.id == parent_dept_id, Department.organization_id == department.organization_id)\
                .first()

            if not parent_dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent department not found in this organization"
                )
        # If parent_dept_id is None or empty string, it means remove parent
        department.parent_department_id = parent_dept_id if parent_dept_id else None


    # Update fields
    if "name" in dept_data:
        department.name = dept_data["name"]
    if "description" in dept_data:
        department.description = dept_data["description"]
    # parent_department_id is handled above

    db.add(department)
    db.commit()
    db.refresh(department)

    return {
        "id": department.id,
        "name": department.name,
        "description": department.description,
        "organization_id": department.organization_id,
        "parent_department_id": department.parent_department_id,
        "created_at": department.created_at,
        "updated_at": department.updated_at
    }

@router.delete("/{dept_id}", response_model=dict)
def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a department
    """
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == department.organization_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Check if department has sub-departments
    sub_depts = db.query(Department).filter(Department.parent_department_id == dept_id).count()
    if sub_depts > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete department with {sub_depts} sub-departments. Reassign sub-departments first."
        )

    # Check if department has employees
    employee_count = db.query(Employee).filter(Employee.department_id == dept_id).count()
    if employee_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete department with {employee_count} employees. Reassign employees first."
        )

    # Check if department has teams
    teams_count = db.query(Team).filter(Team.department_id == dept_id).count()
    if teams_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete department with {teams_count} teams. Reassign teams first."
        )

    db.delete(department)
    db.commit()

    return {"message": "Department deleted successfully"}

@router.get("/{dept_id}/employees", response_model=List[dict])
def get_department_employees(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all employees in a department
    """
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Check if user has access to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == department.organization_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this department's organization"
        )

    # Get all employees in the department
    employees = db.query(Employee).filter(Employee.department_id == dept_id).all()
    result = []

    for employee in employees:
        result.append({
            "id": employee.id,
            "employee_id": employee.employee_id,
            "name": employee.name,
            "email": employee.email,
            "role": employee.role,
            "level": employee.level,
            "team_id": employee.team_id,
            "tenure_months": employee.tenure_months,
            "performance_score": employee.performance_score,
            "skill_score": employee.skill_score,
            "communication_score": employee.communication_score,
            "innovation_score": employee.innovation_score
        })

    return result

@router.get("/{dept_id}/teams", response_model=List[dict])
def get_department_teams(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all teams in a department
    """
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Check if user has access to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == department.organization_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this department's organization"
        )

    # Get all teams in the department
    teams = db.query(Team).filter(Team.department_id == dept_id).all()
    result = []

    for team in teams:
        # Count employees in the team
        employee_count = db.query(Employee).filter(Employee.team_id == team.id).count()

        result.append({
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "organization_id": team.organization_id,
            "department_id": team.department_id,
            "team_lead_id": team.team_lead_id,
            "team_size": employee_count, # Use calculated count
            "performance_score": team.performance_score,
            "innovation_score": team.innovation_score,
            "communication_score": team.communication_score,
            "created_at": team.created_at,
            "updated_at": team.updated_at
        })

    return result