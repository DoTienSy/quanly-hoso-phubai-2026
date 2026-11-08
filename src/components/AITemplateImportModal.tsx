/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Download,
  Wand2,
  Database,
  Utensils,
  BookOpen,
  Calendar
} from 'lucide-react';
import {
  UserProfile,
  TemplateImportCategory,
  ParsedTemplateImportPayload
} from '../types/edtech';

interface AITemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onApplyImportPayload: (payload: ParsedTemplateImportPayload) => void;
}

const SAMPLE_TEMPLATES: Record<
  Exclude<TemplateImportCategory, 'AUTO'>,
  { fileName: string; label: string; content: string }
> = {
  DANH_SACH_HOC_SINH_TT27: {
    fileName: 'Mau_Ho_So_Hoc_Sinh_TT27_BGD.csv',
    label: 'Mẫu 1: Hồ sơ Danh sách Học sinh & Điểm Đánh giá Thông tư 27',
    content: `STT,Họ và tên,Ngày sinh,Giới tính,Lớp,Điểm Toán,Điểm Tiếng Việt,Phụ huynh,Số điện thoại
1,Nguyễn Lê Minh Khang,14/03/2015,Nam,Lớp 4A,10,9,Nguyễn Văn Minh,0905123456
2,Trần Ngọc Bảo Trâm,22/07/2015,Nữ,Lớp 4A,9,10,Trần Quốc Tuấn,0905654321
3,Lê Hoàng Gia Bách,09/11/2015,Nam,Lớp 4A,8,8,Lê Đình Hùng,0913222333
4,Phạm Hà Phương Linh,18/01/2015,Nữ,Lớp 4A,10,10,Phạm Văn Hải,0988777666`
  },
  HO_SO_BAN_TRU: {
    fileName: 'Mau_Ho_So_Ban_Tru_Dinh_Duong_QD1246.csv',
    label: 'Mẫu 2: Hồ sơ Học sinh Bán trú & Thực đơn Kiểm thực 3 bước',
    content: `STT,Họ và tên,Lớp,Chế độ ăn bán trú / Dị ứng,Thân nhiệt
1,Nguyễn Lê Minh Khang,Lớp 4A,Không dị ứng thực phẩm,36.6°C - Bình thường
2,Trần Ngọc Bảo Trâm,Lớp 4A,Dị ứng hải sản có vỏ (Tôm/Cua),36.5°C - Bình thường
3,Lê Hoàng Gia Bách,Lớp 4A,Không dị ứng thực phẩm,36.7°C - Bình thường
4,Phạm Hà Phương Linh,Lớp 4A,Uống sữa hạt không đường buổi chiều,36.6°C - Bình thường
Thực đơn Thứ Hai,Thịt gà kho nấm hương,Su su xào cà rốt,Canh bí đỏ nấu tôm tươi,Sữa tươi tiệt trùng Vinamilk 180ml,695
Thực đơn Thứ Ba,Cá thu sốt cà chua,Bắp cải xào thịt nạc,Canh rau ngót nấu thịt bằm,Sữa chua uống học đường,710`
  },
  SO_DAU_BAI_TKB: {
    fileName: 'Mau_Phan_Phoi_Chuong_Trinh_So_Dau_Bai.csv',
    label: 'Mẫu 3: Hồ sơ Phân phối Chương trình Sổ đầu bài & Thời khóa biểu',
    content: `STT,Thứ,Tiết,Môn học,Tên bài dạy theo phân phối chương trình,Lớp
1,Thứ Hai,1,Toán,Phân số và phép chia số tự nhiên (Tiết 1),Lớp 4A
2,Thứ Hai,2,Tiếng Việt,Đọc: Những hạt thóc giống - Rèn đọc diễn cảm,Lớp 4A
3,Thứ Ba,1,Tiếng Anh,Unit 5: Things we can do - Lesson 2,Lớp 4A
4,Thứ Tư,3,Khoa học,Sự chuyển thể của nước và vòng tuần hoàn của nước trong tự nhiên,Lớp 4A`
  }
};

