const empreendimentoEl = document.getElementById('empreendimento');
const unidadeEl = document.getElementById('unidade');
const valorTotalEl = document.getElementById('valorTotal');
const percentualEntradaEl = document.getElementById('percentualEntrada');
const percentualAtoEl = document.getElementById('percentualAto');
const valorEntradaEl = document.getElementById('valorEntrada');
const valorAtoEl = document.getElementById('valorAto');
const habiteSeEl = document.getElementById('habiteSe');
const percentualImobiliariaEl = document.getElementById('percentualImobiliaria');
const percentualConstrutoraEl = document.getElementById('percentualConstrutora');
const valorImobiliariaEl = document.getElementById('valorImobiliaria');
const valorConstrutoraEl = document.getElementById('valorConstrutora');
const parcelasTableBody = document.querySelector('#parcelasTable tbody');
const calcularBtn = document.getElementById('calcularBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const addRowBtn = document.getElementById('addRow');
const calculateSuggestionBtn = document.getElementById('calculateSuggestionBtn');
const totalEntradaEl = document.getElementById('totalEntrada');
const valorAtoResumoEl = document.getElementById('valorAtoResumo');
const totalParcelasEl = document.getElementById('totalParcelas');
const saldoEntradaEl = document.getElementById('saldoEntrada');
const valorFinalEl = document.getElementById('valorFinal');

// utils: format/parse currency (moved up to avoid TDZ errors)
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseCurrency = (str) => {
  if (str === undefined || str === null) return 0;
  if (typeof str === 'number') return str;

  let value = String(str).trim();
  if (!value) return 0;

  // remove currency symbols and spaces
  value = value.replace(/[^0-9.,-]+/g, '');
  const commaCount = (value.match(/,/g) || []).length;
  const dotCount = (value.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    // Brazilian style: dots as thousand separators, comma as decimal separator
    value = value.replace(/\./g, '').replace(/,/g, '.');
  } else if (commaCount > 0 && dotCount === 0) {
    // only comma: use comma as decimal separator
    value = value.replace(/,/g, '.');
  } else if (dotCount > 0 && commaCount === 0) {
    // only dot: if there are exactly 3 digits after the last dot, it may be thousand separator
    const lastDotIndex = value.lastIndexOf('.');
    if (value.length - lastDotIndex - 1 === 3) {
      value = value.replace(/\./g, '');
    }
  }

  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

// Abas (tabs) e simulador
const tabButtons = document.querySelectorAll('.tab');
const propostaTabEl = document.getElementById('propostaTab');
const simuladorTabEl = document.getElementById('simuladorTab');
const simCalculateBtn = document.getElementById('simCalculate');
const simApplyBtn = document.getElementById('simApply');
const simTotalEl = document.getElementById('simTotal');
const modelSelect = document.getElementById('modelSelect');
const modelNameEl = document.getElementById('modelName');
const modelAreaEl = document.getElementById('modelArea');

let MODELS = [];

const loadModels = async () => {
  try {
    const res = await fetch('data/models.json');
    MODELS = await res.json();
    // populate select
    modelSelect.innerHTML = '';
    MODELS.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      modelSelect.appendChild(opt);
      if (i === 0) {
        // set initial
        applyModel(m);
      }
    });
    modelSelect.addEventListener('change', () => {
      const id = modelSelect.value;
      const m = MODELS.find(x => x.id === id);
      if (m) applyModel(m);
    });
  } catch (e) {
    console.error('Erro ao carregar models.json', e);
  }
};

const SIM_ROW_KEYS = ['sinal', '306090', 'mensais', 'semestrais', 'unica', 'financiamento'];

