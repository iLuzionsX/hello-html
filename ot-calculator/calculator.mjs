export function calculate({ base=0, ot=0, worked=0, reg=0, upsell=0, shift=0, other=0, takeHomeRate=63.45 }) {
  const regularPay = reg * base;
  const otStraight = ot * base;
  const includable = regularPay + otStraight + upsell + shift + other;
  const blended = worked > 0 ? includable / worked : 0;
  const premium = blended * 0.5 * ot;
  const grossOtPay = otStraight + premium;
  const effectiveGross = ot > 0 ? grossOtPay / ot : 0;
  const takeHome = Math.min(100, Math.max(0, takeHomeRate)) / 100;
  const netOtPay = grossOtPay * takeHome;
  const netEffective = ot > 0 ? netOtPay / ot : 0;
  return { regularPay, otStraight, includable, blended, premium, grossOtPay, effectiveGross, netOtPay, netEffective, takeHome };
}

const roundHours = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function syncFromOT(regularHours, otHours) {
  return roundHours(Math.max(0, regularHours) + Math.max(0, otHours));
}

export function syncFromWorked(workedHours, otHours) {
  return roundHours(Math.max(0, Math.max(0, workedHours) - Math.max(0, otHours)));
}

if (typeof document !== 'undefined') {
  const ids = ['base','otHours','worked','regularHours','upsell','shift','other','takeHomeRate'];
  const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number.isFinite(n)?n:0);
  const v = id => Math.max(0, parseFloat(els[id].value) || 0);
  const setHours = (id, value) => { els[id].value = roundHours(value).toFixed(2); };

  function render() {
    const data = {
      base:v('base'), ot:v('otHours'), worked:v('worked'), reg:v('regularHours'),
      upsell:v('upsell'), shift:v('shift'), other:v('other'), takeHomeRate:v('takeHomeRate')
    };
    const r = calculate(data);
    document.getElementById('netOtPay').textContent = money(r.netOtPay);
    document.getElementById('grossOtPay').textContent = money(r.grossOtPay);
    document.getElementById('blended').textContent = money(r.blended) + '/hr';
    document.getElementById('netEffective').textContent = money(r.netEffective) + '/hr';
    document.getElementById('formula').innerHTML = `Gross OT = ${money(r.otStraight)} straight time + ${money(r.premium)} premium = <b>${money(r.grossOtPay)}</b><br>Estimated net OT = ${money(r.grossOtPay)} × ${Math.min(100,data.takeHomeRate).toFixed(2)}% take-home = <b>${money(r.netOtPay)}</b><br>Blended regular rate = <b>${money(r.blended)}/hr</b>`;
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

  ['base','upsell','shift','other','takeHomeRate'].forEach(id => els[id].addEventListener('input', render));
  render();
}
