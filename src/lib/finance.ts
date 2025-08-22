export type Investor = { name: string; amount: number; date: string } // ISO date
export type Plant = {
  id: string
  name: string
  annualROI: number // 0.125 = 12.5% / tahun
  payoutEveryMonths: number // 2 atau 3
  investors: Investor[]
}

export type MonthlyRow = {
  ym: string // YYYY-MM
  newInvest: number
  capital: number // modal akhir bulan
  accrual: number // akrual bulan ini
  accrualSinceLastPayout: number // saldo akrual menunggu payout
  payout: number // dibayarkan di bulan ini
}

export type YearlyRow = { year: number; invest: number; profit: number; roiPct: number }
export type InvestorSummary = { name: string; invest: number; profit: number; roiPct: number }

export type Member = {
  id: string
  name: string
  email: string
  phone: string
  location: string
  joinDate: string
  investments: {
    plantId: string
    plantName: string
    amount: number
    profit: number
    roi: number
    investDate: string
  }[]
  totalInvestment: number
  totalProfit: number
  overallROI: number
}

export const PLANTS: Plant[] = [
  {
    id: "gaharu",
    name: "Gaharu",
    annualROI: 0.125,
    payoutEveryMonths: 2,
    investors: [
      { name: "Andi", amount: 70_000_000, date: "2024-01-10" },
      { name: "Sari", amount: 80_000_000, date: "2024-02-18" },
      { name: "Dewa", amount: 50_000_000, date: "2024-06-02" },
      { name: "Lina", amount: 50_000_000, date: "2024-09-15" },
    ],
  },
  {
    id: "alpukat",
    name: "Alpukat",
    annualROI: 0.2,
    payoutEveryMonths: 3,
    investors: [
      { name: "Raka", amount: 30_000_000, date: "2025-01-05" },
      { name: "Nina", amount: 20_000_000, date: "2025-03-12" },
    ],
  },
  {
    id: "jengkol",
    name: "Jengkol",
    annualROI: 0.15,
    payoutEveryMonths: 2,
    investors: [
      { name: "Ahmad Suryadi", amount: 50_000_000, date: "2024-01-15" },
      { name: "Siti Nurhaliza", amount: 75_000_000, date: "2024-03-20" },
      { name: "Budi Santoso", amount: 60_000_000, date: "2024-05-10" },
    ],
  },
  {
    id: "aren",
    name: "Aren",
    annualROI: 0.18,
    payoutEveryMonths: 3,
    investors: [
      { name: "Dewi Sartika", amount: 40_000_000, date: "2024-02-01" },
      { name: "Rizki Pratama", amount: 55_000_000, date: "2024-04-15" },
    ],
  },
  {
    id: "kelapa-sawit",
    name: "Kelapa Sawit",
    annualROI: 0.22,
    payoutEveryMonths: 2,
    investors: [
      { name: "Indra Gunawan", amount: 100_000_000, date: "2024-01-05" },
      { name: "Maya Sari", amount: 85_000_000, date: "2024-02-20" },
      { name: "Tono Wijaya", amount: 70_000_000, date: "2024-06-01" },
    ],
  },
  {
    id: "karet",
    name: "Karet",
    annualROI: 0.16,
    payoutEveryMonths: 3,
    investors: [
      { name: "Fajar Nugroho", amount: 45_000_000, date: "2024-03-10" },
      { name: "Lestari Wati", amount: 65_000_000, date: "2024-05-25" },
    ],
  },
  {
    id: "cengkeh",
    name: "Cengkeh",
    annualROI: 0.19,
    payoutEveryMonths: 2,
    investors: [
      { name: "Hendra Kusuma", amount: 80_000_000, date: "2024-01-20" },
      { name: "Ratna Dewi", amount: 90_000_000, date: "2024-04-05" },
      { name: "Agus Salim", amount: 55_000_000, date: "2024-07-15" },
    ],
  },
  {
    id: "pala",
    name: "Pala",
    annualROI: 0.21,
    payoutEveryMonths: 3,
    investors: [
      { name: "Sari Indah", amount: 35_000_000, date: "2024-02-10" },
      { name: "Bambang Sutrisno", amount: 75_000_000, date: "2024-05-20" },
    ],
  },
  {
    id: "vanili",
    name: "Vanili",
    annualROI: 0.25,
    payoutEveryMonths: 2,
    investors: [
      { name: "Wulan Dari", amount: 120_000_000, date: "2024-01-01" },
      { name: "Dedi Kurniawan", amount: 95_000_000, date: "2024-03-15" },
      { name: "Eka Putri", amount: 60_000_000, date: "2024-06-10" },
    ],
  },
  {
    id: "lada",
    name: "Lada",
    annualROI: 0.17,
    payoutEveryMonths: 3,
    investors: [
      { name: "Yudi Hermawan", amount: 50_000_000, date: "2024-02-05" },
      { name: "Nita Sari", amount: 70_000_000, date: "2024-04-20" },
    ],
  },
  {
    id: "kayu-manis",
    name: "Kayu Manis",
    annualROI: 0.14,
    payoutEveryMonths: 2,
    investors: [
      { name: "Rudi Hartono", amount: 40_000_000, date: "2024-01-25" },
      { name: "Sinta Dewi", amount: 65_000_000, date: "2024-05-10" },
      { name: "Joni Iskandar", amount: 55_000_000, date: "2024-08-01" },
    ],
  },
  {
    id: "kemiri",
    name: "Kemiri",
    annualROI: 0.13,
    payoutEveryMonths: 3,
    investors: [
      { name: "Fitri Handayani", amount: 30_000_000, date: "2024-03-01" },
      { name: "Wahyu Setiawan", amount: 45_000_000, date: "2024-06-15" },
    ],
  },
  {
    id: "kapuk",
    name: "Kapuk",
    annualROI: 0.12,
    payoutEveryMonths: 2,
    investors: [
      { name: "Dian Sastro", amount: 35_000_000, date: "2024-02-15" },
      { name: "Eko Prasetyo", amount: 50_000_000, date: "2024-05-05" },
      { name: "Rina Marlina", amount: 40_000_000, date: "2024-07-20" },
    ],
  },
  {
    id: "jahe-merah",
    name: "Jahe Merah",
    annualROI: 0.2,
    payoutEveryMonths: 3,
    investors: [
      { name: "Bayu Aji", amount: 25_000_000, date: "2024-01-10" },
      { name: "Citra Kirana", amount: 40_000_000, date: "2024-04-25" },
    ],
  },
  {
    id: "kunyit",
    name: "Kunyit",
    annualROI: 0.15,
    payoutEveryMonths: 2,
    investors: [
      { name: "Gilang Ramadhan", amount: 30_000_000, date: "2024-02-20" },
      { name: "Hani Pertiwi", amount: 45_000_000, date: "2024-06-05" },
      { name: "Ivan Gunawan", amount: 35_000_000, date: "2024-08-10" },
    ],
  },
  {
    id: "temulawak",
    name: "Temulawak",
    annualROI: 0.16,
    payoutEveryMonths: 3,
    investors: [
      { name: "Joko Widodo", amount: 60_000_000, date: "2024-01-15" },
      { name: "Kartika Sari", amount: 55_000_000, date: "2024-04-10" },
    ],
  },
  {
    id: "lengkuas",
    name: "Lengkuas",
    annualROI: 0.14,
    payoutEveryMonths: 2,
    investors: [
      { name: "Lukman Hakim", amount: 40_000_000, date: "2024-03-05" },
      { name: "Mega Wati", amount: 50_000_000, date: "2024-06-20" },
      { name: "Nanda Arsyad", amount: 35_000_000, date: "2024-09-01" },
    ],
  },
  {
    id: "kencur",
    name: "Kencur",
    annualROI: 0.13,
    payoutEveryMonths: 3,
    investors: [
      { name: "Omar Sharif", amount: 25_000_000, date: "2024-02-01" },
      { name: "Putri Duyung", amount: 35_000_000, date: "2024-05-15" },
    ],
  },
  {
    id: "serai",
    name: "Serai",
    annualROI: 0.11,
    payoutEveryMonths: 2,
    investors: [
      { name: "Qori Sandioriva", amount: 20_000_000, date: "2024-01-30" },
      { name: "Reza Rahadian", amount: 30_000_000, date: "2024-04-15" },
      { name: "Sari Nila", amount: 25_000_000, date: "2024-07-01" },
    ],
  },
  {
    id: "pandan",
    name: "Pandan",
    annualROI: 0.12,
    payoutEveryMonths: 3,
    investors: [
      { name: "Tika Panc", amount: 30_000_000, date: "2024-02-25" },
      { name: "Udin Sedunia", amount: 40_000_000, date: "2024-06-10" },
    ],
  },
  {
    id: "daun-salam",
    name: "Daun Salam",
    annualROI: 0.1,
    payoutEveryMonths: 2,
    investors: [
      { name: "Vina Candrawati", amount: 15_000_000, date: "2024-03-10" },
      { name: "Wawan Setiawan", amount: 25_000_000, date: "2024-06-25" },
      { name: "Xenia Gratia", amount: 20_000_000, date: "2024-09-05" },
    ],
  },
  {
    id: "jeruk-nipis",
    name: "Jeruk Nipis",
    annualROI: 0.14,
    payoutEveryMonths: 3,
    investors: [
      { name: "Yanto Basuki", amount: 35_000_000, date: "2024-01-20" },
      { name: "Zara Adhisty", amount: 45_000_000, date: "2024-05-01" },
    ],
  },
  {
    id: "belimbing",
    name: "Belimbing",
    annualROI: 0.15,
    payoutEveryMonths: 2,
    investors: [
      { name: "Arief Rahman", amount: 50_000_000, date: "2024-02-10" },
      { name: "Bella Saphira", amount: 60_000_000, date: "2024-05-20" },
      { name: "Cakra Khan", amount: 40_000_000, date: "2024-08-15" },
    ],
  },
  {
    id: "jambu-biji",
    name: "Jambu Biji",
    annualROI: 0.13,
    payoutEveryMonths: 3,
    investors: [
      { name: "Dimas Anggara", amount: 30_000_000, date: "2024-01-05" },
      { name: "Enzy Storia", amount: 40_000_000, date: "2024-04-20" },
    ],
  },
  {
    id: "rambutan",
    name: "Rambutan",
    annualROI: 0.16,
    payoutEveryMonths: 2,
    investors: [
      { name: "Fedi Nuril", amount: 45_000_000, date: "2024-03-15" },
      { name: "Gita Gutawa", amount: 55_000_000, date: "2024-06-30" },
      { name: "Hamish Daud", amount: 35_000_000, date: "2024-09-10" },
    ],
  },
  {
    id: "duku",
    name: "Duku",
    annualROI: 0.17,
    payoutEveryMonths: 3,
    investors: [
      { name: "Iko Uwais", amount: 60_000_000, date: "2024-02-05" },
      { name: "Julie Estelle", amount: 50_000_000, date: "2024-05-25" },
    ],
  },
  {
    id: "langsat",
    name: "Langsat",
    annualROI: 0.14,
    payoutEveryMonths: 2,
    investors: [
      { name: "Kevin Aprilio", amount: 40_000_000, date: "2024-01-25" },
      { name: "Luna Maya", amount: 65_000_000, date: "2024-04-10" },
      { name: "Morgan Oey", amount: 45_000_000, date: "2024-07-25" },
    ],
  },
  {
    id: "salak",
    name: "Salak",
    annualROI: 0.15,
    payoutEveryMonths: 3,
    investors: [
      { name: "Nirina Zubir", amount: 35_000_000, date: "2024-02-15" },
      { name: "Oka Antara", amount: 50_000_000, date: "2024-06-01" },
    ],
  },
  {
    id: "manggis",
    name: "Manggis",
    annualROI: 0.18,
    payoutEveryMonths: 2,
    investors: [
      { name: "Pevita Pearce", amount: 70_000_000, date: "2024-03-01" },
      { name: "Qory Sandioriva", amount: 55_000_000, date: "2024-06-15" },
      { name: "Raditya Dika", amount: 40_000_000, date: "2024-09-20" },
    ],
  },
  {
    id: "durian",
    name: "Durian",
    annualROI: 0.2,
    payoutEveryMonths: 3,
    investors: [
      { name: "Sheila Dara", amount: 80_000_000, date: "2024-01-10" },
      { name: "Tarra Budiman", amount: 75_000_000, date: "2024-04-25" },
    ],
  },
  {
    id: "nangka",
    name: "Nangka",
    annualROI: 0.16,
    payoutEveryMonths: 2,
    investors: [
      { name: "Umay Shahab", amount: 45_000_000, date: "2024-02-20" },
      { name: "Vanesha Prescilla", amount: 60_000_000, date: "2024-05-10" },
      { name: "Wulan Guritno", amount: 50_000_000, date: "2024-08-05" },
    ],
  },
  {
    id: "sukun",
    name: "Sukun",
    annualROI: 0.12,
    payoutEveryMonths: 3,
    investors: [
      { name: "Xavier Mau", amount: 30_000_000, date: "2024-01-15" },
      { name: "Yuki Kato", amount: 40_000_000, date: "2024-05-05" },
    ],
  },
  {
    id: "kluwek",
    name: "Kluwek",
    annualROI: 0.13,
    payoutEveryMonths: 2,
    investors: [
      { name: "Zaskia Gotik", amount: 25_000_000, date: "2024-03-20" },
      { name: "Adipati Dolken", amount: 35_000_000, date: "2024-07-10" },
      { name: "Bunga Zainal", amount: 30_000_000, date: "2024-10-01" },
    ],
  },
  {
    id: "petai",
    name: "Petai",
    annualROI: 0.14,
    payoutEveryMonths: 3,
    investors: [
      { name: "Chelsea Islan", amount: 40_000_000, date: "2024-02-01" },
      { name: "Dion Wiyoko", amount: 50_000_000, date: "2024-06-20" },
    ],
  },
  {
    id: "melinjo",
    name: "Melinjo",
    annualROI: 0.11,
    payoutEveryMonths: 2,
    investors: [
      { name: "Ernest Prakasa", amount: 20_000_000, date: "2024-01-30" },
      { name: "Fachri Albar", amount: 30_000_000, date: "2024-04-15" },
      { name: "Gading Marten", amount: 25_000_000, date: "2024-07-30" },
    ],
  },
  {
    id: "kemang",
    name: "Kemang",
    annualROI: 0.15,
    payoutEveryMonths: 3,
    investors: [
      { name: "Hannah Al Rashid", amount: 45_000_000, date: "2024-02-25" },
      { name: "Ibnu Jamil", amount: 55_000_000, date: "2024-06-10" },
    ],
  },
  {
    id: "bisbul",
    name: "Bisbul",
    annualROI: 0.12,
    payoutEveryMonths: 2,
    investors: [
      { name: "Jefri Nichol", amount: 35_000_000, date: "2024-03-10" },
      { name: "Kimberly Ryder", amount: 40_000_000, date: "2024-06-25" },
      { name: "Lukman Sardi", amount: 30_000_000, date: "2024-09-15" },
    ],
  },
  {
    id: "ceremai",
    name: "Ceremai",
    annualROI: 0.13,
    payoutEveryMonths: 3,
    investors: [
      { name: "Marsha Timothy", amount: 50_000_000, date: "2024-01-20" },
      { name: "Nicholas Saputra", amount: 60_000_000, date: "2024-05-01" },
    ],
  },
  {
    id: "kedondong",
    name: "Kedondong",
    annualROI: 0.14,
    payoutEveryMonths: 2,
    investors: [
      { name: "Oka Antara", amount: 40_000_000, date: "2024-02-10" },
      { name: "Prisia Nasution", amount: 45_000_000, date: "2024-05-20" },
      { name: "Qausar Harta", amount: 35_000_000, date: "2024-08-15" },
    ],
  },
  {
    id: "gandaria",
    name: "Gandaria",
    annualROI: 0.16,
    payoutEveryMonths: 3,
    investors: [
      { name: "Raihaanun", amount: 55_000_000, date: "2024-01-05" },
      { name: "Surya Saputra", amount: 65_000_000, date: "2024-04-20" },
    ],
  },
  {
    id: "matoa",
    name: "Matoa",
    annualROI: 0.17,
    payoutEveryMonths: 2,
    investors: [
      { name: "Tara Basro", amount: 70_000_000, date: "2024-03-15" },
      { name: "Uus", amount: 50_000_000, date: "2024-06-30" },
      { name: "Vino G Bastian", amount: 45_000_000, date: "2024-09-10" },
    ],
  },
  {
    id: "kweni",
    name: "Kweni",
    annualROI: 0.15,
    payoutEveryMonths: 3,
    investors: [
      { name: "Widyawati", amount: 40_000_000, date: "2024-02-05" },
      { name: "Yoga Pratama", amount: 50_000_000, date: "2024-05-25" },
    ],
  },
  {
    id: "sawo",
    name: "Sawo",
    annualROI: 0.13,
    payoutEveryMonths: 2,
    investors: [
      { name: "Zara Leola", amount: 30_000_000, date: "2024-01-25" },
      { name: "Arya Saloka", amount: 40_000_000, date: "2024-04-10" },
      { name: "Bunga Citra", amount: 35_000_000, date: "2024-07-25" },
    ],
  },
  {
    id: "jamblang",
    name: "Jamblang",
    annualROI: 0.14,
    payoutEveryMonths: 3,
    investors: [
      { name: "Cut Syifa", amount: 45_000_000, date: "2024-02-15" },
      { name: "Denny Sumargo", amount: 55_000_000, date: "2024-06-01" },
    ],
  },
  {
    id: "wuni",
    name: "Wuni",
    annualROI: 0.12,
    payoutEveryMonths: 2,
    investors: [
      { name: "Endy Arfian", amount: 25_000_000, date: "2024-03-01" },
      { name: "Febby Rastanty", amount: 35_000_000, date: "2024-06-15" },
      { name: "Giorgino Abraham", amount: 30_000_000, date: "2024-09-20" },
    ],
  },
  {
    id: "kepel",
    name: "Kepel",
    annualROI: 0.11,
    payoutEveryMonths: 3,
    investors: [
      { name: "Herjunot Ali", amount: 20_000_000, date: "2024-01-10" },
      { name: "Isyana Sarasvati", amount: 30_000_000, date: "2024-04-25" },
    ],
  },
  {
    id: "lobi-lobi",
    name: "Lobi-lobi",
    annualROI: 0.13,
    payoutEveryMonths: 2,
    investors: [
      { name: "Jessica Mila", amount: 40_000_000, date: "2024-02-20" },
      { name: "Kevin Julio", amount: 45_000_000, date: "2024-05-10" },
      { name: "Laura Basuki", amount: 35_000_000, date: "2024-08-05" },
    ],
  },
]

