import re

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.mongo_utils import serialize_mongo_document
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.common import LoginRequest, ProfileUpdateRequest, RegisterRequest, TokenResponse
from app.services.personalization import budget_tier_for_value


router = APIRouter(prefix="/auth", tags=["auth"])


_BUDGET_VALUE_BY_LABEL = {
    "Budget": 200,
    "Standard": 500,
    "Premium": 5000,
    "Luxury": 7000,
}


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest):
    db = get_db()
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_doc = {
        "_id": payload.email.lower(),
        "name": payload.name,
        "email": payload.email.lower(),
        "phone": payload.phone,
        "password_hash": hash_password(payload.password),
        "role": "customer",
    }
    await db.users.insert_one(user_doc)

    token = create_access_token(subject=user_doc["_id"])
    return TokenResponse(access_token=token, role=user_doc["role"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    db = get_db()
    user = None

    if payload.email:
        user = await db.users.find_one({"email": payload.email.lower()})

    if not user and payload.identifier:
        ident = payload.identifier.strip()
        user = await db.users.find_one({"email": ident.lower()})

        if not user:
            user = await db.users.find_one({
                "name": {"$regex": f"^{re.escape(ident)}$", "$options": "i"}
            })

        if not user:
            user = await db.users.find_one({"phone": ident})

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=user["_id"])
    return TokenResponse(access_token=token, role=user["role"])


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    safe_user = dict(user)
    safe_user.pop("password_hash", None)
    return {"valid": True, "user": serialize_mongo_document(safe_user)}


@router.put("/profile")
async def update_profile(payload: ProfileUpdateRequest, user=Depends(get_current_user)):
    db = get_db()

    user_updates = {}
    if payload.aesthetic_style is not None:
        user_updates["aesthetic_style"] = payload.aesthetic_style
    if payload.mood_feel is not None:
        user_updates["mood_feel"] = payload.mood_feel
    if payload.budget is not None:
        user_updates["budget"] = payload.budget
    if payload.project is not None:
        user_updates["project"] = payload.project

    if user_updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": user_updates})

    preference_updates = {}
    if payload.aesthetic_style is not None:
        preference_updates["aesthetic_style"] = payload.aesthetic_style
    if payload.mood_feel is not None:
        preference_updates["mood_feel"] = payload.mood_feel
    if payload.budget is not None:
        budget_value = _BUDGET_VALUE_BY_LABEL[payload.budget]
        preference_updates["budget_value"] = budget_value
        preference_updates["budget_tier"] = budget_tier_for_value(budget_value)
        preference_updates["budget_label"] = payload.budget
    if payload.project is not None:
        preference_updates["extra_preferences"] = payload.project

    if preference_updates:
        preference_updates["user_id"] = user["_id"]
        await db.user_preferences.update_one(
            {"user_id": user["_id"]},
            {"$set": preference_updates},
            upsert=True,
        )

    refreshed_user = await db.users.find_one({"_id": user["_id"]})
    safe_user = dict(refreshed_user or user)
    safe_user.pop("password_hash", None)

    return {
        "message": "Profile updated successfully",
        "user": serialize_mongo_document(
            {
                "id": safe_user.get("_id"),
                "username": safe_user.get("name"),
                "email": safe_user.get("email"),
                "aesthetic_style": safe_user.get("aesthetic_style"),
                "mood_feel": safe_user.get("mood_feel"),
                "budget": safe_user.get("budget"),
                "project": safe_user.get("project"),
            }
        ),
    }
