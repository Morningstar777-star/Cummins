from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


client: AsyncIOMotorClient[Any] | None = None
_db: AsyncIOMotorDatabase[Any] | None = None


async def connect_db() -> None:
    global client, _db
    client = AsyncIOMotorClient(settings.mongodb_uri)
    _db = client[settings.mongodb_db_name]


async def ensure_indexes() -> None:
    db = get_db()

    await db.users.create_index("email", unique=True)
    await db.products.create_index("sku", unique=True)
    await db.categories.create_index("id", unique=True)
    await db.user_preferences.create_index("user_id", unique=True)
    await db.orders.create_index([("user_id", 1), ("created_at", -1)])
    await db.payments.create_index("payment_id", unique=True)
    await db.chat_messages.create_index([("user_id", 1), ("_id", -1)])


async def close_db() -> None:
    global client, _db
    if client:
        client.close()
    client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase[Any]:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


async def is_db_ready() -> bool:
    if _db is None:
        return False

    try:
        await _db.command("ping")
        return True
    except Exception:
        return False
