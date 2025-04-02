from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
import pandas as pd
import networkx as nx
import json
import os

from app.config.database import get_db
from app.config.auth import get_current_active_user
from app.models.user import User, UserProject # Import UserProject
from app.models.research import Dataset
from app.data.processor import OrganizationDataProcessor

router = APIRouter()

@router.get("/{dataset_id}/metrics", response_model=dict)
async def get_network_metrics(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Calculate and return network metrics for a dataset
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    print(f"Fetching dataset with ID {dataset_id}: {dataset}")
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check access permissions
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=dataset.project_id).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )

    try:
        # Create processor
        processor = OrganizationDataProcessor()

        # Load dataset based on type
        if dataset.dataset_type == 'communication':
            processor.import_communication_data(dataset.file_path)
            processor.build_network()
        elif dataset.dataset_type == 'processed':
            # For processed datasets, we need to check if it has network features
            df = pd.read_csv(dataset.file_path)
            network_cols = [col for col in df.columns if 'centrality' in col or 'community' in col]

            if not network_cols:
                # No network features found, try to use communication data if available
                comm_datasets = db.query(Dataset).filter(Dataset.dataset_type == 'communication').all()
                if comm_datasets:
                    processor.import_communication_data(comm_datasets[0].file_path)
                    processor.build_network()
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No network features found in dataset and no communication data available"
                    )
            else:
                # Dataset already has network features
                processor.org_data = df

                # Reconstruct network from existing network metrics
                if 'employee_id' in df.columns and any(['centrality' in col for col in df.columns]):
                    G = nx.Graph()
                    for _, row in df.iterrows():
                        G.add_node(row['employee_id'])

                    # If we have manager_id, we can add hierarchical links
                    if 'manager_id' in df.columns:
                        for _, row in df.iterrows():
                            if row['manager_id'] and row['manager_id'] != '':
                                G.add_edge(row['manager_id'], row['employee_id'])

                    processor.network = G
        else:
            processor.import_org_structure(dataset.file_path)
            # Without communication data, we can only build a hierarchy network
            G = nx.DiGraph()
            for _, row in processor.org_data.iterrows():
                G.add_node(row['employee_id'])
                if row['manager_id'] and row['manager_id'] != '':
                    G.add_edge(row['manager_id'], row['employee_id'])
            processor.network = G

        # Get network metrics
        if processor.network:
            network_metrics = {
                "nodes_count": processor.network.number_of_nodes(),
                "edges_count": processor.network.number_of_edges(),
                "density": nx.density(processor.network),
                "avg_degree": sum(dict(processor.network.degree()).values()) / processor.network.number_of_nodes(),
                "avg_clustering": nx.average_clustering(processor.network),
                "connected_components": nx.number_connected_components(processor.network)
            }

            return network_metrics
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not build network from dataset"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating network metrics: {str(e)}"
        )

@router.get("/{dataset_id}/nodes", response_model=list)
async def get_network_nodes(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get nodes with network metrics for visualization
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check access permissions
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=dataset.project_id).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )

    try:
        # If it's a processed dataset, check if it already has network metrics
        if dataset.dataset_type == 'processed':
            df = pd.read_csv(dataset.file_path)
            network_cols = [col for col in df.columns if 'centrality' in col or 'community' in col]

            if network_cols:
                # Just return the data
                nodes = []
                for _, row in df.iterrows():
                    node = {"id": row['employee_id']}

                    # Add department and role if available
                    if 'department' in df.columns:
                        node['department'] = row['department']
                    if 'role' in df.columns:
                        node['role'] = row['role']

                    # Add network metrics
                    for col in network_cols:
                        node[col] = row[col]

                    nodes.append(node)

                return nodes

        # If we don't have processed data with network metrics, compute them
        processor = OrganizationDataProcessor()

        # Load data and build network
        if dataset.dataset_type == 'communication':
            processor.import_communication_data(dataset.file_path)
            processor.build_network()
        elif dataset.dataset_type == 'organization':
            processor.import_org_structure(dataset.file_path)

            # Try to find communication data
            comm_datasets = db.query(Dataset).filter(Dataset.dataset_type == 'communication').all()
            if comm_datasets:
                processor.import_communication_data(comm_datasets[0].file_path)
                processor.build_network()
            else:
                # Build basic org structure network
                G = nx.DiGraph()
                for _, row in processor.org_data.iterrows():
                    G.add_node(row['employee_id'])
                    if row['manager_id'] and row['manager_id'] != '':
                        G.add_edge(row['manager_id'], row['employee_id'])
                processor.network = G

        # Extract node data with metrics
        if processor.network:
            network_features = processor.extract_network_features()

            # Join with org data if available
            if processor.org_data is not None:
                result_df = processor.org_data.merge(network_features, on='employee_id', how='outer')
            else:
                result_df = network_features

            # Convert to list of dicts for output
            nodes = result_df.to_dict('records')
            return nodes
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not build network from dataset"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting network nodes: {str(e)}"
        )

