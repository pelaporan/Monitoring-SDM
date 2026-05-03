/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Calendar, Clock, Search, Filter, 
  ChevronRight, Award, DollarSign, UserMinus, AlertCircle,
  FileText, ArrowUpDown
} from 'lucide-react';
import { Pegawai } from '../types';
import { calculateNextPangkat, calculateNextKGB, calculatePensiun, getBUP } from '../lib/monitoringUtils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';
import * as Constants from '../constants';

interface MonitoringASNProps {
  data: Pegawai[];
}

type TabType = 'pangkat' | 'kgb' | 'pensiun';

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    prioritas: "bg-red-100 text-red-600 border-red-200",
    segera: "bg-amber-100 text-amber-600 border-amber-200",
    aman: "bg-emerald-100 text-emerald-600 border-emerald-200",
    terlambat: "bg-slate-100 text-slate-600 border-slate-200"
  };
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border tracking-tight",
      configs[status] || configs.aman
    )}>
      {status}
    </span>
  );
};

const SummaryCard = ({ title, value, icon: Icon, colorClass, statusLabel }: any) => (
  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 transition-all hover:shadow-md hover:-translate-y-1">
    <div className={cn("p-4 rounded-2xl", colorClass)}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <span className="text-xs text-gray-400 font-medium">Orang</span>
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5 font-semibold uppercase">{statusLabel}</p>
    </div>
  </div>
);

