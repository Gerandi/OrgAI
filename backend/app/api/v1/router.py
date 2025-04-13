from fastapi import APIRouter 

from app.api.v1.endpoints import auth, users, organizations, teams, employees, departments 
from app.api.v1.endpoints import datasets, models, simulations, research, networks, activities, metrics
from app.api.v1.endpoints import feature_identification, communities 

api_router = APIRouter() 

# Add all the API endpoints to the router 
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"]) 
api_router.include_router(users.router, prefix="/users", tags=["users"]) 
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"]) 
api_router.include_router(teams.router, prefix="/teams", tags=["teams"]) 
api_router.include_router(employees.router, prefix="/employees", tags=["employees"]) 
api_router.include_router(departments.router, prefix="/departments", tags=["departments"]) 
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"]) 
api_router.include_router(models.router, prefix="/models", tags=["models"]) 
api_router.include_router(simulations.router, prefix="/simulations", tags=["simulations"]) 
api_router.include_router(research.router, prefix="/research", tags=["research"]) 
api_router.include_router(networks.router, prefix="/networks", tags=["networks"]) 
api_router.include_router(activities.router, prefix="/activities", tags=["activities"]) 
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(feature_identification.router, prefix="/feature-identification", tags=["feature-identification"])
api_router.include_router(communities.router, prefix="/communities", tags=["communities"])