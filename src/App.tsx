/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Users, MapPin, GraduationCap, Briefcase, 
  Award, ShieldCheck, ClipboardList, LogOut, 
  FileText, Phone, Image as ImageIcon, MoreHorizontal,
  ChevronRight, ChevronLeft, Save, AlertCircle, CheckCircle2,
  LayoutDashboard, UserPlus, Search, Filter, Download, Eye, Edit2, Trash2, Camera, Upload, BarChart2,
  ArrowUpDown, Clock, AlertTriangle, Menu
} from 'lucide-react';
import { cn } from './lib/utils';
import { Pegawai, PegawaiFormData } from './types';
import * as Constants from './constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { AnalyticsView } from './components/AnalyticsView';
import { MonitoringASN } from './components/MonitoringASN';

const getDirectImageUrl = (url: string | undefined | null) => {
  if (!url) return '';
  
  // Extract File ID from various Google Drive link formats
  let fileId = '';
  if (url.includes('/file/d/')) {
    fileId = url.split('/file/d/')[1].split('/')[0];
  } else if (url.includes('id=')) {
    fileId = (url.split('id=')[1] || "").split('&')[0];
  } else if (url.includes('drive.google.com') && !url.includes('uc?') && !url.includes('id=')) {
    const parts = url.split('/');
    fileId = parts[parts.length - 1] === 'view' ? parts[parts.length - 2] : parts[parts.length - 1];
  }

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
  
  return url;
};

const ProfileImage = ({ src, alt, className, fallbackIcon: FallbackIcon }: any) => {
  const [error, setError] = useState(false);
  const directUrl = getDirectImageUrl(src);

  if (!src || error) {
    return <FallbackIcon className="w-4 h-4 text-blue-400" />;
  }

  return (
    <img 
      src={directUrl} 
      alt={alt || ""} 
      className={className} 
      referrerPolicy="no-referrer" 
      onError={() => {
        console.warn("Image Load Failed:", directUrl);
        setError(true);
      }}
    />
  );
};

