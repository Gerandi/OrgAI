from fastapi import APIRouter, Depends, HTTPException, status 
from sqlalchemy.orm import Session 
import pandas as pd 
import networkx as nx 
import json 
import os 
import datetime 

from app.config.database import get_db 
from app.config.auth import get_current_active_user 
from app.models.user import User, UserOrganization
from app.models.organization import Organization, Department, Team, Employee
from app.models.research import Dataset, Model, Simulation 
from app.data.processor import OrganizationDataProcessor 

router = APIRouter() 

@router.get("/dashboard/summary", response_model=dict) 
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """ 
    Get all dashboard metrics in a single consolidated endpoint 
    """
    try:
        # Get all metrics at once with real data only (no mock data)
        performance_data = await get_performance_data(db, current_user)
        org_metrics = await get_organization_metrics(db, current_user)
        team_metrics = await get_team_metrics(db, current_user)
        driver_metrics = await get_performance_drivers(db, current_user)
        
        # Get datasets for the user 
        from app.models.user import UserProject 
        accessible_projects = db.query(UserProject.project_id).filter_by(user_id=current_user.id).all() 
        accessible_project_ids = [p.project_id for p in accessible_projects] 
        
        # Get available datasets
        datasets = db.query(Dataset).filter(
            Dataset.project_id.in_(accessible_project_ids) if accessible_project_ids else False
        ).all()
        
        available_datasets = [
            {
                "id": ds.id,
                "name": ds.name,
                "description": ds.description,
                "dataset_type": ds.dataset_type,
                "record_count": ds.record_count,
                "created_at": ds.created_at
            } for ds in datasets
        ]
        
        # Get recent models
        models = db.query(Model).filter(
            Model.project_id.in_(accessible_project_ids) if accessible_project_ids else False
        ).order_by(Model.created_at.desc()).limit(3).all()
        
        recent_models = [
            {
                "id": model.id,
                "name": model.name,
                "description": model.description,
                "model_type": model.model_type,
                "r2_score": model.r2_score,
                "target_column": None,  # Target column not stored in the model table
                "created_at": model.created_at
            } for model in models
        ]
        
        # Get recent simulations
        simulations = db.query(Simulation).filter(
            Simulation.project_id.in_(accessible_project_ids) if accessible_project_ids else False
        ).order_by(Simulation.created_at.desc()).limit(3).all()
        
        recent_simulations = [
            {
                "id": sim.id,
                "name": sim.name,
                "description": sim.description,
                "steps": sim.steps,  # Renamed to months in frontend
                "created_at": sim.created_at,
                "avg_performance": None  # Would need to parse results
            } for sim in simulations
        ]
        
        # Try to extract avg_performance from simulation results if available
        for i, sim in enumerate(simulations):
            if sim.results:
                try:
                    results = json.loads(sim.results)
                    if results and isinstance(results, list):
                        performance_values = [r.get('performance', 0) for r in results if 'performance' in r]
                        if performance_values:
                            recent_simulations[i]['avg_performance'] = round(sum(performance_values) / len(performance_values), 1)
                except (json.JSONDecodeError, TypeError, ZeroDivisionError):
                    pass
        
        # Combine all metrics
        return {
            "performance": performance_data,
            "organization": org_metrics,
            "teams": team_metrics,
            "drivers": driver_metrics,
            "datasets": available_datasets,
            "models": recent_models,
            "simulations": recent_simulations
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard summary: {str(e)}"
        )

@router.get("/performance", response_model=list) 
async def get_performance_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """ 
    Get performance metrics data for dashboard visualization 
    """
    try:
        # Get all datasets and models for the user's projects 
        from app.models.user import UserProject 
        accessible_projects = db.query(UserProject.project_id).filter_by(user_id=current_user.id).all() 
        accessible_project_ids = [p.project_id for p in accessible_projects] 

        # Get performance data from simulations 
        simulations = db.query(Simulation).filter(Simulation.project_id.in_(accessible_project_ids)).all() 

        # Default data if no simulations exist 
        performance_data = [] 

        # If we have simulations, use their data 
        if simulations: 
            # Use most recent simulation 
            most_recent = sorted(simulations, key=lambda x: x.created_at, reverse=True)[0] 

            if most_recent.results: 
                # Parse results JSON 
                try: 
                    results = json.loads(most_recent.results) 
                    performance_data = [
                        {
                            "month": r.get("month_label", f"Month {r.get('month', i+1)}"),
                            "performance": r.get("performance", 0),
                            "innovation": r.get("innovation", 0),
                            "target": 75  # Target line 
                        }
                        for i, r in enumerate(results)
                    ]
                except (json.JSONDecodeError, TypeError): 
                    # Fallback to empty array
                    pass 

        return performance_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching performance metrics: {str(e)}"
        )

