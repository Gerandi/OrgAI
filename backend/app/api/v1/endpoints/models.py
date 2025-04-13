from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File, Form
from sqlalchemy.orm import Session
import json
import os
import pickle
import glob
from datetime import datetime
from typing import Dict, Any

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.config.settings import settings
from app.models.user import User, UserProject # Import UserProject here
from app.models.research import Model, Dataset, ResearchProject
from app.ml.predictor import OrganizationalPerformancePredictor

router = APIRouter()

@router.get("/training-progress/{dataset_id}", response_model=Dict[str, Any])
def get_training_progress(
    dataset_id: int,
    model_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the progress of a model training job
    """
    try:
        # Construct the pattern to search for
        pattern = f"training_progress_{dataset_id}_{model_type if model_type else '*'}.json"
        model_storage_path = os.path.join(settings.MODEL_STORAGE_PATH, "models")
        progress_files = glob.glob(os.path.join(model_storage_path, pattern))

        if not progress_files:
            return {
                "status": "not_found",
                "progress": 0,
                "message": "No training job found for the specified dataset"
            }

        # Get the most recent progress file
        latest_file = max(progress_files, key=os.path.getmtime)

        # Read the progress file
        with open(latest_file, 'r') as f:
            progress_data = json.load(f)

        # Check if the user has access to this dataset
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            return {
                "status": "not_found",
                "progress": 0,
                "message": "Dataset not found"
            }

        if dataset.project_id:
            # from app.models.user import UserProject # Already imported at top
            user_project = db.query(UserProject).filter_by(
                user_id=current_user.id,
                project_id=dataset.project_id
            ).first()
            if not user_project:
                return {
                    "status": "forbidden",
                    "progress": 0,
                    "message": "User does not have access to this dataset"
                }

        return progress_data
    except Exception as e:
        print(f"Error getting training progress: {str(e)}")
        return {
            "status": "error",
            "progress": 0,
            "message": f"Error getting training progress: {str(e)}"
        }


@router.get("/analyze-dataset/{dataset_id}", response_model=dict)
async def analyze_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Analyze a dataset to suggest possible target variables and features
    """
    # Check if dataset exists and user has access
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check project access if applicable
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(
            user_id=current_user.id,
            project_id=dataset.project_id
        ).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )

    # Check if the dataset file exists
    if not os.path.exists(dataset.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset file not found"
        )

    try:
        # Initialize predictor
        predictor = OrganizationalPerformancePredictor()

        # Analyze the dataset
        analysis = predictor.analyze_dataset(dataset.file_path)

        # Add dataset info
        analysis["dataset"] = {
            "id": dataset.id,
            "name": dataset.name,
            "record_count": dataset.record_count,
            "dataset_type": dataset.dataset_type,
            "created_at": dataset.created_at
        }

        # Enhance analysis based on dataset type
        if dataset.dataset_type == 'processed':
            # Processed datasets should have network features if available
            network_features = [col for col in analysis.get('numeric_columns', [])
                                if 'centrality' in col or 'community' in col or 'clustering' in col]

            # If we have network features, highlight them
            if network_features:
                if 'network_features' not in analysis:
                    analysis['network_features'] = network_features

            # Suggest potential target variables based on dataset
            if 'potential_targets' not in analysis or not analysis['potential_targets']:
                # Default targets for processed data
                analysis['potential_targets'] = ['performance', 'satisfaction', 'innovation', 'turnover']

            # Check for actual performance metrics in the data
            performance_cols = [col for col in analysis.get('numeric_columns', [])
                                if 'performance' in col or 'score' in col or 'rating' in col or 'productivity' in col]
            if performance_cols:
                # Ensure unique targets, prioritizing performance cols
                analysis['potential_targets'] = list(dict.fromkeys(performance_cols + analysis['potential_targets']))


            # Add feature categories for better organization in the frontend
            feature_categories = {}
            for col in analysis.get('numeric_columns', []):
                if 'centrality' in col or 'community' in col or 'clustering' in col or 'network' in col:
                    feature_categories[col] = 'Network'
                elif 'team' in col or 'group' in col:
                    feature_categories[col] = 'Team'
                elif 'employee' in col or 'tenure' in col or 'experience' in col:
                    feature_categories[col] = 'Employee'
                elif 'manager' in col or 'hierarchy' in col or 'level' in col or 'structure' in col:
                    feature_categories[col] = 'Structure'
                else:
                    feature_categories[col] = 'Other'

            analysis['feature_categories'] = feature_categories

        return analysis

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing dataset: {str(e)}"
        )

