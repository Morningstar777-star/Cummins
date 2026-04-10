import base64
import json
from typing import Any

from fastapi import APIRouter, Depends
import httpx

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.mongo_utils import serialize_mongo_documents
from app.schemas.common import AnalyzeImageRequest, ChatRequest
from app.services.personalization import budget_tier_for_value, score_product


router = APIRouter(prefix="/ai", tags=["ai"])


SHOPPING_LOGIC = {
    "upsell_rules": {
        "living room": ["coffee table", "throw pillows", "rug"],
        "bedroom": ["mattress", "nightstands", "sheet set"],
        "kitchen": ["storage jars", "serving tray", "accent lighting"],
        "decor": ["vases", "candles", "wall art"],
    },
    "response_templates": {
        "out_of_budget": "This option is slightly outside your budget tier, but it can still be styled beautifully. Want alternatives in your budget?",
        "perfect_match": "This is an excellent fit for your current style direction.",
    },
}


def _derive_customer_profile(user: dict[str, Any], pref: dict[str, Any]) -> str:
    name = user.get("name") or "Customer"
    aesthetics = pref.get("aesthetic_style") or "Not set"
    moods = pref.get("mood_feel") or "Not set"
    budget_tier = pref.get("budget_tier") or budget_tier_for_value(int(pref.get("budget_value") or 0))
    constraints = pref.get("extra_preferences") or "No additional constraints shared"
    return (
        f"Name: {name}\n"
        f"Preferred Aesthetics: {aesthetics}\n"
        f"Preferred Moods: {moods}\n"
        f"Budget Tier: {budget_tier}\n"
        f"Specific constraints: {constraints}"
    )


def _product_to_document_text(product: dict[str, Any]) -> str:
    attrs = product.get("attributes") or {}
    dominant_colors = ", ".join(attrs.get("dominant_colors") or [])
    materials = ", ".join(attrs.get("materials") or [])
    tips = ", ".join(product.get("styling_tips") or [])
    return (
        f"Product Name: {product.get('name', 'Unknown')}\n"
        f"Category: {product.get('category_id', 'unknown')}\n"
        f"Aesthetic Style: {attrs.get('aesthetic_style', 'N/A')}\n"
        f"Mood & Feel: {attrs.get('mood_feel', 'N/A')}\n"
        f"Price Tier: {attrs.get('price_tier', 'N/A')} (Rs {product.get('price_inr', 0)})\n"
        f"Colors: {dominant_colors or 'N/A'}\n"
        f"Materials: {materials or 'N/A'}\n"
        f"Description: {product.get('description', '')}\n"
        f"Styling Tips: {tips or 'Use layered textures and complementary accents.'}"
    )


def _ranked_products_for_query(products: list[dict[str, Any]], message: str, pref: dict[str, Any], k: int = 3) -> list[dict[str, Any]]:
    query = message.lower().strip()

    def _query_score(product: dict[str, Any]) -> float:
        attrs = product.get("attributes") or {}
        haystack = " ".join(
            [
                str(product.get("name") or ""),
                str(product.get("description") or ""),
                str(product.get("category_id") or ""),
                str(attrs.get("aesthetic_style") or ""),
                str(attrs.get("mood_feel") or ""),
                " ".join(attrs.get("dominant_colors") or []),
                " ".join(attrs.get("materials") or []),
            ]
        ).lower()
        query_tokens = [token for token in query.replace("-", " ").split() if len(token) > 2]
        token_hits = sum(1 for token in query_tokens if token in haystack)
        contains_query = 20.0 if query and query in haystack else 0.0
        token_score = float(token_hits * 6)
        return score_product(product, pref) + contains_query + token_score

    ranked = sorted(products, key=_query_score, reverse=True)
    return ranked[:k]


