# Olive & Oak Personalized Ecommerce Platform - Master Specification

Date: 2026-04-09
Project: Olive & Oak
Scope: React Native customer/admin app + Python backend + AI chatbot + image-based soft filtering

============================================================
1) PRODUCT VISION
============================================================
Build a personalized ecommerce platform for home/interior shopping with two roles:
- Customer
- Admin

Core promise:
- Gather customer intent through onboarding quiz
- Personalize product discovery, catalog ranking, and chatbot recommendations
- Enable smooth purchase flow from browsing to checkout

Brand display on home:
- Company name: Olive & Oak
- Tagline: (configurable)

============================================================
2) USER WORKFLOW (CUSTOMER)
============================================================
A) Onboarding
1. User registers and enters basic details
2. User completes a 3-question personalization quiz
3. Answers are stored in DB and used for personalization

B) Quiz Details
Q1. Preferred aesthetics
- Field: aesthetic_style
- Allowed values:
  - Minimalist
  - Modern
  - Industrial
  - Maximalist
  - Traditional
  - Art Deco
  - Cottagecore
- UI:
  - Card grid with one card per option
  - Each card has image; if unavailable use placeholder/demo image

Q2. Preferred moods
- Field: mood_feel
- Allowed values:
  - Cosy & Inviting
  - Sleek & Modern
  - Serene & Calm
  - Rustic & Warm
  - Luxurious & Opulent
  - Natural & Organic
- UI:
  - Card grid with one card per option
  - Each card has image; if unavailable use placeholder/demo image

Q3. Budget tier
- UI: Slider from 0 to 10000 INR
- Tier mapping:
  - cheap: 0-1000
  - medium: 1000-3000
  - premium: 3000-8000
  - luxury: 8000+
- Also include text field:
  - extra_preferences (free text)

C) Personalized Home
1. Header shows Olive & Oak + tagline
2. Below header: 4 GLB objects arranged horizontally in a circular style row
3. Product grid shown below with personalized ranking
4. Bottom-right chatbot FAB

D) Category Entry Through GLB
- Clicking a GLB object opens catalog for that object/category
- User can browse products and add items to cart

E) Cart -> Payment -> Order
- Cart accumulates selected items
- User proceeds to payment
- Order confirmation displayed and persisted

F) Chatbot
- User asks natural-language requests
- Chatbot uses DB context and profile context to suggest items

G) Visual Input Soft Filter Feature
- User uploads room/product image
- System extracts style/mood/category/price hints
- Used as a soft filter/rerank signal, not a hard exclusion

============================================================
3) ADMIN WORKFLOW
============================================================
- Manage products, categories, media, inventory
- Import product data via CSV
- Manage order states
- View audit trails

============================================================
4) TECH STACK
============================================================
Frontend (Mobile)
- React Native (Expo)
- TypeScript
- React Navigation
- Zustand or Redux Toolkit
- TanStack Query
- React Hook Form + Zod
- 3D rendering support for GLB assets

Backend
- Python FastAPI
- Pydantic
- SQLAlchemy + Alembic
- PostgreSQL
- Redis
- Celery/RQ for jobs

AI/ML
- LangChain
- Groq LLM endpoints
- Embeddings model + FAISS (or pgvector)

Infra
- Docker/Docker Compose
- Object storage for images/GLB assets
- CDN for static assets

============================================================
5) HIGH-LEVEL ARCHITECTURE
============================================================
Client Layer
- React Native app (customer + admin access control)

API Layer (FastAPI services)
- Auth service
- Profile + quiz service
- Personalization service
- Catalog service
- Cart + checkout service
- Order service
- Chatbot service
- Image analysis service
- Admin service

Data Layer
- PostgreSQL (source of truth)
- Redis (cache/session/short-lived memory)
- Vector index (FAISS or pgvector)

============================================================
6) DATABASE MODEL (INITIAL)
============================================================
users
- id, name, email, phone, password_hash, role, created_at

user_profiles
- user_id, address, city, constraints_json

user_preferences
- user_id, aesthetic_style, mood_feel, budget_value, budget_tier, extra_preferences, updated_at

