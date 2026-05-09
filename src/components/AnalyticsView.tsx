/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, UserCheck, UserPlus, UserMinus, TrendingUp, 
  Download, Search, Filter, PieChart as PieChartIcon, 
  BarChart2, Table, Calendar, MapPin, Briefcase, Award
} from 'lucide-react';
import { Pegawai } from '../types';
import { calculateAge, getAgeCategory, AGE_CATEGORIES } from '../lib/analyticsUtils';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import * as Constants from '../constants';

interface AnalyticsViewProps {
  data: Pegawai[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const SummaryCard = ({ title, value, icon: Icon, colorClass, subText, isPrimary = false }: any) => (
  <div className={cn(
    "bg-white rounded-[32px] p-6 border transition-all hover:shadow-lg group flex items-start gap-5",
    isPrimary ? "border-blue-100 shadow-xl shadow-blue-50 ring-4 ring-blue-50/50" : "border-gray-50 shadow-sm hover:border-blue-200"
  )}>
    <div className={cn(
      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-white/50",
      colorClass
    )}>
      <Icon className="w-7 h-7" />
    </div>
    <div>
      <p className={cn(
        "font-bold uppercase tracking-widest text-[10px] transition-colors",
        isPrimary ? "text-blue-500" : "text-gray-400"
      )}>{title}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <h3 className={cn(
          "font-black text-gray-900 tracking-tight",
          isPrimary ? "text-3xl" : "text-2xl"
        )}>{value}</h3>
      </div>
      {subText && <p className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-tight">{subText}</p>}
    </div>
  </div>
);

const ChartCard = ({ title, icon: Icon, children, className }: any) => (
  <div className={cn("bg-white rounded-3xl p-6 shadow-sm border border-gray-100", className)}>
    <div className="flex items-center gap-2 mb-6">
      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
        <Icon className="w-4 h-4" />
      </div>
      <h4 className="font-bold text-gray-800 uppercase tracking-wider text-xs">{title}</h4>
    </div>
    <div className="h-[300px] w-full">
      {children}
    </div>
  </div>
);

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    unit: '',
    golongan: '',
    jabatan: '',
    ageCategory: ''
  });

  // 1. Process Data with Memo
  const processedData = useMemo(() => {
    return data.map(p => ({
      ...p,
      age: calculateAge(p.Tanggal_Lahir),
      ageCategory: getAgeCategory(calculateAge(p.Tanggal_Lahir))
    }));
  }, [data]);

  // 2. Agregasi Stats
  const stats = useMemo(() => {
    const total = processedData.length;
    const pns = processedData.filter(p => p.Status_Pegawai === 'PNS').length;
    const pppk = processedData.filter(p => p.Status_Pegawai === 'PPPK').length;
    const honorer = processedData.filter(p => p.Status_Pegawai?.toLowerCase().includes('honorer')).length;
    const avgAge = total > 0 ? Math.round(processedData.reduce((acc, curr) => acc + curr.age, 0) / total) : 0;
    
    return { total, pns, pppk, honorer, avgAge };
  }, [processedData]);

