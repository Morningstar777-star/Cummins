from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.mongo_utils import serialize_mongo_documents


router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/my")
async def my_orders(user=Depends(get_current_user)):
    db = get_db()
    rows = await db.orders.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(length=200)
    return serialize_mongo_documents(rows)
