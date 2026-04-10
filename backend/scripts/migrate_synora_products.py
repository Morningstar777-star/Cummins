import os
import re
from typing import Any

from pymongo import MongoClient, UpdateOne


MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    "mongodb+srv://patilyashraj777_db_user:WBHh6tX2nP6BxtPH@cluster0.dvyl27d.mongodb.net/?appName=Cluster0",
)

SOURCE_DB = "synora_database"
TARGET_DB = "olive_oak"
SOURCE_COLLECTION = "products"
TARGET_COLLECTION = "products"
RESET_PREVIOUS_SOURCE_IMPORT = True

ALLOWED_STYLES = {
    "Minimalist",
    "Modern",
    "Industrial",
    "Maximalist",
    "Traditional",
    "Art Deco",
    "Cottagecore",
}
ALLOWED_MOODS = {
    "Cosy & Inviting",
    "Sleek & Modern",
    "Serene & Calm",
    "Rustic & Warm",
    "Luxurious & Opulent",
    "Natural & Organic",
}
ALLOWED_PRICE_TIERS = {"cheap", "medium", "premium", "luxury"}


def normalize_category(value: str) -> str:
    if not value:
        return "decor"
    cleaned = value.strip().lower().replace("&", "and")
    cleaned = cleaned.replace("_", "-")
    cleaned = re.sub(r"\s+", "-", cleaned)

    category_aliases = {
        "ketchen": "kitchen",
        "kitchen": "kitchen",
        "hall-room": "living-room",
        "hallroom": "living-room",
        "party-product": "decor",
        "party": "decor",
        "living-room": "living-room",
        "livingroom": "living-room",
        "bed-room": "bedroom",
        "bedroom": "bedroom",
        "decor": "decor",
    }
    if cleaned in category_aliases:
        return category_aliases[cleaned]

    return cleaned


def split_csv(value: str) -> list[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


def normalize_link(url: str) -> str:
    if not url:
        return "https://placehold.co/600x400?text=Product"

    # Convert github blob links to raw URLs for direct image rendering
    if "github.com" in url and "/blob/" in url:
        url = url.replace("https://github.com/", "https://raw.githubusercontent.com/")
        url = url.replace("/blob/", "/")
    return url


def map_style(style: str) -> str:
    style = (style or "").strip()
    if style in ALLOWED_STYLES:
        return style
    if style.lower() == "vintage":
        return "Art Deco"
    return "Modern"


def map_mood(mood: str) -> str:
    mood = (mood or "").strip()
    if mood in ALLOWED_MOODS:
        return mood
    return "Serene & Calm"


def map_tier(tier: str, price: int) -> str:
    t = (tier or "").strip().lower()
    if t in ALLOWED_PRICE_TIERS:
        return t
    if price <= 1000:
        return "cheap"
    if price <= 3000:
        return "medium"
    if price <= 8000:
        return "premium"
    return "luxury"


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except Exception:
        return default


def build_target_doc(source: dict[str, Any]) -> dict[str, Any]:
    source_id = source.get("ID")
    source_object_id = str(source.get("_id"))
    sku = f"SYN-{source_object_id}"

    name = source.get("Product Name") or source.get("Primary Object") or "Unnamed Product"
    description = source.get("Object Definition") or ""
    category = normalize_category(source.get("Category", "decor"))
    price = to_int(source.get("price"), default=0)

    aesthetic = map_style(source.get("Aesthetic Style", "Modern"))
    mood = map_mood(source.get("Mood & Feel", "Serene & Calm"))
    price_tier = map_tier(source.get("Price Tier", ""), price)

    dominant_colors = split_csv(source.get("Dominant Colors", ""))
    color_palette = split_csv(source.get("Color Palette", ""))

    image_url = normalize_link(source.get("link", ""))

    return {
        "sku": sku,
        "name": name,
        "description": description,
        "category_id": category,
        "price_inr": price,
        "stock": 25,
        "is_active": True,
        "media": {
            "image_url": image_url,
            "glb_url": "",
        },
        "attributes": {
            "aesthetic_style": aesthetic,
            "mood_feel": mood,
            "price_tier": price_tier,
            "dominant_colors": dominant_colors,
            "materials": [],
            "color_palette": color_palette,
        },
        "source": {
            "db": SOURCE_DB,
            "collection": SOURCE_COLLECTION,
            "source_id": source_id,
            "source_image_file": source.get("Image File", ""),
            "source_primary_object": source.get("Primary Object", ""),
        },
    }


def main() -> None:
    client = MongoClient(MONGODB_URI)
    source_col = client[SOURCE_DB][SOURCE_COLLECTION]
    target_col = client[TARGET_DB][TARGET_COLLECTION]

    source_docs = list(source_col.find({}))
    if not source_docs:
        print("No source documents found.")
        return

    if RESET_PREVIOUS_SOURCE_IMPORT:
        delete_result = target_col.delete_many({"source.db": SOURCE_DB, "source.collection": SOURCE_COLLECTION})
        print(f"Removed existing imported source docs: {delete_result.deleted_count}")

    ops = []
    for doc in source_docs:
        mapped = build_target_doc(doc)
        ops.append(UpdateOne({"sku": mapped["sku"]}, {"$set": mapped}, upsert=True))

    result = target_col.bulk_write(ops, ordered=False)

    print("Migration complete")
    print(f"Source docs: {len(source_docs)}")
    print(f"Matched: {result.matched_count}")
    print(f"Modified: {result.modified_count}")
    print(f"Upserts: {len(result.upserted_ids) if result.upserted_ids else 0}")
    print(f"Target total products: {target_col.count_documents({})}")


if __name__ == "__main__":
    main()