def _default_follow_up(category_id: str) -> str:
    category = (category_id or "").lower()
    follow_ups = {
        "living-room": "Would you prefer a compact layout or a larger statement setup for your living room?",
        "bedroom": "Do you want more storage-focused or more minimal bedroom options next?",
        "kitchen": "Should I prioritize easy-to-clean materials for your kitchen picks?",
        "decor": "Would you like decor pieces that add warmth or a sharper modern contrast?",
    }
    return follow_ups.get(category, "Would you like me to narrow this down by budget, color, or material?")


def _detect_occasion(message: str) -> str:
    lowered = message.lower()
    if any(word in lowered for word in ["birthday", "bday", "birthday party"]):
        return "birthday"
    if any(word in lowered for word in ["anniversary", "anniv"]):
        return "anniversary"
    if any(word in lowered for word in ["housewarming", "new home"]):
        return "housewarming"
    if any(word in lowered for word in ["wedding", "marriage"]):
        return "wedding"
    return "none"


def _occasion_hint(occasion: str) -> str:
    hints = {
        "birthday": "Prioritize joyful upgrades and statement pieces with gifting appeal.",
        "anniversary": "Prioritize warm, intimate, romantic ambiance and premium comfort.",
        "housewarming": "Prioritize practical foundational items plus one standout decor piece.",
        "wedding": "Prioritize coordinated sets and elevated premium looks suitable for hosting.",
        "none": "No specific occasion constraints.",
    }
    return hints.get(occasion, hints["none"])


def _top_sellers_from_orders(orders: list[dict[str, Any]], k: int = 5) -> list[str]:
    sold_by_sku: dict[str, int] = {}
    for order in orders:
        for item in order.get("items", []):
            sku = str(item.get("product_id") or "")
            qty = int(item.get("qty") or 0)
            if sku:
                sold_by_sku[sku] = sold_by_sku.get(sku, 0) + qty

    ranked = sorted(sold_by_sku.items(), key=lambda pair: pair[1], reverse=True)
    return [sku for sku, _qty in ranked[:k]]


async def _database_context(db, user: dict[str, Any], products: list[dict[str, Any]], categories: list[dict[str, Any]]) -> str:
    pref = await db.user_preferences.find_one({"user_id": user["_id"]}) or {}
    my_orders = await db.orders.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(length=20)
    recent_chats = await db.chat_messages.find({"user_id": user["_id"]}).sort("_id", -1).limit(12).to_list(length=12)

    category_titles = [str(c.get("title") or c.get("id") or "") for c in categories if c]
    global_orders = await db.orders.find({}).sort("created_at", -1).to_list(length=300)
    top_seller_skus = _top_sellers_from_orders(global_orders, k=6)

    safe_pref = {
        "aesthetic_style": pref.get("aesthetic_style"),
        "mood_feel": pref.get("mood_feel"),
        "budget_tier": pref.get("budget_tier"),
        "budget_value": pref.get("budget_value"),
        "extra_preferences": pref.get("extra_preferences"),
    }

    chat_count = len([m for m in recent_chats if str(m.get("message") or "").strip()])
    return (
        f"Database coverage:\n"
        f"- Active products loaded: {len(products)}\n"
        f"- Categories loaded: {len(categories)} ({', '.join(category_titles[:8])})\n"
        f"- Current user preferences: {json.dumps(safe_pref, ensure_ascii=False)}\n"
        f"- Current user recent orders: {len(my_orders)}\n"
        f"- Current user recent chats available: {chat_count}\n"
        f"- Top seller SKUs from recent global demand (anonymized): {', '.join(top_seller_skus) if top_seller_skus else 'none'}"
    )


