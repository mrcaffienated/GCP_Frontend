// Local-only mock API — used when VITE_USE_MOCK=true (see .env.local).
// Mirrors the shape of the real backend responses (models/schemas.py) closely
// enough for UI work, with in-memory CRUD so create/edit/release/etc. actually
// update what's on screen. Never used in a real build unless the env flag is set.

const DELAY_MS = 250;
const delay = (ms = DELAY_MS) => new Promise((r) => setTimeout(r, ms));
const uid = () => crypto.randomUUID();
const ok = (data) => Promise.resolve({ data });

const now = () => new Date().toISOString();
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

function makePawn(overrides = {}) {
  return {
    id: uid(),
    serial_no: 1000,
    series: null,
    entry_date: daysAgo(30),
    borrower_name: "Sample Borrower",
    relative_name: "Father: Sample Name",
    phone: '["9876543210"]',
    aadhar: null,
    address: "Sample Address, Town",
    item_description: "Gold chain",
    item_weight: "10.500",
    item_weight_gold: null,
    item_weight_silver: null,
    collateral_type: "gold",
    loan_amount: "20000.00",
    interest_rate: "2.00",
    loan_amount_gold: null,
    interest_rate_gold: null,
    loan_amount_silver: null,
    interest_rate_silver: null,
    is_released: false,
    released_date: null,
    actual_release_amount: null,
    is_sold: false,
    sold_date: null,
    is_cancelled: false,
    renewed: false,
    renewed_from: null,
    renewed_to: null,
    renewed_from_serial: null,
    renewed_from_series: null,
    renewed_to_serial: null,
    renewed_to_series: null,
    edit_history: [],
    created_by: { username: "STORE001", name: "Store Owner" },
    created_at: now(),
    additional_amounts: [],
    prepayments: [],
    interest_payments: [],
    ...overrides,
  };
}

let pawns = [
  makePawn({ serial_no: 4650, borrower_name: "Ravi Kumar", relative_name: "Father: Suresh", item_description: "Gold ring, 2 bangles", item_weight: "18.200", loan_amount: "45000.00", interest_rate: "2.00", entry_date: daysAgo(45) }),
  makePawn({ serial_no: 4649, borrower_name: "Lakshmi Devi", relative_name: "Spouse: Ramesh", item_description: "Silver anklets", item_weight: "80.000", collateral_type: "silver", loan_amount: "8000.00", interest_rate: "5.00", entry_date: daysAgo(20) }),
  makePawn({ serial_no: 4648, borrower_name: "Prasad Rao", relative_name: "Father: Venkat", item_description: "Gold chain + silver coins", collateral_type: "both", item_weight_gold: "12.000", item_weight_silver: "40.000", loan_amount_gold: "30000.00", interest_rate_gold: "2.00", loan_amount_silver: "5000.00", interest_rate_silver: "5.00", loan_amount: "35000.00", entry_date: daysAgo(60) }),
  makePawn({ serial_no: 4647, borrower_name: "Anitha", relative_name: "Father: Krishna", item_description: "Gold earrings", item_weight: "6.000", loan_amount: "15000.00", interest_rate: "2.50", is_released: true, released_date: daysAgo(2), actual_release_amount: "15800.00", entry_date: daysAgo(90) }),
  makePawn({ serial_no: 4646, borrower_name: "Suresh Babu", relative_name: "Father: Ramaiah", item_description: "Gold bracelet", item_weight: "9.000", loan_amount: "22000.00", interest_rate: "2.00", is_sold: true, sold_date: daysAgo(5), entry_date: daysAgo(120) }),
  makePawn({ serial_no: 4645, borrower_name: "Test Cancelled", relative_name: "Father: X", item_description: "Voided entry", loan_amount: "0.00", is_cancelled: true, is_released: true, entry_date: daysAgo(10) }),
];

let employees = [
  {
    id: uid(), username: "EMP001", name: "Ganesh", role: "employee", is_active: true,
    pwd_change_request: null,
  },
  {
    id: uid(), username: "EMP002", name: "Padma", role: "employee", is_active: true,
    pwd_change_request: { status: "pending", requested_at: now() },
  },
];

let notes = [
  { id: uid(), note_date: daysAgo(1), content: "Cash counted and tallied for the day.", created_at: now() },
];

function findPawn(id) {
  return pawns.find((p) => p.id === id);
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (username) => {
    await delay();
    const isBoss = !username?.toUpperCase().startsWith("EMP");
    return ok({
      access_token: "mock-token",
      role: isBoss ? "boss" : "employee",
      name: isBoss ? "Store Owner (mock)" : "Employee (mock)",
      user_id: uid(),
    });
  },
  changePassword: async () => { await delay(); return ok({ detail: "Password updated" }); },
  requestPwdChange: async () => { await delay(); return ok({}); },
  cancelPwdRequest: async () => { await delay(); return ok({}); },
  setNewPassword: async () => { await delay(); return ok({}); },
};

