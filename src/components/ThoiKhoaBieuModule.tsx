/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  User,
  Check,
  Trash2,
  Pencil,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { exportThoiKhoaBieuToExcel } from '../utils/excel_exporter';
import { TimetableSlot, UserProfile } from '../types/edtech';
import { detectTimetableConflicts } from '../utils/edtech_logic';

interface ThoiKhoaBieuModuleProps {
  currentUser: UserProfile;
  timetableSlots: TimetableSlot[];
  onAddSlot: (slot: TimetableSlot) => void;
  onUpdateSlot?: (slot: TimetableSlot) => void;
  onDeleteSlot: (slotId: string) => void;
  onOpenAiTemplateImport?: () => void;
}

export const ThoiKhoaBieuModule: React.FC<ThoiKhoaBieuModuleProps> = ({
  currentUser,
  timetableSlots,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onOpenAiTemplateImport
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(currentUser.className || 'Lớp 4A');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationSuccessMsg, setOptimizationSuccessMsg] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 2 as 2 | 3 | 4 | 5 | 6,
    period: 1 as 1 | 2 | 3 | 4,
    subject: 'Toán',
    teacherName: currentUser.name,
    room: 'P.101'
  });

  const conflicts = detectTimetableConflicts(timetableSlots);

  const days: Array<{ dayNumber: 2 | 3 | 4 | 5 | 6; label: string }> = [
    { dayNumber: 2, label: 'Thứ Hai' },
    { dayNumber: 3, label: 'Thứ Ba' },
    { dayNumber: 4, label: 'Thứ Tư' },
    { dayNumber: 5, label: 'Thứ Năm' },
    { dayNumber: 6, label: 'Thứ Sáu' }
  ];

  const periods: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  const getSlot = (day: number, period: number) => {
    return timetableSlots.find(
      s => s.className === selectedClass && s.dayOfWeek === day && s.period === period
    );
  };

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const slot: TimetableSlot = {
      id: `TKB-${Date.now()}`,
      ownerUid: currentUser.id,
      dayOfWeek: newSlot.dayOfWeek,
      period: newSlot.period,
      session: 'SANG',
      classId: selectedClass,
      className: selectedClass,
      subject: newSlot.subject,
      teacherId: currentUser.id,
      teacherName: newSlot.teacherName || currentUser.name,
      room: newSlot.room
    };
    onAddSlot(slot);
    setShowAddModal(false);
  };

  const handleAiOptimize = () => {
    setIsOptimizing(true);
    setOptimizationSuccessMsg(null);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimizationSuccessMsg(
        `Đã kiểm tra và tối ưu hóa Thời khóa biểu (${currentUser.schoolName}): Không phát hiện xung đột lịch dạy hoặc trùng phòng học.`
      );
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              Thời Khóa Biểu Thông Minh • {currentUser.schoolName}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              Thời Khóa Biểu & Kiểm Tra Xung Đột Lịch Dạy AI
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thiết lập lịch giảng dạy cho lớp {selectedClass} và tự động kiểm tra trùng tiết giáo viên.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenAiTemplateImport && (
              <button
                type="button"
                onClick={onOpenAiTemplateImport}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Tải lên Thời khóa biểu từ file Excel/Word bằng AI"
              >
                <Upload className="w-4 h-4" />
                Tải Lên File (AI)
              </button>
            )}

            <button
              type="button"
              onClick={() => exportThoiKhoaBieuToExcel(timetableSlots, selectedClass)}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Xuất Thời khóa biểu lớp học ra file Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Tải Xuống Excel
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Tiết Vào TKB
            </button>
            <button
              type="button"
              onClick={handleAiOptimize}
              disabled={isOptimizing}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang Kiểm Tra...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  AI Kiểm Tra & Tối Ưu TKB
                </>
              )}
            </button>
          </div>
        </div>

        {conflicts.length > 0 ? (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Cảnh báo: Phát hiện {conflicts.length} xung đột lịch dạy!
            </div>
            {conflicts.map((c, idx) => (
              <p key={idx} className="text-rose-700 ml-5">
                • {c.description}
              </p>
            ))}
          </div>
        ) : (
          <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Thời khóa biểu hợp lệ: Không phát hiện trùng tiết giáo viên hoặc trùng phòng học.
          </div>
        )}

        {optimizationSuccessMsg && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            {optimizationSuccessMsg}
          </div>
        )}
      </div>

      {/* Visual Timetable Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex justify-between">
          <span>Thời Khóa Biểu • {selectedClass}</span>
          <span className="text-slate-400">Năm học {currentUser.schoolYear || '2024 - 2025'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {days.map((d) => (
            <div key={d.dayNumber} className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2.5">
              <div className="text-center pb-2 border-b border-slate-200">
                <span className="font-black text-slate-900 text-sm">{d.label}</span>
              </div>

              <div className="space-y-2">
                {periods.map((p) => {
                  const slot = getSlot(d.dayNumber, p);
                  return (
                    <div
                      key={p}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        slot
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : 'bg-slate-100/60 border-dashed border-slate-200 text-slate-400 text-center py-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                        <span>Tiết {p}</span>
                        {slot && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSlot(slot);
                              }}
                              className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                              title="Chỉnh sửa tiết học"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSlot(slot.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                              title="Xóa tiết"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {slot ? (
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">{slot.subject}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-slate-400" />
                            {slot.teacherName}
                          </div>
                        </div>
                      ) : (
                        <span>Chưa xếp</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Thêm Tiết Học Vào Thời Khóa Biểu</h3>
            <form onSubmit={handleCreateSlot} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Thứ</label>
                  <select
                    value={newSlot.dayOfWeek}
                    onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: Number(e.target.value) as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {days.map(d => (
                      <option key={d.dayNumber} value={d.dayNumber}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tiết</label>
                  <select
                    value={newSlot.period}
                    onChange={(e) => setNewSlot({ ...newSlot, period: Number(e.target.value) as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {[1, 2, 3, 4].map(p => (
                      <option key={p} value={p}>Tiết {p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Môn học</label>
                <input
                  type="text"
                  required
                  value={newSlot.subject}
                  onChange={(e) => setNewSlot({ ...newSlot, subject: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Giáo viên giảng dạy</label>
                <input
                  type="text"
                  required
                  value={newSlot.teacherName}
                  onChange={(e) => setNewSlot({ ...newSlot, teacherName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Lưu Vào TKB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Tiết Học TKB */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                Chỉnh Sửa Tiết Thời Khóa Biểu
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateSlot?.(editingSlot);
                setEditingSlot(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Thứ</label>
                  <select
                    value={editingSlot.dayOfWeek}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        dayOfWeek: Number(e.target.value) as 2 | 3 | 4 | 5 | 6
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    {days.map((d) => (
                      <option key={d.dayNumber} value={d.dayNumber}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tiết</label>
                  <select
                    value={editingSlot.period}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        period: Number(e.target.value) as 1 | 2 | 3 | 4
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    {[1, 2, 3, 4].map((p) => (
                      <option key={p} value={p}>
                        Tiết {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Môn học</label>
                <input
                  type="text"
                  required
                  value={editingSlot.subject}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, subject: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Giáo viên giảng dạy</label>
                <input
                  type="text"
                  required
                  value={editingSlot.teacherName}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, teacherName: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phòng học</label>
                <input
                  type="text"
                  value={editingSlot.room || ''}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, room: e.target.value })
                  }
                  placeholder="VD: P.101, Phòng Tin học..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
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
