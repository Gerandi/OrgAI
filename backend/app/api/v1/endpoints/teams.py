from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.models.user import User, UserOrganization
from app.models.organization import Organization, Team, Employee

router = APIRouter()

@router.get("/{team_id}/employees", response_model=List[dict])
def get_team_employees(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all employees in a team
    """
    # Check if team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user has access to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == team.organization_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this team's organization"
        )

    # Get all employees in the team
    employees = db.query(Employee).filter(Employee.team_id == team_id).all()
    result = []

    for employee in employees:
        result.append({
            "id": employee.id,
            "name": employee.name,
            "email": employee.email,
            "role": employee.role,
            "level": employee.level,
            "tenure_months": employee.tenure_months,
            "performance_score": employee.performance_score,
            "skill_score": employee.skill_score, # Added missing field
            "innovation_score": employee.innovation_score,
            "communication_score": employee.communication_score,
            "is_team_lead": team.team_lead_id == employee.id
        })

    return result

@router.post("/{team_id}/employees", response_model=dict)
def add_team_employee(
    team_id: int,
    employee_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add an employee to a team
    """
    # Check if team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == team.organization_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Check if employee exists
    employee_id = employee_data.get("employee_id")
    if not employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID is required"
        )

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Check if employee is in the same organization
    if employee.organization_id != team.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee must be in the same organization as the team"
        )

    # Assign employee to team
    employee.team_id = team_id

    # If specified, set employee as team lead
    is_team_lead = employee_data.get("is_team_lead", False)
    if is_team_lead:
        team.team_lead_id = employee_id
        db.add(team)

    db.add(employee)
    db.commit()
    db.refresh(employee)

    # Update team size after adding employee
    team.team_size = db.query(Employee).filter(Employee.team_id == team_id).count()
    db.add(team)
    db.commit()

    return {
        "id": employee.id,
        "name": employee.name,
        "role": employee.role,
        "team_id": employee.team_id,
        "is_team_lead": team.team_lead_id == employee.id,
        "message": "Employee added to team successfully"
    }

@router.delete("/{team_id}/employees/{employee_id}", response_model=dict)
def remove_team_employee(
    team_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove an employee from a team
    """
    # Check if team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == team.organization_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Check if employee exists and is in the team
    employee = db.query(Employee).filter(Employee.id == employee_id, Employee.team_id == team_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found in this team"
        )

    # If employee is team lead, remove team lead
    if team.team_lead_id == employee_id:
        team.team_lead_id = None
        db.add(team)

    # Remove employee from team
    employee.team_id = None

    db.add(employee)
    db.commit()

    # Update team size after removing employee
    team.team_size = db.query(Employee).filter(Employee.team_id == team_id).count()
    db.add(team)
    db.commit()

    return {"message": "Employee removed from team successfully"}

@router.get("/", response_model=List[dict])
def list_teams(
    organization_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List teams, optionally filtered by organization
    """
    query = db.query(Team)

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
        query = query.filter(Team.organization_id == organization_id)
    else:
        # If no org specified, list teams from all orgs user has access to
        user_orgs = db.query(UserOrganization).filter(UserOrganization.user_id == current_user.id).all()
        org_ids = [uo.organization_id for uo in user_orgs]
        query = query.filter(Team.organization_id.in_(org_ids))


    teams = query.offset(skip).limit(limit).all()

    return [
        {
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "organization_id": team.organization_id,
            "department_id": team.department_id,
            "team_size": db.query(Employee).filter(Employee.team_id == team.id).count(), # Calculate dynamically
            "performance_score": team.performance_score,
            "innovation_score": team.innovation_score,
            "communication_score": team.communication_score,
            "created_at": team.created_at,
            "updated_at": team.updated_at
        }
        for team in teams
    ]

@router.get("/{team_id}", response_model=dict)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get team details
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user has access to the team's organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == team.organization_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this team's organization"
        )

    # Count employees in the team
    employee_count = db.query(Employee).filter(Employee.team_id == team_id).count()

    # Get team lead name if exists
    team_lead_name = None
    if team.team_lead_id:
        lead = db.query(Employee).filter(Employee.id == team.team_lead_id).first()
        if lead:
            team_lead_name = lead.name

    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "organization_id": team.organization_id,
        "department_id": team.department_id,
        "team_size": employee_count, # Use calculated count
        "team_lead_id": team.team_lead_id,
        "team_lead_name": team_lead_name,
        "performance_score": team.performance_score,
        "innovation_score": team.innovation_score,
        "communication_score": team.communication_score,
        "created_at": team.created_at,
        "updated_at": team.updated_at
    }

