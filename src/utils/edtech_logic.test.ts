/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTT27Standing,
  calculateEmulationScore,
  rankEmulationList,
  detectTimetableConflicts,
  generateDigitalSignature,
  createBlankTT27Record,
  synthesizePersonalizedComment,
  synthesizeHolisticTT27Evaluation,
  compileMonthlyReportData,
  calculateBoardingDailyStats,
  synthesizeBoardingCareComment,
  parseUploadedTemplateContent,
  detectSpecialSupportStudents,
  analyzeLearningTrendsFromTT27,
  createMultiTierTT27SampleDataset,
  isMojibakeOrBinary,
  sanitizeVietnameseText,
  isValidVietnameseStudentName
} from './edtech_logic';
import {
  SubjectEvaluation,
  TimetableSlot,
  EmulationScoreItem,
  UserProfile,
  LessonRecord,
  BoardingStudentRecord,
  BoardingMenuRecord
} from '../types/edtech';

test('calculateTT27Standing: accurately classifies Xuat Sac student under TT27', () => {
  const subjects: Record<string, SubjectEvaluation> = {
    toan: { subjectId: 'toan', subjectName: 'Toán', level: 'T', periodicScore: 10, teacherComment: 'Tư duy logic rất tốt' },
    tiengViet: { subjectId: 'tiengViet', subjectName: 'Tiếng Việt', level: 'T', periodicScore: 9, teacherComment: 'Đọc hiểu sâu, viết văn cảm xúc' },
    tiengAnh: { subjectId: 'tiengAnh', subjectName: 'Tiếng Anh', level: 'T', periodicScore: 10, teacherComment: 'Giao tiếp lưu loát' }
  };
  const qualities = { yeuNuoc: 'T' as const, nhanAi: 'T' as const, chamChi: 'T' as const, trungThuc: 'T' as const, trachNhiem: 'T' as const };
  const competencies = { tuChuTuHoc: 'T' as const, giaoTiepHopTac: 'T' as const, giaiQuyetVanDe: 'T' as const };

  const result = calculateTT27Standing(subjects, qualities, competencies);
  assert.equal(result, 'XUAT_SAC');
});

test('calculateTT27Standing: classifies Chua Hoan Thanh when a subject is level C or score < 5', () => {
  const subjects: Record<string, SubjectEvaluation> = {
    toan: { subjectId: 'toan', subjectName: 'Toán', level: 'C', periodicScore: 4, teacherComment: 'Cần rèn thêm tính toán' },
    tiengViet: { subjectId: 'tiengViet', subjectName: 'Tiếng Việt', level: 'H', periodicScore: 6, teacherComment: 'Đọc bài tốt' }
  };
  const qualities = { yeuNuoc: 'D' as const, nhanAi: 'D' as const, chamChi: 'D' as const, trungThuc: 'D' as const, trachNhiem: 'D' as const };
  const competencies = { tuChuTuHoc: 'D' as const, giaoTiepHopTac: 'D' as const, giaiQuyetVanDe: 'D' as const };

  const result = calculateTT27Standing(subjects, qualities, competencies);
  assert.equal(result, 'CHUA_HOAN_THANH');
});

test('synthesizePersonalizedComment & synthesizeHolisticTT27Evaluation: generates non-repetitive pedagogical comments incorporating academic results, qualities, and competencies', () => {
  const blankRecord = createBlankTT27Record('HS-001', 'Nguyễn Minh Anh', 'Lớp 4A', 'GIUA_HK1');
  assert.equal(blankRecord.subjects.toan.teacherComment, '');
  assert.equal(blankRecord.qualities.comment, '');
  assert.equal(blankRecord.competencies.comment, '');

  // Customize student ratings
  blankRecord.subjects.toan.level = 'T';
  blankRecord.subjects.toan.periodicScore = 10;
  blankRecord.subjects.tiengViet.level = 'H';
  blankRecord.subjects.tiengViet.periodicScore = 8;
  blankRecord.qualities.chamChi = 'T';
  blankRecord.competencies.giaiQuyetVanDe = 'C';

  const holistic = synthesizeHolisticTT27Evaluation(
    blankRecord,
    'Tính nhẩm nhanh, tích cực phát biểu',
    'Cần rèn chữ viết cẩn thận hơn'
  );

  assert.ok(holistic.subjects.toan.teacherComment.includes('Nguyễn Minh Anh'));
  assert.ok(holistic.subjects.toan.teacherComment.includes('10/10'));
  assert.ok(holistic.qualities.comment.includes('Nguyễn Minh Anh'));
  assert.ok(holistic.competencies.comment.includes('giải quyết vấn đề'));
  assert.equal(holistic.finalAward, 'CHUA_HOAN_THANH');

  const subjectComments = synthesizePersonalizedComment({
    studentName: 'Nguyễn Minh Anh',
    targetType: 'SUBJECT',
    subjectName: 'Toán',
    level: 'T',
    score: 10,
    qualities: { chamChi: 'T' },
    strengths: 'Tư duy nhạy bén'
  });
  assert.equal(subjectComments.length, 3);
  assert.notEqual(subjectComments[0], subjectComments[1]);
});

