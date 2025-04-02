from typing import List, Optional 
from fastapi import APIRouter, Depends, HTTPException, status, Body 
from sqlalchemy.orm import Session 
import json 

from app.config.database import get_db 
from app.config.auth import get_current_active_user 
from app.models.user import User 
from app.models.research import Simulation, ResearchProject, Model 
from app.simulation.engine import OrganizationalSimulationEngine 

router = APIRouter() 

@router.post("/", response_model=dict) 
def create_simulation( 
simulation_data: dict = Body(...), 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Create a new simulation 
""" 
# Check if project exists and user has access (if project_id is provided) 
project_id = simulation_data.get("project_id") 
if project_id: 
project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first() 
if not project: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Research project not found" 
) 

# Check if user is part of the project 
from app.models.user import UserProject 
user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=project_id).first() 
if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this research project" 
) 

# Create simulation 
engine = OrganizationalSimulationEngine() 

# Set parameters 
parameters = simulation_data.get("parameters", {}) 
engine.set_parameters(parameters) 

# Check if we should load a model 
model_id = parameters.get("model_id") 
if model_id: 
try: 
# Verify model exists and user has access 
model = db.query(Model).filter(Model.id == model_id).first() 
if model: 
if model.project_id and model.project_id != project_id: 
# Check if user has access to this model's project 
from app.models.user import UserProject 
model_access = db.query(UserProject).filter_by( 
user_id=current_user.id, 
project_id=model.project_id 
).first() 
if not model_access: 
# Not authorized to use this model 
print(f"User {current_user.id} not authorized to use model {model_id}") 
parameters["model_id"] = None 
else: 
# User has access, try to load model 
try: 
if hasattr(engine, 'load_model'): 
engine.load_model(model_id) 
print(f"Loaded model {model_id} for simulation") 
except Exception as load_error: 
print(f"Error loading model {model_id}: {str(load_error)}") 
else: 
# Same project or public model, try to load 
try: 
if hasattr(engine, 'load_model'): 
engine.load_model(model_id) 
print(f"Loaded model {model_id} for simulation") 
except Exception as load_error: 
print(f"Error loading model {model_id}: {str(load_error)}") 
except Exception as e: 
print(f"Error checking model {model_id}: {str(e)}") 

# Initialize organization 
engine.initialize_organization() 

# Create simulation record 
simulation = Simulation( 
name=simulation_data.get("name", "New Simulation"), 
description=simulation_data.get("description", ""), 
project_id=project_id, 
simulation_type=simulation_data.get("simulation_type", "agent_based"), 
parameters=json.dumps(parameters), 
steps=0 # Will be updated as simulation runs 
) 

db.add(simulation) 
db.commit() 
db.refresh(simulation) 

# Save simulation state 
results_path = f"simulations/simulation_{simulation.id}.pkl" 
engine.save_simulation(results_path) 

# Update simulation record with results path 
simulation.results_path = results_path 
db.add(simulation) 
db.commit() 

return { 
"id": simulation.id, 
"name": simulation.name, 
"simulation_type": simulation.simulation_type, 
"steps": 0, 
"status": "initialized", 
"metadata": engine.get_simulation_metadata() 
} 

@router.post("/{simulation_id}/run", response_model=dict) 
def run_simulation( 
simulation_id: int, 
run_data: dict = Body(...), 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Run a simulation for a number of steps 
""" 
# Get simulation 
simulation = db.query(Simulation).filter(Simulation.id == simulation_id).first() 
if not simulation: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Simulation not found" 
) 

# Check project access if applicable 
if simulation.project_id: 
from app.models.user import UserProject 
user_project = db.query(UserProject).filter_by( 
user_id=current_user.id, 
project_id=simulation.project_id 
).first() 
if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this simulation" 
) 

# Load simulation state 
try: 
engine = OrganizationalSimulationEngine.load_simulation(simulation.results_path) 
except Exception as e: 
raise HTTPException( 
status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
detail=f"Error loading simulation: {str(e)}" 
) 

# Get run parameters 
steps = run_data.get("steps", 1) 
interventions = run_data.get("interventions", []) 

