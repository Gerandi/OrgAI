from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.config.database import get_db
from app.config.auth import get_current_active_user, get_password_hash
from app.models.user import User, UserOrganization
from app.models.organization import Organization, Team

router = APIRouter()

@router.get("/me/organizations", response_model=List[dict])
def get_user_organizations(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Get organizations for the current user
    """
    user_orgs = db.query(UserOrganization).filter(UserOrganization.user_id == current_user.id).all()
    results = []

    for user_org in user_orgs:
        org = db.query(Organization).filter(Organization.id == user_org.organization_id).first()
        if org:
            # Count teams and members in this organization
            teams_count = db.query(Team).filter(Team.organization_id == org.id).count()
            members_count = db.query(UserOrganization).filter(UserOrganization.organization_id == org.id).count()

            results.append({
                "id": org.id,
                "name": org.name,
                "description": org.description,
                "industry": org.industry,
                "role": user_org.role,
                "teams_count": teams_count,
                "members_count": members_count
            })

    return results

@router.get("/me/teams", response_model=List[dict])
def get_user_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Get teams for the current user based on their organizations
    """
    # Get user's organizations
    user_orgs = db.query(UserOrganization).filter(UserOrganization.user_id == current_user.id).all()
    org_ids = [user_org.organization_id for user_org in user_orgs]

    # Get teams from those organizations
    teams = db.query(Team).filter(Team.organization_id.in_(org_ids)).all()

    results = []
    for team in teams:
        # Get organization info
        org = db.query(Organization).filter(Organization.id == team.organization_id).first()
        org_name = org.name if org else "Unknown Organization"

        # Get count of employees in team
        from app.models.organization import Employee
        employees_count = db.query(Employee).filter(Employee.team_id == team.id).count()

        results.append({
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "organization_id": team.organization_id,
            "organization_name": org_name,
            "department_id": team.department_id,
            "employees_count": employees_count,
            "performance_score": team.performance_score,
            "innovation_score": team.innovation_score,
            "communication_score": team.communication_score
        })

    return results

@router.get("/me", response_model=dict)
def read_current_user(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Get current user information including organizations and teams
    """
    print(f"Current user requested: {current_user.username} (ID: {current_user.id})")

    # Get user's organizations with roles
    user_orgs = db.query(UserOrganization).filter(UserOrganization.user_id == current_user.id).all()
    organizations = []

    for user_org in user_orgs:
        org = db.query(Organization).filter(Organization.id == user_org.organization_id).first()
        if org:
            organizations.append({
                "id": org.id,
                "name": org.name,
                "role": user_org.role
            })

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "organizations": organizations
    }

@router.get("/{user_id}", response_model=dict)
def read_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Get user by ID including their organizations and teams
    """
    # Only superusers can view other users
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this user"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get user's organizations with roles
    user_orgs = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    organizations = []

    for user_org in user_orgs:
        org = db.query(Organization).filter(Organization.id == user_org.organization_id).first()
        if org:
            organizations.append({
                "id": org.id,
                "name": org.name,
                "role": user_org.role
            })

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "organizations": organizations
    }

@router.put("/me", response_model=dict)
def update_current_user(
    user_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update current user information
    """
    # Update user fields
    if "full_name" in user_data:
        current_user.full_name = user_data["full_name"]

    if "email" in user_data:
        # Check if email is already taken
        if user_data["email"] != current_user.email:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            current_user.email = user_data["email"]

    if "password" in user_data and user_data["password"]:
        current_user.hashed_password = get_password_hash(user_data["password"])

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    # Get user's organizations with roles
    user_orgs = db.query(UserOrganization).filter(UserOrganization.user_id == current_user.id).all()
    organizations = []

    for user_org in user_orgs:
        org = db.query(Organization).filter(Organization.id == user_org.organization_id).first()
        if org:
            organizations.append({
                "id": org.id,
                "name": org.name,
                "role": user_org.role
            })

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "organizations": organizations
    }

@router.get("/", response_model=List[dict])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all users (superuser only)
    """
    # Only superusers can list all users
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    users = db.query(User).offset(skip).limit(limit).all()
    result = []

    for user in users:
        # Get user's organizations with roles
        user_orgs = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
        organizations = []

        for user_org in user_orgs:
            org = db.query(Organization).filter(Organization.id == user_org.organization_id).first()
            if org:
                organizations.append({
                    "id": org.id,
                    "name": org.name,
                    "role": user_org.role
                })

        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "organizations": organizations
        })

    return result