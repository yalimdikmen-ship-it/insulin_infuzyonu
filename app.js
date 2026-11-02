const $ = (id) => document.getElementById(id);

const diabetes = $('diabetes');
const hba1c = $('hba1c');
const hba1cNotice = $('hba1cNotice');
const type1Notice = $('type1Notice');
const mode = $('mode');
const trendInputs = $('trendInputs');
const currentGlucose = $('currentGlucose');
const currentRate = $('currentRate');
const currentRateField = $('currentRateField');
const startDosePreview = $('startDosePreview');
const calculateBtn = $('calculateBtn');
const previousGlucose = $('previousGlucose');
const minutes = $('minutes');
const postHypo = $('postHypo');
const resultCard = $('resultCard');

function selectedTarget() {
  return document.querySelector('input[name="target"]:checked').value;
}

function targetRange() {
  return selectedTarget() === 'liberal' ? [140, 200] : [140, 180];
}

function updateNotices() {
  const a1c = parseFloat(hba1c.value);
  if (!Number.isNaN(a1c) && a1c > 8) {
    hba1cNotice.className = 'alert warn';
    hba1cNotice.innerHTML = '<strong>HbA1c &gt;%8:</strong> Hipoglisemi riski artabilir. Daha liberal hedef (140–200 mg/dL) hekim tarafından değerlendirilebilir.';
  } else if (!hba1c.value) {
    hba1cNotice.className = 'alert info';
    hba1cNotice.innerHTML = 'Son 3 ay içinde HbA1c yoksa ölçülmesi önerilir.';
  } else {
    hba1cNotice.className = 'alert ok';
    hba1cNotice.textContent = 'HbA1c için ek liberal hedef uyarısı yok.';
  }
  type1Notice.classList.toggle('hidden', diabetes.value !== 't1');
}

function updateStartPreview() {
  if (mode.value !== 'start') {
    startDosePreview.className = 'alert info hidden';
    return;
  }
  const g = parseFloat(currentGlucose.value);
  if (Number.isNaN(g)) {
    startDosePreview.className = 'alert info';
    startDosePreview.innerHTML = '<strong>Yeni başlangıç:</strong> Güncel glukozu girin; mevcut insülin dozu gerekmez.';
    return;
  }
  if (g < 70) {
    startDosePreview.className = 'alert danger';
    startDosePreview.innerHTML = '<strong>Başlatma önerilmez:</strong> Hipoglisemi protokolünü uygulayın.';
    return;
  }
  if (g < 180) {
    startDosePreview.className = 'alert info';
    startDosePreview.innerHTML = '<strong>Başlangıç dozu yok:</strong> Glukoz &lt;180 mg/dL; rutin IV insülin başlangıcı önerilmez.';
    return;
  }
  const sr = startRate(g);
  if (g > 400) {
    startDosePreview.className = 'alert warn';
    startDosePreview.innerHTML = `<strong>Başlangıç tablosu karşılığı: ${fmt(sr)} Ü/saat</strong> (${fmt(sr)} mL/saat, 1 Ü/mL). Ancak glukoz &gt;400 mg/dL olduğundan otomatik başlatma kapalıdır; DKA/HHS dışlanmalı ve hekim değerlendirmesi yapılmalıdır.`;
    return;
  }
  startDosePreview.className = 'alert ok';
  startDosePreview.innerHTML = `<strong>Önerilen başlangıç: ${fmt(sr)} Ü/saat</strong> • Pompa: ${fmt(sr)} mL/saat (1 Ü/mL).`;
}

function updateMode() {
  const isStart = mode.value === 'start';
  trendInputs.classList.toggle('hidden', isStart);
  currentRateField.classList.toggle('hidden', isStart);
  calculateBtn.textContent = isStart ? 'Başlangıç dozunu hesapla' : 'Öneriyi hesapla';
  if (isStart) currentRate.value = '';
  updateStartPreview();
}

function deltaStep(rate) {
  if (rate < 3) return 0.5;
  if (rate <= 6) return 1;
  if (rate <= 9.5) return 1.5;
  if (rate <= 14.5) return 2;
  if (rate <= 19.5) return 3;
  if (rate <= 24.5) return 4;
  return 5;
}

