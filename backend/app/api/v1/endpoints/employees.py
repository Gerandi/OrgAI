from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.models.user import User, UserOrganization
from app.models.organization import Organization, Department, Team, Employee

router = APIRouter()

@router.get("/", response_model=List[dict])
def list_employees(
    organization_id: Optional[int] = None,
    department_id: Optional[int] = None,
    team_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List employees with optional filters for organization, department, or team.
    Requires access to the specified organization if provided.
    """
    query = db.query(Employee)

    # Apply filters and check permissions
    if organization_id:
        user_org = db.query(UserOrganization)\
            .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == organization_id)\
            .first()
        if not user_org:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have access to this organization")
        query = query.filter(Employee.organization_id == organization_id)
    elif department_id:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        user_org = db.query(UserOrganization)\
            .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == dept.organization_id)\
            .first()
        if not user_org:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have access to this department's organization")
        query = query.filter(Employee.department_id == department_id)
    elif team_id:
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        user_org = db.query(UserOrganization)\
            .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == team.organization_id)\
            .first()
        if not user_org:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have access to this team's organization")
        query = query.filter(Employee.team_id == team_id)
    else:
        # If no filter, list employees from all organizations the user has access to
        user_orgs = db.query(UserOrganization.organization_id).filter(UserOrganization.user_id == current_user.id).all()
        org_ids = [org.organization_id for org in user_orgs]
        query = query.filter(Employee.organization_id.in_(org_ids))


    employees = query.offset(skip).limit(limit).all()

    # Prepare response data (avoiding redundant permission checks inside loop)
    result = [
        {
            "id": emp.id,
            "employee_id": emp.employee_id,
            "name": emp.name,
            "email": emp.email,
            "role": emp.role,
            "level": emp.level,
            "organization_id": emp.organization_id,
            "department_id": emp.department_id,
            "team_id": emp.team_id,
            "manager_id": emp.manager_id,
            "tenure_months": emp.tenure_months,
            "performance_score": emp.performance_score,
            "skill_score": emp.skill_score,
            "communication_score": emp.communication_score,
            "innovation_score": emp.innovation_score,
            "created_at": emp.created_at,
            "updated_at": emp.updated_at
        }
        for emp in employees
    ]
    return result


@router.get("/{employee_id}", response_model=dict)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get employee details by internal DB ID.
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Check if user has access to the employee's organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == employee.organization_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this employee's organization"
        )

    # Get related info (optional, could be separate endpoints)
    organization = db.query(Organization).filter(Organization.id == employee.organization_id).first()
    department = db.query(Department).filter(Department.id == employee.department_id).first() if employee.department_id else None
    team = db.query(Team).filter(Team.id == employee.team_id).first() if employee.team_id else None
    manager = db.query(Employee).filter(Employee.id == employee.manager_id).first() if employee.manager_id else None
    direct_reports = db.query(Employee).filter(Employee.manager_id == employee_id).all()
    teams_led = db.query(Team).filter(Team.team_lead_id == employee_id).all()

    return {
        "id": employee.id,
        "employee_id": employee.employee_id,
        "name": employee.name,
        "email": employee.email,
        "role": employee.role,
        "level": employee.level,
        "organization": {"id": organization.id, "name": organization.name} if organization else None,
        "department": {"id": department.id, "name": department.name} if department else None,
        "team": {"id": team.id, "name": team.name} if team else None,
        "manager": {"id": manager.id, "name": manager.name} if manager else None,
        "tenure_months": employee.tenure_months,
        "performance_score": employee.performance_score,
        "skill_score": employee.skill_score,
        "communication_score": employee.communication_score,
        "innovation_score": employee.innovation_score,
        "direct_reports": [{"id": emp.id, "name": emp.name} for emp in direct_reports],
        "teams_led": [{"id": t.id, "name": t.name} for t in teams_led],
        "created_at": employee.created_at,
        "updated_at": employee.updated_at
    }

@router.post("/", response_model=dict)
def create_employee(
    employee_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new employee within an organization.
    Requires admin/owner rights for the organization.
    """
    org_id = employee_data.get("organization_id")
    if not org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization ID is required")

    # Check permissions
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()
    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have admin rights to this organization")

    # Validate Department, Team, Manager IDs if provided
    dept_id = employee_data.get("department_id")
    if dept_id:
        dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id == org_id).first()
        if not dept: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in this organization")

    team_id = employee_data.get("team_id")
    if team_id:
        team = db.query(Team).filter(Team.id == team_id, Team.organization_id == org_id).first()
        if not team: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found in this organization")

    manager_id = employee_data.get("manager_id")
    if manager_id:
        manager = db.query(Employee).filter(Employee.id == manager_id, Employee.organization_id == org_id).first()
        if not manager: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manager not found in this organization")

    # Create employee
    employee = Employee(
        employee_id=employee_data.get("employee_id"),
        name=employee_data["name"],
        email=employee_data.get("email"),
        role=employee_data.get("role"),
        level=employee_data.get("level"),
        organization_id=org_id,
        department_id=dept_id,
        team_id=team_id,
        manager_id=manager_id,
        tenure_months=employee_data.get("tenure_months", 0),
        performance_score=employee_data.get("performance_score"),
        skill_score=employee_data.get("skill_score"),
        communication_score=employee_data.get("communication_score"),
        innovation_score=employee_data.get("innovation_score")
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    # Return created employee data (excluding sensitive info if any)
    return get_employee(employee.id, db, current_user) # Reuse get_employee logic


@router.put("/{employee_id}", response_model=dict)
def update_employee(
    employee_id: int,
    employee_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update employee details.
    Requires admin/owner rights for the organization.
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    # Check permissions
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == employee.organization_id)\
        .first()
    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have admin rights to this organization")

    # Validate Department, Team, Manager IDs if provided and changed
    dept_id = employee_data.get("department_id")
    if dept_id is not None and dept_id != employee.department_id:
        if dept_id: # If setting a new department
            dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id == employee.organization_id).first()
            if not dept: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in this organization")
        employee.department_id = dept_id if dept_id else None

    team_id = employee_data.get("team_id")
    if team_id is not None and team_id != employee.team_id:
        if team_id: # If setting a new team
            team = db.query(Team).filter(Team.id == team_id, Team.organization_id == employee.organization_id).first()
            if not team: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found in this organization")
        employee.team_id = team_id if team_id else None

    manager_id = employee_data.get("manager_id")
    if manager_id is not None and manager_id != employee.manager_id:
        if manager_id: # If setting a new manager
            if manager_id == employee_id: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee cannot be their own manager")
            manager = db.query(Employee).filter(Employee.id == manager_id, Employee.organization_id == employee.organization_id).first()
            if not manager: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manager not found in this organization")
        employee.manager_id = manager_id if manager_id else None

    # Update other fields
    if "employee_id" in employee_data: employee.employee_id = employee_data["employee_id"]
    if "name" in employee_data: employee.name = employee_data["name"]
    if "email" in employee_data: employee.email = employee_data["email"]
    if "role" in employee_data: employee.role = employee_data["role"]
    if "level" in employee_data: employee.level = employee_data["level"]
    if "tenure_months" in employee_data: employee.tenure_months = employee_data["tenure_months"]
    if "performance_score" in employee_data: employee.performance_score = employee_data["performance_score"]
    if "skill_score" in employee_data: employee.skill_score = employee_data["skill_score"]
    if "communication_score" in employee_data: employee.communication_score = employee_data["communication_score"]
    if "innovation_score" in employee_data: employee.innovation_score = employee_data["innovation_score"]

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return get_employee(employee.id, db, current_user) # Reuse get_employee logic


@router.delete("/{employee_id}", response_model=dict)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an employee.
    Requires admin/owner rights for the organization.
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    # Check permissions
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == employee.organization_id)\
        .first()
    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have admin rights to this organization")

    # Check if employee is a team lead or manager before deleting
    if db.query(Team).filter(Team.team_lead_id == employee_id).count() > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee is a team lead. Assign a new lead first.")
    if db.query(Employee).filter(Employee.manager_id == employee_id).count() > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee manages other employees. Reassign reports first.")

    db.delete(employee)
    db.commit()

    return {"message": "Employee deleted successfully"}