def _fallback_chat_answer(message: str, products: list[dict[str, Any]], pref: dict[str, Any]) -> tuple[str, list[str]]:
    top_matches = _ranked_products_for_query(products, message, pref, k=3)
    occasion = _detect_occasion(message)
    if not top_matches:
        return (
            "I could not find a close match right now. I can still help with products in Minimalist, Modern, Industrial, Maximalist, Traditional, Art Deco, and Cottagecore styles.",
            ["Show modern options", "Show budget-friendly options", "Show pet-friendly materials"],
        )

    lines: list[str] = ["Here are your best matches right now:"]
    if occasion == "birthday":
        lines.append("Birthday picks should feel festive and gift-worthy, so I prioritized statement-friendly options.")
    quick_suggestions: list[str] = []

    for product in top_matches:
        attrs = product.get("attributes") or {}
        tips = product.get("styling_tips") or []
        tip_text = tips[0] if tips else "Layer textures and keep tones cohesive for a designer finish."
        lines.append(
            (
                f"- {product.get('name')} ({attrs.get('aesthetic_style')}, {attrs.get('mood_feel')}) - "
                f"Rs {product.get('price_inr', 0)}. {tip_text}"
            )
        )

        category_id = str(product.get("category_id") or "")
        upsells = SHOPPING_LOGIC["upsell_rules"].get(category_id.replace("-", " "), [])
        if upsells:
            quick_suggestions.append(f"Add {upsells[0]} ideas")

    lines.append(_default_follow_up(str(top_matches[0].get("category_id") or "")))
    if not quick_suggestions:
        quick_suggestions = [
            "Show lower budget alternatives",
            "Recommend matching accents",
            "Suggest neutral palette options",
        ]

    deduped_suggestions = list(dict.fromkeys(quick_suggestions))
    return ("\n".join(lines), deduped_suggestions[:3])


def _is_smalltalk_message(message: str) -> bool:
    lowered = message.strip().lower()
    if not lowered:
        return False

    smalltalk_keywords = {
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
        "how are you",
        "thanks",
        "thank you",
        "who are you",
        "what can you do",
    }
    return any(keyword in lowered for keyword in smalltalk_keywords)


def _looks_like_product_query(message: str) -> bool:
    lowered = message.strip().lower()
    product_keywords = {
        "recommend",
        "suggest",
        "buy",
        "cart",
        "room",
        "living",
        "bedroom",
        "kitchen",
        "decor",
        "style",
        "sofa",
        "bed",
        "table",
        "chair",
        "price",
        "budget",
    }
    return any(keyword in lowered for keyword in product_keywords)


def _smalltalk_reply(message: str) -> tuple[str, list[str]]:
    lowered = message.strip().lower()

    if "how are you" in lowered:
        return (
            "I am doing great and ready to help you design your space. Tell me the room, style, or budget and I will suggest products you can add to cart instantly.",
            ["Show modern living room options", "Recommend premium bedroom picks", "Suggest pet-friendly furniture"],
        )

    if "thank" in lowered:
        return (
            "You are welcome. I can continue with room-wise recommendations whenever you are ready.",
            ["Show living room ideas", "Show bedroom ideas", "Analyze an uploaded room image"],
        )

    if "what can you do" in lowered or "who are you" in lowered:
        return (
            "I can chat naturally, recommend products from the live catalog, analyze a room image, and help you add suggested items to cart for checkout.",
            ["Recommend products for my room", "Analyze my room image", "Show budget-friendly picks"],
        )

    return (
        "Hi, I am your Olive & Oak shopping assistant. Share your room goal and I will recommend the right products from our current catalog.",
        ["Show modern living room ideas", "Suggest premium decor", "Recommend pet-friendly materials"],
    )


def _visual_match_confidence(analysis: dict[str, Any], product: dict[str, Any]) -> float:
    attrs = product.get("attributes") or {}
    score = 0.0

    if str(product.get("category_id") or "") == _normalize_category_for_db(str(analysis.get("category") or "")):
        score += 10.0
    if attrs.get("aesthetic_style") == analysis.get("aesthetic_style"):
        score += 10.0
    if attrs.get("mood_feel") == analysis.get("mood_feel"):
        score += 8.0
    if attrs.get("price_tier") == analysis.get("price_tier"):
        score += 4.0

    palette = {str(c).lower() for c in analysis.get("color_palette") or []}
    product_colors = {str(c).lower() for c in attrs.get("dominant_colors") or []}
    score += float(len(palette.intersection(product_colors)) * 3)

    return score


