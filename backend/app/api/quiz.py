from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.mongo_utils import serialize_mongo_document
from app.schemas.common import QuizSubmitRequest
from app.services.personalization import budget_tier_for_value


router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.get("/questions")
async def quiz_questions():
    db = get_db()
    config = await db.quiz_configs.find_one({})
    return serialize_mongo_document(config)


@router.post("/submit")
async def submit_quiz(payload: QuizSubmitRequest, user=Depends(get_current_user)):
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
    return {"status": "ok", "preferences": pref_doc}
