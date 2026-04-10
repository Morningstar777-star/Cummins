from __future__ import annotations

from typing import Any

from bson import ObjectId


def serialize_mongo_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {k: serialize_mongo_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [serialize_mongo_value(v) for v in value]
    return value


def serialize_mongo_document(doc: dict[str, Any] | None) -> dict[str, Any]:
    if not doc:
        return {}
    return serialize_mongo_value(doc)


def serialize_mongo_documents(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [serialize_mongo_value(doc) for doc in docs]
