import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import scipy.stats as stats
from sklearn.feature_selection import mutual_info_regression, SelectKBest, f_regression

class FeatureIdentifier:
    """
    Provides robust identification of features and targets in organizational datasets.
    """
    
    # Keywords for different types of columns
    FEATURE_KEYWORDS = {
        'team': ['team', 'group', 'department', 'unit', 'division', 'section'],
        'tenure': ['tenure', 'years', 'experience', 'service', 'employment', 'duration'],
        'skill': ['skill', 'competence', 'proficiency', 'expertise', 'ability', 'capability', 'mastery', 'talent', 'knowledge'],
        'demographic': ['age', 'gender', 'demographic', 'ethnicity', 'race', 'nationality', 'education', 'background', 'degree'],
        'communication': ['communication', 'interaction', 'collaboration', 'contact', 'connection', 'network', 'social', 'email', 'message', 'chat', 'meeting'],
        'hierarchy': ['hierarchy', 'level', 'rank', 'grade', 'position', 'role', 'manager', 'leader', 'supervisor', 'director', 'executive', 'chief'],
        'training': ['training', 'learning', 'development', 'education', 'workshop', 'seminar', 'course', 'certification', 'skill development']
    }
    
    TARGET_KEYWORDS = {
        'performance': ['performance', 'score', 'rating', 'outcome', 'result', 'productivity', 'efficiency', 'output', 'success', 'achievement', 'accomplishment', 'quality', 'kpi'],
        'satisfaction': ['satisfaction', 'happiness', 'engagement', 'morale', 'wellbeing', 'wellness', 'commitment', 'dedication', 'loyalty', 'retention'],
        'turnover': ['turnover', 'attrition', 'churn', 'departure', 'resignation', 'termination', 'leaving', 'quit', 'exit'],
        'innovation': ['innovation', 'creativity', 'invention', 'ideation', 'novel', 'breakthrough', 'improvement', 'development', 'initiative', 'suggestion']
    }
    
    @staticmethod
    def identify_features_and_targets(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Identify potential features and targets in a dataset.
        
        Args:
            df: Input DataFrame
            
        Returns:
            Dictionary with identified features and targets
        """
        if df.empty:
            return {"error": "Empty dataset"}
        
        # Basic data analysis
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # Identify potential ID columns
        id_cols = [col for col in df.columns if 'id' in col.lower() or 'key' in col.lower() or 'code' in col.lower()]
        
        # Identify datetime columns
        datetime_cols = []
        for col in df.columns:
            try:
                if pd.to_datetime(df[col], errors='coerce').notna().any():
                    datetime_cols.append(col)
            except:
                pass
        
        # Remove ID and datetime columns from features
        non_feature_cols = id_cols + datetime_cols
        feature_candidates = [col for col in numeric_cols if col not in non_feature_cols]
        
        # Identify potential targets based on keywords
        potential_targets = []
        for col in feature_candidates:
            col_lower = col.lower()
            for target_type, keywords in FeatureIdentifier.TARGET_KEYWORDS.items():
                if any(keyword in col_lower for keyword in keywords):
                    potential_targets.append({
                        "column": col,
                        "type": target_type,
                        "mean": float(df[col].mean()),
                        "std": float(df[col].std()),
                        "missing": int(df[col].isna().sum()),
                        "matches": [kw for kw in keywords if kw in col_lower]
                    })
                    break
        
        # Identify potential features based on keywords
        potential_features = []
        for col in feature_candidates:
            col_lower = col.lower()
            for feature_type, keywords in FeatureIdentifier.FEATURE_KEYWORDS.items():
                if any(keyword in col_lower for keyword in keywords):
                    potential_features.append({
                        "column": col,
                        "type": feature_type,
                        "mean": float(df[col].mean()),
                        "std": float(df[col].std()),
                        "missing": int(df[col].isna().sum()),
                        "matches": [kw for kw in keywords if kw in col_lower]
                    })
                    break
        
        # Identify potential team/group columns
        team_cols = []
        for col in categorical_cols:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in FeatureIdentifier.FEATURE_KEYWORDS['team']):
                unique_values = df[col].nunique()
                # If column has a reasonable number of unique values, consider it a team column
                if 2 <= unique_values <= 50:
                    team_cols.append({
                        "column": col,
                        "unique_values": int(unique_values),
                        "missing": int(df[col].isna().sum())
                    })
        
        # If we have identified targets, perform statistical analysis
        statistical_analysis = {}
        if potential_targets and feature_candidates:
            for target_info in potential_targets:
                target_col = target_info["column"]
                
                # Skip if column has too many NaN values
                if df[target_col].isna().sum() > 0.2 * len(df):
                    continue
                    
                # Get non-NaN data for both target and features
                valid_idx = df[target_col].notna()
                target_values = df.loc[valid_idx, target_col].values
                
                if len(target_values) < 10:  # Skip if not enough data
                    continue
                
                # Calculate correlations and feature importance
                feature_correlations = []
                feature_importance = {}
                
                for feature_col in [f for f in feature_candidates if f != target_col]:
                    if df[feature_col].isna().sum() > 0.2 * len(df):
                        continue
                    
                    # Get valid values for this feature
                    feature_valid_idx = valid_idx & df[feature_col].notna()
                    if feature_valid_idx.sum() < 10:  # Skip if not enough data
                        continue
                        
                    feature_values = df.loc[feature_valid_idx, feature_col].values
                    target_subset = df.loc[feature_valid_idx, target_col].values
                    
                    try:
                        # Calculate correlation
                        corr, p_value = stats.pearsonr(feature_values, target_subset)
                        
                        # Only include if statistically significant
                        if p_value < 0.05 and not np.isnan(corr):
                            feature_correlations.append({
                                "feature": feature_col,
                                "correlation": float(corr),
                                "p_value": float(p_value)
                            })
                            feature_importance[feature_col] = abs(corr)
                    except:
                        # Skip if correlation calculation fails
                        pass
                
                # Sort by absolute correlation
                feature_correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)
                
                # Try to calculate mutual information if enough data
                mutual_info = {}
                try:
                    # Prepare data for mutual information calculation
                    features_df = df.loc[valid_idx, feature_candidates].copy()
                    features_df = features_df.fillna(features_df.mean())
                    
                    # Calculate mutual information
                    mi_values = mutual_info_regression(features_df, target_values)
                    
                    for idx, feature_col in enumerate(feature_candidates):
                        mutual_info[feature_col] = float(mi_values[idx])
                except:
                    # Skip if mutual information calculation fails
                    pass
                
                statistical_analysis[target_col] = {
                    "correlations": feature_correlations[:10],  # Top 10 correlations
                    "mutual_information": dict(sorted(mutual_info.items(), key=lambda x: x[1], reverse=True)[:10])  # Top 10 MI
                }
        
        return {
            "dataset_info": {
                "rows": len(df),
                "columns": len(df.columns),
                "numeric_columns": len(numeric_cols),
                "categorical_columns": len(categorical_cols)
            },
            "potential_targets": potential_targets,
            "potential_features": potential_features,
            "team_columns": team_cols,
            "id_columns": id_cols,
            "datetime_columns": datetime_cols,
            "statistical_analysis": statistical_analysis
        }
    
    @staticmethod
    def suggest_column_mappings(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Suggest column mappings for organization simulation.
        
        Args:
            df: Input DataFrame
            
        Returns:
            Dictionary with suggested column mappings
        """
        # Identify features and targets
        identification_results = FeatureIdentifier.identify_features_and_targets(df)
        
        # Extract identified columns
        potential_targets = identification_results.get("potential_targets", [])
        potential_features = identification_results.get("potential_features", [])
        team_cols = identification_results.get("team_columns", [])
        
        # Suggest mappings
        suggested_mappings = {
            "team_id": None,
            "employee_id": None,
            "manager_id": None,
            "performance": None,
            "satisfaction": None,
            "innovation": None,
            "turnover": None,
            "skill_level": None,
            "tenure": None,
            "training": None,
            "hierarchy_level": None
        }
        
        # Map ID columns
        id_cols = identification_results.get("id_columns", [])
        for col in id_cols:
            col_lower = col.lower()
            if 'employee' in col_lower or 'person' in col_lower:
                suggested_mappings["employee_id"] = col
            elif 'manager' in col_lower or 'supervisor' in col_lower or 'leader' in col_lower:
                suggested_mappings["manager_id"] = col
        
        # Map team columns
        if team_cols:
            suggested_mappings["team_id"] = team_cols[0]["column"]  # Use first identified team column
        
        # Map target columns
        for target in potential_targets:
            target_type = target["type"]
            if target_type in suggested_mappings and not suggested_mappings[target_type]:
                suggested_mappings[target_type] = target["column"]
        
        # Map feature columns
        for feature in potential_features:
            feature_type = feature["type"]
            if feature_type == "skill" and not suggested_mappings["skill_level"]:
                suggested_mappings["skill_level"] = feature["column"]
            elif feature_type == "tenure" and not suggested_mappings["tenure"]:
                suggested_mappings["tenure"] = feature["column"]
            elif feature_type == "training" and not suggested_mappings["training"]:
                suggested_mappings["training"] = feature["column"]
            elif feature_type == "hierarchy" and not suggested_mappings["hierarchy_level"]:
                suggested_mappings["hierarchy_level"] = feature["column"]
        
        # Calculate confidence in mappings
        mapping_confidence = {}
        for key, value in suggested_mappings.items():
            if value:
                # Higher confidence for exact matches in column name
                exact_match = key in value.lower()
                # Medium confidence for partial matches or statistical validation
                has_stats = False
                if key in ["performance", "satisfaction", "innovation", "turnover"]:
                    has_stats = value in identification_results.get("statistical_analysis", {})
                
                if exact_match:
                    confidence = "high"
                elif has_stats:
                    confidence = "medium"
                else:
                    confidence = "low"
                
                mapping_confidence[key] = confidence
        
        return {
            "suggested_mappings": suggested_mappings,
            "confidence": mapping_confidence,
            "identification_results": identification_results
        }
