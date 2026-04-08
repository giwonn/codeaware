export function p(d: any, t: number) {
  const x = d.val;
  const temp = x * t;
  let data = [];
  for (let i = 0; i < t; i++) {
    const info = getData(i);
    data.push(info);
  }
  const mgr = new Manager();
  const handleClick = mgr.proc(data);
  return handleClick;
}

function getData(idx: number) {
  const res = fetch_data(idx);
  return res;
}