quiz_questions
- id, question_key, prompt, question_type

quiz_options
- id, question_id, option_value, label, image_url

quiz_responses
- id, user_id, question_id, response_value, created_at

categories
- id, name, slug

products
- id, sku, name, description, category_id, price_inr, stock, is_active

product_attributes
- product_id, aesthetic_style, mood_feel, price_tier, dominant_colors_json, materials_json

product_media
- id, product_id, image_url, glb_url, is_primary

carts
- id, user_id, status, created_at

cart_items
- id, cart_id, product_id, qty, price_snapshot_inr

orders
- id, user_id, total_inr, payment_status, order_status, created_at

order_items
- id, order_id, product_id, qty, price_snapshot_inr

payments
- id, order_id, provider, provider_ref, status, amount_inr

chat_sessions
- id, user_id, started_at, ended_at

chat_messages
- id, session_id, role, message, metadata_json, created_at

admin_actions_audit
- id, admin_id, action_type, entity, entity_id, payload_json, created_at

============================================================
7) PERSONALIZATION ENGINE (V1)
============================================================
Input signals
- Quiz answers (style, mood, budget, extras)
- Behavioral events (click, view, add-to-cart, purchase)
- Optional image-analysis tags

Ranking formula (initial)
- 45% aesthetic match
- 30% mood match
- 20% budget fit
- 5% diversity/novelty

Output usage
- Home feed ranking
- Category ranking
- Cart cross-sell suggestions
- Chatbot context grounding

============================================================
8) API ENDPOINTS (INITIAL)
============================================================
Auth
- POST /auth/register
- POST /auth/login
- POST /auth/refresh

Quiz/Profile
- GET /quiz/questions
- POST /quiz/submit
- GET /me/preferences
- PUT /me/preferences

Home/Catalog
- GET /home/personalized
- GET /categories
- GET /categories/{id}/products
- GET /products/{id}

Cart/Checkout/Orders
- GET /cart
- POST /cart/items
- PATCH /cart/items/{item_id}
- DELETE /cart/items/{item_id}
- POST /checkout/create-order
- POST /payments/webhook
- GET /orders/{id}

AI
- POST /chat/query
- POST /ai/analyze-image
- GET /recommendations

Admin
- POST /admin/products
- PUT /admin/products/{id}
- POST /admin/catalog/import-csv
- GET /admin/orders

============================================================
9) CSV INGESTION PLAN
============================================================
Expected CSV files
- categories.csv
- products.csv
- product_attributes.csv
- product_media.csv
- inventory.csv

Ingestion flow
1. Upload CSV in admin
2. Validate headers/types
3. Stage into temp tables
4. Referential checks + dedupe
5. Upsert to final tables
6. Return import report with row-level errors

============================================================
10) SCREEN LIST (MOBILE)
============================================================
Customer
- Splash
- Login/Register
- Basic Details
- Quiz Q1 Aesthetic cards
- Quiz Q2 Mood cards
- Quiz Q3 Budget slider + extras
- Home (brand + GLB row + product grid + chatbot FAB)
- Category catalog
- Product detail
- Cart
- Checkout
- Order confirmation
- Chatbot panel
- Profile/Settings

Admin
- Admin login
- Product management
- CSV import
- Inventory updates
- Orders list/details

============================================================
11) SECURITY & PRODUCTION NOTES
============================================================
- Never hardcode API keys in source code
- Use environment variables/secret manager
- Rotate any exposed key immediately
- Use hashed passwords (Argon2/Bcrypt)
- Add JWT expiry + refresh strategy
- Add webhook signature verification
- Add request rate limiting on AI routes

============================================================
12) BUILD ROADMAP
============================================================
Phase 1 (Weeks 1-4)
- App and backend scaffolding
- Auth + role model
- Quiz flow + DB persistence

Phase 2 (Weeks 5-8)
- Personalized home
- GLB category flow
- Catalog + cart + checkout
- Orders pipeline

Phase 3 (Weeks 9-12)
- Chatbot integration (RAG)
- Image analysis soft filter
- Admin CSV import
- Hardening + analytics + launch prep