const applyModel = (m) => {
  const title = m.name.replace(m.area, '').trim();
  modelNameEl.textContent = title;
  modelAreaEl.textContent = m.area;
  // update banner image (falls back to a placeholder icon if the asset is missing/broken)
  const bannerRight = document.querySelector('.sim-banner-right');
  if (bannerRight) {
    bannerRight.style.backgroundImage = '';
    bannerRight.classList.remove('placeholder');
    const probe = new Image();
    probe.onload = () => {
      bannerRight.style.backgroundImage = `url('${m.image}')`;
    };
    probe.onerror = () => {
      bannerRight.classList.add('placeholder');
    };
    probe.src = m.image;
  }
  // set fixed price target
  valorTotalEl.dataset.raw = String(m.price);
  valorTotalEl.value = formatCurrency(m.price);

  // populate simulator rows with this model's breakdown
  if (m.breakdown) {
    SIM_ROW_KEYS.forEach((key) => {
      const data = m.breakdown[key];
      const row = document.querySelector(`#simuladorTab tbody tr[data-key="${key}"]`);
      if (!data || !row) return;
      const qtyEl = row.querySelector('.sim-qty');
      const unitEl = row.querySelector('.sim-unit');
      qtyEl.value = data.qty;
      unitEl.value = formatCurrency(data.unit);
      unitEl.dataset.raw = String(data.unit);
    });
    updateSimTotals();
  }
};

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;
    if (target === 'propostaTab') {
      propostaTabEl.style.display = '';
      simuladorTabEl.style.display = 'none';
    } else {
      propostaTabEl.style.display = 'none';
      simuladorTabEl.style.display = '';
    }
  });
});

const updateSimTotals = () => {
  const rows = Array.from(document.querySelectorAll('#simuladorTab tbody tr'));
  let grandTotal = 0;
  rows.forEach((row) => {
    const qtyEl = row.querySelector('.sim-qty');
    const unitEl = row.querySelector('.sim-unit');
    const totalEl = row.querySelector('.sim-total');
    const qty = Number(qtyEl.value) || 0;
    const unit = parseCurrency(unitEl.value || unitEl.dataset.raw || unitEl.textContent) || 0;
    const series = qty * unit;
    totalEl.value = formatCurrency(series);
    totalEl.dataset.raw = String(series);
    unitEl.dataset.raw = String(unit);
    grandTotal += series;
  });
  simTotalEl.textContent = formatCurrency(grandTotal);
  return grandTotal;
};

// wire up simulator inputs: format on focus/blur and recalc on change
document.querySelectorAll('#simuladorTab .sim-unit').forEach((el) => {
  el.addEventListener('focus', () => {
    el.value = el.dataset.raw ?? (el.value ? String(parseCurrency(el.value)) : '0');
  });
  el.addEventListener('blur', () => {
    el.dataset.raw = el.value.replace(/[^0-9,.-]+/g, '');
    el.value = formatCurrency(parseCurrency(el.value));
    updateSimTotals();
  });
});
document.querySelectorAll('#simuladorTab .sim-qty').forEach((el) => {
  el.addEventListener('input', () => updateSimTotals());
});

