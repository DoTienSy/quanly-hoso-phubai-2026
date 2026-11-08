/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Data models for Hệ thống Quản lý Hồ sơ Điện tử & Điều hành Trường Tiểu học
 * Tuân thủ Thông tư 27/2020/TT-BGDĐT, Thông tư 28/2020/TT-BGDĐT, QĐ 1246/QĐ-BYT và Nghị định 13/2023/NĐ-CP
 */

export type Role = 'BGH' | 'TO_TRUONG' | 'GVCN' | 'GVBM' | 'TONG_PHU_TRACH' | 'TPT_DOI';
export type UserRole = Role;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  schoolName: string;
  schoolCode: string;
  district: string;
  schoolYear: string;
  currentWeek: number;
  className: string;
  signatureCertId: string;
  avatar: string;
}

// -------------------------------------------------------------
// Module 1: Sổ Đầu Bài Điện Tử (Digital Class Diary)
// -------------------------------------------------------------
export interface LessonRecord {
  id: string;
  ownerUid?: string;
  date: string;
  dayOfWeek: string;
  period: number;
  session: 'SANG' | 'CHIEU';
  classId: string;
  className: string;
  subject: string;
  ppctNumber?: number | string;
  lessonName: string;
  teacherId: string;
  teacherName: string;
  attendedStudents: number;
  totalStudents: number;
  absentNotes?: string;
  lessonContentSummary: string;
  classDisciplineRank: 'Tốt' | 'Khá' | 'Trung bình' | 'Cần cố gắng';
  score: number;
  notes: string;
  isSubstitute?: boolean;
  signedAt?: string;
  signatureHash?: string;
  signerName?: string;
  approvalStatus: 'CHUA_KY' | 'DA_KY_GV' | 'DA_DUYET_BGH';
  approvedBy?: string;
  approvedAt?: string;
}

// -------------------------------------------------------------
// Module 2: Sổ Chủ Nhiệm & Sổ Liên Lạc Điện Tử
// -------------------------------------------------------------
export interface StudentProfile {
  id: string;
  ownerUid?: string;
  studentCode: string;
  fullName: string;
  birthDate: string;
  gender: 'Nam' | 'Nữ';
  classId: string;
  className: string;
  address: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  healthStatus: string;
  specialNeeds?: string;
  avatarUrl: string;
  todayAttendance: 'CO_MAT' | 'NGHI_PHEP' | 'NGHI_KHONG_PHEP' | 'DI_MUON';
  attendanceNote?: string;
}

export interface ParentNotification {
  id: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  channel: 'ZALO_OA' | 'SMS_EDU' | 'APP_PORTAL';
  title: string;
  content: string;
  sentAt: string;
  status: 'DELIVERED' | 'READ' | 'PENDING';
}

// -------------------------------------------------------------
// Module 3: Thi Đua & Khen Thưởng (Emulation)
// -------------------------------------------------------------
export interface EmulationScoreItem {
  id: string;
  ownerUid?: string;
  classId: string;
  className: string;
  grade: number;
  week: number;
  baseScore: number;
  disciplineScore: number;
  cleanlinessScore: number;
  studyScore: number;
  movementScore: number;
  penalties: { reason: string; points: number }[];
  bonuses: { reason: string; points: number }[];
  totalScore: number;
  rank: number;
  award: 'CO_NHAT' | 'CO_NHI' | 'CO_BA' | 'KHUYEN_KHICH' | 'NONE';
}

// -------------------------------------------------------------
// Module 4: Đánh Giá Học Sinh Theo Thông Tư 27/2020/TT-BGDĐT
// -------------------------------------------------------------
export type TT27SubjectEvaluationLevel = 'T' | 'H' | 'C';
export type TT27QualityCompetencyLevel = 'T' | 'D' | 'C';

export interface SubjectEvaluation {
  subjectId: string;
  subjectName: string;
  level: TT27SubjectEvaluationLevel;
  periodicScore?: number;
  teacherComment: string;
  suggestions?: string;
}

