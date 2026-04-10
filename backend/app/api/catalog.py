import re

from fastapi import APIRouter, Depends
from typing import Any

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.mongo_utils import serialize_mongo_document, serialize_mongo_documents
from app.services.personalization import budget_tier_for_value, score_product


router = APIRouter(tags=["catalog"])


CATEGORY_FALLBACKS: dict[str, dict[str, str]] = {
    "living-room": {
        "title": "Living Room",
        "glb_url": "gray_sofa.glb",
        "thumbnail_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
    },
    "bedroom": {
        "title": "Bedroom",
        "glb_url": "bed_06.glb",
        "thumbnail_url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600",
    },
    "kitchen": {
        "title": "Kitchen",
        "glb_url": "low_poly_toaster_red.glb",
        "thumbnail_url": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600",
    },
    "decor": {
        "title": "Decor",
        "glb_url": "disco_ball.glb",
        "thumbnail_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
    },
    "classroom": {
        "title": "Classroom",
        "glb_url": "whiteboard_low-poly.glb",
        "thumbnail_url": "https://github.com/Morningstar777-star/Images/blob/main/classroom-interior-with-school-desks-chairs-and-green-board-empty-school-classroom-photo.webp",
    },
}

CATEGORY_PRIORITY = ["living-room", "bedroom", "kitchen", "decor", "classroom"]


def _normalize_category_id(value: Any) -> str:
    return str(value or "").strip().lower().replace("_", "-").replace(" ", "-")


def _title_from_category_id(category_id: str) -> str:
    return category_id.replace("-", " ").title() or "Category"


def _build_fallback_category(category_id: str) -> dict[str, Any]:
    known = CATEGORY_FALLBACKS.get(category_id, {})
    return {
        "id": category_id,
        "title": known.get("title", _title_from_category_id(category_id)),
        "glb_url": known.get("glb_url", ""),
        "thumbnail_url": known.get("thumbnail_url", "https://placehold.co/600x600/F4E8D6/6B5B4C?text=Category"),
    }


def _category_sort_key(category_id: str) -> tuple[int, str]:
    try:
        return (CATEGORY_PRIORITY.index(category_id), category_id)
    except ValueError:
        return (len(CATEGORY_PRIORITY), category_id)


def _category_filter_variants(category_id: str) -> list[str]:
    normalized = _normalize_category_id(category_id)
    if not normalized:
        return []

    variants = {
        normalized,
        normalized.replace("-", " "),
        normalized.replace("-", "_"),
        normalized.replace("-", ""),
    }
    return sorted(v for v in variants if v)


def _category_or_filters(category_id: str) -> list[dict[str, Any]]:
    filters: list[dict[str, Any]] = []
    for value in _category_filter_variants(category_id):
        pattern = f"^{re.escape(value)}$"
        filters.append({"category_id": {"$regex": pattern, "$options": "i"}})
        filters.append({"Category": {"$regex": pattern, "$options": "i"}})
    return filters


def _to_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, bool):
        return default
    text = str(value).strip()
    if not text:
        return default
    try:
        return int(float(text))
    except (TypeError, ValueError):
        return default


def _parse_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    text = str(value or "").strip()
    if not text:
        return []
    return [part.strip() for part in re.split(r"[|,]", text) if part.strip()]


def _normalize_image_url(url: Any) -> str:
    text = str(url or "").strip()
    if not text:
        return ""
    if "github.com" in text and "/blob/" in text:
        return text.replace("https://github.com/", "https://raw.githubusercontent.com/").replace("/blob/", "/")
    return text


def _is_active_product(row: dict[str, Any]) -> bool:
    raw = row.get("is_active", True)
    if isinstance(raw, bool):
        return raw

    text = str(raw).strip().lower()
    return text not in {"false", "0", "no", "inactive", "off"}


