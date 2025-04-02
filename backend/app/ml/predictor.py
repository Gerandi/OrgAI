import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from typing import Dict, List, Tuple, Union, Optional
import json
import os
import pickle
from datetime import datetime

from app.config.settings import settings

# PyTorch neural network model
class PyTorchNN(nn.Module):
    def __init__(self, input_size, hidden_size=50, hidden_layers=1, output_size=1):
        super(PyTorchNN, self).__init__()
        self.layers = nn.ModuleList()

        # Input layer
        self.layers.append(nn.Linear(input_size, hidden_size))
        self.layers.append(nn.ReLU())

        # Hidden layers
        for _ in range(hidden_layers - 1):
            self.layers.append(nn.Linear(hidden_size, hidden_size))
            self.layers.append(nn.ReLU())

        # Output layer
        self.layers.append(nn.Linear(hidden_size, output_size))

    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x

class PyTorchNNWrapper:
    def __init__(self, input_size, hidden_size=50, hidden_layers=1, output_size=1, lr=0.001, max_epochs=1000):
        self.model = PyTorchNN(input_size, hidden_size, hidden_layers, output_size)
        self.optimizer = optim.Adam(self.model.parameters(), lr=lr)
        self.criterion = nn.MSELoss()
        self.max_epochs = max_epochs
        self.input_size = input_size
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

    def fit(self, X, y):
        X_tensor = torch.FloatTensor(X).to(self.device)
        y_tensor = torch.FloatTensor(y).reshape(-1, 1).to(self.device)

        dataset = TensorDataset(X_tensor, y_tensor)
        dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

        self.model.train()
        early_stop_count = 0
        prev_loss = float('inf')

        for epoch in range(self.max_epochs):
            running_loss = 0.0
            for inputs, targets in dataloader:
                inputs = inputs.to(self.device)
                targets = targets.to(self.device)

                self.optimizer.zero_grad()
                outputs = self.model(inputs)
                loss = self.criterion(outputs, targets)
                loss.backward()
                self.optimizer.step()
                running_loss += loss.item()

            avg_loss = running_loss / len(dataloader)

            # Early stopping implementation
            if avg_loss < 0.0001: # Stop if loss is very small
                break

            # Additional early stopping check based on improvement
            if abs(prev_loss - avg_loss) < 0.0001: # Stop if loss improvement is negligible
                early_stop_count += 1
                if early_stop_count >= 5: # Stop if no improvement for 5 epochs
                    break
            else:
                early_stop_count = 0

            prev_loss = avg_loss

        return self

    def predict(self, X):
        self.model.eval()
        with torch.no_grad():
            # Handle input in batches if large to avoid memory issues
            batch_size = 1000
            n_samples = X.shape[0]

            if n_samples <= batch_size:
                # Small enough to process in one go
                X_tensor = torch.FloatTensor(X).to(self.device)
                predictions = self.model(X_tensor).cpu().numpy().flatten()
            else:
                # Process in batches
                predictions = np.zeros(n_samples)
                for i in range(0, n_samples, batch_size):
                    end = min(i + batch_size, n_samples)
                    batch = X[i:end]
                    X_tensor = torch.FloatTensor(batch).to(self.device)
                    batch_preds = self.model(X_tensor).cpu().numpy().flatten()
                    predictions[i:end] = batch_preds

            return predictions

