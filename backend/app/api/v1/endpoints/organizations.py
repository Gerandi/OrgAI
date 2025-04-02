# C:\Users\geran\Downloads\OrgAI\backend\app\api\v1\endpoints\organizations.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session, joinedload

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.models.user import User, UserOrganization
from app.models.organization import Organization, Department, Team, Employee

router = APIRouter()

@router.get("/{org_id}/members", response_model=List[dict])
def get_organization_members(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all members of an organization
    """
    # Check if user has access to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this organization"
        )

    # Get all users in the organization
    members = db.query(UserOrganization).filter(UserOrganization.organization_id == org_id).all()
    result = []

    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            result.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": member.role,
                "joined_at": member.created_at # Assuming BaseModel has created_at
            })

    return result

@router.get("/{org_id}/departments", response_model=List[dict])
def get_organization_departments(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all departments in an organization
    """
    # Check if user has access to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this organization"
        )

    # Get all departments in the organization
    departments = db.query(Department).filter(Department.organization_id == org_id).all()
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
            "parent_department_id": dept.parent_department_id,
            "employees_count": employees_count,
            "teams_count": teams_count,
            "created_at": dept.created_at, # Assuming BaseModel has created_at
            "updated_at": dept.updated_at # Assuming BaseModel has updated_at
        })

    return result

@router.delete("/{org_id}/members/{user_id}", response_model=dict)
def remove_organization_member(
    org_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove a member from the organization
    """
    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Check if organization exists
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Get the member to remove
    member = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == user_id, UserOrganization.organization_id == org_id)\
        .first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this organization"
        )

    # Can't remove the only owner
    if member.role == "owner":
        owner_count = db.query(UserOrganization)\
            .filter(UserOrganization.organization_id == org_id, UserOrganization.role == "owner")\
            .count()

        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the only owner of the organization"
            )

    # Cannot remove yourself - ideally, there'd be a separate 'leave' endpoint
    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from the organization using this endpoint."
        )

    # Non-owners cannot remove owners
    if member.role == "owner" and user_org.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can remove other owners from the organization"
        )

    # Delete the user organization association
    db.delete(member)
    db.commit()

    return {"message": "Member removed from organization successfully"}

@router.post("/", response_model=dict)
def create_organization(
    org_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new organization
    """
    # Create organization
    organization = Organization(
        name=org_data["name"],
        description=org_data.get("description"),
        industry=org_data.get("industry"),
        size=org_data.get("size")
    )

    db.add(organization)
    db.commit()
    db.refresh(organization)

    # Add current user as owner
    user_org = UserOrganization(
        user_id=current_user.id,
        organization_id=organization.id,
        role="owner"
    )

    db.add(user_org)
    db.commit()

    return {
        "id": organization.id,
        "name": organization.name,
        "description": organization.description,
        "industry": organization.industry,
        "size": organization.size,
        "created_at": organization.created_at,
        "updated_at": organization.updated_at
    }

@router.get("/", response_model=List[dict])
def list_organizations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List organizations for current user
    """
    # Get all organizations where user has a role
    orgs = db.query(Organization)\
        .join(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id)\
        .offset(skip)\
        .limit(limit)\
        .all()

    return [
        {
            "id": org.id,
            "name": org.name,
            "description": org.description,
            "industry": org.industry,
            "size": org.size,
            "created_at": org.created_at,
            "updated_at": org.updated_at
        }
        for org in orgs
    ]

@router.get("/{org_id}", response_model=dict)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get organization details
    """
    # Check if user has access to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this organization"
        )

    # Get organization
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Count departments, teams, and employees
    departments_count = db.query(Department).filter(Department.organization_id == org_id).count()
    teams_count = db.query(Team).filter(Team.organization_id == org_id).count()
    employees_count = db.query(Employee).filter(Employee.organization_id == org_id).count()

    return {
        "id": org.id,
        "name": org.name,
        "description": org.description,
        "industry": org.industry,
        "size": org.size,
        "departments_count": departments_count,
        "teams_count": teams_count,
        "employees_count": employees_count,
        "user_role": user_org.role,
        "created_at": org.created_at,
        "updated_at": org.updated_at
    }

@router.put("/{org_id}", response_model=dict)
def update_organization(
    org_id: int,
    org_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update organization details
    """
    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Get organization
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Update fields
    if "name" in org_data:
        org.name = org_data["name"]
    if "description" in org_data:
        org.description = org_data["description"]
    if "industry" in org_data:
        org.industry = org_data["industry"]
    if "size" in org_data:
        org.size = org_data["size"]

    db.add(org)
    db.commit()
    db.refresh(org)

    return {
        "id": org.id,
        "name": org.name,
        "description": org.description,
        "industry": org.industry,
        "size": org.size,
        "created_at": org.created_at,
        "updated_at": org.updated_at
    }

@router.delete("/{org_id}", response_model=dict)
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete organization (owner only)
    """
    # Check if user is owner
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org or user_org.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the organization owner can delete the organization"
        )

    # Get organization
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # TODO: Add checks to prevent deletion if there are related entities (departments, teams, employees, projects)
    # that need to be handled first. For now, assuming cascading delete or manual cleanup.

    # Delete organization
    db.delete(org)
    db.commit()

    return {"message": "Organization deleted successfully"}

@router.post("/{org_id}/members", response_model=dict)
def add_organization_member(
    org_id: int,
    member_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a member to the organization
    """
    # Check if user has admin rights to organization
    user_org = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == current_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if not user_org or user_org.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin rights to this organization"
        )

    # Check if organization exists
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Check if user exists by username
    target_user = db.query(User).filter(User.username == member_data["username"]).first()
    if not target_user:
        # Optionally, check by email if username not found
        target_user = db.query(User).filter(User.email == member_data.get("email")).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found by username or email"
            )

    # Check if user is already a member
    existing_member = db.query(UserOrganization)\
        .filter(UserOrganization.user_id == target_user.id, UserOrganization.organization_id == org_id)\
        .first()

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this organization"
        )

    # Add user to organization
    new_member = UserOrganization(
        user_id=target_user.id,
        organization_id=org_id,
        role=member_data.get("role", "member")
    )

    db.add(new_member)
    db.commit()

    return {
        "id": target_user.id,
        "username": target_user.username,
        "email": target_user.email,
        "full_name": target_user.full_name,
        "role": new_member.role
    }