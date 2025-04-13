from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
import networkx as nx
import json
from typing import Dict, List, Optional

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.models.user import User
from app.models.research import Simulation, ResearchProject
from app.network.community_detection import CommunityDetection
from app.simulation.engine import OrganizationalSimulationEngine

router = APIRouter()

@router.get("/algorithms", response_model=Dict)
def get_community_detection_algorithms(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get information about available community detection algorithms
    """
    return {
        "algorithms": CommunityDetection.get_available_algorithms()
    }

@router.post("/detect-from-simulation", response_model=Dict)
def detect_communities_from_simulation(
    simulation_id: int = Body(...),
    algorithm: str = Body(...),
    parameters: Optional[Dict] = Body({}),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Detect communities in a simulation's organization network
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
    
    # Load simulation
    try:
        engine = OrganizationalSimulationEngine.load_simulation(simulation.results_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading simulation: {str(e)}"
        )
    
    # Get organization graph
    graph = engine.organization_graph
    
    # Detect communities
    communities = CommunityDetection.detect_communities(graph, algorithm, parameters)
    
    return {
        "simulation_id": simulation_id,
        "simulation_name": simulation.name,
        "algorithm": algorithm,
        "parameters": parameters,
        "results": communities
    }

@router.post("/compare-algorithms", response_model=Dict)
def compare_community_algorithms(
    simulation_id: int = Body(...),
    algorithms: List[str] = Body(...),
    parameters_list: Optional[List[Dict]] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Compare different community detection algorithms on a simulation's network
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
    
    # Load simulation
    try:
        engine = OrganizationalSimulationEngine.load_simulation(simulation.results_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading simulation: {str(e)}"
        )
    
    # Get organization graph
    graph = engine.organization_graph
    
    # Compare algorithms
    comparison = CommunityDetection.compare_community_structures(graph, algorithms, parameters_list)
    
    return {
        "simulation_id": simulation_id,
        "simulation_name": simulation.name,
        "algorithms": algorithms,
        "comparison": comparison
    }

@router.post("/custom-graph", response_model=Dict)
def detect_communities_custom_graph(
    adjacency_matrix: List[List[float]] = Body(...),
    node_labels: Optional[List[str]] = Body(None),
    algorithm: str = Body(...),
    parameters: Optional[Dict] = Body({}),
    current_user: User = Depends(get_current_active_user)
):
    """
    Detect communities in a custom graph defined by an adjacency matrix
    """
    # Create graph from adjacency matrix
    try:
        import numpy as np
        adj_matrix = np.array(adjacency_matrix)
        
        # Create graph
        graph = nx.from_numpy_array(adj_matrix)
        
        # Add node labels if provided
        if node_labels:
            if len(node_labels) != len(graph.nodes):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Number of node labels must match number of nodes in adjacency matrix"
                )
            
            mapping = {i: label for i, label in enumerate(node_labels)}
            graph = nx.relabel_nodes(graph, mapping)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating graph from adjacency matrix: {str(e)}"
        )
    
    # Detect communities
    communities = CommunityDetection.detect_communities(graph, algorithm, parameters)
    
    return {
        "algorithm": algorithm,
        "parameters": parameters,
        "results": communities
    }
