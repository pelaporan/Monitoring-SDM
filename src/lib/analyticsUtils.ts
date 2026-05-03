/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const calculateAge = (birthDateString: string): number => {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const getAgeCategory = (age: number): string => {
  if (age < 18) return '< 18';
  if (age <= 20) return '18-20';
  if (age <= 25) return '21-25';
  if (age <= 30) return '26-30';
  if (age <= 35) return '31-35';
  if (age <= 40) return '36-40';
  if (age <= 45) return '41-45';
  if (age <= 50) return '46-50';
  if (age <= 55) return '51-55';
  if (age <= 60) return '56-60';
  if (age <= 65) return '61-65';
  if (age <= 70) return '66-70';
  return '> 70';
};

export const AGE_CATEGORIES = [
  '18-20', '21-25', '26-30', '31-35', '36-40', '41-45', '46-50', '51-55', '56-60', '61-65', '66-70', '> 70'
];