if (simCalculateBtn) simCalculateBtn.addEventListener('click', (e) => {
  e.preventDefault();
  console.log('simCalculate clicked');
  const grandTotal = updateSimTotals();

  // ajusta a soma do simulador para bater com o Valor do Imóvel do modelo selecionado
  const target = parseCurrency(valorTotalEl.dataset.raw ?? valorTotalEl.value) || 0;
  if (target > 0) {
    const diff = Math.round((target - grandTotal) * 100) / 100;
    if (Math.abs(diff) >= 0.01) {
      const rows = Array.from(document.querySelectorAll('#simuladorTab tbody tr'));
      if (rows.length) {
        // preferir ajustar em ordem: mensais, sinal, 306090, semestrais, unica, financiamento
        const preference = ['mensais', 'sinal', '306090', 'semestrais', 'unica', 'financiamento'];
        let targetRow = null;
        for (const key of preference) {
          const r = document.querySelector(`#simuladorTab tbody tr[data-key="${key}"]`);
          if (r) { targetRow = r; break; }
        }
        if (!targetRow) {
          // fallback: last adjustable row (has editable .sim-unit)
          targetRow = rows.slice().reverse().find(r => r.querySelector('.sim-unit') && !r.querySelector('.sim-unit').hasAttribute('readonly')) || rows[rows.length - 1];
        }

        const qtyEl = targetRow.querySelector('.sim-qty');
        const unitEl = targetRow.querySelector('.sim-unit');
        const totalEl = targetRow.querySelector('.sim-total');
        const qty = Number(qtyEl.value) || 1;
        const currentSeries = parseCurrency(totalEl.value) || 0;

        let updatedSeries = Math.round((currentSeries + diff) * 100) / 100;
        // don't allow negative series; if would be negative, try next candidate
        if (updatedSeries < 0) {
          // try other adjustable rows
          const other = rows.filter(r => r !== targetRow);
          let applied = false;
          // distribuir diff proporcionalmente entre as linhas ajustáveis como fallback
          const adjustable = other.filter(r => r.querySelector('.sim-unit'));
          const totalAdjustable = adjustable.reduce((acc, r) => acc + (parseCurrency(r.querySelector('.sim-total').value) || 0), 0) || adjustable.length;
          if (adjustable.length) {
            adjustable.forEach((r) => {
              const qty2 = Number(r.querySelector('.sim-qty').value) || 1;
              const current2 = parseCurrency(r.querySelector('.sim-total').value) || 0;
              // share by current proportion, fallback to even
              const share = totalAdjustable > 0 ? (current2 / totalAdjustable) : (1 / adjustable.length);
              const updated2 = Math.max(0, Math.round((current2 + diff * share) * 100) / 100);
              r.querySelector('.sim-total').value = formatCurrency(updated2);
              r.querySelector('.sim-total').dataset.raw = String(updated2);
              r.querySelector('.sim-unit').value = formatCurrency(Math.round((updated2 / qty2) * 100) / 100);
              r.classList.add('adjusted');
              setTimeout(() => r.classList.remove('adjusted'), 1200);
            });
            applied = true;
          }
          if (!applied) {
            updatedSeries = 0;
          }
        }

        // Apply to selected row (clamp at zero)
        updatedSeries = Math.max(0, Math.round(updatedSeries * 100) / 100);
        const updatedUnit = qty > 0 ? Math.round((updatedSeries / qty) * 100) / 100 : 0;
        totalEl.value = formatCurrency(updatedSeries);
        totalEl.dataset.raw = String(updatedSeries);
        unitEl.value = formatCurrency(updatedUnit);
        unitEl.dataset.raw = String(updatedUnit);
        targetRow.classList.add('adjusted');
        setTimeout(() => targetRow.classList.remove('adjusted'), 1200);

        // recalcula e atualiza exibição
        updateSimTotals();
      }
    }
  }
});
const SIM_ROW_LABELS = {
  sinal: 'Sinal',
  '306090': '30/60/90',
  mensais: 'Mensal',
  semestrais: 'Semestral',
  unica: 'Única',
  financiamento: 'Financiamento',
};

if (simApplyBtn) simApplyBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const total = updateSimTotals();
  // apply to valor do imóvel
  valorTotalEl.dataset.raw = String(total);
  valorTotalEl.value = formatCurrency(total);

  // recria a Programação de Pagamentos a partir do simulador
  parcelasTableBody.innerHTML = '';
  SIM_ROW_KEYS.forEach((key) => {
    const row = document.querySelector(`#simuladorTab tbody tr[data-key="${key}"]`);
    if (!row) return;
    const qty = Number(row.querySelector('.sim-qty').value) || 0;
    if (qty <= 0) return;
    const unit = parseCurrency(row.querySelector('.sim-unit').value) || 0;
    const serie = parseCurrency(row.querySelector('.sim-total').value) || unit * qty;
    addRow({
      periodicidade: SIM_ROW_LABELS[key] || key,
      parcelas: qty,
      valorUnitario: unit,
      valorSerie: serie,
    });
  });

  updateEntrada();
  calculateProposal();
  // switch to proposta tab
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab[data-target="propostaTab"]').classList.add('active');
  propostaTabEl.style.display = '';
  simuladorTabEl.style.display = 'none';
});

// inicializa valores do simulador
updateSimTotals();
// carregar modelos
loadModels();

