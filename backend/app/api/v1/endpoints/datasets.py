from fastapi.responses import FileResponse
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
import pandas as pd

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.config.settings import settings
from app.models.user import User, UserProject # Import UserProject
from app.models.research import Dataset, ResearchProject
from app.data.processor import OrganizationDataProcessor

router = APIRouter()

@router.get("/templates/{template_name}", response_class=FileResponse)
async def get_template(template_name: str):
    """
    Download a CSV template for data import
    """
    # Define available templates
    templates = {
        "organization_structure": "organization_structure_template.csv",
        "communication_data": "communication_data_template.csv",
        "performance_metrics": "performance_metrics_template.csv"
    }

    if template_name not in templates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_name}' not found"
        )

    # Path to template file
    template_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "data", "templates", templates[template_name]
    )

    if not os.path.exists(template_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template file not found"
        )

    return FileResponse(
        path=template_path,
        filename=templates[template_name],
        media_type="text/csv"
    )

@router.get("/{dataset_id}/export", response_class=FileResponse)
async def export_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Export a dataset as CSV
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check if user has access to the project
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=dataset.project_id).first()
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

    return FileResponse(
        path=dataset.file_path,
        filename=f"{dataset.name}.{dataset.format}",
        media_type="text/csv" if dataset.format == "csv" else "application/octet-stream"
    )

@router.post("/upload", response_model=dict)
async def upload_dataset(
    file: UploadFile = File(...),
    file_type: str = Form(None), # Made optional to support auto-detection
    project_id: int = Form(None),
    name: str = Form(None),
    description: str = Form(None),
    auto_detect: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload a dataset file
    """
    # Check if project exists and user has access (if project_id is provided)
    if project_id:
        project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Research project not found"
            )

        # Check if user is part of the project
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=project_id).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this research project"
            )

    # Create directory if it doesn't exist
    upload_dir = os.path.join(settings.MODEL_STORAGE_PATH, "datasets")
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename with optional project info
    file_extension = os.path.splitext(file.filename)[1]
    dataset_name = name or os.path.splitext(file.filename)[0]
    if project_id:
        filename = f"{dataset_name}_project{project_id}_{current_user.id}{file_extension}"
    else:
        filename = f"{dataset_name}_{current_user.id}{file_extension}"
    file_path = os.path.join(upload_dir, filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get file size
    file_size = os.path.getsize(file_path)

    # Try to load file to get record count
    record_count = 0
    try:
        if file_extension.lower() in ['.csv', '.txt']:
            df = pd.read_csv(file_path)
            record_count = len(df)
        elif file_extension.lower() in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
            record_count = len(df)
    except Exception as e:
        print(f"Error reading file: {str(e)}")

    # Add dataset type metadata to help with identification
    dataset_type = None

    # Auto-detect file type if requested or if file_type is not provided
    if auto_detect or not file_type:
        try:
            # Create a processor
            processor = OrganizationDataProcessor()

            # Read the first few rows of the file
            if file_extension.lower() in ['.csv', '.txt']:
                df = pd.read_csv(file_path, nrows=100) # Only read first 100 rows for efficiency
            elif file_extension.lower() in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path, nrows=100)
            else:
                # Skip auto-detection for unknown file types
                print(f"Skipping auto-detection for unsupported file type: {file_extension}")
                df = None

            # Detect dataset type
            if df is not None and not df.empty:
                detected_type = processor.detect_dataset_type(df)
                if detected_type != 'unknown':
                    dataset_type = detected_type
                print(f"Auto-detected dataset type: {dataset_type}")
        except Exception as e:
            print(f"Error during auto-detection: {str(e)}")

    # Use provided file_type if auto-detection failed or was not requested
    if not dataset_type and file_type:
        if file_type in ['organization', 'organization_structure', 'org_structure']:
            dataset_type = 'organization'
        elif file_type in ['communication', 'communication_data', 'network']:
            dataset_type = 'communication'
        elif file_type in ['performance', 'performance_metrics', 'metrics']:
            dataset_type = 'performance'
        elif file_type in ['processed']:
            dataset_type = 'processed'
        else:
            dataset_type = 'custom'

    # Default to 'custom' if all else fails
    if not dataset_type:
        dataset_type = 'custom'

    # Create dataset record
    dataset = Dataset(
        name=dataset_name,
        description=description or f"Uploaded {file_type} data",
        project_id=project_id, # This can be None for personal uploads
        created_by_user_id=current_user.id, # Set the creator of the dataset
        file_path=file_path,
        format=file_extension.lstrip('.'),
        size_bytes=file_size,
        record_count=record_count,
        source="upload",
        is_anonymized=False,
        dataset_type=dataset_type # Store the dataset type for easier identification
    )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return {
        "id": dataset.id,
        "name": dataset.name,
        "description": dataset.description,
        "format": dataset.format,
        "size_bytes": dataset.size_bytes,
        "record_count": dataset.record_count,
        "created_at": dataset.created_at
    }

@router.get("/", response_model=List[dict])
def list_datasets(
    project_id: int = None,
    dataset_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all datasets
    """
    query = db.query(Dataset)

    # Filter by project if project_id is provided
    if project_id:
        query = query.filter(Dataset.project_id == project_id)

        # Check if user has access to project
        project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Research project not found"
            )

        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=project_id).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this research project"
            )
    else:
        # Include datasets with no project_id (personally uploaded datasets)
        # and datasets from projects the user has access to
        try:
            from sqlalchemy import or_
            # Check if UserProject table exists
            try:
                # First try SQLite syntax
                tables = db.bind.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="user_projects"').fetchall()
                table_exists = len(tables) > 0
            except:
                # Fallback to more generic approach
                from sqlalchemy import inspect
                table_exists = inspect(db.bind).has_table("user_projects")

            if table_exists:
                # from app.models.user import UserProject # Already imported
                accessible_projects = db.query(UserProject.project_id).filter_by(user_id=current_user.id).all()
                accessible_project_ids = [p.project_id for p in accessible_projects]
                # Include personal datasets (no project_id) or from accessible projects
                query = query.filter(or_(Dataset.project_id.is_(None), Dataset.project_id.in_(accessible_project_ids)))
            else:
                # If no project associations exist, just show all datasets
                pass
        except Exception as e:
            print(f"Error filtering datasets by project: {str(e)}")
            # If there's an error, don't apply project filtering - show all datasets
            pass

    # Filter by dataset_type if provided
    if dataset_type:
        query = query.filter(Dataset.dataset_type == dataset_type)
        
    # Get datasets
    print(f"Fetching datasets for user: {current_user.username}")
    datasets = query.offset(skip).limit(limit).all()
    print(f"Found {len(datasets)} datasets, filtered by type: {dataset_type if dataset_type else 'None'}")

    return [
        {
            "id": ds.id,
            "name": ds.name,
            "description": ds.description,
            "project_id": ds.project_id,
            "format": ds.format,
            "size_bytes": ds.size_bytes,
            "record_count": ds.record_count,
            "dataset_type": ds.dataset_type,
            "created_at": ds.created_at
        }
        for ds in datasets
    ]