export const MonitoringASN: React.FC<MonitoringASNProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TabType>('pangkat');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    unit: '',
    golongan: '',
    jabatan: ''
  });

  // Process data with calculations
  const processedData = useMemo(() => {
    return data
      .filter(p => p.Status_Pegawai === 'PNS' || p.Status_Pegawai === 'PPPK')
      .map(p => {
        const bup = getBUP(p.Jabatan, p.Kelompok_Jabatan);
        return {
          ...p,
          pangkatInfo: calculateNextPangkat(p.TMT_Pangkat || ''),
          kgbInfo: calculateNextKGB(p.TMT_KGB || ''),
          pensiunInfo: calculatePensiun(p.Tanggal_Lahir || '', bup)
        };
      });
  }, [data]);

  // Tab specific calculations
  const stats = useMemo(() => {
    return {
      pangkat: processedData.filter(p => p.pangkatInfo.status === 'prioritas' || p.pangkatInfo.status === 'segera').length,
      kgb: processedData.filter(p => p.kgbInfo.status === 'prioritas' || p.kgbInfo.status === 'segera').length,
      pensiun: processedData.filter(p => p.pensiunInfo.status === 'prioritas' || p.pensiunInfo.status === 'segera').length
    };
  }, [processedData]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    let list = processedData.filter(p => {
      const matchSearch = String(p.Nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          String(p.NIP || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchGol = !filters.golongan || p.Gol === filters.golongan;
      const matchJabatan = !filters.jabatan || p.Kelompok_Jabatan === filters.jabatan;
      const matchUnit = !filters.unit || p.Kelompok_Jabatan === filters.unit;

      return matchSearch && matchGol && matchJabatan && matchUnit;
    });

    // Sort by nearest date for active tab
    list.sort((a, b) => {
      const dateA = activeTab === 'pangkat' ? a.pangkatInfo.nextDate : 
                    activeTab === 'kgb' ? a.kgbInfo.nextDate : a.pensiunInfo.nextDate;
      const dateB = activeTab === 'pangkat' ? b.pangkatInfo.nextDate : 
                    activeTab === 'kgb' ? b.kgbInfo.nextDate : b.pensiunInfo.nextDate;
      
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    return list;
  }, [processedData, searchTerm, filters, activeTab]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Monitoring ASN</h2>
          <p className="text-sm text-gray-500 mt-0.5">Pantau siklus kepegawaian untuk kenaikan pangkat, gaji, dan pensiun</p>
        </div>
        <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-gray-200">
          <button 
            onClick={() => setActiveTab('pangkat')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'pangkat' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
            )}
          >
            Kenaikan Pangkat
          </button>
          <button 
            onClick={() => setActiveTab('kgb')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'kgb' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
            )}
          >
            KGB (Gaji)
          </button>
          <button 
            onClick={() => setActiveTab('pensiun')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'pensiun' ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
            )}
          >
            Pensiun
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard 
          title="Segera Naik Pangkat" 
          value={stats.pangkat} 
          icon={Award} 
          colorClass="bg-blue-50 text-blue-600" 
          statusLabel="Deadline ≤ 6 Bulan"
        />
        <SummaryCard 
          title="Segera KGB" 
          value={stats.kgb} 
          icon={DollarSign} 
          colorClass="bg-emerald-50 text-emerald-600" 
          statusLabel="Deadline ≤ 6 Bulan"
        />
        <SummaryCard 
          title="Menjelang Pensiun" 
          value={stats.pensiun} 
          icon={UserMinus} 
          colorClass="bg-orange-50 text-orange-600" 
          statusLabel="Deadline ≤ 1 Tahun"
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[32px] shadow-sm border border-orange-100 overflow-hidden">
        {/* Table Filters */}
        <div className="p-8 border-b border-orange-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                {activeTab === 'pangkat' ? <Award className="w-5 h-5" /> : 
                 activeTab === 'kgb' ? <DollarSign className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {activeTab === 'pangkat' ? 'Monitoring Kenaikan Pangkat' : 
                   activeTab === 'kgb' ? 'Monitoring Gaji Berkala' : 'Monitoring Masa Pensiun'}
                </h3>
                <p className="text-sm text-gray-400 capitalize">Menampilkan data terjadwal paling dekat</p>
              </div>
            </div>
            
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Cari Nama / NIP..."
                className="pl-11 pr-6 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Kelompok Jabatan</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
                value={filters.jabatan}
                onChange={(e) => setFilters(f => ({ ...f, jabatan: e.target.value }))}
              >
                <option value="">Semua Jabatan</option>
                {Constants.KELOMPOK_JABATAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Golongan</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
                value={filters.golongan}
                onChange={(e) => setFilters(f => ({ ...f, golongan: e.target.value }))}
              >
                <option value="">Semua Golongan</option>
                {Constants.GOLONGAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Unit Kerja</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
                value={filters.unit}
                onChange={(e) => setFilters(f => ({ ...f, unit: e.target.value }))}
              >
                <option value="">Semua Unit</option>
                {Constants.KELOMPOK_JABATAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Identitas Pegawai</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jabatan & Gol</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">TMT Last / Next</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status & Countdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((p, idx) => {
                const info = activeTab === 'pangkat' ? p.pangkatInfo : 
                             activeTab === 'kgb' ? p.kgbInfo : p.pensiunInfo;
                
                const lastDate = activeTab === 'pangkat' ? p.TMT_Pangkat : 
                                 activeTab === 'kgb' ? p.TMT_KGB : p.Tanggal_Lahir;

                return (
                  <tr key={idx} className={cn(
                    "hover:bg-blue-50/30 transition-colors group",
                    info.status === 'prioritas' && "bg-red-50/20"
                  )}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{p.Nama}</div>
                      <div className="text-xs text-gray-400 font-medium tracking-tight">NIP: {p.NIP || '(Tanpa NIP)'}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{p.Status_Pegawai}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-700 font-bold">{p.Jabatan}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{p.Gol}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] text-gray-400 font-medium">Last: {lastDate || '-'}</div>
                      <div className="text-xs text-gray-900 font-bold mt-1">
                        Next: {info.nextDate ? format(info.nextDate, 'dd MMMM yyyy', { locale: id }) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={info.status} />
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-xs font-bold",
                            info.monthsRemaining < 0 ? "text-red-500" : "text-gray-700"
                          )}>
                            {info.monthsRemaining < 0 ? 'Terlambat' : `Sisa ${info.monthsRemaining} Bulan`}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                    Belum ada data monitoring untuk kriteria ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