@router.post("/train", response_model=dict)
async def train_model(
    training_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Train a new ML model using a processed dataset
    """
    # Check if dataset exists and user has access
    dataset_id = training_data.get("dataset_id")
    if not dataset_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset ID is required"
        )

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check project access if applicable
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(
            user_id=current_user.id,
            project_id=dataset.project_id
        ).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )

    # Check if the dataset file exists
    if not os.path.exists(dataset.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset file not found"
        )

    # Create directory if it doesn't exist
    model_storage_path = os.path.join(settings.MODEL_STORAGE_PATH, "models")
    print(f"Model storage path: {model_storage_path}")
    os.makedirs(model_storage_path, exist_ok=True)

    # Extract parameters from the request
    model_type = training_data.get("model_type", "random_forest")
    target_column = training_data.get("target_column")
    features = training_data.get("features", [])
    validation_strategy = training_data.get("validation_strategy", "cross_validation") # Added validation strategy
    print(f"Using validation strategy: {validation_strategy}") # Added logging

    if not target_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target column is required"
        )

    try:
        # Initialize predictor with specified model type
        predictor = OrganizationalPerformancePredictor(model_type=model_type)

        # Save training progress state to allow resuming if interrupted
        progress_path = os.path.join(model_storage_path, f"training_progress_{dataset_id}_{model_type}.json")

        # Create progress data structure
        progress_data = {
            "status": "started",
            "dataset_id": dataset_id,
            "model_type": model_type,
            "target_column": target_column,
            "features": features,
            "validation_strategy": validation_strategy, # Added validation strategy
            "started_at": str(datetime.now()),
            "user_id": current_user.id,
            "progress": 0
        }

        # Save initial progress state
        with open(progress_path, 'w') as f:
            json.dump(progress_data, f)

        # Train the model using the dataset
        # Pass validation strategy to the training function if it uses it
        results = predictor.train_from_dataset(
            dataset_path=dataset.file_path,
            target_column=target_column,
            feature_cols=features if features else None,
            # Assuming train_from_dataset accepts validation_strategy
            # validation_strategy=validation_strategy
        )

        # Update progress
        progress_data["status"] = "completed"
        progress_data["progress"] = 100
        progress_data["completed_at"] = str(datetime.now())
        progress_data["results"] = results

        with open(progress_path, 'w') as f:
            json.dump(progress_data, f)

        # Log successful training for easier debugging
        print(f"Successfully trained model on dataset {dataset_id} with target {target_column}")
        print(f"Features used: {features if features else 'all numeric'}")
        print(f"Model type: {model_type}, R² score: {results.get('r2')}")

        # Save model
        model_path = predictor.save_model(model_storage_path)

        # Store feature information in training history
        training_history = predictor.training_history or {}
        training_history["features"] = features
        predictor.training_history = training_history

        # Create model record in database with validation strategy in parameters
        model_record = Model(
            name=training_data.get("name", f"{target_column} Prediction Model"),
            description=training_data.get("description", f"Trained {model_type} model for predicting {target_column}"),
            project_id=dataset.project_id,
            created_by_user_id=current_user.id, # Set the creator of the model
            model_type=model_type,
            file_path=model_path,
            dataset_id=dataset_id,
            parameters=json.dumps({ # Store validation strategy within parameters
                **(predictor.training_history.get("parameters", {})),
                "validation_strategy": validation_strategy
            }),
            accuracy=results.get("accuracy"),
            precision=results.get("precision"),
            recall=results.get("recall"),
            f1_score=results.get("f1_score"),
            r2_score=results.get("r2"),
            rmse=results.get("rmse")
        )

        db.add(model_record)
        db.commit()
        db.refresh(model_record)

        # Return results including validation strategy
        return {
            "id": model_record.id,
            "name": model_record.name,
            "description": model_record.description,
            "model_type": model_type,
            "metrics": {
                "r2": results["r2"],
                "rmse": results["rmse"],
                "mae": results["mae"]
            },
            "feature_importances": predictor.feature_importances,
            "parameters": predictor.training_history.get("parameters", {}),
            "features": features,
            "validation_strategy": validation_strategy # Return validation strategy
        }

    except Exception as e:
        # Update progress file on error
        progress_data["status"] = "error"
        progress_data["message"] = str(e)
        progress_data["completed_at"] = str(datetime.now())
        try:
            with open(progress_path, 'w') as f:
                json.dump(progress_data, f)
        except Exception as write_error:
            print(f"Error writing progress file on training failure: {write_error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error training model: {str(e)}"
        )

@router.post("/{model_id}/predict", response_model=dict)
async def predict(
    model_id: int,
    prediction_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Make predictions with a trained model
    """
    # Get model
    model_record = db.query(Model).filter(Model.id == model_id).first()
    if not model_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Check project access if applicable
    if model_record.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(
            user_id=current_user.id,
            project_id=model_record.project_id
        ).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this model"
            )

    try:
        # Load model
        predictor = OrganizationalPerformancePredictor.load_model(model_record.file_path)

        # Prepare input data
        input_data = prediction_data.get("data", {})

        # Convert to DataFrame for team structure evaluation
        import pandas as pd
        team_data = pd.DataFrame([input_data])

        # Make prediction with explanations
        evaluation = predictor.evaluate_team_structure(team_data)

        return {
            "prediction": evaluation["predictions"][0],
            "insights": evaluation["insights"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error making prediction: {str(e)}"
        )

@router.get("/{model_id}", response_model=dict)
def get_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get model details
    """
    # Get model
    model_record = db.query(Model).filter(Model.id == model_id).first()
    if not model_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Check project access if applicable
    if model_record.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(
            user_id=current_user.id,
            project_id=model_record.project_id
        ).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this model"
            )

    # Get dataset information
    dataset_info = None
    if model_record.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == model_record.dataset_id).first()
        if dataset:
            dataset_info = {
                "id": dataset.id,
                "name": dataset.name,
                "description": dataset.description,
                "file_path": dataset.file_path,
                "format": dataset.format,
                "record_count": dataset.record_count,
                "dataset_type": dataset.dataset_type,
                "created_at": dataset.created_at
            }

    # Load model metadata
    training_history = {}
    parameters = {}
    try:
        if model_record.file_path and os.path.exists(model_record.file_path):
             predictor = OrganizationalPerformancePredictor.load_model(model_record.file_path)
             training_history = predictor.get_training_history()
             # Load parameters from the model record (which now includes validation strategy)
             parameters = json.loads(model_record.parameters) if model_record.parameters else {}
        else:
             training_history = {"error": "Model file not found"}
             parameters = json.loads(model_record.parameters) if model_record.parameters else {} # Still load params from DB
    except Exception as e:
        training_history = {"error": f"Could not load model metadata: {str(e)}"}
        # Attempt to load parameters from DB even if model file fails
        try:
            parameters = json.loads(model_record.parameters) if model_record.parameters else {}
        except Exception:
            parameters = {"error": "Could not load parameters"}


    result = {
        "id": model_record.id,
        "name": model_record.name,
        "description": model_record.description,
        "project_id": model_record.project_id,
        "model_type": model_record.model_type,
        "dataset_id": model_record.dataset_id,
        "dataset": dataset_info,
        "parameters": parameters, # Use loaded parameters
        "r2_score": model_record.r2_score,
        "rmse": model_record.rmse,
        "training_history": training_history,
        "created_at": model_record.created_at,
        "updated_at": model_record.updated_at
    }

    return result

# Added PUT endpoint for updating model metadata
@router.put("/{model_id}", response_model=dict)
def update_model(
    model_id: int,
    model_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a model's metadata
    """
    # Get model
    model_record = db.query(Model).filter(Model.id == model_id).first()
    if not model_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Check project access if applicable
    if model_record.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(
            user_id=current_user.id,
            project_id=model_record.project_id
        ).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this model"
            )

    try:
        # Update fields
        if "name" in model_data:
            model_record.name = model_data["name"]
        if "description" in model_data:
            model_record.description = model_data["description"]
        if "is_public" in model_data:
            model_record.is_public = model_data["is_public"]
        # Allow changing project association if needed
        if "project_id" in model_data and model_data["project_id"] is not None:
            # Verify the user has access to the target project
            target_project_id = model_data["project_id"]
            # from app.models.user import UserProject # Already imported
            target_user_project = db.query(UserProject).filter_by(
                user_id=current_user.id,
                project_id=target_project_id
            ).first()
            if not target_user_project:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User does not have access to the target project"
                )
            model_record.project_id = target_project_id
        elif "project_id" in model_data and model_data["project_id"] is None:
             # Allow disassociating from a project (if business logic permits)
             model_record.project_id = None


        # Update the record
        model_record.updated_at = datetime.now()
        db.commit()
        db.refresh(model_record)

        # Return updated model (similar structure to get_model)
        result = {
            "id": model_record.id,
            "name": model_record.name,
            "description": model_record.description,
            "project_id": model_record.project_id,
            "model_type": model_record.model_type,
            "dataset_id": model_record.dataset_id, # Include dataset_id
            "r2_score": model_record.r2_score, # Include metrics
            "rmse": model_record.rmse,
            "created_at": model_record.created_at,
            "updated_at": model_record.updated_at
        }

        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating model: {str(e)}"
        )

