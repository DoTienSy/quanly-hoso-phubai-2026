/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileCheck2,
  Users,
  Award,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  School,
  Settings,
  Plus
} from 'lucide-react';
import {
  UserProfile,
  LessonRecord,
  StudentProfile,
  StudentTT27Record,
  EmulationScoreItem
} from '../types/edtech';
import { AISmartReportSection } from './AISmartReportSection';

interface DashboardOverviewProps {
  currentUser: UserProfile;
  lessons: LessonRecord[];
  students: StudentProfile[];
  tt27Records: StudentTT27Record[];
  emulationScores: EmulationScoreItem[];
  onNavigateTab: (tab: string) => void;
  onQuickSign: (lessonId: string) => void;
  onOpenSettings: () => void;
  onOpenMonthlyReport: () => void;
  onOpenAiTemplateImport: () => void;
  onSeedAnalyticsSample: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  lessons,
  students,
  tt27Records,
  emulationScores,
  onNavigateTab,
  onQuickSign,
  onOpenSettings,
  onOpenMonthlyReport,
  onOpenAiTemplateImport,
  onSeedAnalyticsSample
}) => {
  const signedLessonsCount = lessons.filter(l => l.approvalStatus !== 'CHUA_KY').length;
  const pendingLessons = lessons.filter(l => l.approvalStatus === 'CHUA_KY');
  const signedPercent = lessons.length > 0 ? Math.round((signedLessonsCount / lessons.length) * 100) : 0;

  const presentStudentsCount = students.filter(s => s.todayAttendance === 'CO_MAT').length;
  const attendancePercent =
    students.length > 0 ? Math.round((presentStudentsCount / students.length) * 1000) / 10 : 0;

  const xuatSacCount = tt27Records.filter(r => r.finalAward === 'XUAT_SAC').length;
  const tieuBieuCount = tt27Records.filter(r => r.finalAward === 'TIEU_BIEU').length;
  const topEmulation = emulationScores[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-300/30">
              <School className="w-3.5 h-3.5" />
              {currentUser.schoolName} • Năm học {currentUser.schoolYear || '2024 - 2025'} • Tuần {currentUser.currentWeek || 1}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Xin chào, {currentUser.name}!
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Chức danh: <strong className="text-white">{currentUser.title}</strong> ({currentUser.className || 'Toàn trường'}). Hệ thống Hồ sơ Điện tử đã kết nối tài khoản Gmail của Thầy/Cô và hỗ trợ AI gợi ý nhận xét học sinh cá nhân hóa chuẩn Thông tư 27/2020/TT-BGDĐT.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/20 shadow-sm transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-300" />
              Sửa Thông Tin Chung
            </button>
            <button
              type="button"
              onClick={onOpenAiTemplateImport}
              className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tải File Hồ Sơ Mẫu (AI)
            </button>
            <button
              type="button"
              onClick={onOpenMonthlyReport}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              Xuất Báo Cáo Tổng Kết Tháng (PDF)
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('THEO_DOI_TT27')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              AI Nhận Xét Học Sinh TT27
            </button>
          </div>
        </div>
      </div>

      {/* 4 Real-Time KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Đánh giá TT27 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hồ Sơ Đánh Giá TT27</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{tt27Records.length}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Học sinh</span>
          </div>
          <div className="mt-3 text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Học sinh Xuất sắc:</span>
              <strong className="text-slate-900">{xuatSacCount} HS</strong>
            </div>
            <div className="flex justify-between">
              <span>Học sinh Tiêu biểu:</span>
              <strong className="text-slate-900">{tieuBieuCount} HS</strong>
            </div>
          </div>
          <div
            onClick={() => onNavigateTab('THEO_DOI_TT27')}
            className="mt-3 flex items-center text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            Mở Sổ Đánh Giá & Gợi Ý AI <ChevronRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* KPI 2: Sổ Chủ Nhiệm */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sĩ Số & Chuyên Cần</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {students.length > 0 ? `${attendancePercent}%` : '0 HS'}
            </span>
            <span className="text-xs font-semibold text-indigo-600">
              {currentUser.className || 'Lớp chủ nhiệm'}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Có mặt: <strong className="text-slate-900">{presentStudentsCount}</strong> / {students.length} học sinh trong danh sách lớp.
          </p>
          <div
            onClick={() => onNavigateTab('SO_CHU_NHIEM')}
            className="mt-3 flex items-center text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
          >
            Quản lý học sinh & điểm danh <ChevronRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* KPI 3: Sổ Đầu Bài */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tiến Độ Ký Sổ Đầu Bài</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{signedPercent}%</span>
            <span className="text-xs font-semibold text-blue-600">
              {signedLessonsCount}/{lessons.length} tiết
            </span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${signedPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
              <span>Đã ký: {signedLessonsCount} tiết</span>
              <span className="text-amber-600 font-medium">Chờ ký: {pendingLessons.length}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Thi Đua */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Thi Đua Nề Nếp Tuần</span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {topEmulation ? topEmulation.className : 'Chưa chấm'}
            </span>
            {topEmulation && (
              <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                {topEmulation.totalScore}đ
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-600">
            {topEmulation
              ? `Dẫn đầu thi đua tuần ${currentUser.currentWeek || 1} với ${topEmulation.totalScore} điểm.`
              : `Đang theo dõi ${emulationScores.length} lớp học trong tuần ${currentUser.currentWeek || 1}.`}
          </p>
          <div
            onClick={() => onNavigateTab('THI_DUA')}
            className="mt-3 flex items-center text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
          >
            Mở bảng chấm thi đua tuần <ChevronRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>
      </div>

      {/* AI Smart Learning Trend & Early Special-Support Detection Report (Firestore Real-Time) */}
      <AISmartReportSection
        currentUser={currentUser}
        tt27Records={tt27Records}
        lessons={lessons}
        onNavigateTab={onNavigateTab}
        onSeedAnalyticsSample={onSeedAnalyticsSample}
        onOpenAiTemplateImport={onOpenAiTemplateImport}
      />

      {/* Main Grid: Sổ Đầu Bài & Trợ Lý AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sổ Đầu Bài Cần Ký Duyệt */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-600" />
                Sổ Đầu Bài Điện Tử (Tuần {currentUser.currentWeek || 1})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ký số xác thực danh tính giáo viên theo quy định Thông tư 28/2020/TT-BGDĐT
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('SO_DAU_BAI')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              Quản lý Sổ đầu bài <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {lessons.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Chưa có tiết học nào được ghi nhận trong Sổ đầu bài tuần này.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('SO_DAU_BAI')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm Tiết Học Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {lessons.slice(0, 5).map((lesson) => (
                <div key={lesson.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{lesson.dayOfWeek.replace('Thứ ', 'T')}</span>
                      <span className="text-xs font-extrabold text-slate-900">P.{lesson.period}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                          {lesson.subject}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{lesson.className}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">GV: {lesson.teacherName}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 mt-1 line-clamp-1">
                        {lesson.lessonName}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Sĩ số: {lesson.attendedStudents}/{lesson.totalStudents} • Xếp loại tiết: <strong className="text-emerald-700">{lesson.classDisciplineRank}</strong> ({lesson.score}đ)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {lesson.approvalStatus === 'DA_DUYET_BGH' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        BGH Đã Duyệt
                      </span>
                    ) : lesson.approvalStatus === 'DA_KY_GV' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        GV Đã Ký Số
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onQuickSign(lesson.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        Ký SmartCA ngay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: AI Pro Hub Shortcut */}
        <div className="space-y-6">
          <div className="bg-linear-to-br from-purple-900 to-indigo-900 rounded-xl p-5 text-white shadow-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
              <Sparkles className="w-4 h-4" />
              Trợ Lý AI Sư Phạm Chuẩn TT27
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Tự động gợi ý nhận xét cá nhân hóa
            </h3>
            <p className="text-xs text-purple-200 mt-1 leading-relaxed">
              Tổng hợp đồng thời Kết quả học tập (Mức T/H/C & Điểm KTĐK), 5 Phẩm chất chủ yếu và 6 Năng lực cốt lõi để tạo nhận xét riêng biệt cho từng học sinh.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('THEO_DOI_TT27')}
                className="w-full py-2.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs text-center transition-all shadow-xs cursor-pointer"
              >
                Mở Sổ Đánh Giá & Gợi Ý Nhận Xét AI
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('AI_PRO_HUB')}
                className="w-full py-2 px-3 rounded-lg bg-white/15 hover:bg-white/20 text-white font-medium text-xs text-left flex items-center justify-between border border-white/20 transition-all cursor-pointer"
              >
                <span>Cố vấn Sư phạm & Số hóa OCR</span>
                <ChevronRight className="w-3.5 h-3.5 text-purple-200" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