export const AITemplateImportModal: React.FC<AITemplateImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onApplyImportPayload
}) => {
  const [categoryHint, setCategoryHint] = useState<TemplateImportCategory>('AUTO');
  const [fileName, setFileName] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [base64Data, setBase64Data] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<ParsedTemplateImportPayload | null>(null);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsedResult(null);
    setAppliedBanner(null);

    const lowerName = file.name.toLowerCase();
    const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
    const isXlsx = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (isDocx || isXlsx || isPdf || isImage) {
      const mime =
        file.type ||
        (isDocx
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : isXlsx
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : isPdf
          ? 'application/pdf'
          : 'application/octet-stream');
      setMimeType(mime);

      const typeLabel = isDocx
        ? 'Word (.docx)'
        : isXlsx
        ? 'Excel (.xlsx)'
        : isPdf
        ? 'PDF'
        : 'Ảnh chụp tài liệu';

      setRawText(
        `[Đang tải tệp ${typeLabel}: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)]\nNhấn nút "Phân Tích & Chuẩn Hóa Hồ Sơ Bằng AI" bên dưới để hệ thống tự động bóc tách nội dung tiếng Việt chuẩn xác.`
      );

      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || '');
        const b64 = resultStr.split(',')[1] || '';
        setBase64Data(b64);
      };
      reader.onerror = () => {
        setRawText(`[Lỗi: Không thể đọc tệp "${file.name}". Vui lòng thử lại.]`);
      };
      reader.readAsDataURL(file);
    } else {
      // CSV, TXT, TSV, JSON, MD
      setMimeType(file.type || 'text/plain');
      setBase64Data('');
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        let decoded = '';
        try {
          const decoder = new TextDecoder('utf-8', { fatal: false });
          decoded = decoder.decode(buffer);
        } catch {
          decoded = '';
        }
        // Xóa UTF-8 BOM nếu có
        if (decoded.charCodeAt(0) === 0xfeff) {
          decoded = decoded.slice(1);
        }
        setRawText(decoded);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleLoadSampleTemplate = (key: Exclude<TemplateImportCategory, 'AUTO'>) => {
    const tpl = SAMPLE_TEMPLATES[key];
    setCategoryHint(key);
    setFileName(tpl.fileName);
    setRawText(tpl.content);
    setBase64Data('');
    setMimeType('text/csv');
    setParsedResult(null);
    setAppliedBanner(null);
  };

  const handleDownloadSampleFile = (key: Exclude<TemplateImportCategory, 'AUTO'>) => {
    const tpl = SAMPLE_TEMPLATES[key];
    const blob = new Blob(['\uFEFF' + tpl.content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tpl.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const handleRunAiParse = async () => {
    if (!rawText.trim() && !base64Data) return;
    setIsParsing(true);
    setAppliedBanner(null);

    try {
      const res = await fetch('/api/ai/parse-template-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName || 'ho_so_tai_len.csv',
          rawText,
          base64Data,
          mimeType,
          categoryHint,
          defaultClassName: currentUser.className || 'Lớp 4A',
          teacherName: currentUser.name,
          ownerUid: currentUser.id
        })
      });
      const data = await res.json();
      if (data.extractedCleanText && data.extractedCleanText.trim().length > 0) {
        setRawText(data.extractedCleanText);
      }
      if (data.payload) {
        setParsedResult(data.payload);
      }
    } catch (err) {
      console.error('AI template parse failed:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyToApp = () => {
    if (!parsedResult) return;
    onApplyImportPayload(parsedResult);
    setAppliedBanner(
      `Đã áp dụng thành công hồ sơ vào ứng dụng: +${parsedResult.students.length} học sinh, +${parsedResult.tt27Records.length} hồ sơ TT27, +${parsedResult.boardingRecords.length} hồ sơ bán trú, +${parsedResult.boardingMenus.length} thực đơn kiểm thực và +${parsedResult.lessons.length} tiết Sổ đầu bài!`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl max-w-5xl w-full max-h-[93vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300">
        {/* Header */}
        <div className="bg-linear-to-r from-purple-950 via-indigo-950 to-blue-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Tải File Hồ Sơ Mẫu Lên & Áp Dụng Vào Ứng Dụng Bằng AI
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-400/20 text-amber-300 border border-amber-300/30 text-[10px] font-bold">
                  AI Smart Document Parser
                </span>
              </div>
              <p className="text-xs text-purple-200">
                Tự động bóc tách danh sách học sinh, bảng điểm Thông tư 27, hồ sơ bán trú, thực đơn kiểm thực 3 bước và phân phối chương trình Sổ đầu bài từ file tải lên.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ tải file hồ sơ mẫu"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Applied Confirmation Banner */}
        {appliedBanner && (
          <div className="bg-emerald-600 text-white px-6 py-3 text-xs font-bold flex items-center justify-between gap-2 shrink-0">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
              {appliedBanner}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white text-emerald-900 font-extrabold text-[11px] cursor-pointer"
            >
              Xem Dữ Liệu Ngay
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: File Upload & Sample Templates (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 text-xs shadow-2xs">
              <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                1. Chọn Loại Hồ Sơ & Tải File Lên Từ Máy Tính
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phân hệ áp dụng dữ liệu
                </label>
                <select
                  aria-label="Chọn phân hệ áp dụng dữ liệu"
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value as TemplateImportCategory)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  <option value="AUTO">✨ Để AI tự động nhận diện loại hồ sơ</option>
                  <option value="DANH_SACH_HOC_SINH_TT27">
                    📚 Hồ sơ Danh sách Học sinh & Đánh giá Thông tư 27 (+ Bán trú)
                  </option>
                  <option value="HO_SO_BAN_TRU">
                    🍱 Hồ sơ Quản lý Bán trú & Thực đơn Kiểm thực 3 bước (QĐ 1246)
                  </option>
                  <option value="SO_DAU_BAI_TKB">
                    📝 Hồ sơ Phân phối Chương trình Sổ đầu bài & Thời khóa biểu
                  </option>
                </select>
              </div>

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-300 hover:border-purple-600 bg-purple-50/50 rounded-xl p-4 text-center cursor-pointer transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.xlsx,.xls,.pdf,.csv,.txt,.tsv,.json,.md,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileSpreadsheet className="w-8 h-8 text-purple-600 mx-auto mb-1.5" />
                <div className="font-bold text-slate-800 text-xs">
                  {fileName
                    ? `Đã chọn tệp: ${fileName}`
                    : 'Nhấn để chọn file hồ sơ từ máy tính (Word .docx, Excel .xlsx, PDF, CSV, ảnh chụp)'}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tự động giải mã Word (.docx), Excel (.xlsx), CSV, PDF không lỗi font tiếng Việt
                </p>
              </div>

              {/* Quick Sample Templates */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Hoặc nạp nhanh / tải về Biểu mẫu Chuẩn Bộ GD&ĐT để áp dụng thử:
                </div>

                <div className="space-y-2">
                  {(
                    Object.keys(SAMPLE_TEMPLATES) as Array<Exclude<TemplateImportCategory, 'AUTO'>>
                  ).map((key) => {
                    const tpl = SAMPLE_TEMPLATES[key];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="text-[11px] font-semibold text-slate-800">{tpl.label}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadSampleTemplate(key)}
                            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Nạp Mẫu Vào Khung AI
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSampleFile(key)}
                            title="Tải file mẫu .csv về máy"
                            className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editable Raw Content Box */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung hồ sơ (Có thể dán trực tiếp từ Excel / Word hoặc chỉnh sửa trước khi AI phân tích)
                </label>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Dán các dòng danh sách học sinh, hồ sơ bán trú hoặc phân phối chương trình vào đây..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] leading-relaxed text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button
                type="button"
                disabled={isParsing || (!rawText.trim() && !base64Data)}
                onClick={handleRunAiParse}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                {isParsing
                  ? 'AI đang bóc tách & chuẩn hóa dữ liệu hồ sơ...'
                  : 'Phân Tích & Chuẩn Hóa Hồ Sơ Bằng AI'}
              </button>
            </div>
          </div>

          {/* Right Column: AI Extraction Preview & Apply Button (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 text-xs shadow-2xs h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>2. Kết Quả AI Trích Xuất & Xem Trước Khi Áp Dụng</span>
                  {parsedResult && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      Sẵn sàng áp dụng
                    </span>
                  )}
                </div>

                {!parsedResult ? (
                  <div className="py-16 px-4 text-center space-y-3 text-slate-500">
                    <Sparkles className="w-10 h-10 text-purple-400 mx-auto" />
                    <div className="font-bold text-slate-700 text-sm">
                      Chưa có dữ liệu phân tích
                    </div>
                    <p className="text-xs max-w-sm mx-auto">
                      Hãy tải một tệp hồ sơ từ máy tính hoặc nhấn <strong>&quot;Nạp Mẫu Vào Khung AI&quot;</strong> ở cột bên trái, sau đó nhấn <strong>&quot;Phân Tích & Chuẩn Hóa Hồ Sơ Bằng AI&quot;</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs leading-relaxed">
                      <strong className="block mb-1 text-purple-900">
                        ✓ Kết quả nhận diện AI ({parsedResult.detectedCategory}):
                      </strong>
                      {parsedResult.summaryMessage}
                    </div>

                    {/* Summary Badges */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                        <BookOpen className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                        <div className="font-extrabold text-sm text-slate-900">
                          {parsedResult.tt27Records.length}
                        </div>
                        <div className="text-[10px] text-emerald-800 font-semibold">
                          Hồ sơ Học sinh & TT27
                        </div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-center">
                        <Utensils className="w-4 h-4 text-orange-700 mx-auto mb-1" />
                        <div className="font-extrabold text-sm text-slate-900">
                          {parsedResult.boardingRecords.length} HS / {parsedResult.boardingMenus.length} TĐ
                        </div>
                        <div className="text-[10px] text-orange-800 font-semibold">
                          Hồ sơ Bán trú & Thực đơn
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
                        <Calendar className="w-4 h-4 text-blue-700 mx-auto mb-1" />
                        <div className="font-extrabold text-sm text-slate-900">
                          {parsedResult.lessons.length}
                        </div>
                        <div className="text-[10px] text-blue-800 font-semibold">
                          Tiết Sổ đầu bài & TKB
                        </div>
                      </div>
                    </div>

                    {/* Preview Table: Hồ sơ Kiểm thực Bán trú & Y tế Trường học */}
                    {parsedResult.boardingMenus.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between">
                          <span>
                            {parsedResult.boardingMenus.some((m) =>
                              m.dayOfWeek.toLowerCase().includes('biên bản') ||
                              m.dayOfWeek.toLowerCase().includes('y tế') ||
                              m.lunchMainDish.toLowerCase().includes('y tế')
                            )
                              ? `Hồ sơ Kiểm tra Y tế Trường học & An toàn Vệ sinh Bán trú (${parsedResult.boardingMenus.length} biên bản):`
                              : `Thực đơn Kiểm thực Bán trú 3 bước trích xuất (${parsedResult.boardingMenus.length} thực đơn):`}
                          </span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                            QĐ 1246/QĐ-BYT & TTLT 13/2016
                          </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-[11px] border-collapse">
                            <thead className="bg-slate-100 text-slate-700 sticky top-0">
                              <tr>
                                <th className="p-2 text-left">Hạng mục / Thời gian</th>
                                <th className="p-2 text-left">Nội dung ghi nhận & Đánh giá</th>
                                <th className="p-2 text-left">Kiểm thực 3 bước</th>
                                <th className="p-2 text-left">Người kiểm tra</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {parsedResult.boardingMenus.map((bm) => (
                                <tr key={bm.id}>
                                  <td className="p-2 font-bold text-purple-900">{bm.dayOfWeek}</td>
                                  <td className="p-2 text-slate-800">
                                    <div className="font-semibold">{bm.lunchMainDish}</div>
                                    {bm.lunchSideDish && (
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        {bm.lunchSideDish}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      ✓ ĐẠT CHUẨN
                                    </span>
                                  </td>
                                  <td className="p-2 text-slate-700 font-medium whitespace-nowrap">
                                    {bm.inspectorName}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Preview Table: Danh sách Học sinh / Bán trú trích xuất */}
                    {parsedResult.boardingRecords.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-800 text-[11px]">
                          Danh sách Học sinh / Bán trú trích xuất ({parsedResult.boardingRecords.length} học sinh):
                        </div>
                        <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-[11px] border-collapse">
                            <thead className="bg-slate-100 text-slate-700 sticky top-0">
                              <tr>
                                <th className="p-2 text-left">Họ và tên</th>
                                <th className="p-2 text-left">Lớp</th>
                                <th className="p-2 text-left">Chế độ Bán trú / Lưu ý</th>
                                <th className="p-2 text-left">Nhận xét AI tự động</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {parsedResult.boardingRecords.map((br) => (
                                <tr key={br.id}>
                                  <td className="p-2 font-bold text-slate-900">{br.studentName}</td>
                                  <td className="p-2">{br.className}</td>
                                  <td className="p-2 text-orange-800 font-semibold">
                                    {br.allergyOrDietNote}
                                  </td>
                                  <td className="p-2 text-slate-600 truncate max-w-[180px]">
                                    {br.teacherNote}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Preview Table: Danh sách Học sinh & Điểm TT27 (nếu không có trong bán trú) */}
                    {parsedResult.boardingRecords.length === 0 && parsedResult.students.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-800 text-[11px]">
                          Danh sách Học sinh & Đánh giá Thông tư 27 ({parsedResult.students.length} học sinh):
                        </div>
                        <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-[11px] border-collapse">
                            <thead className="bg-slate-100 text-slate-700 sticky top-0">
                              <tr>
                                <th className="p-2 text-left">Mã HS</th>
                                <th className="p-2 text-left">Họ và tên</th>
                                <th className="p-2 text-left">Lớp</th>
                                <th className="p-2 text-left">Ngày sinh</th>
                                <th className="p-2 text-left">Phụ huynh</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {parsedResult.students.map((st) => (
                                <tr key={st.id}>
                                  <td className="p-2 font-mono text-purple-700">{st.studentCode}</td>
                                  <td className="p-2 font-bold text-slate-900">{st.fullName}</td>
                                  <td className="p-2">{st.className}</td>
                                  <td className="p-2">{st.birthDate}</td>
                                  <td className="p-2 text-slate-600">{st.parentName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Preview Table: Danh sách Tiết dạy Sổ đầu bài & TKB */}
                    {parsedResult.lessons.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-800 text-[11px]">
                          Danh sách Tiết dạy Sổ đầu bài & TKB ({parsedResult.lessons.length} tiết):
                        </div>
                        <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-[11px] border-collapse">
                            <thead className="bg-slate-100 text-slate-700 sticky top-0">
                              <tr>
                                <th className="p-2 text-left">Thứ / Tiết</th>
                                <th className="p-2 text-left">Môn học</th>
                                <th className="p-2 text-left">Tên bài dạy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {parsedResult.lessons.map((les) => (
                                <tr key={les.id}>
                                  <td className="p-2 font-bold">
                                    {les.dayOfWeek} - Tiết {les.period}
                                  </td>
                                  <td className="p-2">{les.subject}</td>
                                  <td className="p-2">{les.lessonName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {parsedResult && (
                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleApplyToApp}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Database className="w-4 h-4" />
                    Áp Dụng Hồ Sơ Vào Ứng Dụng & Đồng Bộ Cơ Sở Dữ Liệu Ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