async def _recent_history_messages(db, user_id: str, limit: int = 8) -> list[dict[str, str]]:
    records = (
        await db.chat_messages.find({"user_id": user_id}).sort("_id", -1).limit(limit).to_list(length=limit)
    )
    messages: list[dict[str, str]] = []
    for item in reversed(records):
        role = item.get("role")
        content = str(item.get("message") or "").strip()
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    return messages


def _extract_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _normalize_category_for_db(category: str) -> str:
    normalized = (category or "").strip().lower()
    mapping = {
        "living room": "living-room",
        "bedroom": "bedroom",
        "kitchen": "kitchen",
        "party": "decor",
        "decor": "decor",
    }
    return mapping.get(normalized, normalized)


def _clamp_analysis_result(result: dict[str, Any]) -> dict[str, Any]:
    allowed_styles = {
        "Minimalist",
        "Modern",
        "Industrial",
        "Maximalist",
        "Traditional",
        "Art Deco",
        "Cottagecore",
    }
    allowed_moods = {
        "Cosy & Inviting",
        "Sleek & Modern",
        "Serene & Calm",
        "Rustic & Warm",
        "Luxurious & Opulent",
        "Natural & Organic",
    }
    allowed_categories = {"living room", "party", "kitchen", "bedroom", "decor"}
    allowed_tiers = {"cheap", "medium", "premium", "luxury"}

    style = result.get("aesthetic_style")
    mood = result.get("mood_feel")
    category = str(result.get("category") or "living room").lower()
    tier = str(result.get("price_tier") or "premium").lower()
    dominant_colors = result.get("dominant_colors") or ["beige", "walnut"]
    color_palette = result.get("color_palette") or ["beige", "cream", "oak"]

    return {
        "aesthetic_style": style if style in allowed_styles else "Modern",
        "mood_feel": mood if mood in allowed_moods else "Serene & Calm",
        "category": category if category in allowed_categories else "living room",
        "price_tier": tier if tier in allowed_tiers else "premium",
        "dominant_colors": [str(c).strip().lower() for c in dominant_colors if str(c).strip()][:4],
        "color_palette": [str(c).strip().lower() for c in color_palette if str(c).strip()][:6],
        "soft_filter": True,
    }


def _visual_pref_from_analysis(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "aesthetic_style": result.get("aesthetic_style"),
        "mood_feel": result.get("mood_feel"),
        "budget_tier": result.get("price_tier"),
    }


def _visual_recommendation_copy(analysis: dict[str, Any], picks: list[dict[str, Any]]) -> str:
    if not picks:
        return (
            "I analyzed your image and could not find close matches in the current catalog. "
            "Try another image angle or ask me for alternatives by style and budget."
        )

    lines = [
        (
            f"I analyzed your image as {analysis.get('aesthetic_style')} / {analysis.get('mood_feel')} "
            f"for {analysis.get('category')}. Here are smart buy picks:"
        )
    ]
    for item in picks[:3]:
        attrs = item.get("attributes") or {}
        lines.append(
            (
                f"- {item.get('name')} (Rs {item.get('price_inr', 0)}) | "
                f"{attrs.get('aesthetic_style')} | {attrs.get('mood_feel')}"
            )
        )
    lines.append("Want me to refine these by lower budget, premium only, or color palette?")
    return "\n".join(lines)