const createCell = (tag, content = '', className = '') => {
  const cell = document.createElement(tag);
  if (className) cell.className = className;
  if (typeof content === 'string' || typeof content === 'number') {
    cell.textContent = content;
  } else {
    cell.appendChild(content);
  }
  return cell;
};

const PERIODICIDADE_OPTIONS = ['Sinal', '30/60/90', 'Mensal', 'Semestral', 'Única', 'Financiamento', 'Ato Imobiliária', 'Ato Construtora'];

const addRow = (initial = {}) => {
  const row = document.createElement('tr');
  const dateInput = document.createElement('input');
  dateInput.type = 'month';
  if (initial.data) dateInput.value = initial.data;

  const periodicidadeInput = document.createElement('select');
  PERIODICIDADE_OPTIONS.forEach((optionText) => {
    const option = document.createElement('option');
    option.value = optionText;
    option.textContent = optionText;
    periodicidadeInput.appendChild(option);
  });
  if (initial.periodicidade) periodicidadeInput.value = initial.periodicidade;

  const parcelas = initial.parcelas ?? 1;
  const parcelasInput = document.createElement('input');
  parcelasInput.type = 'number';
  parcelasInput.min = '1';
  parcelasInput.value = String(parcelas);

  const unit = initial.valorUnitario ?? 0;
  const valorUnitarioInput = document.createElement('input');
  valorUnitarioInput.type = 'text';
  valorUnitarioInput.className = 'currency';
  valorUnitarioInput.value = formatCurrency(unit);
  valorUnitarioInput.dataset.raw = String(unit);

  const serie = initial.valorSerie ?? unit * parcelas;
  const valorSerieInput = document.createElement('input');
  valorSerieInput.type = 'text';
  valorSerieInput.className = 'currency';
  valorSerieInput.value = formatCurrency(serie);
  valorSerieInput.dataset.raw = String(serie);

  const obsInput = document.createElement('input');
  obsInput.type = 'text';
  obsInput.className = 'obs';
  obsInput.placeholder = 'Observação (opcional)';
  if (initial.obs) obsInput.value = initial.obs;
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.textContent = 'Remover';
  removeButton.className = 'danger';
  removeButton.addEventListener('click', () => {
    row.remove();
    calculateProposal();
  });

  const syncValuesFromUnit = () => {
    const parcelas = Number(parcelasInput.value) || 1;
    const unit = parseCurrency(valorUnitarioInput.value) || 0;
    const serie = unit * parcelas;
    valorSerieInput.value = formatCurrency(serie);
  };

  const syncValuesFromSerie = () => {
    const parcelas = Number(parcelasInput.value) || 1;
    const serie = parseCurrency(valorSerieInput.value) || 0;
    const unit = parcelas > 0 ? serie / parcelas : 0;
    valorUnitarioInput.value = formatCurrency(unit);
  };

  valorUnitarioInput.addEventListener('input', () => {
    // allow typing numbers; keep as raw while typing
    // remove formatting while typing
    const cleaned = valorUnitarioInput.value.replace(/[^0-9,.-]/g, '');
    valorUnitarioInput.dataset.raw = cleaned;
    try { syncValuesFromUnit(); } catch(e){}
  });

  parcelasInput.addEventListener('input', () => {
    try { syncValuesFromUnit(); } catch(e){}
  });

  valorSerieInput.addEventListener('input', () => {
    const cleaned = valorSerieInput.value.replace(/[^0-9,.-]/g, '');
    valorSerieInput.dataset.raw = cleaned;
    try { syncValuesFromSerie(); } catch(e){}
  });

  // format on blur, and show numeric on focus
  [valorUnitarioInput, valorSerieInput].forEach((el) => {
    el.addEventListener('focus', () => {
      el.value = el.dataset.raw || (el.value ? String(parseCurrency(el.value)) : '0');
    });
    el.addEventListener('blur', () => {
      el.dataset.raw = el.value;
      el.value = formatCurrency(parseCurrency(el.value));
    });
  });

  [dateInput, periodicidadeInput, parcelasInput, valorUnitarioInput, valorSerieInput, obsInput].forEach((input) => {
    const td = document.createElement('td');
    td.appendChild(input);
    row.appendChild(td);
  });

  const actionCell = document.createElement('td');
  actionCell.appendChild(removeButton);
  row.appendChild(actionCell);

  parcelasTableBody.appendChild(row);
};

