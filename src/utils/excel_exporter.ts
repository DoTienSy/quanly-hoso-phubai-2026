import * as XLSX from 'xlsx';
import {
  LessonRecord,
  StudentProfile,
  StudentTT27Record,
  BoardingStudentRecord,
  BoardingMenuRecord,
  EmulationScoreItem,
  TimetableSlot
} from '../types/edtech';

/**
 * Trình hỗ trợ tải file Excel (.xlsx) về máy client
 */
export function downloadExcelFile(wb: XLSX.WorkBook, fileName: string) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. Xuất Sổ Đầu Bài ra file Excel chuẩn tuần / học kỳ
 */
export function exportSoDauBaiToExcel(
  lessons: LessonRecord[],
  weekNumber: number,
  className: string = '4/1'
) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['TRƯỜNG TIỂU HỌC PHÚ BÀI', '', '', '', '', '', '', '', ''],
    ['SỔ ĐẦU BÀI ĐIỆN TỬ - TUẦN ' + weekNumber, '', '', '', '', '', '', '', ''],
    ['Lớp: ' + className + ' | Năm học: 2026 - 2027', '', '', '', '', '', '', '', ''],
    ['Ngày xuất: ' + new Date().toLocaleDateString('vi-VN'), '', '', '', '', '', '', '', ''],
    []
  ];

  const headers = [
    'Thứ, Ngày',
    'Buổi',
    'Tiết',
    'Môn học / HĐGD',
    'Tiết PPCT',
    'Tên bài dạy / Nội dung công việc',
    'HS vắng',
    'Nhận xét tiết học',
    'Giáo viên dạy',
    'Xếp loại',
    'Ký số'
  ];

  const dataRows = lessons.map((l) => [
    `${l.dayOfWeek} (${l.date})`,
    l.session === 'SANG' ? 'Sáng' : 'Chiều',
    l.period,
    l.subject,
    l.ppctNumber || '',
    l.lessonName,
    l.absentNotes || '0',
    l.notes || l.lessonContentSummary || 'Tiết học sôi nổi, nền nếp tốt.',
    l.teacherName,
    l.classDisciplineRank || 'Tốt',
    l.signatureHash || 'SMARTCA-KYSO-THPB'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows]);

  // Độ rộng cột gợi ý
  ws['!cols'] = [
    { wch: 18 },
    { wch: 8 },
    { wch: 6 },
    { wch: 18 },
    { wch: 10 },
    { wch: 38 },
    { wch: 10 },
    { wch: 35 },
    { wch: 22 },
    { wch: 10 },
    { wch: 22 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `So_Dau_Bai_T${weekNumber}`);
  downloadExcelFile(wb, `So_Dau_Bai_Lop_${className.replace('/', '_')}_Tuan_${weekNumber}.xlsx`);
}

/**
 * 2. Xuất Sổ Chủ Nhiệm / Danh Sách Học Sinh ra file Excel
 */
export function exportSoChuNhiemToExcel(
  students: StudentProfile[],
  className: string = '4/1'
) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['TRƯỜNG TIỂU HỌC PHÚ BÀI', '', '', '', '', '', '', '', ''],
    ['SỔ CHỦ NHIỆM - DANH SÁCH HỌC SINH', '', '', '', '', '', '', '', ''],
    ['Lớp: ' + className + ' | Sĩ số: ' + students.length + ' học sinh', '', '', '', '', '', '', '', ''],
    ['Năm học: 2026 - 2027', '', '', '', '', '', '', '', ''],
    []
  ];

  const headers = [
    'STT',
    'Mã định danh',
    'Họ và tên',
    'Ngày sinh',
    'Giới tính',
    'Lớp',
    'Họ tên Phụ huynh',
    'Số điện thoại',
    'Địa chỉ cư trú',
    'Tình trạng sức khỏe / Bán trú'
  ];

  const dataRows = students.map((s, idx) => [
    idx + 1,
    s.studentCode || '',
    s.fullName,
    s.birthDate || '',
    s.gender,
    s.className,
    s.parentName || '',
    s.parentPhone || '',
    s.address || 'Phường Phú Bài, TX. Hương Thủy',
    s.healthStatus || 'Bình thường'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 26 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 24 },
    { wch: 14 },
    { wch: 32 },
    { wch: 28 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'So_Chu_Nhiem');
  downloadExcelFile(wb, `So_Chu_Nhiem_Lop_${className.replace('/', '_')}.xlsx`);
}

/**
 * 3. Xuất Bảng Đánh Giá Môn Học & Năng Lực Phẩm Chất TT27 ra file Excel
 */