// ── Employees ────────────────────────────────────────────────────────────────
export const employeesApi = {
  list: async () => { await delay(); return ok(employees); },
  create: async (data) => {
    await delay();
    const emp = { id: uid(), username: data.username, name: data.name, role: "employee", is_active: true, pwd_change_request: null };
    employees = [...employees, emp];
    return ok(emp);
  },
  deactivate: async (id) => {
    await delay();
    employees = employees.map((e) => (e.id === id ? { ...e, is_active: false } : e));
    return ok(employees.find((e) => e.id === id));
  },
  approvePassword: async (id) => {
    await delay();
    employees = employees.map((e) => (e.id === id ? { ...e, pwd_change_request: { ...e.pwd_change_request, status: "approved" } } : e));
    return ok(employees.find((e) => e.id === id));
  },
  denyPassword: async (id) => {
    await delay();
    employees = employees.map((e) => (e.id === id ? { ...e, pwd_change_request: null } : e));
    return ok(employees.find((e) => e.id === id));
  },
};

// ── Pawns ────────────────────────────────────────────────────────────────────
export const pawnsApi = {
  list: async () => {
    await delay();
    const active_count = pawns.filter((p) => !p.is_released && !p.is_cancelled).length;
    return ok({ items: pawns, total: pawns.length, total_all: pawns.length, active_count, per_page: pawns.length });
  },
  get: async (id) => { await delay(); return ok(findPawn(id)); },
  nextSerial: async () => {
    await delay();
    const max = pawns.reduce((m, p) => Math.max(m, p.serial_no), 0);
    return ok({ next_serial: max + 1 });
  },
  create: async (data) => {
    await delay();
    const pawn = makePawn({ ...data, created_at: now() });
    pawns = [pawn, ...pawns];
    return ok(pawn);
  },
  update: async (id, data) => {
    await delay();
    pawns = pawns.map((p) => (p.id === id ? { ...p, ...data } : p));
    return ok(findPawn(id));
  },
  release: async (id, date, actualAmount) => {
    await delay();
    pawns = pawns.map((p) => (p.id === id ? { ...p, is_released: true, released_date: date || daysAgo(0), actual_release_amount: actualAmount ?? p.actual_release_amount } : p));
    return ok(findPawn(id));
  },
  markActive: async (id) => {
    await delay();
    pawns = pawns.map((p) => (p.id === id ? { ...p, is_released: false, released_date: null, is_sold: false, sold_date: null, is_cancelled: false } : p));
    return ok(findPawn(id));
  },
  cancel: async (id) => {
    await delay();
    pawns = pawns.map((p) => (p.id === id ? { ...p, is_cancelled: true, is_released: true } : p));
    return ok(findPawn(id));
  },
  markSold: async (id, date) => {
    await delay();
    pawns = pawns.map((p) => (p.id === id ? { ...p, is_sold: true, sold_date: date || daysAgo(0), is_released: true, released_date: date || daysAgo(0) } : p));
    return ok(findPawn(id));
  },
  renew: async (id, data) => {
    await delay();
    const oldPawn = findPawn(id);
    const newPawn = makePawn({ ...data, created_at: now(), renewed_from: id });
    pawns = pawns.map((p) => (p.id === id ? { ...p, is_released: true, released_date: daysAgo(0), renewed: true, renewed_to: newPawn.id } : p));
    pawns = [newPawn, ...pawns];
    return ok({ old: findPawn(id), new: newPawn });
  },
  linkRenewal: async (id) => { await delay(); return ok({ old: findPawn(id), current: findPawn(id) }); },
  addAdditionalAmt: async (id, data) => {
    await delay();
    pawns = pawns.map((p) => (p.id === id ? { ...p, additional_amounts: [...p.additional_amounts, { id: uid(), ...data, amount: String(data.amount), interest_rate: String(data.interest_rate) }] } : p));
    return ok(findPawn(id));
  },
  deleteAdditionalAmt: async (itemId) => {
    await delay();
    pawns = pawns.map((p) => ({ ...p, additional_amounts: p.additional_amounts.filter((a) => a.id !== itemId) }));
    return ok(pawns.find((p) => p.additional_amounts !== undefined));
  },
  addPrepayment: async (id, data) => {
    await delay();
    pawns = pawns.map((p) => (p.id === id ? { ...p, prepayments: [...p.prepayments, { id: uid(), ...data, amount: String(data.amount) }] } : p));
    return ok(findPawn(id));
  },
  deletePrepayment: async (itemId) => {
    await delay();
    pawns = pawns.map((p) => ({ ...p, prepayments: p.prepayments.filter((x) => x.id !== itemId) }));
    return ok(pawns[0]);
  },
  addInterestPmt: async (id, data) => {
    await delay();
    pawns = pawns.map((p) => (p.id === id ? { ...p, interest_payments: [...p.interest_payments, { id: uid(), ...data, amount: String(data.amount) }] } : p));
    return ok(findPawn(id));
  },
  exportExcel: async () => {
    await delay();
    return { data: new Blob(["mock export — not a real xlsx file"], { type: "text/plain" }) };
  },
};

// ── Boss Notes ───────────────────────────────────────────────────────────────
export const notesApi = {
  list: async () => { await delay(); return ok(notes); },
  create: async (data) => {
    await delay();
    const note = { id: uid(), ...data, created_at: now() };
    notes = [note, ...notes];
    return ok(note);
  },
  update: async (id, data) => {
    await delay();
    notes = notes.map((n) => (n.id === id ? { ...n, ...data } : n));
    return ok(notes.find((n) => n.id === id));
  },
  delete: async (id) => {
    await delay();
    notes = notes.filter((n) => n.id !== id);
    return ok({});
  },
};

export default { authApi, employeesApi, pawnsApi, notesApi };