def _normalize_product_document(row: dict[str, Any]) -> dict[str, Any]:
    media = row.get("media") if isinstance(row.get("media"), dict) else {}
    price_inr = _to_int(row.get("price_inr"), _to_int(row.get("price"), 0))
    category_id = _normalize_category_id(row.get("category_id") or row.get("Category") or row.get("category"))

    image_url = _normalize_image_url(
        media.get("image_url")
        or row.get("image_url")
        or row.get("thumbnail_url")
        or row.get("link")
    )

    attributes = row.get("attributes") if isinstance(row.get("attributes"), dict) else {}
    dominant_colors = attributes.get("dominant_colors") or _parse_list(row.get("Dominant Colors") or row.get("Color Palette"))
    materials = attributes.get("materials") or _parse_list(row.get("materials"))

    normalized = {
        **row,
        "sku": str(row.get("sku") or f"AUTO_{row.get('id') or ''}").strip() or "AUTO_UNKNOWN",
        "name": str(row.get("name") or row.get("product_name") or row.get("Primary Object") or "").strip() or "Untitled Product",
        "description": str(row.get("description") or row.get("Object Definition") or "").strip(),
        "category_id": category_id,
        "price_inr": price_inr,
        "stock": _to_int(row.get("stock"), 0),
        "is_active": _is_active_product(row),
        "media": {
            "image_url": image_url or "https://placehold.co/600x400/F4E8D6/6B5B4C?text=Product",
            "glb_url": str(media.get("glb_url") or row.get("glb_url") or "").strip(),
        },
        "attributes": {
            "aesthetic_style": str(attributes.get("aesthetic_style") or row.get("Aesthetic Style") or "").strip(),
            "mood_feel": str(attributes.get("mood_feel") or row.get("Mood & Feel") or "").strip(),
            "price_tier": str(attributes.get("price_tier") or row.get("Price Tier") or budget_tier_for_value(price_inr)).strip().lower(),
            "dominant_colors": dominant_colors,
            "materials": materials,
        },
    }

    if not normalized["category_id"]:
        normalized["category_id"] = "uncategorized"

    return normalized


async def _load_categories_with_fallbacks(db) -> list[dict[str, Any]]:
    rows = await db.categories.find({}).sort("id", 1).to_list(length=200)
    category_map: dict[str, dict[str, Any]] = {}

    for row in rows:
        category_id = _normalize_category_id(row.get("id"))
        if not category_id:
            continue

        fallback = _build_fallback_category(category_id)
        merged = {**fallback, **row}
        merged["id"] = category_id
        if not merged.get("title"):
            merged["title"] = fallback["title"]
        if not merged.get("thumbnail_url"):
            merged["thumbnail_url"] = fallback["thumbnail_url"]
        category_map[category_id] = merged

    active_category_ids = await db.products.distinct("category_id", {})
    legacy_category_ids = await db.products.distinct("Category", {})
    for raw_id in [*active_category_ids, *legacy_category_ids]:
        category_id = _normalize_category_id(raw_id)
        if not category_id:
            continue
        if category_id not in category_map:
            category_map[category_id] = _build_fallback_category(category_id)

    ordered_ids = sorted(category_map.keys(), key=_category_sort_key)
    return [category_map[category_id] for category_id in ordered_ids]


@router.get("/products")
async def list_all_products(_user=Depends(get_current_user)):
    db = get_db()
    rows = await db.products.find({}).sort("sku", 1).to_list(length=2000)
    normalized_rows = [_normalize_product_document(row) for row in rows]
    active_rows = [row for row in normalized_rows if row.get("is_active")]
    return serialize_mongo_documents(active_rows)


@router.get("/categories")
async def list_categories(_user=Depends(get_current_user)):
    db = get_db()
    rows = await _load_categories_with_fallbacks(db)
    return serialize_mongo_documents(rows)


@router.get("/categories/{category_id}/products")
async def products_by_category(category_id: str, _user=Depends(get_current_user)):
    db = get_db()
    category_filters = _category_or_filters(category_id)
    if not category_filters:
        return []

    rows = await db.products.find({"$or": category_filters}).to_list(length=1000)
    normalized_rows = [_normalize_product_document(row) for row in rows]
    active_rows = [row for row in normalized_rows if row.get("is_active")]
    return serialize_mongo_documents(active_rows)


@router.get("/products/{sku}")
async def get_product(sku: str, _user=Depends(get_current_user)):
    db = get_db()
    row = await db.products.find_one({"sku": sku})
    return serialize_mongo_document(_normalize_product_document(row) if row else None)


@router.get("/home/personalized")
async def personalized_home(user=Depends(get_current_user)):
    db = get_db()
    pref = await db.user_preferences.find_one({"user_id": user["_id"]}) or {}
    categories = await _load_categories_with_fallbacks(db)
    raw_products = await db.products.find({}).to_list(length=1000)
    products = [_normalize_product_document(row) for row in raw_products]
    products = [row for row in products if row.get("is_active")]

    ranked = sorted(products, key=lambda p: score_product(p, pref), reverse=True)
    for p in ranked:
        p["personalization_score"] = score_product(p, pref)

    return {
        "brand": {
            "name": "Olive & Oak",
            "tagline": "Design that feels like home.",
        },
        "preferences": serialize_mongo_document(pref),
        "glb_objects": serialize_mongo_documents(categories),
        "products": serialize_mongo_documents(ranked[:20]),
    }
