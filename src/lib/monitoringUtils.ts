/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { addYears, differenceInMonths, isValid, parseISO, isDate } from 'date-fns';

export interface MonitoringResult {
  nextDate: Date | null;
  monthsRemaining: number;
  status: 'aman' | 'segera' | 'prioritas' | 'terlambat';
}

const isValidDate = (date: any): date is Date => {
  return isDate(date) && isValid(date);
};

export const getBUP = (jabatan: string = '', kelompokJabatan: string = ''): number => {
  const normalizedJabatan = String(jabatan || '').toLowerCase();
  const normalizedKelompok = String(kelompokJabatan || '').toLowerCase();

  if (normalizedKelompok.includes('utama') || normalizedJabatan.includes('utama')) return 65;
  if (normalizedKelompok.includes('fungsional') || normalizedKelompok.includes('medis') || normalizedKelompok.includes('perawat')) return 60;
  
  return 58; // Default
};

export const calculateNextPangkat = (tmtPangkat: string): MonitoringResult => {
  const date = parseISO(tmtPangkat);
  if (!isValidDate(date)) return { nextDate: null, monthsRemaining: 0, status: 'aman' };
  
  const nextDate = addYears(date, 4);
  const now = new Date();
  const monthsRemaining = differenceInMonths(nextDate, now);
  
  let status: MonitoringResult['status'] = 'aman';
  if (monthsRemaining < 0) status = 'terlambat';
  else if (monthsRemaining <= 3) status = 'prioritas';
  else if (monthsRemaining <= 6) status = 'segera';
  
  return { nextDate, monthsRemaining, status };
};

export const calculateNextKGB = (tmtKGB: string): MonitoringResult => {
  const date = parseISO(tmtKGB);
  if (!isValidDate(date)) return { nextDate: null, monthsRemaining: 0, status: 'aman' };
  
  const nextDate = addYears(date, 2);
  const now = new Date();
  const monthsRemaining = differenceInMonths(nextDate, now);
  
  let status: MonitoringResult['status'] = 'aman';
  if (monthsRemaining < 0) status = 'terlambat';
  else if (monthsRemaining <= 2) status = 'prioritas';
  else if (monthsRemaining <= 6) status = 'segera';
  
  return { nextDate, monthsRemaining, status };
};

export const calculatePensiun = (birthDate: string, bup: number): MonitoringResult => {
  if (!birthDate) return { nextDate: null, monthsRemaining: 0, status: 'aman' };
  
  let date = parseISO(birthDate);
  // Fallback for non-ISO dates if possible, or just re-check validity
  if (!isValidDate(date)) {
    date = new Date(birthDate);
  }

  if (!isValidDate(date)) return { nextDate: null, monthsRemaining: 0, status: 'aman' };
  
  // Ensure bup is a valid number
  const safeBup = isNaN(bup) ? 58 : bup;
  
  // 1. Tahun mencapai BUP
  const retirementYear = date.getFullYear() + safeBup;
  const retirementMonth = date.getMonth();
  
  // 2. Tanggal 1 pada bulan berikutnya (Aturan BKN/Pensiun)
  let targetMonth = retirementMonth + 1;
  let targetYear = retirementYear;
  
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }
  
  const nextDate = new Date(targetYear, targetMonth, 1);
  if (!isValidDate(nextDate)) return { nextDate: null, monthsRemaining: 0, status: 'aman' };

  const now = new Date();
  const monthsRemaining = differenceInMonths(nextDate, now);
  
  let status: MonitoringResult['status'] = 'aman';
  if (monthsRemaining < 0) status = 'terlambat';
  else if (monthsRemaining <= 6) status = 'prioritas';
  else if (monthsRemaining <= 12) status = 'segera';
  
  return { nextDate, monthsRemaining, status };
};