@router.get("/{dataset_id}/links", response_model=list)
async def get_network_links(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get network links for visualization
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check access permissions
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=dataset.project_id).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )

    try:
        links = []

        # If it's communication data, extract links directly
        if dataset.dataset_type == 'communication':
            df = pd.read_csv(dataset.file_path)

            # Check for required columns
            if 'sender_id' in df.columns and 'receiver_id' in df.columns:
                # Group by sender and receiver to get weights
                if 'weight' not in df.columns:
                    link_df = df.groupby(['sender_id', 'receiver_id']).size().reset_index(name='weight')
                else:
                    link_df = df.groupby(['sender_id', 'receiver_id'])['weight'].sum().reset_index()

                # Convert to list of dicts
                links = link_df.to_dict('records')

                # Rename columns to match D3 format
                for link in links:
                    link['source'] = link.pop('sender_id')
                    link['target'] = link.pop('receiver_id')

                return links

        # For org structure, create hierarchical links
        elif dataset.dataset_type == 'organization':
            df = pd.read_csv(dataset.file_path)

            if 'employee_id' in df.columns and 'manager_id' in df.columns:
                for _, row in df.iterrows():
                    if row['manager_id'] and str(row['manager_id']) != '':
                        links.append({
                            'source': row['manager_id'],
                            'target': row['employee_id'],
                            'weight': 1,
                            'type': 'management'
                        })

                return links

        # For processed data, check if we have a matching communication dataset
        elif dataset.dataset_type == 'processed':
            # First try to find communication dataset
            comm_datasets = db.query(Dataset).filter(Dataset.dataset_type == 'communication').all()

            if comm_datasets:
                # Use the most recent communication dataset
                comm_dataset = sorted(comm_datasets, key=lambda x: x.created_at, reverse=True)[0]

                # Process communication data
                df = pd.read_csv(comm_dataset.file_path)

                if 'sender_id' in df.columns and 'receiver_id' in df.columns:
                    # Group by sender and receiver to get weights
                    if 'weight' not in df.columns:
                        link_df = df.groupby(['sender_id', 'receiver_id']).size().reset_index(name='weight')
                    else:
                        link_df = df.groupby(['sender_id', 'receiver_id'])['weight'].sum().reset_index()

                    # Convert to list of dicts
                    links = link_df.to_dict('records')

                    # Rename columns to match D3 format
                    for link in links:
                        link['source'] = link.pop('sender_id')
                        link['target'] = link.pop('receiver_id')

                    return links

            # If no communication data, try to get hierarchical links from the processed data
            df = pd.read_csv(dataset.file_path)

            if 'employee_id' in df.columns and 'manager_id' in df.columns:
                for _, row in df.iterrows():
                    if row['manager_id'] and str(row['manager_id']) != '':
                        links.append({
                            'source': row['manager_id'],
                            'target': row['employee_id'],
                            'weight': 1,
                            'type': 'management'
                        })

                return links

        # Return empty list if no links can be created
        return links

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting network links: {str(e)}"
        )

