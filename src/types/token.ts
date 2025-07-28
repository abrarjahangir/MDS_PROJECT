
export interface TokenData {
  id: string;
  tokenNumber: string;
  customerName: string;
  itemDescription: string;
  itemWeight: string;
  phoneNumber?: string;
  percentage?: string;
  element?: string;
  percentageInWords?: string;
  remarks?: string;
  image?: string;
  date: string;
  time: string;
  timestamp: number;
}

export interface HistoryItem {
  tokenNumber: string;
  customerName: string;
  itemDescription: string;
  phoneNumber?: string;
  date: string;
  time: string;
  timestamp: number;
}
