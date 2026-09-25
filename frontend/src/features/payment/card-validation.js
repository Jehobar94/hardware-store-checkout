export function getCardBrand(value) {
  const number = normalizeCardNumber(value);

  if (/^4/.test(number)) return 'visa';

  const firstTwo = Number(number.slice(0, 2));
  const firstFour = Number(number.slice(0, 4));
  if ((firstTwo >= 51 && firstTwo <= 55) || (firstFour >= 2221 && firstFour <= 2720)) {
    return 'mastercard';
  }

  return 'unknown';
}

export function isValidCardNumber(value) {
  const number = normalizeCardNumber(value);
  if (!/^\d{13,19}$/.test(number)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function normalizeCardNumber(value) {
  return String(value || '').replace(/\D/g, '');
}