const updateEntrada = (source = 'percent') => {
  const rawValorTotal = valorTotalEl.dataset.raw ?? valorTotalEl.value;
  const valorTotal = parseCurrency(rawValorTotal) || 0;
  let percentual = Number(percentualEntradaEl.value) || 0;
  const percentualImobiliaria = Number(percentualImobiliariaEl.value) || 0;
  const percentualConstrutora = Number(percentualConstrutoraEl.value) || 0;

  // percentual Ato is always the sum of Imobiliaria + Construtora
  const percentualAto = percentualImobiliaria + percentualConstrutora;
  percentualAtoEl.value = Number(percentualAto).toFixed(2);

  let valorEntrada = 0;
  if (source === 'valor') {
    valorEntrada = parseCurrency(valorEntradaEl.dataset.raw ?? valorEntradaEl.value) || 0;
    percentual = valorTotal > 0 ? (valorEntrada / valorTotal) * 100 : 0;
    percentualEntradaEl.value = Number(percentual).toFixed(2);
  } else {
    valorEntrada = (valorTotal * percentual) / 100;
  }

  const valorAto = (valorTotal * percentualAto) / 100;

  if (document.activeElement !== valorEntradaEl) {
    valorEntradaEl.dataset.raw = String(valorEntrada);
    valorEntradaEl.value = formatCurrency(valorEntrada);
  }
  if (document.activeElement !== valorTotalEl) {
    valorTotalEl.value = formatCurrency(valorTotal);
  }
  valorAtoEl.value = formatCurrency(valorAto);

  const valorImobiliaria = (valorTotal * percentualImobiliaria) / 100;
  const valorConstrutora = (valorTotal * percentualConstrutora) / 100;
  valorImobiliariaEl.value = formatCurrency(valorImobiliaria);
  valorConstrutoraEl.value = formatCurrency(valorConstrutora);

  const habiteSe = valorTotal - valorEntrada;
  habiteSeEl.value = formatCurrency(habiteSe);
  totalEntradaEl.textContent = formatCurrency(valorEntrada);
  valorAtoResumoEl.textContent = formatCurrency(valorAto);

  return { valorEntrada, valorAto };
};

percentualEntradaEl.addEventListener('input', () => {
  updateEntrada('percent');
});

percentualEntradaEl.addEventListener('blur', () => {
  percentualEntradaEl.value = Number(percentualEntradaEl.value || 0).toFixed(2);
  updateEntrada('percent');
});

valorEntradaEl.addEventListener('focus', () => {
  valorEntradaEl.value = valorEntradaEl.dataset.raw ?? (valorEntradaEl.value ? String(parseCurrency(valorEntradaEl.value)) : '0');
});

valorEntradaEl.addEventListener('input', () => {
  valorEntradaEl.dataset.raw = valorEntradaEl.value.replace(/[^0-9,.-]+/g, '');
  updateEntrada('valor');
});

valorEntradaEl.addEventListener('blur', () => {
  valorEntradaEl.dataset.raw = valorEntradaEl.value;
  valorEntradaEl.value = formatCurrency(parseCurrency(valorEntradaEl.value));
  updateEntrada('valor');
});

// format valorTotal on focus/blur like other currency fields
valorTotalEl.addEventListener('focus', () => {
  valorTotalEl.value = valorTotalEl.dataset.raw ?? (valorTotalEl.value ? String(parseCurrency(valorTotalEl.value)) : '0');
});
valorTotalEl.addEventListener('blur', () => {
  valorTotalEl.dataset.raw = valorTotalEl.value;
  valorTotalEl.value = formatCurrency(parseCurrency(valorTotalEl.value));
});
valorTotalEl.addEventListener('input', () => {
  valorTotalEl.dataset.raw = valorTotalEl.value.replace(/[^0-9,.-]+/g, '');
  updateEntrada();
});

