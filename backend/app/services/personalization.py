from typing import Any


def budget_tier_for_value(value: int) -> str:
    if value <= 200:
        return "cheap"
    if value <= 500:
        return "medium"
    if value <= 5000:
        return "premium"
    return "luxury"


def score_product(product: dict[str, Any], pref: dict[str, Any]) -> float:
    score = 0.0

    if product.get("attributes", {}).get("aesthetic_style") == pref.get("aesthetic_style"):
        score += 45
    if product.get("attributes", {}).get("mood_feel") == pref.get("mood_feel"):
        score += 30

    user_tier = pref.get("budget_tier")
    product_tier = product.get("attributes", {}).get("price_tier")
    if user_tier == product_tier:
        score += 20
    elif (user_tier, product_tier) in {
        ("medium", "cheap"),
        ("premium", "medium"),
        ("luxury", "premium"),
        ("premium", "luxury"),
    }:
        score += 10

    score += 5
    return score
