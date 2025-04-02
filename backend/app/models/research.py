from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

class ResearchProject(BaseModel):
    """Research project model for collaborative research"""
    __tablename__ = "research_projects"

    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="active") # active, completed, archived
    visibility = Column(String, default="private") # private, organization, public

    organization_id = Column(Integer, ForeignKey("organizations.id"))
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True) # Research can be org-level or team-level
    # Relationships
    users = relationship("UserProject", back_populates="project")
    organization = relationship("Organization", back_populates="research_projects")
    team = relationship("Team", back_populates="research_projects")
    datasets = relationship("Dataset", back_populates="project")
    models = relationship("Model", back_populates="project")
    simulations = relationship("Simulation", back_populates="project")
    publications = relationship("Publication", back_populates="project")

class Dataset(BaseModel):
    """Dataset model for research projects"""
    __tablename__ = "datasets"

    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("research_projects.id"))
    file_path = Column(String) # Path to stored dataset file
    format = Column(String) # csv, json, etc.
    size_bytes = Column(Integer)
    record_count = Column(Integer)

    # Dataset metadata
    source = Column(String, nullable=True)
    date_collected = Column(DateTime, nullable=True)
    is_anonymized = Column(Boolean, default=False)
    dataset_type = Column(String, default='custom') # Added for easier identification

    # Sharing settings
    is_shared = Column(Boolean, default=False)
    license = Column(String, nullable=True)

    # Relationships
    project = relationship("ResearchProject", back_populates="datasets")

class Model(BaseModel):
    """ML model for research projects"""
    __tablename__ = "models"

    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("research_projects.id"))
    model_type = Column(String) # random_forest, neural_network, etc.
    file_path = Column(String) # Path to stored model file
    version = Column(String, default="1.0.0")

    # Model performance metrics
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    r2_score = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)

    # Training details
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    training_date = Column(DateTime, nullable=True)
    parameters = Column(String, nullable=True) # JSON string of hyperparameters

    # Sharing settings
    is_shared = Column(Boolean, default=False)
    license = Column(String, nullable=True)

    # Relationships
    project = relationship("ResearchProject", back_populates="models")
    dataset = relationship("Dataset")

class Simulation(BaseModel):
    """Simulation for research projects"""
    __tablename__ = "simulations"

    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("research_projects.id"))
    simulation_type = Column(String) # agent_based, system_dynamics, etc.

    # Simulation parameters
    parameters = Column(String, nullable=True) # JSON string of parameters
    steps = Column(Integer, default=24)

    # Results
    results_path = Column(String, nullable=True) # Path to stored results file
    summary = Column(String, nullable=True) # JSON string of summary statistics

    # Relationships
    project = relationship("ResearchProject", back_populates="simulations")

class Publication(BaseModel):
    """Academic publication from research projects"""
    __tablename__ = "publications"

    title = Column(String, index=True)
    abstract = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("research_projects.id"))
    authors = Column(String) # Comma-separated list of authors

    # Publication details
    publication_type = Column(String, default="conference") # conference, journal, preprint
    venue = Column(String, nullable=True) # Conference/journal name
    publication_date = Column(DateTime, nullable=True)
    doi = Column(String, nullable=True) # Digital Object Identifier
    url = Column(String, nullable=True)

    # Publication file
    file_path = Column(String, nullable=True) # Path to stored publication file

    # Relationships
    project = relationship("ResearchProject", back_populates="publications")

class Citation(BaseModel):
    """Citation tracking for datasets, models and publications"""
    __tablename__ = "citations"

    # Citation target (what is being cited)
    publication_id = Column(Integer, ForeignKey("publications.id"), nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=True)

    # Citation information
    citing_title = Column(String)
    citing_authors = Column(String)
    citing_venue = Column(String, nullable=True)
    citing_date = Column(DateTime, nullable=True)
    citing_url = Column(String, nullable=True)