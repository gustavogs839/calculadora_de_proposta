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

const addRow = () => {
  const row = document.createElement('tr');
  const dateInput = document.createElement('input');
  dateInput.type = 'month';
  const periodicidadeInput = document.createElement('select');
  ['Mensal', 'Semestral', 'Única', 'Ato Imobiliária', 'Ato Construtora'].forEach((optionText) => {
    const option = document.createElement('option');
    option.value = optionText;
    option.textContent = optionText;
    periodicidadeInput.appendChild(option);
  });
  const parcelasInput = document.createElement('input');
  parcelasInput.type = 'number';
  parcelasInput.min = '1';
  parcelasInput.value = '1';
  const valorUnitarioInput = document.createElement('input');
  valorUnitarioInput.type = 'text';
  valorUnitarioInput.className = 'currency';
  valorUnitarioInput.value = formatCurrency(0);
  const valorSerieInput = document.createElement('input');
  valorSerieInput.type = 'text';
  valorSerieInput.className = 'currency';
  valorSerieInput.value = formatCurrency(0);
  const obsInput = document.createElement('input');
  obsInput.type = 'text';
  obsInput.className = 'obs';
  obsInput.placeholder = 'Observação (opcional)';
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
  let y = 50;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Proposta Comercial', margin, y);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, y, { align: 'right' });
  y += 14;
  pdf.setDrawColor(220);
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 24;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Dados do Empreendimento', margin, y);
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const infoRows = [
    ['Empreendimento', proposal.empreendimento],
    ['Unidade', proposal.unidade],
    ['Valor do imóvel', proposal.valorTotal],
    ['Entrada', proposal.valorEntrada],
    ['Valor a ser financiado', proposal.valorFinal],
  ];

  infoRows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, pageWidth - margin, y, { align: 'right' });
    y += 18;
  });

  y += 14;
  pdf.setDrawColor(220);
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 24;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Programação de Pagamentos', margin, y);
  y += 18;

  const tableHeaders = ['Data', 'Periodicidade', 'Parcelas', 'Valor Unit.', 'Total da Série', 'Obs'];
  const columnWidths = [60, 110, 50, 90, 90, 105];
  const rowHeight = 18;
  const tableX = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  let x = tableX;
  tableHeaders.forEach((header, index) => {
    pdf.text(header, x + 2, y);
    x += columnWidths[index];
  });
  y += rowHeight;

  pdf.setDrawColor(220);
  pdf.setLineWidth(0.4);
  pdf.line(tableX, y - rowHeight + 4, pageWidth - margin, y - rowHeight + 4);
  pdf.line(tableX, y - rowHeight + 4, tableX, y - 4);
  pdf.line(pageWidth - margin, y - rowHeight + 4, pageWidth - margin, y - 4);

  pdf.setFont('helvetica', 'normal');
  proposal.payments.forEach((payment) => {
    if (y > pageHeight - 60) {
      pdf.addPage();
      y = 50;
      pdf.setFont('helvetica', 'bold');
      x = tableX;
      tableHeaders.forEach((header, index) => {
        pdf.text(header, x + 2, y);
        x += columnWidths[index];
      });
      y += rowHeight;
      pdf.setFont('helvetica', 'normal');
    }

    x = tableX;
    const rowValues = [
      payment.data,
      payment.periodicidade,
      payment.parcelas,
      formatCurrency(Number(payment.valorUnitario)),
      formatCurrency(Number(payment.valorSerie)),
      payment.observacao,
    ];

    rowValues.forEach((value, index) => {
      const text = value.toString();
      const alignRight = index >= 2 && index <= 4;
      if (alignRight) {
        pdf.text(text, x + columnWidths[index] - 4, y, { align: 'right' });
      } else {
        pdf.text(text, x + 2, y);
      }
      x += columnWidths[index];
    });
    y += rowHeight;
    pdf.line(tableX, y - 4, pageWidth - margin, y - 4);
    pdf.line(tableX, y - rowHeight + 4, tableX, y - 4);
    pdf.line(pageWidth - margin, y - rowHeight + 4, pageWidth - margin, y - 4);
  });

  y += 20;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Observações', margin, y);

  pdf.save('proposta.pdf');
};

percentualEntradaEl.addEventListener('input', updateEntrada);
percentualImobiliariaEl.addEventListener('input', updateEntrada);
percentualConstrutoraEl.addEventListener('input', updateEntrada);
empreendimentoEl.addEventListener('input', updateEntrada);
unidadeEl.addEventListener('input', updateEntrada);
calcularBtn.addEventListener('click', calculateProposal);
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