const calculateProposal = () => {
  const { valorEntrada } = updateEntrada();
  const valorTotal = parseCurrency(valorTotalEl.dataset.raw ?? valorTotalEl.value) || 0;

  const rows = Array.from(parcelasTableBody.querySelectorAll('tr'));
  let totalParcelas = 0;

  rows.forEach((row) => {
    const inputs = row.querySelectorAll('input, select');
    const valorSerie = parseCurrency(inputs[4].value) || 0;
    totalParcelas += valorSerie;
  });

  totalParcelasEl.textContent = formatCurrency(totalParcelas);
  const saldoEntrada = valorEntrada - totalParcelas;
  saldoEntradaEl.textContent = formatCurrency(saldoEntrada);
  const valorFinal = valorTotal - valorEntrada;
  valorFinalEl.textContent = formatCurrency(valorFinal);
};

const calculateSuggestion = () => {
  const { valorEntrada } = updateEntrada();
  const rows = Array.from(parcelasTableBody.querySelectorAll('tr'));
  if (!rows.length) {
    calculateProposal();
    return;
  }

  let totalParcelas = 0;
  const zeroRows = [];

  rows.forEach((row) => {
    const inputs = row.querySelectorAll('input, select');
    const valorSerie = parseCurrency(inputs[4].value) || 0;
    totalParcelas += valorSerie;
    if (valorSerie === 0) {
      zeroRows.push({ row, inputs });
    }
  });

  const difference = valorEntrada - totalParcelas;
  // If there are zero-valued rows, prefer to distribute the difference among them
  if (zeroRows.length > 0) {
    if (difference > 0) {
      const suggestedValue = difference / zeroRows.length;
      zeroRows.forEach(({ inputs }) => {
        const parcelas = Number(inputs[2].value) || 1;
        inputs[4].value = formatCurrency(suggestedValue);
        inputs[3].value = formatCurrency(suggestedValue / parcelas);
      });
    } else {
      // difference <= 0: cannot assign negative suggestions to zero rows.
      // Leave zero rows at 0 and adjust the last non-zero row instead.
      const nonZeroRows = rows.map((r) => r).filter((r) => {
        const v = parseCurrency(r.querySelectorAll('input, select')[4].value) || 0;
        return v > 0;
      });
      if (nonZeroRows.length > 0) {
        const lastRow = nonZeroRows[nonZeroRows.length - 1];
        const lastInputs = lastRow.querySelectorAll('input, select');
        const lastValorSerie = parseCurrency(lastInputs[4].value) || 0;
        const lastParcelas = Number(lastInputs[2].value) || 1;
        const updatedValorSerie = Math.max(0, lastValorSerie + difference);
        lastInputs[4].value = formatCurrency(updatedValorSerie);
        lastInputs[3].value = formatCurrency(updatedValorSerie / lastParcelas);
      }
    }
  } else {
    // No zero rows: adjust the last row to absorb the difference
    const lastRow = rows[rows.length - 1];
    const lastInputs = lastRow.querySelectorAll('input, select');
    const lastValorSerie = parseCurrency(lastInputs[4].value) || 0;
    const lastParcelas = Number(lastInputs[2].value) || 1;
    const updatedValorSerie = Math.max(0, lastValorSerie + difference);
    lastInputs[4].value = formatCurrency(updatedValorSerie);
    lastInputs[3].value = formatCurrency(updatedValorSerie / lastParcelas);
  }

  // Final rounding correction: recalc totals and fix any tiny rounding difference
  let finalTotal = 0;
  rows.forEach((row) => {
    const inputs = row.querySelectorAll('input, select');
    finalTotal += parseCurrency(inputs[4].value) || 0;
  });
  const finalDiff = Math.round((valorEntrada - finalTotal) * 100) / 100;
  if (Math.abs(finalDiff) >= 0.01) {
    // apply remainder to the last row
    const lastRow2 = rows[rows.length - 1];
    const lastInputs2 = lastRow2.querySelectorAll('input, select');
    const lastValorSerie2 = parseCurrency(lastInputs2[4].value) || 0;
    const lastParcelas2 = Number(lastInputs2[2].value) || 1;
    const updatedValorSerie2 = Math.max(0, lastValorSerie2 + finalDiff);
    lastInputs2[4].value = formatCurrency(updatedValorSerie2);
    lastInputs2[3].value = formatCurrency(updatedValorSerie2 / lastParcelas2);
  }

  calculateProposal();
};

