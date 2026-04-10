import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.mongo_utils import serialize_mongo_document, serialize_mongo_documents


router = APIRouter(prefix="/admin", tags=["admin"])


def _assert_admin(user):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/products")
async def create_product(payload: dict, user=Depends(get_current_user)):
    _assert_admin(user)
    db = get_db()
    sku = payload.get("sku")
    if not sku:
        raise HTTPException(status_code=400, detail="sku is required")

    existing = await db.products.find_one({"sku": sku})
    if existing:
        raise HTTPException(status_code=409, detail="Product with this sku already exists")

    payload.setdefault("is_active", True)
    payload.setdefault("stock", 0)
    payload.setdefault("description", "")
    payload.setdefault("media", {"image_url": "https://placehold.co/600x400?text=Product", "glb_url": ""})
    payload.setdefault(
        "attributes",
        {
            "aesthetic_style": "Modern",
            "mood_feel": "Serene & Calm",
            "price_tier": "premium",
            "dominant_colors": [],
            "materials": [],
        },
    )

    await db.products.insert_one(payload)
    return {"status": "created", "product": serialize_mongo_document(payload)}


@router.get("/products")
async def list_products(user=Depends(get_current_user)):
    _assert_admin(user)
    db = get_db()
    rows = await db.products.find({}).sort("sku", 1).to_list(length=500)
    return serialize_mongo_documents(rows)


@router.put("/products/{sku}")
async def update_product(sku: str, payload: dict, user=Depends(get_current_user)):
    _assert_admin(user)
    db = get_db()
    result = await db.products.update_one({"sku": sku}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    row = await db.products.find_one({"sku": sku})
    return {"status": "updated", "product": serialize_mongo_document(row)}


@router.patch("/products/{sku}/status")
async def update_product_status(sku: str, payload: dict, user=Depends(get_current_user)):
    _assert_admin(user)
    if "is_active" not in payload:
        raise HTTPException(status_code=400, detail="is_active is required")

    db = get_db()
    result = await db.products.update_one({"sku": sku}, {"$set": {"is_active": bool(payload["is_active"])}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    row = await db.products.find_one({"sku": sku})
    return {"status": "updated", "product": serialize_mongo_document(row)}


@router.post("/catalog/import-csv")
async def import_products_csv(file: UploadFile = File(...), user=Depends(get_current_user)):
    _assert_admin(user)

    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    rows = []
    errors = []
    for idx, row in enumerate(reader, start=2):
        try:
            rows.append(
                {
                    "sku": row["sku"],
                    "name": row["name"],
                    "description": row.get("description", ""),
                    "category_id": row["category_id"],
                    "price_inr": int(row["price_inr"]),
                    "stock": int(row.get("stock", 0)),
                    "is_active": True,
                    "media": {
                        "image_url": row.get("image_url", "https://placehold.co/600x400?text=Product"),
                        "glb_url": row.get("glb_url", ""),
                    },
                    "attributes": {
                        "aesthetic_style": row.get("aesthetic_style", "Modern"),
                        "mood_feel": row.get("mood_feel", "Serene & Calm"),
                        "price_tier": row.get("price_tier", "premium"),
                        "dominant_colors": [c.strip() for c in row.get("dominant_colors", "").split("|") if c.strip()],
                        "materials": [m.strip() for m in row.get("materials", "").split("|") if m.strip()],
                    },
                }
            )
        except Exception as exc:
            errors.append({"line": idx, "error": str(exc)})

    db = get_db()
    upserts = 0
    for row in rows:
        await db.products.update_one({"sku": row["sku"]}, {"$set": row}, upsert=True)
        upserts += 1

    return {"status": "ok", "upserts": upserts, "errors": errors}


@router.get("/orders")
async def admin_orders(user=Depends(get_current_user)):
    _assert_admin(user)
    db = get_db()
    rows = await db.orders.find({}).sort("created_at", -1).to_list(length=200)
    return serialize_mongo_documents(rows)


@router.get("/products/metrics")
async def product_metrics(user=Depends(get_current_user)):
    _assert_admin(user)
    db = get_db()
    products = await db.products.find({}).to_list(length=1000)
    orders = await db.orders.find({}).to_list(length=1000)

    sold_by_sku: dict[str, int] = {}
    revenue_by_sku: dict[str, int] = {}
    for order in orders:
        for item in order.get("items", []):
            sku = item.get("product_id")
            qty = int(item.get("qty", 0))
            line_total = int(item.get("price_snapshot_inr", 0)) * qty
            sold_by_sku[sku] = sold_by_sku.get(sku, 0) + qty
            revenue_by_sku[sku] = revenue_by_sku.get(sku, 0) + line_total

    result = []
    for product in products:
        sku = product.get("sku", "")
        result.append(
            {
                "sku": sku,
                "name": product.get("name", ""),
                "is_active": product.get("is_active", False),
                "stock": product.get("stock", 0),
                "sold_units": sold_by_sku.get(sku, 0),
                "revenue_inr": revenue_by_sku.get(sku, 0),
            }
        )

    return result


@router.get("/db-snapshot")
async def db_snapshot(user=Depends(get_current_user)):
    _assert_admin(user)
    db = get_db()

    users = await db.users.find({}, {"password_hash": 0}).to_list(length=100)
    preferences = await db.user_preferences.find({}).to_list(length=200)
    categories = await db.categories.find({}).to_list(length=50)
    products = await db.products.find({}).to_list(length=200)
    carts = await db.carts.find({}).to_list(length=200)
    orders = await db.orders.find({}).sort("created_at", -1).to_list(length=200)
    payments = await db.payments.find({}).sort("created_at", -1).to_list(length=200)

    return {
        "users": serialize_mongo_documents(users),
        "user_preferences": serialize_mongo_documents(preferences),
        "categories": serialize_mongo_documents(categories),
        "products": serialize_mongo_documents(products),
        "carts": serialize_mongo_documents(carts),
        "orders": serialize_mongo_documents(orders),
        "payments": serialize_mongo_documents(payments),
    }
