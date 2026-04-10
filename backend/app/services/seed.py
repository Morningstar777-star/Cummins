from app.models.seed_data import GLB_CATEGORIES, PRODUCTS, QUIZ_CONFIG
from app.core.config import settings
from app.core.security import hash_password


async def ensure_seed_data(db) -> None:
    if settings.demo_seed_enabled:
        await db.quiz_configs.replace_one({"_id": "default_quiz"}, {"_id": "default_quiz", **QUIZ_CONFIG}, upsert=True)

        for category in GLB_CATEGORIES:
            await db.categories.update_one({"id": category["id"]}, {"$set": category}, upsert=True)

        for product in PRODUCTS:
            await db.products.update_one({"sku": product["sku"]}, {"$set": product}, upsert=True)

    if settings.admin_bootstrap_enabled:
        admin_email = settings.admin_bootstrap_email.lower()
        admin = await db.users.find_one({"email": admin_email})
        if not admin:
            await db.users.insert_one(
                {
                    "_id": admin_email,
                    "name": "Admin",
                    "email": admin_email,
                    "phone": "0000000000",
                    "password_hash": hash_password(settings.admin_bootstrap_password),
                    "role": "admin",
                }
            )