// helpers (pure)
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, 1)
const ymKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

function formatNumberForCSV(amount: number): string {
  return amount.toString()
}

function formatCurrencyForCSV(amount: number): string {
  return `Rp ${amount}`
}

export function generateReport(plant: Plant, until: Date = new Date()) {
  const invs = [...plant.investors].sort((a, b) => a.date.localeCompare(b.date))
  if (!invs.length)
    return {
      monthly: [] as MonthlyRow[],
      yearly: [] as YearlyRow[],
      perInvestor: [] as InvestorSummary[],
      totals: { invest: 0, profit: 0, roiPct: 0, investors: 0 },
    } as const

  const first = startOfMonth(new Date(invs[0].date))
  const last = startOfMonth(until)

  const monthly: MonthlyRow[] = []
  const perInvestorInvest = new Map<string, number>()
  const perInvestorProfit = new Map<string, number>()
  const investorCapital = new Map<string, number>()

  let capital = 0
  let accrualCarry = 0
  const monthlyRate = plant.annualROI / 12

  let i = 0 // pointer
  let step = 0 // bulan berjalan

  for (let d = new Date(first); d <= last; d = addMonths(d, 1)) {
    const ym = ymKey(d)
    const mStart = startOfMonth(d)
    const mEnd = endOfMonth(d)

    // investasi baru di bulan ini
    let newInvest = 0
    while (i < invs.length) {
      const invDate = new Date(invs[i].date)
      if (invDate >= mStart && invDate <= mEnd) {
        newInvest += invs[i].amount
        capital += invs[i].amount
        perInvestorInvest.set(invs[i].name, (perInvestorInvest.get(invs[i].name) || 0) + invs[i].amount)
        investorCapital.set(invs[i].name, (investorCapital.get(invs[i].name) || 0) + invs[i].amount)
        i++
      } else if (invDate < mStart) {
        // fallback
        capital += invs[i].amount
        perInvestorInvest.set(invs[i].name, (perInvestorInvest.get(invs[i].name) || 0) + invs[i].amount)
        investorCapital.set(invs[i].name, (investorCapital.get(invs[i].name) || 0) + invs[i].amount)
        i++
      } else break
    }

    // akrual bulan ini
    const accrual = capital * monthlyRate
    accrualCarry += accrual

    // payout?
    step++
    let payout = 0
    if (step % plant.payoutEveryMonths === 0 && capital > 0) {
      payout = accrualCarry
      for (const [name, cap] of investorCapital.entries()) {
        const share = cap / capital // porsi modal
        perInvestorProfit.set(name, (perInvestorProfit.get(name) || 0) + payout * share)
      }
      accrualCarry = 0
    }

    monthly.push({
      ym,
      newInvest,
      capital,
      accrual,
      accrualSinceLastPayout: accrualCarry,
      payout,
    })
  }

  // ringkasan per tahun
  const byYear = new Map<number, { invest: number; profit: number }>()
  let totalInvest = 0
  let totalProfit = 0
  for (const m of monthly) {
    const y = Number(m.ym.slice(0, 4))
    const ent = byYear.get(y) ?? { invest: 0, profit: 0 }
    ent.invest += m.newInvest
    ent.profit += m.payout
    byYear.set(y, ent)
    totalInvest += m.newInvest
    totalProfit += m.payout
  }
  const yearly: YearlyRow[] = Array.from(byYear.entries()).map(([year, v]) => ({
    year,
    invest: v.invest,
    profit: v.profit,
    roiPct: v.invest > 0 ? (v.profit / v.invest) * 100 : 0,
  }))

  // per-investor
  const perInvestor: InvestorSummary[] = Array.from(
    new Set([...perInvestorInvest.keys(), ...perInvestorProfit.keys()]),
  ).map((name) => {
    const invest = perInvestorInvest.get(name) || 0
    const profit = perInvestorProfit.get(name) || 0
    return { name, invest, profit, roiPct: invest > 0 ? (profit / invest) * 100 : 0 }
  })

  const totals = {
    invest: totalInvest,
    profit: totalProfit,
    roiPct: totalInvest > 0 ? (totalProfit / totalInvest) * 100 : 0,
    investors: perInvestor.length,
  }

  return { monthly, yearly, perInvestor, totals } as const
}

