export const MOCK_BOSS = {
  username: "STORE001",
  password: "admin123",
  role: "boss",
  name: "Store Owner",
};

export const INITIAL_EMPLOYEES = [
  { id: "emp1", username: "EMP001", password: "emp123", name: "Ramesh Kumar", role: "employee", is_active: true },
];

// ─── 500-row generator ────────────────────────────────────────────────────────
const FIRST_NAMES = [
  "Rajan","Meena","Arjun","Lakshmi","Sita","Vikram","Kavitha","Priya","Suresh","Anita",
  "Mohan","Radha","Deepak","Sunita","Ramesh","Geeta","Vinod","Shanti","Anil","Usha",
  "Prakash","Savita","Rajesh","Poonam","Dinesh","Rekha","Ajay","Manju","Sanjay","Lata",
  "Mukesh","Seema","Naresh","Nirmala","Mahesh","Pushpa","Sunil","Asha","Vikas","Kamla",
  "Ashok","Saroj","Manoj","Sushma","Rakesh","Vandana","Ganesh","Sudha","Umesh","Lalita",
  "Harish","Veena","Girish","Hema","Santosh","Jyoti","Yogesh","Indira","Trilok","Shakuntala",
  "Balraj","Parvati","Chetan","Madhuri","Nilesh","Saraswati","Bharat","Kiran","Hitesh","Durga",
  "Jagdish","Champa","Kamlesh","Sarla","Narendra","Kusum","Dilip","Vimla","Bhavesh","Rani",
  "Tushar","Devika","Paresh","Leela","Jayesh","Nandita","Manish","Bharati","Alpesh","Urmila",
  "Kalpesh","Tara","Biren","Sharda","Pradip","Manjula","Hemant","Sheela","Chirag","Ratna",
];

const LAST_NAMES = [
  "Kumar","Sharma","Patel","Rao","Singh","Devi","Nair","Pandey","Gupta","Verma",
  "Mishra","Tiwari","Joshi","Agarwal","Mehta","Shah","Desai","Jain","Reddy","Pillai",
  "Iyer","Nambiar","Menon","Chowdhury","Bose","Das","Ghosh","Mukherjee","Banerjee","Chatterjee",
  "Kapoor","Malhotra","Khanna","Chopra","Bhatia","Suri","Tandon","Arora","Sethi","Bedi",
  "Naidu","Rajan","Murthy","Krishnan","Srinivasan","Subramanian","Venkatesh","Anand","Balaji","Sundar",
];

const GOLD_ITEMS = [
  "22K Gold Necklace","22K Gold Chain","22K Gold Bangles","18K Gold Ring","22K Gold Earrings",
  "Gold Mangalsutra","22K Gold Bracelet","Gold Anklets","Gold Pendant Set","18K Gold Bangle",
  "Gold Haar","22K Gold Jhumkas","Gold Waistband","22K Gold Kada","Gold Nose Ring",
  "22K Gold Thali","Gold Payel","22K Gold Armlet","Gold Tikka","18K Gold Cufflinks",
  "Gold Coin 10g","Gold Coin 5g","Gold Bar 20g","22K Gold Ring Set","Gold Choker",
];

const SILVER_ITEMS = [
  "Silver Anklets Pair","Silver Chain","Silver Waistband","Silver Bangles Set","Silver Ring",
  "Silver Payal","Silver Bracelet","Silver Necklace","Silver Earrings","Silver Kada",
  "Silver Thali Set","Silver Coin 50g","Silver Glass","Silver Plate","Silver Idol",
  "Silver Mangalsutra","Silver Armlet","Silver Pendant","Silver Belt","Silver Kamarbandh",
];

const INTEREST_RATES = ["1.5", "2", "2", "2", "2.5"];

function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function generatePawns() {
  const rand = seededRand(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const entries = [];
  const TODAY = new Date().toISOString().split("T")[0];

  let currentDate = "2023-01-05";

  for (let i = 1; i <= 500; i++) {
    const isGold = rand() > 0.35;
    const type = isGold ? "gold" : "silver";
    const items = isGold ? GOLD_ITEMS : SILVER_ITEMS;
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const relFirst = pick(FIRST_NAMES);
    const weight = isGold
      ? (Math.floor(rand() * 50) + 3).toString()
      : (Math.floor(rand() * 150) + 10).toString();
    const loanBase = isGold
      ? (Math.floor(rand() * 45) + 5) * 1000
      : (Math.floor(rand() * 8) + 2) * 1000;
    const rate = pick(INTEREST_RATES);
    const entryDate = currentDate;

    const isReleased = rand() > 0.60;
    let releasedDate;
    if (isReleased) {
      const holdDays = Math.floor(rand() * 180) + 15;
      releasedDate = addDays(entryDate, holdDays);
      if (releasedDate > TODAY) releasedDate = TODAY;
    }

    // Dhafa: ~25% of entries get 1–2 additional amounts
    const additional_amounts = [];
    if (rand() > 0.25) {
      const count = rand() > 0.6 ? 2 : 1;
      for (let d = 0; d < count; d++) {
        const dhafeAmount = (Math.floor(rand() * 8) + 1) * 500;
        const dhafeDate = addDays(entryDate, Math.floor(rand() * 60) + 10);
        additional_amounts.push({
          id: `dhafa-${i}-${d}`,
          amount: dhafeAmount.toFixed(2),
          date: dhafeDate <= TODAY ? dhafeDate : TODAY,
          interest_rate: rate,
          note: rand() > 0.5 ? "Extra loan" : "",
        });
      }
    }

    // Prepayments: ~20% of active entries get a prepayment
    const prepayments = [];
    if (!isReleased && rand() > 0.25) {
      const prepaidAmount = Math.floor(rand() * (loanBase * 0.4) / 500) * 500 || 500;
      const prepaidDate = addDays(entryDate, Math.floor(rand() * 90) + 30);
      prepayments.push({
        id: `prepay-${i}`,
        amount: prepaidAmount.toFixed(2),
        date: prepaidDate <= TODAY ? prepaidDate : TODAY,
        note: "",
      });
    }

    entries.push({
      id: String(i),
      serial_no: i,
      entry_date: entryDate,
      borrower_name: `${firstName} ${lastName}`,
      relative_name: `${relFirst} ${lastName}`,
      item_description: pick(items),
      item_weight: weight,
      collateral_type: type,
      loan_amount: loanBase.toFixed(2),
      interest_rate: rate,
      is_released: isReleased,
      ...(isReleased ? { released_date: releasedDate } : {}),
      ...(additional_amounts.length > 0 ? { additional_amounts } : {}),
      ...(prepayments.length > 0 ? { prepayments } : {}),
      created_at: `${entryDate}T${String(8 + Math.floor(rand() * 10)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00`,
    });

    currentDate = addDays(currentDate, Math.floor(rand() * 3) + 2);
    if (currentDate > TODAY) currentDate = TODAY;
  }

  return entries;
}

export const mockPawns = generatePawns();
