/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Utensils,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Sparkles,
  UserPlus,
  Upload,
  HeartPulse,
  Moon,
  Trash2,
  Search,
  Award,
  ClipboardCheck,
  Building,
  Users,
  FileText,
  Clock,
  Printer,
  Eye,
  BookOpen,
  MapPin,
  CheckSquare,
  AlertTriangle,
  BadgeCheck,
  Check,
  Calendar,
  X,
  Pencil,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { exportBanTruToExcel } from '../utils/excel_exporter';
import {
  UserProfile,
  BoardingStudentRecord,
  BoardingMenuRecord,
  BoardingInspectionAuditRecord,
  BoardingDutyScheduleSlot,
  StudentProfile,
  StudentTT27Record
} from '../types/edtech';
import {
  calculateBoardingDailyStats,
  synthesizeBoardingCareComment,
  generateDigitalSignature,
  PHU_BAI_4_1_REAL_STUDENTS,
  getPhuBaiRealBoardingStudents,
  getOfficialBoardingInspectionAudits,
  getOfficialBoardingDutySchedule
} from '../utils/edtech_logic';

interface QuanLyBanTruModuleProps {
  currentUser: UserProfile;
  boardingRecords: BoardingStudentRecord[];
  boardingMenus: BoardingMenuRecord[];
  students: StudentProfile[];
  tt27Records: StudentTT27Record[];
  onAddBoardingRecord: (rec: BoardingStudentRecord) => void;
  onUpdateBoardingRecord: (rec: BoardingStudentRecord) => void;
  onDeleteBoardingRecord: (id: string) => void;
  onAddBoardingMenu: (menu: BoardingMenuRecord) => void;
  onUpdateBoardingMenu: (menu: BoardingMenuRecord) => void;
  onDeleteBoardingMenu: (id: string) => void;
  onOpenAiTemplateImport: () => void;
}