export interface StudentTT27Record {
  id: string;
  ownerUid?: string;
  studentId: string;
  studentName: string;
  className: string;
  term: 'GIUA_HK1' | 'CUOI_HK1' | 'GIUA_HK2' | 'CUOI_HK2';
  subjects: Record<string, SubjectEvaluation>;
  qualities: {
    yeuNuoc: TT27QualityCompetencyLevel;
    nhanAi: TT27QualityCompetencyLevel;
    chamChi: TT27QualityCompetencyLevel;
    trungThuc: TT27QualityCompetencyLevel;
    trachNhiem: TT27QualityCompetencyLevel;
    comment: string;
  };
  competencies: {
    tuChuTuHoc: TT27QualityCompetencyLevel;
    giaoTiepHopTac: TT27QualityCompetencyLevel;
    giaiQuyetVanDe: TT27QualityCompetencyLevel;
    ngonNgu: TT27QualityCompetencyLevel;
    tinhToan: TT27QualityCompetencyLevel;
    khoaHoc: TT27QualityCompetencyLevel;
    comment: string;
  };
  finalAward?: 'XUAT_SAC' | 'TIEU_BIEU' | 'HOAN_THANH_CHUONG_TRINH' | 'CHUA_HOAN_THANH';
  aiSuggestionUsed?: boolean;
}

// -------------------------------------------------------------
// Module 5: Thời Khóa Biểu Thông Minh (Smart Timetable)
// -------------------------------------------------------------
export interface TimetableSlot {
  id: string;
  ownerUid?: string;
  dayOfWeek: number;
  period: number;
  session: 'SANG' | 'CHIEU';
  classId: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  room: string;
}

export interface TimetableConflict {
  type: 'TEACHER_DOUBLE_BOOKED' | 'ROOM_DOUBLE_BOOKED' | 'MAX_PERIODS_EXCEEDED';
  description: string;
  slots: TimetableSlot[];
}

// -------------------------------------------------------------
// Module 6: Quản Lý Bán Trú Tiểu Học (Semi-Boarding & Nutrition)
// Tuân thủ Quyết định 1246/QĐ-BYT (Kiểm thực 3 bước & Lưu mẫu 24h)
// -------------------------------------------------------------
export interface BoardingStudentRecord {
  id: string;
  ownerUid?: string;
  studentId: string;
  studentName: string;
  className: string;
  campus?: 'Trường chính' | 'Phân hiệu';
  date: string;
  mealAttendance: 'CO_AN' | 'NGHI_CO_PHEP' | 'CHE_DO_RIENG';
  portionStatus: 'HET_SUAT' | 'CON_THUA' | 'CAN_HO_TRO';
  napStatus: 'NGU_TOT' | 'KHO_NGU' | 'THEO_DOI_SUC_KHOE';
  healthTemperature: string;
  allergyOrDietNote: string;
  boardingFeeStatus: 'DA_DONG' | 'CHUA_DONG' | 'MIEN_GIAM';
  handoverMorningConfirmed?: boolean;
  handoverAfternoonConfirmed?: boolean;
  teacherNote: string;
}

export interface BoardingMenuRecord {
  id: string;
  ownerUid?: string;
  date: string;
  dayOfWeek: string;
  lunchMainDish: string;
  lunchSideDish: string;
  lunchSoup: string;
  afternoonSnack: string;
  caloriesKcal: number;
  step1InputCheck: 'DAT' | 'KHONG_DAT';
  step2ProcessingCheck: 'DAT' | 'KHONG_DAT';
  step3SampleSaved: 'DA_LUU_MAU_24H' | 'CHO_LUU_MAU';
  inspectorName: string;
  signatureHash?: string;
}

export interface BoardingInspectionAuditRecord {
  id: string;
  inspectionDate: string;
  inspectionType: 'DINH_KY_THANG' | 'DOT_XUAT' | 'KIEM_TRA_CHEO';
  inspectionTypeLabel: string;
  campusLocation: 'Trường chính' | 'Phân hiệu' | 'Cả 2 cơ sở';
  decisionNumber: string;
  leaderName: string;
  deputyLeaderName: string;
  committeeMembers: string[];
  findingsSummary: string;
  overallRating: 'DAT_YEU_CAU' | 'DAT_XUAT_SAC' | 'CAN_KHAC_PHUC';
  rectificationNotes: string;
  rectificationDeadline: string;
  signedHash?: string;
  signedBy?: string;
}

export interface BoardingDutyScheduleSlot {
  id: string;
  zoneId: 'CONG_TRUONG' | 'TIEP_NHAN_SUAT_AN' | 'KHU_VUC_AN' | 'KHU_VUC_NGHI' | 'VE_SINH_NUOC_SACH';
  zoneName: string;
  campus: 'Trường chính' | 'Phân hiệu';
  staffName: string;
  staffRole: string;
  timeRange: string;
  dutyDescription: string;
}

