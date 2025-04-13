import pandas as pd
import numpy as np
import networkx as nx
import os
from datetime import datetime
from typing import Dict

from app.config.settings import settings
from app.models.research import Dataset
from app.config.database import SessionLocal

def initialize_from_dataset(dataset_id: int, parameters: Dict):
    """
    Initialize organization from a real dataset
    
    Args:
        dataset_id: ID of the processed dataset to use
        parameters: Simulation parameters
        
    Returns:
        Dictionary with initialized data
    """
    # Get database session
    db = SessionLocal()
    
    try:
        # Get dataset from DB
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        
        if not dataset:
            raise ValueError(f"Dataset with ID {dataset_id} not found")
            
        file_path = dataset.file_path
        
        if not os.path.exists(file_path):
            raise ValueError(f"Dataset file not found at path: {file_path}")
            
        # Read the dataset
        df = pd.read_csv(file_path)
        
        # Initialize organization graph
        G = nx.Graph()
        
        # Extract team data
        teams_data = []
        
        if 'team_id' in df.columns or 'team' in df.columns:
            # Use the appropriate team column
            team_col = 'team_id' if 'team_id' in df.columns else 'team'
            
            # Group by team
            team_groups = df.groupby(team_col)
            
            for team_id, group in team_groups:
                # Create team with actual values from data
                team = {
                    "team_id": team_id,
                    "team_name": f"Team_{team_id}",
                    "team_size": len(group),
                    "avg_tenure": group['tenure_months'].mean() if 'tenure_months' in group.columns else 0,
                    "hierarchy_levels": group['level'].nunique() if 'level' in group.columns else 1,
                    "communication_density": 0.6,  # Default unless we have network data
                    "diversity_index": 0.6,  # Default unless we have diversity metrics
                    "avg_skill_level": group['skill_score'].mean() if 'skill_score' in group.columns else 5,
                    "training_hours": 20,  # Default
                    "manager_span": 5,  # Default 
                    "performance": group['performance_score'].mean() if 'performance_score' in group.columns else 75,
                    "innovation": group['innovation_score'].mean() if 'innovation_score' in group.columns else 65,
                    "satisfaction": 70  # Default unless we have satisfaction data
                }
                
                # Fill in missing values with defaults for required fields
                for key, value in team.items():
                    if pd.isna(value):
                        if key in ['performance', 'innovation', 'satisfaction']:
                            team[key] = 70
                        elif key in ['avg_tenure', 'avg_skill_level']:
                            team[key] = 1
                        elif key == 'team_size':
                            team[key] = max(1, team[key])
                
                teams_data.append(team)
                
                # Add team node to graph
                G.add_node(team_id, 
                           type="team",
                           name=team["team_name"],
                           size=team["team_size"],
                           performance=team["performance"])
        
        # If no teams found, create synthetic ones based on parameters
        if not teams_data:
            # Create default teams
            num_teams = max(5, int(parameters.get("hierarchy_levels", 3) * 3))
            
            for i in range(num_teams):
                team = {
                    "team_id": i + 1,
                    "team_name": f"Team_{i+1}",
                    "team_size": max(3, int(np.random.normal(parameters.get("team_size", 8), 2))),
                    "avg_tenure": max(0.5, np.random.normal(3, 1.5)),
                    "hierarchy_levels": max(1, min(parameters.get("hierarchy_levels", 3), 
                                              np.random.randint(1, parameters.get("hierarchy_levels", 3) + 1))),
                    "communication_density": min(1.0, max(0.2, np.random.normal(
                                                  parameters.get("communication_density", 0.6), 0.1))),
                    "diversity_index": min(1.0, max(0, np.random.normal(0.6, 0.15))),
                    "avg_skill_level": min(10, max(1, np.random.normal(7, 1.5))),
                    "training_hours": np.random.randint(10, 40),
                    "manager_span": max(2, np.random.randint(3, 10)),
                    "performance": min(100, max(50, np.random.normal(75, 8))),
                    "innovation": min(100, max(40, np.random.normal(65, 12))),
                    "satisfaction": min(100, max(40, np.random.normal(70, 10)))
                }
                teams_data.append(team)
                
                # Add team node to graph
                G.add_node(team["team_id"], 
                           type="team",
                           name=team["team_name"],
                           size=team["team_size"],
                           performance=team["performance"])
        
        # Check for network structure to build edges
        if 'manager_id' in df.columns and 'employee_id' in df.columns:
            # Create edges based on manager-employee relationships
            for _, row in df.iterrows():
                if not pd.isna(row['manager_id']) and row['manager_id'] != row['employee_id']:
                    # Find teams for manager and employee
                    employee_team = row[team_col] if team_col in row and not pd.isna(row[team_col]) else None
                    
                    # Find manager's team
                    manager_id = row['manager_id']
                    manager_rows = df[df['employee_id'] == manager_id]
                    manager_team = None
                    if not manager_rows.empty and team_col in manager_rows.iloc[0]:
                        manager_team = manager_rows.iloc[0][team_col]
                    
                    # If both teams exist and are different, add an edge
                    if employee_team is not None and manager_team is not None and employee_team != manager_team:
                        if not G.has_edge(employee_team, manager_team):
                            G.add_edge(employee_team, manager_team, weight=1)
                        else:
                            # Increase weight of existing edge
                            G[employee_team][manager_team]['weight'] += 1
        
        # If no edges created from real data, create based on communication_density
        if len(G.edges()) == 0:
            # Create edges between teams based on communication_density parameter
            for i, team1 in enumerate(teams_data):
                for j, team2 in enumerate(teams_data):
                    if i < j:  # To avoid duplicates
                        # Use communication_density from parameters if available
                        connection_prob = parameters.get("communication_density", 0.6)
                        
                        # Or use team-specific density if available
                        if "communication_density" in team1 and "communication_density" in team2:
                            connection_prob = (team1["communication_density"] + team2["communication_density"]) / 2
                            
                        if np.random.random() < connection_prob:
                            G.add_edge(team1["team_id"], team2["team_id"],
                                     weight=np.random.uniform(0.1, 1.0))
        
        # Create team DataFrame
        team_df = pd.DataFrame(teams_data)
        
        # Organization metrics
        org_data = {
            "name": dataset.name if dataset else "Simulated Organization",
            "total_employees": team_df["team_size"].sum(),
            "num_teams": len(team_df),
            "hierarchy_levels": parameters.get("hierarchy_levels", 3),
            "simulation_start": datetime.now().isoformat(),
            "dataset_id": dataset_id
        }
        
        # Create initial results
        results_data = [{
            "month": 0,
            "turnover": 0,
            "performance": team_df["performance"].mean(),
            "innovation": team_df["innovation"].mean(),
            "satisfaction": team_df["satisfaction"].mean() if "satisfaction" in team_df.columns else 70,
            "communication_density": parameters.get("communication_density", 0.6),
            "avg_team_size": team_df["team_size"].mean(),
            "interventions": 0
        }]
        
        return {
            "team_data": team_df,
            "organization_graph": G,
            "org_data": org_data,
            "results": pd.DataFrame(results_data)
        }
        
    except Exception as e:
        raise ValueError(f"Error initializing from dataset: {str(e)}")
    finally:
        db.close()