export const QuanLyBanTruModule: React.FC<QuanLyBanTruModuleProps> = ({
  currentUser,
  boardingRecords,
  boardingMenus,
  students,
  tt27Records,
  onAddBoardingRecord,
  onUpdateBoardingRecord,
  onDeleteBoardingRecord,
  onAddBoardingMenu,
  onUpdateBoardingMenu,
  onDeleteBoardingMenu,
  onOpenAiTemplateImport
}) => {
  const [subTab, setSubTab] = useState<'STUDENTS' | 'MENUS' | 'INSPECTION' | 'ORGANIZATION'>(
    'STUDENTS'
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAttendance, setFilterAttendance] = useState<string>('ALL');
  const [filterCampus, setFilterCampus] = useState<'ALL' | 'Trường chính' | 'Phân hiệu'>('ALL');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  // Inspection Audits and Duty Schedule
  const [audits] = useState<BoardingInspectionAuditRecord[]>(getOfficialBoardingInspectionAudits());
  const [dutySchedule] = useState<BoardingDutyScheduleSlot[]>(getOfficialBoardingDutySchedule());

  // Viewing Modals
  const [viewingAudit, setViewingAudit] = useState<BoardingInspectionAuditRecord | null>(null);
  const [showQuyCheModal, setShowQuyCheModal] = useState<boolean>(false);

  // Add Student Modal
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentForm, setNewStudentForm] = useState({
    studentName: '',
    className: currentUser.className || '4/1',
    campus: 'Trường chính' as 'Trường chính' | 'Phân hiệu',
    allergyOrDietNote: 'Không dị ứng thực phẩm',
    healthTemperature: '36.6°C - Bình thường',
    boardingFeeStatus: 'DA_DONG' as BoardingStudentRecord['boardingFeeStatus']
  });

  // Add Menu Modal
  const [showAddMenuModal, setShowAddMenuModal] = useState<boolean>(false);
  const [newMenuForm, setNewMenuForm] = useState({
    dayOfWeek: 'Thứ Hai',
    lunchMainDish: 'Thịt heo rim tôm tươi',
    lunchSideDish: 'Bắp cải xào cà rốt',
    lunchSoup: 'Canh bí đỏ nấu tôm thịt',
    afternoonSnack: 'Sữa học đường Vinamilk 180ml',
    caloriesKcal: 690
  });

  // Edit Modals State
  const [editingStudentRecord, setEditingStudentRecord] = useState<BoardingStudentRecord | null>(null);
  const [editingMenuRecord, setEditingMenuRecord] = useState<BoardingMenuRecord | null>(null);

  const stats = calculateBoardingDailyStats(boardingRecords, boardingMenus);
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredRecords = boardingRecords.filter((r) => {
    if (filterAttendance !== 'ALL' && r.mealAttendance !== filterAttendance) return false;
    if (filterCampus !== 'ALL' && r.campus && r.campus !== filterCampus) return false;
    if (
      searchTerm &&
      !r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !r.className.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !r.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Load all 39 real students of Class 4/1 from DSHS TOAN TRUONG 26_27.xls
  const handleLoadPhuBai39Students = () => {
    const list = getPhuBaiRealBoardingStudents(currentUser.id);
    let added = 0;
    list.forEach((rec) => {
      const exists = boardingRecords.some(
        (b) => b.studentId === rec.studentId || b.studentName.toLowerCase() === rec.studentName.toLowerCase()
      );
      if (!exists) {
        onAddBoardingRecord(rec);
        added++;
      }
    });
    setStatusMessage(
      `Đã nạp thành công 39 học sinh thực tế của Lớp 4/1 từ cơ sở dữ liệu ngành DSHS Trường Tiểu học Phú Bài năm học 2026-2027 (bổ sung ${added} hồ sơ mới).`
    );
  };

  // Sync students from Homeroom or TT27 roster into Semi-Boarding
  const handleSyncStudentsToBoarding = () => {
    let added = 0;
    const sourceNames: Array<{ id: string; name: string; className: string }> = [];

    students.forEach((s) => {
      sourceNames.push({ id: s.id, name: s.fullName, className: s.className });
    });
    tt27Records.forEach((r) => {
      if (!sourceNames.some((sn) => sn.name.toLowerCase() === r.studentName.toLowerCase())) {
        sourceNames.push({ id: r.studentId, name: r.studentName, className: r.className });
      }
    });

    sourceNames.forEach((src, idx) => {
      const exists = boardingRecords.some(
        (br) => br.studentId === src.id || br.studentName.toLowerCase() === src.name.toLowerCase()
      );
      if (!exists) {
        const rec: BoardingStudentRecord = {
          id: `bt_sync_${Date.now()}_${idx}`,
          ownerUid: currentUser.id,
          studentId: src.id,
          studentName: src.name,
          className: src.className || currentUser.className || '4/1',
          campus: 'Trường chính',
          date: todayStr,
          mealAttendance: 'CO_AN',
          portionStatus: 'HET_SUAT',
          napStatus: 'NGU_TOT',
          healthTemperature: '36.6°C - Bình thường',
          allergyOrDietNote: 'Không dị ứng thực phẩm',
          boardingFeeStatus: 'DA_DONG',
          handoverMorningConfirmed: true,
          handoverAfternoonConfirmed: true,
          teacherNote: ''
        };
        rec.teacherNote = synthesizeBoardingCareComment(rec);
        onAddBoardingRecord(rec);
        added++;
      }
    });

    if (added > 0) {
      setStatusMessage(`Đã đồng bộ ${added} học sinh từ danh sách lớp vào Sổ Quản Lý Bán Trú.`);
    } else if (sourceNames.length === 0) {
      setStatusMessage('Danh sách lớp hiện chưa có học sinh. Nhấn nút "Nạp 39 Học Sinh Thực Tế Lớp 4/1" để nạp ngay.');
    } else {
      setStatusMessage('Tất cả học sinh trong danh sách đã có tên trong Sổ Quản Lý Bán Trú.');
    }
  };

  const handleCreateBoardingStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.studentName.trim()) return;

    const rec: BoardingStudentRecord = {
      id: `bt_${Date.now()}`,
      ownerUid: currentUser.id,
      studentId: `hs_bt_${Date.now()}`,
      studentName: newStudentForm.studentName.trim(),
      className: newStudentForm.className.trim() || currentUser.className || '4/1',
      campus: newStudentForm.campus,
      date: todayStr,
      mealAttendance:
        newStudentForm.allergyOrDietNote.toLowerCase().includes('dị ứng')
          ? 'CHE_DO_RIENG'
          : 'CO_AN',
      portionStatus: 'HET_SUAT',
      napStatus: 'NGU_TOT',
      healthTemperature: newStudentForm.healthTemperature.trim() || '36.6°C - Bình thường',
      allergyOrDietNote: newStudentForm.allergyOrDietNote.trim() || 'Không dị ứng',
      boardingFeeStatus: newStudentForm.boardingFeeStatus,
      handoverMorningConfirmed: true,
      handoverAfternoonConfirmed: true,
      teacherNote: ''
    };
    rec.teacherNote = synthesizeBoardingCareComment(rec);

    onAddBoardingRecord(rec);
    setNewStudentForm({
      ...newStudentForm,
      studentName: ''
    });
    setShowAddStudentModal(false);
    setStatusMessage(`Đã thêm học sinh "${rec.studentName}" vào danh sách bán trú.`);
  };

  const handleGenerateAiCareComment = async (rec: BoardingStudentRecord) => {
    setAiLoadingId(rec.id);
    try {
      const res = await fetch('/api/ai/suggest-boarding-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: rec })
      });
      const data = await res.json();
      if (data.comment) {
        onUpdateBoardingRecord({
          ...rec,
          teacherNote: data.comment
        });
        setStatusMessage(`AI đã tạo nhận xét chăm sóc bán trú cho em "${rec.studentName}".`);
      }
    } catch {
      const fallback = synthesizeBoardingCareComment(rec);
      onUpdateBoardingRecord({
        ...rec,
        teacherNote: fallback
      });
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleCreateMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const sig = generateDigitalSignature(
      `ATTP-${newMenuForm.dayOfWeek}`,
      currentUser.name,
      currentUser.signatureCertId,
      new Date().toISOString(),
      currentUser.schoolCode || '460012'
    );

    const newMenu: BoardingMenuRecord = {
      id: `menu_${Date.now()}`,
      ownerUid: currentUser.id,
      date: todayStr,
      dayOfWeek: newMenuForm.dayOfWeek,
      lunchMainDish: newMenuForm.lunchMainDish.trim(),
      lunchSideDish: newMenuForm.lunchSideDish.trim(),
      lunchSoup: newMenuForm.lunchSoup.trim(),
      afternoonSnack: newMenuForm.afternoonSnack.trim(),
      caloriesKcal: Number(newMenuForm.caloriesKcal) || 690,
      step1InputCheck: 'DAT',
      step2ProcessingCheck: 'DAT',
      step3SampleSaved: 'DA_LUU_MAU_24H',
      inspectorName: currentUser.name,
      signatureHash: sig.signatureHash
    };

    onAddBoardingMenu(newMenu);
    setShowAddMenuModal(false);
    setStatusMessage(
      `Đã lưu thực đơn "${newMenu.dayOfWeek}" và ký xác nhận Kiểm thực 3 bước & Lưu mẫu 24h (${sig.signatureHash}).`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Bố cục hành chính sư phạm khoa học & hiện đại */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Hàng 1: Huy hiệu chứng nhận & Định danh 2 cơ sở */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
              <Utensils className="w-3.5 h-3.5 text-orange-600" />
              QĐ 1246/QĐ-BYT • Kiểm thực 3 bước & Lưu mẫu 24h
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
              <Building className="w-3.5 h-3.5 text-purple-600" />
              2 Cơ Sở: Trường chính & Phân hiệu Phú Bài
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              BGH Chỉ Đạo: Phan Hữu Tùng & Võ Thị Kim Oanh
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Năm học 2026 - 2027
          </span>
        </div>

        {/* Hàng 2: Tiêu đề toàn màn hình & Khẩu hiệu hành động */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 rounded-full bg-orange-500 inline-block"></span>
            Quản Lý Bán Trú Tiểu Học & An Toàn Vệ Sinh Thực Phẩm Điện Tử
          </h2>
          <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 leading-relaxed flex flex-col md:flex-row md:items-center justify-between gap-2">
            <span>
              Nguyên tắc: <strong className="text-slate-900">&quot;Một kế hoạch – một quy trình – một tiêu chuẩn chất lượng – hai cơ sở thực hiện phù hợp điều kiện thực tế&quot;</strong> • Phương châm: <strong className="text-purple-900">&quot;Rõ người – rõ việc – rõ vị trí – rõ thời gian – rõ trách nhiệm&quot;</strong>.
            </span>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200 shrink-0 self-start md:self-auto">
              Quy chế số /QĐ-THPB
            </span>
          </div>
        </div>

        {/* Hàng 3: Thanh công cụ chức năng chia nhóm khoa học */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
          {/* Nhóm 1: Dữ liệu thực tế & Pháp chế */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadPhuBai39Students}
              title="Nạp 39 học sinh thực tế của Lớp 4/1 từ file DSHS TOAN TRUONG 26_27.xls"
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <BadgeCheck className="w-4 h-4 text-slate-950" />
              Nạp 39 HS Thực Tế (Lớp 4/1)
            </button>
            <button
              type="button"
              onClick={() => setShowQuyCheModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              Quy Chế Bán Trú (QĐ 2026)
            </button>
          </div>

          {/* Nhóm 2: Tải lên & Tải xuống (Import / Export) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenAiTemplateImport}
              title="Tải lên file danh sách, thực đơn Excel/Word/CSV bằng AI"
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Tải Lên File (AI / Excel)
            </button>
            <button
              type="button"
              onClick={() =>
                exportBanTruToExcel(
                  boardingRecords,
                  boardingMenus,
                  currentUser.className || '4/1',
                  new Date().toLocaleDateString('vi-VN')
                )
              }
              title="Tải toàn bộ sổ bán trú và thực đơn kiểm thực ra file Excel chuẩn"
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Tải Xuống Sổ Bán Trú (Excel)
            </button>
          </div>

          {/* Nhóm 3: Thêm mới hồ sơ & thực đơn */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm HS Bán Trú
            </button>
            <button
              type="button"
              onClick={() => setShowAddMenuModal(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Utensils className="w-4 h-4" />
              Thêm Thực Đơn
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {statusMessage}
            </span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-emerald-700 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 4 KPI Cards for Semi-Boarding */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Sĩ Số Ăn Bán Trú Hôm Nay</span>
            <Utensils className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {stats.presentForMealCount}/{stats.totalBoardingStudents}
            </span>
            <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
              Lớp 4/1 Phú Bài
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Nghỉ có phép: <strong>{stats.absentForMealCount} HS</strong> • Chế độ ăn riêng:{' '}
            <strong className="text-orange-700">{stats.specialDietCount} HS</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Ăn Hết Suất & Giấc Ngủ Trưa</span>
            <Moon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">
              {stats.finishedPortionRatePercent}%
            </span>
            <span className="text-xs font-semibold text-slate-600">Ăn hết khẩu phần</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Tỷ lệ ngủ trưa ngoan đúng giờ: <strong className="text-indigo-700">{stats.goodNapRatePercent}%</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Dinh Dưỡng & Kiểm Thực 3 Bước</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {stats.averageCaloriesKcal || 690} Kcal
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Chuẩn Viện Dinh Dưỡng
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Lưu mẫu thức ăn 24/24h (QĐ 1246):{' '}
            <strong className="text-emerald-700">{stats.foodSafetyComplianceRatePercent}% Đạt chuẩn</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Kiểm Tra Bán Trú & Bàn Giao</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-700">
              {audits.length} Đợt
            </span>
            <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Trường chính & Phân hiệu
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Bàn giao 2 buổi (10h30 & 13h45): <strong className="text-emerald-700">100% Hoàn thành</strong>
          </p>
        </div>
      </div>

      {/* 4 Main Functional Sub-Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('STUDENTS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'STUDENTS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              1. Sổ Điểm Danh, Bàn Giao & Ăn Ngủ Bán Trú ({boardingRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('MENUS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'MENUS'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              2. Thực Đơn Tuần & Kiểm Thực 3 Bước - Lưu Mẫu 24H ({boardingMenus.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('INSPECTION')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'INSPECTION'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              3. Đoàn Kiểm Tra & Biên Bản Bán Trú - Y Tế ({audits.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('ORGANIZATION')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'ORGANIZATION'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              4. Tổ Bán Trú & Phân Công 5 Vị Trí Trực (QĐ 2026-2027)
            </button>
          </div>

          {subTab === 'STUDENTS' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên / mã học sinh..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>
              <select
                aria-label="Lọc theo cơ sở"
                value={filterCampus}
                onChange={(e) => setFilterCampus(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold"
              >
                <option value="ALL">🏢 Tất cả cơ sở</option>
                <option value="Trường chính">🏫 Trường chính</option>
                <option value="Phân hiệu">🏫 Phân hiệu</option>
              </select>
              <select
                aria-label="Lọc trạng thái ăn bán trú"
                value={filterAttendance}
                onChange={(e) => setFilterAttendance(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold"
              >
                <option value="ALL">🍱 Tất cả trạng thái ăn</option>
                <option value="CO_AN">Có ăn bán trú</option>
                <option value="CHE_DO_RIENG">Chế độ ăn riêng / Dị ứng</option>
                <option value="NGHI_CO_PHEP">Nghỉ ăn có phép</option>
              </select>
            </div>
          )}
        </div>

        {/* =========================================================================
            SUB-TAB 1: SỔ ĐIỂM DANH, BÀN GIAO & ĂN NGỦ BÁN TRÚ
           ========================================================================= */}
        {subTab === 'STUDENTS' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
              <span className="font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-700" />
                Quy trình bàn giao học sinh 2 chiều: <strong>Buổi sáng (10h30)</strong> từ GVCN sang Nhân viên trực trưa • <strong>Buổi chiều (13h45)</strong> bàn giao cho Giáo viên buổi chiều.
              </span>
              <span className="text-[11px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                Hiển thị: {filteredRecords.length} / {boardingRecords.length} học sinh
              </span>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mx-auto">
                  <Utensils className="w-6 h-6" />
                </div>
                <div className="max-w-lg mx-auto space-y-1">
                  <h3 className="text-base font-bold text-slate-800">
                    Chưa có hồ sơ học sinh phù hợp bộ lọc
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nhấn nút <strong>&quot;Nạp 39 Học Sinh Thực Tế Lớp 4/1&quot;</strong> bên trên để nạp nhanh toàn bộ 39 học sinh từ CSDL trường Phú Bài.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleLoadPhuBai39Students}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <BadgeCheck className="w-4 h-4 text-slate-950" />
                    Nạp 39 Học Sinh Thực Tế Lớp 4/1
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm Thủ Công
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3 text-left font-bold">STT / Học sinh</th>
                      <th className="py-2.5 px-2 text-center font-bold">Cơ sở</th>
                      <th className="py-2.5 px-2 text-center font-bold" title="Bàn giao 10h30 từ GVCN sang nhân viên quản lý trưa">
                        Bàn giao sáng (10h30)
                      </th>
                      <th className="py-2.5 px-2 text-center font-bold">Điểm danh ăn</th>
                      <th className="py-2.5 px-2 text-center font-bold">Khẩu phần</th>
                      <th className="py-2.5 px-2 text-center font-bold">Ngủ trưa</th>
                      <th className="py-2.5 px-2 text-center font-bold" title="Bàn giao 13h45 từ nhân viên quản lý trưa sang GV chiều">
                        Bàn giao chiều (13h45)
                      </th>
                      <th className="py-2.5 px-2 text-left font-bold">Thân nhiệt & Dị ứng</th>
                      <th className="py-2.5 px-3 text-left font-bold">Nhận xét Bán trú (AI)</th>
                      <th className="py-2.5 px-2 text-center font-bold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredRecords.map((rec, idx) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400 w-5 text-right">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{rec.studentName}</div>
                              <div className="text-[10px] font-mono text-purple-700">
                                {rec.studentId} • {rec.className}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              rec.campus === 'Phân hiệu'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}
                          >
                            {rec.campus || 'Trường chính'}
                          </span>
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateBoardingRecord({
                                ...rec,
                                handoverMorningConfirmed: !rec.handoverMorningConfirmed
                              });
                            }}
                            title="Xác nhận bàn giao sĩ số 10h30"
                            className={`p-1 rounded cursor-pointer transition-colors ${
                              rec.handoverMorningConfirmed !== false
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            <CheckSquare className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <select
                            aria-label={`Điểm danh ăn trưa ${rec.studentName}`}
                            value={rec.mealAttendance}
                            onChange={(e) => {
                              const updated: BoardingStudentRecord = {
                                ...rec,
                                mealAttendance: e.target.value as BoardingStudentRecord['mealAttendance']
                              };
                              updated.teacherNote = synthesizeBoardingCareComment(updated);
                              onUpdateBoardingRecord(updated);
                            }}
                            className={`px-2 py-1 rounded-lg font-bold text-[11px] border ${
                              rec.mealAttendance === 'CO_AN'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : rec.mealAttendance === 'CHE_DO_RIENG'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <option value="CO_AN">Có ăn bán trú</option>
                            <option value="CHE_DO_RIENG">Chế độ ăn riêng</option>
                            <option value="NGHI_CO_PHEP">Nghỉ có phép</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <select
                            aria-label={`Khẩu phần ${rec.studentName}`}
                            value={rec.portionStatus}
                            onChange={(e) => {
                              const updated: BoardingStudentRecord = {
                                ...rec,
                                portionStatus: e.target.value as BoardingStudentRecord['portionStatus']
                              };
                              updated.teacherNote = synthesizeBoardingCareComment(updated);
                              onUpdateBoardingRecord(updated);
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-200"
                          >
                            <option value="HET_SUAT">Ăn hết suất</option>
                            <option value="CON_THUA">Còn thừa</option>
                            <option value="CAN_HO_TRO">Cần hỗ trợ</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <select
                            aria-label={`Giấc ngủ trưa ${rec.studentName}`}
                            value={rec.napStatus}
                            onChange={(e) => {
                              const updated: BoardingStudentRecord = {
                                ...rec,
                                napStatus: e.target.value as BoardingStudentRecord['napStatus']
                              };
                              updated.teacherNote = synthesizeBoardingCareComment(updated);
                              onUpdateBoardingRecord(updated);
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-200"
                          >
                            <option value="NGU_TOT">Ngủ ngoan đúng giờ</option>
                            <option value="KHO_NGU">Khó ngủ / Trằn trọc</option>
                            <option value="THEO_DOI_SUC_KHOE">Theo dõi sức khỏe</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateBoardingRecord({
                                ...rec,
                                handoverAfternoonConfirmed: !rec.handoverAfternoonConfirmed
                              });
                            }}
                            title="Xác nhận bàn giao sĩ số 13h45"
                            className={`p-1 rounded cursor-pointer transition-colors ${
                              rec.handoverAfternoonConfirmed !== false
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            <CheckSquare className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-slate-800 text-[11px]">
                            {rec.healthTemperature || '36.6°C'}
                          </div>
                          <div
                            className={`text-[10px] ${
                              rec.allergyOrDietNote.toLowerCase().includes('dị ứng')
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-500'
                            }`}
                          >
                            {rec.allergyOrDietNote}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 max-w-[280px]">
                          <p className="text-[11px] text-slate-700 leading-relaxed italic line-clamp-2">
                            &quot;{rec.teacherNote || synthesizeBoardingCareComment(rec)}&quot;
                          </p>
                        </td>

                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={aiLoadingId === rec.id}
                              onClick={() => handleGenerateAiCareComment(rec)}
                              title="Tạo gợi ý nhận xét chăm sóc cá nhân hóa bằng AI"
                              className="p-1 rounded-lg text-purple-600 hover:bg-purple-50 cursor-pointer disabled:opacity-50"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStudentRecord(rec)}
                              title="Chỉnh sửa chi tiết hồ sơ bán trú học sinh"
                              className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteBoardingRecord(rec.id)}
                              title="Xóa khỏi danh sách bán trú"
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SUB-TAB 2: THỰC ĐƠN TUẦN & KIỂM THỰC 3 BƯỚC, LƯU MẪU 24H (QĐ 1246/QĐ-BYT)
           ========================================================================= */}
        {subTab === 'MENUS' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong className="block text-emerald-900">
                  ✓ Quy Trình Bếp Ăn Một Chiều & Kiểm Thực 3 Bước Theo Quyết Định 1246/QĐ-BYT:
                </strong>
                <span>
                  Bước 1: Kiểm tra nguồn gốc thực phẩm nhập vào • Bước 2: Kiểm tra chế biến & dụng cụ tiệt trùng • Bước 3: Kiểm tra thức ăn trước khi ăn & Lưu mẫu 24/24h niêm phong trong tủ lưu mẫu chuyên dụng.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMenuModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shrink-0 cursor-pointer"
              >
                + Thêm Thực Đơn Mới
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boardingMenus.map((menu) => (
                <div
                  key={menu.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span className="font-extrabold text-sm text-slate-900">
                          {menu.dayOfWeek}
                        </span>
                        <span className="text-[11px] text-slate-500">({menu.date})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-200">
                        {menu.caloriesKcal || 690} Kcal
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 shrink-0 font-medium w-16">Món mặn:</span>
                        <strong className="text-slate-900 font-bold">{menu.lunchMainDish}</strong>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 shrink-0 font-medium w-16">Món xào:</span>
                        <span className="text-slate-800">{menu.lunchSideDish}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 shrink-0 font-medium w-16">Món canh:</span>
                        <span className="text-slate-800">{menu.lunchSoup}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 shrink-0 font-medium w-16">Bữa xế:</span>
                        <span className="text-purple-900 font-semibold">{menu.afternoonSnack}</span>
                      </div>
                    </div>

                    {/* 3 Step Verification Badges */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">B1. Nhập thực phẩm:</span>
                        <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                          ✓ ĐẠT CHUẨN
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">B2. Chế biến 1 chiều:</span>
                        <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                          ✓ ĐẠT VỆ SINH
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">B3. Lưu mẫu 24h:</span>
                        <span className="px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-900">
                          ✓ ĐÃ LƯU 24/24H
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[170px]" title={menu.signatureHash || 'SMARTCA'}>
                      Ký số: <strong className="text-emerald-800 font-mono">{menu.signatureHash || 'SMARTCA-ATTP'}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMenuRecord(menu)}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                        title="Chỉnh sửa thực đơn và kiểm thực"
                      >
                        <Pencil className="w-3 h-3" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBoardingMenu(menu.id)}
                        className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            SUB-TAB 3: ĐOÀN KIỂM TRA & BIÊN BẢN KIỂM TRA BÁN TRÚ - Y TẾ
           ========================================================================= */}
        {subTab === 'INSPECTION' && (
          <div className="space-y-5">
            {/* Committee Introduction Card */}
            <div className="bg-linear-to-r from-purple-950 to-indigo-950 rounded-2xl p-5 text-white shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 mb-1.5">
                    <Award className="w-3.5 h-3.5" />
                    Đoàn Kiểm Tra Công Tác Bán Trú Trường Tiểu Học Phú Bài (Năm học 2026–2027)
                  </div>
                  <h3 className="text-lg font-black tracking-tight">
                    Ban Chỉ Đạo & Đoàn Kiểm Tra Công Tác Bán Trú Hai Cơ Sở
                  </h3>
                  <p className="text-xs text-purple-200 mt-1 max-w-2xl leading-relaxed">
                    Được thành lập theo Quyết định của Hiệu trưởng Trường Tiểu học Phú Bài, thực hiện kiểm tra toàn diện định kỳ, đột xuất và kiểm tra chéo giữa Trường chính và Phân hiệu.
                  </p>
                </div>
              </div>

              {/* Committee Members Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-purple-800/60 text-xs">
                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-xs">
                  <div className="text-[10px] text-amber-300 font-bold uppercase">Trưởng đoàn</div>
                  <div className="font-extrabold text-sm text-white">Ông Phan Hữu Tùng</div>
                  <div className="text-[11px] text-purple-200">Hiệu trưởng nhà trường</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-xs">
                  <div className="text-[10px] text-amber-300 font-bold uppercase">Phó Trưởng đoàn (Chỉ đạo trực tiếp)</div>
                  <div className="font-extrabold text-sm text-white">Bà Võ Thị Kim Oanh</div>
                  <div className="text-[11px] text-purple-200">Phó Hiệu trưởng phụ trách</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-xs">
                  <div className="text-[10px] text-amber-300 font-bold uppercase">Phó Trưởng đoàn</div>
                  <div className="font-extrabold text-sm text-white">Bà Lê Thị Thủy</div>
                  <div className="text-[11px] text-purple-200">Phó Hiệu trưởng</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5">
                  <div className="text-[10px] text-purple-300 font-bold uppercase">Tài chính - Kế toán</div>
                  <div className="font-bold text-white">Bà Lê Thị Kim Anh & Bà Võ Thị Lệ Thủy</div>
                  <div className="text-[11px] text-purple-200">Kế toán & Thủ quỹ nhà trường</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5">
                  <div className="text-[10px] text-purple-300 font-bold uppercase">Đại diện CMHS & Y tế</div>
                  <div className="font-bold text-white">Ông Võ Như Thanh, Bà Lê Thị Thu Mẫn, Bà Đặng Thị Nga</div>
                  <div className="text-[11px] text-purple-200">Đại diện Phụ huynh & 2 Y tế cơ sở</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5">
                  <div className="text-[10px] text-purple-300 font-bold uppercase">Thư ký đoàn</div>
                  <div className="font-bold text-white">Bà Lê Thị Hòa</div>
                  <div className="text-[11px] text-purple-200">Nhân viên Văn thư lưu trữ</div>
                </div>
              </div>
            </div>

            {/* Inspections List */}
            <div className="space-y-3">
              <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Hồ Sơ Các Đợt Kiểm Tra Thực Tế Tại Nhà Trường (Năm học 2026–2027)</span>
                <span className="text-xs text-slate-500 font-normal">
                  Đã số hóa đầy đủ biên bản và ký số điện tử
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {audits.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between hover:border-purple-300 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold mb-1 ${
                              item.overallRating === 'DAT_XUAT_SAC'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            ✓ {item.overallRating === 'DAT_XUAT_SAC' ? 'ĐẠT XUẤT SẮC' : 'ĐẠT YÊU CẦU'}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                            {item.inspectionTypeLabel}
                          </h4>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Ngày kiểm tra: <strong>{item.inspectionDate}</strong> • Địa điểm: <strong>{item.campusLocation}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div>
                          <strong className="text-slate-900">Kết quả đánh giá: </strong>
                          <span className="leading-relaxed">{item.findingsSummary}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-950 text-[11px]">
                          <strong className="text-amber-900 block mb-0.5">
                            ⚠️ Các vấn đề ghi nhớ khắc phục:
                          </strong>
                          <span>{item.rectificationNotes}</span>
                          <div className="mt-1 font-semibold text-amber-800">
                            Thời hạn: {item.rectificationDeadline}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {item.signedHash}
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingAudit(item)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem Biên Bản
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SUB-TAB 4: TỔ BÁN TRÚ & PHÂN CÔNG 5 VỊ TRÍ TRỰC (QĐ 2026-2027)
           ========================================================================= */}
        {subTab === 'ORGANIZATION' && (
          <div className="space-y-5">
            {/* Core Principles Header */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 mb-1">
                    Quyết Định Số /QĐ-THPB (Ký ngày 04/9/2026)
                  </div>
                  <h3 className="text-lg font-black">
                    Tổ Chức Hoạt Động Bán Trú Trường Tiểu Học Phú Bài Năm Học 2026–2027
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuyCheModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  Đọc Toàn Văn Quy Chế Bán Trú (8 Điều)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-1">
                    Nguyên Tắc Thống Nhất Cốt Lõi
                  </div>
                  <p className="font-extrabold text-sm text-white">
                    &quot;Một kế hoạch – một quy trình – một tiêu chuẩn chất lượng – hai cơ sở thực hiện phù hợp điều kiện thực tế.&quot;
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-1">
                    Phương Châm Làm Việc
                  </div>
                  <p className="font-extrabold text-sm text-purple-200">
                    &quot;Rõ người – rõ việc – rõ vị trí – rõ thời gian – rõ trách nhiệm.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* 9 Functional Duties under Decision */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-600" />
                9 Nhiệm Vụ Trọng Tâm Của Tổ Bán Trú (Căn cứ Điều 2 Quyết định thành lập)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-slate-700">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>Thực hiện nghiêm túc Kế hoạch tổ chức hoạt động bán trú của nhà trường.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>Quản lý, chăm sóc và bảo đảm an toàn liên tục từ khi tan học sáng đến giờ học chiều.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>Tiếp nhận, kiểm tra, giám sát suất ăn; kiểm thực 3 bước và vệ sinh ATTP.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    4
                  </span>
                  <span>Phân công, bố trí nhân sự trực tại 5 khu vực trọng điểm theo điều kiện thực tế.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    5
                  </span>
                  <span>Thực hiện nghiêm túc việc điểm danh, quản lý sĩ số và bàn giao học sinh 2 chiều.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    6
                  </span>
                  <span>Theo dõi sức khỏe, tâm lý, thân nhiệt và xử lý ngay các biểu hiện bất thường.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    7
                  </span>
                  <span>Vệ sinh sạch sẽ khu vực ăn, nghỉ trưa và khử khuẩn các khu vực phụ trợ.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    8
                  </span>
                  <span>Phối hợp chặt chẽ với cha mẹ học sinh và đơn vị cung cấp suất ăn bán trú.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                    9
                  </span>
                  <span>Thực hiện chế độ kiểm tra, báo cáo BGH và xử lý kịp thời các tình huống phát sinh.</span>
                </div>
              </div>
            </div>

            {/* 5 Duty Stations */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Bảng Phân Công Lực Lượng Trực 5 Khu Vực Bán Trú Hằng Ngày
                </span>
                <span className="text-xs text-slate-500 font-normal">
                  Áp dụng thống nhất tại Trường chính & Phân hiệu
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2.5 text-left font-bold">Khu vực / Vị trí trực</th>
                      <th className="p-2.5 text-center font-bold">Cơ sở</th>
                      <th className="p-2.5 text-left font-bold">Nhân sự phụ trách</th>
                      <th className="p-2.5 text-left font-bold">Khung giờ trực</th>
                      <th className="p-2.5 text-left font-bold">Nhiệm vụ trọng tâm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {dutySchedule.map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{slot.zoneName}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                            {slot.campus}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900">{slot.staffName}</div>
                          <div className="text-[10px] text-slate-500">{slot.staffRole}</div>
                        </td>
                        <td className="p-2.5 font-mono text-purple-900 font-bold">{slot.timeRange}</td>
                        <td className="p-2.5 text-slate-700 leading-relaxed max-w-md">
                          {slot.dutyDescription}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: VIEW OFFICIAL INSPECTION MINUTES (BIÊN BẢN KIỂM TRA)
         ========================================================================= */}
      {viewingAudit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-extrabold text-base">Hồ Sơ Biên Bản Kiểm Tra Chính Thức</h3>
                  <p className="text-[11px] text-slate-300">
                    Trường Tiểu học Phú Bài • Quyết định thành lập đoàn kiểm tra năm học 2026–2027
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAudit(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-serif leading-relaxed text-slate-800">
              {/* National Emblem & Title Header */}
              <div className="grid grid-cols-2 gap-4 text-center border-b border-slate-200 pb-4 font-sans">
                <div>
                  <div className="font-bold text-[11px] uppercase">UBND PHƯỜNG PHÚ BÀI</div>
                  <div className="font-extrabold text-xs uppercase text-slate-900">
                    TRƯỜNG TIỂU HỌC PHÚ BÀI
                  </div>
                  <div className="text-[10px] text-slate-500">Số: {viewingAudit.decisionNumber}</div>
                </div>
                <div>
                  <div className="font-bold text-[11px] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-xs">Độc lập – Tự do – Hạnh phúc</div>
                  <div className="text-[10px] text-slate-500 italic">
                    Phú Bài, ngày {viewingAudit.inspectionDate}
                  </div>
                </div>
              </div>

              <div className="text-center space-y-1 pt-2 font-sans">
                <h2 className="text-base font-black text-slate-900 uppercase">
                  {viewingAudit.inspectionTypeLabel}
                </h2>
                <div className="text-xs text-slate-600 italic">
                  (Địa điểm kiểm tra: {viewingAudit.campusLocation} – Trường Tiểu học Phú Bài)
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <strong className="font-bold text-slate-900">I. THÀNH PHẦN ĐOÀN KIỂM TRA:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li>{viewingAudit.leaderName}</li>
                    <li>{viewingAudit.deputyLeaderName}</li>
                    {viewingAudit.committeeMembers.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong className="font-bold text-slate-900">II. NỘI DUNG VÀ KẾT QUẢ KIỂM TRA:</strong>
                  <p className="mt-1 pl-3 border-l-2 border-purple-500 bg-slate-50 p-2.5 rounded-r">
                    {viewingAudit.findingsSummary}
                  </p>
                </div>

                <div>
                  <strong className="font-bold text-slate-900">III. KẾT LUẬN & ĐÁNH GIÁ CHUNG:</strong>
                  <div className="mt-1 font-bold text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                    XẾP LOẠI: {viewingAudit.overallRating === 'DAT_XUAT_SAC' ? 'ĐẠT XUẤT SẮC' : 'ĐẠT YÊU CẦU TIÊU CHUẨN'}
                  </div>
                </div>

                <div>
                  <strong className="font-bold text-slate-900">IV. CÁC NỘI DUNG GHI NHỚ KHẮC PHỤC:</strong>
                  <div className="mt-1 p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-950">
                    <p>{viewingAudit.rectificationNotes}</p>
                    <p className="font-bold mt-1 text-amber-900">
                      Thời hạn hoàn thành: {viewingAudit.rectificationDeadline}
                    </p>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="grid grid-cols-2 gap-4 text-center pt-6 font-sans">
                  <div>
                    <div className="font-bold uppercase text-[11px]">ĐẠI DIỆN CƠ SỞ ĐƯỢC KIỂM TRA</div>
                    <div className="text-[10px] text-slate-500 italic mt-0.5">(Đã ký xác nhận)</div>
                    <div className="mt-12 font-bold text-slate-900">Ban Quản lý Bếp ăn Cơ sở</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[11px]">TM. ĐOÀN KIỂM TRA • HIỆU TRƯỞNG</div>
                    <div className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5">
                      ✓ Chữ ký số SmartCA: {viewingAudit.signedHash}
                    </div>
                    <div className="mt-12 font-bold text-slate-900">{viewingAudit.signedBy}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Lưu trữ: VT, Bán trú, Hồ sơ Kiểm tra nội bộ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In Biên Bản
                </button>
                <button
                  type="button"
                  onClick={() => setViewingAudit(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW FULL QUY CHẾ BÁN TRÚ (8 ĐIỀU)
         ========================================================================= */}
      {showQuyCheModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300">
            <div className="bg-linear-to-r from-purple-950 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-extrabold text-base">
                    Quy Chế Quản Lý, Vận Hành Công Tác Bán Trú Năm Học 2026–2027
                  </h3>
                  <p className="text-[11px] text-purple-200">
                    Trường Tiểu học Phú Bài • Áp dụng tại 2 cơ sở: Trường chính và Phân hiệu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuyCheModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-800 font-sans">
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-950">
                <strong>Căn cứ ban hành: </strong>
                Thông tư số 15/2026/TT-BGDĐT của Bộ GD&ĐT ban hành Điều lệ trường tiểu học; Kế hoạch nhiệm vụ năm học 2026–2027 của Trường Tiểu học Phú Bài và nhu cầu thực tế của cha mẹ học sinh tại 2 cơ sở Trường chính và Phân hiệu.
              </div>

              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-sm text-purple-900 uppercase">CHƯƠNG I: QUY ĐỊNH CHUNG</h4>
                  <p className="mt-1">
                    <strong>Điều 1. Mục đích:</strong> Nâng cao chất lượng chăm sóc dinh dưỡng, bảo đảm an toàn tuyệt đối về thể chất và tinh thần cho học sinh; rèn luyện nền nếp tự phục vụ, giữ gìn vệ sinh và thói quen sinh hoạt khoa học.
                  </p>
                  <p className="mt-1">
                    <strong>Điều 2. Đối tượng và phạm vi áp dụng:</strong> Toàn thể cán bộ quản lý, giáo viên, nhân viên, học sinh tham gia bán trú và các tổ chức, cá nhân cung cấp dịch vụ bán trú tại Trường chính và Phân hiệu Trường Tiểu học Phú Bài.
                  </p>
                </div>

                <div className="border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-sm text-purple-900 uppercase">CHƯƠNG II: QUY TRÌNH TỔ CHỨC VÀ QUẢN LÝ BÁN TRÚ</h4>
                  <p className="mt-1">
                    <strong>Điều 3. Quản lý vệ sinh an toàn thực phẩm và khẩu phần ăn:</strong>
                    <br />• Thực hiện đúng quy trình bếp ăn một chiều.
                    <br />• Thực hiện nghiêm túc Kiểm thực 3 bước và lưu mẫu thức ăn 24/24 giờ theo Quyết định 1246/QĐ-BYT.
                    <br />• Thực phẩm nhập vào phải có nguồn gốc rõ ràng, hóa đơn chứng từ hợp pháp, kiểm tra độ tươi sống trước khi tiếp nhận.
                  </p>
                  <p className="mt-1">
                    <strong>Điều 4. Tổ chức bữa ăn và chăm sóc giấc ngủ:</strong>
                    <br />• Giờ ăn trưa: Từ 10h45 đến 11h45. Học sinh được hướng dẫn rửa tay bằng xà phòng sát khuẩn trước khi vào bàn ăn; có khay thìa riêng biệt, chia khẩu phần đủ định lượng dinh dưỡng.
                    <br />• Giờ ngủ trưa: Từ 11h45 đến 13h45. Phòng ngủ thoáng mát về mùa hè, ấm áp về mùa đông; có giáo viên và nhân viên trực theo dõi sát sao, nhắc nhở học sinh giữ trật tự và ngủ đúng giờ.
                  </p>
                  <p className="mt-1">
                    <strong>Điều 5. Công tác Y tế học đường và xử lý sự cố:</strong>
                    <br />• Duy trì trực y tế thường xuyên tại 2 cơ sở. Định kỳ kiểm tra thân nhiệt học sinh.
                    <br />• Khi học sinh có biểu hiện sốt, đau bụng hoặc bất thường, nhân viên y tế và trực trưa xử lý ngay tại phòng y tế và báo cáo Ban Giám hiệu, liên hệ phụ huynh kịp thời.
                  </p>
                </div>

                <div className="border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-sm text-purple-900 uppercase">CHƯƠNG III: TRÁCH NHIỆM CỦA CÁC THÀNH PHẦN</h4>
                  <p className="mt-1">
                    <strong>Điều 6. Trách nhiệm của Ban Giám hiệu:</strong> Chịu trách nhiệm toàn diện về công tác bán trú trên cả 2 cơ sở; trực tiếp phê duyệt thực đơn tuần, kế hoạch kiểm thực và chỉ đạo giải quyết kịp thời các tình huống phát sinh.
                  </p>
                  <p className="mt-1">
                    <strong>Điều 7. Trách nhiệm của Giáo viên chủ nhiệm & Nhân viên bán trú:</strong> Điểm danh sĩ số chính xác, bàn giao học sinh sau buổi sáng và trước buổi chiều; theo dõi các em có bệnh lý, dị ứng thức ăn; trao đổi thường xuyên với cha mẹ học sinh qua sổ liên lạc điện tử.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-purple-900 uppercase">CHƯƠNG IV: ĐIỀU KHOẢN THI HÀNH</h4>
                  <p className="mt-1">
                    <strong>Điều 8. Hiệu lực thi hành:</strong> Quy chế này có hiệu lực kể từ ngày ký (ngày 20/10/2026). Toàn thể cán bộ, giáo viên, nhân viên và các bộ phận liên quan có trách nhiệm thực hiện nghiêm túc./.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Hiệu trưởng: <strong>Phan Hữu Tùng</strong> • Phó Hiệu trưởng: <strong>Võ Thị Kim Oanh</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowQuyCheModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW BOARDING STUDENT
         ========================================================================= */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Thêm Học Sinh Bán Trú Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBoardingStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên học sinh</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Lê Phương Bình An"
                  value={newStudentForm.studentName}
                  onChange={(e) =>
                    setNewStudentForm({ ...newStudentForm, studentName: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lớp</label>
                  <input
                    type="text"
                    value={newStudentForm.className}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, className: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cơ sở</label>
                  <select
                    value={newStudentForm.campus}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, campus: e.target.value as any })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Trường chính">Trường chính</option>
                    <option value="Phân hiệu">Phân hiệu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lưu ý dị ứng thực phẩm / Chế độ dinh dưỡng riêng
                </label>
                <input
                  type="text"
                  value={newStudentForm.allergyOrDietNote}
                  onChange={(e) =>
                    setNewStudentForm({ ...newStudentForm, allergyOrDietNote: e.target.value })
                  }
                  placeholder="VD: Dị ứng tôm biển / Không dị ứng"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thân nhiệt kiểm tra</label>
                <input
                  type="text"
                  value={newStudentForm.healthTemperature}
                  onChange={(e) =>
                    setNewStudentForm({ ...newStudentForm, healthTemperature: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Lưu Vào Sổ Bán Trú
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW NUTRITION MENU & 3-STEP INSPECTION
         ========================================================================= */}
      {showAddMenuModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Thêm Thực Đơn Bán Trú & Kiểm Thực 3 Bước (QĐ 1246/QĐ-BYT)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMenuModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMenu} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thứ trong tuần</label>
                  <select
                    value={newMenuForm.dayOfWeek}
                    onChange={(e) => setNewMenuForm({ ...newMenuForm, dayOfWeek: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Thứ Hai">Thứ Hai</option>
                    <option value="Thứ Ba">Thứ Ba</option>
                    <option value="Thứ Tư">Thứ Tư</option>
                    <option value="Thứ Năm">Thứ Năm</option>
                    <option value="Thứ Sáu">Thứ Sáu</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Định lượng năng lượng (Kcal)
                  </label>
                  <input
                    type="number"
                    value={newMenuForm.caloriesKcal}
                    onChange={(e) =>
                      setNewMenuForm({ ...newMenuForm, caloriesKcal: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Món mặn chính</label>
                <input
                  type="text"
                  required
                  value={newMenuForm.lunchMainDish}
                  onChange={(e) =>
                    setNewMenuForm({ ...newMenuForm, lunchMainDish: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Món xào / luộc</label>
                  <input
                    type="text"
                    required
                    value={newMenuForm.lunchSideDish}
                    onChange={(e) =>
                      setNewMenuForm({ ...newMenuForm, lunchSideDish: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Món canh</label>
                  <input
                    type="text"
                    required
                    value={newMenuForm.lunchSoup}
                    onChange={(e) =>
                      setNewMenuForm({ ...newMenuForm, lunchSoup: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bữa phụ xế chiều</label>
                <input
                  type="text"
                  required
                  value={newMenuForm.afternoonSnack}
                  onChange={(e) =>
                    setNewMenuForm({ ...newMenuForm, afternoonSnack: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Ký Xác Nhận Kiểm Thực & Lưu Mẫu 24h
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT STUDENT BOARDING RECORD
         ========================================================================= */}
      {editingStudentRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600" />
                  Chỉnh Sửa Hồ Sơ Bán Trú Học Sinh
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {editingStudentRecord.studentName} • Mã HS: {editingStudentRecord.studentId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudentRecord(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateBoardingRecord(editingStudentRecord);
                setStatusMessage(
                  `Đã cập nhật thành công hồ sơ bán trú cho học sinh "${editingStudentRecord.studentName}".`
                );
                setEditingStudentRecord(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên học sinh</label>
                  <input
                    type="text"
                    required
                    value={editingStudentRecord.studentName}
                    onChange={(e) =>
                      setEditingStudentRecord({ ...editingStudentRecord, studentName: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lớp / Cơ sở thực hiện</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingStudentRecord.className}
                      onChange={(e) =>
                        setEditingStudentRecord({ ...editingStudentRecord, className: e.target.value })
                      }
                      className="w-1/2 p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    />
                    <select
                      value={editingStudentRecord.campus || 'Trường chính'}
                      onChange={(e) =>
                        setEditingStudentRecord({
                          ...editingStudentRecord,
                          campus: e.target.value as 'Trường chính' | 'Phân hiệu'
                        })
                      }
                      className="w-1/2 p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    >
                      <option value="Trường chính">Trường chính</option>
                      <option value="Phân hiệu">Phân hiệu</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Điểm danh ăn</label>
                  <select
                    value={editingStudentRecord.mealAttendance}
                    onChange={(e) =>
                      setEditingStudentRecord({
                        ...editingStudentRecord,
                        mealAttendance: e.target.value as BoardingStudentRecord['mealAttendance']
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="CO_AN">Có ăn bán trú</option>
                    <option value="CHE_DO_RIENG">Chế độ riêng / Dị ứng</option>
                    <option value="NGHI_CO_PHEP">Nghỉ ăn có phép</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khẩu phần ăn</label>
                  <select
                    value={editingStudentRecord.portionStatus}
                    onChange={(e) =>
                      setEditingStudentRecord({
                        ...editingStudentRecord,
                        portionStatus: e.target.value as BoardingStudentRecord['portionStatus']
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="HET_SUAT">Ăn hết suất</option>
                    <option value="CON_THUA">Còn thừa</option>
                    <option value="CAN_HO_TRO">Cần hỗ trợ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giấc ngủ trưa</label>
                  <select
                    value={editingStudentRecord.napStatus}
                    onChange={(e) =>
                      setEditingStudentRecord({
                        ...editingStudentRecord,
                        napStatus: e.target.value as BoardingStudentRecord['napStatus']
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="NGU_TOT">Ngủ ngoan đúng giờ</option>
                    <option value="KHO_NGU">Khó ngủ / Trằn trọc</option>
                    <option value="THEO_DOI_SUC_KHOE">Theo dõi sức khỏe</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thân nhiệt & Theo dõi</label>
                  <input
                    type="text"
                    value={editingStudentRecord.healthTemperature || ''}
                    onChange={(e) =>
                      setEditingStudentRecord({ ...editingStudentRecord, healthTemperature: e.target.value })
                    }
                    placeholder="VD: 36.6°C - Bình thường"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiền ăn & Phí bán trú</label>
                  <select
                    value={editingStudentRecord.boardingFeeStatus}
                    onChange={(e) =>
                      setEditingStudentRecord({
                        ...editingStudentRecord,
                        boardingFeeStatus: e.target.value as BoardingStudentRecord['boardingFeeStatus']
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="DA_DONG">Đã đóng đủ</option>
                    <option value="CHUA_DONG">Chưa đóng</option>
                    <option value="MIEN_GIAM">Miễn giảm chính sách</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú dị ứng / Chế độ ăn uống đặc biệt
                </label>
                <input
                  type="text"
                  value={editingStudentRecord.allergyOrDietNote}
                  onChange={(e) =>
                    setEditingStudentRecord({ ...editingStudentRecord, allergyOrDietNote: e.target.value })
                  }
                  placeholder="VD: Dị ứng tôm cua, không ăn trứng gà..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex flex-wrap items-center justify-between gap-3">
                <span className="font-bold text-blue-900">Xác nhận bàn giao 2 chiều:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-semibold">
                    <input
                      type="checkbox"
                      checked={editingStudentRecord.handoverMorningConfirmed !== false}
                      onChange={(e) =>
                        setEditingStudentRecord({
                          ...editingStudentRecord,
                          handoverMorningConfirmed: e.target.checked
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Bàn giao sáng 10h30
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-semibold">
                    <input
                      type="checkbox"
                      checked={editingStudentRecord.handoverAfternoonConfirmed !== false}
                      onChange={(e) =>
                        setEditingStudentRecord({
                          ...editingStudentRecord,
                          handoverAfternoonConfirmed: e.target.checked
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Bàn giao chiều 13h45
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Nhận xét chăm sóc bán trú hàng ngày</label>
                  <button
                    type="button"
                    onClick={() => {
                      const comment = synthesizeBoardingCareComment(editingStudentRecord);
                      setEditingStudentRecord({ ...editingStudentRecord, teacherNote: comment });
                    }}
                    className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Sparkles className="w-3 h-3" />
                    Tạo lại nhận xét tự động
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={editingStudentRecord.teacherNote || ''}
                  onChange={(e) =>
                    setEditingStudentRecord({ ...editingStudentRecord, teacherNote: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudentRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT BOARDING MENU & INSPECTION RECORD
         ========================================================================= */}
      {editingMenuRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-teal-600" />
                Chỉnh Sửa Thực Đơn & Biên Bản Kiểm Thực 3 Bước
              </h3>
              <button
                type="button"
                onClick={() => setEditingMenuRecord(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const sig = generateDigitalSignature(
                  `ATTP-${editingMenuRecord.dayOfWeek}`,
                  currentUser.name,
                  currentUser.signatureCertId,
                  new Date().toISOString(),
                  currentUser.schoolCode || '460012'
                );
                const updated: BoardingMenuRecord = {
                  ...editingMenuRecord,
                  signatureHash: sig.signatureHash,
                  inspectorName: currentUser.name
                };
                onUpdateBoardingMenu(updated);
                setStatusMessage(
                  `Đã cập nhật và ký số lại thực đơn "${updated.dayOfWeek}" (${sig.signatureHash}).`
                );
                setEditingMenuRecord(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thứ trong tuần</label>
                  <select
                    value={editingMenuRecord.dayOfWeek}
                    onChange={(e) =>
                      setEditingMenuRecord({ ...editingMenuRecord, dayOfWeek: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Thứ Hai">Thứ Hai</option>
                    <option value="Thứ Ba">Thứ Ba</option>
                    <option value="Thứ Tư">Thứ Tư</option>
                    <option value="Thứ Năm">Thứ Năm</option>
                    <option value="Thứ Sáu">Thứ Sáu</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Định lượng năng lượng (Kcal)
                  </label>
                  <input
                    type="number"
                    value={editingMenuRecord.caloriesKcal}
                    onChange={(e) =>
                      setEditingMenuRecord({
                        ...editingMenuRecord,
                        caloriesKcal: Number(e.target.value)
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Món mặn chính</label>
                <input
                  type="text"
                  required
                  value={editingMenuRecord.lunchMainDish}
                  onChange={(e) =>
                    setEditingMenuRecord({ ...editingMenuRecord, lunchMainDish: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Món xào / luộc</label>
                  <input
                    type="text"
                    required
                    value={editingMenuRecord.lunchSideDish}
                    onChange={(e) =>
                      setEditingMenuRecord({ ...editingMenuRecord, lunchSideDish: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Món canh</label>
                  <input
                    type="text"
                    required
                    value={editingMenuRecord.lunchSoup}
                    onChange={(e) =>
                      setEditingMenuRecord({ ...editingMenuRecord, lunchSoup: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bữa phụ xế chiều</label>
                <input
                  type="text"
                  required
                  value={editingMenuRecord.afternoonSnack}
                  onChange={(e) =>
                    setEditingMenuRecord({ ...editingMenuRecord, afternoonSnack: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <span className="font-bold text-emerald-950 block">Kiểm thực 3 bước (QĐ 1246/QĐ-BYT):</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-emerald-800 font-bold block mb-1">B1. Nhập liệu</span>
                    <select
                      value={editingMenuRecord.step1InputCheck}
                      onChange={(e) =>
                        setEditingMenuRecord({
                          ...editingMenuRecord,
                          step1InputCheck: e.target.value as 'DAT' | 'KHONG_DAT'
                        })
                      }
                      className="w-full p-1.5 bg-white border border-emerald-300 rounded font-semibold text-[11px]"
                    >
                      <option value="DAT">ĐẠT</option>
                      <option value="KHONG_DAT">K. ĐẠT</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-800 font-bold block mb-1">B2. Chế biến</span>
                    <select
                      value={editingMenuRecord.step2ProcessingCheck}
                      onChange={(e) =>
                        setEditingMenuRecord({
                          ...editingMenuRecord,
                          step2ProcessingCheck: e.target.value as 'DAT' | 'KHONG_DAT'
                        })
                      }
                      className="w-full p-1.5 bg-white border border-emerald-300 rounded font-semibold text-[11px]"
                    >
                      <option value="DAT">ĐẠT</option>
                      <option value="KHONG_DAT">K. ĐẠT</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-800 font-bold block mb-1">B3. Lưu mẫu 24h</span>
                    <select
                      value={editingMenuRecord.step3SampleSaved}
                      onChange={(e) =>
                        setEditingMenuRecord({
                          ...editingMenuRecord,
                          step3SampleSaved: e.target.value as 'DA_LUU_MAU_24H' | 'CHUA_LUU'
                        })
                      }
                      className="w-full p-1.5 bg-white border border-emerald-300 rounded font-semibold text-[11px]"
                    >
                      <option value="DA_LUU_MAU_24H">ĐÃ LƯU 24H</option>
                      <option value="CHUA_LUU">CHƯA LƯU</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMenuRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Ký Số & Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
