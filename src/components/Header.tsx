/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckSquare,
  BarChart3,
  Award,
  Settings,
  KeyRound,
  LogOut,
  Upload,
  ShieldCheck
} from 'lucide-react';
import { UserProfile } from '../types/edtech';

interface HeaderProps {
  currentUser: UserProfile;
  onOpenSettings: () => void;
  onOpenAiTemplateImport: () => void;
  onLogout: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenSettings,
  onOpenAiTemplateImport,
  onLogout,
  activeTab,
  onSelectTab
}) => {
  const roleLabel =
    currentUser.role === 'BGH'
      ? 'Phó Hiệu trưởng'
      : currentUser.title || 'Giáo viên Chủ nhiệm';

  return (
    <header className="w-full bg-white shadow-xs select-none">
      {/* Top Hero Banner matching Trường Tiểu học Phú Bài reference design */}
      <div className="max-w-[1360px] mx-auto px-2 sm:px-4 pt-2">
        <div className="relative w-full h-[185px] sm:h-[198px] rounded-t-lg overflow-hidden border-b-[4px] border-amber-400 bg-[#0d4e9e] shadow-sm">
          {/* Right-side Campus Flag Ceremony Photo Background from Reference Asset */}
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: "url('/assets/aistudio/giao_dien_c5219821.jpg')",
              backgroundSize: '103.8% 342%',
              backgroundPosition: '50% 3.3%'
            }}
          />

          {/* Subtle gradient overlay on right to ensure interactive controls pop */}
          <div className="absolute inset-y-0 right-0 w-[58%] bg-linear-to-b from-slate-950/35 via-transparent to-black/15 pointer-events-none" />

          {/* Left Curved Royal Blue Identity Panel */}
          <div className="relative z-10 h-full w-full md:w-[54%] lg:w-[51%] bg-linear-to-br from-[#07428c] via-[#105bb5] to-[#297ce0] rounded-r-[150px] border-r-[5px] border-white/85 shadow-[8px_0_24px_rgba(0,0,0,0.28)] px-4 sm:px-6 py-3.5 flex flex-col justify-between">
            {/* Top Row: School Crest + Official Titles */}
            <div className="flex items-center gap-3.5">
              {/* School Emblem Box */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1 shadow-md border-2 border-sky-200 flex items-center justify-center shrink-0 overflow-hidden">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  aria-label="Logo Trường Tiểu học Phú Bài"
                >
                  <circle cx="50" cy="50" r="46" fill="#0d47a1" stroke="#f59e0b" strokeWidth="4" />
                  <circle cx="50" cy="50" r="39" fill="#ffffff" stroke="#ef4444" strokeWidth="3" />
                  <polygon points="50,14 82,50 50,86 18,50" fill="#e11d48" opacity="0.9" />
                  <circle cx="50" cy="50" r="21" fill="#1e40af" stroke="#fbbf24" strokeWidth="2.5" />
                  {/* Open Book & Torch */}
                  <path
                    d="M35 55 Q50 49 65 55 L65 65 Q50 59 35 65 Z"
                    fill="#ffffff"
                  />
                  <path
                    d="M50 28 C55 35 56 41 50 47 C44 41 45 35 50 28 Z"
                    fill="#fbbf24"
                  />
                  <text
                    x="50"
                    y="77"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    PHÚ BÀI
                  </text>
                </svg>
              </div>

              <div className="min-w-0 leading-tight">
                <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-sky-100 drop-shadow-2xs">
                  UBND PHƯỜNG PHÚ BÀI
                </div>
                <h1 className="text-lg sm:text-[23px] font-black uppercase tracking-tight text-white drop-shadow-xs truncate">
                  {currentUser.schoolName || 'TRƯỜNG TIỂU HỌC PHÚ BÀI'}
                </h1>
                <div className="text-[10px] sm:text-[11.5px] font-bold uppercase tracking-wide text-sky-100/95 mt-0.5">
                  CHUYỂN ĐỔI SỐ - HỆ THỐNG QUẢN LÍ HỒ SƠ
                </div>
              </div>
            </div>

            {/* Middle Row: Golden Italic Motto */}
            <div className="pl-2 sm:pl-4 my-auto">
              <p className="text-amber-300 italic font-bold text-sm sm:text-[17px] tracking-wide drop-shadow-xs">
                &ldquo; Nhẹ hồ sơ, không nhẹ trách nhiệm &rdquo;
              </p>
            </div>

            {/* Bottom Row: 3 Sub-Mode Pills (Ghi sổ | Tổng quan tuần | Xếp loại) */}
            <div className="inline-flex items-center bg-[#062d61]/85 backdrop-blur-xs p-1 rounded-xl border border-white/15 w-fit shadow-inner gap-1">
              <button
                type="button"
                onClick={() => onSelectTab('SO_DAU_BAI')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'SO_DAU_BAI'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-sky-100 hover:bg-white/10'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ghi sổ</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('DASHBOARD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-sky-100 hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Tổng quan tuần</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('THI_DUA')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'THI_DUA'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-sky-100 hover:bg-white/10'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-sky-400" />
                <span>Xếp loại</span>
              </button>
            </div>
          </div>

          {/* Top-Right User & Action Control Box (Matches Reference Image Top-Right Overlay) */}
          <div className="hidden md:flex flex-col items-end gap-1.5 absolute top-2.5 right-3 z-20 bg-[#102a43]/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/25 shadow-lg">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-white tracking-wide">
                {currentUser.name || 'Võ Thị Kim Oanh'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-900/90 border border-teal-400/40 text-teal-100 font-bold text-[11px]">
                {roleLabel} - Tuần {currentUser.currentWeek || 9}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-[11px] border border-white/20 flex items-center gap-1 transition-all cursor-pointer"
                title="Quản trị & Sửa thông tin chung"
              >
                <Settings className="w-3 h-3 text-sky-300" />
                <span>Quản trị</span>
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-[11px] border border-white/20 flex items-center gap-1 transition-all cursor-pointer"
                title={`Chứng thư số SmartCA: ${currentUser.signatureCertId}`}
              >
                <KeyRound className="w-3 h-3 text-amber-400" />
                <span>Đổi mã PIN</span>
              </button>

              <button
                type="button"
                onClick={onOpenAiTemplateImport}
                className="px-2.5 py-1 rounded-lg bg-indigo-700/90 hover:bg-indigo-600 text-white font-bold text-[11px] border border-indigo-300/30 flex items-center gap-1 transition-all cursor-pointer"
                title="Tải file hồ sơ mẫu lên áp dụng bằng AI"
              >
                <Upload className="w-3 h-3 text-amber-300" />
                <span>Hồ sơ AI</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-rose-700 text-white font-bold text-[11px] border border-white/20 flex items-center gap-1 transition-all cursor-pointer"
              >
                <LogOut className="w-3 h-3 text-rose-300" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>

          {/* Mobile Action Bar Fallback */}
          <div className="flex md:hidden items-center justify-end gap-1.5 absolute top-2 right-2 z-20">
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2 py-1 rounded-lg bg-slate-900/80 text-white text-[10px] font-bold border border-white/20"
            >
              Quản trị
            </button>
            <button
              type="button"
              onClick={onOpenAiTemplateImport}
              className="px-2 py-1 rounded-lg bg-indigo-700/90 text-white text-[10px] font-bold border border-white/20"
            >
              Hồ sơ AI
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-2 py-1 rounded-lg bg-rose-700/90 text-white text-[10px] font-bold border border-white/20"
            >
              Thoát
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
