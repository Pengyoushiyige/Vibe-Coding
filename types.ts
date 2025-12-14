export enum Payer {
  User1 = 'USER1',
  User2 = 'USER2',
  Split = 'SPLIT'
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  taxRate: number; // 0.08 or 0.10
  payer: Payer;
}

export interface BillData {
  items: BillItem[];
}

export interface AnalysisResult {
  items: { name: string; price: number; taxRate: number }[];
}