test('calculateEmulationScore and rankEmulationList: correctly computes total score and awards', () => {
  const classA: EmulationScoreItem = {
    id: '1', classId: '4A', className: 'Lớp 4A', grade: 4, week: 10,
    baseScore: 100, disciplineScore: 50, cleanlinessScore: 50, studyScore: 80, movementScore: 20,
    penalties: [{ reason: 'Đi muộn 1 lượt', points: 5 }],
    bonuses: [{ reason: 'Hoa điểm 10 hội thi', points: 15 }],
    totalScore: 0, rank: 0, award: 'NONE'
  };
  classA.totalScore = calculateEmulationScore(classA);
  assert.equal(classA.totalScore, 310);

  const classB: EmulationScoreItem = {
    ...classA, id: '2', classId: '4B', className: 'Lớp 4B',
    disciplineScore: 40, penalties: [{ reason: 'Mất trật tự', points: 20 }], bonuses: []
  };
  classB.totalScore = calculateEmulationScore(classB);

  const ranked = rankEmulationList([classB, classA]);
  assert.equal(ranked[0].className, 'Lớp 4A');
  assert.equal(ranked[0].award, 'CO_NHAT');
  assert.equal(ranked[1].className, 'Lớp 4B');
  assert.equal(ranked[1].award, 'CO_NHI');
});

test('detectTimetableConflicts: detects when teacher is scheduled in two places simultaneously', () => {
  const slots: TimetableSlot[] = [
    {
      id: 's1', dayOfWeek: 2, period: 1, session: 'SANG',
      classId: '4A', className: 'Lớp 4A', subject: 'Toán',
      teacherId: 'GV01', teacherName: 'Nguyễn Văn An', room: 'P101'
    },
    {
      id: 's2', dayOfWeek: 2, period: 1, session: 'SANG',
      classId: '4B', className: 'Lớp 4B', subject: 'Toán',
      teacherId: 'GV01', teacherName: 'Nguyễn Văn An', room: 'P102'
    }
  ];

  const conflicts = detectTimetableConflicts(slots);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].type, 'TEACHER_DOUBLE_BOOKED');
});

test('generateDigitalSignature: generates valid hash token with SmartCA prefix', () => {
  const sig = generateDigitalSignature('L-101', 'Cô Trần Thị Lan', 'CERT-8785', '2026-11-08T08:00:00Z');
  assert.ok(sig.signatureHash.startsWith('SMARTCA-'));
  assert.ok(sig.certInfo.includes('Trần Thị Lan'));
});

