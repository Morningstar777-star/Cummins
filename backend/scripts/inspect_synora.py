import os
from pprint import pprint

from pymongo import MongoClient


MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    "mongodb+srv://patilyashraj777_db_user:WBHh6tX2nP6BxtPH@cluster0.dvyl27d.mongodb.net/?appName=Cluster0",
)

client = MongoClient(MONGODB_URI)
db = client["synora_database"]

print("Collections:", db.list_collection_names())
for name in db.list_collection_names():
    count = db[name].count_documents({})
    print(f"- {name}: {count}")

# Try likely product collections
for col_name in ["products", "product", "items", "catalog"]:
    if col_name in db.list_collection_names():
        print(f"\nSample from '{col_name}':")
        doc = db[col_name].find_one()
        pprint(doc)
        break
