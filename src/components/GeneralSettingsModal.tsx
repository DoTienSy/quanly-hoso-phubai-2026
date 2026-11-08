/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { School, User, ShieldCheck, Save, X, Calendar, Award } from 'lucide-react';
import { UserProfile, UserRole } from '../types/edtech';

interface GeneralSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSaveProfile: (updated: UserProfile) => Promise<void> | void;
}

export const GeneralSettingsModal: React.FC<GeneralSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile
}) => {
  const [formData, setFormData] = useState<UserProfile>(currentUser);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(currentUser);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Thiết Lập & Chỉnh Sửa Thông Tin Chung
              </h3>
              <p className="text-xs text-slate-500">
                Cập nhật thông tin Trường học, Năm học, Lớp phụ trách và Chứng thư ký số SmartCA ({currentUser.email || 'Tài khoản Gmail'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Thông tin đơn vị trường học */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <School className="w-4 h-4 text-blue-600" />
              1. Thông tin Đơn vị Trường Tiểu học & Năm học
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên trường Tiểu học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="VD: Trường Tiểu học Phú Bài"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mã trường (CSDL Ngành BGD)
                </label>
                <input
                  type="text"
                  value={formData.schoolCode || ''}
                  onChange={(e) => setFormData({ ...formData, schoolCode: e.target.value })}
                  placeholder="VD: 460012"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Phòng GD&ĐT / Quận / Huyện / Thị xã
                </label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="VD: TX. Hương Thủy, TP. Huế"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Năm học
                  </label>
                  <input
                    type="text"
                    value={formData.schoolYear || '2024 - 2025'}
                    onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                    placeholder="2024 - 2025"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Tuần học hiện tại
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="35"
                    value={formData.currentWeek || 1}
                    onChange={(e) => setFormData({ ...formData, currentWeek: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Thông tin Cán bộ / Giáo viên */}
          <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200 space-y-3">
            <div className="font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <User className="w-4 h-4 text-blue-600" />
              2. Thông tin Cán bộ / Giáo viên & Phân công Chuyên môn
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Họ và tên Cán bộ / Giáo viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập họ và tên của Thầy/Cô..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Vai trò trên hệ thống
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GVCN">Giáo viên Chủ nhiệm (GVCN)</option>
                  <option value="BGH">Ban Giám Hiệu (Hiệu trưởng / Phó HT)</option>
                  <option value="GVBM">Giáo viên Bộ môn (GVBM)</option>
                  <option value="TPT_DOI">Tổng Phụ trách Đội (TPT Đội)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Chức danh / Nhiệm vụ hiển thị
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: Giáo viên chủ nhiệm Lớp 4A"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lớp chủ nhiệm / Phụ trách chính
                </label>
                <input
                  type="text"
                  value={formData.className || ''}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  placeholder="VD: Lớp 4A"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Mã Chứng thư Chữ ký số cá nhân (SmartCA)
                </label>
                <input
                  type="text"
                  value={formData.signatureCertId}
                  onChange={(e) => setFormData({ ...formData, signatureCertId: e.target.value })}
                  placeholder="VD: VN-SMARTCA-8899"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Đang lưu thông tin...' : 'Lưu Thông Tin Chung'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
