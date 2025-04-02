from typing import List, Optional 
from fastapi import APIRouter, Depends, HTTPException, status, Body 
from sqlalchemy.orm import Session 

from app.config.database import get_db 
from app.config.auth import get_current_active_user 
from app.models.user import User, UserProject 
from app.models.research import ResearchProject, Publication, Citation 

router = APIRouter() 

@router.post("/projects", response_model=dict) 
def create_project( 
project_data: dict = Body(), 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Create a new research project 
""" 
# Create project 
project = ResearchProject( 
title=project_data["title"], 
description=project_data.get("description"), 
status=project_data.get("status", "active"), 
visibility=project_data.get("visibility", "private") 
) 

db.add(project) 
db.commit() 
db.refresh(project) 

# Add current user as owner 
user_project = UserProject( 
user_id=current_user.id, 
project_id=project.id, 
role="owner" 
) 

db.add(user_project) 
db.commit() 

return { 
"id": project.id, 
"title": project.title, 
"description": project.description, 
"status": project.status, 
"visibility": project.visibility, 
"created_at": project.created_at, 
"updated_at": project.updated_at 
} 

@router.get("/projects", response_model=List[dict]) 
def list_projects( 
skip: int = 0, 
limit: int = 100, 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
List research projects for current user 
""" 
try: 
# Get all projects where user has a role 
print(f"Listing projects for user: {current_user.username} (ID: {current_user.id})") 
projects = db.query(ResearchProject)\ 
.join(UserProject, ResearchProject.id == UserProject.project_id)\ 
.filter(UserProject.user_id == current_user.id)\ 
.offset(skip)\ 
.limit(limit)\ 
.all() 

print(f"Found {len(projects)} projects for user {current_user.username}") 
except Exception as e: 
print(f"Error listing projects: {str(e)}") 
raise HTTPException( 
status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
detail=f"Error listing projects: {str(e)}" 
) 

return [ 
{ 
"id": project.id, 
"title": project.title, 
"description": project.description, 
"status": project.status, 
"visibility": project.visibility, 
"created_at": project.created_at, 
"updated_at": project.updated_at 
} 
for project in projects 
] 

@router.get("/projects/{project_id}", response_model=dict) 
def get_project( 
project_id: int, 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Get research project details 
""" 
try: 
print(f"Attempting to fetch project with ID {project_id}") 

# Get project 
project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first() 
if not project: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Research project not found" 
) 

# Check if user has access to project 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == project_id)\ 
.first() 

if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this project" 
) 

# Count resources 
from app.models.research import Dataset, Model, Simulation 
datasets_count = db.query(Dataset).filter(Dataset.project_id == project_id).count() 
models_count = db.query(Model).filter(Model.project_id == project_id).count() 
simulations_count = db.query(Simulation).filter(Simulation.project_id == project_id).count() 
publications_count = db.query(Publication).filter(Publication.project_id == project_id).count() 

# Get team members 
team_members = db.query(UserProject, User)\ 
.join(User, UserProject.user_id == User.id)\ 
.filter(UserProject.project_id == project_id)\ 
.all() 

members = [ 
{ 
"id": member.User.id, 
"username": member.User.username, 
"full_name": member.User.full_name, 
"role": member.UserProject.role 
} 
for member in team_members 
] 

return { 
"id": project.id, 
"title": project.title, 
"description": project.description, 
"status": project.status, 
"visibility": project.visibility, 
"resources": { 
"datasets_count": datasets_count, 
"models_count": models_count, 
"simulations_count": simulations_count, 
"publications_count": publications_count 
}, 
"team": members, 
"user_role": user_project.role, 
"created_at": project.created_at, 
"updated_at": project.updated_at 
} 
except Exception as e: 
print(f"Error retrieving project details: {str(e)}") 
raise HTTPException( 
status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
detail=f"Error retrieving project details: {str(e)}" 
) 

@router.put("/projects/{project_id}", response_model=dict) 
def update_project( 
project_id: int, 
project_data: dict = Body(...), 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Update a research project 
""" 
# Check if user has admin rights to project 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == project_id)\ 
.first() 

if not user_project or user_project.role not in ["owner", "admin"]: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have admin rights to this project" 
) 

# Get project 
project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first() 
if not project: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Research project not found" 
) 