const buildPdfContent = () => {
  const rows = Array.from(parcelasTableBody.querySelectorAll('tr'));
  const payments = rows.map((row) => {
    const inputs = row.querySelectorAll('input, select');
    let periodicidade = inputs[1].value || '-';
    if (periodicidade === 'Ato Imobiliária' || periodicidade === 'Ato Construtora') {
      periodicidade = 'Ato';
    }
    return {
      data: inputs[0].value || '-',
      periodicidade,
      parcelas: inputs[2].value || '0',
      valorUnitario: parseCurrency(inputs[3].value) || 0,
      valorSerie: parseCurrency(inputs[4].value) || 0,
      observacao: inputs[5].value || '-',
    };
  });

  const percentualImobiliaria = Number(percentualImobiliariaEl.value) || 0;
  const percentualConstrutora = Number(percentualConstrutoraEl.value) || 0;
  const percentualAto = percentualImobiliaria + percentualConstrutora;
  const valorAto = parseCurrency(valorAtoEl.value) || 0;

  return {
    empreendimento: empreendimentoEl.value,
    unidade: unidadeEl.value,
    valorTotal: formatCurrency(parseCurrency(valorTotalEl.value) || 0),
    percentualEntrada: `${Number(percentualEntradaEl.value).toFixed(2)}%`,
    valorEntrada: formatCurrency(parseCurrency(valorEntradaEl.value) || 0),
    habiteSe: formatCurrency(parseCurrency(habiteSeEl.value) || 0),
    percentualAto: `${Number(percentualAto).toFixed(2)}%`,
    valorAto: formatCurrency(valorAto),
    totalParcelas: totalParcelasEl.textContent,
    valorFinal: valorFinalEl.textContent,
    payments,
  };
};