# Check if we have a model ID in the request 
model_id = run_data.get("model_id") 
if model_id: 
try: 
# Verify model exists and user has access 
model = db.query(Model).filter(Model.id == model_id).first() 
if model: 
if model.project_id and model.project_id != simulation.project_id: 
# Check if user has access to this model's project 
from app.models.user import UserProject 
model_access = db.query(UserProject).filter_by( 
user_id=current_user.id, 
project_id=model.project_id 
).first() 
if not model_access: 
# Not authorized to use this model 
print(f"User {current_user.id} not authorized to use model {model_id}") 
else: 
# User has access, try to load model 
try: 
# Try to load the model for simulation 
engine.parameters["model_id"] = model_id 
# If engine has a load_model method, call it 
if hasattr(engine, 'load_model'): 
engine.load_model(model_id) 
print(f"Using model {model_id} for simulation") 
except Exception as load_error: 
print(f"Error loading model {model_id}: {str(load_error)}") 
else: 
# Same project or public model, try to load 
try: 
# Try to load the model for simulation 
engine.parameters["model_id"] = model_id 
# If engine has a load_model method, call it 
if hasattr(engine, 'load_model'): 
engine.load_model(model_id) 
print(f"Using model {model_id} for simulation") 
except Exception as load_error: 
print(f"Error loading model {model_id}: {str(load_error)}") 
except Exception as e: 
print(f"Error checking model {model_id}: {str(e)}") 

# Run simulation 
try: 
engine.run_simulation(steps, interventions) 
except Exception as e: 
raise HTTPException( 
status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
detail=f"Error running simulation: {str(e)}" 
) 

# Save updated simulation state 
engine.save_simulation(simulation.results_path) 

# Update simulation record 
simulation.steps += steps 
simulation.summary = json.dumps(engine.get_summary_metrics().tail(1).to_dict(orient="records")[0]) 
db.add(simulation) 
db.commit() 

# Return results 
return { 
"id": simulation.id, 
"name": simulation.name, 
"steps": simulation.steps, 
"status": "completed", 
"summary": json.loads(simulation.summary) if simulation.summary else None, 
"metadata": engine.get_simulation_metadata() 
} 

@router.get("/{simulation_id}", response_model=dict) 
def get_simulation( 
simulation_id: int, 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
Get simulation details 
""" 
# Get simulation 
simulation = db.query(Simulation).filter(Simulation.id == simulation_id).first() 
if not simulation: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Simulation not found" 
) 

# Check project access if applicable 
if simulation.project_id: 
from app.models.user import UserProject 
user_project = db.query(UserProject).filter_by( 
user_id=current_user.id, 
project_id=simulation.project_id 
).first() 
if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this simulation" 
) 

# Load simulation metadata 
try: 
engine = OrganizationalSimulationEngine.load_simulation(simulation.results_path) 
metadata = engine.get_simulation_metadata() 
except Exception as e: 
metadata = {"error": f"Could not load simulation metadata: {str(e)}"} 

return { 
"id": simulation.id, 
"name": simulation.name, 
"description": simulation.description, 
"project_id": simulation.project_id, 
"simulation_type": simulation.simulation_type, 
"parameters": json.loads(simulation.parameters) if simulation.parameters else {}, 
"steps": simulation.steps, 
"summary": json.loads(simulation.summary) if simulation.summary else None, 
"metadata": metadata, 
"created_at": simulation.created_at, 
"updated_at": simulation.updated_at 
} 

@router.get("/", response_model=List[dict]) 
def list_simulations( 
project_id: Optional[int] = None, 
skip: int = 0, 
limit: int = 100, 
db: Session = Depends(get_db), 
current_user: User = Depends(get_current_active_user) 
): 
""" 
List simulations 
""" 
query = db.query(Simulation) 

# Filter by project if project_id is provided 
if project_id is not None: 
query = query.filter(Simulation.project_id == project_id) 

# Check if user has access to project 
project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first() 
if not project: 
raise HTTPException( 
status_code=status.HTTP_404_NOT_FOUND, 
detail="Research project not found" 
) 

from app.models.user import UserProject 
user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=project_id).first() 
if not user_project: 
raise HTTPException( 
status_code=status.HTTP_403_FORBIDDEN, 
detail="User does not have access to this research project" 
) 
else: 
# Only return simulations from projects the user has access to 
# This is a simplified query and might need optimization for production 
from app.models.user import UserProject 
accessible_projects = db.query(UserProject.project_id).filter_by(user_id=current_user.id).all() 
accessible_project_ids = [p.project_id for p in accessible_projects] 
query = query.filter(Simulation.project_id.in_(accessible_project_ids)) 

simulations = query.offset(skip).limit(limit).all() 

return [ 
{ 
"id": sim.id, 
"name": sim.name, 
"project_id": sim.project_id, 
"simulation_type": sim.simulation_type, 
"steps": sim.steps, 
"created_at": sim.created_at 
} 
for sim in simulations 
]