// Tiny runtime tests (very small sanity checks)
if (typeof window !== "undefined") {
  const tPlant: Plant = {
    id: "t",
    name: "Test",
    annualROI: 0.24,
    payoutEveryMonths: 2,
    investors: [{ name: "X", amount: 1_200_000, date: "2025-01-01" }],
  }
  const t = generateReport(tPlant, new Date("2025-03-01"))
  const jan = t.monthly.find((r) => r.ym === "2025-01")
  const feb = t.monthly.find((r) => r.ym === "2025-02")
  console.assert(Math.round(jan?.accrual || 0) === 24_000, "Jan accrual should be 24k")
  console.assert(Math.round(feb?.payout || 0) === 48_000, "Feb payout should be 48k")
}

export function exportMonthlyReportCSV(plant: Plant, year?: number): string {
  const report = generateReport(plant)
  const monthlyData = year ? report.monthly.filter((row) => row.ym.startsWith(year.toString())) : report.monthly

  const headers = ["Bulan", "Investasi Baru", "Modal Akhir", "Akrual Bulan Ini", "Akrual Tertunda", "Payout"]

  const rows = monthlyData.map((row) => [
    row.ym,
    formatCurrencyForCSV(row.newInvest),
    formatCurrencyForCSV(row.capital),
    formatCurrencyForCSV(row.accrual),
    formatCurrencyForCSV(row.accrualSinceLastPayout),
    formatCurrencyForCSV(row.payout),
  ])

  return [headers, ...rows].map((row) => row.join(";")).join("\n")
}

