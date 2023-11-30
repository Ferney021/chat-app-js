function gcd(a, b) {
  if (b === 0) {
    return a;
  }
  return gcd(b, a % b);
}
function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;

  if (num % 2 === 0 || num % 3 === 0) return false;

  let i = 5;
  while (i * i <= num) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
    i += 6;
  }

  return true;
}

function modInverse(e, phi) {
  let d = 0;
  let x1 = 0;
  let x2 = 1;
  let y1 = 1;
  let tempPhi = phi;

  while (e > 0) {
    const temp1 = Math.floor(tempPhi / e);
    const temp2 = tempPhi - temp1 * e;
    tempPhi = e;
    e = temp2;

    const x = x2 - temp1 * x1;
    const y = d - temp1 * y1;

    x2 = x1;
    x1 = x;
    d = y1;
    y1 = y;
  }

  if (tempPhi === 1) {
    return d + phi;
  }
}

function findPrimePairs(number) {
  const parejas = [];

  for (let i = 2; i <= number / 2; i++) {
    if (number % i === 0 && isPrime(i) && isPrime(number / i)) {
      parejas.push([i, number / i]);
    }
  }

  return parejas;
}

function generateKeypair(p, q) {
  const n = p * q;
  const phi = (p - 1) * (q - 1);
  let e = 2;

  while (e < phi) {
    if (gcd(e, phi) === 1) {
      break;
    } else {
      e++;
    }
  }

  const d = modInverse(e, phi);

  return {
    private: { d, n },
    public: { e, n },
  };
}

function decrypt(content, privateKey) {
  const { d, n } = privateKey;
  const decryptedMessage = content.split(",").map((charCode) => {
    const decrypted = BigInt(charCode) ** BigInt(d) % BigInt(n);
    return String.fromCharCode(Number(decrypted));
  });
  return decryptedMessage.join("");
}

const n_public_key = 8453;
const message = "6612,688,1881,2339,6612,688,7782,7168,7782";

const primePairs = findPrimePairs(n_public_key);
console.log(`Parejas de números primos que multiplican ${n_public_key}:`);
console.log(primePairs);

let index = 1;

for (let pair of primePairs) {
  const [p, q] = pair;
  const { private, public } = generateKeypair(p, q);
  const decryptedMessage = decrypt(message, private);
  console.log(`${index} intento de decifrado`, decryptedMessage);
  index++;
}
