from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form, Body
from sqlalchemy.orm import Session
import pandas as pd
import json
import os
from typing import Dict, List, Optional

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.models.user import User
from app.models.research import Dataset
from app.ml.feature_identifier import FeatureIdentifier

router = APIRouter()

@router.post("/identify", response_model=Dict)
async def identify_features(
    dataset_id: int = Form(...),
    user_mappings: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Identify features and targets in a dataset
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    # Check user access to dataset
    if dataset.project_id:
        from app.models.user import UserProject
        user_project = db.query(UserProject).filter_by(
            user_id=current_user.id,
            project_id=dataset.project_id
        ).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )
    
    # Check if file exists
    if not os.path.exists(dataset.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset file not found"
        )
    
    # Load dataset
    try:
        df = pd.read_csv(dataset.file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading dataset: {str(e)}"
        )
    
    # Parse user mappings if provided
    user_column_mappings = {}
    if user_mappings:
        try:
            user_column_mappings = json.loads(user_mappings)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format for user_mappings"
            )
    
    # Identify features and targets
    try:
        # If user provided mappings, apply them
        if user_column_mappings:
            # Identify features first to get complete analysis
            identification_results = FeatureIdentifier.identify_features_and_targets(df)
            
            # Then merge with user mappings
            column_mappings = FeatureIdentifier.suggest_column_mappings(df)
            column_mappings["suggested_mappings"].update(user_column_mappings)
            
            # Update confidence for user-provided mappings
            for key in user_column_mappings:
                column_mappings["confidence"][key] = "user_defined"
                
            return {
                "dataset_id": dataset_id,
                "dataset_name": dataset.name,
                "column_mappings": column_mappings,
                "identification_results": identification_results
            }
        else:
            # Get automatic column mappings and identification
            column_mappings = FeatureIdentifier.suggest_column_mappings(df)
            
            return {
                "dataset_id": dataset_id,
                "dataset_name": dataset.name,
                "column_mappings": column_mappings
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error identifying features: {str(e)}"
        )

@router.post("/save-mappings", response_model=Dict)
async def save_column_mappings(
    dataset_id: int = Body(...),
    column_mappings: Dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Save column mappings for a dataset
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    # Check user access to dataset
    if dataset.project_id:
        from app.models.user import UserProject
        user_project = db.query(UserProject).filter_by(
            user_id=current_user.id,
            project_id=dataset.project_id
        ).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )
    
    # Save column mappings
    try:
        # Store mappings in dataset metadata
        metadata = json.loads(dataset.metadata) if dataset.metadata else {}
        metadata["column_mappings"] = column_mappings
        dataset.metadata = json.dumps(metadata)
        
        # Save to database
        db.add(dataset)
        db.commit()
        
        return {
            "dataset_id": dataset_id,
            "dataset_name": dataset.name,
            "message": "Column mappings saved successfully",
            "column_mappings": column_mappings
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving column mappings: {str(e)}"
        )
