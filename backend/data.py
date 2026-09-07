import random
from datetime import datetime, timedelta

random.seed(42)

REGIONS = ["North", "South", "East", "West"]
PRODUCTS = [
    "Aurora Desk Lamp",
    "Nimbus Office Chair",
    "Vertex Standing Desk",
    "Halo Monitor Arm",
    "Zenith Keyboard",
    "Comet Webcam",
]


def generate_dataset(num_rows: int = 400):
    rows = []
    start_date = datetime(2025, 1, 1)

    for i in range(num_rows):
        rows.append(
            {
                "id": i + 1,
                "date": (start_date + timedelta(days=random.randint(0, 240))).strftime(
                    "%Y-%m-%d"
                ),
                "region": random.choice(REGIONS),
                "product": random.choice(PRODUCTS),
                "customer": f"Customer {random.randint(100, 999)}",
                "revenue": round(random.uniform(50, 2500), 2),
            }
        )

    return rows
