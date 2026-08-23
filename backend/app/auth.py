"""Authentication endpoints using Supabase."""
import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_PROJECT_URL", "")
    key = os.getenv("SUPABASE_ANON_KEY", "")
    if not url or not key:
        raise RuntimeError("Supabase credentials not configured")
    return create_client(url, key)


# ── Pydantic models ───────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    token: str


class UsernameCheckRequest(BaseModel):
    username: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/health")
async def auth_health():
    return {"status": "ok", "service": "auth"}


@router.post("/check-username")
async def check_username(body: UsernameCheckRequest):
    """Check if a username is already taken in the profiles table."""
    supabase = get_supabase()
    try:
        result = (
            supabase.table("profiles")
            .select("id")
            .eq("username", body.username.lower())
            .maybe_single()
            .execute()
        )
        taken = result.data is not None
        return {"available": not taken, "username": body.username}
    except Exception as e:
        logger.error("Username check error: %s", e)
        # If profiles table doesn't exist yet, username is available
        return {"available": True, "username": body.username}


@router.post("/signup")
async def signup(body: SignupRequest):
    """Register a new user via Supabase Auth."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {"username": body.username.lower()}
            },
        })
        if resp.user is None:
            raise HTTPException(status_code=400, detail="Signup failed — check your credentials")
        return {
            "message": "Signup successful. Check your email for the verification OTP.",
            "user_id": str(resp.user.id),
            "email": resp.user.email,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Signup error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify-otp")
async def verify_otp(body: OtpVerifyRequest):
    """Verify the 6-digit OTP sent to the user's email after signup."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.verify_otp({
            "email": body.email,
            "token": body.token,
            "type": "signup",
        })
        if resp.user is None:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        return {
            "message": "Email verified successfully",
            "access_token": resp.session.access_token if resp.session else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("OTP verify error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: LoginRequest):
    """Sign in with email + password."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
        if resp.user is None or resp.session is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {
            "access_token": resp.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": str(resp.user.id),
                "email": resp.user.email,
                "username": resp.user.user_metadata.get("username"),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login error: %s", e)
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.post("/logout")
async def logout():
    """Sign out — client should also call supabase.auth.signOut()."""
    return {"message": "Logged out. Please clear your local session."}