async def _analyze_scene_image(payload: AnalyzeImageRequest) -> dict[str, Any]:
    _ = base64.b64decode(payload.image_base64)

    result = {
        "aesthetic_style": "Modern",
        "mood_feel": "Serene & Calm",
        "category": "living room",
        "price_tier": "premium",
        "dominant_colors": ["beige", "walnut"],
        "color_palette": ["beige", "cream", "oak"],
        "soft_filter": True,
    }

    if settings.groq_api_key:
        try:
            system_prompt = """You are an expert interior design and ecommerce AI assistant.
Return valid JSON only with fields: aesthetic_style, mood_feel, category, price_tier, dominant_colors, color_palette.
aesthetic_style allowed: Minimalist, Modern, Industrial, Maximalist, Traditional, Art Deco, Cottagecore
mood_feel allowed: Cosy & Inviting, Sleek & Modern, Serene & Calm, Rustic & Warm, Luxurious & Opulent, Natural & Organic
category allowed: living room, party, kitchen, bedroom, decor
price_tier allowed: cheap, medium, premium, luxury"""

            vision_message = {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{payload.image_base64}"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Analyze this interior/product scene and return JSON only. "
                            "Keep aesthetic_style and mood_feel separate and valid."
                        ),
                    },
                ],
            }

            parsed = _extract_json(
                await _groq_chat_completion(
                    [{"role": "system", "content": system_prompt}, vision_message],
                    settings.groq_model_vision,
                )
            )
            result = {
                "aesthetic_style": parsed.get("aesthetic_style", result["aesthetic_style"]),
                "mood_feel": parsed.get("mood_feel", result["mood_feel"]),
                "category": parsed.get("category", result["category"]),
                "price_tier": parsed.get("price_tier", result["price_tier"]),
                "dominant_colors": parsed.get("dominant_colors", result["dominant_colors"]),
                "color_palette": parsed.get("color_palette", result["color_palette"]),
                "soft_filter": True,
            }
        except Exception:
            pass

    return _clamp_analysis_result(result)


async def _groq_chat_completion(messages: list[dict[str, Any]], model: str) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 900,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


@router.post("/chat")
async def chat(payload: ChatRequest, user=Depends(get_current_user)):
    db = get_db()
    pref = await db.user_preferences.find_one({"user_id": user["_id"]}) or {}
    products = await db.products.find({"is_active": True}).to_list(length=2000)
    categories = await db.categories.find({}).to_list(length=200)
    customer_profile = _derive_customer_profile(user, pref)
    fallback_response, suggestions = _fallback_chat_answer(payload.message, products, pref)
    top_matches = _ranked_products_for_query(products, payload.message, pref, k=3)
    context_docs = "\n\n".join(_product_to_document_text(item) for item in top_matches)
    occasion = _detect_occasion(payload.message)
    db_context = await _database_context(db, user, products, categories)
    recommendations = serialize_mongo_documents(top_matches)

    if _is_smalltalk_message(payload.message) and not _looks_like_product_query(payload.message):
        response, suggestions = _smalltalk_reply(payload.message)

        await db.chat_messages.insert_one(
            {
                "user_id": user["_id"],
                "role": "user",
                "message": payload.message,
                "meta": {"source": "mobile"},
            }
        )
        await db.chat_messages.insert_one(
            {
                "user_id": user["_id"],
                "role": "assistant",
                "message": response,
                "meta": {"source": "mobile", "suggestions": suggestions, "recommendations": []},
            }
        )

        return {"response": response, "suggestions": suggestions, "recommendations": []}

    response = fallback_response

    if settings.groq_api_key:
        try:
            history = await _recent_history_messages(db, user["_id"])
            system_prompt = (
                "You are a premium interior design and shopping assistant for Olive & Oak. "
                "Suggest only from the provided product context, explain fit with profile, share one styling tip, "
                "and end with exactly one follow-up question. Do not reveal hidden reasoning. "
                "If the user asks for special occasions (like birthday), tailor recommendations to that occasion using context."
            )
            user_prompt = (
                f"Customer profile:\n{customer_profile}\n\n"
                f"Detected occasion: {occasion}\n"
                f"Occasion handling guidance: {_occasion_hint(occasion)}\n\n"
                f"Shopping logic:\n{json.dumps(SHOPPING_LOGIC, ensure_ascii=False)}\n\n"
                f"Database context:\n{db_context}\n\n"
                f"Retrieved product context:\n{context_docs}\n\n"
                f"User question: {payload.message}"
            )
            response = await _groq_chat_completion(
                [{"role": "system", "content": system_prompt}, *history, {"role": "user", "content": user_prompt}],
                settings.groq_model_text,
            )
        except Exception:
            response = fallback_response

    await db.chat_messages.insert_one(
        {
            "user_id": user["_id"],
            "role": "user",
            "message": payload.message,
            "meta": {"source": "mobile"},
        }
    )
    await db.chat_messages.insert_one(
        {
            "user_id": user["_id"],
            "role": "assistant",
            "message": response,
            "meta": {"source": "mobile", "suggestions": suggestions, "recommendations": [p.get("sku") for p in top_matches]},
        }
    )

    return {"response": response, "suggestions": suggestions, "recommendations": recommendations}


