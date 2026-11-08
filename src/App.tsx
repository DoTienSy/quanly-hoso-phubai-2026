/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sanitizeString,
  sanitizeId
} from './firebase';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { GeneralSettingsModal } from './components/GeneralSettingsModal';
import { DashboardOverview } from './components/DashboardOverview';
import { SoDauBaiModule } from './components/SoDauBaiModule';
import { SoChuNhiemModule } from './components/SoChuNhiemModule';
import { ThiDuaModule } from './components/ThiDuaModule';
import { TheoDoiTT27Module } from './components/TheoDoiTT27Module';
import { ThoiKhoaBieuModule } from './components/ThoiKhoaBieuModule';
import { AIProHubModule } from './components/AIProHubModule';
import { MonthlyReportPdfModal } from './components/MonthlyReportPdfModal';
import { QuanLyBanTruModule } from './components/QuanLyBanTruModule';
import { AITemplateImportModal } from './components/AITemplateImportModal';
import {
  UserProfile,
  LessonRecord,
  StudentProfile,
  EmulationScoreItem,
  StudentTT27Record,
  TimetableSlot,
  BoardingStudentRecord,
  BoardingMenuRecord,
  ParsedTemplateImportPayload
} from './types/edtech';
import {
  generateDigitalSignature,
  createBlankTT27Record,
  createMultiTierTT27SampleDataset,
  createPhuBaiDefaultLessons,
  getPhuBaiRealBoardingStudents
} from './utils/edtech_logic';
import {
  School,
  ShieldCheck,
  Database,
  Mail,
  LogIn,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const LOCAL_USER_STORAGE_KEY = 'edtech_active_gmail_user_v1';
const LOCAL_LOGOUT_FLAG_KEY = 'edtech_explicit_logout_v1';

const DEFAULT_PHU_BAI_USER: UserProfile = {
  id: 'phubai_vothikimoanh',
  name: 'Võ Thị Kim Oanh',
  email: 'dotiensy.8785@gmail.com',
  role: 'BGH',
  title: 'Phó Hiệu trưởng',
  schoolName: 'TRƯỜNG TIỂU HỌC PHÚ BÀI',
  schoolCode: '460012',
  district: 'Phường Phú Bài',
  schoolYear: '2025 - 2026',
  currentWeek: 9,
  className: '4/1',
  avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=VoThiKimOanh',
  signatureCertId: 'SMARTCA-PB09'
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      const loggedOut = localStorage.getItem(LOCAL_LOGOUT_FLAG_KEY);
      if (loggedOut === 'true') return null;
      return DEFAULT_PHU_BAI_USER;
    } catch {
      return DEFAULT_PHU_BAI_USER;
    }
  });
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Login Form Fallback State (for Gmail entry if popup is blocked by iframe)
  const [gmailInput, setGmailInput] = useState<string>('');
  const [teacherNameInput, setTeacherNameInput] = useState<string>('');
  const [schoolNameInput, setSchoolNameInput] = useState<string>('Trường Tiểu học Phú Bài');
  const [classNameInput, setClassNameInput] = useState<string>('4/1');

  const [activeTab, setActiveTab] = useState<string>('SO_DAU_BAI');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState<boolean>(false);
  const [isAiTemplateImportOpen, setIsAiTemplateImportOpen] = useState<boolean>(false);

  // Real-time Application Data Stores
  const [lessons, setLessons] = useState<LessonRecord[]>(() =>
    createPhuBaiDefaultLessons('phubai_vothikimoanh')
  );
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [emulationScores, setEmulationScores] = useState<EmulationScoreItem[]>([]);
  const [tt27Records, setTt27Records] = useState<StudentTT27Record[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [boardingRecords, setBoardingRecords] = useState<BoardingStudentRecord[]>(() =>
    getPhuBaiRealBoardingStudents('phubai_vothikimoanh')
  );
  const [boardingMenus, setBoardingMenus] = useState<BoardingMenuRecord[]>(() => [
    {
      id: 'menu_mon',
      ownerUid: 'phubai_vothikimoanh',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: 'Thứ Hai',
      lunchMainDish: 'Thịt heo rim tôm tươi',
      lunchSideDish: 'Bắp cải xào cà rốt',
      lunchSoup: 'Canh bí đỏ nấu tôm thịt',
      afternoonSnack: 'Sữa học đường Vinamilk 180ml',
      caloriesKcal: 690,
      step1InputCheck: 'DAT',
      step2ProcessingCheck: 'DAT',
      step3SampleSaved: 'DA_LUU_MAU_24H',
      inspectorName: 'Lê Thị Thu Mẫn (Y tế)',
      signatureHash: 'SMARTCA-ATTP-T2-PB'
    },
    {
      id: 'menu_tue',
      ownerUid: 'phubai_vothikimoanh',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: 'Thứ Ba',
      lunchMainDish: 'Gà kho gừng sả',
      lunchSideDish: 'Su su xào nấm',
      lunchSoup: 'Canh rau ngót nấu thịt nạc bằm',
      afternoonSnack: 'Bánh bông lan trứng tươi & Nước cam',
      caloriesKcal: 710,
      step1InputCheck: 'DAT',
      step2ProcessingCheck: 'DAT',
      step3SampleSaved: 'DA_LUU_MAU_24H',
      inspectorName: 'Lê Thị Thu Mẫn (Y tế)',
      signatureHash: 'SMARTCA-ATTP-T3-PB'
    },
    {
      id: 'menu_wed',
      ownerUid: 'phubai_vothikimoanh',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: 'Thứ Tư',
      lunchMainDish: 'Trứng cuộn thịt hấp ngũ sắc',
      lunchSideDish: 'Đậu cô ve xào thịt băm',
      lunchSoup: 'Canh mồng tơi nấu cua đồng',
      afternoonSnack: 'Sữa chua tiệt trùng Susu',
      caloriesKcal: 685,
      step1InputCheck: 'DAT',
      step2ProcessingCheck: 'DAT',
      step3SampleSaved: 'DA_LUU_MAU_24H',
      inspectorName: 'Lê Thị Thu Mẫn (Y tế)',
      signatureHash: 'SMARTCA-ATTP-T4-PB'
    },
    {
      id: 'menu_thu',
      ownerUid: 'phubai_vothikimoanh',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: 'Thứ Năm',
      lunchMainDish: 'Cá thu sốt cà chua',
      lunchSideDish: 'Rau muống xào tỏi',
      lunchSoup: 'Canh chua cá bông lau',
      afternoonSnack: 'Chè hạt sen long nhãn',
      caloriesKcal: 700,
      step1InputCheck: 'DAT',
      step2ProcessingCheck: 'DAT',
      step3SampleSaved: 'DA_LUU_MAU_24H',
      inspectorName: 'Lê Thị Thu Mẫn (Y tế)',
      signatureHash: 'SMARTCA-ATTP-T5-PB'
    },
    {
      id: 'menu_fri',
      ownerUid: 'phubai_vothikimoanh',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: 'Thứ Sáu',
      lunchMainDish: 'Thịt bò xào củ quả',
      lunchSideDish: 'Dưa leo chấm sốt mè',
      lunchSoup: 'Canh sườn hầm cà rốt khoai tây',
      afternoonSnack: 'Sữa tươi DalatMilk tiệt trùng',
      caloriesKcal: 720,
      step1InputCheck: 'DAT',
      step2ProcessingCheck: 'DAT',
      step3SampleSaved: 'DA_LUU_MAU_24H',
      inspectorName: 'Lê Thị Thu Mẫn (Y tế)',
      signatureHash: 'SMARTCA-ATTP-T6-PB'
    }
  ]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const uid = sanitizeId(user.uid, 128);
        try {
          const userDocRef = doc(db, 'users', uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const profileData = snap.data() as UserProfile;
            setCurrentUser(profileData);
            localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(profileData));
          } else {
            const newProfile: UserProfile = {
              id: uid,
              name: sanitizeString(user.displayName || 'Giáo viên', 100),
              email: sanitizeString(user.email || '', 150),
              role: 'GVCN',
              title: 'Giáo viên Chủ nhiệm',
              schoolName: 'Trường Tiểu học Phú Bài',
              schoolCode: '460012',
              district: 'TX. Hương Thủy',
              schoolYear: '2024 - 2025',
              currentWeek: 10,
              className: 'Lớp 4A',
              avatar:
                user.photoURL ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  user.displayName || user.email || 'GV'
                )}`,
              signatureCertId: `SMARTCA-${uid.slice(0, 6).toUpperCase()}`
            };
            await setDoc(userDocRef, newProfile);
            setCurrentUser(newProfile);
            localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(newProfile));
            setIsSettingsOpen(true);
          }
        } catch (err) {
          console.warn('Firestore user profile sync warning:', err);
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listeners when authenticated with Firebase
  useEffect(() => {
    if (!isAuthReady || !firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubLessons = onSnapshot(
      query(collection(db, 'lessons'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as LessonRecord);
        if (list.length > 0) {
          setLessons(list);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'lessons');
        } catch (e) {
          console.error(e);
        }
      }
    );

    const unsubStudents = onSnapshot(
      query(collection(db, 'students'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as StudentProfile);
        setStudents(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'students');
        } catch (e) {
          console.error(e);
        }
      }
    );

    const unsubTT27 = onSnapshot(
      query(collection(db, 'tt27_records'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as StudentTT27Record);
        setTt27Records(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'tt27_records');
        } catch (e) {
          console.error(e);
        }
      }
    );

    const unsubEmulation = onSnapshot(
      query(collection(db, 'emulation_scores'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as EmulationScoreItem);
        setEmulationScores(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'emulation_scores');
        } catch (e) {
          console.error(e);
        }
      }
    );

    const unsubTimetable = onSnapshot(
      query(collection(db, 'timetable_slots'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as TimetableSlot);
        setTimetableSlots(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'timetable_slots');
        } catch (e) {
          console.error(e);
        }
      }
    );

    const unsubBoardingRecords = onSnapshot(
      query(collection(db, 'boarding_records'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as BoardingStudentRecord);
        setBoardingRecords(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'boarding_records');
        } catch (e) {
          console.error(e);
        }
      }
    );

    const unsubBoardingMenus = onSnapshot(
      query(collection(db, 'boarding_menus'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as BoardingMenuRecord);
        setBoardingMenus(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'boarding_menus');
        } catch (e) {
          console.error(e);
        }
      }
    );

    return () => {
      unsubLessons();
      unsubStudents();
      unsubTT27();
      unsubEmulation();
      unsubTimetable();
      unsubBoardingRecords();
      unsubBoardingMenus();
    };
  }, [isAuthReady, firebaseUser]);

  // Google Popup Sign-In
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google popup sign-in blocked or closed:', err);
      setAuthError(
        'Trình duyệt chặn cửa sổ bật lên (Popup) hoặc đang trong khung xem trước. Vui lòng nhập Gmail ở biểu mẫu bên dưới để đăng nhập trực tiếp.'
      );
    }
  };

  // Direct Gmail Workspace Login (works in all browsers & iframe environments)
  const handleDirectGmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeString(gmailInput.trim(), 150);
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Vui lòng nhập địa chỉ Gmail hợp lệ.');
      return;
    }
    const cleanName = sanitizeString(
      teacherNameInput.trim() || cleanEmail.split('@')[0],
      100
    );
    const uid = sanitizeId(`gmail_${cleanEmail}`, 100);
    const profile: UserProfile = {
      id: uid,
      name: cleanName,
      email: cleanEmail,
      role: 'GVCN',
      title: `Giáo viên Chủ nhiệm ${classNameInput.trim() || 'Lớp 4A'}`,
      schoolName: sanitizeString(schoolNameInput.trim() || 'Trường Tiểu học', 150),
      schoolCode: '460012',
      district: 'Phòng GD&ĐT',
      schoolYear: '2024 - 2025',
      currentWeek: 10,
      className: sanitizeString(classNameInput.trim() || 'Lớp 4A', 50),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      signatureCertId: `SMARTCA-${uid.slice(-6).toUpperCase()}`
    };
    setCurrentUser(profile);
    localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(profile));
    localStorage.removeItem(LOCAL_LOGOUT_FLAG_KEY);
  };

  const handleLogout = async () => {
    try {
      if (firebaseUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn(e);
    }
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
    localStorage.setItem(LOCAL_LOGOUT_FLAG_KEY, 'true');
  };

  // Save General Profile Settings
  const handleSaveProfile = async (updated: UserProfile) => {
    const cleanProfile: UserProfile = {
      ...updated,
      name: sanitizeString(updated.name, 100),
      email: sanitizeString(updated.email || '', 150),
      title: sanitizeString(updated.title, 150),
      schoolName: sanitizeString(updated.schoolName, 150),
      schoolCode: sanitizeString(updated.schoolCode || '', 50),
      district: sanitizeString(updated.district || '', 100),
      schoolYear: sanitizeString(updated.schoolYear || '2024 - 2025', 50),
      className: sanitizeString(updated.className || '', 50),
      signatureCertId: sanitizeString(updated.signatureCertId, 100)
    };
    setCurrentUser(cleanProfile);
    localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(cleanProfile));

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), cleanProfile);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  // Lesson CRUD
  const handleAddLesson = async (newLesson: LessonRecord) => {
    const recordWithOwner: LessonRecord = {
      ...newLesson,
      ownerUid: firebaseUser?.uid || currentUser?.id || 'local'
    };
    setLessons((prev) => [recordWithOwner, ...prev]);
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'lessons', sanitizeId(recordWithOwner.id)), recordWithOwner);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `lessons/${recordWithOwner.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleUpdateLesson = async (updated: LessonRecord) => {
    setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'lessons', sanitizeId(updated.id)), updated);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `lessons/${updated.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'lessons', sanitizeId(lessonId)));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `lessons/${lessonId}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleQuickSign = (lessonId: string) => {
    if (!currentUser) return;
    const target = lessons.find((l) => l.id === lessonId);
    if (!target) return;

    const timestamp = new Date().toISOString();
    const sig = generateDigitalSignature(
      lessonId,
      currentUser.name,
      currentUser.signatureCertId,
      timestamp,
      currentUser.schoolCode || 'EDTECH'
    );

    const updated: LessonRecord = {
      ...target,
      signedAt: timestamp,
      signatureHash: sig.signatureHash,
      signerName: currentUser.name,
      approvalStatus: currentUser.role === 'BGH' ? 'DA_DUYET_BGH' : 'DA_KY_GV',
      ...(currentUser.role === 'BGH'
        ? { approvedBy: currentUser.name, approvedAt: timestamp }
        : {})
    };
    handleUpdateLesson(updated);
  };

  // Student CRUD + Auto-create TT27 Record
  const handleAddStudent = async (newStudent: StudentProfile) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || 'local';
    const studentWithOwner: StudentProfile = { ...newStudent, ownerUid };
    setStudents((prev) => [...prev, studentWithOwner]);

    // Also create a blank TT27 record for this student
    const blankTT27 = createBlankTT27Record(
      studentWithOwner.id,
      studentWithOwner.fullName,
      studentWithOwner.className,
      'GIUA_HK1',
      ownerUid
    );
    setTt27Records((prev) => [...prev, blankTT27]);

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'students', sanitizeId(studentWithOwner.id)), studentWithOwner);
        await setDoc(doc(db, 'tt27_records', sanitizeId(blankTT27.id)), blankTT27);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `students/${studentWithOwner.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleUpdateStudent = async (updated: StudentProfile) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'students', sanitizeId(updated.id)), updated);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `students/${updated.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'students', sanitizeId(studentId)));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `students/${studentId}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  // TT27 Record CRUD
  const handleAddTt27Record = async (newRecord: StudentTT27Record) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || 'local';
    const recordWithOwner: StudentTT27Record = { ...newRecord, ownerUid };
    setTt27Records((prev) => [...prev, recordWithOwner]);
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'tt27_records', sanitizeId(recordWithOwner.id)), recordWithOwner);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `tt27_records/${recordWithOwner.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleUpdateTt27Record = async (updated: StudentTT27Record) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || updated.ownerUid || 'local';
    const recordWithOwner: StudentTT27Record = { ...updated, ownerUid };
    setTt27Records((prev) => prev.map((r) => (r.id === recordWithOwner.id ? recordWithOwner : r)));
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'tt27_records', sanitizeId(recordWithOwner.id)), recordWithOwner);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `tt27_records/${recordWithOwner.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleDeleteTt27Record = async (recordId: string) => {
    setTt27Records((prev) => prev.filter((r) => r.id !== recordId));
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'tt27_records', sanitizeId(recordId)));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `tt27_records/${recordId}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  // Emulation CRUD
  const handleAddEmulationClass = async (item: EmulationScoreItem) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || 'local';
    const withOwner = { ...item, ownerUid };
    setEmulationScores((prev) => [...prev, withOwner]);
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'emulation_scores', sanitizeId(withOwner.id)), withOwner);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `emulation_scores/${withOwner.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleUpdateEmulationList = async (items: EmulationScoreItem[]) => {
    setEmulationScores(items);
    if (firebaseUser) {
      for (const item of items) {
        try {
          await setDoc(doc(db, 'emulation_scores', sanitizeId(item.id)), item);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const handleDeleteEmulationClass = async (id: string) => {
    setEmulationScores((prev) => prev.filter((e) => e.id !== id));
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'emulation_scores', sanitizeId(id)));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Timetable CRUD
  const handleAddTimetableSlot = async (slot: TimetableSlot) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || 'local';
    const withOwner = { ...slot, ownerUid };
    setTimetableSlots((prev) => [...prev, withOwner]);
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'timetable_slots', sanitizeId(withOwner.id)), withOwner);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteTimetableSlot = async (slotId: string) => {
    setTimetableSlots((prev) => prev.filter((s) => s.id !== slotId));
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'timetable_slots', sanitizeId(slotId)));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Boarding Student Records & Menus CRUD
  const handleAddBoardingRecord = async (rec: BoardingStudentRecord) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || 'local';
    const withOwner = { ...rec, ownerUid };
    setBoardingRecords((prev) => [...prev, withOwner]);
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'boarding_records', sanitizeId(withOwner.id)), withOwner);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateBoardingRecord = async (updated: BoardingStudentRecord) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || updated.ownerUid || 'local';
    const withOwner = { ...updated, ownerUid };
    setBoardingRecords((prev) => prev.map((r) => (r.id === withOwner.id ? withOwner : r)));
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'boarding_records', sanitizeId(withOwner.id)), withOwner);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteBoardingRecord = async (id: string) => {
    setBoardingRecords((prev) => prev.filter((r) => r.id !== id));
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'boarding_records', sanitizeId(id)));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddBoardingMenu = async (menu: BoardingMenuRecord) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || 'local';
    const withOwner = { ...menu, ownerUid };
    setBoardingMenus((prev) => [...prev, withOwner]);
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'boarding_menus', sanitizeId(withOwner.id)), withOwner);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateBoardingMenu = async (menu: BoardingMenuRecord) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || menu.ownerUid || 'local';
    const withOwner = { ...menu, ownerUid };
    setBoardingMenus((prev) => prev.map((m) => (m.id === withOwner.id ? withOwner : m)));
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'boarding_menus', sanitizeId(withOwner.id)), withOwner);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteBoardingMenu = async (id: string) => {
    setBoardingMenus((prev) => prev.filter((m) => m.id !== id));
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'boarding_menus', sanitizeId(id)));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Apply AI-Parsed Template File directly to Application Stores & Firestore
  const handleApplyImportPayload = async (payload: ParsedTemplateImportPayload) => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || 'local';

    if (payload.students.length > 0) {
      const tagged = payload.students.map((s) => ({ ...s, ownerUid }));
      setStudents((prev) => [...prev, ...tagged]);
      if (firebaseUser) {
        for (const s of tagged) {
          try {
            await setDoc(doc(db, 'students', sanitizeId(s.id)), s);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    if (payload.tt27Records.length > 0) {
      const tagged = payload.tt27Records.map((r) => ({ ...r, ownerUid }));
      setTt27Records((prev) => [...prev, ...tagged]);
      if (firebaseUser) {
        for (const r of tagged) {
          try {
            await setDoc(doc(db, 'tt27_records', sanitizeId(r.id)), r);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    if (payload.boardingRecords.length > 0) {
      const tagged = payload.boardingRecords.map((br) => ({ ...br, ownerUid }));
      setBoardingRecords((prev) => [...prev, ...tagged]);
      if (firebaseUser) {
        for (const br of tagged) {
          try {
            await setDoc(doc(db, 'boarding_records', sanitizeId(br.id)), br);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    if (payload.boardingMenus.length > 0) {
      const tagged = payload.boardingMenus.map((bm) => ({ ...bm, ownerUid }));
      setBoardingMenus((prev) => [...prev, ...tagged]);
      if (firebaseUser) {
        for (const bm of tagged) {
          try {
            await setDoc(doc(db, 'boarding_menus', sanitizeId(bm.id)), bm);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    if (payload.lessons.length > 0) {
      const tagged = payload.lessons.map((l) => ({ ...l, ownerUid }));
      setLessons((prev) => [...tagged, ...prev]);
      if (firebaseUser) {
        for (const l of tagged) {
          try {
            await setDoc(doc(db, 'lessons', sanitizeId(l.id)), l);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    if (payload.timetableSlots.length > 0) {
      const tagged = payload.timetableSlots.map((t) => ({ ...t, ownerUid }));
      setTimetableSlots((prev) => [...prev, ...tagged]);
      if (firebaseUser) {
        for (const t of tagged) {
          try {
            await setDoc(doc(db, 'timetable_slots', sanitizeId(t.id)), t);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    // Navigate to the most relevant tab so user sees their applied records immediately
    if (payload.detectedCategory === 'HO_SO_BAN_TRU') {
      setActiveTab('QUAN_LY_BAN_TRU');
    } else if (payload.detectedCategory === 'SO_DAU_BAI_TKB') {
      setActiveTab('SO_DAU_BAI');
    } else {
      setActiveTab('THEO_DOI_TT27');
    }
  };

  // Seed 6 Multi-Tier TT27 Records (Xuất sắc, Tiêu biểu, Hoàn thành, Cần hỗ trợ đặc biệt) & sync to Firestore
  const handleSeedAnalyticsSample = async () => {
    const ownerUid = firebaseUser?.uid || currentUser?.id || 'local';
    const cls = currentUser?.className || 'Lớp 4A';
    const { students: sampleStudents, tt27Records: sampleRecords } =
      createMultiTierTT27SampleDataset(cls, ownerUid);

    setStudents((prev) => {
      const existingIds = new Set(sampleStudents.map((s) => s.id));
      return [...prev.filter((s) => !existingIds.has(s.id)), ...sampleStudents];
    });

    setTt27Records((prev) => {
      const existingIds = new Set(sampleRecords.map((r) => r.id));
      return [...prev.filter((r) => !existingIds.has(r.id)), ...sampleRecords];
    });

    if (firebaseUser) {
      for (const s of sampleStudents) {
        try {
          await setDoc(doc(db, 'students', sanitizeId(s.id)), s);
        } catch (err) {
          console.error(err);
        }
      }
      for (const r of sampleRecords) {
        try {
          await setDoc(doc(db, 'tt27_records', sanitizeId(r.id)), r);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  // Unauthenticated Gmail Login View
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 md:grid-cols-5">
          {/* Left Hero Column */}
          <div className="md:col-span-2 bg-linear-to-br from-blue-900 to-indigo-900 p-8 text-white flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center shadow-md">
                <School className="w-7 h-7" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-amber-300 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Chuẩn Thông tư 27/2020/TT-BGDĐT
              </div>
              <h1 className="text-2xl font-extrabold leading-tight">
                Hệ Thống Quản Lý Hồ Sơ Điện Tử & Đánh Giá Học Sinh Tiểu Học
              </h1>
              <p className="text-xs text-blue-100 leading-relaxed">
                Số hóa toàn diện hồ sơ giáo dục theo phương châm <strong>&quot;Nhẹ hồ sơ, không nhẹ trách nhiệm&quot;</strong>. Tích hợp AI tự động tạo gợi ý nhận xét học sinh cá nhân hóa dựa trên kết quả học tập, năng lực và phẩm chất.
              </p>
            </div>

            <div className="space-y-2.5 pt-6 border-t border-white/15 text-xs text-blue-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AI nhận xét cá nhân hóa chuẩn ngôn ngữ sư phạm</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Không chứa dữ liệu mẫu • Cá nhân hóa theo từng trường</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bảo mật dữ liệu học sinh theo Nghị định 13/2023/NĐ-CP</span>
              </div>
            </div>
          </div>

          {/* Right Login Column */}
          <div className="md:col-span-3 p-8 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Đăng Nhập Bằng Tài Khoản Gmail
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Đăng nhập bằng tài khoản Google (Gmail) để thiết lập thông tin chung của trường, lớp và sử dụng toàn bộ chức năng.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Option 1: Official Google OAuth Popup Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border-2 border-slate-200 hover:border-blue-500 shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <Mail className="w-5 h-5 text-red-500" />
              <span>Đăng nhập nhanh với Google (Gmail OAuth)</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">
                Hoặc nhập Gmail & thiết lập thông tin trường ngay
              </span>
              <div className="grow border-t border-slate-200"></div>
            </div>

            {/* Option 2: Direct Gmail & General Info Setup Form */}
            <form onSubmit={handleDirectGmailLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Địa chỉ Gmail của Thầy/Cô <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  placeholder="VD: giaovien@gmail.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Họ và tên Giáo viên / Cán bộ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherNameInput}
                    onChange={(e) => setTeacherNameInput(e.target.value)}
                    placeholder="VD: Cô Nguyễn Thị Mai"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Lớp chủ nhiệm / Phụ trách
                  </label>
                  <input
                    type="text"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    placeholder="VD: Lớp 4A"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Tên Trường Tiểu học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={schoolNameInput}
                  onChange={(e) => setSchoolNameInput(e.target.value)}
                  placeholder="VD: Trường Tiểu học Phú Bài"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Đăng Nhập Bằng Gmail & Vào Hệ Thống
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Hero Banner matching Trường Tiểu học Phú Bài */}
      <Header
        currentUser={currentUser}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAiTemplateImport={() => setIsAiTemplateImportOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* General Info Editor Modal */}
      <GeneralSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfile}
      />

      {/* Ministry-Standard Monthly Summary PDF Export Modal (TT27 + Sổ Đầu Bài) */}
      <MonthlyReportPdfModal
        isOpen={isMonthlyReportOpen}
        onClose={() => setIsMonthlyReportOpen(false)}
        currentUser={currentUser}
        lessons={lessons}
        tt27Records={tt27Records}
      />

      {/* AI Template File Upload & Apply Modal */}
      <AITemplateImportModal
        isOpen={isAiTemplateImportOpen}
        onClose={() => setIsAiTemplateImportOpen(false)}
        currentUser={currentUser}
        onApplyImportPayload={handleApplyImportPayload}
      />

      {/* 2-Column Workspace Below Banner: Left Sidebar Navigation + Right Content Area */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-2 sm:px-4 pt-3 pb-8">
        <div className="border-t-2 border-emerald-500/70 pt-3.5 flex flex-col lg:flex-row items-start gap-4">
          {/* Left Colorful Gradient Module Stack */}
          <SidebarNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
            onOpenAiTemplateImport={() => setIsAiTemplateImportOpen(true)}
          />

          {/* Right Main Content Area */}
          <div className="flex-1 w-full min-w-0">
            {activeTab === 'DASHBOARD' && (
              <DashboardOverview
                currentUser={currentUser}
                lessons={lessons}
                students={students}
                tt27Records={tt27Records}
                emulationScores={emulationScores}
                onNavigateTab={setActiveTab}
                onQuickSign={handleQuickSign}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
                onOpenAiTemplateImport={() => setIsAiTemplateImportOpen(true)}
                onSeedAnalyticsSample={handleSeedAnalyticsSample}
              />
            )}

            {activeTab === 'THEO_DOI_TT27' && (
              <TheoDoiTT27Module
                currentUser={currentUser}
                records={tt27Records}
                students={students}
                onUpdateRecord={handleUpdateTt27Record}
                onAddRecord={handleAddTt27Record}
                onDeleteRecord={handleDeleteTt27Record}
                onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
              />
            )}

            {activeTab === 'QUAN_LY_BAN_TRU' && (
              <QuanLyBanTruModule
                currentUser={currentUser}
                boardingRecords={boardingRecords}
                boardingMenus={boardingMenus}
                students={students}
                tt27Records={tt27Records}
                onAddBoardingRecord={handleAddBoardingRecord}
                onUpdateBoardingRecord={handleUpdateBoardingRecord}
                onDeleteBoardingRecord={handleDeleteBoardingRecord}
                onAddBoardingMenu={handleAddBoardingMenu}
                onUpdateBoardingMenu={handleUpdateBoardingMenu}
                onDeleteBoardingMenu={handleDeleteBoardingMenu}
                onOpenAiTemplateImport={() => setIsAiTemplateImportOpen(true)}
              />
            )}

            {activeTab === 'SO_CHU_NHIEM' && (
              <SoChuNhiemModule
                currentUser={currentUser}
                students={students}
                onUpdateStudent={handleUpdateStudent}
                onAddStudent={handleAddStudent}
                onDeleteStudent={handleDeleteStudent}
              />
            )}

            {activeTab === 'SO_DAU_BAI' && (
              <SoDauBaiModule
                currentUser={currentUser}
                lessons={lessons}
                onUpdateLesson={handleUpdateLesson}
                onAddLesson={handleAddLesson}
                onDeleteLesson={handleDeleteLesson}
                onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
              />
            )}

            {activeTab === 'THI_DUA' && (
              <ThiDuaModule
                currentUser={currentUser}
                emulationList={emulationScores}
                onUpdateEmulationList={handleUpdateEmulationList}
                onAddEmulationClass={handleAddEmulationClass}
                onDeleteEmulationClass={handleDeleteEmulationClass}
              />
            )}

            {activeTab === 'THOI_KHOA_BIEU' && (
              <ThoiKhoaBieuModule
                currentUser={currentUser}
                timetableSlots={timetableSlots}
                onAddSlot={handleAddTimetableSlot}
                onDeleteSlot={handleDeleteTimetableSlot}
              />
            )}

            {activeTab === 'AI_PRO_HUB' && (
              <AIProHubModule currentUser={currentUser} />
            )}
          </div>
        </div>
      </main>

      {/* Official Vietnamese Education Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-lg bg-blue-900 text-amber-300 font-black flex items-center justify-center shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-slate-800 text-sm uppercase">
                {currentUser.schoolName} {currentUser.district ? `- ${currentUser.district}` : ''}
              </div>
              <p className="text-[11px] text-slate-500">
                Phương châm hành động: <strong className="text-blue-900">&quot;Nhẹ hồ sơ, không nhẹ trách nhiệm&quot;</strong> • Chuyển đổi số giáo dục tiểu học.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Nghị định 13/2023/NĐ-CP (Bảo mật dữ liệu cá nhân)
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <Database className="w-4 h-4 text-blue-600" />
              Thông tư 27/2020/TT-BGDĐT
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
