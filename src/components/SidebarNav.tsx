/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BookOpen,
  BookMarked,
  Trophy,
  ClipboardList,
  GraduationCap,
  FileText,
  NotebookPen,
  CalendarDays,
  Utensils,
  Check
} from 'lucide-react';

interface SidebarNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMonthlyReport: () => void;
  onOpenAiTemplateImport: () => void;
}

interface NavItemConfig {
  id: string;
  title: string;
  subtitle: string;
  gradientClass: string;
  iconBgClass: string;
  iconColorClass: string;
  Icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenAiTemplateImport
}) => {
  const items: NavItemConfig[] = [
    {
      id: 'SO_DAU_BAI',
      title: 'SỔ ĐẦU BÀI',
      subtitle: 'Ghi đầu bài hằng ngày',
      gradientClass: 'bg-linear-to-r from-[#00a651] to-[#008540]',
      iconBgClass: 'bg-amber-400 border-amber-200',
      iconColorClass: 'text-amber-950',
      Icon: BookOpen
    },
    {
      id: 'SO_CHU_NHIEM',
      title: 'SỔ CHỦ NHIỆM',
      subtitle: 'Hồ sơ lớp chủ nhiệm',
      gradientClass: 'bg-linear-to-r from-[#f7941d] to-[#e06a10]',
      iconBgClass: 'bg-sky-600 border-sky-200',
      iconColorClass: 'text-white',
      Icon: BookMarked
    },
    {
      id: 'THI_DUA',
      title: 'THI ĐUA',
      subtitle: 'Tự chấm, duyệt, xếp loại',
      gradientClass: 'bg-linear-to-r from-[#8750e8] to-[#6835c4]',
      iconBgClass: 'bg-amber-400/20 border-amber-300/40',
      iconColorClass: 'text-amber-300',
      Icon: Trophy
    },
    {
      id: 'AI_PRO_HUB',
      title: 'SỔ HỘI HỌP',
      subtitle: 'Biên bản, nhiệm vụ cuộc họp',
      gradientClass: 'bg-linear-to-r from-[#1f8a7d] to-[#15695f]',
      iconBgClass: 'bg-white/90 border-teal-200',
      iconColorClass: 'text-teal-800',
      Icon: ClipboardList
    },
    {
      id: 'THEO_DOI_TT27',
      title: 'THEO DÕI MÔN',
      subtitle: 'Đánh giá học sinh theo TT27',
      gradientClass: 'bg-linear-to-r from-[#589442] to-[#3f742c]',
      iconBgClass: 'bg-emerald-300 border-white',
      iconColorClass: 'text-emerald-950',
      Icon: GraduationCap
    },
    {
      id: 'VAN_BAN_AI',
      title: 'VĂN BẢN',
      subtitle: 'Quyết định, tờ trình, công văn',
      gradientClass: 'bg-linear-to-r from-[#7a5d4f] to-[#594136]',
      iconBgClass: 'bg-white/90 border-stone-300',
      iconColorClass: 'text-stone-700',
      Icon: FileText,
      onClick: () => {
        onSelectTab('AI_PRO_HUB');
      }
    },
    {
      id: 'DASHBOARD',
      title: 'KẾ HOẠCH',
      subtitle: 'Báo cáo AI, xuất Word/PDF',
      gradientClass: 'bg-linear-to-r from-[#785ef0] to-[#5b41d6]',
      iconBgClass: 'bg-amber-300 border-white',
      iconColorClass: 'text-indigo-950',
      Icon: NotebookPen
    },
    {
      id: 'THOI_KHOA_BIEU',
      title: 'THỜI KHÓA BIỂU',
      subtitle: 'Xếp, sửa, xuất Excel',
      gradientClass: 'bg-linear-to-r from-[#219690] to-[#17736e]',
      iconBgClass: 'bg-white/90 border-rose-200',
      iconColorClass: 'text-rose-600',
      Icon: CalendarDays
    },
    {
      id: 'QUAN_LY_BAN_TRU',
      title: 'BÁN TRÚ & MẪU AI',
      subtitle: 'Bán trú, tải hồ sơ mẫu AI',
      gradientClass: 'bg-linear-to-r from-[#d946ef] to-[#9333ea]',
      iconBgClass: 'bg-white/90 border-fuchsia-200',
      iconColorClass: 'text-purple-700',
      Icon: Utensils
    }
  ];

  return (
    <aside className="w-full lg:w-[216px] shrink-0 flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 select-none">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        const IconComponent = item.Icon;

        return (
          <div key={item.id} className="relative shrink-0 w-[195px] lg:w-full pt-1 pr-1">
            {/* Yellow Active Checkmark Badge on Top-Right Corner (Matches Reference Image) */}
            {isActive && (
              <div className="absolute -top-0.5 -right-0.5 z-20 w-6 h-6 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-amber-400 flex items-center justify-center text-amber-950">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else {
                  onSelectTab(item.id);
                }
              }}
              className={`w-full text-left rounded-2xl px-3.5 py-2.5 text-white transition-all flex items-center gap-3 cursor-pointer border-2 ${
                item.gradientClass
              } ${
                isActive
                  ? 'border-emerald-900/80 ring-2 ring-emerald-600/40 shadow-[0_6px_14px_rgba(0,0,0,0.18)] scale-[1.01]'
                  : 'border-white shadow-sm hover:brightness-105 hover:shadow-md opacity-95'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs ${item.iconBgClass} ${item.iconColorClass}`}
              >
                <IconComponent className="w-4 h-4" />
              </div>

              <div className="min-w-0 leading-tight">
                <div className="font-black text-xs sm:text-[13px] uppercase tracking-wide truncate drop-shadow-2xs">
                  {item.title}
                </div>
                <div className="text-[10.5px] text-white/90 font-medium truncate mt-0.5">
                  {item.subtitle}
                </div>
              </div>
            </button>
          </div>
        );
      })}

      {/* Quick AI Template Upload Action Card */}
      <button
        type="button"
        onClick={onOpenAiTemplateImport}
        className="shrink-0 w-[195px] lg:w-full rounded-xl px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <span>📤 Tải File Hồ Sơ Mẫu (AI)</span>
      </button>
    </aside>
  );
};