============================================================
13) CHATBOT CODE APPENDIX (USER-PROVIDED)
============================================================
Important: API key placeholders are redacted for security. Use environment variables.

```python
import os
import logging
import warnings
import json
from operator import itemgetter

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore")
logging.getLogger("tensorflow").setLevel(logging.ERROR)

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# Use secure env var in production
os.environ["GROQ_API_KEY"] = "<REDACTED>"

customer_profile = """
Name: Yashraj
Preferred Aesthetics: Minimalist, Modern
Preferred Moods: Sleek & Modern, Serene & Calm
Budget Tier: Premium
Current Project: Furnishing a new apartment (Living Room and Bedroom)
Specific constraints: Has a dog (needs durable/pet-friendly materials), prefers neutral color palettes.
"""

json_string = """
{
  "catalog_detailed": {
    "living room": [
      {
        "name": "Aero Modular Cloud Sofa",
        "category": "living room",
        "aesthetic_style": "Minimalist",
        "mood_feel": "Serene & Calm",
        "price_tier": "premium",
        "price_usd": 2800,
        "dominant_colors": ["white", "cream"],
        "materials": ["Performance Canvas (Pet-friendly)", "Kiln-dried wood"],
        "chatbot_triggers": ["white sofa", "comfortable couch", "minimalist living room", "pet friendly sofa"],
        "follow_up_questions": ["What are the dimensions of your living room?", "Are you looking for a sectional or a standard 3-seater?"],
        "styling_tips": ["Pair with a light oak coffee table", "Add a textured neutral rug to keep the serene feel"]
      },
      {
        "name": "Onyx Leather Chesterfield",
        "category": "living room",
        "aesthetic_style": "Industrial",
        "mood_feel": "Rustic & Warm",
        "price_tier": "luxury",
        "price_usd": 4500,
        "dominant_colors": ["distressed black", "dark brown"],
        "materials": ["Top-grain Italian Leather", "Steel frame"],
        "chatbot_triggers": ["leather sofa", "dark living room", "industrial couch"],
        "follow_up_questions": ["Do you get a lot of natural light in the room?", "Are you looking for matching armchairs?"],
        "styling_tips": ["Complements exposed brick walls beautifully", "Pair with a reclaimed wood coffee table"]
      }
    ],
    "bedroom": [
      {
        "name": "Lumiere Platform Bed",
        "category": "bedroom",
        "aesthetic_style": "Modern",
        "mood_feel": "Sleek & Modern",
        "price_tier": "medium",
        "price_usd": 1200,
        "dominant_colors": ["matte black", "walnut"],
        "materials": ["Walnut veneer", "Powder-coated steel"],
        "chatbot_triggers": ["modern bed", "platform bed", "black bed frame"],
        "follow_up_questions": ["Do you prefer a firm or plush mattress?", "Do you need under-bed storage?"],
        "styling_tips": ["Use crisp white linens to make the walnut finish pop", "Add minimalist matte black reading sconces"]
      },
      {
        "name": "Versailles Velvet Bed",
        "category": "bedroom",
        "aesthetic_style": "Art Deco",
        "mood_feel": "Luxurious & Opulent",
        "price_tier": "luxury",
        "price_usd": 5500,
        "dominant_colors": ["emerald green", "gold"],
        "materials": ["Performance Velvet", "Brass accents"],
        "chatbot_triggers": ["velvet bed", "green bed", "luxury bedroom"],
        "follow_up_questions": ["Are you looking for matching brass nightstands?", "What is the primary color of your bedroom walls?"],
        "styling_tips": ["Pair with geometric Art Deco wallpaper", "Use high-thread-count sateen sheets"]
      }
    ]
  },
  "shopping_logic": {
    "upsell_rules": {
      "sofa": ["coffee table", "throw pillows", "rug"],
      "bed": ["mattress", "nightstands", "sheet set"]
    },
    "response_templates": {
      "out_of_budget": "This item is a bit above your stated 'Premium' budget, but it's a stunning piece. Would you like to see more affordable alternatives in the same style?",
      "perfect_match": "This is a perfect match for your requested aesthetic!"
    }
  }
}
"""

data = json.loads(json_string)
shopping_logic = json.dumps(data["shopping_logic"], indent=2, ensure_ascii=False)

product_docs = []
for category, products in data["catalog_detailed"].items():
    for product in products:
        content = f"Product Name: {product['name']}\n"
        content += f"Category: {category}\n"
        content += f"Aesthetic Style: {product['aesthetic_style']}\n"
        content += f"Mood & Feel: {product['mood_feel']}\n"
        content += f"Price Tier: {product['price_tier']} (${product['price_usd']})\n"
        content += f"Colors: {', '.join(product['dominant_colors'])}\n"
        content += f"Materials: {', '.join(product['materials'])}\n"
        content += f"Styling Tips: {', '.join(product['styling_tips'])}\n"
        content += f"Follow-up Questions: {', '.join(product['follow_up_questions'])}\n"
        product_docs.append(Document(page_content=content))

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = FAISS.from_documents(product_docs, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.3,
    max_tokens=1024
)

template = """
You are a highly capable, conversational interior design and e-commerce shopping assistant.
You have been provided with the user's customer profile, general shopping logic, and specific product context from our catalog.

CRITICAL OUTPUT RULES:
- DO NOT output your internal thought process.
- Speak directly, naturally, and empathetically to the user. Act like a high-end interior designer helping a client.
- Format your responses cleanly.

INTERNAL LOGIC TO FOLLOW:
1. PROFILE MATCHING: Always consider the Customer Profile. If a user asks for a product, cross-reference it with their preferred aesthetics, budget, and constraints (e.g., pet-friendly).
2. CONTEXT MATCH: Use the Retrieved Product Context to suggest specific items. Mention the product name, why it fits their style, and the price.
3. UPSELLING & STYLING: Provide the "Styling Tips" associated with the product to inspire the customer.
4. ENGAGEMENT: End your response by asking ONE of the specific "Follow-up Questions" listed in the product context to keep the conversation moving and refine their search.
5. OUT OF STOCK / UNKNOWN: If the user asks for something completely unrelated to the retrieved context, politely inform them that you are currently focusing on the styles available in our catalog, and gently guide them back to our offerings.

Customer Profile:
{customer_profile}

Global Shopping & Upsell Logic:
{shopping_logic}

Retrieved Product Context:
{context}
"""

prompt_with_history = ChatPromptTemplate.from_messages([
    ("system", template),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}")
])

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    RunnablePassthrough.assign(
        context=itemgetter("question") | retriever | format_docs,
        customer_profile=lambda x: customer_profile,
        shopping_logic=lambda x: shopping_logic
    )
    | prompt_with_history
    | llm
    | StrOutputParser()
)

store = {}
def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

conversational_rag_chain = RunnableWithMessageHistory(
    rag_chain,
    get_session_history,
    input_messages_key="question",
    history_messages_key="history",
)

def start_chat():
    print("\nSmart Design Assistant Online. Type 'quit' to exit.")
    print("=" * 60)
    session_id = "yashraj_session_1"

    while True:
        user_input = input("You: ")
        if user_input.lower() in ['quit', 'exit', 'stop']:
            print("Bot: Ending chat session. Happy decorating!")
            break

        print("-" * 60)

        print("Bot: ", end="", flush=True)
        response_stream = conversational_rag_chain.stream(
            {"question": user_input},
            config={"configurable": {"session_id": session_id}}
        )

        for chunk in response_stream:
            print(chunk, end="", flush=True)

        print("\n" + "=" * 60)

if __name__ == "__main__":
    start_chat()
```

