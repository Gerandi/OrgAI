import pandas as pd
import numpy as np
import networkx as nx
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import statistics

from app.config.settings import settings
from app.models.research import Dataset
from app.config.database import SessionLocal

# Parameter ranges for validation
PARAMETER_RANGES = {
    "team_size": (3, 50),          # Min/max team size
    "hierarchy_levels": (1, 10),   # Min/max hierarchy levels
    "communication_density": (0.1, 1.0),  # Min/max communication density
    "turnover_rate": (0.01, 0.5),  # Annual turnover rate (1% to 50%)
    "training_frequency": ["monthly", "quarterly", "biannual", "annual"],
    "simulation_duration": (1, 60), # Months
    "diversity_index": (0.0, 1.0),  # Min/max diversity index
    "skill_level": (1, 10),         # Min/max skill level
    "training_hours": (0, 100),     # Min/max training hours
    "performance": (0, 100),        # Min/max performance score
    "innovation": (0, 100),         # Min/max innovation score
    "satisfaction": (0, 100)        # Min/max satisfaction score
}

def validate_parameters(parameters: Dict) -> Tuple[Dict, List[str]]:
    """
    Validate simulation parameters against acceptable ranges
    
    Args:
        parameters: Dictionary of parameter values
        
    Returns:
        Tuple of (validated_parameters, warnings)
    """
    validated = parameters.copy()
    warnings = []
    
    # Validate numeric parameters
    for param_name, (min_val, max_val) in {k: v for k, v in PARAMETER_RANGES.items() 
                                          if isinstance(v, tuple)}.items():
        if param_name in validated:
            try:
                value = float(validated[param_name])
                if value < min_val:
                    warnings.append(f"Parameter '{param_name}' value {value} is below minimum {min_val}. Using minimum value.")
                    validated[param_name] = min_val
                elif value > max_val:
                    warnings.append(f"Parameter '{param_name}' value {value} is above maximum {max_val}. Using maximum value.")
                    validated[param_name] = max_val
            except (ValueError, TypeError):
                warnings.append(f"Parameter '{param_name}' has invalid value. Using default.")
                # Keep existing value, which might be the default
    
    # Validate categorical parameters
    for param_name, valid_values in {k: v for k, v in PARAMETER_RANGES.items() 
                                   if isinstance(v, list)}.items():
        if param_name in validated and validated[param_name] not in valid_values:
            warnings.append(f"Parameter '{param_name}' has invalid value '{validated[param_name]}'. Valid values are: {valid_values}. Using default.")
            # Keep existing value or could set a default here
    
    return validated, warnings

def calculate_communication_density(graph: nx.Graph) -> float:
    """
    Calculate the communication density of a graph
    
    Args:
        graph: NetworkX graph
        
    Returns:
        Communication density value (0.0-1.0)
    """
    n = graph.number_of_nodes()
    if n <= 1:  # Can't calculate density with 0 or 1 nodes
        return 0.0
    
    max_edges = n * (n - 1) / 2  # Maximum possible edges in undirected graph
    actual_edges = graph.number_of_edges()
    
    return actual_edges / max_edges if max_edges > 0 else 0.0

def calculate_turnover_rate(df: pd.DataFrame) -> Optional[float]:
    """
    Estimate turnover rate from employee data if possible
    
    Args:
        df: DataFrame with employee data
        
    Returns:
        Estimated annual turnover rate or None if cannot calculate
    """
    if 'tenure_months' in df.columns:
        # Simple heuristic: percentage of employees with tenure < 12 months
        if len(df) > 0:
            recent_hires = df[df['tenure_months'] < 12].shape[0]
            return recent_hires / len(df)
    
    return None

