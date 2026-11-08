/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Award,
  Trophy,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportThiDuaToExcel } from '../utils/excel_exporter';
import { EmulationScoreItem, UserProfile } from '../types/edtech';
import { calculateEmulationScore, rankEmulationList } from '../utils/edtech_logic';

interface ThiDuaModuleProps {
  currentUser: UserProfile;
  emulationList: EmulationScoreItem[];
  onUpdateEmulationList: (items: EmulationScoreItem[]) => void;
  onAddEmulationClass: (item: EmulationScoreItem) => void;
  onDeleteEmulationClass: (id: string) => void;
}

export const ThiDuaModule: React.FC<ThiDuaModuleProps> = ({
  currentUser,
  emulationList,
  onUpdateEmulationList,
  onAddEmulationClass,
  onDeleteEmulationClass
}) => {
  const [selectedGrade, setSelectedGrade] = useState<number | 'ALL'>('ALL');
  const [showAddClassModal, setShowAddClassModal] = useState<boolean>(false);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [editingClassItem, setEditingClassItem] = useState<EmulationScoreItem | null>(null);

  const [newClassName, setNewClassName] = useState<string>(currentUser.className || 'Lớp 4A');
  const [newClassGrade, setNewClassGrade] = useState<number>(4);

  const [selectedClassId, setSelectedClassId] = useState<string>(emulationList[0]?.classId || '');
  const [eventType, setEventType] = useState<'BONUS' | 'PENALTY'>('BONUS');
  const [eventReason, setEventReason] = useState<string>('');
  const [eventPoints, setEventPoints] = useState<number>(10);

  const filteredList = emulationList.filter(item => {
    if (selectedGrade !== 'ALL' && item.grade !== selectedGrade) return false;
    return true;
  });

  const handleCelebrateWinner = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleCreateClassScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const baseItem: EmulationScoreItem = {
      id: `EMU-${Date.now()}`,
      ownerUid: currentUser.id,
      classId: newClassName.trim(),
      className: newClassName.trim(),
      grade: Number(newClassGrade),
      week: currentUser.currentWeek || 1,
      baseScore: 100,
      disciplineScore: 50,
      cleanlinessScore: 50,
      studyScore: 50,
      movementScore: 50,
      bonuses: [],
      penalties: [],
      totalScore: 300,
      rank: 1,
      award: 'CO_NHAT'
    };
    onAddEmulationClass(baseItem);
    setSelectedClassId(baseItem.classId);
    setShowAddClassModal(false);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventReason.trim()) return;
    const targetId = selectedClassId || emulationList[0]?.classId;
    const updated = emulationList.map((item) => {
      if (item.classId === targetId) {
        const bonuses =
          eventType === 'BONUS'
            ? [...item.bonuses, { reason: eventReason.trim(), points: eventPoints }]
            : item.bonuses;
        const penalties =
          eventType === 'PENALTY'
            ? [...item.penalties, { reason: eventReason.trim(), points: eventPoints }]
            : item.penalties;

        const totalScore = calculateEmulationScore({
          baseScore: item.baseScore,
          disciplineScore: item.disciplineScore,
          cleanlinessScore: item.cleanlinessScore,
          studyScore: item.studyScore,
          movementScore: item.movementScore,
          bonuses,
          penalties
        });

        return {
          ...item,
          bonuses,
          penalties,
          totalScore
        };
      }
      return item;
    });

    const ranked = rankEmulationList(updated);
    onUpdateEmulationList(ranked);
    setEventReason('');
    setShowAddEventModal(false);
    handleCelebrateWinner();
  };

  const topClass = emulationList[0];

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-rose-900 via-red-800 to-amber-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold mb-2 shadow-xs">
              <Trophy className="w-4 h-4 text-amber-950" />
              Thi Đua Nề Nếp Tuần {currentUser.currentWeek || 1} • {currentUser.schoolName}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Phong Trào Thi Đua &quot;Dạy Tốt - Học Tốt&quot;
            </h2>
            <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Tự động tổng hợp điểm nề nếp, vệ sinh trực nhật, hoa điểm 10 và xếp hạng cờ thi đua giữa các lớp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportThiDuaToExcel(emulationList, currentUser.currentWeek || 1)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              title="Xuất bảng tổng hợp chấm điểm thi đua các lớp ra file Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Tải Xuống Excel
            </button>
            <button
              type="button"
              onClick={() => setShowAddClassModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Lớp Thi Đua
            </button>
            {emulationList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClassId(emulationList[0].classId);
                  setShowAddEventModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Chấm Điểm Cộng / Trừ
              </button>
            )}
          </div>
        </div>

        {topClass && (
          <div className="mt-6 pt-5 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-amber-300/40 relative">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                CỜ NHẤT TUẦN
              </div>
              <div className="text-xs text-amber-200 font-semibold">Hạng 1</div>
              <div className="text-xl font-black text-white mt-0.5">{topClass.className}</div>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {topClass.totalScore} <span className="text-xs font-normal text-white">điểm</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {emulationList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              Chưa có lớp học nào trong Bảng Thi Đua Tuần
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nhấn nút <strong>&quot;Thêm Lớp Thi Đua&quot;</strong> để khởi tạo bảng chấm điểm thi đua cho các lớp trong trường.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddClassModal(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm Lớp Thi Đua Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Bảng Tổng Hợp Chấm Điểm Thi Đua Tuần {currentUser.currentWeek || 1}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedGrade('ALL')}
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    selectedGrade === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Tất cả
                </button>
                {[1, 2, 3, 4, 5].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrade(g)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      selectedGrade === g ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Khối {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center">Hạng</th>
                  <th className="py-3 px-3">Lớp học</th>
                  <th className="py-3 px-3 text-center">Điểm chuẩn</th>
                  <th className="py-3 px-4">Điểm cộng / Điểm trừ</th>
                  <th className="py-3 px-3 text-center">Tổng điểm</th>
                  <th className="py-3 px-3 text-center">Danh hiệu</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-black">{item.rank}</td>
                    <td className="py-3 px-3 font-extrabold text-slate-900">{item.className} (Khối {item.grade})</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-600">300</td>
                    <td className="py-3 px-4">
                      {item.bonuses.map((b, idx) => (
                        <div key={idx} className="text-[11px] text-emerald-700 font-medium">
                          +{b.points}đ: {b.reason}
                        </div>
                      ))}
                      {item.penalties.map((p, idx) => (
                        <div key={idx} className="text-[11px] text-rose-600 font-medium">
                          -{p.points}đ: {p.reason}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-base text-slate-900">{item.totalScore}</td>
                    <td className="py-3 px-3 text-center">
                      {item.award === 'CO_NHAT' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white">🚩 CỜ NHẤT</span>
                      ) : item.award === 'CO_NHI' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950">🚩 CỜ NHÌ</span>
                      ) : (
                        <span className="text-slate-500 font-semibold">{item.award}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingClassItem(item)}
                          className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Chỉnh sửa điểm thi đua của lớp"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEmulationClass(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa lớp thi đua"
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
        </div>
      )}

      {/* Modal: Add Class */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Thêm Lớp Học Vào Bảng Thi Đua</h3>
            <form onSubmit={handleCreateClassScore} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên lớp</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="VD: Lớp 4A"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Khối lớp</label>
                <select
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {[1, 2, 3, 4, 5].map(g => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Thêm Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Bonus / Penalty */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Ghi Nhận Điểm Cộng / Trừ Thi Đua</h3>
            <form onSubmit={handleAddEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Chọn lớp</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {emulationList.map(c => (
                    <option key={c.classId} value={c.classId}>{c.className}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setEventType('BONUS'); setEventPoints(10); }}
                  className={`p-2 rounded-lg font-bold border ${
                    eventType === 'BONUS' ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'border-slate-200'
                  }`}
                >
                  + Điểm thưởng
                </button>
                <button
                  type="button"
                  onClick={() => { setEventType('PENALTY'); setEventPoints(5); }}
                  className={`p-2 rounded-lg font-bold border ${
                    eventType === 'PENALTY' ? 'bg-rose-50 text-rose-800 border-rose-400' : 'border-slate-200'
                  }`}
                >
                  - Điểm trừ
                </button>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nội dung ghi nhận</label>
                <input
                  type="text"
                  required
                  value={eventReason}
                  onChange={(e) => setEventReason(e.target.value)}
                  placeholder="VD: Đạt 10 hoa điểm 10..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Số điểm</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={eventPoints}
                  onChange={(e) => setEventPoints(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Lưu Điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Điểm Thi Đua Lớp */}
      {editingClassItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-rose-600" />
                Chỉnh Sửa Điểm & Xếp Hạng Thi Đua Lớp {editingClassItem.className}
              </h3>
              <button
                type="button"
                onClick={() => setEditingClassItem(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const totalScore = calculateEmulationScore({
                  baseScore: editingClassItem.baseScore,
                  disciplineScore: editingClassItem.disciplineScore,
                  cleanlinessScore: editingClassItem.cleanlinessScore,
                  studyScore: editingClassItem.studyScore,
                  movementScore: editingClassItem.movementScore,
                  bonuses: editingClassItem.bonuses,
                  penalties: editingClassItem.penalties
                });
                const updatedItem = {
                  ...editingClassItem,
                  totalScore
                };
                const updatedList = emulationList.map((item) =>
                  item.id === updatedItem.id ? updatedItem : item
                );
                const ranked = rankEmulationList(updatedList);
                onUpdateEmulationList(ranked);
                setEditingClassItem(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên lớp học</label>
                  <input
                    type="text"
                    required
                    value={editingClassItem.className}
                    onChange={(e) =>
                      setEditingClassItem({
                        ...editingClassItem,
                        className: e.target.value,
                        classId: e.target.value
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khối lớp (1 - 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingClassItem.grade}
                    onChange={(e) =>
                      setEditingClassItem({
                        ...editingClassItem,
                        grade: Number(e.target.value)
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Điểm nề nếp (Tối đa 50)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingClassItem.disciplineScore}
                    onChange={(e) =>
                      setEditingClassItem({
                        ...editingClassItem,
                        disciplineScore: Number(e.target.value)
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Điểm vệ sinh (Tối đa 50)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingClassItem.cleanlinessScore}
                    onChange={(e) =>
                      setEditingClassItem({
                        ...editingClassItem,
                        cleanlinessScore: Number(e.target.value)
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Điểm học tập (Tối đa 50)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingClassItem.studyScore}
                    onChange={(e) =>
                      setEditingClassItem({
                        ...editingClassItem,
                        studyScore: Number(e.target.value)
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Điểm phong trào (Tối đa 50)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingClassItem.movementScore}
                    onChange={(e) =>
                      setEditingClassItem({
                        ...editingClassItem,
                        movementScore: Number(e.target.value)
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Danh hiệu tuần</label>
                <select
                  value={editingClassItem.award}
                  onChange={(e) =>
                    setEditingClassItem({
                      ...editingClassItem,
                      award: e.target.value as EmulationScoreItem['award']
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-rose-700"
                >
                  <option value="CO_NHAT">🚩 CỜ NHẤT TUẦN</option>
                  <option value="CO_NHI">🚩 CỜ NHÌ TUẦN</option>
                  <option value="CO_BA">🚩 CỜ BA TUẦN</option>
                  <option value="KHUYEN_KHICH">Khuyến khích</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClassItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Cập Nhật & Xếp Hạng Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
