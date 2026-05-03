/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { addYears, differenceInMonths, isValid, parseISO } from 'date-fns';

export interface MonitoringResult {
  nextDate: Date | null;
  monthsRemaining: number;
  status: 'aman' | 'segera' | 'prioritas' | 'terlambat';
}

export const getBUP = (jabatan: string = '', kelompokJabatan: string = ''): number => {
  const normalizedJabatan = jabatan.toLowerCase();
  const normalizedKelompok = kelompokJabatan.toLowerCase();

  if (normalizedKelompok.includes('utama') || normalizedJabatan.includes('utama')) return 65;
  if (normalizedKelompok.includes('fungsional') || normalizedKelompok.includes('medis') || normalizedKelompok.includes('perawat')) return 60;
  
  return 58; // Default
};

export const calculateNextPangkat = (tmtPangkat: string): MonitoringResult => {
  const date = parseISO(tmtPangkat);
  if (!isValid(date)) return { nextDate: null, monthsRemaining: 0, status: 'aman' };
  
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
  if (!isValid(date)) return { nextDate: null, monthsRemaining: 0, status: 'aman' };
  
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
  const date = parseISO(birthDate);
  if (!isValid(date)) return { nextDate: null, monthsRemaining: 0, status: 'aman' };
  
  const nextDate = addYears(date, bup);
  const now = new Date();
  const monthsRemaining = differenceInMonths(nextDate, now);
  
  let status: MonitoringResult['status'] = 'aman';
  if (monthsRemaining < 0) status = 'terlambat';
  else if (monthsRemaining <= 6) status = 'prioritas';
  else if (monthsRemaining <= 12) status = 'segera';
  
  return { nextDate, monthsRemaining, status };
};