export function exportYearlyReportCSV(plant: Plant): string {
  const report = generateReport(plant)

  const headers = ["Tahun", "Total Investasi", "Total Keuntungan", "ROI (%)"]

  const rows = report.yearly.map((row) => [
    row.year.toString(),
    formatCurrencyForCSV(row.invest),
    formatCurrencyForCSV(row.profit),
    `${row.roiPct.toFixed(2)}%`,
  ])

  return [headers, ...rows].map((row) => row.join(";")).join("\n")
}

export function exportInvestorReportCSV(plant: Plant): string {
  const report = generateReport(plant)

  const headers = ["Nama Investor", "Total Investasi", "Total Keuntungan", "ROI (%)"]

  const rows = report.perInvestor.map((investor) => [
    investor.name,
    formatCurrencyForCSV(investor.invest),
    formatCurrencyForCSV(investor.profit),
    `${investor.roiPct.toFixed(2)}%`,
  ])

  return [headers, ...rows].map((row) => row.join(";")).join("\n")
}

export function exportCompleteReportCSV(plant: Plant): string {
  const report = generateReport(plant)

  let csv = `Laporan Lengkap - ${plant.name}\n\n`

  // Summary
  csv += `RINGKASAN\n`
  csv += `Keterangan;Nilai\n`
  csv += `Total Investasi;${formatCurrencyForCSV(report.totals.invest)}\n`
  csv += `Total Keuntungan;${formatCurrencyForCSV(report.totals.profit)}\n`
  csv += `ROI;${report.totals.roiPct.toFixed(2)}%\n`
  csv += `Jumlah Investor;${report.totals.investors}\n\n`

  // Monthly Report
  csv += `LAPORAN BULANAN\n`
  csv += exportMonthlyReportCSV(plant) + "\n\n"

  // Yearly Report
  csv += `LAPORAN TAHUNAN\n`
  csv += exportYearlyReportCSV(plant) + "\n\n"

  // Investor Report
  csv += `LAPORAN PER INVESTOR\n`
  csv += exportInvestorReportCSV(plant) + "\n"

  return csv
}

