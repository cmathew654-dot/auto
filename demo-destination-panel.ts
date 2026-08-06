const STYLE_ID = 'demo-dest-style';

export interface DemoDestinationPanel {
  root: HTMLElement;
  reset(): void;
}

function installDemoDestinationStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .demo-dest-root {
      display: grid;
      gap: 14px;
      max-width: 640px;
      padding: 20px;
      background: repeating-linear-gradient(
        135deg,
        #f4f4f6,
        #f4f4f6 10px,
        #ececef 10px,
        #ececef 20px
      );
      border: 2px dashed #8a8a94;
      border-radius: 6px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #2c2c33;
    }

    .demo-dest-banner {
      margin: 0;
      padding: 10px 12px;
      background: #dedee3;
      border: 1px solid #8a8a94;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #45454e;
    }

    .demo-dest-heading {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #2c2c33;
    }

    .demo-dest-subline {
      margin: 2px 0 0;
      font-size: 12.5px;
      color: #63636c;
    }

    .demo-dest-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding: 14px;
      background: #ffffff;
      border: 1px solid #c4c4cb;
      border-radius: 4px;
    }

    .demo-dest-field {
      display: grid;
      gap: 4px;
      font-size: 12.5px;
      font-weight: 600;
      color: #45454e;
    }

    .demo-dest-field input {
      padding: 6px 8px;
      border: 1px solid #b2b2ba;
      border-radius: 3px;
      font-size: 13px;
      font-weight: 400;
      color: #2c2c33;
    }

    .demo-dest-actions {
      display: flex;
      gap: 8px;
      grid-column: 1 / -1;
      margin-top: 4px;
    }

    .demo-dest-actions button {
      padding: 7px 12px;
      border: 1px solid #6b6b74;
      background: #6b6b74;
      color: #ffffff;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .demo-dest-actions button.demo-dest-secondary {
      background: #ffffff;
      color: #45454e;
      border-color: #b2b2ba;
    }

    .demo-dest-status {
      grid-column: 1 / -1;
      margin: 0;
      font-size: 12.5px;
      color: #45454e;
      min-height: 16px;
    }

    .demo-dest-table-wrap {
      padding: 14px;
      background: #ffffff;
      border: 1px solid #c4c4cb;
      border-radius: 4px;
      /* Rows landing here must never trigger the browser's own scroll
         anchoring -- the tour drives every scroll deliberately. */
      overflow-anchor: none;
    }

    .demo-dest-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    .demo-dest-table th {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid #c4c4cb;
      color: #63636c;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .demo-dest-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e4e4e8;
    }

    /* Each landed row fades and slides in so a fill visibly populates the
       table row by row, instead of appearing already-finished. */
    .demo-dest-table tbody tr {
      animation: demoDestRowIn 400ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    @keyframes demoDestRowIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .demo-dest-empty {
      margin: 8px 0 0;
      font-size: 12.5px;
      color: #63636c;
    }
  `;
  document.head.appendChild(style);
}

export function renderDemoDestinationPanel(container: HTMLElement): DemoDestinationPanel {
  installDemoDestinationStyles();

  const root = document.createElement('section');
  root.className = 'demo-dest-root';

  const banner = document.createElement('p');
  banner.className = 'demo-dest-banner';
  banner.setAttribute('role', 'note');
  banner.textContent = 'Simulated destination page. This is not eMoney. Nothing here is saved to any real system.';
  root.appendChild(banner);

  const heading = document.createElement('h2');
  heading.className = 'demo-dest-heading';
  heading.textContent = 'Simulated Destination Page';
  root.appendChild(heading);

  const subline = document.createElement('p');
  subline.className = 'demo-dest-subline';
  subline.textContent = 'Stand-in for the holdings entry screen an operator would have open.';
  root.appendChild(subline);

  const form = document.createElement('div');
  form.className = 'demo-dest-form';

  const fieldSpecs: Array<{ id: string; label: string }> = [
    { id: 'demo-dest-ticker', label: 'Ticker' },
    { id: 'demo-dest-cusip', label: 'CUSIP' },
    { id: 'demo-dest-units', label: 'Units' },
    { id: 'demo-dest-cost-basis', label: 'Cost Basis' },
  ];

  const inputs: Record<string, HTMLInputElement> = {};

  fieldSpecs.forEach(({ id, label }) => {
    const wrap = document.createElement('div');
    wrap.className = 'demo-dest-field';

    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', id);
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;

    wrap.appendChild(labelEl);
    wrap.appendChild(input);
    form.appendChild(wrap);

    inputs[label] = input;
  });

  const actions = document.createElement('div');
  actions.className = 'demo-dest-actions';

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'demo-dest-secondary';
  addButton.textContent = 'Add a Holding';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save';

  actions.appendChild(addButton);
  actions.appendChild(saveButton);
  form.appendChild(actions);

  const status = document.createElement('p');
  status.className = 'demo-dest-status';
  status.setAttribute('role', 'status');
  form.appendChild(status);

  root.appendChild(form);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'demo-dest-table-wrap';

  const table = document.createElement('table');
  table.className = 'demo-dest-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['#', 'Ticker', 'CUSIP', 'Units', 'Cost Basis'].forEach((text) => {
    const th = document.createElement('th');
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  tableWrap.appendChild(table);

  const emptyState = document.createElement('p');
  emptyState.className = 'demo-dest-empty';
  emptyState.textContent = 'No rows yet.';
  tableWrap.appendChild(emptyState);

  root.appendChild(tableWrap);
  container.appendChild(root);

  addButton.addEventListener('click', () => {
    const ticker = inputs['Ticker'].value.trim();
    if (!ticker) return;

    const row = document.createElement('tr');
    const rowNumber = tbody.children.length + 1;
    [String(rowNumber), ticker, inputs['CUSIP'].value.trim(), inputs['Units'].value.trim(), inputs['Cost Basis'].value.trim()].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    });
    tbody.appendChild(row);

    fieldSpecs.forEach(({ label }) => {
      inputs[label].value = '';
    });
    emptyState.style.display = 'none';
  });

  saveButton.addEventListener('click', () => {
    status.textContent = 'Recorded in this simulated panel only. Nothing was sent to eMoney or any other system — a real save is always a manual click by the operator.';
  });

  function reset(): void {
    tbody.innerHTML = '';
    fieldSpecs.forEach(({ label }) => {
      inputs[label].value = '';
    });
    status.textContent = '';
    emptyState.style.display = '';
  }

  return { root, reset };
}