# Update project fields 
if "title" in project_data: 
project.title = project_data["title"] 
if "description" in project_data: 
project.description = project_data["description"] 
if "status" in project_data: 
project.status = project_data["status"] 
if "visibility" in project_data: 
project.visibility = project_data["visibility"] 

db.commit() 
db.refresh(project) 

return { 
"id": project.id, 
"title": project.title, 
"description": project.description, 
"status": project.status, 
"visibility": project.visibility, 
"created_at": project.created_at, 
"updated_at": project.updated_at 
} 

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT) 
def delete_project( 
project_id: int, 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Delete a research project 
""" 
# Check if user has owner rights to project 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == project_id)\ 
.first() 

if not user_project or user_project.role != "owner": 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="Only the project owner can delete a project" 
) 

# Get project 
project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first() 
if not project: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Research project not found" 
) 

try: 
# Import all necessary models 
from app.models.research import Dataset, Model, Simulation 

# Delete in this order to avoid foreign key constraints: 
# 1. First delete citations that reference project resources 
db.query(Citation).filter( 
((Citation.dataset_id.in_(db.query(Dataset.id).filter(Dataset.project_id == project_id)))) | 
((Citation.model_id.in_(db.query(Model.id).filter(Model.project_id == project_id)))) | 
((Citation.publication_id.in_(db.query(Publication.id).filter(Publication.project_id == project_id)))) 
).delete(synchronize_session=False) 

# 2. Delete publications 
db.query(Publication).filter(Publication.project_id == project_id).delete(synchronize_session=False) 

# 3. Delete models 
db.query(Model).filter(Model.project_id == project_id).delete(synchronize_session=False) 

# 4. Delete datasets 
db.query(Dataset).filter(Dataset.project_id == project_id).delete(synchronize_session=False) 

# 5. Delete simulations 
db.query(Simulation).filter(Simulation.project_id == project_id).delete(synchronize_session=False) 

# 6. Delete user associations 
db.query(UserProject).filter(UserProject.project_id == project_id).delete(synchronize_session=False) 

# 7. Finally delete the project itself 
db.delete(project) 
db.commit() 

return None 
except Exception as e: 
db.rollback() 
raise HTTPException( 
status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
detail=f"Error deleting project: {str(e)}" 
) 

@router.post("/projects/{project_id}/members", response_model=dict) 
def add_project_member( 
project_id: int, 
member_data: dict = Body(...), 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Add a member to the research project 
""" 
# Check if user has admin rights to project 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == project_id)\ 
.first() 

if not user_project or user_project.role not in ["owner", "admin"]: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have admin rights to this project" 
) 

# Check if project exists 
project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first() 
if not project: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Research project not found" 
) 

# Check if user exists 
user = db.query(User).filter(User.username == member_data["username"]).first() 
if not user: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="User not found" 
) 

# Check if user is already a member 
existing_member = db.query(UserProject)\ 
.filter(UserProject.user_id == user.id, UserProject.project_id == project_id)\ 
.first() 

if existing_member: 
raise HTTPException( 
status_code=status.HTTP_400_BAD_REQUEST, 
detail="User is already a member of this project" 
) 

# Add user to project 
new_member = UserProject( 
user_id=user.id, 
project_id=project_id, 
role=member_data.get("role", "member") 
) 

db.add(new_member) 
db.commit() 

return { 
"id": user.id, 
"username": user.username, 
"full_name": user.full_name, 
"role": new_member.role 
} 