export function downloadCSV(filename: string, csvContent: string): void {
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Original formatCurrency function is kept for reference
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("IDR", "Rp")
}

export function generateMemberData(): Member[] {
  const members: Member[] = []

  // Get all unique investors from all plants
  const allInvestors = new Map<
    string,
    {
      name: string
      investments: Array<{
        plantId: string
        plantName: string
        amount: number
        investDate: string
      }>
    }
  >()

  // Collect all investments per investor
  PLANTS.forEach((plant) => {
    plant.investors.forEach((investor) => {
      if (!allInvestors.has(investor.name)) {
        allInvestors.set(investor.name, {
          name: investor.name,
          investments: [],
        })
      }
      allInvestors.get(investor.name)!.investments.push({
        plantId: plant.id,
        plantName: plant.name,
        amount: investor.amount,
        investDate: investor.date,
      })
    })
  })

  // Generate member data with dummy contact info
  const emailDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
  const locations = [
    "Jakarta Selatan",
    "Jakarta Pusat",
    "Jakarta Utara",
    "Jakarta Barat",
    "Jakarta Timur",
    "Bogor",
    "Depok",
    "Tangerang",
    "Bekasi",
    "Bandung",
    "Surabaya",
    "Medan",
    "Semarang",
    "Yogyakarta",
  ]

  Array.from(allInvestors.entries()).forEach(([name, data], index) => {
    const investments = data.investments.map((inv) => {
      const plant = PLANTS.find((p) => p.id === inv.plantId)!
      const report = generateReport(plant)
      const investorSummary = report.perInvestor.find((p) => p.name === name)!

      return {
        plantId: inv.plantId,
        plantName: inv.plantName,
        amount: inv.amount,
        profit: investorSummary.profit * (inv.amount / investorSummary.invest),
        roi: investorSummary.roiPct,
        investDate: inv.investDate,
      }
    })

    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0)
    const totalProfit = investments.reduce((sum, inv) => sum + inv.profit, 0)
    const overallROI = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

    const emailName = name.toLowerCase().replace(/\s+/g, ".")
    const domain = emailDomains[index % emailDomains.length]
    const phone = `+62 8${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 9)}-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`

    members.push({
      id: `member-${index + 1}`,
      name,
      email: `${emailName}@${domain}`,
      phone,
      location: locations[index % locations.length],
      joinDate: investments.sort((a, b) => a.investDate.localeCompare(b.investDate))[0].investDate,
      investments,
      totalInvestment,
      totalProfit,
      overallROI,
    })
  })

  return members.sort((a, b) => b.totalInvestment - a.totalInvestment)
}