test('compileMonthlyReportData: accurately aggregates TT27 records and So Dau Bai lessons for Ministry PDF export', () => {
  const mockUser: UserProfile = {
    id: 'u1',
    name: 'Cô Nguyễn Thị Mai',
    email: 'dotiensy.8785@gmail.com',
    role: 'GVCN',
    title: 'Giáo viên Chủ nhiệm Lớp 4A',
    schoolName: 'Trường Tiểu học Phú Bài',
    schoolCode: '460012',
    district: 'TX. Hương Thủy',
    schoolYear: '2024 - 2025',
    currentWeek: 10,
    className: 'Lớp 4A',
    signatureCertId: 'SMARTCA-8899',
    avatar: ''
  };

  const lessons: LessonRecord[] = [
    {
      id: 'L1',
      date: '2024-11-04',
      dayOfWeek: 'Thứ Hai',
      period: 1,
      session: 'SANG',
      classId: '4A',
      className: 'Lớp 4A',
      subject: 'Toán',
      lessonName: 'Phép cộng phân số',
      teacherId: 'u1',
      teacherName: 'Cô Nguyễn Thị Mai',
      attendedStudents: 35,
      totalStudents: 35,
      lessonContentSummary: 'Học sinh nắm vững quy tắc',
      classDisciplineRank: 'Tốt',
      score: 10,
      notes: '',
      approvalStatus: 'DA_KY_GV',
      signatureHash: 'SMARTCA-1234'
    },
    {
      id: 'L2',
      date: '2024-11-05',
      dayOfWeek: 'Thứ Ba',
      period: 2,
      session: 'SANG',
      classId: '4A',
      className: 'Lớp 4A',
      subject: 'Tiếng Việt',
      lessonName: 'Luyện từ và câu',
      teacherId: 'u1',
      teacherName: 'Cô Nguyễn Thị Mai',
      attendedStudents: 34,
      totalStudents: 35,
      lessonContentSummary: 'Thảo luận sôi nổi',
      classDisciplineRank: 'Khá',
      score: 8,
      notes: '',
      approvalStatus: 'CHUA_KY'
    }
  ];

  const rec1 = synthesizeHolisticTT27Evaluation(
    createBlankTT27Record('HS-01', 'Nguyễn Lê Minh Khang', 'Lớp 4A', 'GIUA_HK1')
  );
  const rec2 = createBlankTT27Record('HS-02', 'Trần Bảo Ngọc', 'Lớp 4A', 'GIUA_HK1');
  rec2.subjects.toan.level = 'H';
  rec2.subjects.toan.periodicScore = 7;
  rec2.finalAward = calculateTT27Standing(
    rec2.subjects,
    {
      yeuNuoc: rec2.qualities.yeuNuoc,
      nhanAi: rec2.qualities.nhanAi,
      chamChi: rec2.qualities.chamChi,
      trungThuc: rec2.qualities.trungThuc,
      trachNhiem: rec2.qualities.trachNhiem
    },
    {
      tuChuTuHoc: rec2.competencies.tuChuTuHoc,
      giaoTiepHopTac: rec2.competencies.giaoTiepHopTac,
      giaiQuyetVanDe: rec2.competencies.giaiQuyetVanDe,
      ngonNgu: rec2.competencies.ngonNgu,
      tinhToan: rec2.competencies.tinhToan,
      khoaHoc: rec2.competencies.khoaHoc
    }
  );

  const summary = compileMonthlyReportData({
    user: mockUser,
    monthLabel: 'Tháng 11/2024',
    termLabel: 'Giữa Học kỳ I',
    lessons,
    tt27Records: [rec1, rec2]
  });

  assert.equal(summary.lessonStats.totalLessons, 2);
  assert.equal(summary.lessonStats.signedLessons, 1);
  assert.equal(summary.lessonStats.signedRatePercent, 50);
  assert.equal(summary.lessonStats.averageLessonScore, 9);
  assert.equal(summary.tt27Stats.totalStudents, 2);
  assert.equal(summary.tt27Stats.xuatSacCount, 1);
  assert.equal(summary.tt27Stats.tieuBieuCount, 1);
  assert.ok(summary.generalEvaluation.includes('Tháng 11/2024'));
});

test('calculateBoardingDailyStats & synthesizeBoardingCareComment: accurately computes semi-boarding metrics and parent feedback', () => {
  const records: BoardingStudentRecord[] = [
    {
      id: 'bt1',
      studentId: 'hs1',
      studentName: 'Nguyễn Minh An',
      className: 'Lớp 4A',
      date: '2024-11-15',
      mealAttendance: 'CO_AN',
      portionStatus: 'HET_SUAT',
      napStatus: 'NGU_TOT',
      healthTemperature: '36.6°C',
      allergyOrDietNote: 'Dị ứng hải sản có vỏ',
      boardingFeeStatus: 'DA_DONG',
      teacherNote: ''
    },
    {
      id: 'bt2',
      studentId: 'hs2',
      studentName: 'Trần Bảo Ngọc',
      className: 'Lớp 4A',
      date: '2024-11-15',
      mealAttendance: 'NGHI_CO_PHEP',
      portionStatus: 'CON_THUA',
      napStatus: 'KHO_NGU',
      healthTemperature: '36.7°C',
      allergyOrDietNote: '',
      boardingFeeStatus: 'CHUA_DONG',
      teacherNote: ''
    }
  ];

  const menus: BoardingMenuRecord[] = [
    {
      id: 'm1',
      date: '2024-11-15',
      dayOfWeek: 'Thứ Sáu',
      lunchMainDish: 'Thịt gà kho gừng',
      lunchSideDish: 'Rau muống xào',
      lunchSoup: 'Canh bí đỏ',
      afternoonSnack: 'Sữa tươi Vinamilk',
      caloriesKcal: 700,
      step1InputCheck: 'DAT',
      step2ProcessingCheck: 'DAT',
      step3SampleSaved: 'DA_LUU_MAU_24H',
      inspectorName: 'Cô Nguyễn Thị Mai'
    }
  ];

  const stats = calculateBoardingDailyStats(records, menus);
  assert.equal(stats.totalBoardingStudents, 2);
  assert.equal(stats.presentForMealCount, 1);
  assert.equal(stats.absentForMealCount, 1);
  assert.equal(stats.feePaidRatePercent, 50);
  assert.equal(stats.averageCaloriesKcal, 700);
  assert.equal(stats.foodSafetyComplianceRatePercent, 100);

  const comment1 = synthesizeBoardingCareComment(records[0]);
  assert.ok(comment1.includes('Nguyễn Minh An'));
  assert.ok(comment1.includes('Dị ứng hải sản có vỏ'));
});