  // 3. Chart Data
  const genderData = useMemo(() => {
    const counts = processedData.reduce((acc: any, curr) => {
      acc[curr.Jenis_Kelamin] = (acc[curr.Jenis_Kelamin] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [processedData]);

  const educationData = useMemo(() => {
    const counts = processedData.reduce((acc: any, curr) => {
      const edu = curr.Jenjang_Pendidikan || 'N/A';
      acc[edu] = (acc[edu] || 0) + 1;
      return acc;
    }, {});
    
    return Object.keys(counts)
      .map(name => ({ name, value: counts[name] }))
      .sort((a, b) => {
        const getIndex = (name: string) => {
          const normalized = name.toLowerCase().trim();
          if (normalized === 'sma' || normalized === 'smk') {
            return Constants.JENJANG_PENDIDIKAN_OPTIONS.findIndex(
              opt => opt.toLowerCase().trim() === 'sma/smk'
            );
          }
          return Constants.JENJANG_PENDIDIKAN_OPTIONS.findIndex(
            opt => opt.toLowerCase().trim() === normalized
          );
        };

        const indexA = getIndex(a.name);
        const indexB = getIndex(b.name);
        
        if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });
  }, [processedData]);

  const ageCategoryData = useMemo(() => {
    const counts = processedData.reduce((acc: any, curr) => {
      acc[curr.ageCategory] = (acc[curr.ageCategory] || 0) + 1;
      return acc;
    }, {});
    return AGE_CATEGORIES.map(cat => ({ name: cat, value: counts[cat] || 0 }));
  }, [processedData]);

  const religionData = useMemo(() => {
    const counts = processedData.reduce((acc: any, curr) => {
      const val = curr.Agama || 'N/A';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [processedData]);

  const jabatanData = useMemo(() => {
    const counts = processedData.reduce((acc: any, curr) => {
      const val = curr.Kelompok_Jabatan || 'N/A';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [processedData]);

  const golonganData = useMemo(() => {
    const counts = processedData.reduce((acc: any, curr) => {
      const val = curr.Gol || 'N/A';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    
    return Object.keys(counts)
      .map(name => ({ name, value: counts[name] }))
      .sort((a, b) => {
        const indexA = Constants.GOLONGAN_OPTIONS.findIndex(
          opt => opt.split(' - ')[0] === a.name || opt === a.name
        );
        const indexB = Constants.GOLONGAN_OPTIONS.findIndex(
          opt => opt.split(' - ')[0] === b.name || opt === b.name
        );
        
        if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });
  }, [processedData]);

  // 4. Filtering Table
  const filteredData = useMemo(() => {
    return processedData.filter(p => {
      const matchesSearch = 
        String(p.Nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        String(p.NIP || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !filters.status || p.Status_Pegawai === filters.status;
      const matchesGol = !filters.golongan || p.Gol === filters.golongan;
      const matchesJabatan = !filters.jabatan || p.Kelompok_Jabatan === filters.jabatan;
      const matchesAge = !filters.ageCategory || p.ageCategory === filters.ageCategory;
      
      // Since 'unit' isn't explicitly defined, we skip it or use a default if available.
      // Assuming Kelompok_Jabatan might serve as Unit for now as requested.
      const matchesUnit = !filters.unit || p.Kelompok_Jabatan === filters.unit;

      return matchesSearch && matchesStatus && matchesGol && matchesJabatan && matchesAge && matchesUnit;
    });
  }, [processedData, searchTerm, filters]);

  const handleExportExcel = () => {
    const exportData = filteredData.map(p => ({
      'Nama': p.Nama,
      'NIP': p.NIP,
      'Jenis Pegawai': p.Status_Pegawai,
      'Golongan': p.Gol,
      'Pendidikan': p.Jenjang_Pendidikan,
      'Jurusan': p.Jurusan,
      'Jenis Jabatan': p.Kelompok_Jabatan,
      'Unit Kerja': p.Kelompok_Jabatan, // Placeholder
      'Umur': p.age,
      'Agama': p.Agama,
      'Jenis Kelamin': p.Jenis_Kelamin
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan SDM");
    XLSX.writeFile(wb, `Laporan_SDM_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-white transition-all sticky top-0 z-10 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Laporan & Analitik SDM</h2>
          <p className="text-sm text-gray-500 mt-1">Gambarkan data kepegawaian secara visual dan mendalam</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 shadow-sm cursor-pointer hover:bg-gray-50 transition-all">
            <input 
              type="checkbox" 
              checked={showLabels} 
              onChange={(e) => setShowLabels(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Tampilkan Angka
          </label>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Pegawai" 
          value={stats.total} 
          icon={Users} 
          colorClass="bg-blue-50 text-blue-600 shadow-blue-100"
          subText="Aktif dalam database"
          isPrimary={true}
        />
        <SummaryCard 
          title="PNS / PPPK" 
          value={`${stats.pns} / ${stats.pppk}`} 
          icon={UserCheck} 
          colorClass="bg-emerald-50 text-emerald-600"
          subText="Status ASN aktif"
        />
        <SummaryCard 
          title="Honorer" 
          value={stats.honorer} 
          icon={UserPlus} 
          colorClass="bg-amber-50 text-amber-600"
          subText="Termasuk BLUD/APBD"
        />
        <SummaryCard 
          title="Rata-rata Umur" 
          value={`${stats.avgAge} thn`} 
          icon={TrendingUp} 
          colorClass="bg-red-50 text-red-600"
          subText="Produktifitas SDM"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Berdasarkan Jenis Kelamin" icon={PieChartIcon}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={showLabels ? ({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Berdasarkan Pendidikan" icon={BarChart2}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={educationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar 
                dataKey="value" 
                fill="#3b82f6" 
                radius={[0, 4, 4, 0]} 
                barSize={20}
                label={showLabels ? { position: 'right', fontSize: 10, fill: '#3b82f6', fontWeight: 'bold' } : false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ChartCard title="Kategori Umur" icon={Calendar} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageCategoryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
              <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar 
                dataKey="value" 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]}
                label={showLabels ? { position: 'top', fontSize: 10, fill: '#8b5cf6', fontWeight: 'bold' } : false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Jenis Jabatan" icon={Briefcase}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={jabatanData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                label={showLabels ? ({ name, value }) => `${name}: ${value}` : false}
              >
                {jabatanData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Berdasarkan Golongan" icon={Award}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={golonganData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} style={{ fontSize: '9px' }} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar 
                dataKey="value" 
                fill="#10b981" 
                radius={[0, 4, 4, 0]} 
                barSize={15}
                label={showLabels ? { position: 'right', fontSize: 9, fill: '#10b981', fontWeight: 'bold' } : false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Berdasarkan Agama" icon={UserPlus}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={religionData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={showLabels ? ({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {religionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-orange-100 overflow-hidden">
        <div className="p-8 border-b border-orange-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Table className="w-5 h-5 text-orange-500" />
                Daftar Detail Pegawai
              </h3>
              <p className="text-sm text-gray-400 mt-1">Data mentah untuk filtering dan export</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Status</label>
              <select 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
                value={filters.status}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              >
                <option value="">Semua Status</option>
                {Constants.STATUS_PEGAWAI_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Jabatan</label>
              <select 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
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
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
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
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
                value={filters.unit}
                onChange={(e) => setFilters(f => ({ ...f, unit: e.target.value }))}
              >
                <option value="">Semua Unit</option>
                {Constants.KELOMPOK_JABATAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Umur</label>
              <select 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
                value={filters.ageCategory}
                onChange={(e) => setFilters(f => ({ ...f, ageCategory: e.target.value }))}
              >
                <option value="">Semua Umur</option>
                {AGE_CATEGORIES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama & NIP</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jenis & Gol</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pendidikan</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jabatan/Unit</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Umur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((p, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm">{p.Nama}</div>
                    <div className="text-xs text-gray-400 font-medium tracking-tight">NIP: {p.NIP || p.id_pegawai}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      p.Status_Pegawai === 'PNS' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                    )}>
                      {p.Status_Pegawai}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-1 font-medium">{p.Gol}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 font-semibold">{p.Jenjang_Pendidikan}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{p.Jurusan}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-700 font-bold">{p.Kelompok_Jabatan}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{p.Jabatan}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-gray-900">{p.age}</span>
                    <span className="text-[10px] text-gray-400 ml-1">thn</span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    Data tidak ditemukan berdasarkan filter
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
