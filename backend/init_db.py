from app.models.base import Base
from app.models.user import User, UserProject
from app.models.organization import Organization, Department, Team, Employee, OrganizationSnapshot
from app.models.research import ResearchProject, Dataset, Model, Simulation, Publication, Citation
from app.config.database import engine
from app.config.auth import get_password_hash

def init_db():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Import needed modules
    from sqlalchemy.orm import Session
    from app.config.database import SessionLocal

    # Create a session
    db = SessionLocal()

    try:
        # Check if we already have users
        user = db.query(User).first()

        # Only create demo user if no users exist
        if not user:
            demo_user = User(
                username="demo",
                email="demo@example.com",
                full_name="Demo User",
                hashed_password=get_password_hash("demo123"),
                is_active=True,
                is_superuser=False
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            print("Created demo user")
        else:
            print("Database already contains users")
            demo_user = user

        # Create a demo project for testing
        if not db.query(ResearchProject).first():
            demo_project = ResearchProject(
                title="Organizational Network Analysis",
                description="Analyzing communication patterns and their impact on team performance",
                status="active",
                visibility="private"
            )
            db.add(demo_project)
            db.commit()
            db.refresh(demo_project)

            # Link demo user to project
            user_project = UserProject(
                user_id=demo_user.id,
                project_id=demo_project.id,
                role="owner"
            )
            db.add(user_project)
            db.commit()
            print("Created demo project")
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating database tables...")
    init_db()
    print("Database initialization complete")