@router.get("/{dataset_id}/visualization", response_model=dict)
async def get_network_visualization(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get complete network visualization data (nodes and links)
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check access permissions
    if dataset.project_id:
        # from app.models.user import UserProject # Already imported
        user_project = db.query(UserProject).filter_by(user_id=current_user.id, project_id=dataset.project_id).first()
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this dataset"
            )

    try:
        # Create processor
        processor = OrganizationDataProcessor()

        # Process based on dataset type
        if dataset.dataset_type == 'communication':
            processor.import_communication_data(dataset.file_path)
            processor.build_network()
        elif dataset.dataset_type == 'organization':
            processor.import_org_structure(dataset.file_path)

            # Try to find communication data
            comm_datasets = db.query(Dataset).filter(Dataset.dataset_type == 'communication').all()
            if comm_datasets:
                processor.import_communication_data(comm_datasets[0].file_path)
                processor.build_network()
            else:
                # Build basic org structure network
                G = nx.DiGraph()
                for _, row in processor.org_data.iterrows():
                    G.add_node(row['employee_id'])
                    if row['manager_id'] and row['manager_id'] != '':
                        G.add_edge(row['manager_id'], row['employee_id'])
                processor.network = G
        elif dataset.dataset_type == 'processed':
            # Load the processed data
            df = pd.read_csv(dataset.file_path)
            processor.org_data = df

            # Check if it has network features
            network_cols = [col for col in df.columns if 'centrality' in col or 'community' in col]

            if not network_cols:
                # No network features, try to find communication data
                comm_datasets = db.query(Dataset).filter(Dataset.dataset_type == 'communication').all()
                if comm_datasets:
                    processor.import_communication_data(comm_datasets[0].file_path)
                    processor.build_network()
                else:
                    # Build basic org structure network if possible
                    if 'employee_id' in df.columns and 'manager_id' in df.columns:
                        G = nx.DiGraph()
                        for _, row in df.iterrows():
                            G.add_node(row['employee_id'])
                            if row['manager_id'] and row['manager_id'] != '':
                                G.add_edge(row['manager_id'], row['employee_id'])
                        processor.network = G
            else:
                # Already has network features, reconstruct basic network
                G = nx.Graph()
                node_mapping = {}

                for i, row in df.iterrows():
                    node_id = row['employee_id']
                    G.add_node(node_id)
                    node_mapping[node_id] = i

                    # Add node attributes
                    for col in df.columns:
                        if col != 'employee_id':
                            G.nodes[node_id][col] = row[col]

                # Add edges from manager relationships if available
                if 'manager_id' in df.columns:
                    for _, row in df.iterrows():
                        if row['manager_id'] and row['manager_id'] != '':
                            G.add_edge(row['manager_id'], row['employee_id'])

                processor.network = G

        # If we have a network, get nodes and links
        if processor.network:
            # Extract network features
            network_features = processor.extract_network_features()

            # Prepare node data
            nodes = []
            if processor.org_data is not None:
                # Join with org data if available
                merged_df = processor.org_data.merge(network_features, on='employee_id', how='outer')
                nodes = merged_df.to_dict('records')
            else:
                nodes = network_features.to_dict('records')

            # Prepare link data
            links = []
            for u, v, data in processor.network.edges(data=True):
                link = {
                    'source': u,
                    'target': v,
                    'weight': data.get('weight', 1)
                }
                links.append(link)

            # Get network metrics
            network_metrics = {
                "nodes_count": processor.network.number_of_nodes(),
                "edges_count": processor.network.number_of_edges(),
                "density": nx.density(processor.network),
                "avg_degree": sum(dict(processor.network.degree()).values()) / processor.network.number_of_nodes(),
                "avg_clustering": nx.average_clustering(processor.network),
                "connected_components": nx.number_connected_components(processor.network)
            }

            # Get departments list for filtering
            departments = []
            if processor.org_data is not None and 'department' in processor.org_data.columns:
                departments = processor.org_data['department'].unique().tolist()

            return {
                "nodes": nodes,
                "links": links,
                "metrics": network_metrics,
                "departments": departments
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not build network from dataset"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error preparing network visualization: {str(e)}"
        )