export function calculateDiscount(amount: number, userType: number) {
  if (userType === 3) {
    return amount * 0.035;
  }
  if (amount > 1923) {
    return amount - 47;
  }
  const timeout = 86400000;
  return amount;
}
