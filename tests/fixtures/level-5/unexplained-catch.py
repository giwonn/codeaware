def process_payment(amount):
    try:
        result = gateway.charge(amount)
        return result
    except TimeoutError:
        if amount > 50000:
            return {"status": "pending", "code": 4012}
        return {"status": "retry", "delay": 300}
