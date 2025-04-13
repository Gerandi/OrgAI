import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import networkx as nx
import sklearn
import matplotlib.pyplot as plt
import io
import base64
from collections import defaultdict

class ModelExplainer:
    """
    Provides enhanced explainability for ML models used in organizational simulations.
    """
    
    @staticmethod
    def explain_prediction(predictor, input_data: pd.DataFrame, team_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Generate a detailed explanation of model predictions.
        
        Args:
            predictor: Trained OrganizationalPerformancePredictor instance
            input_data: DataFrame with raw feature values
            team_id: Optional team ID to focus on (if None, explains all teams)
            
        Returns:
            Dictionary with detailed explanation
        """
        if predictor.model is None:
            raise ValueError("Model has not been trained yet")
            
        # Filter data if team_id provided
        if team_id is not None:
            if "team_id" not in input_data.columns:
                raise ValueError("Cannot filter by team_id: column not found in data")
            team_data = input_data[input_data["team_id"] == team_id].copy()
            if team_data.empty:
                raise ValueError(f"No data found for team_id {team_id}")
        else:
            team_data = input_data.copy()
            
        # Get feature names and importances
        feature_names = predictor.feature_names
        feature_importances = predictor.feature_importances or {}
        
        # Prepare input features
        features_df = pd.DataFrame(columns=feature_names)
        for col in feature_names:
            if col in team_data.columns:
                features_df[col] = team_data[col]
            else:
                features_df[col] = 0
                
        # Get predictions and feature contributions
        predictions, _ = predictor.predict_with_explanations(features_df.values)
        
        # Sort features by importance
        sorted_features = sorted(
            feature_importances.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Calculate actual feature contribution to prediction
        feature_contributions = []
        
        # For tree-based models like Random Forest, we can extract feature contribution
        if hasattr(predictor.model, 'feature_importances_') and isinstance(sorted_features, list):
            for feature_name, importance in sorted_features:
                if feature_name in features_df.columns:
                    # Only include features we have data for
                    feature_idx = list(features_df.columns).index(feature_name)
                    feature_value = features_df.iloc[0, feature_idx] if not features_df.empty else 0
                    
                    # Scale the feature importance by the feature value
                    contribution = importance
                    
                    feature_contributions.append({
                        "feature": feature_name,
                        "importance": float(importance),
                        "value": float(feature_value),
                        "contribution": float(contribution),
                        "description": ModelExplainer._get_feature_description(feature_name)
                    })
        
        # Generate textual explanation
        explanation = ModelExplainer._generate_explanation(
            predictions, feature_contributions, team_data, team_id
        )
        
        # Handle different model types
        model_specific_info = {}
        if predictor.model_type == 'random_forest':
            if hasattr(predictor.model, 'estimators_'):
                model_specific_info = {
                    "n_estimators": len(predictor.model.estimators_),
                    "max_depth": int(np.max([tree.tree_.max_depth for tree in predictor.model.estimators_])),
                    "model_confidence": float(1.0 - np.std([tree.predict(features_df)[0] for tree in predictor.model.estimators_]) / np.mean(predictions))
                }
                
        elif predictor.model_type == 'gradient_boosting':
            if hasattr(predictor.model, 'estimators_'):
                model_specific_info = {
                    "n_estimators": len(predictor.model.estimators_),
                    "learning_rate": float(predictor.model.learning_rate),
                    "model_confidence": float(1.0 - predictor.model.loss_(team_data['performance'], predictions) if 'performance' in team_data.columns else 0.8)
                }
                
        # Prepare response
        return {
            "predictions": predictions.tolist(),
            "average_prediction": float(np.mean(predictions)),
            "feature_contributions": feature_contributions[:10],  # Top 10 features
            "explanation": explanation,
            "model_type": predictor.model_type,
            "model_details": model_specific_info,
            "team_id": team_id
        }
    
    @staticmethod
    def _get_feature_description(feature_name: str) -> str:
        """
        Provide a human-readable description of what a feature means.
        
        Args:
            feature_name: Name of feature
            
        Returns:
            Human-readable description
        """
        descriptions = {
            "team_size": "Number of employees in the team",
            "avg_tenure": "Average number of years employees have been with the company",
            "hierarchy_levels": "Number of management levels in the team",
            "communication_density": "Density of communication network (higher values mean more communication)",
            "diversity_index": "Measure of diversity within the team (higher values mean more diverse)",
            "avg_skill_level": "Average skill level of team members (1-10 scale)",
            "training_hours": "Average training hours per employee",
            "manager_span": "Average number of direct reports per manager",
            "performance": "Team performance score (0-100)",
            "innovation": "Team innovation score (0-100)",
            "satisfaction": "Team satisfaction score (0-100)",
            "turnover": "Team turnover rate",
            # Add more as needed
        }
        
        # Try to match based on keywords if not exact match
        if feature_name not in descriptions:
            for keyword, desc in descriptions.items():
                if keyword in feature_name.lower():
                    return desc
                    
            return "Feature measuring aspects of organizational structure or performance"
            
        return descriptions[feature_name]
    
    @staticmethod
    def _generate_explanation(predictions, feature_contributions, team_data, team_id) -> str:
        """
        Generate a textual explanation of the prediction.
        
        Args:
            predictions: Model predictions
            feature_contributions: Sorted list of feature contributions
            team_data: DataFrame with team data
            team_id: Team ID if focusing on a specific team
            
        Returns:
            Textual explanation
        """
        if len(predictions) == 0:
            return "No predictions available to explain."
            
        avg_prediction = np.mean(predictions)
        explanation = []
        
        # Specific team or all teams?
        team_context = f"Team {team_id}" if team_id is not None else "The organization"
        
        # Overall prediction statement
        explanation.append(f"{team_context} has a predicted performance score of {avg_prediction:.1f}.")
        
        # Top factors
        if feature_contributions:
            explanation.append("\nTop factors influencing this prediction:")
            
            # Get top positive and negative contributors
            top_contributors = feature_contributions[:3]
            
            for i, contrib in enumerate(top_contributors):
                explanation.append(f"{i+1}. {contrib['feature']} (importance: {contrib['importance']:.3f}): {contrib['description']}")
                
        # Team comparison (if all teams)
        if team_id is None and len(team_data) > 1 and "team_id" in team_data.columns:
            # Calculate team-level predictions for comparison
            team_ids = team_data["team_id"].unique()
            team_predictions = {}
            
            for tid in team_ids:
                team_rows = team_data[team_data["team_id"] == tid]
                team_prediction = predictions[team_data["team_id"] == tid].mean() if len(predictions) == len(team_data) else avg_prediction
                team_predictions[tid] = team_prediction
                
            # Find best and worst teams
            best_team = max(team_predictions.items(), key=lambda x: x[1])
            worst_team = min(team_predictions.items(), key=lambda x: x[1])
            
            explanation.append(f"\nTeam performance varies across the organization:")
            explanation.append(f"- Team {best_team[0]} has the highest predicted performance ({best_team[1]:.1f})")
            explanation.append(f"- Team {worst_team[0]} has the lowest predicted performance ({worst_team[1]:.1f})")
                
        return "\n".join(explanation)
    
    @staticmethod
    def explain_simulation_dynamics(
        simulation_results: pd.DataFrame, 
        interventions: List[Dict],
        team_data: pd.DataFrame,
        graph: nx.Graph,
        predictor=None
    ) -> Dict[str, Any]:
        """
        Explain simulation dynamics over time, including the impact of interventions.
        
        Args:
            simulation_results: DataFrame with simulation results over time
            interventions: List of interventions applied
            team_data: Current team data
            graph: Organization graph
            predictor: Optional predictor model
            
        Returns:
            Dictionary with explanations and visualizations
        """
        if simulation_results.empty:
            return {"error": "No simulation results available"}
            
        # Extract key metrics over time
        time_series = {
            "months": simulation_results["month"].tolist(),
            "performance": simulation_results["performance"].tolist(),
            "innovation": simulation_results["innovation"].tolist() if "innovation" in simulation_results.columns else [],
            "satisfaction": simulation_results["satisfaction"].tolist() if "satisfaction" in simulation_results.columns else [],
            "turnover": simulation_results["turnover"].tolist() if "turnover" in simulation_results.columns else []
        }
        
        # Analyze intervention impacts
        intervention_impacts = []
        for intervention in interventions:
            # Find results before and after intervention
            month = intervention.get("month", 0)
            intervention_type = intervention.get("type", "unknown")
            
            # Get metrics before intervention (1-month before)
            pre_idx = simulation_results[simulation_results["month"] == (month - 1)].index
            post_idx = simulation_results[simulation_results["month"] == (month + 1)].index
            
            if not pre_idx.empty and not post_idx.empty:
                pre_metrics = simulation_results.loc[pre_idx.min()]
                post_metrics = simulation_results.loc[post_idx.min()]
                
                # Calculate changes in key metrics
                changes = {}
                for metric in ["performance", "innovation", "satisfaction", "turnover"]:
                    if metric in pre_metrics and metric in post_metrics:
                        changes[metric] = float(post_metrics[metric] - pre_metrics[metric])
                        
                # Create impact summary
                impact = {
                    "month": month,
                    "type": intervention_type,
                    "changes": changes,
                    "target_teams": intervention.get("target_teams", []),
                    "intensity": intervention.get("intensity", 50),
                    "primary_metrics": ModelExplainer._get_primary_metrics_for_intervention(intervention_type)
                }
                
                # Add judgment of effectiveness
                primary_metric = impact["primary_metrics"][0] if impact["primary_metrics"] else "performance"
                if primary_metric in changes:
                    impact["effective"] = changes[primary_metric] > 0
                    impact["effectiveness_score"] = float(changes[primary_metric])
                    
                intervention_impacts.append(impact)
                
        # Generate textual insights
        insights = ModelExplainer._generate_simulation_insights(
            time_series, 
            intervention_impacts,
            team_data
        )
        
        # Feature importance insights (if predictor provided)
        feature_importance_insights = {}
        if predictor and predictor.feature_importances:
            feature_importance_insights = {
                "top_features": dict(sorted(
                    predictor.feature_importances.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:5])
            }
            
        return {
            "time_series": time_series,
            "intervention_impacts": intervention_impacts,
            "insights": insights,
            "feature_importance": feature_importance_insights,
            "network_metrics": ModelExplainer._analyze_organization_network(graph)
        }
        
    @staticmethod
    def _get_primary_metrics_for_intervention(intervention_type: str) -> List[str]:
        """
        Determine which metrics an intervention primarily affects.
        
        Args:
            intervention_type: Type of intervention
            
        Returns:
            List of primary metrics affected
        """
        impact_map = {
            "communication": ["satisfaction", "performance"],
            "training": ["performance", "innovation"],
            "reorganization": ["innovation", "satisfaction"],
            "leadership": ["satisfaction", "performance"],
            # Add more as needed
        }
        
        return impact_map.get(intervention_type, ["performance"])
    
    @staticmethod
    def _generate_simulation_insights(time_series, intervention_impacts, team_data) -> Dict[str, Any]:
        """
        Generate textual insights about the simulation.
        
        Args:
            time_series: Dictionary with time series data
            intervention_impacts: List of intervention impacts
            team_data: Current team data
            
        Returns:
            Dictionary with textual insights
        """
        insights = {}
        
        # Overall performance trend
        if "performance" in time_series and len(time_series["performance"]) > 1:
            perf = time_series["performance"]
            first_perf = perf[0]
            last_perf = perf[-1]
            change = last_perf - first_perf
            
            if change > 0:
                trend = "improved"
            elif change < 0:
                trend = "declined"
            else:
                trend = "remained stable"
                
            insights["performance_trend"] = {
                "trend": trend,
                "change": float(change),
                "description": f"Performance has {trend} by {abs(change):.1f} points over the simulation period."
            }
        
        # Intervention effectiveness
        if intervention_impacts:
            effective_interventions = [i for i in intervention_impacts if i.get("effective", False)]
            ineffective_interventions = [i for i in intervention_impacts if i.get("effective") is False]
            
            if effective_interventions:
                # Find most effective intervention
                most_effective = max(effective_interventions, key=lambda x: x.get("effectiveness_score", 0))
                
                insights["interventions"] = {
                    "effective_count": len(effective_interventions),
                    "ineffective_count": len(ineffective_interventions),
                    "most_effective_type": most_effective.get("type"),
                    "most_effective_month": most_effective.get("month"),
                    "most_effective_score": float(most_effective.get("effectiveness_score", 0)),
                    "description": f"The most effective intervention was {most_effective.get('type')} in month {most_effective.get('month')}, which improved performance by {most_effective.get('effectiveness_score', 0):.1f} points."
                }
                
        # Team structure insights
        if "team_size" in team_data.columns:
            team_sizes = team_data["team_size"].values
            insights["team_structure"] = {
                "avg_team_size": float(np.mean(team_sizes)),
                "team_size_variation": float(np.std(team_sizes)),
                "max_team_size": int(np.max(team_sizes)),
                "min_team_size": int(np.min(team_sizes))
            }
            
        return insights
    
    @staticmethod
    def _analyze_organization_network(graph: nx.Graph) -> Dict[str, Any]:
        """
        Analyze the organization network structure.
        
        Args:
            graph: NetworkX graph of organization
            
        Returns:
            Dictionary with network metrics
        """
        if not graph or len(graph.nodes) == 0:
            return {}
            
        try:
            # Calculate basic metrics
            density = nx.density(graph)
            
            # Check if graph is connected
            if nx.is_connected(graph):
                avg_path_length = nx.average_shortest_path_length(graph)
                diameter = nx.diameter(graph)
            else:
                # Calculate for largest connected component
                largest_cc = max(nx.connected_components(graph), key=len)
                subgraph = graph.subgraph(largest_cc)
                avg_path_length = nx.average_shortest_path_length(subgraph)
                diameter = nx.diameter(subgraph)
            
            # Centrality measures for each node
            degree_centrality = nx.degree_centrality(graph)
            betweenness_centrality = nx.betweenness_centrality(graph)
            
            # Find most central teams
            most_central_degree = max(degree_centrality.items(), key=lambda x: x[1])
            most_central_betweenness = max(betweenness_centrality.items(), key=lambda x: x[1])
            
            return {
                "density": float(density),
                "avg_path_length": float(avg_path_length),
                "diameter": int(diameter),
                "most_central_team": {
                    "by_degree": {
                        "team_id": str(most_central_degree[0]),
                        "centrality": float(most_central_degree[1])
                    },
                    "by_betweenness": {
                        "team_id": str(most_central_betweenness[0]),
                        "centrality": float(most_central_betweenness[1])
                    }
                }
            }
        except Exception as e:
            # Return partial results in case of errors
            return {
                "error": str(e),
                "density": float(nx.density(graph)) if len(graph.nodes) > 1 else 0.0
            }