# Added POST endpoint for creating model records (e.g., after mock training)
@router.post("/", response_model=dict)
def create_model(
    model_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new model record (e.g., after offline/mock training)
    """
    try:
        # Check if project_id is provided and user has access
        project_id = None # Initialize project_id
        if "project_id" in model_data and model_data["project_id"]:
            project_id = model_data["project_id"]
            # from app.models.user import UserProject # Already imported
            user_project = db.query(UserProject).filter_by(
                user_id=current_user.id,
                project_id=project_id
            ).first()
            if not user_project:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User does not have access to this project"
                )
        # No else needed, project_id remains None if not provided

        # Create model record
        model_record = Model(
            name=model_data.get("name", "New Model"),
            description=model_data.get("description", ""),
            project_id=project_id,
            created_by_user_id=current_user.id, # Set the creator of the model
            model_type=model_data.get("model_type"),
            file_path=model_data.get("file_path"), # May not exist for mock
            dataset_id=model_data.get("dataset_id"),
            parameters=json.dumps(model_data.get("parameters", {})),
            r2_score=model_data.get("r2_score"),
            rmse=model_data.get("rmse")
            # Add other relevant fields if needed from model_data
        )

        db.add(model_record)
        db.commit()
        db.refresh(model_record)

        # Return created model
        result = {
            "id": model_record.id,
            "name": model_record.name,
            "description": model_record.description,
            "project_id": model_record.project_id,
            "model_type": model_record.model_type,
            "dataset_id": model_record.dataset_id,
            "r2_score": model_record.r2_score,
            "rmse": model_record.rmse,
            "created_at": model_record.created_at,
            "updated_at": model_record.updated_at
        }

        return result

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating model: {str(e)}"
        )


@router.delete("/{model_id}", status_code=status.HTTP_200_OK) # Use 200 OK for response body
def delete_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a model
    """
    print(f"Delete model request received for model_id: {model_id}")
    # Get model
    model_record = db.query(Model).filter(Model.id == model_id).first()
    if not model_record:
        print(f"Model not found: {model_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Check project access if applicable
    if model_record.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(
            user_id=current_user.id,
            project_id=model_record.project_id
        ).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this model"
            )

    try:
        # First try to delete the actual model file if it exists
        if model_record.file_path and os.path.exists(model_record.file_path):
            try:
                os.remove(model_record.file_path)
                print(f"Deleted model file: {model_record.file_path}")
            except OSError as e:
                 print(f"Error deleting model file {model_record.file_path}: {e}")
                 # Decide if this should be a fatal error or just a warning

        # Look for training progress files
        if model_record.dataset_id:
            try:
                pattern = f"training_progress_{model_record.dataset_id}_{model_record.model_type}.json"
                model_storage_path = os.path.join(settings.MODEL_STORAGE_PATH, "models")
                progress_files = glob.glob(os.path.join(model_storage_path, pattern))

                # Delete any progress files found
                for file_path in progress_files:
                    try:
                        os.remove(file_path)
                        print(f"Deleted progress file: {file_path}")
                    except OSError as e:
                         print(f"Error deleting progress file {file_path}: {e}")
            except Exception as e:
                 print(f"Error finding/deleting progress files: {e}")


        # Now delete the database record
        db.delete(model_record)
        db.commit()

        print(f"Model {model_id} deleted successfully from DB")
        return {"status": "success", "message": f"Model {model_id} deleted successfully"}

    except Exception as e:
        db.rollback()
        print(f"Error during model deletion process: {e}") # Log the error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting model: {str(e)}"
        )