class OrganizationalPerformancePredictor:
    """
    Predicts team and individual performance based on organizational and network features.
    """

    def __init__(self, model_type: str = 'random_forest'):
        """
        Initialize the predictor with a specified model type.

        Args:
            model_type: Type of model to use ('random_forest', 'gradient_boosting', 'neural_network')
        """
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.feature_importances = None
        self.training_history = {
            "model_type": model_type,
            "training_date": None,
            "metrics": {},
            "parameters": {},
            "feature_importances": {},
            "cross_validation": {} # Store CV results here
        }

    def train(self, X: np.ndarray, y: np.ndarray,
              feature_names: Optional[List[str]] = None,
              test_size: float = 0.2,
              validation_strategy: str = 'cross_validation') -> Dict: # Added validation_strategy
        """
        Train the performance prediction model.

        Args:
            X: Feature matrix
            y: Target vector
            feature_names: List of feature names (optional)
            test_size: Proportion of data to use for testing (used if validation_strategy is 'train_test_split')
            validation_strategy: 'cross_validation' or 'train_test_split'

        Returns:
            Dictionary with training results
        """
        # Scale features first
        X_scaled = self.scaler.fit_transform(X)

        # Save feature names if provided
        self.feature_names = feature_names

        # --- Model Selection and Training ---
        if self.model_type == 'random_forest':
            model = RandomForestRegressor(random_state=42)
            param_grid = {
                'n_estimators': [50, 100, 200],
                'max_depth': [None, 10, 20],
                'min_samples_split': [2, 5, 10]
            }
        elif self.model_type == 'gradient_boosting':
            model = GradientBoostingRegressor(random_state=42)
            param_grid = {
                'n_estimators': [50, 100, 200],
                'learning_rate': [0.01, 0.1, 0.2],
                'max_depth': [3, 5, 7]
            }
        elif self.model_type == 'neural_network':
             # NN handled separately below due to different CV process
             pass
        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")

        # --- Validation and Final Model Training ---
        if validation_strategy == 'cross_validation':
            if self.model_type == 'neural_network':
                # Manual CV for PyTorch NN
                param_combinations = [
                    {'hidden_size': 50, 'hidden_layers': 1, 'lr': 0.001},
                    {'hidden_size': 100, 'hidden_layers': 1, 'lr': 0.001},
                    {'hidden_size': 50, 'hidden_layers': 2, 'lr': 0.001},
                    {'hidden_size': 50, 'hidden_layers': 1, 'lr': 0.01},
                    {'hidden_size': 100, 'hidden_layers': 2, 'lr': 0.01}
                ]
                best_model = None
                best_params = None
                best_score = float('-inf')
                cv_scores = []

                kf_indices = np.array_split(np.random.permutation(len(X_scaled)), 5)
                for params in param_combinations:
                    fold_scores = []
                    for i in range(5):
                        val_idx = kf_indices[i]
                        train_idx = np.concatenate([kf_indices[j] for j in range(5) if j != i])
                        X_fold_train, y_fold_train = X_scaled[train_idx], y[train_idx]
                        X_fold_val, y_fold_val = X_scaled[val_idx], y[val_idx]

                        nn_model = PyTorchNNWrapper(
                            input_size=X_scaled.shape[1],
                            hidden_size=params['hidden_size'],
                            hidden_layers=params['hidden_layers'],
                            lr=params['lr']
                        )
                        nn_model.fit(X_fold_train, y_fold_train)
                        y_pred = nn_model.predict(X_fold_val)
                        mse = mean_squared_error(y_fold_val, y_pred)
                        fold_scores.append(-mse)

                    avg_score = np.mean(fold_scores)
                    cv_scores.append(avg_score)
                    if avg_score > best_score:
                        best_score = avg_score
                        best_params = params

                # Train final NN model with best params on full data
                final_model = PyTorchNNWrapper(
                    input_size=X_scaled.shape[1],
                    hidden_size=best_params['hidden_size'],
                    hidden_layers=best_params['hidden_layers'],
                    lr=best_params['lr']
                )
                final_model.fit(X_scaled, y) # Train on the entire dataset
                self.model = final_model
                self.training_history["parameters"] = best_params
                self.training_history["cross_validation"] = {
                    "mean_test_score": -best_score,
                    "std_test_score": float(np.std([abs(s) for s in cv_scores]))
                }
                # Use the full dataset for final metric calculation for NN
                X_train_final, X_test_final, y_train_final, y_test_final = X_scaled, X_scaled, y, y

            else: # For sklearn models (RF, GB)
                grid_search = GridSearchCV(
                    model, param_grid, cv=5, scoring='neg_mean_squared_error', n_jobs=-1
                )
                grid_search.fit(X_scaled, y) # Fit on the entire dataset
                self.model = grid_search.best_estimator_
                self.training_history["parameters"] = grid_search.best_params_
                self.training_history["cross_validation"] = {
                    "mean_test_score": -float(grid_search.cv_results_["mean_test_score"][grid_search.best_index_]),
                    "std_test_score": float(grid_search.cv_results_["std_test_score"][grid_search.best_index_])
                }
                 # Use the full dataset for final metric calculation
                X_train_final, X_test_final, y_train_final, y_test_final = X_scaled, X_scaled, y, y

        elif validation_strategy == 'train_test_split':
            X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=test_size, random_state=42)
            if self.model_type == 'neural_network':
                 # Simple train for NN, no grid search here for simplicity
                 # Could add grid search on the train split if needed
                 nn_model = PyTorchNNWrapper(input_size=X_train.shape[1])
                 nn_model.fit(X_train, y_train)
                 self.model = nn_model
                 self.training_history["parameters"] = {} # Or store default params
            else:
                 # Fit sklearn model directly on train split
                 model.fit(X_train, y_train)
                 self.model = model
                 self.training_history["parameters"] = model.get_params() # Store actual params used

            # Use the held-out test set for metrics
            X_train_final, X_test_final, y_train_final, y_test_final = X_train, X_test, y_train, y_test
            self.training_history["cross_validation"] = {} # No CV results for train/test split

        else:
             raise ValueError(f"Unsupported validation strategy: {validation_strategy}")

        # --- Calculate Final Metrics ---
        # Use the appropriate test set based on validation strategy
        y_pred_final = self.predict(X_test_final) # Use predict method which handles scaling internally if needed
        mse = mean_squared_error(y_test_final, y_pred_final)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test_final, y_pred_final)
        r2 = r2_score(y_test_final, y_pred_final)

        self.training_history["metrics"] = {
            "mse": float(mse), "rmse": float(rmse), "mae": float(mae), "r2": float(r2)
        }
        self.training_history["validation_strategy"] = validation_strategy # Store strategy used

        # --- Feature Importances ---
        if hasattr(self.model, 'feature_importances_'): # Sklearn models
            importances = self.model.feature_importances_
            if self.feature_names:
                self.feature_importances = {name: float(imp) for name, imp in zip(self.feature_names, importances)}
            else:
                self.feature_importances = {f"feature_{i}": float(imp) for i, imp in enumerate(importances)}
        elif self.model_type == 'neural_network': # Placeholder for NN
             if self.feature_names:
                 self.feature_importances = {name: 1.0/len(self.feature_names) for name in self.feature_names}
             else:
                 self.feature_importances = {} # Cannot determine without feature names
        else:
             self.feature_importances = {}

        self.training_history["feature_importances"] = self.feature_importances

        # Update training date
        self.training_history["training_date"] = datetime.now().isoformat()

        # Return results
        results = {
            'model_type': self.model_type,
            'best_params': self.training_history["parameters"],
            'mse': mse, 'rmse': rmse, 'mae': mae, 'r2': r2,
            'validation_strategy': validation_strategy,
            # Return predictions/actuals from the appropriate test set
            'test_predictions': y_pred_final.tolist(),
            'test_actual': y_test_final.tolist()
        }
        return results


    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make predictions with the trained model. Handles scaling.
        """
        if self.model is None:
            raise ValueError("Model has not been trained yet")

        # Check if input X needs scaling
        # Simple check: if means/stds are very different from scaler's, assume not scaled
        needs_scaling = True
        if X.shape[1] == len(self.scaler.mean_):
             # Check if data might already be scaled (mean close to 0, std close to 1)
             # This is heuristic and might not always be correct
             if np.allclose(X.mean(axis=0), 0, atol=0.1) and np.allclose(X.std(axis=0), 1, atol=0.1):
                 needs_scaling = False
             # More robust: check against scaler's learned parameters
             elif np.allclose(X.mean(axis=0), self.scaler.mean_, atol=0.1) and \
                  np.allclose(X.std(axis=0), np.sqrt(self.scaler.var_), atol=0.1):
                  # This case is unlikely unless passing the exact training data back
                  needs_scaling = False # Assume it was scaled with this scaler

        X_to_predict = self.scaler.transform(X) if needs_scaling else X

        # Make predictions
        return self.model.predict(X_to_predict)

    def predict_with_explanations(self, X: np.ndarray) -> Tuple[np.ndarray, Optional[Dict]]:
        """
        Make predictions and provide feature contribution explanations.
        """
        if self.model is None:
            raise ValueError("Model has not been trained yet")

        # Get predictions (handles scaling)
        predictions = self.predict(X)

        # Provide feature contributions if available
        feature_contributions = None
        if self.feature_importances:
            sorted_importances = sorted(
                self.feature_importances.items(), key=lambda x: x[1], reverse=True
            )
            feature_contributions = {name: importance for name, importance in sorted_importances[:10]} # Top 10

        return predictions, feature_contributions

    def save_model(self, model_path: str = None) -> str:
        """
        Save the trained model and scaler to a file.
        """
        if self.model is None:
            raise ValueError("Model has not been trained yet")

        try:
            if model_path is None:
                model_path = settings.MODEL_STORAGE_PATH
            os.makedirs(model_path, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.model_type}_{timestamp}.pkl"
            filepath = os.path.join(model_path, filename)

            # Data to save
            save_data = {
                'scaler': self.scaler,
                'feature_names': self.feature_names,
                'feature_importances': self.feature_importances,
                'training_history': self.training_history # Includes model_type, params, metrics etc.
            }

            if self.model_type == 'neural_network':
                # Save PyTorch model state_dict and architecture info
                save_data['model_state_dict'] = self.model.model.state_dict()
                save_data['input_size'] = self.model.input_size
                # Get hidden size/layers from stored params if possible
                params = self.training_history.get("parameters", {})
                save_data['hidden_size'] = params.get("hidden_size", 50) # Default if not found
                save_data['hidden_layers'] = params.get("hidden_layers", 1) # Default if not found
            else:
                # Save sklearn model object directly
                save_data['model'] = self.model

            with open(filepath, 'wb') as f:
                pickle.dump(save_data, f)

            # Optionally save history as JSON too
            history_path = filepath.replace('.pkl', '_history.json')
            try:
                with open(history_path, 'w') as f:
                    # Convert numpy types for JSON serialization if necessary
                    serializable_history = json.loads(json.dumps(self.training_history, default=lambda x: str(x) if isinstance(x, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64, np.uint8, np.uint16, np.uint32, np.uint64, np.float_, np.float16, np.float32, np.float64)) else x))
                    json.dump(serializable_history, f, indent=2)
            except Exception as json_error:
                print(f"Warning: Could not save training history as JSON: {str(json_error)}")

            return filepath
        except Exception as e:
            error_msg = f"Error saving model: {str(e)}"
            print(error_msg)
            raise ValueError(error_msg)

    @classmethod
    def load_model(cls, model_path: str) -> 'OrganizationalPerformancePredictor':
        """
        Load a trained model from a file.
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")

        try:
            with open(model_path, 'rb') as f:
                model_data = pickle.load(f)

            if 'training_history' not in model_data or 'model_type' not in model_data['training_history']:
                raise ValueError("Invalid model file: missing training history or model type")

            model_type = model_data['training_history']['model_type']
            predictor = cls(model_type=model_type)

            # Load common components
            predictor.scaler = model_data.get('scaler', StandardScaler())
            predictor.feature_names = model_data.get('feature_names')
            predictor.feature_importances = model_data.get('feature_importances', {})
            predictor.training_history = model_data.get('training_history', {'model_type': model_type})

            # Load model based on type
            if model_type == 'neural_network':
                required_keys = ['input_size', 'hidden_size', 'hidden_layers', 'model_state_dict']
                if any(key not in model_data for key in required_keys):
                     raise ValueError(f"Invalid PyTorch model file: missing required keys")

                pytorch_model_wrapper = PyTorchNNWrapper(
                    input_size=model_data['input_size'],
                    hidden_size=model_data['hidden_size'],
                    hidden_layers=model_data['hidden_layers']
                )
                try:
                    pytorch_model_wrapper.model.load_state_dict(model_data['model_state_dict'])
                    pytorch_model_wrapper.model.eval()
                    predictor.model = pytorch_model_wrapper # Assign the wrapper
                except Exception as e:
                    raise ValueError(f"Error loading PyTorch model weights: {str(e)}")
            else: # Sklearn models
                if 'model' not in model_data:
                    raise ValueError("Invalid model file: missing sklearn model data")
                predictor.model = model_data['model']

            return predictor

        except Exception as e:
            error_msg = f"Error loading model from {model_path}: {str(e)}"
            print(error_msg)
            raise ValueError(error_msg)

    def evaluate_team_structure(self, team_data: pd.DataFrame) -> Dict:
        """
        Evaluate a team structure and provide insights on performance drivers.
        """
        if self.model is None:
            raise ValueError("Model has not been trained yet")

        # Ensure all required features are present, fill missing with mean/median or 0
        if self.feature_names:
            X_eval = pd.DataFrame(columns=self.feature_names) # Create df with correct columns
            for col in self.feature_names:
                 if col in team_data.columns:
                     X_eval[col] = team_data[col]
                 else:
                     # Fill missing features - using 0 might be okay, or use scaler's mean
                     X_eval[col] = self.scaler.mean_[self.feature_names.index(col)] if hasattr(self.scaler, 'mean_') else 0
            X = X_eval.values
        else:
             # Cannot proceed reliably without knowing expected features
             raise ValueError("Cannot evaluate without knowing the model's feature names")


        # Make predictions (handles scaling)
        predictions = self.predict(X)

        # Get feature insights
        insights = {}
        if self.feature_importances:
            sorted_features = sorted(self.feature_importances.items(), key=lambda x: x[1], reverse=True)
            insights['top_drivers'] = [{"feature": k, "importance": v} for k, v in sorted_features[:5]]

            # Basic comparison to average values (if scaler has means)
            if hasattr(self.scaler, 'mean_') and self.feature_names:
                 avg_values = dict(zip(self.feature_names, self.scaler.mean_))
                 unusual_values = {}
                 for feature in self.feature_names:
                     if feature in team_data.columns and feature in avg_values:
                         team_avg = team_data[feature].mean()
                         global_avg = avg_values[feature]
                         # Check if feature is important and value deviates significantly
                         # (Using std dev might be better than fixed threshold)
                         if self.feature_importances.get(feature, 0) > 0.02 and abs(team_avg - global_avg) > 0.5 * abs(global_avg): # Avoid division by zero
                             direction = "higher" if team_avg > global_avg else "lower"
                             unusual_values[feature] = {
                                 "team_value": float(team_avg),
                                 "global_avg": float(global_avg),
                                 "direction": direction,
                                 "impact": float(self.feature_importances.get(feature, 0))
                             }
                 insights['unusual_values'] = unusual_values

        return {
            'predictions': predictions.tolist(),
            'average_performance': float(np.mean(predictions)),
            'insights': insights
        }

    def get_training_history(self) -> Dict:
        """
        Get the training history.
        """
        return self.training_history

    def train_from_dataset(self, dataset_path: str, target_column: str,
                           feature_cols: List[str] = None,
                           validation_strategy: str = 'cross_validation') -> Dict: # Added validation_strategy
        """
        Train the model using a dataset file.
        """
        try:
            df = pd.read_csv(dataset_path)
            if target_column not in df.columns:
                raise ValueError(f"Target column '{target_column}' not found")

            if feature_cols:
                missing_cols = [col for col in feature_cols if col not in df.columns]
                if missing_cols:
                    raise ValueError(f"Feature columns not found: {missing_cols}")
                X_cols = feature_cols
            else:
                X_cols = df.select_dtypes(include=[np.number]).columns.tolist()
                if target_column in X_cols:
                    X_cols.remove(target_column)

            # Handle potential NaN values before training
            df = df.dropna(subset=[target_column]) # Drop rows where target is NaN
            df[X_cols] = df[X_cols].fillna(df[X_cols].median()) # Fill feature NaNs with median

            if df.empty:
                 raise ValueError("Dataset is empty after handling NaN values in target column.")


            X = df[X_cols].values
            y = df[target_column].values

            # Pass validation strategy to the train method
            return self.train(X, y, feature_names=X_cols, validation_strategy=validation_strategy)

        except Exception as e:
            raise ValueError(f"Error training model from dataset: {str(e)}")

    def analyze_dataset(self, dataset_path: str) -> Dict:
        """
        Analyze a dataset to suggest possible target variables and features.
        """
        try:
            df = pd.read_csv(dataset_path)
            num_rows, num_cols = df.shape
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist() # Include category type

            col_stats = {}
            for col in numeric_cols:
                 # Check for infinite values before calculating stats
                 if np.isinf(df[col]).any():
                      # Handle infinite values (e.g., replace with NaN or a large number)
                      # For simplicity, we'll skip stats for columns with inf values here
                      col_stats[col] = {'error': 'Contains infinite values'}
                      continue

                 col_stats[col] = {
                    'mean': float(df[col].mean()) if not df[col].isnull().all() else None,
                    'std': float(df[col].std()) if not df[col].isnull().all() else None,
                    'min': float(df[col].min()) if not df[col].isnull().all() else None,
                    'max': float(df[col].max()) if not df[col].isnull().all() else None,
                    'missing': int(df[col].isna().sum()),
                    'potential_target': bool(not df[col].isnull().all() and df[col].std() > 0 and df[col].isna().sum() < len(df) * 0.1)
                 }

            target_keywords = ['performance', 'score', 'rating', 'outcome', 'result', 'satisfaction', 'turnover', 'productivity', 'efficiency']
            potential_targets = [
                col for col in numeric_cols
                if col_stats.get(col) and col_stats[col].get('potential_target') # Check if stats exist and potential target is true
                   and any(keyword in col.lower() for keyword in target_keywords)
            ]

            # Calculate correlation matrix safely, handling potential errors
            try:
                corr_matrix = df[numeric_cols].corr().fillna(0).to_dict() # Fill NaN correlations with 0
            except Exception as corr_err:
                 print(f"Warning: Could not calculate correlation matrix: {corr_err}")
                 corr_matrix = {}


            return {
                'dataset_info': {
                    'rows': num_rows, 'columns': num_cols,
                    'numeric_columns': len(numeric_cols), 'categorical_columns': len(categorical_cols)
                },
                'numeric_columns': numeric_cols,
                'categorical_columns': categorical_cols,
                'column_stats': col_stats,
                'potential_targets': potential_targets,
                'correlation_matrix': corr_matrix
            }

        except Exception as e:
            raise ValueError(f"Error analyzing dataset: {str(e)}")