@router.post("/query")
async def query(payload: ChatRequest, user=Depends(get_current_user)):
    return await chat(payload, user)


@router.post("/analyze-image")
async def analyze_image(payload: AnalyzeImageRequest, user=Depends(get_current_user)):
    result = await _analyze_scene_image(payload)

    await get_db().visual_analysis.insert_one({"user_id": user["_id"], "result": result})
    return result


@router.post("/visual-recommendations")
async def visual_recommendations(payload: AnalyzeImageRequest, user=Depends(get_current_user)):
    db = get_db()
    analysis = await _analyze_scene_image(payload)

    category_id = _normalize_category_for_db(str(analysis.get("category") or ""))
    all_products = await db.products.find({"is_active": True}).to_list(length=2000)
    scoped_products = [p for p in all_products if str(p.get("category_id") or "") == category_id]
    candidate_products = scoped_products if scoped_products else all_products

    visual_pref = _visual_pref_from_analysis(analysis)
    ranked = sorted(candidate_products, key=lambda p: score_product(p, visual_pref), reverse=True)

    for product in ranked:
        attrs = product.get("attributes") or {}
        colors = [str(c).lower() for c in attrs.get("dominant_colors") or []]
        color_overlap = len(set(colors).intersection(set(analysis.get("color_palette") or [])))
        if color_overlap:
            product["visual_match_score"] = float(score_product(product, visual_pref) + (color_overlap * 4))
        else:
            product["visual_match_score"] = float(score_product(product, visual_pref))

    ranked = sorted(ranked, key=lambda p: p.get("visual_match_score", 0), reverse=True)
    picks = ranked[:8]
    best_confidence = max((_visual_match_confidence(analysis, p) for p in picks), default=0.0)

    if best_confidence < 18:
        response_text = (
            "I can't suggest products confidently for this image right now. "
            "Please upload a different room image, or go through all products."
        )
        suggestions = ["Upload a new image", "Go through all products", "Show room-wise catalog"]

        await db.visual_analysis.insert_one(
            {
                "user_id": user["_id"],
                "result": analysis,
                "recommended_skus": [],
                "low_confidence": True,
            }
        )

        await db.chat_messages.insert_one(
            {
                "user_id": user["_id"],
                "role": "assistant",
                "message": response_text,
                "meta": {"source": "visual-recommendations", "suggestions": suggestions, "low_confidence": True},
            }
        )

        return {
            "analysis": analysis,
            "response": response_text,
            "suggestions": suggestions,
            "recommendations": [],
        }

    await db.visual_analysis.insert_one(
        {
            "user_id": user["_id"],
            "result": analysis,
            "recommended_skus": [str(p.get("sku") or "") for p in picks],
        }
    )

    response_text = _visual_recommendation_copy(analysis, picks)
    suggestions = [
        "Show lower budget options",
        "Show premium-only options",
        "Match warm neutral colors",
    ]

    await db.chat_messages.insert_one(
        {
            "user_id": user["_id"],
            "role": "assistant",
            "message": response_text,
            "meta": {"source": "visual-recommendations", "suggestions": suggestions},
        }
    )

    return {
        "analysis": analysis,
        "response": response_text,
        "suggestions": suggestions,
        "recommendations": serialize_mongo_documents(picks),
    }