@router.get("/", response_model=List[dict])
def list_models(
    project_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List models, filtering by project_id if provided and checking access.
    """
    query = db.query(Model)

    if project_id is not None:
        # Check if the project exists first
        project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Research project with id {project_id} not found"
            )

        # Check if the current user has access to this specific project
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=project_id).first()
        if not user_project:
            # If user doesn't have access, return empty list or raise 403?
            # Returning empty list might be less surprising than 403 if they know the project ID exists.
            # Let's raise 403 for clarity.
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN,
                 detail="User does not have access to this research project"
             )
        # Filter models by the specified project_id
        query = query.filter(Model.project_id == project_id)
    else:
        # If no project_id is specified, list models from all projects the user has access to
        # from app.models.user import UserProject # Already imported
        accessible_projects = db.query(UserProject.project_id).filter_by(user_id=current_user.id).distinct().all()
        accessible_project_ids = [p.project_id for p in accessible_projects]
        # Include models with no project association (project_id is None) OR models in accessible projects
        query = query.filter((Model.project_id == None) | (Model.project_id.in_(accessible_project_ids)))


    models = query.order_by(Model.created_at.desc()).offset(skip).limit(limit).all() # Order by creation date

    result = []
    for model in models:
        model_data = {
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "model_type": model.model_type,
            "r2_score": model.r2_score,
            "rmse": model.rmse,
            "project_id": model.project_id,
            "dataset_id": model.dataset_id,
            "created_at": model.created_at,
            "updated_at": model.updated_at
        }

        # Get dataset info if available
        if model.dataset_id:
            dataset = db.query(Dataset).filter(Dataset.id == model.dataset_id).first()
            if dataset:
                model_data["dataset"] = {
                    "id": dataset.id,
                    "name": dataset.name,
                    "record_count": dataset.record_count,
                    "dataset_type": dataset.dataset_type
                }

        # Try to load model metadata for extra information (features, importances)
        try:
            if model.file_path and os.path.exists(model.file_path):
                predictor = OrganizationalPerformancePredictor.load_model(model.file_path)
                training_history = predictor.get_training_history()
                if training_history:
                    # Safely get features and importances
                    features = training_history.get("features", [])
                    importances = training_history.get("feature_importances", {})
                    # Sort importances and take top 5
                    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True)[:5])

                    model_data["training_details"] = {
                        "features": features,
                        "feature_importances": sorted_importances
                    }
            # Optionally load parameters from DB if model file missing/corrupt
            elif model.parameters:
                 try:
                     params_from_db = json.loads(model.parameters)
                     # Extract features if stored in parameters
                     features_from_params = params_from_db.get("features", []) # Assuming features might be stored
                     model_data["training_details"] = {"features": features_from_params}
                 except Exception:
                     pass # Ignore if parameters JSON is invalid

        except Exception as e:
            print(f"Could not load model metadata for model {model.id}: {str(e)}")
            # Don't fail if we can't load metadata, but maybe log it
            pass

        result.append(model_data)

    return result