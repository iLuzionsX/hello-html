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
  const moneyWhole = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
  const v = id => Math.max(0, parseFloat(els[id].value) || 0);
  const setHours = (id, value) => { els[id].value = roundHours(Math.max(0, value)).toFixed(2); };

  function humanDuration(decimalHours) {
    const totalMinutes = Math.max(0, Math.round(decimalHours * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    return `${minutes}m`;
  }

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
    const withheld = Math.max(0, r.grossOtPay - r.netOtPay);

    document.getElementById('timeDisplay').textContent = humanDuration(data.ot);
    document.getElementById('netOtPay').textContent = moneyWhole(r.netOtPay);
    document.getElementById('grossOtPay').textContent = `${moneyWhole(r.grossOtPay)} gross`;
    document.getElementById('withheldPay').textContent = `${moneyWhole(withheld)} withheld`;
    document.getElementById('grossOtPayDetailed').textContent = money(r.grossOtPay);
    document.getElementById('withheldDetailed').textContent = money(withheld);
    document.getElementById('netEffective').textContent = `${money(r.netEffective)}/hr`;
    document.getElementById('blended').textContent = `${money(r.blended)}/hr`;
    document.getElementById('formula').textContent =
      `Gross overtime includes straight time plus the extra half-time premium based on your blended regular rate. Estimated take-home is gross overtime × ${(r.takeHome * 100).toFixed(2)}%.`;

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