@router.get("/organization", response_model=dict) 
async def get_organization_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """ 
    Get organization overview metrics for dashboard 
    """
    try:
        # Get organization data directly from database instead of datasets
        org_data = {
            "name": "Organization", 
            "employees": 0,
            "teams": 0,
            "departments": 0,
            "avgPerformance": 0,
            "trendingUp": False
        }
        
        # Get user's accessible organizations
        accessible_orgs = db.query(UserOrganization.organization_id).filter_by(user_id=current_user.id).all()
        accessible_org_ids = [o.organization_id for o in accessible_orgs]
        
        if accessible_org_ids:
            # Count entities directly from database
            employee_count = db.query(Employee).filter(Employee.organization_id.in_(accessible_org_ids)).count()
            team_count = db.query(Team).filter(Team.organization_id.in_(accessible_org_ids)).count()
            department_count = db.query(Department).filter(Department.organization_id.in_(accessible_org_ids)).count()
            
            # Get average performance score (if available)
            avg_performance = 0
            perf_records = db.query(Employee.performance_score).filter(
                Employee.organization_id.in_(accessible_org_ids), 
                Employee.performance_score != None
            ).all()
            if perf_records:
                perf_scores = [r[0] for r in perf_records]
                avg_performance = sum(perf_scores) / len(perf_scores)
            
            # Check if performance is trending up (basic heuristic)
            # Would ideally use historical snapshots here
            perf_trending_up = True  # Default or could be calculated from snapshots
            
            # Get org name (use first org for now)
            org_name = "Organization"
            if accessible_org_ids:
                org = db.query(Organization).filter(Organization.id == accessible_org_ids[0]).first()
                if org:
                    org_name = org.name
            
            # Update org data
            org_data.update({
                "name": org_name,
                "employees": employee_count,
                "teams": team_count,
                "departments": department_count,
                "avgPerformance": round(avg_performance, 1) if avg_performance else 0,
                "trendingUp": perf_trending_up
            })
        
        return org_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching organization metrics: {str(e)}"
        )

@router.get("/teams", response_model=list) 
async def get_team_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """ 
    Get team performance metrics for dashboard 
    """
    try:
        # Get user's accessible organizations
        accessible_orgs = db.query(UserOrganization.organization_id).filter_by(user_id=current_user.id).all()
        accessible_org_ids = [o.organization_id for o in accessible_orgs]
        
        team_data = []
        
        if accessible_org_ids:
            # Get all teams from accessible organizations
            teams = db.query(Team).filter(Team.organization_id.in_(accessible_org_ids)).all()
            
            for team in teams:
                # Count team members
                team_size = db.query(Employee).filter(Employee.team_id == team.id).count()
                
                # Get performance metrics - use stored values or calculate
                performance = team.performance_score if team.performance_score else 0
                innovation = team.innovation_score if team.innovation_score else 0
                
                # Determine communication level based on team size
                def get_comm_level(size):
                    if size > 40:
                        return 'High'
                    elif size > 20:
                        return 'Medium'
                    else:
                        return 'Low'
                
                communication = get_comm_level(team_size)
                
                # Add team data
                team_data.append({
                    "name": team.name,
                    "performance": performance,
                    "size": team_size,
                    "communication": communication,
                    "innovation": innovation
                })
        
        return team_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching team metrics: {str(e)}"
        )

@router.get("/drivers", response_model=list) 
async def get_performance_drivers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """ 
    Get performance drivers metrics for dashboard 
    """
    try:
        # Get models for the user's projects to analyze feature importance 
        from app.models.user import UserProject 
        accessible_projects = db.query(UserProject.project_id).filter_by(user_id=current_user.id).all() 
        accessible_project_ids = [p.project_id for p in accessible_projects] 

        # Get performance models 
        perf_models = db.query(Model).filter(
            Model.project_id.in_(accessible_project_ids)
        ).all() 

        performance_drivers = [] 

        if perf_models: 
            # Use the most accurate model 
            best_model = sorted(perf_models, key=lambda x: x.r2_score if x.r2_score else 0, reverse=True)[0] 

            # Try to get feature importances from model 
            if best_model.parameters: 
                try: 
                    params = json.loads(best_model.parameters) 
                    feature_imp = params.get('feature_importances', {}) 

                    if feature_imp: 
                        # Convert to list and sort by importance 
                        drivers = [{"name": k, "value": float(v) * 100} for k, v in feature_imp.items()] 
                        drivers = sorted(drivers, key=lambda x: x["value"], reverse=True) 

                        # Take top 5 
                        performance_drivers = drivers[:5] 
                except json.JSONDecodeError: 
                    pass 

        return performance_drivers

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching performance drivers: {str(e)}"
        )
