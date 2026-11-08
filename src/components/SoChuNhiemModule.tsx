/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Send,
  MessageSquare,
  ShieldAlert,
  Search,
  Smartphone,
  CheckCheck,
  Plus,
  Trash2,
  Pencil,
  Upload,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { exportSoChuNhiemToExcel } from '../utils/excel_exporter';
import { StudentProfile, UserProfile, ParentNotification } from '../types/edtech';

interface SoChuNhiemModuleProps {
  currentUser: UserProfile;
  students: StudentProfile[];
  onUpdateStudent: (updated: StudentProfile) => void;
  onAddStudent: (newStudent: StudentProfile) => void;
  onDeleteStudent: (studentId: string) => void;
  onOpenAiTemplateImport?: () => void;
}

export const SoChuNhiemModule: React.FC<SoChuNhiemModuleProps> = ({
  currentUser,
  students,
  onUpdateStudent,
  onAddStudent,
  onDeleteStudent,
  onOpenAiTemplateImport
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAttendance, setFilterAttendance] = useState<string>('ALL');
  const [selectedStudentForMsg, setSelectedStudentForMsg] = useState<StudentProfile | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [messageChannel, setMessageChannel] = useState<'ZALO_OA' | 'SMS_EDU'>('ZALO_OA');
  const [messageTitle, setMessageTitle] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');
  const [sentNotifications, setSentNotifications] = useState<ParentNotification[]>([]);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newStudentForm, setNewStudentForm] = useState({
    fullName: '',
    studentCode: '',
    birthDate: '15/05/2015',
    gender: 'Nam' as 'Nam' | 'Nữ',
    parentName: '',
    parentPhone: '',
    healthStatus: 'Bình thường'
  });

  const filteredStudents = students.filter((s) => {
    if (filterAttendance !== 'ALL' && s.todayAttendance !== filterAttendance) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.parentPhone.includes(q) ||
        s.parentName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const presentCount = students.filter(s => s.todayAttendance === 'CO_MAT').length;
  const excusedCount = students.filter(s => s.todayAttendance === 'NGHI_PHEP').length;
  const unexcusedCount = students.filter(s => s.todayAttendance === 'NGHI_KHONG_PHEP').length;
  const lateCount = students.filter(s => s.todayAttendance === 'DI_MUON').length;

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.fullName.trim()) return;
    const id = `HS-${Date.now()}`;
    const code =
      newStudentForm.studentCode.trim() ||
      `HS-${String(students.length + 1).padStart(3, '0')}`;
    const student: StudentProfile = {
      id,
      ownerUid: currentUser.id,
      studentCode: code,
      fullName: newStudentForm.fullName.trim(),
      birthDate: newStudentForm.birthDate,
      gender: newStudentForm.gender,
      classId: currentUser.className || 'Lớp 4A',
      className: currentUser.className || 'Lớp 4A',
      parentName: newStudentForm.parentName.trim() || 'Phụ huynh học sinh',
      parentPhone: newStudentForm.parentPhone.trim() || '0900000000',
      address: currentUser.district || '',
      todayAttendance: 'CO_MAT',
      healthStatus: newStudentForm.healthStatus.trim() || 'Bình thường',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        newStudentForm.fullName.trim()
      )}`
    };
    onAddStudent(student);
    setNewStudentForm({
      fullName: '',
      studentCode: '',
      birthDate: '15/05/2015',
      gender: 'Nam',
      parentName: '',
      parentPhone: '',
      healthStatus: 'Bình thường'
    });
    setShowAddModal(false);
    setStatusBanner(
      `Đã thêm học sinh "${student.fullName}" vào Sổ Chủ Nhiệm và tự động khởi tạo hồ sơ Đánh giá TT27.`
    );
  };

  const handleMarkAllPresent = () => {
    students.forEach((s) => {
      onUpdateStudent({
        ...s,
        todayAttendance: 'CO_MAT',
        attendanceNote: undefined
      });
    });
    setStatusBanner('Đã điểm danh 100% học sinh có mặt hôm nay.');
  };

  const handleToggleAttendance = (student: StudentProfile, status: StudentProfile['todayAttendance']) => {
    onUpdateStudent({
      ...student,
      todayAttendance: status
    });
  };

  const handleOpenMessageModal = (student: StudentProfile) => {
    setSelectedStudentForMsg(student);
    setMessageTitle(`Thông báo tình hình học tập - Em ${student.fullName}`);
    setMessageContent(
      `Kính gửi Phụ huynh em ${student.fullName} (${student.className} - ${currentUser.schoolName}),\n\nGiáo viên chủ nhiệm (${currentUser.name}) xin thông báo tình hình học tập và rèn luyện của em tại lớp: Em đi học chuyên cần, tích cực tham gia các hoạt động học tập và chấp hành tốt nội quy trường lớp.\n\nTrân trọng cảm ơn sự phối hợp của gia đình!`
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForMsg) return;

    const newNotif: ParentNotification = {
      id: `NOTIF-${Date.now()}`,
      studentId: selectedStudentForMsg.id,
      studentName: selectedStudentForMsg.fullName,
      parentPhone: selectedStudentForMsg.parentPhone,
      channel: messageChannel,
      title: messageTitle,
      content: messageContent,
      sentAt: new Date().toLocaleString('vi-VN'),
      status: 'DELIVERED'
    };

    setSentNotifications([newNotif, ...sentNotifications]);
    setStatusBanner(
      `Đã gửi thông báo Sổ liên lạc điện tử tới phụ huynh em ${selectedStudentForMsg.fullName} (${selectedStudentForMsg.parentPhone}).`
    );
    setSelectedStudentForMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Module Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Bảo mật dữ liệu theo Nghị định 13/2023/NĐ-CP
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              Sổ Chủ Nhiệm & Sổ Liên Lạc Điện Tử ({currentUser.className || 'Lớp phụ trách'})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phụ trách: <strong className="text-slate-800">{currentUser.name}</strong> • Đơn vị: <strong className="text-slate-800">{currentUser.schoolName}</strong> • Sĩ số: <strong className="text-slate-800">{students.length} học sinh</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenAiTemplateImport && (
              <button
                type="button"
                onClick={onOpenAiTemplateImport}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Tải lên danh sách học sinh từ file Excel/Word bằng AI"
              >
                <Upload className="w-4 h-4" />
                Tải Lên File (AI)
              </button>
            )}

            <button
              type="button"
              onClick={() => exportSoChuNhiemToExcel(students, currentUser.className || '4/1')}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Xuất toàn bộ danh sách lớp và Sổ chủ nhiệm ra Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Tải Xuống Excel
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Học Sinh Mới
            </button>
            {students.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Điểm Danh: 100% Có Mặt
              </button>
            )}
          </div>
        </div>

        {statusBanner && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-emerald-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Quick Attendance Counters */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase">Có mặt</span>
              <div className="text-xl font-extrabold text-emerald-950 mt-0.5">{presentCount} HS</div>
            </div>
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase">Nghỉ có phép</span>
              <div className="text-xl font-extrabold text-amber-950 mt-0.5">{excusedCount} HS</div>
            </div>
            <Clock className="w-6 h-6 text-amber-600" />
          </div>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 uppercase">Nghỉ không phép</span>
              <div className="text-xl font-extrabold text-rose-950 mt-0.5">{unexcusedCount} HS</div>
            </div>
            <XCircle className="w-6 h-6 text-rose-600" />
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-sky-800 uppercase">Đi muộn</span>
              <div className="text-xl font-extrabold text-sky-950 mt-0.5">{lateCount} HS</div>
            </div>
            <Clock className="w-6 h-6 text-sky-600" />
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, mã HS, tên phụ huynh, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            aria-label="Lọc theo trạng thái điểm danh"
            value={filterAttendance}
            onChange={(e) => setFilterAttendance(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700"
          >
            <option value="ALL">Tất cả tình trạng điểm danh</option>
            <option value="CO_MAT">Đang có mặt</option>
            <option value="NGHI_PHEP">Nghỉ phép</option>
            <option value="NGHI_KHONG_PHEP">Nghỉ không phép</option>
            <option value="DI_MUON">Đi muộn</option>
          </select>
        </div>
      </div>

      {/* Main Student List & Attendance Table */}
      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              Danh sách lớp học đang trống
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nhấn nút <strong>&quot;Thêm Học Sinh Mới&quot;</strong> để tạo hồ sơ học sinh thực tế của lớp. Học sinh khi thêm sẽ tự động đồng bộ sang Sổ Đánh Giá Thông Tư 27.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm Học Sinh Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Danh Sách Học Sinh & Điểm Danh Điện Tử
            </h3>
            <span className="text-xs text-slate-500">
              Hiển thị <strong>{filteredStudents.length}</strong> học sinh
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Mã HS / Họ và tên</th>
                  <th className="py-3 px-3">Ngày sinh / Giới tính</th>
                  <th className="py-3 px-3">Thông tin Phụ huynh</th>
                  <th className="py-3 px-3">Tình trạng sức khỏe</th>
                  <th className="py-3 px-3 text-center">Điểm danh hôm nay</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={student.avatarUrl}
                          alt={student.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{student.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{student.studentCode}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">{student.birthDate}</div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          student.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {student.gender}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{student.parentName}</div>
                      <div className="text-[11px] text-indigo-600 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-indigo-400" />
                        {student.parentPhone}
                      </div>
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <span className="text-slate-600 text-xs">{student.healthStatus}</span>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex rounded-lg p-1 bg-slate-100 gap-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(student, 'CO_MAT')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            student.todayAttendance === 'CO_MAT'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Có mặt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(student, 'NGHI_PHEP')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            student.todayAttendance === 'NGHI_PHEP'
                              ? 'bg-amber-500 text-slate-950 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Phép
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(student, 'NGHI_KHONG_PHEP')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            student.todayAttendance === 'NGHI_KHONG_PHEP'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          KP
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingStudent(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                          title="Chỉnh sửa hồ sơ học sinh"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenMessageModal(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Nhắn PH
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(student.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa học sinh"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Sent Notifications Log (if any) */}
      {sentNotifications.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            Nhật Ký Tin Nhắn Sổ Liên Lạc Điện Tử Vừa Gửi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sentNotifications.map((notif) => (
              <div key={notif.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-600 text-white">
                      {notif.channel === 'ZALO_OA' ? 'ZALO OA' : 'SMS EDU'}
                    </span>
                    {notif.studentName} ({notif.parentPhone})
                  </span>
                  <span className="text-[10px] text-slate-400">{notif.sentAt}</span>
                </div>
                <div className="font-semibold text-slate-800">{notif.title}</div>
                <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-line">
                  {notif.content}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                  <span>Đơn vị: {currentUser.schoolName}</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" /> Đã gửi thành công
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Thêm Học Sinh Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Thêm Học Sinh Vào Sổ Chủ Nhiệm ({currentUser.className || 'Lớp phụ trách'})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Họ và tên học sinh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.fullName}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, fullName: e.target.value })}
                    placeholder="VD: Trần Minh Khôi"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Mã định danh học sinh
                  </label>
                  <input
                    type="text"
                    value={newStudentForm.studentCode}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, studentCode: e.target.value })}
                    placeholder="Tự động tạo nếu để trống"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ngày sinh</label>
                  <input
                    type="text"
                    value={newStudentForm.birthDate}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, birthDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giới tính</label>
                  <select
                    value={newStudentForm.gender}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, gender: e.target.value as 'Nam' | 'Nữ' })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Họ tên Phụ huynh</label>
                  <input
                    type="text"
                    value={newStudentForm.parentName}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, parentName: e.target.value })}
                    placeholder="Nhập họ tên cha/mẹ..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={newStudentForm.parentPhone}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, parentPhone: e.target.value })}
                    placeholder="09xxxxxxxx"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs"
                >
                  Lưu Hồ Sơ Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gửi tin nhắn OTT Phụ Huynh */}
      {selectedStudentForMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Sổ Liên Lạc Điện Tử: Gửi Tin Nhắn Phụ Huynh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đến: PH em <strong>{selectedStudentForMsg.fullName}</strong> ({selectedStudentForMsg.parentPhone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForMsg(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMessageChannel('ZALO_OA')}
                  className={`p-2.5 rounded-lg border text-left font-semibold transition-all ${
                    messageChannel === 'ZALO_OA'
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs">Zalo OA Giáo Dục</div>
                  <span className="text-[10px] text-slate-500">Thông báo tức thì</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMessageChannel('SMS_EDU')}
                  className={`p-2.5 rounded-lg border text-left font-semibold transition-all ${
                    messageChannel === 'SMS_EDU'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs">SMS Brandname</div>
                  <span className="text-[10px] text-slate-500">{currentUser.schoolName}</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nội dung tin nhắn</label>
                <textarea
                  rows={4}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForMsg(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Gửi Thông Báo Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Hồ Sơ Học Sinh */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Chỉnh Sửa Hồ Sơ Học Sinh & Sổ Chủ Nhiệm
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateStudent(editingStudent);
                setStatusBanner(`Đã cập nhật thành công hồ sơ học sinh "${editingStudent.fullName}".`);
                setEditingStudent(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên học sinh</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.fullName}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, fullName: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã học sinh (Cơ sở dữ liệu ngành)</label>
                  <input
                    type="text"
                    value={editingStudent.studentCode}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, studentCode: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-purple-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày sinh</label>
                  <input
                    type="text"
                    value={editingStudent.birthDate}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, birthDate: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        gender: e.target.value as 'Nam' | 'Nữ'
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lớp</label>
                  <input
                    type="text"
                    value={editingStudent.className || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, className: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ tên Phụ huynh</label>
                  <input
                    type="text"
                    value={editingStudent.parentName}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, parentName: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại phụ huynh</label>
                  <input
                    type="text"
                    value={editingStudent.parentPhone}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, parentPhone: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ cư trú</label>
                <input
                  type="text"
                  value={editingStudent.address || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, address: e.target.value })
                  }
                  placeholder="VD: Phường Phú Bài, Thị xã Hương Thủy..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng sức khỏe</label>
                  <input
                    type="text"
                    value={editingStudent.healthStatus || 'Bình thường'}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, healthStatus: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Điểm danh hôm nay</label>
                  <select
                    value={editingStudent.todayAttendance}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        todayAttendance: e.target.value as StudentProfile['todayAttendance']
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="CO_MAT">Có mặt</option>
                    <option value="NGHI_PHEP">Nghỉ có phép</option>
                    <option value="NGHI_KHONG_PHEP">Nghỉ không phép</option>
                    <option value="DI_MUON">Đi muộn</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
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
