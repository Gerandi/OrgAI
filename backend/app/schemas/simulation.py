from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union

class ParameterGuide(BaseModel):
    name: str
    description: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    default_value: Any
    options: Optional[List[str]] = None
    
class SimulationParameters(BaseModel):
    team_size: int = Field(
        8, 
        ge=3, 
        le=50, 
        description="Average number of employees per team"
    )
    hierarchy_levels: int = Field(
        3, 
        ge=1, 
        le=10, 
        description="Number of organizational hierarchy levels"
    )
    communication_density: float = Field(
        0.6, 
        ge=0.1, 
        le=1.0, 
        description="Density of communication network (0.1-1.0)"
    )
    turnover_rate: float = Field(
        0.05, 
        ge=0.01, 
        le=0.5, 
        description="Annual employee turnover rate (0.01-0.5)"
    )
    training_frequency: str = Field(
        "quarterly", 
        description="How often training occurs"
    )
    simulation_duration: int = Field(
        12, 
        ge=1, 
        le=60, 
        description="Duration of simulation in months"
    )
    random_seed: int = Field(
        42, 
        description="Random seed for reproducibility"
    )
    model_id: Optional[int] = Field(
        None, 
        description="ID of model to use for predictions"
    )
    processed_dataset_id: Optional[int] = Field(
        None, 
        description="ID of processed dataset to initialize from"
    )
    simulation_mode: str = Field(
        "synthetic", 
        description="Simulation mode: 'synthetic' or 'real_data'"
    )
    
    @validator('training_frequency')
    def validate_training_frequency(cls, v):
        valid_options = ["monthly", "quarterly", "biannual", "annual"]
        if v not in valid_options:
            raise ValueError(f"training_frequency must be one of {valid_options}")
        return v
    
    @validator('simulation_mode')
    def validate_simulation_mode(cls, v):
        valid_options = ["synthetic", "real_data"]
        if v not in valid_options:
            raise ValueError(f"simulation_mode must be one of {valid_options}")
        return v

class SimulationCreate(BaseModel):
    name: str = Field(..., description="Name of the simulation")
    description: Optional[str] = Field(None, description="Description of the simulation")
    project_id: Optional[int] = Field(None, description="ID of the project this simulation belongs to")
    parameters: SimulationParameters = Field(..., description="Simulation parameters")
    dataset_id: Optional[int] = Field(None, description="ID of the dataset to initialize from (if using real data)")

class InterventionCreate(BaseModel):
    type: str = Field(..., description="Type of intervention")
    month: int = Field(..., ge=1, description="Month to apply intervention")
    intensity: int = Field(50, ge=1, le=100, description="Intensity of intervention (1-100)")
    target_teams: List[int] = Field([], description="List of team IDs to target (empty for all teams)")
    description: Optional[str] = Field(None, description="Description of intervention")

class SimulationRunRequest(BaseModel):
    steps: int = Field(1, ge=1, le=60, description="Number of steps to run")
    interventions: List[InterventionCreate] = Field([], description="Interventions to apply")
    model_id: Optional[int] = Field(None, description="Model ID to use for predictions")

class ParameterGuideResponse(BaseModel):
    parameters: List[ParameterGuide]
    derived_parameters: Optional[Dict[str, Any]] = None
    warnings: Optional[List[str]] = None