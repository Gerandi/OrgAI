import networkx as nx
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional, Union
import community as community_louvain
from collections import defaultdict

class CommunityDetection:
    """
    Advanced community detection algorithms for organizational networks.
    """
    
    # Available algorithms and their parameters
    AVAILABLE_ALGORITHMS = {
        "louvain": {
            "description": "Louvain method for community detection",
            "parameters": {
                "resolution": {
                    "default": 1.0,
                    "description": "Resolution parameter (higher values lead to smaller communities)",
                    "type": "float",
                    "min": 0.1,
                    "max": 5.0
                },
                "randomize": {
                    "default": True,
                    "description": "Randomize node order for each run",
                    "type": "boolean"
                }
            }
        },
        "girvan_newman": {
            "description": "Girvan-Newman hierarchical community detection",
            "parameters": {
                "max_communities": {
                    "default": 5,
                    "description": "Maximum number of communities to detect",
                    "type": "int",
                    "min": 2,
                    "max": 20
                }
            }
        },
        "label_propagation": {
            "description": "Simple and fast label propagation algorithm",
            "parameters": {
                "max_iterations": {
                    "default": 100,
                    "description": "Maximum number of iterations",
                    "type": "int",
                    "min": 10,
                    "max": 1000
                }
            }
        },
        "spectral_clustering": {
            "description": "Spectral clustering algorithm based on eigenvalues",
            "parameters": {
                "n_clusters": {
                    "default": 5,
                    "description": "Number of clusters to find",
                    "type": "int",
                    "min": 2,
                    "max": 20
                }
            }
        }
    }
    
    @staticmethod
    def get_available_algorithms() -> Dict:
        """
        Get information about available community detection algorithms.
        
        Returns:
            Dictionary with algorithm information
        """
        return CommunityDetection.AVAILABLE_ALGORITHMS
    
    @staticmethod
    def detect_communities(
        graph: nx.Graph,
        algorithm: str = "louvain",
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Detect communities in a network using the specified algorithm.
        
        Args:
            graph: NetworkX graph
            algorithm: Name of algorithm to use
            params: Parameters for the algorithm
            
        Returns:
            Dictionary with communities and metrics
        """
        if not graph or len(graph.nodes) == 0:
            return {"error": "Empty graph"}
            
        # Default parameters
        if params is None:
            params = {}
            
        # Validate algorithm
        if algorithm not in CommunityDetection.AVAILABLE_ALGORITHMS:
            return {"error": f"Unknown algorithm: {algorithm}"}
            
        # Apply appropriate algorithm
        try:
            if algorithm == "louvain":
                communities, modularity = CommunityDetection._louvain_communities(graph, params)
            elif algorithm == "girvan_newman":
                communities, modularity = CommunityDetection._girvan_newman_communities(graph, params)
            elif algorithm == "label_propagation":
                communities, modularity = CommunityDetection._label_propagation_communities(graph, params)
            elif algorithm == "spectral_clustering":
                communities, modularity = CommunityDetection._spectral_clustering_communities(graph, params)
            else:
                return {"error": f"Algorithm {algorithm} not implemented"}
                
            # Calculate additional metrics
            metrics = CommunityDetection._calculate_community_metrics(graph, communities)
            
            # Format communities for output
            community_dict = defaultdict(list)
            for node, community_id in communities.items():
                community_dict[community_id].append(node)
                
            # Convert to list format
            community_list = [
                {"id": comm_id, "nodes": nodes, "size": len(nodes)}
                for comm_id, nodes in community_dict.items()
            ]
            
            # Sort by size
            community_list.sort(key=lambda x: x["size"], reverse=True)
            
            return {
                "algorithm": algorithm,
                "parameters": params,
                "communities": community_list,
                "num_communities": len(community_list),
                "modularity": modularity,
                "metrics": metrics
            }
            
        except Exception as e:
            return {"error": f"Error detecting communities: {str(e)}"}
    
    @staticmethod
    def _louvain_communities(graph: nx.Graph, params: Dict) -> Tuple[Dict, float]:
        """
        Detect communities using the Louvain method.
        
        Args:
            graph: NetworkX graph
            params: Algorithm parameters
            
        Returns:
            Tuple of (node_to_community_dict, modularity)
        """
        # Apply default parameters if not provided
        resolution = params.get("resolution", 
                              CommunityDetection.AVAILABLE_ALGORITHMS["louvain"]["parameters"]["resolution"]["default"])
        randomize = params.get("randomize",
                             CommunityDetection.AVAILABLE_ALGORITHMS["louvain"]["parameters"]["randomize"]["default"])
        
        # Convert to undirected if needed
        if isinstance(graph, nx.DiGraph):
            graph = graph.to_undirected()
            
        # Apply Louvain algorithm
        partition = community_louvain.best_partition(graph, resolution=resolution, random_state=42 if randomize else None)
        
        # Calculate modularity
        modularity = community_louvain.modularity(partition, graph)
        
        return partition, modularity
    
    @staticmethod
    def _girvan_newman_communities(graph: nx.Graph, params: Dict) -> Tuple[Dict, float]:
        """
        Detect communities using the Girvan-Newman algorithm.
        
        Args:
            graph: NetworkX graph
            params: Algorithm parameters
            
        Returns:
            Tuple of (node_to_community_dict, modularity)
        """
        # Apply default parameters if not provided
        max_communities = params.get("max_communities",
                                   CommunityDetection.AVAILABLE_ALGORITHMS["girvan_newman"]["parameters"]["max_communities"]["default"])
        
        # For large graphs, limit the max communities
        if len(graph.nodes) > 1000:
            max_communities = min(max_communities, 10)
        
        # Convert to undirected if needed
        if isinstance(graph, nx.DiGraph):
            graph = graph.to_undirected()
            
        # Get the largest connected component if graph is not connected
        if not nx.is_connected(graph):
            largest_cc = max(nx.connected_components(graph), key=len)
            subgraph = graph.subgraph(largest_cc).copy()
            
            # Create communities for disconnected components
            communities = {}
            community_id = 0
            
            # First, assign the largest component's communities
            comp_generator = nx.community.girvan_newman(subgraph)
            for _ in range(max_communities - 1):
                try:
                    comp = next(comp_generator)
                except StopIteration:
                    break
                    
            # Get the final community structure
            community_tuple = comp
            for i, community in enumerate(community_tuple):
                for node in community:
                    communities[node] = i
                    
            # Then assign remaining disconnected components
            for component in nx.connected_components(graph):
                if component != largest_cc:
                    for node in component:
                        communities[node] = community_id
                    community_id += 1
        else:
            # For connected graphs, use Girvan-Newman directly
            comp_generator = nx.community.girvan_newman(graph)
            
            # Iterate until desired number of communities
            for _ in range(max_communities - 1):
                try:
                    comp = next(comp_generator)
                except StopIteration:
                    break
                    
            # Get the final community structure
            community_tuple = comp
            communities = {}
            for i, community in enumerate(community_tuple):
                for node in community:
                    communities[node] = i
                    
        # Calculate modularity
        modularity = CommunityDetection._calculate_modularity(graph, communities)
        
        return communities, modularity
    
    @staticmethod
    def _label_propagation_communities(graph: nx.Graph, params: Dict) -> Tuple[Dict, float]:
        """
        Detect communities using label propagation.
        
        Args:
            graph: NetworkX graph
            params: Algorithm parameters
            
        Returns:
            Tuple of (node_to_community_dict, modularity)
        """
        # Apply default parameters if not provided
        max_iterations = params.get("max_iterations",
                                  CommunityDetection.AVAILABLE_ALGORITHMS["label_propagation"]["parameters"]["max_iterations"]["default"])
        
        # Get communities
        communities = nx.algorithms.community.label_propagation_communities(graph)
        
        # Convert to dictionary format
        community_dict = {}
        for i, community in enumerate(communities):
            for node in community:
                community_dict[node] = i
                
        # Calculate modularity
        modularity = CommunityDetection._calculate_modularity(graph, community_dict)
        
        return community_dict, modularity
    
    @staticmethod
    def _spectral_clustering_communities(graph: nx.Graph, params: Dict) -> Tuple[Dict, float]:
        """
        Detect communities using spectral clustering.
        
        Args:
            graph: NetworkX graph
            params: Algorithm parameters
            
        Returns:
            Tuple of (node_to_community_dict, modularity)
        """
        # Apply default parameters if not provided
        n_clusters = params.get("n_clusters",
                              CommunityDetection.AVAILABLE_ALGORITHMS["spectral_clustering"]["parameters"]["n_clusters"]["default"])
        
        # For large graphs, limit the cluster count
        if len(graph.nodes) > 1000:
            n_clusters = min(n_clusters, 10)
            
        # Ensure n_clusters doesn't exceed node count
        n_clusters = min(n_clusters, len(graph.nodes))
        
        try:
            # Get sparse adjacency matrix
            adjacency = nx.adjacency_matrix(graph)
            
            # Apply spectral clustering
            from sklearn.cluster import SpectralClustering
            sc = SpectralClustering(n_clusters=n_clusters, 
                                   affinity='precomputed', 
                                   n_init=10,
                                   random_state=42)
            
            # Fit and get labels
            labels = sc.fit_predict(adjacency.toarray())
            
            # Convert to dictionary {node: community_id}
            communities = {node: label for node, label in zip(graph.nodes(), labels)}
            
            # Calculate modularity
            modularity = CommunityDetection._calculate_modularity(graph, communities)
            
            return communities, modularity
            
        except ImportError:
            # Fallback to Louvain if sklearn is not available
            return CommunityDetection._louvain_communities(graph, {"resolution": 1.0, "randomize": True})
    
    @staticmethod
    def _calculate_modularity(graph: nx.Graph, communities: Dict) -> float:
        """
        Calculate modularity score for a community structure.
        
        Args:
            graph: NetworkX graph
            communities: Dictionary mapping nodes to community IDs
            
        Returns:
            Modularity score
        """
        total_weight = sum(d.get('weight', 1) for u, v, d in graph.edges(data=True))
        
        if total_weight == 0:
            return 0.0
            
        modularity = 0.0
        for i, j in graph.edges():
            if communities[i] == communities[j]:
                weight = graph[i][j].get('weight', 1)
                deg_i = sum(graph[i][k].get('weight', 1) for k in graph.neighbors(i))
                deg_j = sum(graph[j][k].get('weight', 1) for k in graph.neighbors(j))
                expected = (deg_i * deg_j) / (2 * total_weight)
                modularity += weight - expected
                
        return modularity / (2 * total_weight)
    
    @staticmethod
    def _calculate_community_metrics(graph: nx.Graph, communities: Dict) -> Dict:
        """
        Calculate additional metrics for community structure.
        
        Args:
            graph: NetworkX graph
            communities: Dictionary mapping nodes to community IDs
            
        Returns:
            Dictionary with metrics
        """
        # Group nodes by community
        community_nodes = defaultdict(list)
        for node, community_id in communities.items():
            community_nodes[community_id].append(node)
            
        community_metrics = {}
        
        # Calculate overall metrics
        internal_edges = 0
        external_edges = 0
        
        for u, v in graph.edges():
            if communities.get(u) == communities.get(v):
                internal_edges += 1
            else:
                external_edges += 1
                
        # Calculate metrics for each community
        community_internal_edges = defaultdict(int)
        community_external_edges = defaultdict(int)
        community_densities = {}
        
        for community_id, nodes in community_nodes.items():
            # Get subgraph for this community
            subgraph = graph.subgraph(nodes)
            
            # Calculate internal edges
            internal = subgraph.number_of_edges()
            community_internal_edges[community_id] = internal
            
            # Calculate external edges
            external = sum(1 for u in nodes for v in graph.neighbors(u) if communities.get(v) != community_id)
            community_external_edges[community_id] = external
            
            # Calculate density
            size = len(nodes)
            if size > 1:
                possible_edges = size * (size - 1) / 2
                density = internal / possible_edges if possible_edges > 0 else 0
            else:
                density = 0
                
            community_densities[community_id] = density
            
        # Calculate conductance and coverage
        conductance = external_edges / (internal_edges + external_edges) if (internal_edges + external_edges) > 0 else 0
        coverage = internal_edges / (internal_edges + external_edges) if (internal_edges + external_edges) > 0 else 0
        
        return {
            "num_internal_edges": internal_edges,
            "num_external_edges": external_edges,
            "conductance": conductance,
            "coverage": coverage,
            "community_metrics": {
                str(comm_id): {
                    "size": len(nodes),
                    "internal_edges": community_internal_edges[comm_id],
                    "external_edges": community_external_edges[comm_id],
                    "density": community_densities[comm_id]
                }
                for comm_id, nodes in community_nodes.items()
            }
        }
    
    @staticmethod
    def compare_community_structures(
        graph: nx.Graph,
        algorithms: List[str],
        params_list: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Compare different community detection algorithms on the same graph.
        
        Args:
            graph: NetworkX graph
            algorithms: List of algorithm names to compare
            params_list: List of parameter dictionaries for each algorithm
            
        Returns:
            Dictionary with comparison results
        """
        if params_list is None:
            params_list = [{}] * len(algorithms)
            
        if len(algorithms) != len(params_list):
            return {"error": "algorithms and params_list must have the same length"}
            
        results = {}
        for i, algorithm in enumerate(algorithms):
            params = params_list[i]
            result = CommunityDetection.detect_communities(graph, algorithm, params)
            results[algorithm] = result
            
        # Calculate comparison metrics
        comparison = {
            "num_communities": {alg: result.get("num_communities", 0) for alg, result in results.items()},
            "modularity": {alg: result.get("modularity", 0.0) for alg, result in results.items()},
            "coverage": {alg: result.get("metrics", {}).get("coverage", 0.0) for alg, result in results.items()},
            "conductance": {alg: result.get("metrics", {}).get("conductance", 0.0) for alg, result in results.items()}
        }
        
        # Identify best algorithm based on modularity
        best_modularity = -1
        best_algorithm = None
        
        for alg, result in results.items():
            modularity = result.get("modularity", 0.0)
            if modularity > best_modularity:
                best_modularity = modularity
                best_algorithm = alg
                
        return {
            "results": results,
            "comparison": comparison,
            "best_algorithm": best_algorithm,
            "best_modularity": best_modularity
        }