function fmt(n) {
  if (Number.isNaN(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function computeTrend(curr, prev, mins) {
  return (curr - prev) * 60 / mins;
}

function startRate(glucose) {
  if (glucose < 180) return null;
  if (glucose <= 216) return 1;
  if (glucose <= 270) return 2;
  if (glucose <= 324) return 3;
  return 4;
}

function rec(text, next, reason, actionRate = null) {
  return { text, next, reason, actionRate };
}

function titrate(curr, trend, rate, targetMode, wasHeld, postHypoValue) {
  const d = deltaStep(rate);
  const lowTarget = 140;
  const highTarget = targetMode === 'liberal' ? 200 : 180;

  if (curr < 70) {
    return rec('🔴 İnsülini DURDUR. YBÜ hipoglisemi protokolünü başlat: IV dekstroz uygula.', '15 dakika sonra glukoz kontrolü', 'Mutlak hipoglisemi güvenlik dalı.', 0);
  }
  if (curr <= 99) {
    return rec('🟠 İnsülini geçici DURDUR.', '30 dakika sonra glukoz kontrolü', '70–99 mg/dL hipoglisemi önleme zonu.', 0);
  }

  if (wasHeld) {
    if (curr < 140) {
      if (trend <= 0) return rec('İnsülin kapalı kalsın.', '30 dakika sonra tekrar ölç', 'İnfüzyon durdurulmuş ve glukoz hedef altı, stabil/düşüyor.', 0);
      return rec('Eski tam doza dönme. Glukoz yükseliyor; yeniden başlatma hekim değerlendirmesiyle yapılmalı.', '30–60 dakika sonra tekrar ölç', '100–139 mg/dL aralığında yeniden başlatma konservatif tutuldu.', 0);
    }
    const restart = postHypoValue === 'yes' ? rate * 0.5 : Math.max(0, rate - 2 * d);
    return rec(`İnsülini ${fmt(restart)} Ü/saat ile yeniden başlat.`, '30–60 dakika sonra glukoz kontrolü', postHypoValue === 'yes' ? 'Hipoglisemi sonrası yaklaşık %50 yeniden başlatma kuralı.' : 'Hızlı düşüş/ara verme sonrası azaltılmış hızla yeniden başlatma.', restart);
  }

  if (curr <= 139) {
    if (trend > 0) return rec(`Aynı hızla devam: ${fmt(rate)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', '100–139 mg/dL ve glukoz yükseliyor; doz artırılmaz.', rate);
    if (Math.abs(trend) < 5) {
      const nr = Math.max(0, rate - d);
      return rec(`İnsülini ${fmt(d)} Ü/saat azalt → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', '100–139 mg/dL ve yaklaşık stabil.', nr);
    }
    return rec('İnsülini geçici DURDUR.', '30 dakika sonra glukoz kontrolü', '100–139 mg/dL ve glukoz düşüyor.', 0);
  }

  // Target band
  if (curr >= lowTarget && curr <= highTarget) {
    const lowerPart = curr <= 159;
    const stopThreshold = 50;
    const reduceThreshold = lowerPart ? 20 : 30;
    // 140–159 mg/dL her iki modda standart davranır. Liberal modda 160–200 arasında yalnız yükseliş nedeniyle artış yapılmaz.
    const allowIncreaseInsideTarget = targetMode === 'standard' || lowerPart;
    if (trend > 50 && allowIncreaseInsideTarget) {
      const nr = rate + 2*d;
      return rec(`İnsülini ${fmt(2*d)} Ü/saat artır → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Hedefin alt bölümünde hızlı yükseliş.', nr);
    }
    if (trend >= 30 && allowIncreaseInsideTarget) {
      const nr = rate + d;
      return rec(`İnsülini ${fmt(d)} Ü/saat artır → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Hedefin alt bölümünde belirgin yükseliş.', nr);
    }
    if (trend < -stopThreshold) return rec('İnsülini geçici DURDUR.', '30 dakika sonra glukoz kontrolü', 'Hedef aralıkta hızlı düşüş.', 0);
    if (trend <= -reduceThreshold) {
      const nr = Math.max(0, rate - d);
      return rec(`İnsülini ${fmt(d)} Ü/saat azalt → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Hedef aralıkta anlamlı düşüş.', nr);
    }
    return rec(`Aynı hızla devam: ${fmt(rate)} Ü/saat.`, '1 saat sonra; iki ardışık stabil ölçüm sonrası 2 saate çıkarılabilir', 'Hedef aralıkta ve trend güvenli.', rate);
  }

  // Above target; different bands by target mode
  const firstUpper = targetMode === 'liberal' ? 270 : 250;
  if (curr <= firstUpper) {
    if (trend > 0) {
      const nr = rate + 2*d;
      return rec(`İnsülini ${fmt(2*d)} Ü/saat artır → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Hedef üstünde ve glukoz yükseliyor.', nr);
    }
    if (trend >= -25) {
      const nr = rate + d;
      return rec(`İnsülini ${fmt(d)} Ü/saat artır → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Hedef üstünde; düşüş yetersiz.', nr);
    }
    if (trend >= -50) return rec(`Aynı hızla devam: ${fmt(rate)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Hedef üstünde ancak uygun düşüş mevcut.', rate);
    if (trend >= -75) {
      const nr = Math.max(0, rate - d);
      return rec(`İnsülini ${fmt(d)} Ü/saat azalt → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Hedef üstünde fakat hızlı düşüş.', nr);
    }
    return rec('İnsülini geçici DURDUR.', '30 dakika sonra glukoz kontrolü', 'Hedef üstünde ancak aşırı hızlı düşüş.', 0);
  }

  if (curr <= 400) {
    if (trend >= -25) {
      const nr = rate + 2*d;
      return rec(`İnsülini ${fmt(2*d)} Ü/saat artır → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Belirgin hiperglisemi ve düşüş yetersiz.', nr);
    }
    if (trend >= -50) {
      const nr = rate + d;
      return rec(`İnsülini ${fmt(d)} Ü/saat artır → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Belirgin hiperglisemi; düşüş var ancak hedeflenen hızdan düşük.', nr);
    }
    if (trend >= -75) return rec(`Aynı hızla devam: ${fmt(rate)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Belirgin hiperglisemi ve uygun düşüş.', rate);
    if (trend >= -100) {
      const nr = Math.max(0, rate - d);
      return rec(`İnsülini ${fmt(d)} Ü/saat azalt → ${fmt(nr)} Ü/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Çok hızlı glukoz düşüşü.', nr);
    }
    return rec('İnsülini geçici DURDUR.', '30 dakika sonra glukoz kontrolü', 'Aşırı hızlı glukoz düşüşü.', 0);
  }

  return rec('🔴 Glukoz >400 mg/dL: otomatik titrasyonu durdur. Hekim değerlendirmesi; ölçümü, pompayı, hattı ve solüsyonu doğrula; DKA/HHS dışla.', '30–60 dakika içinde yeniden değerlendir', 'Güvenlik sınırı.', null);
}

function calculate() {
  const curr = parseFloat(currentGlucose.value);
  if (Number.isNaN(curr)) return alert('Güncel glukoz değerini girin.');
  const [lo, hi] = targetRange();
  const tMode = selectedTarget();

  let trend = null;
  let result;

  if (mode.value === 'start') {
    if (curr < 70) result = rec('🔴 İnfüzyon BAŞLATMA. Hipoglisemi protokolünü uygula.', '15 dakika sonra glukoz kontrolü', 'Başlangıçta hipoglisemi.', 0);
    else if (curr < 180) result = rec('IV insülin infüzyonu için rutin başlangıç endikasyonu yok.', 'Klinik duruma göre yeniden ölç', 'Kalıcı ≥180 mg/dL hiperglisemi olmadan rutin başlangıç önerilmez.', null);
    else if (curr > 400) result = rec('🔴 Glukoz >400 mg/dL: DKA/HHS dışla ve hekim değerlendirmesi yap. Genel YBÜ algoritmasıyla otomatik başlama yapma.', '30–60 dakika içinde yeniden değerlendir', 'Güvenlik sınırı.', null);
    else {
      const sr = startRate(curr);
      result = rec(`İnfüzyonu ${fmt(sr)} Ü/saat ile başlat. Pompa hızı: ${fmt(sr)} mL/saat.`, '30–60 dakika sonra glukoz kontrolü', 'Başlangıç tablosu: 180–216→1; 217–270→2; 271–324→3; >324→4 Ü/saat.', sr);
    }
  } else {
    const prev = parseFloat(previousGlucose.value);
    const mins = parseFloat(minutes.value);
    const rate = parseFloat(currentRate.value);
    if ([prev, mins, rate].some(Number.isNaN) || mins <= 0) return alert('Önceki glukoz, süre ve mevcut insülin hızını eksiksiz girin.');
    trend = computeTrend(curr, prev, mins);
    result = titrate(curr, trend, rate, tMode, mode.value === 'held', postHypo.value);
  }

  $('targetOut').textContent = `${lo}–${hi} mg/dL`;
  $('glucoseOut').textContent = `${fmt(curr)} mg/dL`;
  $('trendOut').textContent = trend === null ? 'Başlangıç' : `${trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} ${fmt(Math.abs(trend))} mg/dL/saat`;
  $('recommendation').innerHTML = `<strong>${result.text}</strong>`;
  $('nextCheck').textContent = `⏱ ${result.next}`;
  $('reasoning').textContent = result.reason;
  resultCard.classList.remove('hidden');
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

hba1c.addEventListener('input', updateNotices);
diabetes.addEventListener('change', updateNotices);
mode.addEventListener('change', updateMode);
currentGlucose.addEventListener('input', updateStartPreview);
calculateBtn.addEventListener('click', calculate);

document.querySelectorAll('input[name="target"]').forEach(el => el.addEventListener('change', () => {
  if (el.value === 'liberal' && el.checked) {
    const a1c = parseFloat(hba1c.value);
    if (!(a1c > 8)) {
      hba1cNotice.className = 'alert warn';
      hba1cNotice.textContent = 'Liberal hedef seçildi. Hedef değişikliği hekim kararıyla yapılmalıdır.';
    }
  } else {
    updateNotices();
  }
}));

updateNotices();
updateMode();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
window.addEventListener('online', () => $('offlineBadge').textContent = 'Çevrimiçi');
window.addEventListener('offline', () => $('offlineBadge').textContent = 'Offline');
