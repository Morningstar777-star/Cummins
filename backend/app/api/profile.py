from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.mongo_utils import serialize_mongo_document
from app.schemas.common import QuizSubmitRequest
from app.services.personalization import budget_tier_for_value


router = APIRouter(prefix="/me", tags=["profile"])


@router.get("")
async def get_me(user=Depends(get_current_user)):
    safe_user = dict(user)
    safe_user.pop("password_hash", None)
    return serialize_mongo_document(safe_user)


@router.get("/preferences")
async def get_preferences(user=Depends(get_current_user)):
    db = get_db()
    pref = await db.user_preferences.find_one({"user_id": user["_id"]}) or {}
    return serialize_mongo_document(pref)


@router.put("/preferences")
async def update_preferences(payload: QuizSubmitRequest, user=Depends(get_current_user)):
    db = get_db()
    pref_doc = {
        "user_id": user["_id"],
        "aesthetic_style": payload.aesthetic_style,
        "mood_feel": payload.mood_feel,
        "budget_value": payload.budget_value,
        "budget_tier": budget_tier_for_value(payload.budget_value),
        "extra_preferences": payload.extra_preferences,
    }
    await db.user_preferences.update_one({"user_id": user["_id"]}, {"$set": pref_doc}, upsert=True)
    updated = await db.user_preferences.find_one({"user_id": user["_id"]})
    return serialize_mongo_document(updated)
