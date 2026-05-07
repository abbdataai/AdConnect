"""APIRouter for /api/auth/login + /api/auth/logout (slice 3 — promoted from main.py).

Mirrors slice-1's portal_routes.py extraction pattern. No lifespan needed
(JWT is stateless; no background task).
"""
import logging
from typing import Literal, Union

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from auth import DEMO_ACCOUNTS, mint_token

log = logging.getLogger("auth")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginUser(BaseModel):
    email: str
    name: str
    role: Literal["admin", "advertiser", "viewer"]


class LoginOk(BaseModel):
    ok: Literal[True] = True
    token: str
    user: LoginUser


class LoginFail(BaseModel):
    ok: Literal[False] = False
    message: str


@auth_router.post("/login", response_model=Union[LoginOk, LoginFail])
def login(body: LoginRequest):
    record = DEMO_ACCOUNTS.get(body.email.lower().strip())
    if not record or record[0] != body.password:
        log.warning(
            "auth_login_failed",
            extra={
                "event_type": "auth_login_failed",
                "email_prefix": body.email[:3],
            },
        )
        return LoginFail(message="Email ou senha incorretos.")
    _, name, role = record
    token = mint_token(sub=body.email, name=name, role=role)
    log.info(
        "auth_login_ok",
        extra={"event_type": "auth_login_ok", "role": role},
    )
    return LoginOk(
        token=token,
        user=LoginUser(email=body.email, name=name, role=role),
    )


@auth_router.post("/logout")
def logout():
    return {"ok": True}