// -------------------------------------------------------------
// Module 7: AI Template File Import Result
// -------------------------------------------------------------
export type TemplateImportCategory =
  | 'AUTO'
  | 'DANH_SACH_HOC_SINH_TT27'
  | 'HO_SO_BAN_TRU'
  | 'SO_DAU_BAI_TKB';

export interface ParsedTemplateImportPayload {
  detectedCategory: string;
  summaryMessage: string;
  students: StudentProfile[];
  tt27Records: StudentTT27Record[];
  boardingRecords: BoardingStudentRecord[];
  boardingMenus: BoardingMenuRecord[];
  lessons: LessonRecord[];
  timetableSlots: TimetableSlot[];
}

// -------------------------------------------------------------
// Module 8: Trợ Lý AI Pro & OCR & Voice Hội Họp
// -------------------------------------------------------------
export interface OCRDocument {
  id: string;
  docNumber: string;
  title: string;
  issuingAuthority: string;
  dateIssued: string;
  category: 'CONG_VAN' | 'QUYET_DINH' | 'KE_HOACH' | 'HUONG_DAN' | 'GIAO_AN';
  signatory: string;
  summary: string;
  keyPoints: string[];
  rawText: string;
  uploadedAt: string;
  status: 'PROCESSED' | 'PENDING';
}

export interface MeetingRecord {
  id: string;
  title: string;
  type: 'HOI_DONG_SU_PHAM' | 'SINH_HOAT_TO_CHUYEN_MON' | 'HOP_CHI_BO' | 'HOP_PHU_HUYNH';
  date: string;
  chairPerson: string;
  attendeesCount: number;
  audioDurationMinutes: number;
  audioSnippetText: string;
  aiGeneratedMinutes: {
    mainThemes: string[];
    discussions: { speaker: string; content: string }[];
    principalConclusion: string[];
    actionItems: { task: string; assignee: string; deadline: string }[];
  };
}

// -------------------------------------------------------------
// Module 9: Báo Cáo Thông Minh AI Trên Dashboard (AI Smart Trend & Support Report)
// -------------------------------------------------------------
export interface LearningTrendMilestone {
  periodLabel: string;
  shortLabel: string;
  toanAvg: number;
  tiengVietAvg: number;
  tiengAnhAvg: number;
  overallAvg: number;
  masteryRateT: number;
  satisfactoryRateH: number;
  needSupportRateC: number;
  isForecast?: boolean;
}

export interface SubjectMasteryBreakdown {
  subjectId: string;
  subjectName: string;
  countT: number;
  countH: number;
  countC: number;
  rateT: number;
  rateH: number;
  rateC: number;
  averageScore: number | null;
  trendDelta: number;
}

export interface CompetencyQualityBreakdown {
  key: string;
  label: string;
  group: 'QUALITY' | 'COMPETENCY';
  countT: number;
  countD: number;
  countC: number;
  rateT: number;
  rateD: number;
  rateC: number;
}

export interface SpecialSupportStudentAlert {
  studentId: string;
  recordId: string;
  studentName: string;
  className: string;
  term: StudentTT27Record['term'];
  priorityLevel: 'CAO' | 'TRUNG_BINH';
  riskScore: number;
  averagePeriodicScore: number;
  weakSubjects: {
    subjectId: string;
    subjectName: string;
    level: TT27SubjectEvaluationLevel;
    score?: number;
  }[];
  weakQualities: string[];
  weakCompetencies: string[];
  trendDirection: 'GIAM_CAN_LUU_Y' | 'CHUA_ON_DINH' | 'CO_TIEN_BO';
  aiDiagnosticSummary: string;
  aiInterventionPlan: string[];
}

export interface AISmartDashboardReport {
  id: string;
  ownerUid?: string;
  className: string;
  generatedAt: string;
  dataSource: 'FIRESTORE_REALTIME' | 'GEMINI_AI_ENHANCED';
  totalStudentsAnalyzed: number;
  overallAverageScore: number;
  overallMasteryRateT: number;
  overallSatisfactoryRateH: number;
  overallNeedSupportRateC: number;
  specialSupportHighCount: number;
  specialSupportMediumCount: number;
  trendDirectionLabel: 'Tăng trưởng tích cực' | 'Ổn định bền vững' | 'Cần tăng cường phụ đạo';
  executiveAiSummary: string;
  keyPedagogicalRecommendations: string[];
  trendMilestones: LearningTrendMilestone[];
  subjectBreakdowns: SubjectMasteryBreakdown[];
  competencyQualityBreakdowns: CompetencyQualityBreakdown[];
  specialSupportStudents: SpecialSupportStudentAlert[];
}

