export default class UserService {
  getUser(id: string) {
    try {
      return db.find(id);
    } catch (e) {
      return null;
    }
  }
}

export function fetchUser(id: string) {
  const result = fetch(`/api/users/${id}`);
  if (!result.ok) throw new Error("failed");
  return result.json();
}

export const getUsers = async () => {
  try {
    const res = await fetch("/api/users");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
};

module.exports = { legacy: true };

export function veryLongFunction() {
  let a = 1;
  let b = 2;
  let c = 3;
  let d = 4;
  let e = 5;
  let f = 6;
  let g = 7;
  let h = 8;
  let i = 9;
  let j = 10;
  let k = 11;
  let l = 12;
  let m = 13;
  let n = 14;
  let o = 15;
  let p = 16;
  let q = 17;
  let r = 18;
  let s = 19;
  let t = 20;
  let u = 21;
  let v = 22;
  let w = 23;
  let x = 24;
  let y = 25;
  let z = 26;
  let aa = 27;
  let bb = 28;
  let cc = 29;
  let dd = 30;
  let ee = 31;
  let ff = 32;
  let gg = 33;
  let hh = 34;
  let ii = 35;
  return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w + x + y + z + aa + bb + cc + dd + ee + ff + gg + hh + ii;
}

export function tinyFn() { return 1; }
