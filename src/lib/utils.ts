// Calculate distance between two coordinates in kilometers using Haversine formula
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === 0 && lon1 === 0) return 0;
  if (lat2 === 0 && lon2 === 0) return 0;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDayName(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

export function getNextDays(count: number = 7): Array<{ dateStr: string; dayName: string; formatted: string }> {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dateStr = formatLocalDate(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({ dateStr, dayName, formatted });
  }
  return days;
}

// Convert 24hr "18:00" to "06:00 PM"
export function formatTime24to12(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  const formattedH = h < 10 ? `0${h}` : `${h}`;
  return `${formattedH}:${m} ${ampm}`;
}

// Parse time string (e.g., "06:00 AM", "6:00 AM", "18:00", "6:00 PM") into minutes from midnight for accurate chronological sorting
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const clean = str.replace(/[^0-9:]/g, '');
  const parts = clean.split(':').map(Number);
  let h = parts[0] || 0;
  const m = parts[1] || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

// Deduplicate slots for the same arena, date, and start time (prevents dual slots for same day)
export function deduplicateSlots<T extends { arenaId?: string; date?: string; startTime: string; status?: string }>(slots: T[]): T[] {
  const seen = new Map<string, T>();
  for (const slot of slots) {
    const arenaKey = slot.arenaId || 'default_arena';
    const dateKey = slot.date || 'default_date';
    const startMin = parseTimeToMinutes(slot.startTime);
    const key = `${arenaKey}_${dateKey}_${startMin}`;

    if (!seen.has(key)) {
      seen.set(key, slot);
    } else {
      const existing = seen.get(key)!;
      // If current slot is booked/reserved and existing is available, keep the booked one
      if ((slot.status === 'BOOKED' || slot.status === 'BOOKED_BY_OWNER') && existing.status === 'AVAILABLE') {
        seen.set(key, slot);
      }
    }
  }
  return Array.from(seen.values());
}

// Sort slots chronologically by date and start time, automatically removing duplicate dual slots
export function sortSlotsChronologically<T extends { arenaId?: string; date?: string; startTime: string; status?: string }>(slots: T[]): T[] {
  const deduped = deduplicateSlots(slots);
  return deduped.sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });
}

// Helper to compress / convert image file to web-safe base64 data URL for robust storage
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isTimeSlotPast(dateStr: string, startTime24: string): boolean {
  if (!dateStr || !startTime24) return false;
  const today = getTodayDateString();
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [hStr, mStr] = startTime24.split(':');
  const slotMinutes = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);

  return slotMinutes <= currentMinutes;
}

export function sanitizeFirestoreData<T extends Record<string, any>>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  const result: any = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeFirestoreData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function isCashMethod(method?: string, mode?: string): boolean {
  const m = (method || '').toUpperCase();
  const md = (mode || '').toUpperCase();
  return (
    m === 'PAY_LATER_AT_TURF' ||
    m === 'CASH_OR_COUNTER_UPI' ||
    m === 'CASH' ||
    m === 'OFFLINE' ||
    md === 'PAY_LATER' ||
    md === 'PAY_LATER_AT_TURF'
  );
}

export interface BookingFinancialSplit {
  onlineRevenue: number;
  cashRevenue: number;
  pendingDue: number;
}

export function calculateStandardBookingFinancials(b: {
  bookingStatus?: string;
  totalAmount?: number;
  amountPaid?: number;
  amountDue?: number;
  paymentMethod?: string;
  paymentMode?: string;
  bookingType?: string;
  counterAmountPaid?: number;
  advancePaid?: number;
  refundAmount?: number;
  paymentStatus?: string;
  upiTxnId?: string;
  upiTxnRef?: string;
}): BookingFinancialSplit {
  if (b.bookingStatus === 'CANCELLED') {
    const onlineRetained = Math.max(0, (b.advancePaid || 0) - (b.refundAmount || 0));
    return {
      onlineRevenue: onlineRetained,
      cashRevenue: 0,
      pendingDue: 0,
    };
  }

  const totalAmount = b.totalAmount || 0;
  const amountPaid = b.amountPaid !== undefined
    ? b.amountPaid
    : (b.paymentStatus === 'PAID' ? totalAmount : 0);
  const amountDue = b.amountDue !== undefined
    ? b.amountDue
    : Math.max(0, totalAmount - amountPaid);

  if (isCashMethod(b.paymentMethod, b.paymentMode) || b.bookingType === 'OWNER') {
    return {
      onlineRevenue: 0,
      cashRevenue: amountPaid,
      pendingDue: amountDue,
    };
  }

  // If counter collection was explicitly recorded
  if (b.counterAmountPaid !== undefined && b.counterAmountPaid > 0) {
    const cash = Math.min(amountPaid, b.counterAmountPaid);
    const online = Math.max(0, amountPaid - cash);
    return {
      onlineRevenue: online,
      cashRevenue: cash,
      pendingDue: amountDue,
    };
  }

  // If advancePaid exists (partial booking)
  if (b.advancePaid !== undefined && b.advancePaid > 0) {
    const online = Math.min(amountPaid, b.advancePaid);
    const cash = Math.max(0, amountPaid - online);
    return {
      onlineRevenue: online,
      cashRevenue: cash,
      pendingDue: amountDue,
    };
  }

  // Default to online revenue for online gateway methods
  const isOnlineMethod =
    b.paymentMethod === 'PAY_NOW' ||
    b.paymentMethod === 'RAZORPAY' ||
    b.paymentMethod === 'UPI_QR' ||
    b.paymentMethod === 'DIRECT_UPI' ||
    b.paymentMethod === 'ONLINE_RAZORPAY' ||
    b.paymentMode === 'PAY_FULL' ||
    Boolean(b.upiTxnId) ||
    Boolean(b.upiTxnRef) ||
    (b.bookingType === 'PLAYER' && !b.counterAmountPaid);

  if (isOnlineMethod) {
    return {
      onlineRevenue: amountPaid,
      cashRevenue: 0,
      pendingDue: amountDue,
    };
  }

  return {
    onlineRevenue: amountPaid,
    cashRevenue: 0,
    pendingDue: amountDue,
  };
}

