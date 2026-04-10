from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.mongo_utils import serialize_mongo_document
from app.schemas.common import AddCartItemRequest, DemoPaymentConfirmRequest, UpdateCartItemRequest


router = APIRouter(prefix="/cart", tags=["cart"])


async def get_or_create_cart(db, user_id: str):
    cart = await db.carts.find_one({"user_id": user_id, "status": "active"})
    if cart:
        return cart

    cart = {
        "_id": f"cart:{user_id}",
        "user_id": user_id,
        "status": "active",
        "items": [],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.carts.insert_one(cart)
    return cart


@router.get("")
async def get_cart(user=Depends(get_current_user)):
    db = get_db()
    cart = await get_or_create_cart(db, user["_id"])
    return serialize_mongo_document(cart)


@router.post("/items")
async def add_item(payload: AddCartItemRequest, user=Depends(get_current_user)):
    db = get_db()
    cart = await get_or_create_cart(db, user["_id"])
    product = await db.products.find_one({"sku": payload.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.get("is_active", False):
        raise HTTPException(status_code=400, detail="Product is inactive")
    if int(product.get("stock", 0)) <= 0:
        raise HTTPException(status_code=400, detail="Product out of stock")

    items = cart.get("items", [])
    found = False
    for item in items:
        if item["product_id"] == payload.product_id:
            item["qty"] += payload.qty
            found = True
            break

    if not found:
        items.append(
            {
                "product_id": payload.product_id,
                "qty": payload.qty,
                "price_snapshot_inr": product["price_inr"],
                "name": product["name"],
                "image_url": product.get("media", {}).get("image_url", ""),
            }
        )

    total_qty = 0
    for item in items:
        if item["product_id"] == payload.product_id:
            total_qty = item["qty"]
            break

    if total_qty > int(product.get("stock", 0)):
        raise HTTPException(status_code=400, detail="Requested quantity exceeds available stock")

    await db.carts.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "ok", "items": items}


@router.patch("/items/{product_id}")
async def update_item(product_id: str, payload: UpdateCartItemRequest, user=Depends(get_current_user)):
    db = get_db()
    cart = await get_or_create_cart(db, user["_id"])
    items = cart.get("items", [])

    updated = False
    for item in items:
        if item["product_id"] == product_id:
            item["qty"] = payload.qty
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    await db.carts.update_one({"_id": cart["_id"]}, {"$set": {"items": items}})
    return {"status": "ok", "items": items}


@router.delete("/items/{product_id}")
async def remove_item(product_id: str, user=Depends(get_current_user)):
    db = get_db()
    cart = await get_or_create_cart(db, user["_id"])
    items = [i for i in cart.get("items", []) if i["product_id"] != product_id]
    await db.carts.update_one({"_id": cart["_id"]}, {"$set": {"items": items}})
    return {"status": "ok", "items": items}


@router.post("/checkout")
async def checkout(user=Depends(get_current_user)):
    # Compatibility shortcut: create and auto-confirm a demo payment.
    db = get_db()
    cart = await get_or_create_cart(db, user["_id"])
    items = cart.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = sum(item["qty"] * item["price_snapshot_inr"] for item in items)

    for item in items:
        product = await db.products.find_one({"sku": item["product_id"]})
        if not product or not product.get("is_active", False):
            raise HTTPException(status_code=400, detail=f"Product unavailable: {item['product_id']}")
        if int(product.get("stock", 0)) < int(item["qty"]):
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {item['product_id']}")
    payment_id = f"demo_{uuid.uuid4().hex[:12]}"
    payment = {
        "payment_id": payment_id,
        "user_id": user["_id"],
        "amount_inr": total,
        "provider": "demo",
        "status": "paid",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payments.insert_one(payment)

    order_doc = {
        "_id": f"order:{user['_id']}:{datetime.now(timezone.utc).timestamp()}",
        "user_id": user["_id"],
        "items": items,
        "total_inr": total,
        "payment_status": "paid",
        "payment_id": payment_id,
        "order_status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order_doc)

    for item in items:
        await db.products.update_one(
            {"sku": item["product_id"]},
            {"$inc": {"stock": -int(item["qty"])}},
        )

    await db.carts.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": [], "status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )

    return {
        "status": "confirmed",
        "payment": serialize_mongo_document(payment),
        "order": serialize_mongo_document(order_doc),
    }


@router.post("/demo-payment/create")
async def create_demo_payment(user=Depends(get_current_user)):
    db = get_db()
    cart = await get_or_create_cart(db, user["_id"])
    items = cart.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = sum(item["qty"] * item["price_snapshot_inr"] for item in items)
    payment_id = f"demo_{uuid.uuid4().hex[:12]}"
    payment = {
        "payment_id": payment_id,
        "user_id": user["_id"],
        "amount_inr": total,
        "provider": "demo",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payments.insert_one(payment)

    return {
        "status": "pending",
        "payment_id": payment_id,
        "amount_inr": total,
        "provider": "demo",
        "message": "Demo payment intent created. Confirm it to place order.",
    }


@router.post("/demo-payment/confirm")
async def confirm_demo_payment(payload: DemoPaymentConfirmRequest, user=Depends(get_current_user)):
    db = get_db()
    payment = await db.payments.find_one({"payment_id": payload.payment_id, "user_id": user["_id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.get("status") == "paid":
        existing = await db.orders.find_one({"payment_id": payload.payment_id})
        return {"status": "already_confirmed", "order": serialize_mongo_document(existing)}

    cart = await get_or_create_cart(db, user["_id"])
    items = cart.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = sum(item["qty"] * item["price_snapshot_inr"] for item in items)

    for item in items:
        product = await db.products.find_one({"sku": item["product_id"]})
        if not product or not product.get("is_active", False):
            raise HTTPException(status_code=400, detail=f"Product unavailable: {item['product_id']}")
        if int(product.get("stock", 0)) < int(item["qty"]):
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {item['product_id']}")

    await db.payments.update_one(
        {"payment_id": payload.payment_id},
        {"$set": {"status": "paid", "confirmed_at": datetime.now(timezone.utc).isoformat(), "amount_inr": total}},
    )

    order_doc = {
        "_id": f"order:{user['_id']}:{datetime.now(timezone.utc).timestamp()}",
        "user_id": user["_id"],
        "items": items,
        "total_inr": total,
        "payment_status": "paid",
        "payment_id": payload.payment_id,
        "order_status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order_doc)

    for item in items:
        await db.products.update_one(
            {"sku": item["product_id"]},
            {"$inc": {"stock": -int(item["qty"])}},
        )

    await db.carts.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": [], "status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )

    return {"status": "confirmed", "order": serialize_mongo_document(order_doc)}