test('parseUploadedTemplateContent: parses student TT27 CSV and boarding template files into live records', () => {
  const csvContent = `STT,Họ và tên,Ngày sinh,Giới tính,Lớp,Điểm Toán,Điểm Tiếng Việt,Phụ huynh,SĐT
1,Lê Hoàng Bách,10/04/2015,Nam,Lớp 4A,10,9,Lê Văn Hùng,0905111222
2,Phạm Thảo Nhi,22/09/2015,Nữ,Lớp 4A,9,10,Phạm Văn Hải,0905333444`;

  const parsed = parseUploadedTemplateContent({
    fileName: 'danh_sach_hoc_sinh_lop_4A.csv',
    rawText: csvContent,
    categoryHint: 'AUTO',
    defaultClassName: 'Lớp 4A',
    teacherName: 'Cô Nguyễn Thị Mai',
    ownerUid: 'u1'
  });

  assert.equal(parsed.detectedCategory, 'DANH_SACH_HOC_SINH_TT27');
  assert.equal(parsed.students.length, 2);
  assert.equal(parsed.tt27Records.length, 2);
  assert.equal(parsed.boardingRecords.length, 2);
  assert.equal(parsed.students[0].fullName, 'Lê Hoàng Bách');
  assert.equal(parsed.tt27Records[0].subjects.toan.periodicScore, 10);

  const boardingCsv = `STT,Họ và tên,Lớp,Chế độ ăn bán trú,Thân nhiệt
1,Hoàng Gia Huy,Lớp 4A,Dị ứng tôm biển,36.5°C
Thực đơn Thứ Hai,Cá thu sốt cà chua,Đậu cô ve xào,Canh rau cải,Sữa chua tiệt trùng,710`;

  const parsedBoarding = parseUploadedTemplateContent({
    fileName: 'ho_so_ban_tru_thang11.csv',
    rawText: boardingCsv,
    categoryHint: 'AUTO',
    defaultClassName: 'Lớp 4A',
    teacherName: 'Cô Nguyễn Thị Mai',
    ownerUid: 'u1'
  });

  assert.equal(parsedBoarding.detectedCategory, 'HO_SO_BAN_TRU');
  assert.equal(parsedBoarding.boardingRecords.length, 1);
  assert.equal(parsedBoarding.boardingRecords[0].mealAttendance, 'CHE_DO_RIENG');
  assert.equal(parsedBoarding.boardingMenus.length, 1);
  assert.equal(parsedBoarding.boardingMenus[0].caloriesKcal, 710);
});

test('detectSpecialSupportStudents & analyzeLearningTrendsFromTT27: accurately detects special-support students and computes 4-milestone learning trend series from TT27 records', () => {
  const { tt27Records } = createMultiTierTT27SampleDataset('Lớp 4A', 'u1');
  assert.equal(tt27Records.length, 6);

  const alerts = detectSpecialSupportStudents(tt27Records);
  assert.equal(alerts.length, 3); // 2 High priority (Hoàng Đức Trọng, Đặng Ngọc Quỳnh Hương) + 1 Medium priority (Phạm Hà Phương Linh)
  assert.equal(alerts[0].priorityLevel, 'CAO');
  assert.equal(alerts[1].priorityLevel, 'CAO');
  assert.equal(alerts[2].priorityLevel, 'TRUNG_BINH');
  assert.equal(alerts[2].studentName, 'Phạm Hà Phương Linh');

  const report = analyzeLearningTrendsFromTT27({
    tt27Records,
    currentWeek: 10,
    className: 'Lớp 4A',
    ownerUid: 'u1'
  });

  assert.equal(report.totalStudentsAnalyzed, 6);
  assert.equal(report.specialSupportHighCount, 2);
  assert.equal(report.specialSupportMediumCount, 1);
  assert.equal(report.trendMilestones.length, 4);
  assert.equal(report.trendMilestones[3].isForecast, true);
  assert.ok(report.trendMilestones[3].overallAvg >= report.trendMilestones[2].overallAvg);
  assert.equal(report.subjectBreakdowns.length, 6);
  assert.equal(report.competencyQualityBreakdowns.length, 11);
});

