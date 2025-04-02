from typing import List, Optional 
from fastapi import APIRouter, Depends, HTTPException, status 
from sqlalchemy.orm import Session 
from sqlalchemy import desc 

from app.config.database import get_db 
from app.config.auth import get_current_active_user 
from app.models.user import User, UserProject 
from app.models.research import ResearchProject, Dataset, Model, Publication 

router = APIRouter() 

@router.get("/project/{project_id}", response_model=List[dict]) 
def get_project_activities( 
    project_id: int, 
    limit: int = 10, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user) 
): 
    """ 
    Get recent activities for a project 
    """ 
    try: 
        # Check if user has access to project 
        user_project = db.query(UserProject)\
            .filter(UserProject.user_id == current_user.id, UserProject.project_id == project_id)\
            .first() 

        if not user_project: 
            raise HTTPException( 
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User does not have access to this project" 
            ) 

        # Get project 
        project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first() 
        if not project: 
            raise HTTPException( 
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Research project not found" 
            ) 

        # Collect activities from multiple sources 
        activities = [] 

        # 1. Get the most recent datasets added to the project 
        datasets = db.query(Dataset).filter(Dataset.project_id == project_id)\
            .order_by(desc(Dataset.created_at))\
            .limit(limit)\
            .all() 

        for dataset in datasets: 
            # Find the user who created it 
            dataset_creator = db.query(User)\
                .join(UserProject, User.id == UserProject.user_id)\
                .filter(UserProject.project_id == project_id)\
                .first() # Simplified version - ideally you'd store creator info 

            activities.append({ 
                "id": f"dataset-{dataset.id}", 
                "type": "dataset", 
                "action": "upload", 
                "user": dataset_creator.username if dataset_creator else "Unknown", 
                "user_full_name": dataset_creator.full_name if dataset_creator else "Unknown User", 
                "item": dataset.name, 
                "item_id": dataset.id, 
                "timestamp": dataset.created_at 
            }) 

        # 2. Get the most recent models created for the project 
        models = db.query(Model).filter(Model.project_id == project_id)\
            .order_by(desc(Model.created_at))\
            .limit(limit)\
            .all() 

        for model in models: 
            # Find the user who created it 
            model_creator = db.query(User)\
                .join(UserProject, User.id == UserProject.user_id)\
                .filter(UserProject.project_id == project_id)\
                .first() # Simplified version 

            activities.append({ 
                "id": f"model-{model.id}", 
                "type": "model", 
                "action": "create", 
                "user": model_creator.username if model_creator else "Unknown", 
                "user_full_name": model_creator.full_name if model_creator else "Unknown User", 
                "item": model.name, 
                "item_id": model.id, 
                "timestamp": model.created_at 
            }) 

        # 3. Get the most recent publications added to the project 
        publications = db.query(Publication).filter(Publication.project_id == project_id)\
            .order_by(desc(Publication.created_at))\
            .limit(limit)\
            .all() 

        for publication in publications: 
            # Find the user who created it 
            publication_creator = db.query(User)\
                .join(UserProject, User.id == UserProject.user_id)\
                .filter(UserProject.project_id == project_id)\
                .first() # Simplified version 

            activities.append({ 
                "id": f"publication-{publication.id}", 
                "type": "publication", 
                "action": "add", 
                "user": publication_creator.username if publication_creator else "Unknown", 
                "user_full_name": publication_creator.full_name if publication_creator else "Unknown User", 
                "item": publication.title, 
                "item_id": publication.id, 
                "timestamp": publication.created_at 
            }) 

        # 4. Get project team members (Users who joined the project) 
        team_members = db.query(UserProject, User)\
            .join(User, UserProject.user_id == User.id)\
            .filter(UserProject.project_id == project_id)\
            .order_by(desc(UserProject.created_at))\
            .limit(limit)\
            .all() 

        for member in team_members: 
            activities.append({ 
                "id": f"team-{member.UserProject.user_id}", 
                "type": "team", 
                "action": "add", 
                "user": current_user.username, # Assume project owner added the member 
                "user_full_name": current_user.full_name or current_user.username, 
                "item": member.User.username, 
                "item_full_name": member.User.full_name, 
                "item_id": member.User.id, 
                "timestamp": member.UserProject.created_at 
            }) 

        # Sort all activities by timestamp (most recent first) and limit 
        activities.sort(key=lambda x: x["timestamp"], reverse=True) 
        activities = activities[:limit] 

        return activities 

    except Exception as e: 
        print(f"Error getting project activities: {str(e)}") 
        raise HTTPException( 
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error getting project activities: {str(e)}" 
        )