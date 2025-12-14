import requests
import datetime
import sys

BASE_URL = "http://localhost:8000"

def log(msg, status="INFO"):
    colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m",
        "ERROR": "\033[91m",
        "RESET": "\033[0m"
    }
    print(f"{colors.get(status, '')}[{status}] {msg}{colors['RESET']}")

def check(condition, msg):
    if condition:
        log(f"PASS: {msg}", "SUCCESS")
    else:
        log(f"FAIL: {msg}", "ERROR")
        sys.exit(1)

def run_test():
    log("Starting Full System Verification...")
    
    # 1. Create Owner
    ts = int(datetime.datetime.now().timestamp())
    owner_name = f"Tester_{ts}"
    log(f"Creating Owner: {owner_name}")
    r = requests.post(f"{BASE_URL}/owners/", json={"name": owner_name, "equity_percentage": 0})
    check(r.status_code == 200, "Owner created")
    owner = r.json()
    owner_id = owner['id']

    # 2. Create Product
    prod_name = f"TestWidget_{ts}"
    log(f"Creating Product: {prod_name}")
    r = requests.post(f"{BASE_URL}/products/", json={
        "name": prod_name, 
        "sku": f"SKU_{ts}", 
        "cost_price": 0,
        "equities": [{"owner_id": owner_id, "equity_percentage": 50}] # 50% equity
    })
    check(r.status_code == 200, "Product created")
    product = r.json()
    product_id = product['id']

    # 3. Add Inventory Batch 1
    # 10 units @ £10 -> Value £100.
    log("Adding Inventory Batch 1: 10 @ £10")
    r = requests.post(f"{BASE_URL}/inventory/batch", json={
        "product_id": product_id,
        "quantity": 10,
        "landing_price": 10.0
    })
    check(r.status_code == 200, "Batch 1 added")
    
    # Verify AVCO = 10.0
    r = requests.get(f"{BASE_URL}/products/")
    products = r.json()
    p = next(p for p in products if p['id'] == product_id)
    check(p['cost_price'] == 10.0, f"AVCO is £10.00 (Got {p['cost_price']})")

    # 4. Add Inventory Batch 2
    # 10 units @ £20 -> Value £200.
    # Total Units: 20. Total Value: £300. AVCO: £15.00
    log("Adding Inventory Batch 2: 10 @ £20")
    r = requests.post(f"{BASE_URL}/inventory/batch", json={
        "product_id": product_id,
        "quantity": 10,
        "landing_price": 20.0
    })
    check(r.status_code == 200, "Batch 2 added")

    # Verify AVCO = 15.0
    r = requests.get(f"{BASE_URL}/products/")
    products = r.json()
    p = next(p for p in products if p['id'] == product_id)
    check(p['cost_price'] == 15.0, f"AVCO updated to £15.00 (Got {p['cost_price']})")

    # 5. Record Sale (Daily Entry)
    # Sell 5 units @ £50 each.
    # Revenue: £250.
    # COGS: 5 * £15 = £75.
    # Expected Gross Profit from Sale: £175.
    today = datetime.date.today().isoformat()
    log(f"Creating Daily Report for {today}")
    
    # First create report wrapper
    r = requests.post(f"{BASE_URL}/reports/", json={
        "date": today,
        "total_ad_spend": 25.0
    })
    if r.status_code == 400:
        log("Report for today likely exists, fetching existing...", "INFO")
        # In a real test we might want unique date, but for now we append to today's report or fail if restrictive.
        # Let's just create a sale on existing report or new one. The API behavior for 'create' 400s if exists.
        # We need the report ID.
        r = requests.get(f"{BASE_URL}/reports/")
        reports = r.json()
        report = next((r for r in reports if r['date'] == today), None)
        if not report:
             sys.exit("Could not find or create report")
    else:
        check(r.status_code == 200, "Daily Report created")
        report = r.json()
    
    report_id = report['id']

    log("Recording Sale: 5 units @ £50")
    r = requests.post(f"{BASE_URL}/sales/", json={
        "report_id": report_id,
        "product_id": product_id,
        "quantity": 5,
        "selling_price": 50.0
    })
    check(r.status_code == 200, "Sale recorded")

    # 6. Check Dashboard Stats (Profit Calculation)
    # Note: Stats aggregate properly? This test assumes we are isolating or can calculate delta.
    # If other data exists, exact matching stats is hard.
    # Instead, let's check Owner Profit directly which isolates by owner usually? No, owner profit is global share.
    # BUT, we have a specific product with specific equity.
    # This owner has 50% of this product.
    # Product Profit = (Price - Cost) * Qty = (50 - 15) * 5 = £175.
    # Owner Share = 50% of £175 = £87.50.
    # WAIT: Ad Spend is Global.
    # If Ad Spend is £25, how is it distributed?
    # Usually Ad Spend is deducted from global profit or distributed? 
    # Current logic: Net Profit = Total Revenue - Total COGS - Total Ad Spend.
    # Owner Profit Distribution Logic: 
    #   Product Specific Profit = (Sales * Price) - (Sales * COGS).
    #   Owner gets % of Product Profit.
    #   Global Expenses (Ads + Expenses) are deducted from Owner Total based on... equity? or split equally?
    #   Let's check logic in `distribute_daily_profit`.
    #   Actually `get_owner_profit_breakdown` logic:
    #       1. Sums up all product profits per owner equities.
    #       2. Distributes "Global Costs" (Ads + Expenses) proportional to total profit share or equity?
    #       Let's re-verify `crud.py` logic.
    
    log("Verifying Profit Logic...")
    # Just checking if the sale increased the owner's total profit by somewhat correct amount.
    # Since we can't easily isolate from other data in a shared DB, we look for our specific numbers if possible or just sanity check.
    
    r = requests.get(f"{BASE_URL}/stats/owner-profits")
    owners_data = r.json()
    tester = next(o for o in owners_data if o['id'] == owner_id)
    
    prod_profit_entry = next((item for item in tester['breakdown'] if item['name'] == prod_name), None)
    
    # Expected Product Profit: £175 * 0.5 = £87.50
    check(prod_profit_entry is not None, "Product profit entry found")
    # Floating point tolerance
    abs_diff = abs(prod_profit_entry['amount'] - 87.50)
    check(abs_diff < 0.02, f"Owner Product Share is £87.50 (Got £{prod_profit_entry['amount']})")
    
    balance_before = tester['balance']
    
    # 7. Record Payment
    log("Recording Payment of £10.00")
    r = requests.post(f"{BASE_URL}/owners/payment", json={
        "owner_id": owner_id,
        "amount": 10.0
    })
    check(r.status_code == 200, "Payment recorded")
    
    # 8. Verify Balance Update
    r = requests.get(f"{BASE_URL}/stats/owner-profits")
    owners_data = r.json()
    tester_updated = next(o for o in owners_data if o['id'] == owner_id)
    
    expected_balance = round(balance_before - 10.0, 2)
    check(tester_updated['balance'] == expected_balance, f"Balance updated correctly to £{expected_balance} (Got £{tester_updated['balance']})")
    check(tester_updated['total_paid'] == 10.0, "Total Paid is £10.00")

    # 9. Verify History Log
    log("Verifying Payment History Log")
    r = requests.get(f"{BASE_URL}/owners/payments")
    payments = r.json()
    last_payment = payments[0] # Should be ours since we just made it'
    if last_payment['owner_id'] == owner_id:
        check(last_payment['amount'] == 10.0, "Payment history amount matches")
        check(last_payment['transaction_type'] == "PAYOUT", "Transaction type is PAYOUT")
    else:
        # scan for it
        found = any(p['owner_id'] == owner_id and p['amount'] == 10.0 for p in payments)
        check(found, "Payment found in history")

    log("ALL SYSTEMS VERIFIED SUCCESSFULLY.", "SUCCESS")

if __name__ == "__main__":
    run_test()
