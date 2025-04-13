import pandas as pd
import numpy as np
from typing import Dict, List, Optional

class TeamStructureEvaluator:
    """
    Helper class for evaluating team structure data using trained ML models.
    """
    
    @staticmethod
    def evaluate_team(predictor, team_data: pd.DataFrame) -> Dict:
        """
        Evaluate a team structure using a trained predictor and provide insights.
        
        Args:
            predictor: Trained OrganizationalPerformancePredictor instance
            team_data: DataFrame with raw, unscaled feature values
            
        Returns:
            Dictionary with predictions and insights
        """
        if predictor.model is None:
            raise ValueError("Model has not been trained yet")

        # Get access to feature names and scaler
        feature_names = predictor.feature_names
        scaler = predictor.scaler
        
        if not feature_names:
            raise ValueError("Cannot evaluate without knowing the model's feature names")
            
        # Prepare input data with expected features
        X_eval = pd.DataFrame(columns=feature_names)
        for col in feature_names:
            if col in team_data.columns:
                X_eval[col] = team_data[col]
            else:
                # Fill missing features with zeros
                X_eval[col] = 0
                
        # Get predictions (will be scaled internally by predictor)
        predictions = predictor.predict(X_eval.values)
        
        # Generate insights
        insights = {}
        
        # Add top drivers if feature importances are available
        if predictor.feature_importances:
            sorted_features = sorted(
                predictor.feature_importances.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            insights['top_drivers'] = [
                {"feature": k, "importance": v} 
                for k, v in sorted_features[:5]
            ]
            
            # Compare team values with global averages
            unusual_values = {}
            
            # Only proceed if scaler has means and feature_names is available
            if hasattr(scaler, 'mean_') and feature_names:
                for feature, importance in sorted_features:
                    # Skip if not important enough or not in team data
                    if importance < 0.02 or feature not in team_data.columns:
                        continue
                        
                    # Get team average for this feature
                    team_avg = team_data[feature].mean()
                    
                    # Get global average from scaler
                    feature_idx = feature_names.index(feature)
                    global_avg = scaler.mean_[feature_idx]
                    
                    # Check if value deviates significantly
                    threshold = max(0.5, 0.2 * abs(global_avg)) if global_avg != 0 else 0.5
                    if abs(team_avg - global_avg) > threshold:
                        direction = "higher" if team_avg > global_avg else "lower"
                        unusual_values[feature] = {
                            "team_value": float(team_avg),
                            "global_avg": float(global_avg),
                            "direction": direction,
                            "impact": float(importance)
                        }
                
            insights['unusual_values'] = unusual_values
        
        return {
            'predictions': predictions.tolist(),
            'average_performance': float(np.mean(predictions)),
            'insights': insights
        }