import pandas as pd
import numpy as np
import networkx as nx
from typing import Dict, List, Optional, Tuple, Union, Any
from sklearn.preprocessing import StandardScaler
import json
import os
import re
from datetime import datetime
from pathlib import Path

from app.config.settings import settings

class OrganizationDataProcessor:
    """
    Processes organizational data from various sources into a standardized format
    for analysis and modeling.
    """

    def __init__(self):
        self.org_data = None
        self.comm_data = None
        self.network = None
        self.feature_data = None
        self.scaler = StandardScaler()
        self.processing_metadata = {
            "processed_at": None,
            "data_sources": [],
            "feature_count": 0,
            "record_count": 0,
            "warnings": []
        }

    def detect_file_type(self, file_path: str) -> str:
        """
        Detect file type from extension or content.

        Args:
            file_path: Path to the file

        Returns:
            File type: 'csv', 'excel', etc.
        """
        path = Path(file_path)
        extension = path.suffix.lower()

        if extension in ['.csv', '.txt']:
            return 'csv'
        elif extension in ['.xlsx', '.xls']:
            return 'excel'
        elif extension in ['.json']:
            return 'json'

        # If extension doesn't clearly indicate type, try to infer from content
        try:
            # Check if file is CSV by trying to read first few lines
            with open(file_path, 'r', errors='ignore') as f:
                sample = f.read(4096)
                # Count commas and tabs to guess delimiter
                if sample.count(',') > sample.count('\t'):
                    # Likely CSV with comma delimiter
                    return 'csv'
                elif sample.count('\t') > 0:
                    # Likely TSV
                    return 'csv_tab'
        except:
            # If text reading fails, might be binary (like Excel)
            pass

        # Default to CSV as most common format
        return 'csv'

    def read_file(self, file_path: str) -> pd.DataFrame:
        """
        Read file based on detected type.

        Args:
            file_path: Path to the file

        Returns:
            DataFrame with file contents
        """
        file_type = self.detect_file_type(file_path)

        try:
            if file_type == 'csv':
                return pd.read_csv(file_path)
            elif file_type == 'csv_tab':
                return pd.read_csv(file_path, sep='\t')
            elif file_type == 'excel':
                return pd.read_excel(file_path)
            elif file_type == 'json':
                return pd.read_json(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            error = f"Error reading file {os.path.basename(file_path)}: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return pd.DataFrame()

    def validate_schema(self, df: pd.DataFrame, expected_schema: Dict[str, Any], dataset_type: str) -> List[str]:
        """
        Validate dataframe schema against expected schema.

        Args:
            df: DataFrame to validate
            expected_schema: Dictionary mapping column names to expected types
            dataset_type: Type of dataset for error messages

        Returns:
            List of validation warnings
        """
        warnings = []

        # Check for required columns
        required_columns = [col for col, meta in expected_schema.items() if meta.get('required', False)]
        missing_cols = [col for col in required_columns if col not in df.columns]

        if missing_cols:
            warnings.append(f"Warning: Missing required columns in {dataset_type} data: {missing_cols}")

        # Check column types
        for col in df.columns:
            if col in expected_schema:
                expected_type = expected_schema[col].get('type')
                if expected_type:
                    if expected_type == 'numeric':
                        if not pd.api.types.is_numeric_dtype(df[col]):
                            try:
                                # Try to convert to numeric
                                df[col] = pd.to_numeric(df[col], errors='coerce')
                                warnings.append(f"Warning: Column '{col}' converted to numeric with NaN for non-numeric values")
                            except:
                                warnings.append(f"Warning: Column '{col}' should be numeric")
                    elif expected_type == 'datetime':
                        if not pd.api.types.is_datetime64_dtype(df[col]):
                            try:
                                # Try to convert to datetime
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                                warnings.append(f"Warning: Column '{col}' converted to datetime format")
                            except:
                                warnings.append(f"Warning: Column '{col}' should be datetime")
                    elif expected_type == 'categorical':
                        if not pd.api.types.is_string_dtype(df[col]) and not pd.api.types.is_categorical_dtype(df[col]):
                            # Convert to string
                            df[col] = df[col].astype(str)
                            warnings.append(f"Warning: Column '{col}' converted to string")

        return warnings

    def detect_dataset_type(self, df: pd.DataFrame) -> str:
        """
        Detect the type of dataset based on its columns.

        Args:
            df: DataFrame to analyze

        Returns:
            String indicating dataset type: 'organization', 'communication', 'performance', or 'unknown'
        """
        columns = set(df.columns.str.lower())

        # Check for organization structure data
        org_indicators = {'employee_id', 'manager_id', 'department', 'role', 'tenure'}
        org_match = len(org_indicators.intersection(columns)) / len(org_indicators)

        # Check for communication data
        comm_indicators = {'sender', 'receiver', 'timestamp', 'channel', 'message'}
        comm_match = len(comm_indicators.intersection(columns)) / len(comm_indicators)

        # Check for performance data
        perf_indicators = {'evaluation', 'score', 'performance', 'productivity', 'quality'}
        perf_match = len(perf_indicators.intersection(columns)) / len(perf_indicators)

        # Get the best match
        match_scores = {
            'organization': org_match,
            'communication': comm_match,
            'performance': perf_match
        }

        best_match = max(match_scores.items(), key=lambda x: x[1])

        # Set a threshold for detection
        if best_match[1] >= 0.4: # 40% of expected columns are present
            return best_match[0]
        else:
            return 'unknown'

    def get_expected_schema(self, dataset_type: str) -> Dict[str, Any]:
        """
        Get the expected schema for a specific dataset type.

        Args:
            dataset_type: Type of dataset (organization, communication, performance)

        Returns:
            Dictionary with expected schema
        """
        if dataset_type == 'organization':
            return {
                'employee_id': {'type': 'categorical', 'required': True},
                'manager_id': {'type': 'categorical', 'required': True},
                'department': {'type': 'categorical', 'required': True},
                'role': {'type': 'categorical', 'required': True},
                'tenure_months': {'type': 'numeric', 'required': True},
                'salary': {'type': 'numeric', 'required': False},
                'location': {'type': 'categorical', 'required': False},
                'hire_date': {'type': 'datetime', 'required': False},
                'employment_status': {'type': 'categorical', 'required': False},
                'team_id': {'type': 'categorical', 'required': False},
                'level': {'type': 'numeric', 'required': False}
            }
        elif dataset_type == 'communication':
            return {
                'sender_id': {'type': 'categorical', 'required': True},
                'receiver_id': {'type': 'categorical', 'required': True},
                'timestamp': {'type': 'datetime', 'required': True},
                'channel': {'type': 'categorical', 'required': True},
                'message_count': {'type': 'numeric', 'required': False},
                'duration_minutes': {'type': 'numeric', 'required': False},
                'sentiment_score': {'type': 'numeric', 'required': False},
                'topic': {'type': 'categorical', 'required': False},
                'is_important': {'type': 'numeric', 'required': False},
                'priority': {'type': 'categorical', 'required': False},
                'read_status': {'type': 'categorical', 'required': False}
            }
        elif dataset_type == 'performance':
            return {
                'employee_id': {'type': 'categorical', 'required': True},
                'evaluation_date': {'type': 'datetime', 'required': True},
                'overall_score': {'type': 'numeric', 'required': True},
                'productivity_score': {'type': 'numeric', 'required': False},
                'quality_score': {'type': 'numeric', 'required': False},
                'team_collaboration_score': {'type': 'numeric', 'required': False},
                'goals_achieved': {'type': 'numeric', 'required': False},
                'training_hours': {'type': 'numeric', 'required': False},
                'attendance_rate': {'type': 'numeric', 'required': False},
                'leadership_score': {'type': 'numeric', 'required': False},
                'innovation_score': {'type': 'numeric', 'required': False},
                'customer_satisfaction': {'type': 'numeric', 'required': False},
                'promotability_index': {'type': 'categorical', 'required': False},
                'retention_risk': {'type': 'categorical', 'required': False}
            }
        else:
            return {}

    def import_org_structure(self, file_path: str) -> pd.DataFrame:
        """
        Import organizational structure data from file.

        Args:
            file_path: Path to the file containing org structure data

        Returns:
            Processed DataFrame with organizational structure
        """
        # Import data
        try:
            # Read file based on format
            df = self.read_file(file_path)

            if df.empty:
                error = "Error: Could not read organizational data file"
                self.processing_metadata["warnings"].append(error)
                return pd.DataFrame()

            # Auto-detect dataset type if needed
            detected_type = self.detect_dataset_type(df)
            if detected_type != 'organization':
                warning = f"Warning: This file appears to be {detected_type} data, not organization structure data"
                self.processing_metadata["warnings"].append(warning)

            # Get expected schema for organization data
            expected_schema = self.get_expected_schema('organization')

            self.processing_metadata["data_sources"].append({
                "type": "org_structure",
                "file": os.path.basename(file_path),
                "records": len(df),
                "columns": list(df.columns),
                "detected_type": detected_type
            })

            # Validate schema
            validation_warnings = self.validate_schema(df, expected_schema, "organization structure")
            self.processing_metadata["warnings"].extend(validation_warnings)

            # Basic data cleaning
            # Convert employee and manager IDs to string
            if 'employee_id' in df.columns:
                df['employee_id'] = df['employee_id'].astype(str)
            if 'manager_id' in df.columns:
                df['manager_id'] = df['manager_id'].fillna('').astype(str)

            # Fill missing values
            if 'tenure_months' in df.columns:
                df['tenure_months'] = df['tenure_months'].fillna(df['tenure_months'].median())

            # If hire_date exists, ensure it's datetime
            if 'hire_date' in df.columns:
                try:
                    df['hire_date'] = pd.to_datetime(df['hire_date'])
                except:
                    df['hire_date'] = pd.NaT
                    self.processing_metadata["warnings"].append("Warning: Could not convert hire_date to datetime format")

            # Check for duplicates in employee_id
            if 'employee_id' in df.columns and df['employee_id'].duplicated().any():
                dupes = df['employee_id'][df['employee_id'].duplicated()].unique()
                warning = f"Warning: Found {len(dupes)} duplicate employee IDs"
                self.processing_metadata["warnings"].append(warning)

                # Remove duplicates, keeping first occurrence
                df = df.drop_duplicates(subset=['employee_id'], keep='first')

            # Add derived metrics that can be computed from the organization structure alone
            if 'department' in df.columns:
                # Create department size feature
                dept_counts = df['department'].value_counts().to_dict()
                df['department_size'] = df['department'].map(dept_counts)

            # Convert specific categorical columns to category type for efficiency
            for col in ['department', 'role', 'location', 'employment_status']:
                if col in df.columns:
                    df[col] = df[col].astype('category')

            self.org_data = df
            return df

        except Exception as e:
            error = f"Error importing organizational data: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return pd.DataFrame()

    def import_communication_data(self, file_path: str) -> pd.DataFrame:
        """
        Import communication data from file.

        Args:
            file_path: Path to the file containing communication data

        Returns:
            Processed DataFrame with communication data
        """
        try:
            # Read file based on format
            df = self.read_file(file_path)

            if df.empty:
                error = "Error: Could not read communication data file"
                self.processing_metadata["warnings"].append(error)
                return pd.DataFrame()

            # Auto-detect dataset type if needed
            detected_type = self.detect_dataset_type(df)
            if detected_type != 'communication':
                warning = f"Warning: This file appears to be {detected_type} data, not communication data"
                self.processing_metadata["warnings"].append(warning)

            # Get expected schema for communication data
            expected_schema = self.get_expected_schema('communication')

            self.processing_metadata["data_sources"].append({
                "type": "communication_data",
                "file": os.path.basename(file_path),
                "records": len(df),
                "columns": list(df.columns),
                "detected_type": detected_type
            })

            # Validate schema
            validation_warnings = self.validate_schema(df, expected_schema, "communication")
            self.processing_metadata["warnings"].extend(validation_warnings)

            # Basic data cleaning
            # Convert IDs to string
            if 'sender_id' in df.columns:
                df['sender_id'] = df['sender_id'].astype(str)
            if 'receiver_id' in df.columns:
                df['receiver_id'] = df['receiver_id'].astype(str)

            # Convert timestamp to datetime
            if 'timestamp' in df.columns:
                try:
                    df['timestamp'] = pd.to_datetime(df['timestamp'])
                    df['date'] = df['timestamp'].dt.date

                    # Add additional time-based features
                    df['hour'] = df['timestamp'].dt.hour
                    df['day_of_week'] = df['timestamp'].dt.dayofweek
                    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int) # 5=Sat, 6=Sun
                    df['month'] = df['timestamp'].dt.month
                    df['year'] = df['timestamp'].dt.year
                    df['week_of_year'] = df['timestamp'].dt.isocalendar().week

                    # Add time of day category
                    df['time_of_day'] = pd.cut(
                        df['hour'],
                        bins=[0, 9, 12, 17, 24],
                        labels=['Night', 'Morning', 'Afternoon', 'Evening'],
                        include_lowest=True
                    )

                except Exception as e:
                    warning = f"Warning: Could not process timestamp column: {str(e)}"
                    self.processing_metadata["warnings"].append(warning)

            # Clean and process additional columns
            if 'message_count' in df.columns:
                df['message_count'] = pd.to_numeric(df['message_count'], errors='coerce').fillna(0)

            if 'duration_minutes' in df.columns:
                df['duration_minutes'] = pd.to_numeric(df['duration_minutes'], errors='coerce').fillna(0)

            if 'sentiment_score' in df.columns:
                df['sentiment_score'] = pd.to_numeric(df['sentiment_score'], errors='coerce')
                # Normalize sentiment between -1 and 1 if outside that range
                if (df['sentiment_score'].min() < -1 or df['sentiment_score'].max() > 1) and not df['sentiment_score'].isna().all():
                    mean = df['sentiment_score'].mean()
                    std = df['sentiment_score'].std()
                    if std > 0: # Avoid division by zero
                        df['sentiment_score'] = (df['sentiment_score'] - mean) / (3 * std)
                        df['sentiment_score'] = df['sentiment_score'].clip(-1, 1)
                        warning = "Normalized sentiment scores to range between -1 and 1"
                        self.processing_metadata["warnings"].append(warning)

            # Add communication intensity metrics
            df['comm_intensity'] = 1 # Default base value for each communication
            if 'message_count' in df.columns and 'duration_minutes' in df.columns:
                # Create intensity based on message count and duration
                non_zero_duration = df['duration_minutes'].copy()
                non_zero_duration = non_zero_duration.replace(0, 1) # Avoid division by zero
                df['comm_intensity'] = df['message_count'] / non_zero_duration
                df['comm_intensity'] = df['comm_intensity'].fillna(1) # Fill NaNs with default

            # Convert to category type for better memory usage
            if 'channel' in df.columns:
                df['channel'] = df['channel'].astype('category')
            if 'time_of_day' in df.columns:
                df['time_of_day'] = df['time_of_day'].astype('category')
            if 'topic' in df.columns:
                df['topic'] = df['topic'].astype('category')
            if 'priority' in df.columns:
                df['priority'] = df['priority'].astype('category')
            if 'read_status' in df.columns:
                df['read_status'] = df['read_status'].astype('category')

            # Add network summaries
            # Calculate total communications per sender
            if 'sender_id' in df.columns:
                sender_counts = df['sender_id'].value_counts().to_dict()
                df['sender_total_comms'] = df['sender_id'].map(sender_counts)

            # Calculate total communications per receiver
            if 'receiver_id' in df.columns:
                receiver_counts = df['receiver_id'].value_counts().to_dict()
                df['receiver_total_comms'] = df['receiver_id'].map(receiver_counts)

            self.comm_data = df
            return df

        except Exception as e:
            error = f"Error importing communication data: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return pd.DataFrame()

    def build_network(self) -> nx.Graph:
        """
        Build a network graph from communication data.

        Returns:
            NetworkX graph of communication patterns
        """
        if self.comm_data is None:
            error = "Error: No communication data loaded"
            self.processing_metadata["warnings"].append(error)
            return nx.Graph()

        try:
            # Create a graph
            G = nx.Graph()

            # Add nodes from org data if available
            if self.org_data is not None:
                for _, row in self.org_data.iterrows():
                    G.add_node(row['employee_id'],
                               department=row.get('department', ''),
                               role=row.get('role', ''),
                               tenure=row.get('tenure_months', 0))

            # Add edges from communication data
            if 'weight' not in self.comm_data.columns:
                # Aggregate communications to get weight
                comm_agg = self.comm_data.groupby(['sender_id', 'receiver_id']).size().reset_index(name='weight')
            else:
                comm_agg = self.comm_data[['sender_id', 'receiver_id', 'weight']]

            # Add edges to the graph
            for _, row in comm_agg.iterrows():
                G.add_edge(row['sender_id'], row['receiver_id'], weight=row['weight'])

            self.processing_metadata["network_info"] = {
                "nodes": G.number_of_nodes(),
                "edges": G.number_of_edges(),
                "density": nx.density(G)
            }

            self.network = G
            return G

        except Exception as e:
            error = f"Error building network: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return nx.Graph()

    def extract_network_features(self) -> pd.DataFrame:
        """
        Extract network metrics for each employee.

        Returns:
            DataFrame with network metrics
        """
        if self.network is None:
            error = "Error: No network graph available"
            self.processing_metadata["warnings"].append(error)
            return pd.DataFrame()

        try:
            # Calculate network metrics
            node_metrics = {}

            # Basic centrality measures
            degree_centrality = nx.degree_centrality(self.network)
            betweenness_centrality = nx.betweenness_centrality(self.network)
            closeness_centrality = nx.closeness_centrality(self.network)
            eigenvector_centrality = {}
            try:
                eigenvector_centrality = nx.eigenvector_centrality(self.network, max_iter=300)
            except:
                self.processing_metadata["warnings"].append("Could not compute eigenvector centrality")
                eigenvector_centrality = {node: 0 for node in self.network.nodes()}

            # Clustering coefficient
            clustering = nx.clustering(self.network)

            # Identify community structure using a basic community detection method
            communities = []
            try:
                from networkx.algorithms import community
                communities = list(community.greedy_modularity_communities(self.network))
            except Exception as e:
                self.processing_metadata["warnings"].append(f"Could not detect communities: {str(e)}")

            # Assign community IDs to nodes
            community_mapping = {}
            for i, comm in enumerate(communities):
                for node in comm:
                    community_mapping[node] = i + 1 # 1-based community ID

            # Combine metrics
            for node in self.network.nodes():
                node_metrics[node] = {
                    'degree_centrality': degree_centrality.get(node, 0),
                    'betweenness_centrality': betweenness_centrality.get(node, 0),
                    'closeness_centrality': closeness_centrality.get(node, 0),
                    'eigenvector_centrality': eigenvector_centrality.get(node, 0),
                    'clustering_coefficient': clustering.get(node, 0),
                    'community_id': community_mapping.get(node, 0),
                    'is_bridge': betweenness_centrality.get(node, 0) > 0.1 and clustering.get(node, 0) < 0.5
                }

            # Convert to DataFrame
            metrics_df = pd.DataFrame.from_dict(node_metrics, orient='index')
            metrics_df.index.name = 'employee_id'
            metrics_df = metrics_df.reset_index()

            self.processing_metadata["network_features"] = {
                "feature_count": len(metrics_df.columns) - 1, # Subtract employee_id column
                "employee_count": len(metrics_df),
                "communities_detected": len(communities)
            }

            return metrics_df

        except Exception as e:
            error = f"Error extracting network features: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return pd.DataFrame()

    def import_performance_data(self, file_path: str) -> pd.DataFrame:
        """
        Import performance data from file.

        Args:
            file_path: Path to the file containing performance data

        Returns:
            Processed DataFrame with performance data
        """
        try:
            # Read file based on format
            df = self.read_file(file_path)

            if df.empty:
                error = "Error: Could not read performance data file"
                self.processing_metadata["warnings"].append(error)
                return pd.DataFrame()

            # Auto-detect dataset type if needed
            detected_type = self.detect_dataset_type(df)
            if detected_type != 'performance':
                warning = f"Warning: This file appears to be {detected_type} data, not performance data"
                self.processing_metadata["warnings"].append(warning)

            # Get expected schema for performance data
            expected_schema = self.get_expected_schema('performance')

            self.processing_metadata["data_sources"].append({
                "type": "performance_data",
                "file": os.path.basename(file_path),
                "records": len(df),
                "columns": list(df.columns),
                "detected_type": detected_type
            })

            # Validate schema
            validation_warnings = self.validate_schema(df, expected_schema, "performance")
            self.processing_metadata["warnings"].extend(validation_warnings)

            # Basic data cleaning
            # Convert employee_id to string
            if 'employee_id' in df.columns:
                df['employee_id'] = df['employee_id'].astype(str)

            # Convert evaluation_date to datetime
            if 'evaluation_date' in df.columns:
                try:
                    df['evaluation_date'] = pd.to_datetime(df['evaluation_date'])

                    # Extract date components for time-based analysis
                    df['evaluation_year'] = df['evaluation_date'].dt.year
                    df['evaluation_quarter'] = df['evaluation_date'].dt.quarter
                    df['evaluation_month'] = df['evaluation_date'].dt.month
                except Exception as e:
                    warning = f"Warning: Could not convert evaluation_date to datetime format: {str(e)}"
                    self.processing_metadata["warnings"].append(warning)

            # Convert score columns to numeric
            score_columns = [col for col in df.columns if 'score' in col.lower()]
            for col in score_columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

                # Check if scores are within expected range (typically 1-5)
                if df[col].max() > 10 and df[col].min() >= 0:
                    # Normalize to 0-1 scale
                    max_val = df[col].max()
                    df[col] = df[col] / max_val
                    warning = f"Warning: Normalized {col} to 0-1 scale (original max: {max_val})"
                    self.processing_metadata["warnings"].append(warning)

            # Convert numeric columns to appropriate types
            for col in ['goals_achieved', 'training_hours']:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

            # Ensure attendance_rate is percentage (0-100)
            if 'attendance_rate' in df.columns:
                df['attendance_rate'] = pd.to_numeric(df['attendance_rate'], errors='coerce')
                # Convert to percentage if it appears to be a decimal
                if df['attendance_rate'].max() <= 1 and df['attendance_rate'].min() >= 0:
                    df['attendance_rate'] = df['attendance_rate'] * 100
                    warning = "Warning: Converted attendance_rate from decimal to percentage scale"
                    self.processing_metadata["warnings"].append(warning)

            # Convert categorical columns
            for col in ['promotability_index', 'retention_risk']:
                if col in df.columns:
                    df[col] = df[col].astype('category')

            # Add computed metrics
            # Average of all score columns for a comprehensive performance metric
            if len(score_columns) > 1:
                df['average_performance'] = df[score_columns].mean(axis=1)

            # Calculate performance improvement if we have multiple evaluation dates
            if 'evaluation_date' in df.columns and 'overall_score' in df.columns and len(df['evaluation_date'].unique()) > 1:
                # Sort by employee_id and evaluation_date
                df = df.sort_values(['employee_id', 'evaluation_date'])

                # Group by employee and calculate score change
                df['previous_score'] = df.groupby('employee_id')['overall_score'].shift(1)
                df['score_change'] = df['overall_score'] - df['previous_score']

                # Calculate improvement rate
                df['improvement_rate'] = df['score_change'] / df['previous_score'].replace(0, 1) * 100

            # Convert retention_risk to numeric if it exists
            if 'retention_risk' in df.columns:
                # Map text values to numeric risk scores
                risk_mapping = {'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4}
                if df['retention_risk'].dtype == 'category' or df['retention_risk'].dtype == 'object':
                    # Create a numeric version of retention risk
                    df['retention_risk_score'] = df['retention_risk'].map(risk_mapping).fillna(2)

            # Get most recent evaluation per employee if multiple dates exist
            if 'employee_id' in df.columns and 'evaluation_date' in df.columns and len(df['evaluation_date'].unique()) > 1:
                # Create a flag for most recent evaluation
                df['is_most_recent'] = False
                # For each employee, mark the most recent evaluation
                for emp in df['employee_id'].unique():
                    emp_data = df[df['employee_id'] == emp]
                    if len(emp_data) > 0:
                        most_recent_idx = emp_data['evaluation_date'].idxmax()
                        df.loc[most_recent_idx, 'is_most_recent'] = True

                # Add a note to metadata
                self.processing_metadata["performance_processing"] = {
                    "multiple_evaluations": True,
                    "evaluation_dates": sorted([d.strftime('%Y-%m-%d') for d in df['evaluation_date'].unique()]),
                    "most_recent_flag_added": True
                }

            return df

        except Exception as e:
            error = f"Error importing performance data: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return pd.DataFrame()

    def merge_features(self, performance_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Merge organizational and network features with performance data if available.

        Args:
            performance_data: Optional DataFrame containing performance metrics

        Returns:
            Combined DataFrame with all features
        """
        if self.org_data is None:
            error = "Error: No organizational data loaded"
            self.processing_metadata["warnings"].append(error)
            return pd.DataFrame()

        try:
            # Extract network features if we have a network
            if self.network is not None:
                network_features = self.extract_network_features()
            else:
                network_features = pd.DataFrame()

            # Start with org data
            combined_data = self.org_data.copy()

            # Add network features if available
            if not network_features.empty:
                # Make sure employee_id is a string in both datasets
                network_features['employee_id'] = network_features['employee_id'].astype(str)
                combined_data['employee_id'] = combined_data['employee_id'].astype(str)

                combined_data = combined_data.merge(
                    network_features, on='employee_id', how='left'
                )

                # Add notice about network features being added
                self.processing_metadata["network_features_added"] = {
                    "feature_count": len(network_features.columns) - 1, # Subtract employee_id
                    "features": [col for col in network_features.columns if col != 'employee_id']
                }

            # Add performance data if available
            if performance_data is not None and not performance_data.empty:
                if 'employee_id' in performance_data.columns:
                    # If not already in metadata, add it
                    if not any(source.get('type') == 'performance_data' for source in self.processing_metadata["data_sources"]):
                        self.processing_metadata["data_sources"].append({
                            "type": "performance_data",
                            "records": len(performance_data),
                            "columns": list(performance_data.columns)
                        })

                    # Make sure employee_id is a string in performance data
                    performance_data['employee_id'] = performance_data['employee_id'].astype(str)

                    # Check for 'evaluation_date' column to get the most recent evaluation
                    if 'evaluation_date' in performance_data.columns:
                        # Check if it's datetime
                        if not pd.api.types.is_datetime64_dtype(performance_data['evaluation_date']):
                            try:
                                performance_data['evaluation_date'] = pd.to_datetime(performance_data['evaluation_date'])
                            except:
                                # If conversion fails, we'll use all data
                                warning = "Warning: Could not convert evaluation_date to datetime. Using all performance records."
                                self.processing_metadata["warnings"].append(warning)

                        # If datetime conversion succeeded, get most recent evaluation per employee
                        if pd.api.types.is_datetime64_dtype(performance_data['evaluation_date']):
                            # Sort by date and get most recent per employee
                            performance_data = performance_data.sort_values('evaluation_date')
                            performance_data = performance_data.drop_duplicates('employee_id', keep='last')

                            # Add note to metadata
                            self.processing_metadata["performance_processing"] = "Used most recent evaluation per employee"

                    # If there are duplicate columns, rename them with a suffix
                    # to avoid losing data during merge
                    duplicate_cols = list(set(combined_data.columns) & set(performance_data.columns))
                    if 'employee_id' in duplicate_cols:
                        duplicate_cols.remove('employee_id') # keep this as the merge key

                    if duplicate_cols:
                        performance_data = performance_data.rename(
                            columns={col: f"{col}_perf" for col in duplicate_cols}
                        )

                        # Add note to metadata about renamed columns
                        self.processing_metadata["column_renaming"] = {
                            "performance_data": duplicate_cols
                        }

                    # Merge with combined data
                    combined_data = combined_data.merge(
                        performance_data, on='employee_id', how='left'
                    )

                    # Add metadata about performance metrics
                    self.processing_metadata["performance_metrics_added"] = {
                        "metric_count": len(performance_data.columns) - 1, # Subtract employee_id
                        "metrics": [col for col in performance_data.columns if col != 'employee_id']
                    }
                else:
                    warning = "Warning: performance_data must contain employee_id column"
                    self.processing_metadata["warnings"].append(warning)

            # Handle missing values
            numeric_cols = combined_data.select_dtypes(include=[np.number]).columns
            if not numeric_cols.empty:
                # Calculate median for each numeric column
                medians = combined_data[numeric_cols].median()
                # Fill missing values with column median
                for col in numeric_cols:
                    combined_data[col] = combined_data[col].fillna(medians[col])

            # Handle categorical missing values with appropriate fillers
            categorical_cols = combined_data.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                if col == 'manager_id':
                    # Empty string for manager_id (represents top level)
                    combined_data[col] = combined_data[col].fillna('')
                elif col.endswith('_id'):
                    # Special handling for ID columns
                    combined_data[col] = combined_data[col].fillna('UNKNOWN')
                elif 'department' in col.lower():
                    combined_data[col] = combined_data[col].fillna('Unknown Department')
                elif 'role' in col.lower():
                    combined_data[col] = combined_data[col].fillna('Unknown Role')
                elif 'location' in col.lower():
                    combined_data[col] = combined_data[col].fillna('Unknown Location')
                else:
                    # Default for other categorical columns
                    combined_data[col] = combined_data[col].fillna('Unknown')

            self.feature_data = combined_data

            # Calculate additional organizational metrics
            self.calculate_org_metrics()

            # Update metadata
            self.processing_metadata["processed_at"] = datetime.now().isoformat()
            self.processing_metadata["feature_count"] = len(combined_data.columns)
            self.processing_metadata["record_count"] = len(combined_data)
            self.processing_metadata["final_columns"] = list(combined_data.columns)

            return combined_data

        except Exception as e:
            error = f"Error merging features: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return pd.DataFrame()

    def prepare_model_data(self, target_column: str) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare data for modeling by scaling features and separating target.

        Args:
            target_column: Name of the target column for prediction

        Returns:
            Tuple of (X, y) with feature matrix and target vector
        """
        if self.feature_data is None or target_column not in self.feature_data.columns:
            error = f"Error: Target column '{target_column}' not found in feature data"
            self.processing_metadata["warnings"].append(error)
            return np.array([]), np.array([])

        try:
            # Separate features and target
            y = self.feature_data[target_column].values

            # Select only numeric columns for features
            feature_cols = self.feature_data.select_dtypes(include=[np.number]).columns
            feature_cols = [col for col in feature_cols if col != target_column]

            X = self.feature_data[feature_cols].values

            # Scale features
            X_scaled = self.scaler.fit_transform(X)

            self.processing_metadata["modeling_info"] = {
                "target_column": target_column,
                "feature_count": len(feature_cols),
                "sample_count": len(y)
            }

            return X_scaled, y

        except Exception as e:
            error = f"Error preparing model data: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return np.array([]), np.array([])

    def calculate_org_metrics(self):
        """
        Calculate additional organizational metrics from the processed data
        to enhance the dataset for analysis.
        """
        if self.feature_data is None:
            return

        try:
            # Calculate team sizes by department
            if 'department' in self.feature_data.columns:
                dept_counts = self.feature_data['department'].value_counts().to_dict()
                self.feature_data['team_size'] = self.feature_data['department'].map(dept_counts)

            # Calculate span of control for managers
            if 'manager_id' in self.feature_data.columns:
                direct_reports = self.feature_data['manager_id'].value_counts().to_dict()
                self.feature_data['direct_reports_count'] = self.feature_data['employee_id'].map(direct_reports).fillna(0)

            # Calculate management level depth
            if 'manager_id' in self.feature_data.columns and 'employee_id' in self.feature_data.columns:
                # Create a dictionary mapping employee_id to their row index
                emp_to_idx = dict(zip(self.feature_data['employee_id'], self.feature_data.index))

                # Initialize management_level column
                self.feature_data['management_level'] = 0

                # Set CEO (or root node with no manager) to level 1
                self.feature_data.loc[self.feature_data['manager_id'] == '', 'management_level'] = 1

                # Identify employees at each successive level
                current_level = 1
                while True:
                    # Get employees at the current level
                    current_level_employees = self.feature_data[self.feature_data['management_level'] == current_level]['employee_id'].tolist()

                    if not current_level_employees:
                        break

                    # Set their direct reports to the next level
                    next_level = self.feature_data[self.feature_data['manager_id'].isin(current_level_employees)].index
                    if len(next_level) == 0:
                        break

                    self.feature_data.loc[next_level, 'management_level'] = current_level + 1
                    current_level += 1
        except Exception as e:
            warning = f"Warning: Error calculating organizational metrics: {str(e)}"
            self.processing_metadata["warnings"].append(warning)

    def export_processed_data(self, output_path: str) -> str:
        """
        Export processed data to a CSV file.

        Args:
            output_path: Path to save the processed data

        Returns:
            Path to the saved file
        """
        if self.feature_data is None:
            error = "Error: No processed data available for export"
            self.processing_metadata["warnings"].append(error)
            return ""

        try:
            # Save to CSV
            self.feature_data.to_csv(output_path, index=False)

            # Save metadata
            metadata_path = output_path.replace('.csv', '_metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(self.processing_metadata, f, indent=2)

            return output_path

        except Exception as e:
            error = f"Error exporting processed data: {str(e)}"
            self.processing_metadata["warnings"].append(error)
            return ""

    def get_processing_summary(self) -> Dict:
        """
        Get a summary of the data processing steps and results.

        Returns:
            Dictionary with processing summary
        """
        return self.processing_metadata