def derive_parameters_from_data(df: pd.DataFrame, graph: nx.Graph) -> Dict:
    """
    Derive simulation parameters from actual data
    
    Args:
        df: DataFrame with organizational data
        graph: NetworkX graph of team relationships
        
    Returns:
        Dictionary of derived parameters
    """
    derived_params = {}
    
    # Calculate team size from data
    if 'team_id' in df.columns or 'team' in df.columns:
        team_col = 'team_id' if 'team_id' in df.columns else 'team'
        team_sizes = df.groupby(team_col).size()
        if not team_sizes.empty:
            derived_params["team_size"] = float(team_sizes.mean())
            derived_params["team_size_variation"] = float(team_sizes.std() if len(team_sizes) > 1 else 0)
    
    # Calculate hierarchy levels
    if 'level' in df.columns:
        derived_params["hierarchy_levels"] = int(df['level'].nunique())
    
    # Calculate communication density from graph
    if graph is not None and graph.number_of_nodes() > 0:
        derived_params["communication_density"] = calculate_communication_density(graph)
    
    # Calculate turnover rate
    turnover = calculate_turnover_rate(df)
    if turnover is not None:
        derived_params["turnover_rate"] = turnover
    
    # Calculate performance metrics
    for metric in ['performance_score', 'skill_score', 'innovation_score']:
        if metric in df.columns:
            values = df[metric].dropna()
            if len(values) > 0:
                # Convert column name to parameter name
                param_name = metric.replace('_score', '')
                derived_params[param_name] = float(values.mean())
    
    return derived_params

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
    
    # Store warnings for reporting back to user
    warnings = []
    
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
            
            # Network columns to look for to derive communication density
            network_columns = [col for col in df.columns if any(term in col.lower() 
                              for term in ['centrality', 'degree', 'betweenness'])]
            
            # If we have network columns, calculate communication density per team
            team_comm_density = {}
            if network_columns:
                for team_id, group in team_groups:
                    # Use the average of centrality measures as a proxy for density
                    avg_values = {col: group[col].mean() for col in network_columns if col in group}
                    if avg_values:
                        # Normalize to 0-1 range
                        avg_centrality = sum(avg_values.values()) / len(avg_values)
                        normalized = max(0.1, min(0.9, avg_centrality / 10))  # Assuming centrality is 0-10 range
                        team_comm_density[team_id] = normalized
            
            for team_id, group in team_groups:
                # Create team with actual values from data
                team = {
                    "team_id": team_id,
                    "team_name": f"Team_{team_id}",
                    "team_size": len(group),
                    "avg_tenure": group['tenure_months'].mean() if 'tenure_months' in group.columns else 0,
                    "hierarchy_levels": group['level'].nunique() if 'level' in group.columns else 1,
                    "communication_density": team_comm_density.get(team_id, 0.6),  # Use calculated density or default
                    "avg_skill_level": group['skill_score'].mean() if 'skill_score' in group.columns else 5,
                    "training_hours": 20,  # Default
                    "manager_span": group['manager_id'].nunique() if 'manager_id' in group.columns else 5,
                    "performance": group['performance_score'].mean() if 'performance_score' in group.columns else 75,
                    "innovation": group['innovation_score'].mean() if 'innovation_score' in group.columns else 65,
                    "satisfaction": group['satisfaction_score'].mean() if 'satisfaction_score' in group.columns else 70
                }
                
                # Calculate diversity based on role variety if available
                if 'role' in group.columns:
                    role_counts = group['role'].value_counts()
                    if len(role_counts) > 0:
                        # Simpson's diversity index
                        n = len(group)
                        diversity = 1 - sum((count/n)**2 for count in role_counts)
                        team["diversity_index"] = diversity
                else:
                    team["diversity_index"] = 0.6  # Default
                
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
                
                # Add team node to graph with additional attributes
                G.add_node(team_id, 
                           type="team",
                           name=team["team_name"],
                           size=team["team_size"],
                           performance=team["performance"],
                           communication_density=team["communication_density"],
                           diversity=team.get("diversity_index", 0.6))
        
        # If no teams found, create synthetic ones based on parameters
        if not teams_data:
            warnings.append("No team data found in dataset. Creating synthetic teams based on parameters.")
            
            # First validate parameters
            validated_params, param_warnings = validate_parameters(parameters)
            warnings.extend(param_warnings)
            parameters = validated_params
            
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
            warnings.append("No network structure found in data. Creating synthetic connections.")
            
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
        
        # Derive parameters from data
        derived_params = derive_parameters_from_data(df, G)
        
        # Merge derived parameters with provided ones, prioritizing provided parameters
        for key, value in derived_params.items():
            if key not in parameters:
                parameters[key] = value
            
        # Validate final parameters
        validated_params, param_warnings = validate_parameters(parameters)
        warnings.extend(param_warnings)
            
        # Organization metrics
        org_data = {
            "name": dataset.name if dataset else "Simulated Organization",
            "total_employees": team_df["team_size"].sum(),
            "num_teams": len(team_df),
            "hierarchy_levels": validated_params.get("hierarchy_levels", 3),
            "simulation_start": datetime.now().isoformat(),
            "dataset_id": dataset_id,
            "derived_parameters": derived_params,
            "warnings": warnings
        }
        
        # Calculate overall communication density for the organization
        org_comm_density = calculate_communication_density(G)
        
        # Create initial results
        results_data = [{
            "month": 0,
            "turnover": validated_params.get("turnover_rate", 0.05) / 12,  # Monthly rate
            "performance": team_df["performance"].mean(),
            "innovation": team_df["innovation"].mean(),
            "satisfaction": team_df["satisfaction"].mean() if "satisfaction" in team_df.columns else 70,
            "communication_density": org_comm_density,
            "avg_team_size": team_df["team_size"].mean(),
            "interventions": 0
        }]
        
        return {
            "team_data": team_df,
            "organization_graph": G,
            "org_data": org_data,
            "results": pd.DataFrame(results_data),
            "parameters": validated_params
        }
        
    except Exception as e:
        raise ValueError(f"Error initializing from dataset: {str(e)}")
    finally:
        db.close()