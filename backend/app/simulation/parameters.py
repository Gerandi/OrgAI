# Default simulation parameters
default_parameters = {
    "team_size": 8,
    "hierarchy_levels": 3,
    "communication_density": 0.6,
    "turnover_rate": 0.05,  # 5% annual turnover
    "training_frequency": "quarterly",
    "simulation_duration": 12,  # months
    "random_seed": 42,
    "model_id": None,  # Will use a loaded model if specified
    "processed_dataset_id": None,  # Dataset ID to initialize from real data
    "simulation_mode": "synthetic"  # 'synthetic' or 'real_data'
}