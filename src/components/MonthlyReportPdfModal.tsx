/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  X,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Award,
  BookOpen,
  FileCheck2
} from 'lucide-react';
import {
  UserProfile,
  LessonRecord,
  StudentTT27Record
} from '../types/edtech';
import {
  compileMonthlyReportData,
  MonthlyReportSummary
} from '../utils/edtech_logic';
import { exportMinistryMonthlyPdf } from '../utils/pdf_exporter';

interface MonthlyReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  lessons: LessonRecord[];
  tt27Records: StudentTT27Record[];
}

export const MonthlyReportPdfModal: React.FC<MonthlyReportPdfModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lessons,
  tt27Records
}) => {
  const [monthLabel, setMonthLabel] = useState<string>('Tháng 11/2024');
  const [termLabel, setTermLabel] = useState<string>('Giữa Học kỳ I');
  const [customEvaluation, setCustomEvaluation] = useState<string>('');
  const [customNextPlan, setCustomNextPlan] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<{
    filename: string;
    pageCount: number;
    reportCode: string;
    byteSize: number;
  } | null>(null);

  // Compute live summary from current TT27 records and Sổ đầu bài lessons
  const baseSummary: MonthlyReportSummary = useMemo(() => {
    return compileMonthlyReportData({
      user: currentUser,
      lessons,
      tt27Records,
      monthLabel,
      termLabel
    });
  }, [currentUser, lessons, tt27Records, monthLabel, termLabel]);

  // Sync editable text areas whenever month/term or underlying records change
  useEffect(() => {
    setCustomEvaluation(baseSummary.generalEvaluation);
    setCustomNextPlan(baseSummary.nextMonthPlan);
    setExportResult(null);
  }, [baseSummary.generalEvaluation, baseSummary.nextMonthPlan]);

  if (!isOpen) return null;

  const finalSummary: MonthlyReportSummary = {
    ...baseSummary,
    generalEvaluation: customEvaluation || baseSummary.generalEvaluation,
    nextMonthPlan: customNextPlan || baseSummary.nextMonthPlan
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportResult(null);
    try {
      const res = await exportMinistryMonthlyPdf(finalSummary, lessons, tt27Records);
      setExportResult(res);
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const dateObj = new Date(finalSummary.generatedAt);
  const dayStr = String(dateObj.getDate()).padStart(2, '0');
  const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yearStr = dateObj.getFullYear();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-950 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Xuất Báo Cáo Tổng Kết Tháng Chuẩn Bộ GD&ĐT (PDF)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                  Nghị định 30/2020/NĐ-CP • TT27 & TT28
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Tự động tổng hợp dữ liệu thực tế từ Sổ theo dõi Thông tư 27 ({tt27Records.length} học sinh) và Sổ đầu bài điện tử ({lessons.length} tiết dạy)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ xuất báo cáo PDF"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Export Banner */}
        {exportResult && (
          <div className="bg-emerald-600 text-white px-6 py-3 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-300" />
              <span>
                Đã kết xuất và tải xuống thành công tệp PDF chuẩn Bộ GD&ĐT:{' '}
                <strong className="underline">{exportResult.filename}</strong> ({exportResult.pageCount} trang A4 •{' '}
                {Math.round(exportResult.byteSize / 1024)} KB • Mã báo cáo: {exportResult.reportCode}/BC-BGD)
              </span>
            </div>
            <span className="font-mono text-[11px] bg-emerald-800 px-2.5 py-0.5 rounded">
              SmartCA: {finalSummary.signatureHash}
            </span>
          </div>
        )}

        {/* Main Body: Left Controls + Right A4 Official Document Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Report Parameters & Editable Conclusions (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5 text-xs">
              <div className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span>1. Tham Số Kỳ Báo Cáo</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEvaluation(baseSummary.generalEvaluation);
                    setCustomNextPlan(baseSummary.nextMonthPlan);
                  }}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Tổng hợp lại
                </button>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Tháng báo cáo tổng kết
                </label>
                <select
                  aria-label="Chọn tháng báo cáo"
                  value={monthLabel}
                  onChange={(e) => setMonthLabel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="Tháng 9/2024">Tháng 9/2024</option>
                  <option value="Tháng 10/2024">Tháng 10/2024</option>
                  <option value="Tháng 11/2024">Tháng 11/2024</option>
                  <option value="Tháng 12/2024">Tháng 12/2024</option>
                  <option value="Tháng 1/2025">Tháng 1/2025</option>
                  <option value="Tháng 2/2025">Tháng 2/2025</option>
                  <option value="Tháng 3/2025">Tháng 3/2025</option>
                  <option value="Tháng 4/2025">Tháng 4/2025</option>
                  <option value="Tháng 5/2025">Tháng 5/2025</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Giai đoạn đánh giá Thông tư 27
                </label>
                <select
                  aria-label="Chọn giai đoạn đánh giá TT27"
                  value={termLabel}
                  onChange={(e) => setTermLabel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="Giữa Học kỳ I">Giữa Học kỳ I</option>
                  <option value="Cuối Học kỳ I">Cuối Học kỳ I</option>
                  <option value="Giữa Học kỳ II">Giữa Học kỳ II</option>
                  <option value="Cuối Năm Học">Cuối Năm Học</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Đánh giá chung trong tháng (Mục IV.1)
                </label>
                <textarea
                  rows={5}
                  value={customEvaluation}
                  onChange={(e) => setCustomEvaluation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Phương hướng nhiệm vụ tháng tới (Mục IV.2)
                </label>
                <textarea
                  rows={4}
                  value={customNextPlan}
                  onChange={(e) => setCustomNextPlan(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Data Source Verification Box */}
            <div className="bg-blue-950 text-white rounded-xl p-4 space-y-2.5 text-xs shadow-sm">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Xác Thực Nguồn Dữ Liệu Kết Xuất</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-blue-100">
                <div className="flex justify-between">
                  <span>• Dữ liệu Sổ đầu bài điện tử:</span>
                  <strong className="text-white">{finalSummary.lessonStats.totalLessons} tiết học</strong>
                </div>
                <div className="flex justify-between">
                  <span>• Tỷ lệ ký số SmartCA:</span>
                  <strong className="text-emerald-300">{finalSummary.lessonStats.signedRatePercent}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>• Dữ liệu Học sinh TT27:</span>
                  <strong className="text-white">{finalSummary.tt27Stats.totalStudents} hồ sơ</strong>
                </div>
                <div className="flex justify-between">
                  <span>• Mã văn bản hành chính:</span>
                  <strong className="font-mono text-amber-300">{finalSummary.reportCode}/BC-BGD</strong>
                </div>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportPdf}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isExporting
                  ? 'Đang khởi tạo tệp PDF chuẩn Bộ GD&ĐT...'
                  : 'Tải Xuống Báo Cáo PDF Chuẩn Bộ GD&ĐT (.pdf)'}
              </button>
            </div>
          </div>

          {/* Right Column: Live A4 Official Ministry Preview (8 cols) */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl border-2 border-slate-300 shadow-lg p-6 sm:p-10 text-slate-900 font-serif space-y-6">
              {/* Official National Header (Nghị định 30/2020/NĐ-CP) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-center border-b border-slate-200 pb-4">
                <div className="sm:col-span-5 space-y-0.5">
                  <div className="text-xs font-bold uppercase text-slate-700">
                    {finalSummary.district || 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO'}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold uppercase text-slate-900">
                    {finalSummary.schoolName}
                  </div>
                  <div className="w-24 h-0.5 bg-slate-800 mx-auto my-1"></div>
                  <div className="text-[11px] italic text-slate-600">
                    Số: {finalSummary.reportCode}/BC-BGD
                  </div>
                </div>

                <div className="sm:col-span-7 space-y-0.5">
                  <div className="text-xs sm:text-sm font-extrabold uppercase text-slate-900">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="w-36 h-0.5 bg-slate-800 mx-auto my-1"></div>
                  <div className="text-[11px] italic text-slate-600">
                    {finalSummary.district || 'Địa phương'}, ngày {dayStr} tháng {monthStr} năm {yearStr}
                  </div>
                </div>
              </div>

              {/* Report Title */}
              <div className="text-center space-y-1">
                <h2 className="text-lg sm:text-xl font-extrabold text-blue-950 uppercase tracking-tight">
                  BÁO CÁO TỔNG KẾT CÔNG TÁC GIÁO DỤC {finalSummary.monthLabel.toUpperCase()}
                </h2>
                <p className="text-xs font-bold text-slate-700">
                  (Tích hợp Dữ liệu Đánh giá Học sinh theo Thông tư 27/2020/TT-BGDĐT & Sổ Đầu Bài Điện Tử)
                </p>
                <p className="text-xs italic text-slate-600">
                  Năm học: {finalSummary.schoolYear} • Lớp/Đơn vị: {finalSummary.className} • Kỳ đánh giá: {finalSummary.termLabel}
                </p>
              </div>

              {/* Section I: General Info */}
              <div className="space-y-2 text-xs">
                <h4 className="font-extrabold text-slate-900 uppercase">
                  I. Thông tin chung về đơn vị & cán bộ lập báo cáo
                </h4>
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans text-xs">
                  <div>
                    <span className="text-slate-500">Đơn vị trường:</span>{' '}
                    <strong className="text-slate-900">{finalSummary.schoolName}</strong> (Mã: {finalSummary.schoolCode})
                  </div>
                  <div>
                    <span className="text-slate-500">Lớp / Khối phụ trách:</span>{' '}
                    <strong className="text-slate-900">{finalSummary.className}</strong> ({finalSummary.tt27Stats.totalStudents} học sinh)
                  </div>
                  <div>
                    <span className="text-slate-500">Người lập báo cáo:</span>{' '}
                    <strong className="text-slate-900">{finalSummary.teacherName}</strong> ({finalSummary.teacherTitle})
                  </div>
                  <div>
                    <span className="text-slate-500">Chứng thư số:</span>{' '}
                    <strong className="font-mono text-blue-800">{finalSummary.signatureCertId}</strong>
                  </div>
                </div>
              </div>

              {/* Section II: Sổ Đầu Bài Điện Tử */}
              <div className="space-y-2.5 text-xs">
                <h4 className="font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-blue-800" />
                  II. Tổng hợp kỷ cương Sổ đầu bài điện tử (Thông tư 28/2020/TT-BGDĐT)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-sans">
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] text-blue-800 font-semibold">Tổng số tiết dạy</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {finalSummary.lessonStats.totalLessons} tiết
                    </div>
                  </div>
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] text-blue-800 font-semibold">Tỷ lệ ký số SmartCA</div>
                    <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                      {finalSummary.lessonStats.signedLessons}/{finalSummary.lessonStats.totalLessons} ({finalSummary.lessonStats.signedRatePercent}%)
                    </div>
                  </div>
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] text-blue-800 font-semibold">Điểm tiết dạy TB</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {finalSummary.lessonStats.averageLessonScore}/10
                    </div>
                  </div>
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] text-blue-800 font-semibold">Chuyên cần TB</div>
                    <div className="text-base font-extrabold text-indigo-800 mt-0.5">
                      {finalSummary.lessonStats.averageAttendancePercent}%
                    </div>
                  </div>
                </div>

                {/* Lesson Table */}
                <div className="overflow-x-auto font-sans">
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Tiết / Thứ</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Môn học</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Tên bài dạy</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Sĩ số</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Xếp loại / Điểm</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Trạng thái ký số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lessons.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border border-slate-300 px-3 py-3 text-center italic text-slate-500">
                            Chưa có dữ liệu tiết dạy trong Sổ đầu bài điện tử.
                          </td>
                        </tr>
                      ) : (
                        lessons.slice(0, 5).map((les) => (
                          <tr key={les.id} className="hover:bg-slate-50">
                            <td className="border border-slate-300 px-2 py-1.5 font-semibold">
                              Tiết {les.period} ({les.dayOfWeek})
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5">{les.subject}</td>
                            <td className="border border-slate-300 px-2 py-1.5">{les.lessonName}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center">
                              {les.attendedStudents}/{les.totalStudents}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">
                              {les.classDisciplineRank} ({les.score}đ)
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center">
                              {les.approvalStatus === 'DA_DUYET_BGH' ? (
                                <span className="text-emerald-700 font-bold">BGH đã duyệt</span>
                              ) : les.approvalStatus === 'DA_KY_GV' ? (
                                <span className="text-blue-700 font-bold">GV đã ký số</span>
                              ) : (
                                <span className="text-amber-700 font-semibold">Chờ ký số</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section III: Tổng hợp Đánh giá TT27 */}
              <div className="space-y-2.5 text-xs">
                <h4 className="font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  III. Tổng hợp kết quả đánh giá học sinh theo Thông tư 27/2020/TT-BGDĐT (Mẫu 01/TT27)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-sans">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] text-emerald-800 font-semibold">Học sinh Xuất sắc</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {finalSummary.tt27Stats.xuatSacCount} HS ({finalSummary.tt27Stats.xuatSacPercent}%)
                    </div>
                  </div>
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] text-emerald-800 font-semibold">Học sinh Tiêu biểu</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {finalSummary.tt27Stats.tieuBieuCount} HS ({finalSummary.tt27Stats.tieuBieuPercent}%)
                    </div>
                  </div>
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] text-emerald-800 font-semibold">Hoàn thành CT</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {finalSummary.tt27Stats.hoanThanhCount} HS ({finalSummary.tt27Stats.hoanThanhPercent}%)
                    </div>
                  </div>
                  <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] text-amber-800 font-semibold">Cần rèn luyện (C)</div>
                    <div className="text-base font-extrabold text-amber-900 mt-0.5">
                      {finalSummary.tt27Stats.chuaHoanThanhCount} HS ({finalSummary.tt27Stats.chuaHoanThanhPercent}%)
                    </div>
                  </div>
                </div>

                {/* Subject Evaluation Breakdown Table */}
                <div className="overflow-x-auto font-sans">
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 px-2.5 py-1.5 text-left">Môn học / Hoạt động GD</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Hoàn thành tốt (T)</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Hoàn thành (H)</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Chưa hoàn thành (C)</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Điểm KTĐK TB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalSummary.tt27Stats.subjectStats.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="border border-slate-300 px-3 py-3 text-center italic text-slate-500">
                            Chưa có dữ liệu đánh giá học sinh theo Thông tư 27 trong kỳ này.
                          </td>
                        </tr>
                      ) : (
                        finalSummary.tt27Stats.subjectStats.map((sub) => (
                          <tr key={sub.subjectId} className="hover:bg-slate-50">
                            <td className="border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-900">
                              {sub.subjectName}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-emerald-700">
                              {sub.countT} HS
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-blue-700">
                              {sub.countH} HS
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-rose-700">
                              {sub.countC} HS
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-800">
                              {sub.averageScore !== null ? `${sub.averageScore} điểm` : 'Nhận xét'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-sans text-[11px] text-slate-700">
                  <span>
                    • Tỷ lệ <strong>5 Phẩm chất chủ yếu</strong> đạt mức Tốt (T):{' '}
                    <strong className="text-emerald-700">{finalSummary.tt27Stats.qualitiesGoodRatePercent}%</strong>
                  </span>
                  <span>
                    • Tỷ lệ <strong>6 Năng lực cốt lõi</strong> đạt mức Tốt (T):{' '}
                    <strong className="text-blue-700">{finalSummary.tt27Stats.competenciesGoodRatePercent}%</strong>
                  </span>
                </div>
              </div>

              {/* Section IV: General Evaluation & Next Month Plan */}
              <div className="space-y-2 text-xs">
                <h4 className="font-extrabold text-slate-900 uppercase">
                  IV. Đánh giá chung trong tháng & phương hướng nhiệm vụ tháng tới
                </h4>
                <p className="text-slate-800 leading-relaxed whitespace-pre-line font-sans text-xs">
                  {finalSummary.generalEvaluation}
                </p>
                <div className="pt-1 font-sans text-xs">
                  <div className="font-bold text-slate-900 mb-1">Phương hướng trọng tâm tháng tới:</div>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                    {finalSummary.nextMonthPlan}
                  </p>
                </div>
              </div>

              {/* Official Signatures & SmartCA Digital Seal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-center text-xs">
                <div className="space-y-2">
                  <div className="font-extrabold uppercase text-slate-900">
                    XÁC NHẬN CỦA BAN GIÁM HIỆU
                  </div>
                  <div className="text-[11px] italic text-slate-500">
                    (Ký duyệt điện tử và đóng dấu nhà trường)
                  </div>
                  <div className="mx-auto max-w-[230px] border-2 border-red-600/80 bg-red-50/40 rounded-lg p-2.5 text-red-700 font-sans">
                    <div className="font-extrabold text-[11px] uppercase">
                      ĐÃ KIỂM TRA HỒ SƠ ĐIỆN TỬ
                    </div>
                    <div className="text-[11px] font-bold mt-0.5 uppercase">
                      {finalSummary.schoolName}
                    </div>
                    <div className="text-[10px] text-red-600 mt-0.5">
                      Mã định danh Bộ GD&ĐT: {finalSummary.schoolCode}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-extrabold uppercase text-slate-900">
                    NGƯỜI LẬP BÁO CÁO (GIÁO VIÊN)
                  </div>
                  <div className="text-[11px] italic text-slate-500">
                    (Đã ký số SmartCA theo Thông tư 28/2020/TT-BGDĐT)
                  </div>
                  <div className="mx-auto max-w-[260px] border-2 border-emerald-600 bg-emerald-50/50 rounded-lg p-2.5 text-emerald-800 font-sans">
                    <div className="font-extrabold text-[11px] uppercase flex items-center justify-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      KÝ SỐ BỞI: {finalSummary.teacherName}
                    </div>
                    <div className="text-[10px] font-mono mt-0.5">
                      Chứng thư: {finalSummary.signatureCertId}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-700 mt-0.5">
                      Hash: {finalSummary.signatureHash}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 pt-1">{finalSummary.teacherName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Tệp PDF xuất ra tuân thủ quy chuẩn trình bày văn bản hành chính (Nghị định 30/2020/NĐ-CP) và mẫu biểu Thông tư 27/2020/TT-BGDĐT.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportPdf}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Tải Xuống Báo Cáo PDF Chuẩn Bộ GD&ĐT (.pdf)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