test('isMojibakeOrBinary & sanitizeVietnameseText: correctly flags binary junk and cleans Vietnamese text', () => {
  // Test binary junk from docx/zip read as string
  const binaryGarbage = 'EQ"%Hj禄42П똪g?c= G/[rZ6_Yx%.ssH_\x00\x01\x02';
  assert.equal(isMojibakeOrBinary(binaryGarbage), true);
  assert.equal(isMojibakeOrBinary('PK\x03\x04\x14\x00word/document.xml'), true);
  assert.equal(isMojibakeOrBinary('Nguyễn Minh Anh, Lớp 4A, Học sinh giỏi'), false);

  // Test sanitizeVietnameseText
  const textWithBomAndControl = '\uFEFFNguyễn Văn An\x00\x08 - Lớp 4A\uFFFD';
  const cleaned = sanitizeVietnameseText(textWithBomAndControl);
  assert.equal(cleaned, 'Nguyễn Văn An - Lớp 4A');
});

test('isValidVietnameseStudentName: validates real Vietnamese names and strictly rejects administrative headers/minutes', () => {
  // Valid names
  assert.equal(isValidVietnameseStudentName('Nguyễn Minh Anh'), true);
  assert.equal(isValidVietnameseStudentName('Lê Hoàng Bách'), true);
  assert.equal(isValidVietnameseStudentName('Phạm Thảo Nhi'), true);

  // Administrative / document titles should be rejected
  assert.equal(isValidVietnameseStudentName('BIÊN BẢN KIỂM TRA Y TẾ TRƯỜNG HỌC'), false);
  assert.equal(isValidVietnameseStudentName('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'), false);
  assert.equal(isValidVietnameseStudentName('Đoàn kiểm tra tiến hành làm việc'), false);
  assert.equal(isValidVietnameseStudentName('UBND thị xã Hương Thủy'), false);
  assert.equal(isValidVietnameseStudentName('Họ và tên'), false);

  // Binary gibberish should be rejected
  assert.equal(isValidVietnameseStudentName('EQ"%Hj禄42П똪g?c='), false);
});

test('parseUploadedTemplateContent: accurately handles school health inspection minutes (.docx) without creating fake student records', () => {
  const docText = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

BIÊN BẢN KIỂM TRA Y TẾ TRƯỜNG HỌC VÀ AN TOÀN THỰC PHẨM BÁN TRÚ NĂM HỌC 2026
Trường Tiểu học Phú Bài

Thời gian: 08 giờ 30 phút, ngày 05 tháng 11 năm 2026.
Đoàn kiểm tra liên ngành Y tế và Ban Giám Hiệu nhà trường.
Nội dung kiểm tra:
1. Công tác y tế học đường, theo dõi sức khỏe học sinh định kỳ.
2. Vệ sinh môi trường lớp học, nguồn nước sạch học sinh uống.
3. Quy trình kiểm thực 3 bước bếp ăn bán trú và lưu mẫu thức ăn 24 giờ.
Kết luận: Đạt chuẩn y tế học đường xuất sắc theo TTLT 13/2016 và QĐ 1246/QĐ-BYT.`;

  const parsed = parseUploadedTemplateContent({
    fileName: '4-Bien_ban_kiem_tra_y_te_truong_hoc_2026.docx',
    rawText: docText,
    categoryHint: 'AUTO',
    defaultClassName: 'Lớp 4A',
    teacherName: 'Ban Kiểm Tra Y Tế',
    ownerUid: 'u_admin'
  });

  assert.equal(parsed.detectedCategory, 'HO_SO_BAN_TRU');
  // Must NOT create fake students from inspection paragraphs!
  assert.equal(parsed.students.length, 0);
  assert.equal(parsed.tt27Records.length, 0);
  assert.equal(parsed.boardingRecords.length, 0);
  // Must record the inspection audit document into boarding system
  assert.equal(parsed.boardingMenus.length, 1);
  assert.ok(parsed.summaryMessage.includes('Biên bản kiểm tra y tế trường học đã được ghi nhận'));
});