export function exportTheoDoiTT27ToExcel(
  records: StudentTT27Record[],
  className: string = '4/1',
  periodLabel: string = 'Giữa Học Kì I'
) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['TRƯỜNG TIỂU HỌC PHÚ BÀI', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['BẢNG TỔNG HỢP ĐÁNH GIÁ KẾT QUẢ HỌC TẬP & RÈN LUYỆN (THÔNG TƯ 27/2020/TT-BGDĐT)', '', '', '', '', '', '', '', '', '', '', '', ''],
    [`Lớp: ${className} | Đợt đánh giá: ${periodLabel} | Năm học: 2026 - 2027`, '', '', '', '', '', '', '', '', '', '', '', ''],
    []
  ];

  const headers = [
    'STT',
    'Họ và tên học sinh',
    'Toán (Mức)',
    'Toán (Điểm)',
    'Tiếng Việt (Mức)',
    'Tiếng Việt (Điểm)',
    'Tiếng Anh',
    'Tin học',
    'Năng lực cốt lõi',
    'Phẩm chất chủ yếu',
    'Xếp loại chung TT27',
    'Lời nhận xét sư phạm'
  ];

  const dataRows = records.map((r, idx) => [
    idx + 1,
    r.studentName,
    r.subjects.toan.level,
    r.subjects.toan.periodicScore ?? '',
    r.subjects.tiengViet.level,
    r.subjects.tiengViet.periodicScore ?? '',
    r.subjects.tiengAnh.level,
    r.subjects.tinHoc.level,
    r.competencies.tuChuTuHoc,
    r.qualities.chamChi,
    r.holisticStanding,
    r.holisticComment || ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 45 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Gia_TT27');
  downloadExcelFile(wb, `Danh_Gia_TT27_Lop_${className.replace('/', '_')}_${periodLabel.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * 4. Xuất Sổ Bán Trú, Bàn Giao & Thực Đơn Dinh Dưỡng ra file Excel
 */
export function exportBanTruToExcel(
  records: BoardingStudentRecord[],
  menus: BoardingMenuRecord[],
  className: string = '4/1',
  dateStr: string = new Date().toLocaleDateString('vi-VN')
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Danh sách ăn ngủ & bàn giao bán trú
  const titleHS = [
    ['TRƯỜNG TIỂU HỌC PHÚ BÀI', '', '', '', '', '', '', '', ''],
    ['SỔ THEO DÕI BÁN TRÚ & BÀN GIAO 2 BUỔI', '', '', '', '', '', '', '', ''],
    [`Lớp: ${className} | Ngày: ${dateStr} | Năm học: 2026 - 2027`, '', '', '', '', '', '', '', ''],
    ['Nguyên tắc: "Một kế hoạch – một quy trình – một tiêu chuẩn chất lượng – hai cơ sở thực hiện"', '', '', '', '', '', '', '', ''],
    []
  ];

  const headersHS = [
    'STT',
    'Mã học sinh',
    'Họ và tên',
    'Cơ sở',
    'Bàn giao sáng (10h30)',
    'Điểm danh ăn',
    'Khẩu phần ăn',
    'Giấc ngủ trưa',
    'Bàn giao chiều (13h45)',
    'Thân nhiệt & Dị ứng',
    'Nhận xét bán trú'
  ];

  const dataRowsHS = records.map((r, idx) => [
    idx + 1,
    r.studentId,
    r.studentName,
    r.campus || 'Trường chính',
    r.handoverMorningConfirmed ? 'ĐÃ BÀN GIAO' : 'CHƯA',
    r.mealAttendance === 'CO_AN' ? 'Có ăn' : r.mealAttendance === 'CHE_DO_RIENG' ? 'Chế độ riêng' : 'Nghỉ phép',
    r.portionStatus === 'HET_SUAT' ? 'Hết suất' : r.portionStatus === 'CON_THUA' ? 'Còn thừa' : 'Cần hỗ trợ',
    r.napStatus === 'NGU_TOT' ? 'Ngủ ngoan' : r.napStatus === 'KHO_NGU' ? 'Khó ngủ' : 'Theo dõi SK',
    r.handoverAfternoonConfirmed ? 'ĐÃ BÀN GIAO' : 'CHƯA',
    `${r.healthTemperature || '36.6°C'} | ${r.specialDietNote || 'Không dị ứng'}`,
    r.teacherNote || ''
  ]);

  const wsHS = XLSX.utils.aoa_to_sheet([...titleHS, headersHS, ...dataRowsHS]);
  wsHS['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 25 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 28 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsHS, 'Diem_Danh_Ban_Tru');

  // Sheet 2: Thực đơn dinh dưỡng & Kiểm thực 3 bước
  const titleMenu = [
    ['TRƯỜNG TIỂU HỌC PHÚ BÀI', '', '', '', '', '', '', '', ''],
    ['THỰC ĐƠN TUẦN & KIỂM THỰC 3 BƯỚC (QĐ 1246/QĐ-BYT)', '', '', '', '', '', '', '', ''],
    ['Lưu mẫu thức ăn 24/24 giờ niêm phong chuyên dụng', '', '', '', '', '', '', '', ''],
    []
  ];

  const headersMenu = [
    'Thứ trong tuần',
    'Ngày áp dụng',
    'Năng lượng (Kcal)',
    'Món mặn chính',
    'Món xào',
    'Món canh',
    'Bữa phụ chiều',
    'B1. Kiểm tra nhập thực phẩm',
    'B2. Chế biến bếp một chiều',
    'B3. Lưu mẫu 24/24h',
    'Chữ ký số SmartCA'
  ];

  const dataRowsMenu = menus.map((m) => [
    m.dayOfWeek,
    m.date,
    m.caloriesKcal || 700,
    m.lunchMainDish,
    m.lunchSideDish,
    m.lunchSoup,
    m.afternoonSnack,
    m.step1InputCheck === 'DAT' ? 'ĐẠT CHUẨN' : 'KHÔNG ĐẠT',
    m.step2ProcessingCheck === 'DAT' ? 'ĐẠT VỆ SINH' : 'KHÔNG ĐẠT',
    m.step3SampleSaved === 'DA_LUU_MAU_24H' ? 'ĐÃ LƯU 24/24H' : 'CHƯA',
    m.signatureHash || 'SMARTCA-ATTP-THPB'
  ]);

  const wsMenu = XLSX.utils.aoa_to_sheet([...titleMenu, headersMenu, ...dataRowsMenu]);
  wsMenu['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 24 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMenu, 'Thuc_Don_Kiem_Thuc');

  downloadExcelFile(wb, `So_Ban_Tru_Truong_Tieu_Hoc_Phu_Bai_${className.replace('/', '_')}.xlsx`);
}

/**
 * 5. Xuất Bảng Xếp Hạng Thi Đua ra file Excel
 */
export function exportThiDuaToExcel(
  emulationList: EmulationScoreItem[],
  weekNumber: number = 10
) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['TRƯỜNG TIỂU HỌC PHÚ BÀI', '', '', '', '', '', '', ''],
    ['BẢNG TỔNG HỢP CHẤM ĐIỂM & XẾP HẠNG THI ĐUA - TUẦN ' + weekNumber, '', '', '', '', '', '', ''],
    ['Năm học: 2026 - 2027', '', '', '', '', '', '', ''],
    []
  ];

  const headers = [
    'Xếp hạng',
    'Lớp',
    'Khối',
    'Điểm Chuyên cần',
    'Điểm Nền nếp',
    'Điểm Học tập',
    'Điểm Phong trào',
    'Tổng điểm',
    'Xếp loại',
    'Danh hiệu khen thưởng'
  ];

  const dataRows = emulationList.map((e, idx) => [
    idx + 1,
    e.className,
    e.grade,
    e.attendanceScore,
    e.disciplineScore,
    e.studyScore,
    e.activityScore,
    e.totalScore,
    e.rankCategory,
    e.rewardTitle || 'Lớp Tiến Tiến'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows]);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Thi_Dua_Tuan_${weekNumber}`);
  downloadExcelFile(wb, `Thi_Dua_Toan_Truong_Tuan_${weekNumber}.xlsx`);
}

/**
 * 6. Xuất Thời Khóa Biểu ra file Excel
 */
export function exportThoiKhoaBieuToExcel(
  timetableSlots: TimetableSlot[],
  className: string = '4/1'
) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['TRƯỜNG TIỂU HỌC PHÚ BÀI', '', '', '', '', '', ''],
    ['THỜI KHÓA BIỂU HỌC TẬP - LỚP ' + className, '', '', '', '', '', ''],
    ['Áp dụng học kỳ I năm học 2026 - 2027', '', '', '', '', '', ''],
    []
  ];

  const headers = [
    'Thứ trong tuần',
    'Buổi',
    'Tiết',
    'Môn học / HĐGD',
    'Giáo viên giảng dạy',
    'Phòng học / Ghi chú'
  ];

  const dataRows = timetableSlots.map((t) => [
    t.dayOfWeek,
    t.session === 'SANG' ? 'Sáng' : 'Chiều',
    t.period,
    t.subject,
    t.teacherName,
    t.room || 'Phòng 4/1'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows]);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 10 },
    { wch: 8 },
    { wch: 22 },
    { wch: 25 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `TKB_Lop_${className.replace('/', '_')}`);
  downloadExcelFile(wb, `Thoi_Khoa_Bieu_Lop_${className.replace('/', '_')}.xlsx`);
}