============================================================
14) IMAGE ANALYSIS SOFT-FILTER CODE APPENDIX (USER-PROVIDED)
============================================================
Important: API key placeholders are redacted for security. Use environment variables.

```python
import os
import base64
import json
from groq import Groq

API_KEY = "<REDACTED>"
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def encode_image(path: str) -> tuple[str, str]:
    ext = os.path.splitext(path)[1].lower()
    mime_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp",
        ".gif": "image/gif", ".bmp": "image/bmp"
    }
    media_type = mime_map.get(ext, "image/jpeg")
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8"), media_type


def analyze_ecommerce_scene(image_path: str, client: Groq) -> dict:
    b64, mime = encode_image(image_path)

    system_prompt = """You are an expert interior design and ecommerce AI assistant.
Analyze the provided room or product scene photograph and respond ONLY with valid JSON - no markdown, no extra text.

CRITICAL INSTRUCTIONS:
1. You MUST strictly separate 'aesthetic_style' and 'mood_feel'.
2. DO NOT use a 'mood_feel' value in the 'aesthetic_style' field.
3. You must select EXACTLY ONE option from the respective allowed lists below. Do not invent new categories.

ALLOWED AESTHETIC STYLES (Choose exactly 1):
"Minimalist", "Modern", "Industrial", "Maximalist", "Traditional", "Art Deco", "Cottagecore"

ALLOWED MOOD/FEELS (Choose exactly 1):
"Cosy & Inviting", "Sleek & Modern", "Serene & Calm", "Rustic & Warm", "Luxurious & Opulent", "Natural & Organic"

JSON schema:
{
  "aesthetic_style": "<MUST BE ONE OF THE 7 ALLOWED AESTHETIC STYLES>",
  "mood_feel": "<MUST BE ONE OF THE 6 ALLOWED MOOD/FEELS>",
  "category": "living room" | "party" | "kitchen" | "bedroom",
  "price_tier": "cheap" | "medium" | "premium" | "luxury",
  "dominant_colors": ["<string>", "<string>"],
  "color_palette": ["<string>", "<string>", "<string>"]
}
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    },
                    {
                        "type": "text",
                        "text": "Analyze this scene and return the required ecommerce attributes as JSON. Double check that aesthetic_style is chosen from its specific allowed list.",
                    },
                ],
            },
        ],
        temperature=0.1,
        max_tokens=512,
        top_p=1,
        stream=False,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def print_result(result: dict):
    style = result.get("aesthetic_style", "Unknown")
    mood = result.get("mood_feel", "Unknown")
    tier = result.get("price_tier", "Unknown")

    print("\n" + "-" * 50)
    print("  ECOMMERCE SCENE ANALYSIS")
    print("-" * 50)

    print(f"  Category        : {result.get('category', 'N/A').title()}")
    print(f"  Aesthetic Style : {style}")
    print(f"  Mood & Feel     : {mood}")
    print(f"  Price Tier      : {tier.title()}")

    if result.get("dominant_colors"):
        print(f"  Dominant Colors : {', '.join(result['dominant_colors'])}")
    if result.get("color_palette"):
        print(f"  Color Palette   : {', '.join(result['color_palette'])}")

    print("-" * 50)
    print("\n  -> Use these attributes for DB sorting, matching, or Smart Registry bundles.\n")


def main():
    print("\nEcommerce Visual Search & Analyzer\n")

    image_path = input("Enter path to room/product image: ").strip().strip('"').strip("'")

    if not os.path.isfile(image_path):
        print(f"\nError: File not found -> {image_path}")
        return

    print("\nAnalyzing interior design aesthetics... please wait...")

    client = Groq(api_key=API_KEY)

    try:
        result = analyze_ecommerce_scene(image_path, client)
    except json.JSONDecodeError as e:
        print(f"Failed to parse model response: {e}")
        return
    except Exception as e:
        print(f"API error: {e}")
        return

    print_result(result)

if __name__ == "__main__":
    main()
```

============================================================
15) ACCEPTANCE CHECKLIST
============================================================
- Two-role system (customer/admin)
- Registration + basic details
- 3-question quiz with required options and UI patterns
- Preferences persisted in DB
- Personalized home feed
- 4 GLB objects on home
- GLB click opens related catalog
- Add-to-cart and checkout completion
- Chatbot with DB-aware recommendation behavior
- Image-based soft filtering support
- CSV ingestion path for catalog data

END OF DOCUMENT