export function exportMemberDetailCSV(member: Member, year?: number): void {
  let csv = `Detail Anggota - ${member.name}\n\n`

  // Member Info
  csv += `INFORMASI ANGGOTA\n`
  csv += `Keterangan;Nilai\n`
  csv += `Nama;${member.name}\n`
  csv += `Email;${member.email}\n`
  csv += `Telepon;${member.phone}\n`
  csv += `Lokasi;${member.location}\n`
  csv += `Tanggal Bergabung;${new Date(member.joinDate).toLocaleDateString("id-ID")}\n\n`

  // Summary
  csv += `RINGKASAN INVESTASI\n`
  csv += `Keterangan;Nilai\n`
  csv += `Total Investasi;${formatCurrencyForCSV(member.totalInvestment)}\n`
  csv += `Total Keuntungan;${formatCurrencyForCSV(member.totalProfit)}\n`
  csv += `ROI Keseluruhan;${member.overallROI.toFixed(2)}%\n`
  csv += `Jumlah Investasi;${member.investments.length}\n\n`

  // Investment Portfolio
  csv += `PORTFOLIO INVESTASI\n`
  csv += `Tanaman;Investasi;Keuntungan;ROI (%);Tanggal Investasi\n`
  member.investments.forEach((investment) => {
    csv += `${investment.plantName};${formatCurrencyForCSV(investment.amount)};${formatCurrencyForCSV(investment.profit)};${investment.roi.toFixed(2)}%;${new Date(investment.investDate).toLocaleDateString("id-ID")}\n`
  })

  const filename = `detail-anggota-${member.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`
  downloadCSV(filename, csv)
}
