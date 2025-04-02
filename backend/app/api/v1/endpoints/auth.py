from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config.auth import create_access_token, get_password_hash, verify_password
from app.config.database import get_db
from app.config.settings import settings
from app.models.user import User

router = APIRouter()

@router.post("/login")
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    print(f"Generated token for user: {user.username}")
    return {
        "access_token": token,
        "token_type": "bearer",
    }

@router.post("/register", response_model=dict)
def register_user(
    *,
    db: Session = Depends(get_db),
    username: str,
    email: str,
    password: str,
    full_name: str = None,
) -> Any:
    """
    Register a new user
    """
    # Check if username already exists
    user = db.query(User).filter(User.username == username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="Username already registered",
        )

    # Check if email already exists
    user = db.query(User).filter(User.email == email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    # Create new user
    user = User(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        is_active=True,
        is_superuser=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"msg": "User registered successfully"}