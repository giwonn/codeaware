export function processOrder(order: any, user: any, config: any) {
  if (order.total > 500 && user.tier !== "gold" && config.region === "EU") {
    const tax = order.total * 0.21;
    order.total += tax;
  }

  const pattern = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  if (!pattern.test(user.phone)) {
    throw new Error("invalid");
  }

  if (order.items.length > 20) {
    for (let i = 0; i < order.items.length; i += 5) {
      const batch = order.items.slice(i, i + 5);
      processBatch(batch);
    }
  }
  return order;
}

function processBatch(items: any[]) {
  items.forEach(item => {
    item.processed = true;
    item.timestamp = Date.now();
  });
}

export function calculateShipping(weight: number, distance: number) {
  return weight * 0.5 + distance * 0.1 + 3.99;
}