const exportPdf = async () => {
  calculateProposal();
  const proposal = buildPdfContent();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentBottom = pageHeight - 56; // reserva espaço pro rodapé
  const NAVY = [15, 23, 42];
  const ACCENT = [29, 78, 216];
  const MUTED = [102, 112, 133];
  const BORDER = [228, 231, 236];
  const ZEBRA = [248, 250, 252];
  let y = 0;

  const ensureSpace = (needed) => {
    if (y + needed > contentBottom) {
      pdf.addPage();
      y = 50;
      return true;
    }
    return false;
  };

  // faixa de cabeçalho
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageWidth, 76, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(19);
  pdf.text('Proposta Comercial', margin, 34);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(203, 213, 225);
  pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, margin, 52);
  if (proposal.empreendimento) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(proposal.empreendimento, pageWidth - margin, 34, { align: 'right' });
  }
  if (proposal.unidade) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text(`Unidade ${proposal.unidade}`, pageWidth - margin, 52, { align: 'right' });
  }
  pdf.setTextColor(0, 0, 0);
  y = 106;

  const sectionTitle = (title) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...NAVY);
    pdf.text(title, margin, y);
    y += 10;
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(1);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 22;
    pdf.setTextColor(0, 0, 0);
  };

  sectionTitle('Condições Financeiras');

  const infoRows = [
    ['Valor do imóvel', proposal.valorTotal],
    ['% Entrada', proposal.percentualEntrada],
    ['Valor de entrada', proposal.valorEntrada],
    ['Total da programação de pagamentos', proposal.totalParcelas],
  ];

  pdf.setFontSize(10);
  infoRows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...MUTED);
    pdf.text(label, margin, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...NAVY);
    pdf.text(value, pageWidth - margin, y, { align: 'right' });
    y += 18;
  });

  // destaque do valor a financiar
  y += 6;
  pdf.setFillColor(...ACCENT);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 34, 6, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.text('Valor a ser financiado', margin + 12, y + 22);
  pdf.setFontSize(13);
  pdf.text(proposal.valorFinal, pageWidth - margin - 12, y + 22, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  y += 34 + 32;

  sectionTitle('Programação de Pagamentos');

  const tableHeaders = ['Data', 'Periodicidade', 'Parcelas', 'Valor Unit.', 'Total da Série', 'Obs'];
  const columnWidths = [60, 110, 50, 90, 90, 105];
  const numericCols = [2, 3, 4];
  const rowHeight = 20;
  const textInset = 14; // distância da linha de base do texto até o topo da linha
  const tableX = margin;
  const tableWidth = columnWidths.reduce((a, b) => a + b, 0);

  const drawTableRow = (values, { bold = false, muted = false, fill = null } = {}) => {
    const rowTop = y;
    if (fill) {
      pdf.setFillColor(...fill);
      pdf.rect(tableX, rowTop, tableWidth, rowHeight, 'F');
    }
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(bold ? 9 : 9.5);
    pdf.setTextColor(...(muted ? MUTED : bold ? NAVY : [17, 24, 39]));
    const textY = rowTop + textInset;
    let x = tableX;
    values.forEach((value, index) => {
      const text = value.toString();
      if (numericCols.includes(index)) {
        pdf.text(text, x + columnWidths[index] - 4, textY, { align: 'right' });
      } else {
        pdf.text(text, x + 4, textY);
      }
      x += columnWidths[index];
    });
    pdf.setTextColor(0, 0, 0);
    y = rowTop + rowHeight;
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(bold ? 0.8 : 0.5);
    pdf.line(tableX, y, tableX + tableWidth, y);
  };

  const drawTableHeader = () => {
    drawTableRow(tableHeaders, { bold: true, muted: true, fill: ZEBRA });
  };

  ensureSpace(rowHeight * 2);
  drawTableHeader();

  proposal.payments.forEach((payment, rowIndex) => {
    if (ensureSpace(rowHeight)) {
      drawTableHeader();
    }

    const rowValues = [
      payment.data,
      payment.periodicidade,
      payment.parcelas,
      formatCurrency(Number(payment.valorUnitario)),
      formatCurrency(Number(payment.valorSerie)),
      payment.observacao,
    ];

    drawTableRow(rowValues, { fill: rowIndex % 2 === 1 ? ZEBRA : null });
  });

  // linha de total
  ensureSpace(rowHeight + 4);
  drawTableRow(['Total', '', '', '', proposal.totalParcelas, ''], { bold: true });

  // observações
  y += 26;
  ensureSpace(90);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...NAVY);
  pdf.text('Observações', margin, y);
  pdf.setTextColor(0, 0, 0);
  y += 12;
  const notesHeight = 64;
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, notesHeight, 6, 6);
  pdf.setDrawColor(240, 242, 246);
  for (let lineY = y + 22; lineY < y + notesHeight; lineY += 22) {
    pdf.line(margin + 8, lineY, pageWidth - margin - 8, lineY);
  }

  // rodapé com numeração de página
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    pdf.setPage(i);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.6);
    pdf.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...MUTED);
    pdf.text('Calculadora de Proposta', margin, pageHeight - 22);
    pdf.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 22, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  }

  pdf.save('proposta.pdf');
};

percentualEntradaEl.addEventListener('input', updateEntrada);
percentualImobiliariaEl.addEventListener('input', updateEntrada);
percentualConstrutoraEl.addEventListener('input', updateEntrada);
empreendimentoEl.addEventListener('input', updateEntrada);
unidadeEl.addEventListener('input', updateEntrada);
calcularBtn.addEventListener('click', (e) => { console.log('calcularBtn clicked'); calculateProposal(e); });
addRowBtn.addEventListener('click', () => {
  addRow();
  calculateProposal();
});
calculateSuggestionBtn.addEventListener('click', calculateSuggestion);
exportPdfBtn.addEventListener('click', exportPdf);

// Preload a few rows for demonstration
addRow();
addRow();
calculateProposal();
