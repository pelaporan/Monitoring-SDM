/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Pegawai {
  // 1. IDENTITAS UTAMA
  id_pegawai: string;
  NIK: string;
  NIP: string;
  Nama: string;
  Status_Pegawai: string;
  Tempat_Lahir: string;
  Tanggal_Lahir: string;
  Jenis_Kelamin: 'Laki-laki' | 'Perempuan';
  Agama: string;
  Status: string;

  // 2. DATA KELUARGA
  Status_Keluarga: string;
  No_KK: string;
  Nama_Suami_Istri: string;
  Jumlah_Anak: number;

  // 3. ALAMAT
  Alamat: string;
  Kabupaten_Kota: string;
  Provinsi: string;

  // 4. PENDIDIKAN
  Jenjang_Pendidikan: string;
  Fakultas: string;
  Jurusan: string;
  Asal_Pendidikan: string;
  Tanggal_Lulus: string;
  Lampiran_Ijazah?: string; // URL/Path
  Lampiran_Transkrip?: string; // URL/Path

  // 5. KEPEGAWAIAN
  Kelompok_Jabatan: string;
  Jabatan: string;
  Gol: string;

  // 6. RIWAYAT PANGKAT
  No_SK_Pangkat: string;
  TMT_Pangkat: string;
  Lampiran_SK_Kenaikan_Pangkat?: string;
  TMT_Berikutnya: string;

  // 7. CPNS / PNS
  TMT_CPNS: string;
  No_SK_CPNS: string;
  Lampiran_SK_CPNS?: string;
  No_SK_PNS: string;
  Lampiran_SK_PNS?: string;

  // 8. PENUGASAN
  TMT_Nota_Tugas: string;
  Lampiran_Nota_Tugas?: string;
  No_SK_Aktif_Tugas: string;
  Lampiran_Aktif_Tugas?: string;
  Masuk_RS: string;
  Masa_Kerja_RS: string;

  // 9. PENSIUN
  Rentang_BUP: string;
  TMT_Pensiun: string;

  // 10. ADMINISTRASI
  No_BPJS: string;
  Lampiran_BPJS?: string;
  No_BPJSKET_TASPEN: string;
  Lampiran_Ketenagakerjaan?: string;
  NPWP: string;
  Lampiran_NPWP?: string;

  // 11. KONTAK
  Email: string;
  No_Telp: string;

  // 12. DOKUMEN PRIBADI
  Lampiran_KTP?: string;
  Image?: string;

  // 13. LAINNYA
  Keterangan: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export type PegawaiFormData = Partial<Pegawai>;

export interface Dokumen {
  id_dokumen: string;
  id_pegawai: string;
  NIK: string;
  Nama: string;
  Jenis_Pegawai: string;
  Jenis: string;
  Jenis_Dokumen: "SIP" | "SIK" | "STR" | string;
  Nomor_Dokumen: string;
  Tanggal_Terbit: string;
  Tanggal_Expired: string;
  Sisa_Hari: number;
  Masa_Aktif: string;
  Is_Aktif: boolean | string;
  Versi_Dokumen: number;
  Status_Dokumen: string;
  Upload_Dokumen?: string;
  timestamp?: string;
}

export type DokumenFormData = Partial<Dokumen>;
