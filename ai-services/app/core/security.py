# ===========================================
# SmartProperty AI - Security & Authentication
# ===========================================

from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings


# Security scheme
security = HTTPBearer()


class TokenPayload(BaseModel):
    """JWT token payload."""
    
    sub: str  # user_id
    email: Optional[str] = None
    role: Optional[str] = None
    exp: datetime
    iat: datetime


class CurrentUser(BaseModel):
    """Current authenticated user."""
    
    user_id: str
    email: Optional[str] = None
    role: Optional[str] = None


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenPayload:
    """
    Verify JWT token from Authorization header.
    
    Raises HTTPException if token is invalid.
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        
        return TokenPayload(
            sub=payload.get("sub"),
            email=payload.get("email"),
            role=payload.get("role"),
            exp=datetime.fromtimestamp(payload.get("exp")),
            iat=datetime.fromtimestamp(payload.get("iat")),
        )
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token: TokenPayload = Depends(verify_token)
) -> CurrentUser:
    """
    Get current user from verified token.
    """
    return CurrentUser(
        user_id=token.sub,
        email=token.email,
        role=token.role,
    )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
) -> Optional[CurrentUser]:
    """
    Get current user if token is provided, otherwise return None.
    
    Use for endpoints that work for both authenticated and anonymous users.
    """
    if credentials is None:
        return None
    
    try:
        token = await verify_token(credentials)
        return CurrentUser(
            user_id=token.sub,
            email=token.email,
            role=token.role,
        )
    except HTTPException:
        return None


def require_role(allowed_roles: list[str]):
    """
    Dependency to require specific roles.
    
    Usage:
        @router.get("/admin", dependencies=[Depends(require_role(["admin"]))])
    """
    async def role_checker(
        current_user: CurrentUser = Depends(get_current_user)
    ):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    
    return role_checker
