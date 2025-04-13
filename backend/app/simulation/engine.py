import pandas as pd 
import numpy as np 
import networkx as nx 
import pickle 
import os 
import json 
from typing import Dict, List, Optional, Union 
from datetime import datetime 

from app.ml.predictor import OrganizationalPerformancePredictor 
from app.config.settings import settings 
from app.simulation.parameters import default_parameters

class OrganizationalSimulationEngine: 
    """ 
    Engine for simulating organizational dynamics over time. 
    """ 

    def __init__(self): 
        """ 
        Initialize simulation engine with default parameters. 
        """ 
        # Default simulation parameters 
        self.parameters = default_parameters.copy()

        # Simulation state 
        self.current_step = 0 
        self.org_data = {} 
        self.team_data = pd.DataFrame() 
        self.results = pd.DataFrame() 
        self.interventions = [] 

        # Initialize with empty state 
        self.organization_graph = nx.Graph() 

        # Load predictive model if specified in parameters 
        self.model = None 

    def set_parameters(self, parameters: Dict): 
        """ 
        Update simulation parameters. 

        Args: 
            parameters: Dictionary of parameter values 
        """ 
        # Update only the parameters that are provided 
        for key, value in parameters.items(): 
            if key in self.parameters: 
                self.parameters[key] = value 

        # Set random seed for reproducibility 
        np.random.seed(self.parameters.get("random_seed", 42)) 

        # Try to load model if specified 
        model_id = self.parameters.get("model_id") 
        if model_id: 
            self.load_model(model_id) 

    def load_model(self, model_id: Union[int, str]): 
        """ 
        Load a pre-trained model for simulation predictions. 

        Args: 
            model_id: ID of the model to load or path to model file 
        """ 
        try: 
            # If model_id is a path, use it directly 
            if isinstance(model_id, str) and os.path.exists(model_id): 
                model_path = model_id 
            else: 
                # Try to construct path based on model ID 
                model_storage_path = os.path.join(settings.MODEL_STORAGE_PATH, "models") 
                # Look for model files in the directory 
                model_files = [f for f in os.listdir(model_storage_path) if f.endswith('.pkl')] 
                # Find a match for model_id 
                for file in model_files: 
                    if f"_{model_id}_" in file or file.startswith(f"{model_id}_"): 
                        model_path = os.path.join(model_storage_path, file) 
                        break 
                else: 
                    raise FileNotFoundError(f"Model with ID {model_id} not found") 

            # Load the model 
            self.model = OrganizationalPerformancePredictor.load_model(model_path) 
            print(f"Loaded model from {model_path}") 

            # Update model_id parameter with actual model path 
            self.parameters["model_id"] = model_path 

        except Exception as e: 
            print(f"Error loading model: {str(e)}") 
            self.model = None 

    def initialize_organization(self): 
        """ 
        Initialize the organization structure based on parameters or real dataset.
        """ 
        # Check if we should initialize from a real dataset
        simulation_mode = self.parameters.get("simulation_mode", "synthetic")
        processed_dataset_id = self.parameters.get("processed_dataset_id")
        
        if simulation_mode == "real_data" and processed_dataset_id:
            try:
                # Import real data initializer here to avoid circular imports
                from app.simulation.real_data_initializer import initialize_from_dataset
                
                # Initialize from the real dataset
                init_data = initialize_from_dataset(processed_dataset_id, self.parameters)
                
                # Set simulation state from real data
                self.team_data = init_data["team_data"]
                self.organization_graph = init_data["organization_graph"]
                self.org_data = init_data["org_data"]
                self.results = init_data["results"]
                self.current_step = 0
                
                print(f"Initialized simulation from dataset {processed_dataset_id}")
                return
            except Exception as e:
                print(f"Error initializing from dataset: {str(e)}")
                print("Falling back to synthetic data generation")
        
        # If we get here, use synthetic data generation
        print("Initializing with synthetic data...")
        
        # Create organization graph
        team_size = self.parameters.get("team_size", 8)
        hierarchy_levels = self.parameters.get("hierarchy_levels", 3)
        communication_density = self.parameters.get("communication_density", 0.6)

        # Generate team-level data for simulation
        teams_data = []
        num_teams = max(5, int(hierarchy_levels * 3))

        for i in range(num_teams): 
            # Create team with random but reasonable values 
            team = { 
                "team_id": i + 1, 
                "team_name": f"Team_{i+1}", 
                "team_size": max(3, int(np.random.normal(team_size, 2))), 
                "avg_tenure": max(0.5, np.random.normal(3, 1.5)), # years 
                "hierarchy_levels": max(1, min(hierarchy_levels, np.random.randint(1, hierarchy_levels + 1))), 
                "communication_density": min(1.0, max(0.2, np.random.normal(communication_density, 0.1))), 
                "diversity_index": min(1.0, max(0, np.random.normal(0.6, 0.15))), 
                "avg_skill_level": min(10, max(1, np.random.normal(7, 1.5))), 
                "training_hours": np.random.randint(10, 40), 
                "manager_span": max(2, np.random.randint(3, 10)), 
                "performance": min(100, max(50, np.random.normal(75, 8))), 
                "innovation": min(100, max(40, np.random.normal(65, 12))), 
                "satisfaction": min(100, max(40, np.random.normal(70, 10))) 
            } 
            teams_data.append(team) 

        # Create DataFrame for team data 
        self.team_data = pd.DataFrame(teams_data) 

        # Generate organization graph based on teams 
        G = nx.Graph() 

        # Add team nodes 
        for _, team in self.team_data.iterrows(): 
            G.add_node(team["team_id"], 
                       type="team", 
                       name=team["team_name"], 
                       size=team["team_size"], 
                       performance=team["performance"]) 

        # Add connections between teams based on communication density 
        for i, team1 in self.team_data.iterrows(): 
            for j, team2 in self.team_data.iterrows(): 
                if i < j: # To avoid duplicates 
                    # Higher chance of connection for teams with higher communication density 
                    connection_prob = (team1["communication_density"] + team2["communication_density"]) / 2 
                    if np.random.random() < connection_prob: 
                        G.add_edge(team1["team_id"], team2["team_id"], 
                                   weight=np.random.uniform(0.1, 1.0)) 

        self.organization_graph = G 

        # Create initial results dataframe 
        results_data = [] 
        initial_result = { 
            "month": 0, 
            "turnover": 0, 
            "performance": self.team_data["performance"].mean(), 
            "innovation": self.team_data["innovation"].mean(), 
            "satisfaction": self.team_data["satisfaction"].mean(), 
            "communication_density": self.team_data["communication_density"].mean(), 
            "avg_team_size": self.team_data["team_size"].mean(), 
            "interventions": 0 
        } 
        results_data.append(initial_result) 
        self.results = pd.DataFrame(results_data) 

        # Reset current step 
        self.current_step = 0 

        # Organization metadata 
        self.org_data = { 
            "name": "Simulated Organization", 
            "total_employees": self.team_data["team_size"].sum(), 
            "num_teams": len(self.team_data), 
            "hierarchy_levels": self.parameters.get("hierarchy_levels", 3), 
            "simulation_start": datetime.now().isoformat() 
        } 

    def run_simulation(self, steps: int = 1, new_interventions: List[Dict] = None): 
        """ 
        Run simulation for a specified number of steps. 

        Args: 
            steps: Number of simulation steps to run 
            new_interventions: List of new interventions to apply 
        """ 
        if len(self.team_data) == 0: 
            raise ValueError("Organization not initialized. Call initialize_organization() first.") 

        # Add new interventions to the list 
        if new_interventions: 
            self.interventions.extend(new_interventions) 

        # Run specified number of steps 
        for _ in range(steps): 
            self.current_step += 1 

            # Get interventions for this step 
            step_interventions = [i for i in self.interventions if i.get("month") == self.current_step] 

            # Simulate the effects of each intervention 
            for intervention in step_interventions: 
                self._apply_intervention(intervention) 

            # Run the team dynamics simulation 
            self._simulate_team_dynamics(len(step_interventions) > 0) 

            # Record results 
            month_result = { 
                "month": self.current_step, 
                "turnover": self._calculate_turnover(), 
                "performance": self.team_data["performance"].mean(), 
                "innovation": self.team_data["innovation"].mean(), 
                "satisfaction": self.team_data["satisfaction"].mean(), 
                "communication_density": self.team_data["communication_density"].mean(), 
                "avg_team_size": self.team_data["team_size"].mean(), 
                "interventions": len(step_interventions) 
            } 

            # Add to results dataframe 
            self.results = pd.concat([self.results, pd.DataFrame([month_result])], ignore_index=True) 

    def _apply_intervention(self, intervention: Dict): 
        """ 
        Apply an intervention to the organization. 

        Args: 
            intervention: Dictionary with intervention details 
        """ 
        # Get intervention details 
        intervention_type = intervention.get("type", "") 
        intensity = intervention.get("intensity", 50) / 100 # Convert to 0-1 scale 
        target_teams = intervention.get("target_teams", []) 

        # Apply intervention based on type 
        if intervention_type == "communication": 
            # Improve communication density 
            self._apply_to_teams(target_teams, "communication_density", lambda x: min(1.0, x + intensity * 0.2)) 
            # Small boost to satisfaction 
            self._apply_to_teams(target_teams, "satisfaction", lambda x: min(100, x + intensity * 3)) 

        elif intervention_type == "training": 
            # Increase skill level 
            self._apply_to_teams(target_teams, "avg_skill_level", lambda x: min(10, x + intensity * 1)) 
            # Increase training hours 
            self._apply_to_teams(target_teams, "training_hours", lambda x: x + intensity * 10) 
            # Small boost to performance 
            self._apply_to_teams(target_teams, "performance", lambda x: min(100, x + intensity * 5)) 

        elif intervention_type == "reorganization": 
            # Adjust team size 
            self._apply_to_teams(target_teams, "team_size", lambda x: max(3, x + (np.random.random() - 0.3) * intensity * 5)) 
            # Temporary reduction in satisfaction 
            self._apply_to_teams(target_teams, "satisfaction", lambda x: max(40, x - intensity * 10)) 
            # Potential boost to innovation 
            self._apply_to_teams(target_teams, "innovation", lambda x: min(100, x + intensity * 10)) 
            # Change in communication density 
            self._apply_to_teams(target_teams, "communication_density", lambda x: min(1.0, max(0.2, x + (np.random.random() - 0.3) * intensity * 0.4))) 

        elif intervention_type == "leadership": 
            # Improve satisfaction 
            self._apply_to_teams(target_teams, "satisfaction", lambda x: min(100, x + intensity * 8)) 
            # Small boost to performance 
            self._apply_to_teams(target_teams, "performance", lambda x: min(100, x + intensity * 4)) 
            # Small increase in communication 
            self._apply_to_teams(target_teams, "communication_density", lambda x: min(1.0, x + intensity * 0.1)) 

    def _apply_to_teams(self, target_teams: List[int], attribute: str, update_function): 
        """ 
        Apply a function to an attribute for specified teams. 

        Args: 
            target_teams: List of team IDs to apply to (empty for all teams) 
            attribute: The attribute to update 
            update_function: Function that takes current value and returns new value 
        """ 
        # If no specific teams, apply to all 
        if not target_teams: 
            self.team_data[attribute] = self.team_data[attribute].apply(update_function) 
        else: 
            # Apply only to specified teams 
            for team_id in target_teams: 
                mask = self.team_data["team_id"] == team_id 
                if any(mask): 
                    self.team_data.loc[mask, attribute] = self.team_data.loc[mask, attribute].apply(update_function) 

    def _simulate_team_dynamics(self, has_interventions: bool = False): 
        """ 
        Simulate natural team dynamics for one time step. 

        Args: 
            has_interventions: Whether interventions were applied this step 
        """ 
        # Natural fluctuations in team metrics 
        for team_idx, _ in self.team_data.iterrows(): 
            # Apply random variations to performance 
            variation = np.random.normal(0, 2) # Small random variation 
            self.team_data.loc[team_idx, "performance"] = min(100, max(40, 
                self.team_data.loc[team_idx, "performance"] + variation)) 

            # Innovation varies more 
            innovation_var = np.random.normal(0, 3) 
            self.team_data.loc[team_idx, "innovation"] = min(100, max(30, 
                self.team_data.loc[team_idx, "innovation"] + innovation_var)) 

            # Satisfaction varies based on recent changes 
            satisfaction_var = np.random.normal(0, 2) 
            self.team_data.loc[team_idx, "satisfaction"] = min(100, max(30, 
                self.team_data.loc[team_idx, "satisfaction"] + satisfaction_var)) 

            # Communication density changes slowly 
            if not has_interventions: # Don't change if interventions were applied 
                comm_var = np.random.normal(0, 0.02) # Very small variation 
                self.team_data.loc[team_idx, "communication_density"] = min(1.0, max(0.1, 
                    self.team_data.loc[team_idx, "communication_density"] + comm_var)) 

            # Team size changes occasionally 
            if np.random.random() < 0.1: # 10% chance of team size change 
                size_change = np.random.choice([-1, 0, 1]) # -1, 0, or +1 
                self.team_data.loc[team_idx, "team_size"] = max(3, 
                    self.team_data.loc[team_idx, "team_size"] + size_change) 

            # Tenure increases naturally 
            self.team_data.loc[team_idx, "avg_tenure"] += 1/12 # Add one month 

        # If we have a trained model, use it for predictions 
        if self.model is not None: 
            try: 
                # Match feature names with model features 
                model_features = self.model.feature_names 
                if model_features: 
                    # Check which features we have in our team data 
                    available_features = [f for f in model_features if f in self.team_data.columns] 

                    if len(available_features) >= 0.7 * len(model_features): # If we have at least 70% of features 
                        # For missing features, add with zeros 
                        for feature in model_features: 
                            if feature not in self.team_data.columns: 
                                self.team_data[feature] = 0 

                        # Use model to predict performance 
                        evaluation = self.model.evaluate_team_structure(self.team_data) 
                        predicted_performances = evaluation["predictions"] 

                        # Update team performances based on model predictions, but maintain some randomness 
                        for team_idx, performance in enumerate(predicted_performances): 
                            if team_idx < len(self.team_data): 
                                # Blend current performance with predicted (70% predicted, 30% current) 
                                current_perf = self.team_data.loc[team_idx, "performance"] 
                                blended_perf = 0.7 * performance + 0.3 * current_perf 
                                # Add a small random component 
                                final_perf = min(100, max(40, blended_perf + np.random.normal(0, 2))) 
                                self.team_data.loc[team_idx, "performance"] = final_perf 
            except Exception as e: 
                print(f"Error using model for predictions: {str(e)}") 

    def _calculate_turnover(self) -> float: 
        """ 
        Calculate the current turnover rate. 

        Returns: 
            Calculated turnover rate 
        """ 
        base_turnover = self.parameters.get("turnover_rate", 0.05) # Annual rate 
        monthly_turnover = base_turnover / 12 # Convert to monthly 

        # Adjust for satisfaction - lower satisfaction = higher turnover 
        avg_satisfaction = self.team_data["satisfaction"].mean() 
        satisfaction_modifier = 1.5 - (avg_satisfaction / 100) # 1.5 at 0% satisfaction, 0.5 at 100% 

        return monthly_turnover * satisfaction_modifier 

    def get_summary_metrics(self) -> pd.DataFrame: 
        """ 
        Get summary metrics for all simulation steps. 

        Returns: 
            DataFrame with simulation results 
        """ 
        return self.results 

    def get_simulation_metadata(self) -> Dict: 
        """ 
        Get metadata about the current simulation. 

        Returns: 
            Dictionary with simulation metadata 
        """ 
        return { 
            "org_data": self.org_data, 
            "current_step": self.current_step, 
            "parameters": self.parameters, 
            "num_teams": len(self.team_data), 
            "model_info": { 
                "model_id": self.parameters.get("model_id"), 
                "model_type": self.model.model_type if self.model else None, 
                "feature_names": self.model.feature_names if self.model else None 
            } if self.model else {"model_id": None} 
        } 

    def save_simulation(self, file_path: str): 
        """ 
        Save the current simulation state to a file. 

        Args: 
            file_path: Path to save the simulation state 
        """ 
        # Create directory if it doesn't exist 
        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True) 

        # Don't save the model - just save the model_id 
        model_id = self.parameters.get("model_id") 
        model_temp = self.model 
        self.model = None 

        try: 
            with open(file_path, 'wb') as f: 
                pickle.dump({ 
                    "parameters": self.parameters, 
                    "current_step": self.current_step, 
                    "org_data": self.org_data, 
                    "team_data": self.team_data, 
                    "results": self.results, 
                    "interventions": self.interventions, 
                    "graph": self.organization_graph, 
                    "saved_at": datetime.now().isoformat() 
                }, f) 

            # Also save a JSON summary for easier access 
            summary_path = file_path.replace('.pkl', '_summary.json') 
            try: 
                with open(summary_path, 'w') as f: 
                    summary_data = { 
                        "parameters": self.parameters, 
                        "current_step": self.current_step, 
                        "org_data": self.org_data, 
                        "results": self.results.to_dict(orient="records") if not self.results.empty else [], 
                        "interventions": self.interventions, 
                        "saved_at": datetime.now().isoformat() 
                    } 
                    json.dump(summary_data, f, indent=2, default=str) 
            except Exception as json_error: 
                print(f"Warning: Could not save summary JSON: {str(json_error)}") 

        except Exception as e: 
            raise ValueError(f"Error saving simulation: {str(e)}") 
        finally: 
            # Restore the model 
            self.model = model_temp 
            if self.model is None and model_id: 
                # Try to reload the model 
                try: 
                    self.load_model(model_id) 
                except Exception as e: 
                    print(f"Warning: Could not reload model: {str(e)}") 

    @classmethod 
    def load_simulation(cls, file_path: str) -> 'OrganizationalSimulationEngine': 
        """ 
        Load a simulation state from a file. 

        Args: 
            file_path: Path to the saved simulation state 

        Returns: 
            Loaded simulation engine 
        """ 
        try: 
            with open(file_path, 'rb') as f: 
                data = pickle.load(f) 

            # Create new engine 
            engine = cls() 

            # Load state 
            engine.parameters = data.get("parameters", engine.parameters) 
            engine.current_step = data.get("current_step", 0) 
            engine.org_data = data.get("org_data", {}) 
            engine.team_data = data.get("team_data", pd.DataFrame()) 
            engine.results = data.get("results", pd.DataFrame()) 
            engine.interventions = data.get("interventions", []) 
            engine.organization_graph = data.get("graph", nx.Graph()) 

            # Load model if specified in parameters 
            model_id = engine.parameters.get("model_id") 
            if model_id: 
                try: 
                    engine.load_model(model_id) 
                except Exception as e: 
                    print(f"Warning: Could not load model: {str(e)}") 

            return engine 

        except Exception as e: 
            raise ValueError(f"Error loading simulation from {file_path}: {str(e)}")