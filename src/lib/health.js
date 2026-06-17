// ตัวช่วยคำนวณด้านสุขภาพ (BMR / TDEE / BMI / มาโคร / ไขมันในร่างกาย)

export const ACTIVITY = {
  sedentary: { label: "นั่งทำงาน ไม่ค่อยขยับ", factor: 1.2 },
  light: { label: "ออกกำลังเบาๆ 1-3 วัน/สัปดาห์", factor: 1.375 },
  moderate: { label: "ออกกำลังปานกลาง 3-5 วัน/สัปดาห์", factor: 1.55 },
  active: { label: "ออกกำลังหนัก 6-7 วัน/สัปดาห์", factor: 1.725 },
  very_active: { label: "ออกหนักมาก/ใช้แรงงาน", factor: 1.9 },
};

export const GOALS = {
  lose: { label: "ลดน้ำหนัก", adjust: -500 },
  maintain: { label: "คงน้ำหนัก", adjust: 0 },
  gain: { label: "เพิ่มน้ำหนัก", adjust: 500 },
};

// BMR — สูตร Mifflin-St Jeor
export function calcBMR({ sex, weightKg, heightCm, age }) {
  if (!weightKg || !heightCm || !age) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "female" ? base - 161 : base + 5);
}

export function calcTDEE(bmr, activityKey) {
  const f = ACTIVITY[activityKey]?.factor ?? 1.55;
  return Math.round(bmr * f);
}

export function calcGoalKcal(tdee, goalKey) {
  const adj = GOALS[goalKey]?.adjust ?? 0;
  return Math.max(1000, tdee + adj);
}

// BMI
export function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return 0;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi) {
  if (!bmi) return { label: "-", color: "#a1a1aa" };
  if (bmi < 18.5) return { label: "น้ำหนักน้อย", color: "#3b82f6" };
  if (bmi < 23) return { label: "ปกติ (สุขภาพดี)", color: "#22c55e" };
  if (bmi < 25) return { label: "ท้วม", color: "#f5b700" };
  if (bmi < 30) return { label: "อ้วนระดับ 1", color: "#f97316" };
  return { label: "อ้วนระดับ 2", color: "#ef4444" };
}

// มาโครเป้าหมาย (โปรตีน 30% / คาร์บ 40% / ไขมัน 30% ของแคลเป้าหมาย)
export function calcMacroGoals(goalKcal) {
  return {
    protein_goal_g: Math.round((goalKcal * 0.3) / 4),
    carb_goal_g: Math.round((goalKcal * 0.4) / 4),
    fat_goal_g: Math.round((goalKcal * 0.3) / 9),
  };
}

// ประมาณมาโครต่อหน่วยเสิร์ฟจากแคล + หมวดอาหาร (ทางเลือกฟรี ไม่ใช้ AI)
// สัดส่วนพลังงาน [โปรตีน%, คาร์บ%, ไขมัน%] โดยอิงลักษณะอาหารไทยแต่ละหมวด
const MACRO_SPLITS = {
  "จานข้าว": [25, 50, 25],
  "เส้น": [20, 55, 25],
  "แกง/ต้ม": [28, 27, 45], // กะทิ/น้ำมันเยอะ
  "กับข้าว": [30, 30, 40], // ผัด/ทอดเนื้อสัตว์
  "ทานเล่น": [12, 48, 40], // ของทอด
  "ยำ/น้ำพริก": [30, 35, 35],
  "สลัด/คลีน": [35, 35, 30],
  "ของหวาน": [8, 72, 20], // น้ำตาลเยอะ
  "เครื่องดื่ม": [8, 82, 10],
};
const DEFAULT_SPLIT = [25, 45, 30];

export function estimateMacros(kcal, category) {
  const k = Number(kcal) || 0;
  const [pP, pC, pF] = MACRO_SPLITS[category] || DEFAULT_SPLIT;
  return {
    protein_g: Math.round(((k * pP) / 100) / 4),
    carb_g: Math.round(((k * pC) / 100) / 4),
    fat_g: Math.round(((k * pF) / 100) / 9),
  };
}

// % ไขมันในร่างกาย — สูตรกองทัพเรือสหรัฐ (US Navy)
// ชาย: ใช้ รอบเอว(waist) + รอบคอ(neck) + ส่วนสูง
// หญิง: ใช้ รอบเอว + รอบสะโพก(hip) + รอบคอ + ส่วนสูง
export function calcBodyFat({ sex, heightCm, neckCm, waistCm, hipCm }) {
  if (!heightCm || !neckCm || !waistCm) return 0;
  let bf;
  if (sex === "female") {
    if (!hipCm) return 0;
    bf =
      163.205 * Math.log10(waistCm + hipCm - neckCm) -
      97.684 * Math.log10(heightCm) -
      78.387;
  } else {
    bf =
      86.01 * Math.log10(waistCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76;
  }
  if (!isFinite(bf) || bf < 0) return 0;
  return Math.round(bf * 10) / 10;
}
