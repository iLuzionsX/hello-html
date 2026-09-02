export function calculate({ base=0, ot=0, worked=0, reg=0, upsell=0, shift=0, other=0 }) {
  const regularPay = reg * base;
  const otStraight = ot * base;
  const includable = regularPay + otStraight + upsell + shift + other;
  const blended = worked > 0 ? includable / worked : 0;
  const premium = blended * 0.5 * ot;
  const otPay = otStraight + premium;
  const effective = ot > 0 ? otPay / ot : 0;
  return { regularPay, otStraight, includable, blended, premium, otPay, effective };
}

export function syncFromOT(regularHours, otHours) {
  return Math.max(0, regularHours) + Math.max(0, otHours);
}

export function syncFromWorked(workedHours, otHours) {
  return Math.max(0, Math.max(0, workedHours) - Math.max(0, otHours));
}

if (typeof document !== 'undefined') {
  const ids = ['base','otHours','worked','regularHours','upsell','shift','other'];
  const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number.isFinite(n)?n:0);
  const v = id => Math.max(0, parseFloat(els[id].value) || 0);
  const setHours = (id, value) => { els[id].value = Number(value.toFixed(2)); };

  function render() {
    const data = { base:v('base'), ot:v('otHours'), worked:v('worked'), reg:v('regularHours'), upsell:v('upsell'), shift:v('shift'), other:v('other') };
    const r = calculate(data);
    document.getElementById('otPay').textContent = money(r.otPay);
    document.getElementById('blended').textContent = money(r.blended) + '/hr';
    document.getElementById('premium').textContent = money(r.premium);
    document.getElementById('effective').textContent = money(r.effective) + '/hr';
    document.getElementById('formula').innerHTML = `Blended rate = (${money(r.regularPay)} regular + ${money(r.otStraight)} OT straight + ${money(data.upsell)} upsell + ${money(data.shift)} shift diff + ${money(data.other)} other) ÷ ${data.worked.toFixed(2)} worked hours = <b>${money(r.blended)}/hr</b><br>OT premium = ${money(r.blended)} × 0.5 × ${data.ot.toFixed(2)} = <b>${money(r.premium)}</b><br>Total OT pay = ${money(r.otStraight)} + ${money(r.premium)} = <b>${money(r.otPay)}</b>`;
  }

  els.otHours.addEventListener('input', () => {
    setHours('worked', syncFromOT(v('regularHours'), v('otHours')));
    render();
  });

  els.regularHours.addEventListener('input', () => {
    setHours('worked', syncFromOT(v('regularHours'), v('otHours')));
    render();
  });

  els.worked.addEventListener('input', () => {
    setHours('regularHours', syncFromWorked(v('worked'), v('otHours')));
    render();
  });

  ['base','upsell','shift','other'].forEach(id => els[id].addEventListener('input', render));
  render();
}
