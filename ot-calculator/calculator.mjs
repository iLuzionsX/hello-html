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
  const setHours = (id, value) => { els[id].value = roundHours(Math.max(0, value)).toFixed(2); };
  const displayHours = value => Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '');

  function syncPresetState(ot) {
    document.querySelectorAll('.preset[data-ot-set]').forEach(button => {
      const selected = Math.abs((parseFloat(button.dataset.otSet) || 0) - ot) < 0.001;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

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

    const keepRate = document.getElementById('keepRate');
    if (keepRate) keepRate.textContent = (r.takeHome * 100).toFixed(2) + '%';

    const resultHours = document.getElementById('resultHours');
    if (resultHours) resultHours.textContent = `${displayHours(data.ot)}h OT`;

    const profileSummary = document.getElementById('profileSummary');
    if (profileSummary) profileSummary.textContent = `${money(data.base)}/hr · ${(r.takeHome * 100).toFixed(2)}% keep`;

    document.getElementById('formula').innerHTML =
      `Gross OT = ${money(r.otStraight)} straight time + ${money(r.premium)} premium = <b>${money(r.grossOtPay)}</b><br>` +
      `Estimated net OT = ${money(r.grossOtPay)} × ${(r.takeHome * 100).toFixed(2)}% take-home = <b>${money(r.netOtPay)}</b><br>` +
      `Blended regular rate = <b>${money(r.blended)}/hr</b>`;

    syncPresetState(data.ot);
  }

  function updateFromOT(value) {
    setHours('otHours', value);
    setHours('worked', syncFromOT(v('regularHours'), v('otHours')));
    render();
  }

  els.otHours.addEventListener('input', () => {
    setHours('worked', syncFromOT(v('regularHours'), v('otHours')));
    render();
  });

  els.otHours.addEventListener('blur', () => updateFromOT(v('otHours')));

  els.regularHours.addEventListener('input', () => {
    setHours('worked', syncFromOT(v('regularHours'), v('otHours')));
    render();
  });

  if (!els.worked.readOnly) {
    els.worked.addEventListener('input', () => {
      setHours('regularHours', syncFromWorked(v('worked'), v('otHours')));
      render();
    });
  }

  document.querySelectorAll('[data-ot-add]').forEach(button => {
    button.addEventListener('click', () => updateFromOT(v('otHours') + (parseFloat(button.dataset.otAdd) || 0)));
  });

  document.querySelectorAll('[data-ot-set]').forEach(button => {
    button.addEventListener('click', () => updateFromOT(parseFloat(button.dataset.otSet) || 0));
  });

  ['base','upsell','shift','other','takeHomeRate'].forEach(id => els[id].addEventListener('input', render));

  document.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.open);
      if (dialog && !dialog.open) dialog.showModal();
    });
  });

  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
  });

  render();
}