const SECTIONS = [
  { id: 'identitas', title: 'Identitas Utama', icon: User },
  { id: 'keluarga', title: 'Data Keluarga', icon: Users },
  { id: 'alamat', title: 'Alamat', icon: MapPin },
  { id: 'pendidikan', title: 'Pendidikan', icon: GraduationCap },
  { id: 'kepegawaian', title: 'Kepegawaian', icon: Briefcase },
  { id: 'pangkat', title: 'Riwayat Pangkat', icon: Award },
  { id: 'cpnspns', title: 'CPNS / PNS', icon: ShieldCheck },
  { id: 'penugasan', title: 'Penugasan', icon: ClipboardList },
  { id: 'pensiun', title: 'Pensiun', icon: LogOut },
  { id: 'administrasi', title: 'Administrasi', icon: FileText },
  { id: 'kontak', title: 'Kontak', icon: Phone },
  { id: 'dokumen', title: 'Dokumen Pribadi', icon: ImageIcon },
  { id: 'lainnya', title: 'Lainnya', icon: MoreHorizontal },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'dokumen' | 'analytics' | 'monitoring'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [dokumenList, setDokumenList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dokumenSearchTerm, setDokumenSearchTerm] = useState('');
  const [pegawaiDocSearch, setPegawaiDocSearch] = useState('');
  const [showPegawaiDropdown, setShowPegawaiDropdown] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setShowPegawaiDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [gasError, setGasError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDokumen, setIsEditingDokumen] = useState(false);
  const [detailPegawai, setDetailPegawai] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedDokumenFile, setSelectedDokumenFile] = useState<File | null>(null);
  const [dokumenPreviewUrl, setDokumenPreviewUrl] = useState<string | null>(null);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<any | null>(null);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [dokumenPageSize, setDokumenPageSize] = useState<number | 'all'>(25);
  const [currentDokumenPage, setCurrentDokumenPage] = useState(1);
  const [filterStatusPegawai, setFilterStatusPegawai] = useState<string>('');
  const [filterJenisDokumen, setFilterJenisDokumen] = useState<string>('');
  const [filterStatusDokumen, setFilterStatusDokumen] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'pegawai' | 'dokumen', id: string, name?: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Pegawai; direction: 'asc' | 'desc' }>({ 
    key: 'Nama', 
    direction: 'asc' 
  });

  const handleSort = (key: keyof Pegawai) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDokumenFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDokumenFile(file);
      // For PDF/Image preview, we can use a URL
      setDokumenPreviewUrl(URL.createObjectURL(file));
    }
  };

  const fetchPegawai = async () => {
    setIsLoading(true);
    setSubmitStatus('idle');
    setGasError(null);
    try {
      const url = Constants.APPS_SCRIPT_URL 
        ? `/api/gsheet-proxy?url=${encodeURIComponent(Constants.APPS_SCRIPT_URL)}&sheet=MASTER_PEGAWAI`
        : '/api/pegawai';
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (Constants.APPS_SCRIPT_URL) {
        if (result.status === 'success' || result.success) {
          setPegawaiList(result.data || []);
        } else {
          setGasError(result.message);
          setSubmitStatus('error');
        }
      } else {
        if (result.success) {
          setPegawaiList(result.data);
        }
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      setGasError('Gagal menghubungi proxy server.');
      setSubmitStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDokumen = async () => {
    if (!Constants.APPS_SCRIPT_URL) return;
    setIsLoading(true);
    try {
      const url = `/api/gsheet-proxy?url=${encodeURIComponent(Constants.APPS_SCRIPT_URL)}&sheet=DATA_DOKUMEN`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === 'success' || result.success) {
        // Enforce client-side calculation of Status and Sisa Hari for data integrity
        const enrichedData = (result.data || []).map((doc: any) => {
          // Robust check for Lifetime status (Column R or column O)
          const isLifetime = doc.Is_Seumur_Hidup === true || 
                            String(doc.Is_Seumur_Hidup).toUpperCase() === "TRUE" || 
                            doc.Is_Seumur_Hidup === "1" || 
                            doc.Is_Seumur_Hidup === 1 ||
                            String(doc.Status_Dokumen).toUpperCase().includes("SEUMUR HIDUP");

          if (isLifetime) {
            return { 
              ...doc, 
              Status_Dokumen: 'AMAN', 
              Sisa_Hari: '-',
              Is_Seumur_Hidup: true 
            };
          }

          if (!doc.Tanggal_Expired || doc.Tanggal_Expired === "" || doc.Tanggal_Expired === "-") return { ...doc, Status_Dokumen: 'N/A', Sisa_Hari: '-', Is_Seumur_Hidup: false };
          
          const expDate = new Date(doc.Tanggal_Expired);
          const today = new Date();
          const diffTime = expDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let status = 'AMAN';
          if (diffDays <= 0) status = 'EXPIRED';
          else if (diffDays <= 30) status = 'CRITICAL';
          else if (diffDays <= 90) status = 'WARNING';
          
          return {
            ...doc,
            Status_Dokumen: status,
            Sisa_Hari: diffDays.toString(),
            Is_Seumur_Hidup: false
          };
        });
        setDokumenList(enrichedData);
      }
    } catch (error) {
      console.error('Fetch Dokumen Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchPegawai();
      fetchDokumen();
    } else if (activeTab === 'dokumen') {
      fetchDokumen();
      if (pegawaiList.length === 0) fetchPegawai();
    }
  }, [activeTab]);

  const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<PegawaiFormData>({
    defaultValues: {
      Jenis_Kelamin: 'Laki-laki',
      Agama: 'Islam',
      Status: 'Aktif',
      Status_Pegawai: 'PNS',
      Status_Keluarga: 'Belum Menikah',
      Jumlah_Anak: 0,
      Jenjang_Pendidikan: 'S1',
      Kelompok_Jabatan: 'Medis',
      Gol: 'III/a',
      Image: ''
    }
  });

  useEffect(() => {
    register('Image');
  }, [register]);

  const { register: registerDok, handleSubmit: handleSubmitDok, reset: resetDok, setValue: setValueDok, watch: watchDok, formState: { errors: errorsDok } } = useForm<any>();

  const selectedPegawaiId = watchDok('id_pegawai');
  useEffect(() => {
    // Daftarkan field pendukung agar terikut saat submit form
    registerDok('NIK');
    registerDok('Nama');
    registerDok('Jenis_Pegawai');
    registerDok('Jenis');

    if (selectedPegawaiId && !isEditingDokumen) {
      const p = pegawaiList.find(peg => peg.id_pegawai === selectedPegawaiId);
      if (p) {
        setValueDok('NIK', p.NIK);
        setValueDok('Nama', p.Nama);
        setValueDok('Jenis_Pegawai', p.Status_Pegawai);
        setValueDok('Jenis', p.Status_Pegawai);
      }
    }
  }, [selectedPegawaiId, pegawaiList, isEditingDokumen, setValueDok, registerDok]);

  const onSubmit = async (data: PegawaiFormData) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      let fileData: string | null = null;
      let fileName: string | null = null;
      let mimeType: string | null = null;

      // Prepare file data if a new file is selected
      if (selectedFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(selectedFile);
        });
        fileData = await base64Promise;
        fileName = selectedFile.name;
        mimeType = selectedFile.type;
      }

      const url = Constants.APPS_SCRIPT_URL 
        ? `/api/gsheet-proxy?url=${encodeURIComponent(Constants.APPS_SCRIPT_URL)}`
        : '/api/pegawai';
      
      const payload = {
        ...data,
        sheetName: 'MASTER_PEGAWAI',
        action: isEditing ? 'update' : 'create',
        // Inline Upload properties for Code.gs refactor
        fileData: fileData,
        fileName: fileName,
        mimeType: mimeType,
        fileFieldName: 'Image'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (Constants.APPS_SCRIPT_URL) {
        if (result.status === 'success' || result.success) {
          setSubmitStatus('success');
          reset();
          setSelectedFile(null);
          setPreviewUrl(null);
          setIsEditing(false);
          setCurrentStep(0);
          setTimeout(() => setActiveTab('dashboard'), 1500);
        } else {
          setSubmitStatus('error');
        }
      } else {
        if (result.success) {
          setSubmitStatus('success');
          reset();
          setSelectedFile(null);
          setPreviewUrl(null);
          setIsEditing(false);
          setCurrentStep(0);
          setTimeout(() => setActiveTab('dashboard'), 1500);
        } else {
          setSubmitStatus('error');
        }
      }
    } catch (error) {
      console.error('Submit Error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const url = Constants.APPS_SCRIPT_URL 
        ? `/api/gsheet-proxy?url=${encodeURIComponent(Constants.APPS_SCRIPT_URL)}`
        : '/api/pegawai';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pegawai: id, action: 'delete', sheetName: 'MASTER_PEGAWAI' }),
      });
      const result = await response.json();
      
      if (result.status === 'success' || result.success) {
        fetchPegawai();
        setDeleteConfirm(null);
      } else {
        alert('Gagal menghapus: ' + result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (pegawai: Pegawai) => {
    setIsEditing(true);
    Object.keys(pegawai).forEach((key) => {
      setValue(key as keyof PegawaiFormData, (pegawai as any)[key]);
    });
    setPreviewUrl(pegawai.Image || null);
    setSelectedFile(null);
    setActiveTab('form');
    setCurrentStep(0);
  };

  const onSubmitDok = async (data: any) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      let fileData: string | null = null;
      let fileName: string | null = null;
      let mimeType: string | null = null;

      // Prepare file data if a new file is selected
      if (selectedDokumenFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(selectedDokumenFile);
        });
        fileData = await base64Promise;
        fileName = selectedDokumenFile.name;
        mimeType = selectedDokumenFile.type;
      }

      // Calculate Status and Sisa Hari before saving to sheet
      let status = 'AMAN';
      let sisaHari = '-';
      
      if (data.Is_Seumur_Hidup) {
        status = 'AMAN';
        sisaHari = '-';
      } else if (data.Tanggal_Expired) {
        const expDate = new Date(data.Tanggal_Expired);
        const today = new Date();
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        sisaHari = diffDays.toString();
        if (diffDays <= 0) status = 'EXPIRED';
        else if (diffDays <= 30) status = 'CRITICAL';
        else if (diffDays <= 90) status = 'WARNING';
      }

      const url = Constants.APPS_SCRIPT_URL 
        ? `/api/gsheet-proxy?url=${encodeURIComponent(Constants.APPS_SCRIPT_URL)}`
        : '/api/dokumen';
      
      // Clean up id_dokumen if it's the placeholder
      const idDokumen = data.id_dokumen === "(Otomatis)" ? "" : data.id_dokumen;

      const payload = {
        ...data,
        id_dokumen: idDokumen,
        Status_Dokumen: data.Is_Seumur_Hidup ? 'AMAN (SEUMUR HIDUP)' : status,
        Sisa_Hari: sisaHari,
        Is_Seumur_Hidup: data.Is_Seumur_Hidup ? "TRUE" : "FALSE",
        sheetName: 'DATA_DOKUMEN',
        action: isEditingDokumen ? 'update' : 'create',
        // Inline Upload properties for Code.gs refactor
        fileData: fileData,
        fileName: fileName,
        mimeType: mimeType,
        folderId: Constants.DRIVE_FOLDER_ID,
        fileFieldName: 'Upload_Dokumen'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.status === 'success' || result.success) {
        setSubmitStatus('success');
        resetDok();
        setSelectedDokumenFile(null);
        setDokumenPreviewUrl(null);
        setIsEditingDokumen(false);
        fetchDokumen();
        // Clear success message after 3 seconds
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Submit Dokumen Error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDok = async (id: string) => {
    setIsLoading(true);
    try {
      const url = Constants.APPS_SCRIPT_URL 
        ? `/api/gsheet-proxy?url=${encodeURIComponent(Constants.APPS_SCRIPT_URL)}`
        : '/api/dokumen';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_dokumen: id, action: 'delete', sheetName: 'DATA_DOKUMEN' }),
      });
      const result = await response.json();
      if (result.status === 'success' || result.success) {
        fetchDokumen();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDok = (dok: any) => {
    setIsEditingDokumen(true);
    Object.keys(dok).forEach((key) => {
      setValueDok(key, dok[key]);
    });
    // Scroll to form
    const formElement = document.getElementById('dokumen-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, SECTIONS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const filteredList = useMemo(() => {
    const list = pegawaiList.filter(p => {
      const matchSearch = String(p.Nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          String(p.id_pegawai || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(p.NIK || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = !filterStatusPegawai || p.Status_Pegawai === filterStatusPegawai;
      
      return matchSearch && matchStatus;
    });

    return [...list].sort((a, b) => {
      const aVal = String(a[sortConfig.key] || '').toLowerCase();
      const bVal = String(b[sortConfig.key] || '').toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [pegawaiList, searchTerm, sortConfig]);

  const pagedList = useMemo(() => {
    if (pageSize === 'all') return filteredList;
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, pageSize, currentPage]);

  const filteredDokumenList = useMemo(() => {
    return dokumenList.filter(d => {
      const matchSearch = String(d.Nama || '').toLowerCase().includes(dokumenSearchTerm.toLowerCase()) ||
                          String(d.id_pegawai || '').toLowerCase().includes(dokumenSearchTerm.toLowerCase()) ||
                          String(d.Nomor_Dokumen || '').toLowerCase().includes(dokumenSearchTerm.toLowerCase()) ||
                          String(d.Jenis_Dokumen || '').toLowerCase().includes(dokumenSearchTerm.toLowerCase());
      
      const matchJenis = !filterJenisDokumen || d.Jenis_Dokumen === filterJenisDokumen;
      const matchStatus = !filterStatusDokumen || d.Status_Dokumen === filterStatusDokumen;

      return matchSearch && matchJenis && matchStatus;
    });
  }, [dokumenList, dokumenSearchTerm, filterJenisDokumen, filterStatusDokumen]);

  const pagedDokumenList = useMemo(() => {
    if (dokumenPageSize === 'all') return filteredDokumenList;
    const start = (currentDokumenPage - 1) * dokumenPageSize;
    return filteredDokumenList.slice(start, start + dokumenPageSize);
  }, [filteredDokumenList, dokumenPageSize, currentDokumenPage]);

  // Reset pages when search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, filterStatusPegawai]);

  useEffect(() => {
    setCurrentDokumenPage(1);
  }, [dokumenSearchTerm, dokumenPageSize, filterJenisDokumen, filterStatusDokumen]);

  const stats = {
    total: pegawaiList.length,
    pns: pegawaiList.filter(p => p.Status_Pegawai === 'PNS' || p.Status_Pegawai === 'CPNS').length,
    pppk: pegawaiList.filter(p => p.Status_Pegawai === 'PPPK').length,
    jenisLain: pegawaiList.filter(p => !['PNS', 'CPNS', 'PPPK'].includes(p.Status_Pegawai)).length,
    honorApbd: pegawaiList.filter(p => p.Status_Pegawai === 'Honorer APBD').length,
    honorBlud: pegawaiList.filter(p => p.Status_Pegawai === 'Honorer BLUD').length,
  };

  const docStats = useMemo(() => {
    const getRincian = (list: any[]) => [
      { label: 'SIP', value: list.filter(d => d.Jenis_Dokumen === 'SIP').length },
      { label: 'SIK', value: list.filter(d => d.Jenis_Dokumen === 'SIK').length },
      { label: 'STR', value: list.filter(d => d.Jenis_Dokumen === 'STR').length },
    ];

    const amanList = dokumenList.filter(d => d.Status_Dokumen === 'AMAN');
    const warningList = dokumenList.filter(d => d.Status_Dokumen === 'WARNING');
    const criticalList = dokumenList.filter(d => d.Status_Dokumen === 'CRITICAL' || d.Status_Dokumen === 'EXPIRED');

    return {
      total: { value: dokumenList.length, rincian: getRincian(dokumenList) },
      aman: { value: amanList.length, rincian: getRincian(amanList) },
      warning: { value: warningList.length, rincian: getRincian(warningList) },
      critical: { value: criticalList.length, rincian: getRincian(criticalList) },
    };
  }, [dokumenList]);

  const docChartData = useMemo(() => [
    { name: 'Aman', value: docStats.aman.value, color: '#10b981' },
    { name: 'Warning', value: docStats.warning.value, color: '#f59e0b' },
    { name: 'Critical/Expired', value: docStats.critical.value, color: '#ef4444' },
  ], [docStats]);

  const renderDokumen = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Doc Dashboard Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Dokumen</h2>
           <p className="text-sm text-gray-500">Monitoring validitas berkas (STR, SIP, SIK) secara real-time</p>
        </div>
      </div>

      {/* Doc Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Dokumen" value={docStats.total.value} icon={FileText} color="blue" subDetails={docStats.total.rincian} />
        <StatCard title="Status Aman" value={docStats.aman.value} icon={CheckCircle2} color="teal" subDetails={docStats.aman.rincian} />
        <StatCard title="Status Warning" value={docStats.warning.value} icon={Clock} color="orange" subDetails={docStats.warning.rincian} />
        <StatCard title="Critical/Expired" value={docStats.critical.value} icon={AlertTriangle} color="red" subDetails={docStats.critical.rincian} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
           <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">Distribusi Status</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={docChartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {docChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-4 space-y-2">
              {docChartData.map((item, idx) => (
                item.value > 0 && (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-500 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                )
              ))}
           </div>
        </div>

        {/* Form Column */}
        <div id="dokumen-form" className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {isEditingDokumen ? 'Edit Dokumen' : 'Input Dokumen Baru'}
            </h3>
            
            {submitStatus === 'success' && activeTab === 'dokumen' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-600 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-bold">Data dokumen berhasil disimpan!</span>
              </div>
            )}

            {submitStatus === 'error' && activeTab === 'dokumen' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in zoom-in duration-300">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold">Gagal menyimpan data dokumen.</span>
              </div>
            )}
            
            <form onSubmit={handleSubmitDok(onSubmitDok)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormGroup label="Pilih Pegawai" error={errorsDok.id_pegawai?.message as string}>
                <div className="relative" ref={employeeDropdownRef}>
                  <div 
                    className={cn(
                      inputClass, 
                      "flex items-center justify-between cursor-pointer",
                      isEditingDokumen && "bg-gray-50 opacity-70 cursor-not-allowed"
                    )}
                    onClick={() => !isEditingDokumen && setShowPegawaiDropdown(!showPegawaiDropdown)}
                  >
                    <span className={cn(!watchDok('id_pegawai') && "text-gray-400")}>
                      {watchDok('id_pegawai') 
                        ? (pegawaiList.find(p => p.id_pegawai === watchDok('id_pegawai'))?.Nama || watchDok('id_pegawai'))
                        : "-- Pilih Pegawai --"}
                    </span>
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>

                  {showPegawaiDropdown && !isEditingDokumen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                      <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Cari nama atau ID..."
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                            value={pegawaiDocSearch}
                            onChange={(e) => setPegawaiDocSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto pt-1 pb-1">
                        {pegawaiList
                          .filter(p => 
                            String(p.Nama || '').toLowerCase().includes(pegawaiDocSearch.toLowerCase()) || 
                            String(p.id_pegawai || '').toLowerCase().includes(pegawaiDocSearch.toLowerCase())
                          )
                          .length > 0 ? (
                            pegawaiList
                              .filter(p => 
                                String(p.Nama || '').toLowerCase().includes(pegawaiDocSearch.toLowerCase()) || 
                                String(p.id_pegawai || '').toLowerCase().includes(pegawaiDocSearch.toLowerCase())
                              )
                              .map((p, idx) => (
                                <button
                                  key={p.id_pegawai || `p-opt-${idx}`}
                                  type="button"
                                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50 transition-colors flex flex-col gap-0.5 border-b border-gray-50 last:border-0"
                                  onClick={() => {
                                    setValueDok('id_pegawai', p.id_pegawai);
                                    setShowPegawaiDropdown(false);
                                    setPegawaiDocSearch('');
                                  }}
                                >
                                  <span className="font-bold text-gray-900">{p.Nama}</span>
                                  <span className="text-[10px] text-gray-500 font-medium">ID: {p.id_pegawai}</span>
                                </button>
                              ))
                          ) : (
                            <div className="px-4 py-4 text-center text-xs text-gray-400 italic">Pegawai tidak ditemukan</div>
                          )}
                      </div>
                    </div>
                  )}
                  {/* Register for validation in background */}
                  <input type="hidden" {...registerDok('id_pegawai', { required: 'Pilih pegawai' })} />
                </div>
              </FormGroup>
              <FormGroup label="ID Dokumen" error={errorsDok.id_dokumen?.message as string}>
                 <input {...registerDok('id_dokumen')} className={cn(inputClass, isEditingDokumen && "bg-gray-50")} placeholder="(Otomatis)" readOnly={isEditingDokumen} />
              </FormGroup>
              <FormGroup label="Jenis Dokumen">
                <select {...registerDok('Jenis_Dokumen')} className={inputClass} defaultValue="SIP">
                  <option value="SIP">SIP</option>
                  <option value="SIK">SIK</option>
                  <option value="STR">STR</option>
                </select>
              </FormGroup>
              <FormGroup label="No. Dokumen">
                 <input {...registerDok('Nomor_Dokumen')} className={inputClass} placeholder="Nomor resmi dokumen" />
              </FormGroup>
              <FormGroup label="Tanggal Terbit">
                 <input type="date" {...registerDok('Tanggal_Terbit')} className={inputClass} />
              </FormGroup>
              <div className="flex flex-col gap-2">
                <FormGroup label="Tanggal Expired">
                   <input 
                     type="date" 
                     {...registerDok('Tanggal_Expired')} 
                     className={inputClass} 
                     disabled={watchDok('Is_Seumur_Hidup')}
                   />
                </FormGroup>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                   <input 
                     type="checkbox" 
                     {...registerDok('Is_Seumur_Hidup')} 
                     className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                   />
                   <span className="text-xs font-bold text-gray-600">Berlaku Seumur Hidup</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <FormGroup label="Upload Dokumen (PDF/Gambar)" error={errorsDok.Upload_Dokumen?.message as string}>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl group hover:border-blue-300 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 shadow-sm transition-colors overflow-hidden">
                      {dokumenPreviewUrl ? (
                         <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50">
                            <CheckCircle2 className="w-6 h-6 text-blue-500" />
                         </div>
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-700">Pilih Berkas Scan</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Format: PDF, JPG, PNG. Ukuran maks 5MB.</div>
                      <input 
                        type="file" 
                        className="hidden" 
                        id="dokumen-file-upload" 
                        accept=".pdf,image/*" 
                        onChange={handleDokumenFileChange}
                      />
                      <label 
                        htmlFor="dokumen-file-upload"
                        className="inline-block mt-2 px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-all"
                      >
                        {selectedDokumenFile ? 'Ganti Berkas' : 'Cari Berkas...'}
                      </label>
                    </div>
                    {watchDok('Upload_Dokumen') && !selectedDokumenFile && (
                      <div className="text-[10px] items-center flex gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" /> Berkas Tersimpan
                      </div>
                    )}
                  </div>
                </FormGroup>
                <input type="hidden" {...registerDok('Upload_Dokumen')} />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
                {isEditingDokumen && (
                  <button 
                    type="button" 
                    onClick={() => { setIsEditingDokumen(false); resetDok(); setSelectedDokumenFile(null); setDokumenPreviewUrl(null); }}
                    className="px-6 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg"
                  >
                    Batal
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Menyimpan...' : (isEditingDokumen ? 'Perbarui Dokumen' : 'Simpan Dokumen')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div>
              <h3 className="text-lg font-bold text-gray-900">Daftar Dokumen Aktif</h3>
              <p className="text-xs text-gray-500">Pantau masa berlaku SIP, SIK, dan STR</p>
           </div>
           <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-bold text-gray-400">STATUS:</span>
                <select 
                  value={filterStatusDokumen} 
                  onChange={(e) => setFilterStatusDokumen(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer focus:text-blue-600"
                >
                  <option value="">Semua</option>
                  <option value="AMAN">AMAN</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-bold text-gray-400">JENIS:</span>
                <select 
                  value={filterJenisDokumen} 
                  onChange={(e) => setFilterJenisDokumen(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer focus:text-blue-600"
                >
                   <option value="">Semua</option>
                   <option value="SIP">SIP</option>
                   <option value="SIK">SIK</option>
                   <option value="STR">STR</option>
                </select>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Baris:</span>
                <select 
                  value={dokumenPageSize} 
                  onChange={(e) => setDokumenPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-blue-600 outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari berkas..." 
                  className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 w-48"
                  value={dokumenSearchTerm}
                  onChange={(e) => setDokumenSearchTerm(e.target.value)}
                />
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Nama & NIK</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Dokumen</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Masa Aktif</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagedDokumenList.length > 0 ? pagedDokumenList.map((dokSpec, idx) => (
                <tr key={dokSpec.id_dokumen || `dok-${idx}`} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                     <div className="font-bold text-sm text-gray-900">{dokSpec.Nama}</div>
                     <div className="text-[10px] text-gray-400 font-medium">#{dokSpec.id_pegawai}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">{dokSpec.Jenis_Dokumen}</span>
                      <span className="text-xs font-semibold text-gray-700">{dokSpec.Nomor_Dokumen}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="text-xs font-bold text-gray-700">
                       {dokSpec.Is_Seumur_Hidup ? 'SEUMUR HIDUP' : (dokSpec.Tanggal_Expired || '-')}
                     </div>
                     <div className={cn(
                       "text-[10px] font-bold",
                       !dokSpec.Is_Seumur_Hidup && parseInt(String(dokSpec.Sisa_Hari || '0')) <= 30 ? "text-orange-600" : "text-gray-400"
                     )}>
                       {dokSpec.Is_Seumur_Hidup ? '-' : `${dokSpec.Sisa_Hari} Hari Lagi`}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider",
                      dokSpec.Status_Dokumen === 'AMAN' || dokSpec.Is_Seumur_Hidup ? "bg-green-50 text-green-600 border border-green-100" : 
                      dokSpec.Status_Dokumen === 'EXPIRED' || dokSpec.Status_Dokumen === 'CRITICAL' ? "bg-red-50 text-red-600 border border-red-100" :
                      "bg-amber-50 text-amber-600 border border-amber-100"
                    )}>
                      {dokSpec.Is_Seumur_Hidup ? 'AMAN' : dokSpec.Status_Dokumen}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setSelectedPreviewDoc(dokSpec)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEditDok(dokSpec)} className="p-1.5 text-amber-400 hover:bg-amber-50 rounded-lg transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteConfirm({ type: 'dokumen', id: dokSpec.id_dokumen, name: dokSpec.Nomor_Dokumen })} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                       </div>
                    </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <FileText className="w-8 h-8 text-gray-300" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tidak ada data dokumen ditemukan</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {dokumenPageSize === 'all' ? (
              <span>Menampilkan Semua {filteredDokumenList.length} Dokumen</span>
            ) : (
              <span>
                Halaman {currentDokumenPage} dari {Math.ceil(filteredDokumenList.length / (dokumenPageSize as number)) || 1} ({filteredDokumenList.length} total)
              </span>
            )}
          </div>
          {dokumenPageSize !== 'all' && filteredDokumenList.length > (dokumenPageSize as number) && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentDokumenPage(prev => Math.max(1, prev - 1))}
                disabled={currentDokumenPage === 1}
                className="px-2 py-1 border border-gray-200 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <div className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold shadow-sm">
                {currentDokumenPage}
              </div>
              <button 
                onClick={() => setCurrentDokumenPage(prev => Math.min(Math.ceil(filteredDokumenList.length / (dokumenPageSize as number)), prev + 1))}
                disabled={currentDokumenPage >= Math.ceil(filteredDokumenList.length / (dokumenPageSize as number))}
                className="px-2 py-1 border border-gray-200 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Alert Error GAS */}
      {submitStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-red-900">Masalah Koneksi Google Sheets</h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Error: {gasError || 'Data tidak dapat dimuat.'} <br/>
              Pastikan Web App di-Deploy sebagai <strong>"Anyone"</strong>. 
              Gunakan URL Web App dari menu <em>Deploy &gt; New Deployment</em>.
            </p>
            <button 
              onClick={fetchPegawai}
              className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:underline"
            >
              Coba Hubungkan Lagi
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Pegawai" value={stats.total} icon={Users} color="blue" />
        <StatCard title="PNS / CPNS" value={stats.pns} icon={ShieldCheck} color="indigo" />
        <StatCard title="Pegawai PPPK" value={stats.pppk} icon={Award} color="teal" />
        <StatCard 
          title="Pegawai Jenis Lain" 
          value={stats.jenisLain} 
          icon={MoreHorizontal} 
          color="orange"
          subDetails={[
            { label: 'Honorer APBD', value: stats.honorApbd },
            { label: 'Honorer BLUD', value: stats.honorBlud }
          ]}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Daftar Pegawai</h3>
            <p className="text-sm text-gray-500">Kelola dan pantau data seluruh SDM RSUD</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Status:</span>
                <select 
                  value={filterStatusPegawai} 
                  onChange={(e) => setFilterStatusPegawai(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer focus:text-blue-600"
                >
                  <option value="">Semua Status</option>
                  <option value="PNS">PNS</option>
                  <option value="CPNS">CPNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="Honorer APBD">Honorer APBD</option>
                  <option value="Honorer BLUD">Honorer BLUD</option>
                </select>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Baris:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-blue-600 outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">Semua</option>
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama atau ID..." 
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 min-w-[240px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
             <button className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
               <Filter className="w-4 h-4" />
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all active:scale-95">
               <Download className="w-4 h-4" /> Export
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th 
                  onClick={() => handleSort('id_pegawai')}
                  className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer hover:text-blue-600 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    ID & NIK
                    <ArrowUpDown className={cn(
                      "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                      sortConfig.key === 'id_pegawai' && "opacity-100 text-blue-600"
                    )} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Nama')}
                  className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer hover:text-blue-600 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    Nama Lengkap
                    <ArrowUpDown className={cn(
                      "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                      sortConfig.key === 'Nama' && "opacity-100 text-blue-600"
                    )} />
                  </div>
                </th>
                <th 
                   onClick={() => handleSort('Status_Pegawai')}
                   className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer hover:text-blue-600 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className={cn(
                      "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                      sortConfig.key === 'Status_Pegawai' && "opacity-100 text-blue-600"
                    )} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Jabatan')}
                  className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer hover:text-blue-600 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    Jabatan
                    <ArrowUpDown className={cn(
                      "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                      sortConfig.key === 'Jabatan' && "opacity-100 text-blue-600"
                    )} />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : pagedList.length > 0 ? (
                pagedList.map((p, idx) => (
                  <tr key={p.id_pegawai || `peg-${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-semibold text-blue-600">{p.id_pegawai}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{p.NIK}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                          <ProfileImage 
                            src={p.Image} 
                            fallbackIcon={User} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-gray-900 text-sm">{p.Nama}</div>
                            {p.Status && (
                              <span className={cn(
                                "text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                                p.Status === 'Aktif' ? "bg-green-50 text-green-600 border border-green-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                              )}>
                                {p.Status}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400">{p.Email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        p.Status_Pegawai === 'PNS' ? "bg-blue-100 text-blue-700" :
                        p.Status_Pegawai === 'PPPK' ? "bg-teal-100 text-teal-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {p.Status_Pegawai}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 font-medium">{p.Jabatan}</div>
                      <div className="text-[10px] text-gray-400">Golongan: {p.Gol}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setDetailPegawai(p)}
                          className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(p)}
                          className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" 
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ type: 'pegawai', id: p.id_pegawai, name: p.Nama })}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic text-sm">Data tidak ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {pageSize === 'all' ? (
            <span>Menampilkan Semua {filteredList.length} Pegawai</span>
          ) : (
            <span>
              Halaman {currentPage} dari {Math.ceil(filteredList.length / (pageSize as number)) || 1} ({filteredList.length} total)
            </span>
          )}
          {pageSize !== 'all' && filteredList.length > (pageSize as number) && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 border border-gray-200 rounded hover:bg-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <div className="px-3 py-1 bg-blue-600 text-white rounded shadow-sm">
                {currentPage}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredList.length / (pageSize as number)), prev + 1))}
                disabled={currentPage >= Math.ceil(filteredList.length / (pageSize as number))}
                className="px-2 py-1 border border-gray-200 rounded hover:bg-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDetailModal = () => {
    if (!detailPegawai) return null;

    const data = detailPegawai;
    const infoSections = [
      {
        title: 'Identitas & Kontak',
        fields: [
          { label: 'ID Pegawai', value: data.id_pegawai },
          { label: 'NIK', value: data.NIK },
          { label: 'NIP', value: data.NIP },
          { label: 'Nama', value: data.Nama },
          { label: 'Status Pegawai', value: data.Status_Pegawai },
          { label: 'Status Aktif', value: data.Status },
          { label: 'Tempat, Tgl Lahir', value: `${data.Tempat_Lahir || '-'}, ${data.Tanggal_Lahir || '-'}` },
          { label: 'Jenis Kelamin', value: data.Jenis_Kelamin },
          { label: 'Agama', value: data.Agama },
          { label: 'Email', value: data.Email },
          { label: 'No. Telp', value: data.No_Telp },
        ]
      },
      {
        title: 'Kepegawaian & Jabatan',
        fields: [
          { label: 'Kelompok Jabatan', value: data.Kelompok_Jabatan },
          { label: 'Jabatan', value: data.Jabatan },
          { label: 'Golongan', value: data.Gol },
          { label: 'TMT Pangkat', value: data.TMT_Pangkat },
          { label: 'No SK Pangkat', value: data.No_SK_Pangkat },
          { label: 'TMT CPNS', value: data.TMT_CPNS },
          { label: 'No SK CPNS', value: data.No_SK_CPNS },
          { label: 'TMT PNS', value: data.TMT_PNS },
          { label: 'No SK PNS', value: data.No_SK_PNS },
          { label: 'TMT Nota Tugas', value: data.TMT_Nota_Tugas },
          { label: 'Masuk RS', value: data.Masuk_RS },
          { label: 'Masa Kerja RS', value: data.Masa_Kerja_RS },
          { label: 'TMT Pensiun', value: data.TMT_Pensiun },
        ]
      },
      {
        title: 'Data Keluarga & Alamat',
        fields: [
          { label: 'Status Keluarga', value: data.Status_Keluarga },
          { label: 'No. KK', value: data.No_KK },
          { label: 'Suami/Istri', value: data.Nama_Suami_Istri },
          { label: 'Jumlah Anak', value: data.Jumlah_Anak },
          { label: 'Alamat', value: data.Alamat },
          { label: 'Kota/Provinsi', value: `${data.Kabupaten_Kota || '-'}, ${data.Provinsi || '-'}` },
        ]
      },
      {
        title: 'Pendidikan & Administrasi',
        fields: [
          { label: 'Pendidikan', value: `${data.Jenjang_Pendidikan} ${data.Jurusan || ''}` },
          { label: 'Asal Sekolah', value: data.Asal_Pendidikan },
          { label: 'BPJS Kes', value: data.No_BPJS },
          { label: 'BPJS Ket/Taspen', value: data.No_BPJSKET_TASPEN },
          { label: 'NPWP', value: data.NPWP },
        ]
      }
    ];

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDetailPegawai(null)}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200 overflow-hidden">
                <ProfileImage 
                  src={data.Image} 
                  alt={data.Nama}
                  fallbackIcon={() => <div className="text-white text-2xl">{data.Nama?.[0] || 'P'}</div>}
                  className="w-full h-full object-cover" 
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{data.Nama}</h2>
                <p className="text-xs text-gray-400 font-mono">{data.id_pegawai}</p>
              </div>
            </div>
            <button 
              onClick={() => setDetailPegawai(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-5 h-5 rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {infoSections.map((section, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-6 border-b border-blue-50 pb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-4">
                    {section.fields.map((field, fIdx) => (
                      <div key={fIdx} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{field.label}</span>
                        <span className="text-sm font-semibold text-gray-700">{field.value || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {data.Keterangan && (
                <div className="md:col-span-2 bg-amber-50 p-6 rounded-2xl border border-amber-100 italic text-sm text-amber-800">
                  <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 not-italic">Keterangan Tambahan:</h3>
                  {data.Keterangan}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3">
             <button 
                onClick={() => { setDetailPegawai(null); handleEdit(data); }}
                className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center gap-2"
             >
                <Edit2 className="w-4 h-4" /> Edit Data
             </button>
             <button 
                onClick={() => setDetailPegawai(null)}
                className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
             >
                Tutup
             </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderPreviewModal = () => {
    if (!selectedPreviewDoc) return null;

    const fileUrl = selectedPreviewDoc.Upload_Dokumen;
    const isImage = fileUrl && (fileUrl.toLowerCase().endsWith('.jpg') || 
                                fileUrl.toLowerCase().endsWith('.jpeg') || 
                                fileUrl.toLowerCase().endsWith('.png') || 
                                fileUrl.toLowerCase().endsWith('.gif') ||
                                fileUrl.includes('export=view')); // Google Drive direct links often act like images for display purposes if forced

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedPreviewDoc(null)}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{selectedPreviewDoc.Jenis_Dokumen} - {selectedPreviewDoc.Nama}</h3>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{selectedPreviewDoc.Nomor_Dokumen}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedPreviewDoc(null)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-5 h-5 rotate-180" />
            </button>
          </div>
          
          <div className="flex-1 bg-slate-100 overflow-hidden relative">
            {fileUrl ? (
              // If it's a typical Drive view URL, we might need an iframe or a direct image display
              fileUrl.includes('drive.google.com') ? (
                <iframe 
                  src={
                    fileUrl.includes('uc?') 
                      ? "https://drive.google.com/file/d/" + (fileUrl.split('id=')[1] || "").split('&')[0] + "/preview"
                      : fileUrl.replace('/view', '/preview')
                  } 
                  className="w-full h-full border-0"
                  title="Document Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8">
                  {isImage ? (
                    <img src={getDirectImageUrl(fileUrl)} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg rounded-lg" referrerPolicy="no-referrer" />
                  ) : (
                    <iframe src={fileUrl} className="w-full h-full border-0" title="Document Preview" />
                  )}
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <AlertCircle className="w-16 h-16 opacity-20" />
                <p className="font-bold text-sm uppercase tracking-widest">Tidak ada file lampiran ditemukan</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
            <div className="text-xs text-gray-400">
               Jenis: <span className="font-bold text-gray-700">{selectedPreviewDoc.Jenis_Dokumen}</span> | 
               Berlaku Sampai: <span className="font-bold text-gray-700">{selectedPreviewDoc.Tanggal_Expired || 'Seumur Hidup'}</span>
            </div>
            <div className="flex gap-2">
              {fileUrl && (
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Buka Tab Baru
                </a>
              )}
              <button 
                onClick={() => setSelectedPreviewDoc(null)}
                className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              IDENTITAS UTAMA
            </h2>

            <div className="flex items-center gap-4 mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
               <div className="relative group">
                 <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-blue-200 flex items-center justify-center overflow-hidden shadow-inner">
                    <ProfileImage 
                      src={previewUrl || watch('Image')} 
                      alt="Preview"
                      fallbackIcon={() => <Camera className="w-8 h-8 text-blue-200" />}
                      className="w-full h-full object-cover" 
                    />
                 </div>
                 <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg cursor-pointer hover:bg-blue-700 transition-all scale-90">
                   <Upload className="w-4 h-4" />
                   <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                 </label>
               </div>
               <div className="flex-1">
                 <h4 className="text-sm font-bold text-slate-700 mb-1">Foto Pegawai</h4>
                 <p className="text-[10px] text-slate-400">Gunakan foto formal. Max 2MB. Otomatis tersimpan di Google Drive.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="ID Pegawai" error={errors.id_pegawai?.message}>
                <input 
                  {...register('id_pegawai')} 
                  className={cn(inputClass, isEditing && "bg-gray-100 cursor-not-allowed text-gray-500")} 
                  placeholder="(Otomatis)" 
                  readOnly={isEditing}
                />
              </FormGroup>
              <FormGroup label="NIK" error={errors.NIK?.message}>
                <input {...register('NIK', { 
                  required: 'NIK wajib diisi', 
                  minLength: { value: 16, message: 'NIK harus 16 digit' },
                  maxLength: { value: 16, message: 'NIK harus 16 digit' }
                })} className={inputClass} placeholder="16 digit NIK" />
              </FormGroup>
              <FormGroup label="NIP" error={errors.NIP?.message}>
                <input {...register('NIP')} className={inputClass} placeholder="Masukan NIP" />
              </FormGroup>
              <FormGroup label="Nama Lengkap" error={errors.Nama?.message}>
                <input {...register('Nama', { required: 'Nama wajib diisi' })} className={inputClass} placeholder="Nama Lengkap Sertakan Gelar" />
              </FormGroup>
              <FormGroup label="Status Pegawai">
                <select {...register('Status_Pegawai')} className={inputClass}>
                  {Constants.STATUS_PEGAWAI_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Tempat Lahir">
                <input {...register('Tempat_Lahir')} className={inputClass} placeholder="Kota Kelahiran" />
              </FormGroup>
              <FormGroup label="Tanggal Lahir">
                <input type="date" {...register('Tanggal_Lahir')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Jenis Kelamin">
                <select {...register('Jenis_Kelamin')} className={inputClass}>
                  {Constants.JENIS_KELAMIN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Agama">
                <select {...register('Agama')} className={inputClass}>
                  {Constants.AGAMA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Status">
                <select {...register('Status')} className={inputClass}>
                  {Constants.STATUS_AKTIF_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </FormGroup>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              DATA KELUARGA
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Status Keluarga">
                <select {...register('Status_Keluarga')} className={inputClass}>
                  {Constants.STATUS_KELUARGA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="No. KK">
                <input {...register('No_KK')} className={inputClass} placeholder="16 digit No. KK" />
              </FormGroup>
              <FormGroup label="Nama Suami/Istri">
                <input {...register('Nama_Suami_Istri')} className={inputClass} placeholder="Nama Pasangan" />
              </FormGroup>
              <FormGroup label="Jumlah Anak">
                <input type="number" {...register('Jumlah_Anak')} className={inputClass} min="0" />
              </FormGroup>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              ALAMAT
            </h2>
            <div className="space-y-4">
              <FormGroup label="Alamat Lengkap">
                <textarea {...register('Alamat')} className={inputClass} rows={3} placeholder="Jalan, No. Rumah, RT/RW, Desa/Kelurahan, Kecamatan" />
              </FormGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormGroup label="Kabupaten / Kota">
                  <input {...register('Kabupaten_Kota')} className={inputClass} placeholder="Contoh: Deli Serdang" />
                </FormGroup>
                <FormGroup label="Provinsi">
                  <input {...register('Provinsi')} className={inputClass} placeholder="Contoh: Sumatera Utara" />
                </FormGroup>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              PENDIDIKAN
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Jenjang Pendidikan">
                <select {...register('Jenjang_Pendidikan')} className={inputClass}>
                  {Constants.JENJANG_PENDIDIKAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Fakultas">
                <input {...register('Fakultas')} className={inputClass} placeholder="Nama Fakultas" />
              </FormGroup>
              <FormGroup label="Jurusan">
                <input {...register('Jurusan')} className={inputClass} placeholder="Nama Jurusan / Prodi" />
              </FormGroup>
              <FormGroup label="Asal Pendidikan">
                <input {...register('Asal_Pendidikan')} className={inputClass} placeholder="Nama Universitas / Sekolah" />
              </FormGroup>
              <FormGroup label="Tanggal Lulus">
                <input type="date" {...register('Tanggal_Lulus')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Link/Lampiran Ijazah">
                <input {...register('Lampiran_Ijazah')} className={inputClass} placeholder="URL Drive Ijazah" />
              </FormGroup>
              <FormGroup label="Link/Lampiran Transkrip">
                <input {...register('Lampiran_Transkrip')} className={inputClass} placeholder="URL Drive Transkrip" />
              </FormGroup>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              KEPEGAWAIAN
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormGroup label="Kelompok Jabatan">
                <select {...register('Kelompok_Jabatan')} className={inputClass}>
                  {Constants.KELOMPOK_JABATAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Jabatan">
                <input {...register('Jabatan')} className={inputClass} placeholder="Nama Jabatan Saat Ini" />
              </FormGroup>
              <FormGroup label="Golongan">
                <select {...register('Gol')} className={inputClass}>
                  <option value="">-- Pilih Golongan --</option>
                  {Constants.GOLONGAN_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </FormGroup>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              RIWAYAT PANGKAT
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="No. SK Pangkat Terakhir">
                <input {...register('No_SK_Pangkat')} className={inputClass} placeholder="SK-XXX/YYYY" />
              </FormGroup>
              <FormGroup label="TMT Pangkat">
                <input type="date" {...register('TMT_Pangkat')} className={inputClass} />
              </FormGroup>
              <FormGroup label="TMT Pangkat Berikutnya">
                <input type="date" {...register('TMT_Berikutnya')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Lampiran SK Pangkat">
                <input {...register('Lampiran_SK_Kenaikan_Pangkat')} className={inputClass} placeholder="URL SK" />
              </FormGroup>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              CPNS / PNS
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <FormGroup label="TMT CPNS">
                  <input type="date" {...register('TMT_CPNS')} className={inputClass} />
                </FormGroup>
                <FormGroup label="No. SK CPNS">
                  <input {...register('No_SK_CPNS')} className={inputClass} />
                </FormGroup>
                <FormGroup label="Lampiran SK CPNS">
                  <input {...register('Lampiran_SK_CPNS')} className={inputClass} />
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <FormGroup label="No. SK PNS">
                  <input {...register('No_SK_PNS')} className={inputClass} />
                </FormGroup>
                <FormGroup label="Lampiran SK PNS">
                  <input {...register('Lampiran_SK_PNS')} className={inputClass} />
                </FormGroup>
              </div>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              PENUGASAN
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="TMT Nota Tugas">
                <input type="date" {...register('TMT_Nota_Tugas')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Lampiran Nota Tugas">
                <input {...register('Lampiran_Nota_Tugas')} className={inputClass} />
              </FormGroup>
              <FormGroup label="No. SK Aktif Tugas">
                <input {...register('No_SK_Aktif_Tugas')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Lampiran Aktif Tugas">
                <input {...register('Lampiran_Aktif_Tugas')} className={inputClass} />
              </FormGroup>
              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                 <FormGroup label="Masuk RS">
                  <input type="date" {...register('Masuk_RS')} className={inputClass} />
                </FormGroup>
                <FormGroup label="Masa Kerja RS">
                  <input {...register('Masa_Kerja_RS')} className={inputClass} placeholder="Contoh: 5 Tahun 2 Bulan" />
                </FormGroup>
              </div>
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-blue-600" />
              PENSIUN
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Rentang BUP (Batas Usia Pensiun)">
                <input {...register('Rentang_BUP')} className={inputClass} placeholder="Contoh: 58 Tahun" />
              </FormGroup>
              <FormGroup label="TMT Pensiun">
                <input type="date" {...register('TMT_Pensiun')} className={inputClass} />
              </FormGroup>
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              ADMINISTRASI
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="No. BPJS Kesehatan">
                <input {...register('No_BPJS')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Lampiran BPJS Kesehatan">
                <input {...register('Lampiran_BPJS')} className={inputClass} />
              </FormGroup>
              <FormGroup label="No. BPJS Ketenagakerjaan / TASPEN">
                <input {...register('No_BPJSKET_TASPEN')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Lampiran Ketenagakerjaan">
                <input {...register('Lampiran_Ketenagakerjaan')} className={inputClass} />
              </FormGroup>
              <FormGroup label="NPWP">
                <input {...register('NPWP')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Lampiran NPWP">
                <input {...register('Lampiran_NPWP')} className={inputClass} />
              </FormGroup>
            </div>
          </div>
        );
      case 10:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              KONTAK
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Email" error={errors.Email?.message}>
                <input 
                  type="email" 
                  {...register('Email', { 
                    pattern: { value: /^\S+@\S+$/i, message: 'Format email tidak valid' } 
                  })} 
                  className={inputClass} 
                  placeholder="pegawai@rsud.go.id"
                />
              </FormGroup>
              <FormGroup label="No. Telp / WhatsApp">
                <input {...register('No_Telp')} className={inputClass} placeholder="0812XXXXXXXX" />
              </FormGroup>
            </div>
          </div>
        );
      case 11:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              DOKUMEN PRIBADI
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Lampiran KTP (URL Drive)">
                <input {...register('Lampiran_KTP')} className={inputClass} />
              </FormGroup>
              <FormGroup label="Foto Pegawai (Link Image)">
                <input {...register('Image')} className={inputClass} />
              </FormGroup>
            </div>
          </div>
        );
      case 12:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <MoreHorizontal className="w-5 h-5 text-blue-600" />
              LAINNYA
            </h2>
            <FormGroup label="Keterangan Tambahan">
              <textarea {...register('Keterangan')} className={inputClass} rows={6} placeholder="Catatan lainnya jika ada..." />
            </FormGroup>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <AnimatePresence>
        {renderDetailModal()}
        {renderPreviewModal()}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                  Apakah Anda yakin ingin menghapus {deleteConfirm.type === 'pegawai' ? 'data pegawai' : 'dokumen'} 
                  <strong className="text-gray-900 block mt-1">"{deleteConfirm.name || deleteConfirm.id}"</strong>?
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => {
                      if (deleteConfirm.type === 'pegawai') handleDelete(deleteConfirm.id);
                      else handleDeleteDok(deleteConfirm.id);
                    }}
                    disabled={isLoading}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Ya, Hapus'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#1e293b] z-[70] shadow-2xl lg:hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs">SDM</span>
                  <span className="text-white font-bold text-lg">Monitoring SDM</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                <button
                  onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl",
                    activeTab === 'dashboard' ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => { setActiveTab('form'); setMobileMenuOpen(false); reset(); setIsEditing(false); setCurrentStep(0); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl",
                    activeTab === 'form' ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Pegawai</span>
                </button>
                <button
                  onClick={() => { setActiveTab('dokumen'); setMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl",
                    activeTab === 'dokumen' ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span>Manajemen Dokumen</span>
                </button>
                <button
                  onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl",
                    activeTab === 'analytics' ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Laporan / Analitik</span>
                </button>
                <button
                  onClick={() => { setActiveTab('monitoring'); setMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl",
                    activeTab === 'monitoring' ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <Clock className="w-4 h-4" />
                  <span>Monitoring ASN</span>
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar - Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="bg-[#1e293b] text-slate-300 hidden lg:flex flex-col sticky top-0 h-screen overflow-hidden z-30 shadow-xl"
      >
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          {!sidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1"
            >
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs">SDM</span>
                Monitoring SDM
              </h1>
              <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-wider font-semibold">RSUD System</p>
            </motion.div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs mx-auto">SDM</div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto pt-6 space-y-1 px-4 scrollbar-hide">
          {!sidebarCollapsed && (
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-4 ml-4">Menu Utama</p>
          )}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center transition-all rounded-xl",
              sidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3 text-sm",
              activeTab === 'dashboard' 
                ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
            title={sidebarCollapsed ? "Dashboard" : ""}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button
            onClick={() => {
              setActiveTab('form');
              setIsEditing(false);
              reset();
              setCurrentStep(0);
            }}
            className={cn(
              "w-full flex items-center transition-all rounded-xl",
              sidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3 text-sm",
              activeTab === 'form' 
                ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
            title={sidebarCollapsed ? "Tambah Pegawai" : ""}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Tambah Pegawai</span>}
          </button>
          <button
            onClick={() => setActiveTab('dokumen')}
            className={cn(
              "w-full flex items-center transition-all rounded-xl",
              sidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3 text-sm",
              activeTab === 'dokumen' 
                ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
            title={sidebarCollapsed ? "Manajemen Dokumen" : ""}
          >
            <FileText className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Manajemen Dokumen</span>}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "w-full flex items-center transition-all rounded-xl",
              sidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3 text-sm",
              activeTab === 'analytics' 
                ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
            title={sidebarCollapsed ? "Laporan / Analitik" : ""}
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Laporan / Analitik</span>}
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={cn(
              "w-full flex items-center transition-all rounded-xl",
              sidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3 text-sm",
              activeTab === 'monitoring' 
                ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
            title={sidebarCollapsed ? "Monitoring ASN" : ""}
          >
            <Clock className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Monitoring ASN</span>}
          </button>

          {activeTab === 'form' && !sidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 space-y-1"
            >
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-4 ml-4">Langkah Form</p>
              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {SECTIONS.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-[0.75rem] transition-all rounded-lg group",
                      currentStep === index 
                        ? "text-blue-400 font-bold bg-blue-500/10" 
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <span className="opacity-50 font-mono text-[9px] w-4">{String(index + 1).padStart(2, '0')}</span>
                    <span className="truncate">{section.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </nav>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">AD</div>
          {!sidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-[10px] font-bold text-white leading-none">Administrator</span>
              <span className="text-[9px] text-slate-500 font-medium">RSUD Deli Serdang</span>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
             <button 
               onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
               className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
             >
               <Menu className="w-4 h-4" />
             </button>
             <button 
               onClick={() => setMobileMenuOpen(true)}
               className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
             >
               <Menu className="w-4 h-4" />
             </button>
             <div className="flex items-center gap-2">
               <span className="lg:hidden w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs" onClick={() => setMobileMenuOpen(true)}>SDM</span>
               <span className="hidden sm:inline">RSUD SDM Monitor</span>
               <ChevronRight className="w-3 h-3" />
               <span className="text-blue-600 font-semibold capitalize">
                 {activeTab === 'dashboard' ? 'Dashboard Overview' : 
                  activeTab === 'form' ? 'Form Input Data' : 
                  activeTab === 'dokumen' ? 'Manajemen Dokumen' : 
                   activeTab === 'analytics' ? 'Laporan / Analitik' : 'Monitoring ASN'}
               </span>
             </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
             {!Constants.APPS_SCRIPT_URL && (
               <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-md text-[10px] font-bold border border-amber-100">
                 <AlertCircle className="w-3 h-3" /> Mode Mock: Hubungkan URL Web App di constants.ts
               </div>
             )}
             {activeTab === 'dashboard' && (
               <button onClick={() => setActiveTab('form')} className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm">
                 <UserPlus className="w-3.5 h-3.5" /> Tambah Baru
               </button>
             )}
            <div className="w-px h-6 bg-gray-200 hidden sm:block mx-2"></div>
            <div className="w-9 h-9 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-400 text-xs">
              AD
            </div>
          </div>
        </header>

        <section className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'dashboard' ? renderDashboard() : 
           activeTab === 'dokumen' ? renderDokumen() : 
           activeTab === 'analytics' ? <AnalyticsView data={pegawaiList} /> : 
           activeTab === 'monitoring' ? <MonitoringASN data={pegawaiList} /> : (
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Step Navigation Sidebar (Internal) */}
              <div className="hidden lg:block w-72 shrink-0 sticky top-24">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Progres Data</h3>
                  <div className="space-y-1">
                    {SECTIONS.map((section, index) => {
                      const isActive = index === currentStep;
                      const isCompleted = index < currentStep;
                      const Icon = section.icon;

                      return (
                        <button
                          key={section.id}
                          onClick={() => setCurrentStep(index)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                            isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "hover:bg-gray-50 text-gray-500"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            isActive ? "bg-blue-600 text-white shadow-md shadow-blue-200" : 
                            isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                          )}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col items-start truncate overflow-hidden">
                            <span className={cn(
                              "text-xs font-bold truncate w-full",
                              isActive ? "text-blue-700" : "text-gray-500"
                            )}>
                              {section.title}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">Langkah {index + 1}</span>
                          </div>
                          {isActive && (
                            <motion.div 
                              layoutId="step-indicator"
                              className="ml-auto w-1 h-4 bg-blue-600 rounded-full" 
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                   <div className="flex gap-2 text-amber-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p className="text-[10px] font-medium leading-relaxed">Pastikan data diisi sesuai dengan dokumen asli (Ijazah, KTP, SK, dll) untuk keperluan verifikasi.</p>
                   </div>
                </div>
              </div>

              {/* Main Form Content */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="p-8 md:p-12">
                    <div className="flex justify-between items-start mb-10 pb-6 border-b border-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">Step {currentStep + 1} of {SECTIONS.length}</span>
                           {isEditing && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wider">Mode Edit</span>}
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-3">
                          {SECTIONS[currentStep].title}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">Lengkapi rincian {SECTIONS[currentStep].title.toLowerCase()} untuk kepegawaian RSUD.</p>
                      </div>
                      
                      <div className="hidden sm:flex flex-col items-end gap-2">
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</div>
                         <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${((currentStep + 1) / SECTIONS.length) * 100}%` }}
                               className="h-full bg-blue-600" 
                            />
                         </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                      <div className="min-h-[400px]">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={currentStep}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                            >
                              {renderStep()}
                            </motion.div>
                          </AnimatePresence>
                      </div>
                      
                      {/* Form Navigation Footer */}
                      <div className="flex items-center justify-between pt-10 border-t border-gray-50">
                        <button
                          type="button"
                          onClick={prevStep}
                          disabled={currentStep === 0}
                          className={cn(
                            "group flex items-center gap-2 px-6 py-2.5 text-sm font-bold transition-all text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50",
                            currentStep === 0 ? "opacity-0 pointer-events-none" : ""
                          )}
                        >
                          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                          Sebelumnya
                        </button>

                        <div className="flex items-center gap-4">
                          {submitStatus === 'success' && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="hidden md:flex items-center gap-1.5 text-green-600 px-3 py-2 text-xs font-bold bg-green-50 rounded-lg border border-green-100"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Data Tersimpan
                            </motion.div>
                          )}
                          
                          {currentStep < SECTIONS.length - 1 ? (
                            <button
                              type="button"
                              onClick={nextStep}
                              className="px-10 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 hover:translate-y-[-2px] active:translate-y-0"
                            >
                              Lanjut <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSubmit(onSubmit)}
                              disabled={isSubmitting}
                              className={cn(
                                "px-12 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 hover:translate-y-[-2px] active:translate-y-0",
                                isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                              )}
                            >
                              {isSubmitting ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Memproses...
                                </>
                              ) : (
                                <>{isEditing ? 'Perbarui Data' : 'Simpan Data Pegawai'} <Save className="w-4 h-4 ml-1" /></>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
                
                {/* Visual Step Counter for Mobile */}
                <div className="lg:hidden mt-8 flex justify-center gap-2">
                   {SECTIONS.map((_, i) => (
                     <div 
                       key={i} 
                       className={cn(
                         "h-1.5 rounded-full transition-all duration-300",
                         i === currentStep ? "w-8 bg-blue-600" : "w-2 bg-gray-200"
                       )}
                     />
                   ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, subDetails }: { title: string; value: number; icon: any; color: string; subDetails?: { label: string; value: number }[] }) {
  const colors: Record<string, string> = {
  red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md hover:border-blue-200 group flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", colors[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-right">
             <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Orang</span>
          </div>
        </div>
        <h4 className="text-sm font-semibold text-gray-500 mb-3">{title}</h4>
      </div>

      {subDetails && subDetails.length > 0 ? (
        <div className="space-y-2 pt-3 border-t border-gray-50">
          {subDetails.map((detail, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">{detail.label}</span>
              <span className="text-xs font-bold text-gray-700">{detail.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-auto">
          <div className={cn("h-full rounded-full", 
            color === 'blue' ? 'bg-blue-500' : 
            color === 'indigo' ? 'bg-indigo-500' : 
            color === 'teal' ? 'bg-teal-500' : 
            color === 'red' ? 'bg-red-500' : 'bg-orange-500'
          )} style={{ width: '65%' }} />
        </div>
      )}
    </div>
  );
}

function FormGroup({ label, children, error, helpText }: { label: string; children: ReactNode; error?: string; helpText?: string }) {
  return (
    <div className="space-y-2 group">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] group-focus-within:text-blue-600 transition-colors uppercase">{label}</label>
        {error && (
          <motion.span 
             initial={{ opacity: 0, x: 5 }}
             animate={{ opacity: 1, x: 0 }}
             className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md flex items-center gap-1"
          >
             <AlertCircle className="w-3 h-3" /> {error}
          </motion.span>
        )}
      </div>
      {children}
      {helpText && !error && <p className="text-[10px] text-gray-400 mt-1 font-medium px-1 italic">*{helpText}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm transition-all outline-none",
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-sm font-medium",
  "placeholder:text-gray-300 text-gray-900",
  "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
);