@router.post("/", response_model=dict)
def create_team(
    team_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new team
    """
    # Check if organization exists and user has admin rights
    org_id = team_data.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization ID is required"
        )

    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Check if department exists within the organization
    dept_id = team_data.get("department_id")
    if dept_id:
        dept = db.query(Department)\
            .filter(Department.id == dept_id, Department.organization_id == org_id)\
            .first()
        if not dept:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found in this organization"
            )

    # Create team
    team = Team(
        name=team_data["name"],
        description=team_data.get("description"),
        organization_id=org_id,
        department_id=dept_id,
        team_size=0 # Initial size is 0
        # Team lead is not set at creation, maybe update later
    )

    db.add(team)
    db.commit()
    db.refresh(team)

    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "organization_id": team.organization_id,
        "department_id": team.department_id,
        "team_size": team.team_size,
        "created_at": team.created_at,
        "updated_at": team.updated_at
    }

@router.put("/{team_id}", response_model=dict)
def update_team(
    team_id: int,
    team_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update team details
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == team.organization_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Check if department exists within the organization if changed
    dept_id = team_data.get("department_id")
    if dept_id is not None and dept_id != team.department_id:
        dept = db.query(Department)\
            .filter(Department.id == dept_id, Department.organization_id == team.organization_id)\
            .first()
        if not dept and dept_id is not None: # Check if not None again, as it could be set to null
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found in this organization"
            )
        team.department_id = dept_id

    # Check if team lead exists within the organization if changed
    team_lead_id = team_data.get("team_lead_id")
    if team_lead_id is not None and team_lead_id != team.team_lead_id:
        lead = db.query(Employee)\
            .filter(Employee.id == team_lead_id, Employee.organization_id == team.organization_id)\
            .first()
        if not lead and team_lead_id is not None:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team lead employee not found in this organization"
            )
        # Ensure the lead is assigned to this team
        if lead and lead.team_id != team_id:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chosen team lead is not a member of this team"
            )
        team.team_lead_id = team_lead_id


    # Update fields
    if "name" in team_data:
        team.name = team_data["name"]
    if "description" in team_data:
        team.description = team_data["description"]
    # Performance scores are likely calculated elsewhere, but allow manual override if needed
    if "performance_score" in team_data:
        team.performance_score = team_data["performance_score"]
    if "innovation_score" in team_data:
        team.innovation_score = team_data["innovation_score"]
    if "communication_score" in team_data:
        team.communication_score = team_data["communication_score"]


    db.add(team)
    db.commit()
    db.refresh(team)

    # Recalculate team size
    employee_count = db.query(Employee).filter(Employee.team_id == team_id).count()
    team.team_size = employee_count # Update size in the model if needed, though not strictly necessary for response
    db.commit()

    # Get team lead name if exists
    team_lead_name = None
    if team.team_lead_id:
        lead = db.query(Employee).filter(Employee.id == team.team_lead_id).first()
        if lead:
            team_lead_name = lead.name


    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "organization_id": team.organization_id,
        "department_id": team.department_id,
        "team_lead_id": team.team_lead_id,
        "team_lead_name": team_lead_name,
        "team_size": employee_count,
        "performance_score": team.performance_score,
        "innovation_score": team.innovation_score,
        "communication_score": team.communication_score,
        "created_at": team.created_at,
        "updated_at": team.updated_at
    }

@router.delete("/{team_id}", response_model=dict)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a team
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == team.organization_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )


    # Check if team has employees - if so, unassign them first
    employees = db.query(Employee).filter(Employee.team_id == team_id).all()
    if employees:
        for emp in employees:
            emp.team_id = None
            db.add(emp)
        db.commit()
        # Optionally raise an error instead, forcing manual reassignment:
        # employee_count = len(employees)
        # raise HTTPException(
        #     status_code=status.HTTP_400_BAD_REQUEST,
        #     detail=f"Cannot delete team with {employee_count} employees. Reassign employees first."
        # )


    db.delete(team)
    db.commit()

    return {"message": "Team deleted successfully"}