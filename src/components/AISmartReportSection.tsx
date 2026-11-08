/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Database,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  UserCheck,
  BookOpen,
  ShieldAlert,
  BarChart3,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  UserProfile,
  StudentTT27Record,
  LessonRecord,
  AISmartDashboardReport
} from '../types/edtech';
import { analyzeLearningTrendsFromTT27 } from '../utils/edtech_logic';

interface AISmartReportSectionProps {
  currentUser: UserProfile;
  tt27Records: StudentTT27Record[];
  lessons: LessonRecord[];
  onNavigateTab: (tab: string) => void;
  onSeedAnalyticsSample: () => void;
  onOpenAiTemplateImport: () => void;
}

export const AISmartReportSection: React.FC<AISmartReportSectionProps> = ({
  currentUser,
  tt27Records,
  lessons,
  onNavigateTab,
  onSeedAnalyticsSample,
  onOpenAiTemplateImport
}) => {
  const [chartTab, setChartTab] = useState<'SUBJECT_TREND' | 'COMPETENCY_QUALITY'>('SUBJECT_TREND');
  const [supportFilter, setSupportFilter] = useState<'ALL' | 'CAO' | 'TRUNG_BINH'>('ALL');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiEnhancedOverride, setAiEnhancedOverride] = useState<{
    recordCount: number;
    executiveAiSummary: string;
    keyPedagogicalRecommendations: string[];
  } | null>(null);

  const baseReport: AISmartDashboardReport = useMemo(() => {
    return analyzeLearningTrendsFromTT27({
      tt27Records,
      lessons,
      currentWeek: currentUser.currentWeek || 10,
      className: currentUser.className || 'Lớp 4A',
      ownerUid: currentUser.id
    });
  }, [tt27Records, lessons, currentUser.currentWeek, currentUser.className, currentUser.id]);

  const report: AISmartDashboardReport = useMemo(() => {
    if (aiEnhancedOverride && aiEnhancedOverride.recordCount === tt27Records.length) {
      return {
        ...baseReport,
        dataSource: 'GEMINI_AI_ENHANCED',
        executiveAiSummary: aiEnhancedOverride.executiveAiSummary,
        keyPedagogicalRecommendations: aiEnhancedOverride.keyPedagogicalRecommendations
      };
    }
    return baseReport;
  }, [baseReport, aiEnhancedOverride, tt27Records.length]);

  const handleRunDeepAiAnalysis = async () => {
    setIsAnalyzingAi(true);
    try {
      const res = await fetch('/api/ai/smart-dashboard-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tt27Records,
          lessons,
          currentWeek: currentUser.currentWeek || 10,
          className: currentUser.className || 'Lớp 4A',
          schoolName: currentUser.schoolName || 'Trường Tiểu học Phú Bài',
          ownerUid: currentUser.id
        })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setAiEnhancedOverride({
          recordCount: tt27Records.length,
          executiveAiSummary: data.report.executiveAiSummary,
          keyPedagogicalRecommendations: data.report.keyPedagogicalRecommendations
        });
      }
    } catch (err) {
      console.warn('Deep AI analysis warning:', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const filteredSupportStudents = useMemo(() => {
    if (supportFilter === 'ALL') return report.specialSupportStudents;
    return report.specialSupportStudents.filter((s) => s.priorityLevel === supportFilter);
  }, [report.specialSupportStudents, supportFilter]);

  // SVG Chart Geometry Helper (viewBox: 0 0 640 230)
  // Y-axis maps score 4.0 -> 10.0 to y: 185 -> 30
  const scoreToY = (score: number) => {
    const clamped = Math.min(10, Math.max(4, score || 4));
    const ratio = (clamped - 4) / 6; // 0..1
    return Math.round(185 - ratio * 150);
  };

  const milestoneX = (index: number) => {
    const xs = [85, 245, 405, 560];
    return xs[index] ?? 85;
  };

  const buildPolylinePoints = (key: 'toanAvg' | 'tiengVietAvg' | 'tiengAnhAvg' | 'overallAvg') => {
    return report.trendMilestones
      .map((m, idx) => `${milestoneX(idx)},${scoreToY(m[key])}`)
      .join(' ');
  };

  const buildAreaPath = (key: 'overallAvg') => {
    if (report.trendMilestones.length === 0) return '';
    const pts = report.trendMilestones.map((m, idx) => `${milestoneX(idx)},${scoreToY(m[key])}`);
    const firstX = milestoneX(0);
    const lastX = milestoneX(report.trendMilestones.length - 1);
    return `M ${firstX},185 L ${pts.join(' L ')} L ${lastX},185 Z`;
  };

  return (
    <section
      aria-label="Báo cáo thông minh AI phân tích xu hướng học tập"
      className="bg-white rounded-2xl border border-indigo-200/80 shadow-xs overflow-hidden"
    >
      {/* Top Header Bar */}
      <div className="bg-linear-to-r from-indigo-950 via-blue-950 to-slate-900 px-6 py-5 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Báo Cáo Thông Minh AI • Chuẩn Thông Tư 27/2020/TT-BGDĐT
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold">
              <Database className="w-3 h-3" />
              Đồng bộ Firestore: {report.totalStudentsAnalyzed} hồ sơ học sinh
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400 shrink-0" />
            Phân Tích Xu Hướng Học Tập & Phát Hiện Sớm Học Sinh Cần Hỗ Trợ Đặc Biệt
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Tự động tổng hợp dữ liệu đánh giá thường xuyên và định kỳ từ Firestore để biểu diễn đồ thị xu hướng tiến bộ, dự báo kết quả cuối kỳ và sàng lọc nhóm học sinh cần kế hoạch phụ đạo cá nhân hóa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onSeedAnalyticsSample}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            Nạp Dữ Liệu Phân Tích Đa Nhóm (T/H/C)
          </button>

          <button
            type="button"
            onClick={handleRunDeepAiAnalysis}
            disabled={isAnalyzingAi}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
            {isAnalyzingAi ? 'AI Đang Phân Tích...' : 'Phân Tích Chuyên Sâu Bằng AI'}
          </button>
        </div>
      </div>

      {/* Empty State Banner when 0 TT27 Records in Firestore */}
      {report.totalStudentsAnalyzed === 0 ? (
        <div className="p-8 text-center bg-slate-50/70 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900">
              Chưa có hồ sơ đánh giá Thông tư 27 trên Firestore để phân tích xu hướng
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hãy nhấn <strong>&quot;Nạp Dữ Liệu Phân Tích Đa Nhóm (T/H/C)&quot;</strong> để khởi tạo 6 hồ sơ học sinh thực nghiệm (gồm cả nhóm Xuất sắc, Tiêu biểu và Cần hỗ trợ đặc biệt) đồng bộ vào Firestore, hoặc tải file danh sách lớp từ máy tính.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onSeedAnalyticsSample}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Nạp Dữ Liệu Phân Tích Đa Nhóm (6 HS Đủ Mức T/H/C)
            </button>
            <button
              type="button"
              onClick={onOpenAiTemplateImport}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 inline-flex items-center gap-2 cursor-pointer"
            >
              Tải File Hồ Sơ Mẫu (AI)
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* 4 Smart Analytics Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl p-4 bg-blue-50/60 border border-blue-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span>ĐIỂM ĐỊNH KỲ TB LỚP</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {report.overallAverageScore}/10
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Dự báo cuối kỳ: {report.trendMilestones[3]?.overallAvg ?? report.overallAverageScore}đ
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600">
                Xu hướng chung: <strong className="text-blue-900">{report.trendDirectionLabel}</strong>
              </p>
            </div>

            <div className="rounded-xl p-4 bg-emerald-50/60 border border-emerald-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>TỶ LỆ HOÀN THÀNH TỐT (T)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-800">
                  {report.overallMasteryRateT}%
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  Hoàn thành (H): {report.overallSatisfactoryRateH}%
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600">
                Tỷ lệ Chưa hoàn thành (Mức C): <strong className="text-rose-600">{report.overallNeedSupportRateC}%</strong>
              </p>
            </div>

            <div className="rounded-xl p-4 bg-rose-50/70 border border-rose-200">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span>CẦN HỖ TRỢ ĐẶC BIỆT (MỨC C)</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-700">
                  {report.specialSupportHighCount} HS
                </span>
                <span className="text-[11px] font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">
                  Ưu tiên phụ đạo ngay
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-rose-800">
                Có môn đạt mức C hoặc điểm KTĐK dưới 6.0 điểm.
              </p>
            </div>

            <div className="rounded-xl p-4 bg-amber-50/70 border border-amber-200">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>NHÓM CẦN CỦNG CỐ THÊM</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-800">
                  {report.specialSupportMediumCount} HS
                </span>
                <span className="text-[11px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                  Theo dõi sát sao
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-amber-900">
                Điểm định kỳ 6.0–6.9đ hoặc năng lực/phẩm chất cần rèn thêm.
              </p>
            </div>
          </div>

          {/* Main 2-Column Layout: Left = Trend Charts, Right = Special Support Student Detection */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (7 cols): Interactive Trend Chart + Subject/Competency Breakdown */}
            <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Biểu Đồ Xu Hướng Học Tập & Phân Bổ Mức Đạt (TT27)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Theo dõi tiến trình từ Đầu kỳ, Giữa kỳ, Hiện tại đến Dự báo AI Cuối kỳ
                  </p>
                </div>

                <div className="inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setChartTab('SUBJECT_TREND')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      chartTab === 'SUBJECT_TREND'
                        ? 'bg-white text-indigo-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Xu hướng Điểm & Môn học
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartTab('COMPETENCY_QUALITY')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      chartTab === 'COMPETENCY_QUALITY'
                        ? 'bg-white text-indigo-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    5 Phẩm chất & 6 Năng lực
                  </button>
                </div>
              </div>

              {chartTab === 'SUBJECT_TREND' ? (
                <div className="space-y-5">
                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-blue-700">
                        <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                        Môn Toán
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                        <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
                        Môn Tiếng Việt
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-purple-700">
                        <span className="w-3 h-3 rounded-full bg-purple-600 inline-block"></span>
                        Môn Tiếng Anh
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                        <span className="w-3 h-1 bg-amber-500 inline-block"></span>
                        ĐTB Toàn Lớp
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Vùng nét đứt: Dự báo AI sau phụ đạo
                    </span>
                  </div>

                  {/* SVG Multi-Line Learning Trend Chart */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                    <svg
                      viewBox="0 0 640 225"
                      className="w-full h-56 overflow-visible"
                      role="img"
                      aria-label="Biểu đồ xu hướng điểm trung bình các môn Toán, Tiếng Việt, Tiếng Anh qua các tuần"
                    >
                      <defs>
                        <linearGradient id="overallAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>

                      {/* Forecast Highlight Zone (between Milestone 2 and Milestone 3) */}
                      <rect
                        x={milestoneX(2)}
                        y={20}
                        width={milestoneX(3) - milestoneX(2) + 45}
                        height={165}
                        rx={8}
                        fill="#fef3c7"
                        fillOpacity="0.45"
                      />
                      <text
                        x={(milestoneX(2) + milestoneX(3)) / 2 + 10}
                        y={34}
                        textAnchor="middle"
                        className="fill-amber-800 text-[10px] font-bold"
                      >
                        Vùng Dự báo AI
                      </text>

                      {/* Horizontal Grid Lines (Scores 4, 6, 8, 10) */}
                      {[4, 6, 8, 10].map((val) => {
                        const y = scoreToY(val);
                        return (
                          <g key={val}>
                            <line
                              x1={45}
                              y1={y}
                              x2={605}
                              y2={y}
                              stroke="#e2e8f0"
                              strokeDasharray={val === 6 ? '4 4' : undefined}
                              strokeWidth="1"
                            />
                            <text
                              x={36}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-slate-400 text-[10px] font-bold"
                            >
                              {val}.0đ
                            </text>
                          </g>
                        );
                      })}

                      {/* Vertical Milestone Guides & X-Axis Labels */}
                      {report.trendMilestones.map((m, idx) => {
                        const x = milestoneX(idx);
                        return (
                          <g key={m.periodLabel}>
                            <line
                              x1={x}
                              y1={25}
                              x2={x}
                              y2={185}
                              stroke="#f1f5f9"
                              strokeWidth="1.5"
                            />
                            <text
                              x={x}
                              y={204}
                              textAnchor="middle"
                              className={`text-[11px] font-bold ${
                                m.isForecast ? 'fill-amber-700' : 'fill-slate-700'
                              }`}
                            >
                              {m.shortLabel}
                            </text>
                            <text
                              x={x}
                              y={218}
                              textAnchor="middle"
                              className="fill-slate-400 text-[9px] font-medium"
                            >
                              Mức T: {m.masteryRateT}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Shaded Area under Overall Average */}
                      <path d={buildAreaPath('overallAvg')} fill="url(#overallAreaGrad)" />

                      {/* Polylines for Toán, Tiếng Việt, Tiếng Anh, Overall */}
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={buildPolylinePoints('toanAvg')}
                      />
                      <polyline
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={buildPolylinePoints('tiengVietAvg')}
                      />
                      <polyline
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={buildPolylinePoints('tiengAnhAvg')}
                      />
                      <polyline
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={buildPolylinePoints('overallAvg')}
                      />

                      {/* Data Points & Score Labels */}
                      {report.trendMilestones.map((m, idx) => {
                        const x = milestoneX(idx);
                        const yToan = scoreToY(m.toanAvg);
                        const yTv = scoreToY(m.tiengVietAvg);
                        const yTa = scoreToY(m.tiengAnhAvg);
                        return (
                          <g key={`pts-${m.shortLabel}`}>
                            <circle
                              cx={x}
                              cy={yToan}
                              r="4.5"
                              className="fill-blue-600 stroke-white stroke-2"
                            />
                            <text
                              x={x - 10}
                              y={yToan - 8}
                              textAnchor="middle"
                              className="fill-blue-700 text-[10px] font-extrabold"
                            >
                              {m.toanAvg}
                            </text>

                            <circle
                              cx={x}
                              cy={yTv}
                              r="4.5"
                              className="fill-emerald-600 stroke-white stroke-2"
                            />
                            <text
                              x={x + 12}
                              y={yTv + 14}
                              textAnchor="middle"
                              className="fill-emerald-700 text-[10px] font-extrabold"
                            >
                              {m.tiengVietAvg}
                            </text>

                            <circle
                              cx={x}
                              cy={yTa}
                              r="4"
                              className="fill-purple-600 stroke-white stroke-2"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Subject Level Distribution Bars (T / H / C) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        Phân Bổ Mức Đạt Theo Từng Môn Học (T: Hoàn thành tốt • H: Hoàn thành • C: Chưa hoàn thành)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {report.subjectBreakdowns.map((sub) => (
                        <div
                          key={sub.subjectId}
                          className="bg-white rounded-xl p-3 border border-slate-200/90 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{sub.subjectName}</span>
                            <div className="flex items-center gap-1.5">
                              {sub.averageScore !== null && (
                                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                                  TB: {sub.averageScore}đ
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  sub.trendDelta >= 0
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {sub.trendDelta >= 0 ? `+${sub.trendDelta}đ` : `${sub.trendDelta}đ`}
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{ width: `${sub.rateT}%` }}
                              title={`Hoàn thành tốt (T): ${sub.rateT}%`}
                            />
                            <div
                              className="bg-blue-500 h-full transition-all"
                              style={{ width: `${sub.rateH}%` }}
                              title={`Hoàn thành (H): ${sub.rateH}%`}
                            />
                            <div
                              className="bg-rose-500 h-full transition-all"
                              style={{ width: `${sub.rateC}%` }}
                              title={`Chưa hoàn thành (C): ${sub.rateC}%`}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                            <span className="text-emerald-700">Mức T: {sub.countT} HS ({sub.rateT}%)</span>
                            <span className="text-blue-700">Mức H: {sub.countH} HS ({sub.rateH}%)</span>
                            <span className={sub.countC > 0 ? 'text-rose-600 font-bold' : ''}>
                              Mức C: {sub.countC} HS ({sub.rateC}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 2: 5 Qualities & 6 Core Competencies Breakdown */
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700">
                      Tỷ lệ học sinh đạt mức Tốt (T), Đạt (Đ) và Cần cố gắng (C) theo Thông tư 27:
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="text-emerald-700">● Tốt (T)</span>
                      <span className="text-blue-700">● Đạt (Đ)</span>
                      <span className="text-rose-600">● Cần cố gắng (C)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                    {report.competencyQualityBreakdowns.map((item) => (
                      <div
                        key={item.key}
                        className="bg-white rounded-xl p-3 border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{item.label}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.group === 'QUALITY'
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {item.group === 'QUALITY' ? 'Phẩm chất' : 'Năng lực'}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${item.rateT}%` }}
                          />
                          <div
                            className="bg-blue-500 h-full"
                            style={{ width: `${item.rateD}%` }}
                          />
                          <div
                            className="bg-rose-500 h-full"
                            style={{ width: `${item.rateC}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                          <span className="text-emerald-700">Tốt: {item.countT} ({item.rateT}%)</span>
                          <span className="text-blue-700">Đạt: {item.countD} ({item.rateD}%)</span>
                          <span className={item.countC > 0 ? 'text-rose-600 font-bold' : ''}>
                            Cần cố gắng: {item.countC} ({item.rateC}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Executive Summary & Recommendations */}
              <div className="bg-linear-to-br from-indigo-950 to-slate-900 rounded-xl p-4 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Nhận Định Xu Hướng & Dự Báo Từ AI ({report.dataSource === 'GEMINI_AI_ENHANCED' ? 'Gemini 3.8 Flash' : 'Động cơ Phân tích TT27'})
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {report.executiveAiSummary}
                </p>
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-300">
                    Khuyến nghị Sư phạm Trọng tâm:
                  </div>
                  {report.keyPedagogicalRecommendations.map((rec, i) => (
                    <div key={i} className="text-[11px] text-indigo-100 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Automatic Early Detection of Students Needing Special Support */}
            <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Nhóm Học Sinh Cần Hỗ Trợ Đặc Biệt ({report.specialSupportStudents.length} HS)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Phát hiện tự động từ điểm định kỳ & mức đạt Môn học, Phẩm chất, Năng lực TT27
                    </p>
                  </div>
                </div>

                {/* Priority Filter Pills */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSupportFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      supportFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Tất cả ({report.specialSupportStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupportFilter('CAO')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      supportFilter === 'CAO'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    Ưu tiên cao - Mức C ({report.specialSupportHighCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupportFilter('TRUNG_BINH')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      supportFilter === 'TRUNG_BINH'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    Cần củng cố ({report.specialSupportMediumCount})
                  </button>
                </div>

                {/* Student Alert Cards List */}
                {filteredSupportStudents.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-900">
                      Không có học sinh thuộc diện nguy cơ trong bộ lọc hiện tại
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      100% học sinh hiện có trên Firestore đều đạt mức Hoàn thành tốt / Hoàn thành vững vàng. Nhấn <strong>&quot;Nạp Dữ Liệu Phân Tích Đa Nhóm (T/H/C)&quot;</strong> ở góc trên nếu muốn kiểm thử phát hiện học sinh mức C.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {filteredSupportStudents.map((alert) => {
                      const isHigh = alert.priorityLevel === 'CAO';
                      return (
                        <div
                          key={alert.recordId}
                          className={`rounded-xl p-4 bg-white border-l-4 shadow-2xs space-y-2.5 ${
                            isHigh
                              ? 'border-l-rose-600 border border-rose-200'
                              : 'border-l-amber-500 border border-amber-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-slate-900">
                                  {alert.studentName}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  ({alert.className})
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    isHigh
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                >
                                  {isHigh
                                    ? '⚠️ Cần hỗ trợ đặc biệt (Ưu tiên cao)'
                                    : '🔔 Cần củng cố kỹ năng (Theo dõi sát)'}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">
                                  ĐTB định kỳ: {alert.averagePeriodicScore}/10
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onNavigateTab('THEO_DOI_TT27')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              Hồ sơ TT27 <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Weak Subject & Competency Badges */}
                          <div className="flex flex-wrap gap-1.5">
                            {alert.weakSubjects.map((ws) => (
                              <span
                                key={ws.subjectId}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ws.level === 'C' || (ws.score !== undefined && ws.score < 6)
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {ws.subjectName}: Mức {ws.level}
                                {ws.score !== undefined ? ` (${ws.score}đ)` : ''}
                              </span>
                            ))}
                            {alert.weakCompetencies.map((wc) => (
                              <span
                                key={wc}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200"
                              >
                                NL: {wc}
                              </span>
                            ))}
                            {alert.weakQualities.map((wq) => (
                              <span
                                key={wq}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200"
                              >
                                PC: {wq}
                              </span>
                            ))}
                          </div>

                          {/* AI Diagnostic & Intervention Plan */}
                          <p className="text-[11px] text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <strong className="text-slate-900">Chẩn đoán AI:</strong>{' '}
                            {alert.aiDiagnosticSummary}
                          </p>

                          <div className="space-y-1">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800">
                              Giải pháp Sư phạm Cá nhân hóa (Thông tư 27):
                            </div>
                            {alert.aiInterventionPlan.slice(0, 2).map((step, idx) => (
                              <div
                                key={idx}
                                className="text-[11px] text-slate-600 flex items-start gap-1.5"
                              >
                                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Action inside Right Column */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  Bảo mật dữ liệu học sinh theo Nghị định 13/2023/NĐ-CP
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('THEO_DOI_TT27')}
                  className="text-xs font-extrabold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Cập nhật Sổ Đánh Giá TT27
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
