/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Award,
  Search,
  CheckCircle2,
  RefreshCw,
  Download,
  Plus,
  Trash2,
  UserPlus,
  Wand2,
  Pencil,
  Upload,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { exportTheoDoiTT27ToExcel } from '../utils/excel_exporter';
import {
  StudentTT27Record,
  SubjectEvaluation,
  UserProfile,
  TT27SubjectEvaluationLevel,
  TT27QualityCompetencyLevel,
  StudentProfile
} from '../types/edtech';
import {
  calculateTT27Standing,
  createBlankTT27Record,
  QUALITY_LABELS,
  COMPETENCY_LABELS
} from '../utils/edtech_logic';

interface TheoDoiTT27ModuleProps {
  currentUser: UserProfile;
  records: StudentTT27Record[];
  students: StudentProfile[];
  onUpdateRecord: (updated: StudentTT27Record) => void;
  onAddRecord: (newRecord: StudentTT27Record) => void;
  onDeleteRecord: (recordId: string) => void;
  onOpenMonthlyReport: () => void;
  onOpenAiTemplateImport?: () => void;
}

export const TheoDoiTT27Module: React.FC<TheoDoiTT27ModuleProps> = ({
  currentUser,
  records,
  students,
  onUpdateRecord,
  onAddRecord,
  onDeleteRecord,
  onOpenMonthlyReport,
  onOpenAiTemplateImport
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<StudentTT27Record['term']>('GIUA_HK1');
  const [selectedStanding, setSelectedStanding] = useState<string>('ALL');
  const [activeRecordId, setActiveRecordId] = useState<string | null>(records[0]?.id || null);
  const [editingStudentRecord, setEditingStudentRecord] = useState<StudentTT27Record | null>(null);

  // Add Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentClass, setNewStudentClass] = useState<string>(currentUser.className || 'Lớp 4A');

  // Holistic AI Generation State
  const [holisticStrengths, setHolisticStrengths] = useState<string>('');
  const [holisticImprovements, setHolisticImprovements] = useState<string>('');
  const [isHolisticLoading, setIsHolisticLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // AI Suggestion Modal State (for individual Subject / Qualities / Competencies)
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiTargetType, setAiTargetType] = useState<'SUBJECT' | 'QUALITIES' | 'COMPETENCIES'>('SUBJECT');
  const [aiTargetSubjectKey, setAiTargetSubjectKey] = useState<string>('toan');
  const [aiTargetSubjectName, setAiTargetSubjectName] = useState<string>('Toán');
  const [aiTargetLevel, setAiTargetLevel] = useState<TT27SubjectEvaluationLevel>('T');
  const [aiScore, setAiScore] = useState<number>(9);
  const [aiStrengths, setAiStrengths] = useState<string>('');
  const [aiImprovements, setAiImprovements] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!activeRecordId && records.length > 0) {
      setActiveRecordId(records[0].id);
    } else if (activeRecordId && !records.some(r => r.id === activeRecordId)) {
      setActiveRecordId(records[0]?.id || null);
    }
  }, [records, activeRecordId]);

  const activeRecord = records.find(r => r.id === activeRecordId) || null;

  const filteredRecords = records.filter((r) => {
    if (selectedStanding !== 'ALL' && r.finalAward !== selectedStanding) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return r.studentName.toLowerCase().includes(q) || r.className.toLowerCase().includes(q);
    }
    return true;
  });

  const recomputeAndSave = (
    baseRecord: StudentTT27Record,
    nextSubjects = baseRecord.subjects,
    nextQualities = baseRecord.qualities,
    nextCompetencies = baseRecord.competencies
  ) => {
    const newAward = calculateTT27Standing(
      nextSubjects,
      {
        yeuNuoc: nextQualities.yeuNuoc,
        nhanAi: nextQualities.nhanAi,
        chamChi: nextQualities.chamChi,
        trungThuc: nextQualities.trungThuc,
        trachNhiem: nextQualities.trachNhiem
      },
      {
        tuChuTuHoc: nextCompetencies.tuChuTuHoc,
        giaoTiepHopTac: nextCompetencies.giaoTiepHopTac,
        giaiQuyetVanDe: nextCompetencies.giaiQuyetVanDe,
        ngonNgu: nextCompetencies.ngonNgu,
        tinhToan: nextCompetencies.tinhToan,
        khoaHoc: nextCompetencies.khoaHoc
      }
    );

    const updatedRecord: StudentTT27Record = {
      ...baseRecord,
      subjects: nextSubjects,
      qualities: nextQualities,
      competencies: nextCompetencies,
      finalAward: newAward
    };
    onUpdateRecord(updatedRecord);
  };

  const handleCreateStudentRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const studentId = `HS-${Date.now()}`;
    const blank = createBlankTT27Record(
      studentId,
      newStudentName.trim(),
      newStudentClass.trim() || currentUser.className || 'Lớp 4A',
      selectedTerm,
      currentUser.id
    );
    onAddRecord(blank);
    setActiveRecordId(blank.id);
    setNewStudentName('');
    setShowAddStudentModal(false);
    setStatusMessage(`Đã thêm học sinh "${blank.studentName}" vào sổ đánh giá Thông tư 27.`);
  };

  const handleSyncFromHomeroom = () => {
    let addedCount = 0;
    students.forEach((st) => {
      const exists = records.some(
        r => r.studentId === st.id || r.studentName.toLowerCase() === st.fullName.toLowerCase()
      );
      if (!exists) {
        const blank = createBlankTT27Record(
          st.id,
          st.fullName,
          st.className || currentUser.className || 'Lớp 4A',
          selectedTerm,
          currentUser.id
        );
        onAddRecord(blank);
        addedCount++;
      }
    });
    if (addedCount > 0) {
      setStatusMessage(`Đã đồng bộ thêm ${addedCount} học sinh từ Sổ Chủ Nhiệm sang Sổ Đánh Giá TT27.`);
    } else {
      setStatusMessage('Tất cả học sinh trong Sổ Chủ Nhiệm đã có trong danh sách đánh giá TT27.');
    }
  };

  const handleLevelChange = (subjectKey: string, newLevel: TT27SubjectEvaluationLevel) => {
    if (!activeRecord) return;
    const currentSub = activeRecord.subjects[subjectKey];
    if (!currentSub) return;

    const updatedSubjects = {
      ...activeRecord.subjects,
      [subjectKey]: {
        ...currentSub,
        level: newLevel
      }
    };
    recomputeAndSave(activeRecord, updatedSubjects);
  };

  const handleScoreChange = (subjectKey: string, score: number) => {
    if (!activeRecord) return;
    const currentSub = activeRecord.subjects[subjectKey];
    if (!currentSub) return;

    const updatedSubjects = {
      ...activeRecord.subjects,
      [subjectKey]: {
        ...currentSub,
        periodicScore: score
      }
    };
    recomputeAndSave(activeRecord, updatedSubjects);
  };

  const handleSubjectCommentChange = (subjectKey: string, comment: string) => {
    if (!activeRecord) return;
    const currentSub = activeRecord.subjects[subjectKey];
    if (!currentSub) return;

    const updatedSubjects = {
      ...activeRecord.subjects,
      [subjectKey]: {
        ...currentSub,
        teacherComment: comment
      }
    };
    recomputeAndSave(activeRecord, updatedSubjects);
  };

  const handleQualityLevelChange = (
    qualityKey: 'yeuNuoc' | 'nhanAi' | 'chamChi' | 'trungThuc' | 'trachNhiem',
    newLevel: TT27QualityCompetencyLevel
  ) => {
    if (!activeRecord) return;
    const updatedQualities = {
      ...activeRecord.qualities,
      [qualityKey]: newLevel
    };
    recomputeAndSave(activeRecord, activeRecord.subjects, updatedQualities, activeRecord.competencies);
  };

  const handleCompetencyLevelChange = (
    compKey: 'tuChuTuHoc' | 'giaoTiepHopTac' | 'giaiQuyetVanDe' | 'ngonNgu' | 'tinhToan' | 'khoaHoc',
    newLevel: TT27QualityCompetencyLevel
  ) => {
    if (!activeRecord) return;
    const updatedCompetencies = {
      ...activeRecord.competencies,
      [compKey]: newLevel
    };
    recomputeAndSave(activeRecord, activeRecord.subjects, activeRecord.qualities, updatedCompetencies);
  };

  const handleQualitiesCommentChange = (comment: string) => {
    if (!activeRecord) return;
    recomputeAndSave(
      activeRecord,
      activeRecord.subjects,
      { ...activeRecord.qualities, comment },
      activeRecord.competencies
    );
  };

  const handleCompetenciesCommentChange = (comment: string) => {
    if (!activeRecord) return;
    recomputeAndSave(
      activeRecord,
      activeRecord.subjects,
      activeRecord.qualities,
      { ...activeRecord.competencies, comment }
    );
  };

  // Holistic 1-Click AI Generation for all Subjects + Qualities + Competencies
  const handleGenerateHolisticAi = async () => {
    if (!activeRecord) return;
    setIsHolisticLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/ai/generate-holistic-tt27', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: activeRecord,
          strengths: holisticStrengths,
          improvements: holisticImprovements
        })
      });
      const data = await res.json();
      if (data.success && data.record) {
        onUpdateRecord(data.record);
        setStatusMessage(
          `AI đã tự động tạo nhận xét cá nhân hóa chuẩn Thông tư 27 cho toàn bộ Môn học, 5 Phẩm chất và 6 Năng lực của em ${activeRecord.studentName}!`
        );
      }
    } catch (err) {
      console.error('Holistic AI error:', err);
    } finally {
      setIsHolisticLoading(false);
    }
  };

  const handleOpenSubjectAiModal = (subjectKey: string, sub: SubjectEvaluation) => {
    setAiTargetType('SUBJECT');
    setAiTargetSubjectKey(subjectKey);
    setAiTargetSubjectName(sub.subjectName);
    setAiTargetLevel(sub.level);
    setAiScore(sub.periodicScore ?? 9);
    setAiSuggestions([]);
    setShowAiModal(true);
  };

  const handleOpenQualitiesAiModal = () => {
    setAiTargetType('QUALITIES');
    setAiTargetSubjectName('5 Phẩm chất chủ yếu');
    setAiSuggestions([]);
    setShowAiModal(true);
  };

  const handleOpenCompetenciesAiModal = () => {
    setAiTargetType('COMPETENCIES');
    setAiTargetSubjectName('6 Năng lực cốt lõi');
    setAiSuggestions([]);
    setShowAiModal(true);
  };

  const handleGenerateAiSuggestions = async () => {
    if (!activeRecord) return;
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-tt27-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: activeRecord.studentName,
          targetType: aiTargetType,
          subjectName: aiTargetSubjectName,
          level: aiTargetLevel,
          score: aiTargetType === 'SUBJECT' ? aiScore : undefined,
          qualities: activeRecord.qualities,
          competencies: activeRecord.competencies,
          strengths: aiStrengths || holisticStrengths,
          improvements: aiImprovements || holisticImprovements
        })
      });

      const data = await response.json();
      if (data.comments && data.comments.length) {
        setAiSuggestions(data.comments);
      }
    } catch (err) {
      console.error('AI suggestion failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiComment = (commentText: string) => {
    if (!activeRecord) return;
    if (aiTargetType === 'QUALITIES') {
      handleQualitiesCommentChange(commentText);
    } else if (aiTargetType === 'COMPETENCIES') {
      handleCompetenciesCommentChange(commentText);
    } else {
      handleSubjectCommentChange(aiTargetSubjectKey, commentText);
    }
    setShowAiModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Thông tư 27/2020/TT-BGDĐT • Cá Nhân Hóa Nhận Xét Sư Phạm Bằng AI
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              Sổ Theo Dõi & Đánh Giá Học Sinh Theo Thông Tư 27
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Đánh giá kết quả học tập (Mức T/H/C & Điểm định kỳ), 5 Phẩm chất chủ yếu và 6 Năng lực cốt lõi (Mức T/Đ/C). Tích hợp AI tự động tạo lời nhận xét cá nhân hóa chuẩn mực sư phạm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {students.length > 0 && (
              <button
                type="button"
                onClick={handleSyncFromHomeroom}
                className="px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Đồng Bộ Từ Sổ Chủ Nhiệm ({students.length})
              </button>
            )}

            {onOpenAiTemplateImport && (
              <button
                type="button"
                onClick={onOpenAiTemplateImport}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Tải lên bảng điểm và danh sách đánh giá từ file Excel/Word bằng AI"
              >
                <Upload className="w-4 h-4" />
                Tải Lên File (AI)
              </button>
            )}

            <button
              type="button"
              onClick={() => exportTheoDoiTT27ToExcel(records, currentUser.className || '4/1', selectedTerm)}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Xuất bảng đánh giá học sinh Thông tư 27 ra file Excel chuẩn"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Tải Xuống Excel
            </button>

            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Học Sinh
            </button>
            <button
              type="button"
              onClick={onOpenMonthlyReport}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-300" />
              Báo Cáo PDF
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {statusMessage}
            </span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh hoặc lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <select
            aria-label="Kỳ đánh giá"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value as StudentTT27Record['term'])}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="GIUA_HK1">Giữa Học kỳ I</option>
            <option value="CUOI_HK1">Cuối Học kỳ I</option>
            <option value="GIUA_HK2">Giữa Học kỳ II</option>
            <option value="CUOI_HK2">Cuối Năm Học</option>
          </select>

          <select
            aria-label="Lọc theo kết quả đánh giá khen thưởng"
            value={selectedStanding}
            onChange={(e) => setSelectedStanding(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả mức khen thưởng Điều 13</option>
            <option value="XUAT_SAC">Học sinh Xuất sắc</option>
            <option value="TIEU_BIEU">Học sinh Tiêu biểu</option>
            <option value="HOAN_THANH_CHUONG_TRINH">Hoàn thành chương trình</option>
            <option value="CHUA_HOAN_THANH">Chưa hoàn thành / Cần hỗ trợ</option>
          </select>
        </div>
      </div>

      {/* Empty State when no student records exist */}
      {records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              Chưa có dữ liệu học sinh trong Sổ Đánh Giá Thông Tư 27
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hệ thống đã loại bỏ hoàn toàn dữ liệu mẫu. Hãy nhấn <strong>&quot;Thêm Học Sinh Đánh Giá&quot;</strong> để nhập học sinh thực tế của lớp và sử dụng AI gợi ý lời nhận xét cá nhân hóa chuẩn sư phạm.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Học Sinh Đầu Tiên
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Student List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3 h-fit">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex justify-between items-center">
              <span>Danh sách học sinh ({filteredRecords.length})</span>
              <span className="text-emerald-700 font-bold">{currentUser.className || 'Lớp phụ trách'}</span>
            </div>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredRecords.map((rec) => {
                const isSelected = activeRecord?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => setActiveRecordId(rec.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-400'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900">{rec.studentName}</span>
                      <div className="flex items-center gap-1.5">
                        {rec.finalAward === 'XUAT_SAC' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Xuất sắc
                          </span>
                        ) : rec.finalAward === 'TIEU_BIEU' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            Tiêu biểu
                          </span>
                        ) : rec.finalAward === 'CHUA_HOAN_THANH' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Cần hỗ trợ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                            Hoàn thành
                          </span>
                        )}
                        <button
                          type="button"
                          title="Xóa hồ sơ học sinh này"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecord(rec.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>Toán: {rec.subjects.toan?.periodicScore ?? '-'}đ ({rec.subjects.toan?.level})</span>
                      <span>Tiếng Việt: {rec.subjects.tiengViet?.periodicScore ?? '-'}đ ({rec.subjects.tiengViet?.level})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep Assessment Form */}
          {activeRecord && (
            <div className="lg:col-span-2 space-y-5">
              {/* Student Header + Holistic AI Generator Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                      {activeRecord.studentName.trim().slice(-2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        {activeRecord.studentName}
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {activeRecord.className}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingStudentRecord(activeRecord)}
                          className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin học sinh và danh hiệu"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Đơn vị: <strong className="text-slate-800">{currentUser.schoolName}</strong> • Năm học {currentUser.schoolYear || '2024 - 2025'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Xếp loại khen thưởng Điều 13 TT27
                    </span>
                    <div className="text-base font-black text-amber-600 mt-0.5 flex items-center gap-1 sm:justify-end">
                      <Award className="w-4 h-4 text-amber-500" />
                      {activeRecord.finalAward === 'XUAT_SAC'
                        ? 'Học sinh Xuất sắc'
                        : activeRecord.finalAward === 'TIEU_BIEU'
                        ? 'Học sinh Tiêu biểu'
                        : activeRecord.finalAward === 'CHUA_HOAN_THANH'
                        ? 'Cần rèn luyện thêm (Chưa HT)'
                        : 'Hoàn thành chương trình lớp học'}
                    </div>
                  </div>
                </div>

                {/* One-Click Holistic AI Generator */}
                <div className="p-4 rounded-xl bg-linear-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-purple-950 flex items-center gap-1.5">
                        <Wand2 className="w-4 h-4 text-purple-600" />
                        AI Tự Động Tạo Nhận Xét Cá Nhân Hóa Toàn Diện (Môn học + Phẩm chất + Năng lực)
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Nhập thêm biểu hiện riêng của em <strong>{activeRecord.studentName}</strong> (nếu có), AI sẽ kết hợp với điểm số & mức đạt bên dưới để soạn lời nhận xét chuẩn ngôn ngữ sư phạm Thông tư 27.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateHolisticAi}
                      disabled={isHolisticLoading}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isHolisticLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Đang Soạn Nhận Xét...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          AI Tạo Nhận Xét Toàn Diện
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Biểu hiện nổi bật / Thế mạnh riêng của học sinh:
                      </label>
                      <input
                        type="text"
                        value={holisticStrengths}
                        onChange={(e) => setHolisticStrengths(e.target.value)}
                        placeholder="VD: Tiếp thu nhanh, chữ viết đẹp, hay giúp đỡ bạn..."
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nội dung cần khích lệ / Rèn luyện thêm:
                      </label>
                      <input
                        type="text"
                        value={holisticImprovements}
                        onChange={(e) => setHolisticImprovements(e.target.value)}
                        placeholder="VD: Cần tự tin phát biểu hơn, kiểm tra kỹ phép tính..."
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment Section 1: 5 Phẩm Chất Chủ Yếu & 6 Năng Lực Cốt Lõi */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    1. Đánh Giá 5 Phẩm Chất Chủ Yếu & 6 Năng Lực Cốt Lõi
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded">T: Tốt</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 font-bold rounded">Đ: Đạt</span>
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-800 font-bold rounded">C: Cần cố gắng</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* 5 Qualities Interactive Panel */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                        5 Phẩm chất chủ yếu
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenQualitiesAiModal}
                        className="px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        AI Gợi ý Phẩm chất
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(
                        ['yeuNuoc', 'nhanAi', 'chamChi', 'trungThuc', 'trachNhiem'] as const
                      ).map((qKey) => (
                        <div key={qKey} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-700">{QUALITY_LABELS[qKey]}</span>
                          <div className="inline-flex rounded-md p-0.5 bg-slate-100 border border-slate-200">
                            {(['T', 'D', 'C'] as TT27QualityCompetencyLevel[]).map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleQualityLevelChange(qKey, lvl)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                  activeRecord.qualities[qKey] === lvl
                                    ? lvl === 'T'
                                      ? 'bg-emerald-600 text-white'
                                      : lvl === 'D'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-rose-600 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {lvl === 'T' ? 'Tốt (T)' : lvl === 'D' ? 'Đạt (Đ)' : 'Cần CG (C)'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nhận xét Phẩm chất chủ yếu:
                      </label>
                      <textarea
                        rows={3}
                        value={activeRecord.qualities.comment}
                        onChange={(e) => handleQualitiesCommentChange(e.target.value)}
                        placeholder="Nhập hoặc nhấn nút AI để gợi ý lời nhận xét về 5 phẩm chất chủ yếu..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* 6 Competencies Interactive Panel */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                        6 Năng lực cốt lõi (Chung & Đặc thù)
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenCompetenciesAiModal}
                        className="px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        AI Gợi ý Năng lực
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(
                        ['tuChuTuHoc', 'giaoTiepHopTac', 'giaiQuyetVanDe', 'ngonNgu', 'tinhToan', 'khoaHoc'] as const
                      ).map((cKey) => (
                        <div key={cKey} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-700">{COMPETENCY_LABELS[cKey]}</span>
                          <div className="inline-flex rounded-md p-0.5 bg-slate-100 border border-slate-200">
                            {(['T', 'D', 'C'] as TT27QualityCompetencyLevel[]).map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleCompetencyLevelChange(cKey, lvl)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                  activeRecord.competencies[cKey] === lvl
                                    ? lvl === 'T'
                                      ? 'bg-emerald-600 text-white'
                                      : lvl === 'D'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-rose-600 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {lvl === 'T' ? 'Tốt (T)' : lvl === 'D' ? 'Đạt (Đ)' : 'Cần CG (C)'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nhận xét Năng lực cốt lõi:
                      </label>
                      <textarea
                        rows={3}
                        value={activeRecord.competencies.comment}
                        onChange={(e) => handleCompetenciesCommentChange(e.target.value)}
                        placeholder="Nhập hoặc nhấn nút AI để gợi ý lời nhận xét về năng lực chung & đặc thù..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment Section 2: Môn Học & Hoạt Động Giáo Dục */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    2. Đánh Giá Các Môn Học & Hoạt Động Giáo Dục
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded">T: Hoàn thành tốt</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 font-bold rounded">H: Hoàn thành</span>
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-800 font-bold rounded">C: Chưa hoàn thành</span>
                  </div>
                </div>

                <div className="space-y-4 divide-y divide-slate-100">
                  {Object.entries(activeRecord.subjects).map(([key, sub]) => (
                    <div key={key} className="pt-3 first:pt-0 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          {sub.subjectName}
                          {sub.periodicScore !== undefined && (
                            <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Điểm KTĐK:
                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="0.5"
                                value={sub.periodicScore}
                                onChange={(e) => handleScoreChange(key, Number(e.target.value))}
                                className="w-12 px-1 py-0.5 bg-white border border-slate-300 rounded font-bold text-center"
                              />
                              /10
                            </div>
                          )}
                        </div>

                        {/* Level selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500 font-medium">Mức đạt:</span>
                          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                            {(['T', 'H', 'C'] as TT27SubjectEvaluationLevel[]).map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleLevelChange(key, lvl)}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                  sub.level === lvl
                                    ? lvl === 'T'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : lvl === 'H'
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {lvl === 'T' ? 'Tốt (T)' : lvl === 'H' ? 'HT (H)' : 'Chưa HT (C)'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Teacher Comment & AI Button */}
                      <div className="relative">
                        <textarea
                          rows={2}
                          value={sub.teacherComment}
                          onChange={(e) => handleSubjectCommentChange(key, e.target.value)}
                          placeholder={`Nhập lời nhận xét môn ${sub.subjectName} hoặc nhấn nút AI Gợi ý...`}
                          className="w-full p-2.5 pr-36 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:bg-white focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenSubjectAiModal(key, sub)}
                          className="absolute right-2 bottom-3 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          AI Gợi ý nhận xét
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Student to TT27 */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Thêm Học Sinh Vào Sổ Đánh Giá TT27
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudentRecord} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="VD: Nguyễn Lê Minh Khang"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lớp học
                </label>
                <input
                  type="text"
                  required
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value)}
                  placeholder="VD: Lớp 4A"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs"
                >
                  Tạo Hồ Sơ Đánh Giá TT27
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Individual AI Suggestion (3 Options) */}
      {showAiModal && activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Trợ Lý AI: Gợi Ý Lời Nhận Xét Chuẩn Thông Tư 27
                  </h3>
                  <p className="text-xs text-slate-500">
                    Học sinh: <strong>{activeRecord.studentName}</strong> • Nội dung: <strong>{aiTargetSubjectName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Input Config for AI */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
              {aiTargetType === 'SUBJECT' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Mức đạt được (TT27)</label>
                    <select
                      value={aiTargetLevel}
                      onChange={(e) => setAiTargetLevel(e.target.value as TT27SubjectEvaluationLevel)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="T">Hoàn thành tốt (T)</option>
                      <option value="H">Hoàn thành (H)</option>
                      <option value="C">Chưa hoàn thành (C)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Điểm kiểm tra định kỳ</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={aiScore}
                      onChange={(e) => setAiScore(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Biểu hiện / Ưu điểm nổi bật của em {activeRecord.studentName}
                </label>
                <input
                  type="text"
                  value={aiStrengths}
                  onChange={(e) => setAiStrengths(e.target.value)}
                  placeholder="Ví dụ: Tư duy tính toán nhanh, hăng hái phát biểu, lễ phép..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Điểm cần rèn luyện / hỗ trợ thêm (nếu có)
                </label>
                <input
                  type="text"
                  value={aiImprovements}
                  onChange={(e) => setAiImprovements(e.target.value)}
                  placeholder="Ví dụ: Cần trình bày chữ viết cẩn thận hơn..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerateAiSuggestions}
                disabled={isAiLoading}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isAiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI Đang Phân Tích & Soạn Nhận Xét...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Tạo 3 Phương Án Nhận Xét Cá Nhân Hóa
                  </>
                )}
              </button>
            </div>

            {/* AI Results */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Chọn phương án nhận xét phù hợp để áp dụng vào sổ:
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {aiSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 rounded-xl text-xs transition-all flex flex-col justify-between gap-2"
                    >
                      <p className="text-slate-800 leading-relaxed italic">
                        &quot;{suggestion}&quot;
                      </p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleApplyAiComment(suggestion)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Áp Dụng Vào Sổ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Hồ Sơ & Danh Hiệu TT27 */}
      {editingStudentRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                Chỉnh Sửa Hồ Sơ & Đánh Giá Tổng Hợp TT27
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudentRecord(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateRecord(editingStudentRecord);
                setStatusMessage(
                  `Đã cập nhật thành công hồ sơ đánh giá Thông tư 27 cho em "${editingStudentRecord.studentName}".`
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
                      setEditingStudentRecord({
                        ...editingStudentRecord,
                        studentName: e.target.value
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lớp</label>
                  <input
                    type="text"
                    value={editingStudentRecord.className}
                    onChange={(e) =>
                      setEditingStudentRecord({
                        ...editingStudentRecord,
                        className: e.target.value
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kỳ đánh giá</label>
                  <select
                    value={editingStudentRecord.term}
                    onChange={(e) =>
                      setEditingStudentRecord({
                        ...editingStudentRecord,
                        term: e.target.value as StudentTT27Record['term']
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="GIUA_HK1">Giữa Học kỳ 1</option>
                    <option value="CUOI_HK1">Cuối Học kỳ 1</option>
                    <option value="GIUA_HK2">Giữa Học kỳ 2</option>
                    <option value="CUOI_NAM">Cuối Năm Học</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Xếp loại khen thưởng (Điều 13)
                  </label>
                  <select
                    value={editingStudentRecord.finalAward}
                    onChange={(e) =>
                      setEditingStudentRecord({
                        ...editingStudentRecord,
                        finalAward: e.target.value as StudentTT27Record['finalAward']
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-amber-700"
                  >
                    <option value="XUAT_SAC">Học sinh Xuất sắc</option>
                    <option value="TIEU_BIEU">Học sinh Tiêu biểu</option>
                    <option value="HOAN_THANH">Hoàn thành</option>
                    <option value="CHUA_HOAN_THANH">Cần hỗ trợ đặc biệt (Chưa HT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nhận xét tổng quát của giáo viên chủ nhiệm
                </label>
                <textarea
                  rows={3}
                  value={editingStudentRecord.teacherGeneralComment || ''}
                  onChange={(e) =>
                    setEditingStudentRecord({
                      ...editingStudentRecord,
                      teacherGeneralComment: e.target.value
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950">Phát hiện & Kế hoạch hỗ trợ đặc biệt:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      checked={editingStudentRecord.specialSupportNeeded || false}
                      onChange={(e) =>
                        setEditingStudentRecord({
                          ...editingStudentRecord,
                          specialSupportNeeded: e.target.checked
                        })
                      }
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    Cần hỗ trợ đặc biệt
                  </label>
                </div>

                {editingStudentRecord.specialSupportNeeded && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                        Nhóm cần can thiệp (VD: Toán - phân số, Đọc hiểu, Nề nếp)
                      </label>
                      <input
                        type="text"
                        value={editingStudentRecord.specialSupportCategory || ''}
                        onChange={(e) =>
                          setEditingStudentRecord({
                            ...editingStudentRecord,
                            specialSupportCategory: e.target.value
                          })
                        }
                        className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                        Kế hoạch bồi dưỡng / phụ đạo
                      </label>
                      <input
                        type="text"
                        value={editingStudentRecord.specialSupportPlan || ''}
                        onChange={(e) =>
                          setEditingStudentRecord({
                            ...editingStudentRecord,
                            specialSupportPlan: e.target.value
                          })
                        }
                        className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
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
    </div>
  );
};