@router.post("/publications", response_model=dict) 
def create_publication( 
publication_data: dict = Body(...), 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Create a new publication 
""" 
# Check if project exists and user has access 
project_id = publication_data.get("project_id") 
if project_id: 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == project_id)\ 
.first() 

if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this project" 
) 

# Create publication 
publication = Publication( 
title=publication_data["title"], 
abstract=publication_data.get("abstract"), 
project_id=project_id, 
authors=publication_data.get("authors", ""), 
publication_type=publication_data.get("publication_type", "conference"), 
venue=publication_data.get("venue"), 
publication_date=publication_data.get("publication_date"), 
doi=publication_data.get("doi"), 
url=publication_data.get("url"), 
file_path=publication_data.get("file_path") 
) 

db.add(publication) 
db.commit() 
db.refresh(publication) 

return { 
"id": publication.id, 
"title": publication.title, 
"abstract": publication.abstract, 
"authors": publication.authors, 
"publication_type": publication.publication_type, 
"venue": publication.venue, 
"created_at": publication.created_at 
} 

@router.get("/publications", response_model=List[dict]) 
def list_publications( 
project_id: Optional[int] = None, 
skip: int = 0, 
limit: int = 100, 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
List publications 
""" 
query = db.query(Publication) 

# Filter by project if project_id is provided 
if project_id is not None: 
query = query.filter(Publication.project_id == project_id) 

# Check if user has access to project 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == project_id)\ 
.first() 

if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this project" 
) 
else: 
# Only return publications from projects the user has access to 
accessible_projects = db.query(UserProject.project_id).filter(UserProject.user_id == current_user.id).all() 
accessible_project_ids = [p.project_id for p in accessible_projects] 
query = query.filter(Publication.project_id.in_(accessible_project_ids)) 

publications = query.offset(skip).limit(limit).all() 

return [ 
{ 
"id": pub.id, 
"title": pub.title, 
"authors": pub.authors, 
"publication_type": pub.publication_type, 
"venue": pub.venue, 
"project_id": pub.project_id, 
"created_at": pub.created_at 
} 
for pub in publications 
] 

@router.post("/citations", response_model=dict) 
def add_citation( 
citation_data: dict = Body(...), 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Add a citation to a publication, dataset, or model 
""" 
# Check if the cited resource exists and user has access 
if "publication_id" in citation_data: 
publication = db.query(Publication).filter(Publication.id == citation_data["publication_id"]).first() 
if not publication: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Publication not found" 
) 

# Check project access if applicable 
if publication.project_id: 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == publication.project_id)\ 
.first() 

if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this publication" 
) 
elif "dataset_id" in citation_data: 
from app.models.research import Dataset 
dataset = db.query(Dataset).filter(Dataset.id == citation_data["dataset_id"]).first() 
if not dataset: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Dataset not found" 
) 

# Check project access if applicable 
if dataset.project_id: 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == dataset.project_id)\ 
.first() 

if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this dataset" 
) 
elif "model_id" in citation_data: 
from app.models.research import Model 
model = db.query(Model).filter(Model.id == citation_data["model_id"]).first() 
if not model: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Model not found" 
) 

# Check project access if applicable 
if model.project_id: 
user_project = db.query(UserProject)\ 
.filter(UserProject.user_id == current_user.id, UserProject.project_id == model.project_id)\ 
.first() 

if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this model" 
) 
else: 
raise HTTPException( 
status_code=status.HTTP_400_BAD_REQUEST, 
detail="Must specify publication_id, dataset_id, or model_id" 
) 

# Create citation 
citation = Citation( 
publication_id=citation_data.get("publication_id"), 
dataset_id=citation_data.get("dataset_id"), 
model_id=citation_data.get("model_id"), 
citing_title=citation_data["citing_title"], 
citing_authors=citation_data["citing_authors"], 
citing_venue=citation_data.get("citing_venue"), 
citing_date=citation_data.get("citing_date"), 
citing_url=citation_data.get("citing_url") 
) 

db.add(citation) 
db.commit() 
db.refresh(citation) 

return { 
"id": citation.id, 
"publication_id": citation.publication_id, 
"dataset_id": citation.dataset_id, 
"model_id": citation.model_id, 
"citing_title": citation.citing_title, 
"citing_authors": citation.citing_authors, 
"created_at": citation.created_at 
}