@router.get("/{dataset_id}", response_model=dict)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get dataset details
    """
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check if user has access to the project
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=dataset.project_id).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )

    return {
        "id": dataset.id,
        "name": dataset.name,
        "description": dataset.description,
        "project_id": dataset.project_id,
        "file_path": dataset.file_path,
        "format": dataset.format,
        "size_bytes": dataset.size_bytes,
        "record_count": dataset.record_count,
        "source": dataset.source,
        "date_collected": dataset.date_collected,
        "is_anonymized": dataset.is_anonymized,
        "created_at": dataset.created_at
    }

@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a dataset
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check if user has access to the project
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=dataset.project_id).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )

    try:
        # Store dataset ID and type for later use
        dataset_id_to_delete = dataset.id
        dataset_type = dataset.dataset_type

        # Try to delete the physical file
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)

        # Delete references and handle orphans
        from app.models.research import Model, Citation, Dataset as DatasetModel

        # Nullify references in Models trained on this dataset
        db.query(Model).filter(Model.dataset_id == dataset_id_to_delete).update({"dataset_id": None}, synchronize_session=False)

        # Delete Citations pointing to this dataset
        db.query(Citation).filter(Citation.dataset_id == dataset_id_to_delete).delete(synchronize_session=False)

        # If deleting a SOURCE dataset, handle derived PROCESSED datasets
        if dataset_type in ['organization', 'communication', 'performance']:
            source_string = f"processed from dataset {dataset_id_to_delete}"
            # Find processed datasets derived from this source
            derived_datasets = db.query(DatasetModel).filter(DatasetModel.source == source_string).all()
            for derived_ds in derived_datasets:
                # Mark as having missing source
                derived_ds.description = f"[Source Missing] {derived_ds.description}"
                derived_ds.source = f"source deleted (was: {derived_ds.source})"
                db.add(derived_ds)

        # Delete the dataset record itself
        db.delete(dataset)
        db.commit()

        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting dataset: {str(e)}"
        )

@router.post("/{dataset_id}/process", response_model=dict)
async def process_dataset(
    dataset_id: int,
    process_options: dict = Body(default={}),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Process a dataset using the data processor
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check if user has access to the project
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=dataset.project_id).first()
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

    # Create processor
    processor = OrganizationDataProcessor()

    # Process based on dataset type/options
    if process_options is None:
        process_options = {}

    dataset_type = process_options.get("dataset_type", "org_structure")
    performance_dataset_id = process_options.get("performance_dataset_id")
    communication_dataset_id = process_options.get("communication_dataset_id")

    try:
        # First, load the primary dataset
        if dataset_type == "org_structure":
            df = processor.import_org_structure(dataset.file_path)
        elif dataset_type == "communication":
            df = processor.import_communication_data(dataset.file_path)
        elif dataset_type == "performance":
            # Use the specialized performance data import method
            df = processor.import_performance_data(dataset.file_path)
            performance_data = df
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported dataset type: {dataset_type}"
            )

        # Load additional datasets if specified
        performance_data = None
        if performance_dataset_id:
            perf_dataset = db.query(Dataset).filter(Dataset.id == performance_dataset_id).first()
            if perf_dataset and os.path.exists(perf_dataset.file_path):
                # Use specialized import for performance data
                performance_data = processor.import_performance_data(perf_dataset.file_path)

        # Load communication data if specified
        if communication_dataset_id:
            comm_dataset = db.query(Dataset).filter(Dataset.id == communication_dataset_id).first()
            if comm_dataset and os.path.exists(comm_dataset.file_path):
                processor.import_communication_data(comm_dataset.file_path)

        # Build network if communication data is available
        if dataset_type == "communication" or processor.comm_data is not None or process_options.get("build_network", False):
            processor.build_network()

        # Merge all available data
        processor.merge_features(performance_data)

        # Prepare output path
        output_dir = os.path.join(settings.MODEL_STORAGE_PATH, "processed")
        os.makedirs(output_dir, exist_ok=True)

        # Use project info in the filename if available
        project_info = f"_project{process_options.get('project_id')}" if process_options and process_options.get('project_id') else ""
        output_name = f"{dataset.name}_processed{project_info}_{current_user.id}.csv"
        output_path = os.path.join(output_dir, output_name)

        # Export processed data
        processor.export_processed_data(output_path)

        # Get dataset description from options or use default
        dataset_description = process_options.get('description', f"Processed version of {dataset.name}")

        # Create new dataset for processed data
        processed_dataset = Dataset(
            name=os.path.splitext(output_name)[0],
            description=dataset_description,
            project_id=process_options.get('project_id', dataset.project_id),
            created_by_user_id=current_user.id, # Set the creator of the dataset
            file_path=output_path,
            format="csv",
            size_bytes=os.path.getsize(output_path),
            record_count=len(processor.feature_data) if processor.feature_data is not None else 0,
            source=f"processed from dataset {dataset_id}",
            dataset_type="processed" # Mark as processed for better identification
        )

        db.add(processed_dataset)
        db.commit()
        db.refresh(processed_dataset)

        # Get processing summary
        summary = processor.get_processing_summary()

        # Check if we have network features for better frontend guidance
        has_network_features = processor.network is not None or processor.comm_data is not None
        network_features = []

        # Get column names from the processed data
        df = pd.read_csv(output_path)
        feature_names = list(df.columns)

        # Get network features specifically
        if has_network_features:
            network_features = [col for col in feature_names if any(term in col.lower() for term in ['centrality', 'community', 'clustering', 'bridge', 'network', 'degree', 'betweenness', 'closeness', 'eigenvector'])]

        # Get potential target variables with improved detection
        target_keywords = ['performance', 'score', 'rating', 'productivity', 'satisfaction', 'turnover', 'retention', 'promotion', 'bonus', 'achievement', 'goal']
        potential_targets = [col for col in feature_names if any(keyword in col.lower() for keyword in target_keywords)]

        # If no targets found based on keywords, use default suggestions
        if not potential_targets:
            potential_targets = ['performance', 'satisfaction', 'innovation', 'turnover']

        # Get organization metrics
        org_metrics = [col for col in feature_names if any(term in col.lower() for term in ['team_size', 'tenure', 'level', 'reports', 'department', 'role', 'management'])]

        # Make sure to exclude employee_id from potential targets
        if 'employee_id' in potential_targets:
            potential_targets.remove('employee_id')

        # Enhance summary with additional information
        enhanced_summary = summary.copy()
        enhanced_summary.update({
            "feature_names": feature_names,
            "network_features": network_features,
            "org_metrics": org_metrics,
            "has_network_data": has_network_features,
            "potential_targets": potential_targets,
            "selected_dataset_ids": {
                "organization": dataset_id,
                "communication": process_options.get("communication_dataset_id"),
                "performance": process_options.get("performance_dataset_id")
            }
        })

        return {
            "dataset_id": processed_dataset.id,
            "name": processed_dataset.name,
            "record_count": processed_dataset.record_count,
            "dataset_type": "processed",
            "processing_summary": enhanced_summary,
            "source_datasets": {
                "organization": dataset_id if dataset_type == "org_structure" else None,
                "communication": dataset_id if dataset_type == "communication" else communication_dataset_id,
                "performance": dataset_id if dataset_type == "performance" else performance_dataset_id
            },
            "columns": feature_names,
            "warnings": summary.get("warnings", [])
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing dataset: {str(e)}"
        )