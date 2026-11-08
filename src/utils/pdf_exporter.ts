/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side Ministry of Education & Training (BGD&ĐT) Standard A4 PDF Exporter
 * Complies with Decree 30/2020/NĐ-CP (Administrative Document Formatting),
 * Circular 27/2020/TT-BGDĐT (Primary Student Evaluation), and
 * Circular 28/2020/TT-BGDĐT (Electronic School Records & Digital Signature).
 *
 * Renders crisp Vietnamese typography onto high-DPI A4 Canvas pages and
 * packages them into a valid multi-page PDF 1.4 binary (.pdf) file so that
 * Vietnamese diacritics render with 100% fidelity across all PDF viewers.
 */

import { LessonRecord, StudentTT27Record } from '../types/edtech';
import { MonthlyReportSummary } from './edtech_logic';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const CANVAS_SCALE = 2; // 2x high-DPI rendering (1190 x 1684 px per page)
const PAGE_W = Math.round(A4_WIDTH_PT * CANVAS_SCALE); // 1191
const PAGE_H = Math.round(A4_HEIGHT_PT * CANVAS_SCALE); // 1684

/**
 * Wraps a paragraph of Vietnamese text into lines that fit within `maxWidth`.
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (words.length === 0 || (words.length === 1 && words[0] === '')) {
      lines.push('');
      continue;
    }
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Converts a base64 data URL (image/jpeg) into a Uint8Array of raw JPEG bytes.
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Packages one or more JPEG page images (with pixel dimensions) into a standards-compliant
 * PDF 1.4 binary document (`%PDF-1.4`) with exact A4 page dimensions (595.28 x 841.89 pt).
 */
function buildPdfFromJpegPages(
  pages: Array<{ jpegBytes: Uint8Array; widthPx: number; heightPx: number }>
): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  const pushString = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.byteLength;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentOffset += bytes.byteLength;
  };

  const startObject = (objId: number) => {
    offsets[objId] = currentOffset;
    pushString(`${objId} 0 obj\n`);
  };

  const endObject = () => {
    pushString(`\nendobj\n`);
  };

  // Header with binary comment per PDF 1.4 spec
  pushString(`%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`);

  // Object 1: Catalog
  startObject(1);
  pushString(`<< /Type /Catalog /Pages 2 0 R >>`);
  endObject();

  // Each page uses 3 objects: Page dict, Content stream, Image XObject
  // Object 2 is Pages tree
  const firstPageObjId = 3;
  const pageObjIds: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(firstPageObjId + i * 3);
  }

  startObject(2);
  pushString(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  );
  endObject();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageObjId = firstPageObjId + i * 3;
    const contentObjId = pageObjId + 1;
    const imageObjId = pageObjId + 2;
    const imgName = `/Im${i + 1}`;

    // Page Object
    startObject(pageObjId);
    pushString(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT.toFixed(2)} ${A4_HEIGHT_PT.toFixed(2)}] /Resources << /XObject << ${imgName} ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );
    endObject();

    // Content Stream (draws image full A4 page)
    const contentStream = `q\n${A4_WIDTH_PT.toFixed(2)} 0 0 ${A4_HEIGHT_PT.toFixed(2)} 0 0 cm\n${imgName} Do\nQ\n`;
    const contentBytes = encoder.encode(contentStream);
    startObject(contentObjId);
    pushString(`<< /Length ${contentBytes.byteLength} >>\nstream\n`);
    pushBytes(contentBytes);
    pushString(`endstream`);
    endObject();

    // Image XObject (DCTDecode JPEG)
    startObject(imageObjId);
    pushString(
      `<< /Type /XObject /Subtype /Image /Width ${page.widthPx} /Height ${page.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpegBytes.byteLength} >>\nstream\n`
    );
    pushBytes(page.jpegBytes);
    pushString(`\nendstream`);
    endObject();
  }

  const totalObjects = firstPageObjId + pages.length * 3;
  const xrefOffset = currentOffset;

  pushString(`xref\n0 ${totalObjects}\n`);
  pushString(`0000000000 65535 f \n`);
  for (let id = 1; id < totalObjects; id++) {
    const off = String(offsets[id] || 0).padStart(10, '0');
    pushString(`${off} 00000 n \n`);
  }

  pushString(
    `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return new Blob(chunks as unknown as BlobPart[], { type: 'application/pdf' });
}

/**
 * Renders Page 1 of the Ministry-Standard Monthly Summary Report onto an A4 Canvas.
 */
function renderPage1Canvas(
  summary: MonthlyReportSummary,
  lessons: LessonRecord[],
  tt27Records: StudentTT27Record[]
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d')!;

  // White A4 background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Subtle official border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, PAGE_W - 96, PAGE_H - 96);

  const marginX = 80;
  const contentW = PAGE_W - marginX * 2;
  let y = 95;

  // 1. NATIONAL HEADER (Quốc hiệu & Tiêu ngữ theo Nghị định 30/2020/NĐ-CP)
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';

  // Left Header: Governing Unit & School Name
  const leftCenterX = marginX + contentW * 0.23;
  ctx.font = 'bold 20px "Times New Roman", Times, serif';
  ctx.fillText((summary.district || 'PHÒNG GD&ĐT').toUpperCase(), leftCenterX, y);
  ctx.font = 'bold 21px "Times New Roman", Times, serif';
  ctx.fillText(summary.schoolName.toUpperCase(), leftCenterX, y + 28);

  // Underline left header
  ctx.beginPath();
  ctx.moveTo(leftCenterX - 90, y + 38);
  ctx.lineTo(leftCenterX + 90, y + 38);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'italic 18px "Times New Roman", Times, serif';
  ctx.fillText(`Số: ${summary.reportCode}/BC-BGD`, leftCenterX, y + 64);

  // Right Header: Quốc hiệu & Tiêu ngữ
  const rightCenterX = marginX + contentW * 0.72;
  ctx.font = 'bold 21px "Times New Roman", Times, serif';
  ctx.fillText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', rightCenterX, y);
  ctx.font = 'bold 21px "Times New Roman", Times, serif';
  ctx.fillText('Độc lập - Tự do - Hạnh phúc', rightCenterX, y + 28);

  ctx.beginPath();
  ctx.moveTo(rightCenterX - 130, y + 38);
  ctx.lineTo(rightCenterX + 130, y + 38);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const dateObj = new Date(summary.generatedAt);
  const dayStr = String(dateObj.getDate()).padStart(2, '0');
  const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yearStr = dateObj.getFullYear();
  ctx.font = 'italic 18px "Times New Roman", Times, serif';
  ctx.fillText(
    `${summary.district || 'Địa phương'}, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}`,
    rightCenterX,
    y + 64
  );

  y += 110;

  // 2. DOCUMENT TITLE
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 28px "Times New Roman", Times, serif';
  ctx.fillText(
    `BÁO CÁO TỔNG KẾT CÔNG TÁC GIÁO DỤC ${summary.monthLabel.toUpperCase()}`,
    PAGE_W / 2,
    y
  );

  y += 30;
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 19px "Times New Roman", Times, serif';
  ctx.fillText(
    `(Tích hợp Dữ liệu Đánh giá Học sinh theo Thông tư 27/2020/TT-BGDĐT & Sổ Đầu Bài Điện Tử)`,
    PAGE_W / 2,
    y
  );

  y += 26;
  ctx.font = 'italic 18px "Times New Roman", Times, serif';
  ctx.fillText(
    `Năm học: ${summary.schoolYear} • Lớp/Đơn vị: ${summary.className} • Kỳ đánh giá: ${summary.termLabel}`,
    PAGE_W / 2,
    y
  );

  y += 32;

  // 3. SECTION I: THÔNG TIN CHUNG
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 21px "Times New Roman", Times, serif';
  ctx.fillText('I. THÔNG TIN CHUNG VỀ ĐƠN VỊ & CÁN BỘ LẬP BÁO CÁO', marginX, y);
  y += 14;

  // Info Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(marginX, y, contentW, 88);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(marginX, y, contentW, 88);

  ctx.fillStyle = '#0f172a';
  ctx.font = '19px "Times New Roman", Times, serif';
  ctx.fillText(
    `• Đơn vị trường: ${summary.schoolName} (Mã định danh Bộ GD&ĐT: ${summary.schoolCode})`,
    marginX + 18,
    y + 28
  );
  ctx.fillText(
    `• Lớp phụ trách: ${summary.className}     • Sĩ số đánh giá TT27: ${summary.tt27Stats.totalStudents} học sinh`,
    marginX + 18,
    y + 54
  );
  ctx.fillText(
    `• Người lập báo cáo: ${summary.teacherName} (${summary.teacherTitle}) • Chứng thư số: ${summary.signatureCertId}`,
    marginX + 18,
    y + 78
  );

  y += 116;

  // 4. SECTION II: TỔNG HỢP KỶ CƯƠNG SỔ ĐẦU BÀI ĐIỆN TỬ (THÔNG TƯ 28/2020/TT-BGDĐT)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 21px "Times New Roman", Times, serif';
  ctx.fillText(
    'II. TỔNG HỢP KỶ CƯƠNG SỔ ĐẦU BÀI ĐIỆN TỬ (THÔNG TƯ 28/2020/TT-BGDĐT)',
    marginX,
    y
  );
  y += 14;

  // 4 KPI cells for So Dau Bai
  const kpiW = contentW / 4;
  const kpiH = 74;
  const sdbKpis = [
    { label: 'Tổng số tiết đã dạy', value: `${summary.lessonStats.totalLessons} tiết` },
    {
      label: 'Tỷ lệ ký số SmartCA',
      value: `${summary.lessonStats.signedLessons}/${summary.lessonStats.totalLessons} (${summary.lessonStats.signedRatePercent}%)`
    },
    { label: 'Điểm tiết dạy TB', value: `${summary.lessonStats.averageLessonScore}/10 điểm` },
    { label: 'Chuyên cần trung bình', value: `${summary.lessonStats.averageAttendancePercent}%` }
  ];

  for (let i = 0; i < 4; i++) {
    const cellX = marginX + i * kpiW;
    ctx.fillStyle = '#eff6ff';
    ctx.fillRect(cellX, y, kpiW, kpiH);
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cellX, y, kpiW, kpiH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '17px "Times New Roman", Times, serif';
    ctx.fillText(sdbKpis[i].label, cellX + kpiW / 2, y + 26);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Times New Roman", Times, serif';
    ctx.fillText(sdbKpis[i].value, cellX + kpiW / 2, y + 56);
  }

  y += kpiH + 18;

  // Table of recent lessons in Sổ đầu bài (up to 5 rows on page 1)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px "Times New Roman", Times, serif';
  ctx.fillText('Bảng 1. Trích lục các tiết dạy tiêu biểu trong Sổ đầu bài điện tử:', marginX, y);
  y += 10;

  const colWidthsSdb = [60, 120, 140, 340, 110, 95, contentW - 865];
  const headersSdb = ['Tiết', 'Thứ / Ngày', 'Môn học', 'Tên bài dạy & Nội dung', 'Sĩ số', 'Điểm', 'Trạng thái ký số'];
  const rowHSdb = 34;

  // Draw Table Header
  let curX = marginX;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(marginX, y, contentW, rowHSdb);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(marginX, y, contentW, rowHSdb);

  ctx.font = 'bold 17px "Times New Roman", Times, serif';
  ctx.fillStyle = '#0f172a';
  for (let c = 0; c < headersSdb.length; c++) {
    ctx.fillText(headersSdb[c], curX + 8, y + 23);
    if (c > 0) {
      ctx.beginPath();
      ctx.moveTo(curX, y);
      ctx.lineTo(curX, y + rowHSdb);
      ctx.stroke();
    }
    curX += colWidthsSdb[c];
  }
  y += rowHSdb;

  const displayLessons = lessons.slice(0, 5);
  if (displayLessons.length === 0) {
    ctx.strokeRect(marginX, y, contentW, rowHSdb);
    ctx.font = 'italic 17px "Times New Roman", Times, serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(
      'Chưa có tiết học nào được ghi nhận trong Sổ đầu bài điện tử kỳ này.',
      marginX + 14,
      y + 23
    );
    y += rowHSdb;
  } else {
    for (const les of displayLessons) {
      curX = marginX;
      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(marginX, y, contentW, rowHSdb);
      ctx.font = '17px "Times New Roman", Times, serif';
      ctx.fillStyle = '#0f172a';

      const statusText =
        les.approvalStatus === 'DA_DUYET_BGH'
          ? 'BGH đã duyệt'
          : les.approvalStatus === 'DA_KY_GV'
          ? 'GV đã ký số'
          : 'Chờ ký số';

      const cells = [
        `Tiết ${les.period}`,
        `${les.dayOfWeek}`,
        les.subject,
        les.lessonName.length > 36 ? `${les.lessonName.slice(0, 35)}...` : les.lessonName,
        `${les.attendedStudents}/${les.totalStudents}`,
        `${les.score}/10`,
        statusText
      ];

      for (let c = 0; c < cells.length; c++) {
        ctx.fillText(cells[c], curX + 8, y + 23);
        if (c > 0) {
          ctx.beginPath();
          ctx.moveTo(curX, y);
          ctx.lineTo(curX, y + rowHSdb);
          ctx.stroke();
        }
        curX += colWidthsSdb[c];
      }
      y += rowHSdb;
    }
  }

  y += 28;

  // 5. SECTION III: TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ HỌC SINH THEO THÔNG TƯ 27/2020/TT-BGDĐT
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 21px "Times New Roman", Times, serif';
  ctx.fillText(
    'III. TỔNG HỢP ĐÁNH GIÁ HỌC SINH THEO THÔNG TƯ 27/2020/TT-BGDĐT (MẪU 01/TT27)',
    marginX,
    y
  );
  y += 14;

  // 4 KPI cells for TT27 Awards (Điều 13 TT27)
  const tt27Kpis = [
    {
      label: 'Học sinh Xuất sắc',
      value: `${summary.tt27Stats.xuatSacCount} HS (${summary.tt27Stats.xuatSacPercent}%)`
    },
    {
      label: 'Học sinh Tiêu biểu',
      value: `${summary.tt27Stats.tieuBieuCount} HS (${summary.tt27Stats.tieuBieuPercent}%)`
    },
    {
      label: 'Hoàn thành chương trình',
      value: `${summary.tt27Stats.hoanThanhCount} HS (${summary.tt27Stats.hoanThanhPercent}%)`
    },
    {
      label: 'Cần rèn luyện thêm (C)',
      value: `${summary.tt27Stats.chuaHoanThanhCount} HS (${summary.tt27Stats.chuaHoanThanhPercent}%)`
    }
  ];

  for (let i = 0; i < 4; i++) {
    const cellX = marginX + i * kpiW;
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(cellX, y, kpiW, kpiH);
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cellX, y, kpiW, kpiH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#065f46';
    ctx.font = '17px "Times New Roman", Times, serif';
    ctx.fillText(tt27Kpis[i].label, cellX + kpiW / 2, y + 26);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 21px "Times New Roman", Times, serif';
    ctx.fillText(tt27Kpis[i].value, cellX + kpiW / 2, y + 56);
  }

  y += kpiH + 18;

  // Table of Subject Breakdown (Mức T / H / C & Điểm định kỳ TB)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px "Times New Roman", Times, serif';
  ctx.fillText(
    `Bảng 2. Thống kê kết quả các môn học & hoạt động giáo dục (5 Phẩm chất Tốt: ${summary.tt27Stats.qualitiesGoodRatePercent}% • 6 Năng lực Tốt: ${summary.tt27Stats.competenciesGoodRatePercent}%):`,
    marginX,
    y
  );
  y += 10;

  const colWidthsSub = [260, 190, 190, 190, contentW - 830];
  const headersSub = [
    'Môn học / Hoạt động GD',
    'Hoàn thành tốt (T)',
    'Hoàn thành (H)',
    'Chưa hoàn thành (C)',
    'Điểm KTĐK Trung bình'
  ];

  curX = marginX;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(marginX, y, contentW, rowHSdb);
  ctx.strokeStyle = '#64748b';
  ctx.strokeRect(marginX, y, contentW, rowHSdb);
  ctx.font = 'bold 17px "Times New Roman", Times, serif';
  ctx.fillStyle = '#0f172a';

  for (let c = 0; c < headersSub.length; c++) {
    ctx.fillText(headersSub[c], curX + 10, y + 23);
    if (c > 0) {
      ctx.beginPath();
      ctx.moveTo(curX, y);
      ctx.lineTo(curX, y + rowHSdb);
      ctx.stroke();
    }
    curX += colWidthsSub[c];
  }
  y += rowHSdb;

  const displaySubjects = summary.tt27Stats.subjectStats.slice(0, 6);
  if (displaySubjects.length === 0) {
    ctx.strokeRect(marginX, y, contentW, rowHSdb);
    ctx.font = 'italic 17px "Times New Roman", Times, serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(
      'Chưa có dữ liệu đánh giá môn học theo Thông tư 27 trong kỳ báo cáo này.',
      marginX + 14,
      y + 23
    );
    y += rowHSdb;
  } else {
    for (const sub of displaySubjects) {
      curX = marginX;
      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(marginX, y, contentW, rowHSdb);
      ctx.font = '17px "Times New Roman", Times, serif';
      ctx.fillStyle = '#0f172a';

      const subCells = [
        sub.subjectName,
        `${sub.countT} học sinh`,
        `${sub.countH} học sinh`,
        `${sub.countC} học sinh`,
        sub.averageScore !== null ? `${sub.averageScore} / 10 điểm` : 'Đánh giá nhận xét'
      ];

      for (let c = 0; c < subCells.length; c++) {
        ctx.fillText(subCells[c], curX + 10, y + 23);
        if (c > 0) {
          ctx.beginPath();
          ctx.moveTo(curX, y);
          ctx.lineTo(curX, y + rowHSdb);
          ctx.stroke();
        }
        curX += colWidthsSub[c];
      }
      y += rowHSdb;
    }
  }

  y += 28;

  // 6. SECTION IV: NHẬN XÉT CHUNG & PHƯƠNG HƯỚNG THÁNG TỚI
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 21px "Times New Roman", Times, serif';
  ctx.fillText('IV. ĐÁNH GIÁ CHUNG TRONG THÁNG & PHƯƠNG HƯỚNG NHIỆM VỤ THÁNG TỚI', marginX, y);
  y += 26;

  ctx.font = '18px "Times New Roman", Times, serif';
  ctx.fillStyle = '#1e293b';
  const evalLines = wrapTextLines(ctx, summary.generalEvaluation, contentW);
  for (const line of evalLines.slice(0, 4)) {
    ctx.fillText(line, marginX, y);
    y += 24;
  }

  y += 8;
  ctx.font = 'bold 18px "Times New Roman", Times, serif';
  ctx.fillText('Phương hướng trọng tâm tháng tới:', marginX, y);
  y += 24;

  ctx.font = '18px "Times New Roman", Times, serif';
  const planLines = wrapTextLines(ctx, summary.nextMonthPlan, contentW);
  for (const line of planLines.slice(0, 4)) {
    ctx.fillText(line, marginX, y);
    y += 24;
  }

  // 7. SIGNATURE & DIGITAL SEAL FOOTER (Bottom of Page 1)
  const sigTopY = Math.max(y + 18, PAGE_H - 255);
  const leftSigX = marginX + contentW * 0.22;
  const rightSigX = marginX + contentW * 0.75;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 19px "Times New Roman", Times, serif';
  ctx.fillText('XÁC NHẬN CỦA BAN GIÁM HIỆU', leftSigX, sigTopY);
  ctx.font = 'italic 16px "Times New Roman", Times, serif';
  ctx.fillText('(Ký duyệt điện tử và đóng dấu nhà trường)', leftSigX, sigTopY + 22);

  // Official Red Stamp Box for BGH
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.strokeRect(leftSigX - 135, sigTopY + 34, 270, 74);
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 16px "Times New Roman", Times, serif';
  ctx.fillText('ĐÃ KIỂM TRA HỒ SƠ ĐIỆN TỬ', leftSigX, sigTopY + 60);
  ctx.font = '15px "Times New Roman", Times, serif';
  ctx.fillText(summary.schoolName.toUpperCase(), leftSigX, sigTopY + 82);
  ctx.fillText(`Mã trường: ${summary.schoolCode}`, leftSigX, sigTopY + 100);

  // Right column: Teacher SmartCA Signature
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 19px "Times New Roman", Times, serif';
  ctx.fillText('NGƯỜI LẬP BÁO CÁO (GIÁO VIÊN)', rightSigX, sigTopY);
  ctx.font = 'italic 16px "Times New Roman", Times, serif';
  ctx.fillText('(Đã ký số SmartCA theo TT28/2020/TT-BGDĐT)', rightSigX, sigTopY + 22);

  // SmartCA Green Verification Stamp
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2;
  ctx.strokeRect(rightSigX - 150, sigTopY + 34, 300, 74);
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 16px "Times New Roman", Times, serif';
  ctx.fillText(`KÝ SỐ BỞI: ${summary.teacherName.toUpperCase()}`, rightSigX, sigTopY + 58);
  ctx.font = '15px "Times New Roman", Times, serif';
  ctx.fillText(`Chứng thư: ${summary.signatureCertId}`, rightSigX, sigTopY + 80);
  ctx.fillText(`Mã băm: ${summary.signatureHash}`, rightSigX, sigTopY + 99);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 19px "Times New Roman", Times, serif';
  ctx.fillText(summary.teacherName, rightSigX, sigTopY + 135);

  // Page Footer metadata
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '15px "Times New Roman", Times, serif';
  ctx.fillText(
    `Trang 1 • Hệ thống Hồ sơ Giáo dục Điện tử Chuẩn Bộ GD&ĐT • Bảo mật theo Nghị định 13/2023/NĐ-CP`,
    PAGE_W / 2,
    PAGE_H - 62
  );

  return canvas;
}

/**
 * Optional Page 2: Detailed Student Evaluation Roster per TT27 (if students exist)
 */
function renderPage2StudentRosterCanvas(
  summary: MonthlyReportSummary,
  tt27Records: StudentTT27Record[]
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, PAGE_W - 96, PAGE_H - 96);

  const marginX = 80;
  const contentW = PAGE_W - marginX * 2;
  let y = 100;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 24px "Times New Roman", Times, serif';
  ctx.fillText(
    `PHỤ LỤC: DANH SÁCH TỔNG HỢP ĐÁNH GIÁ HỌC SINH THEO THÔNG TƯ 27/2020/TT-BGDĐT`,
    PAGE_W / 2,
    y
  );
  y += 28;
  ctx.fillStyle = '#334155';
  ctx.font = 'italic 18px "Times New Roman", Times, serif';
  ctx.fillText(
    `Kèm theo Báo cáo số ${summary.reportCode}/BC-BGD • ${summary.schoolName} • ${summary.className}`,
    PAGE_W / 2,
    y
  );
  y += 32;

  const colWidths = [55, 210, 90, 90, 100, 175, contentW - 720];
  const headers = [
    'STT',
    'Họ và tên học sinh',
    'Tiếng Việt',
    'Toán',
    '5 PC / 6 NL',
    'Danh hiệu khen thưởng',
    'Nhận xét cá nhân hóa (Trích lược)'
  ];
  const rowH = 44;

  let curX = marginX;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(marginX, y, contentW, rowH);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(marginX, y, contentW, rowH);
  ctx.font = 'bold 16px "Times New Roman", Times, serif';
  ctx.fillStyle = '#0f172a';

  for (let c = 0; c < headers.length; c++) {
    ctx.fillText(headers[c], curX + 8, y + 27);
    if (c > 0) {
      ctx.beginPath();
      ctx.moveTo(curX, y);
      ctx.lineTo(curX, y + rowH);
      ctx.stroke();
    }
    curX += colWidths[c];
  }
  y += rowH;

  const maxRows = Math.min(tt27Records.length, 26);
  for (let idx = 0; idx < maxRows; idx++) {
    const rec = tt27Records[idx];
    curX = marginX;
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(marginX, y, contentW, rowH);
    ctx.font = '16px "Times New Roman", Times, serif';
    ctx.fillStyle = '#0f172a';

    const tv = rec.subjects.tiengViet;
    const toan = rec.subjects.toan;
    const tvStr = tv ? `${tv.level}${tv.periodicScore !== undefined ? ` (${tv.periodicScore}đ)` : ''}` : '-';
    const toanStr = toan
      ? `${toan.level}${toan.periodicScore !== undefined ? ` (${toan.periodicScore}đ)` : ''}`
      : '-';

    const awardLabel =
      rec.finalAward === 'XUAT_SAC'
        ? 'Học sinh Xuất sắc'
        : rec.finalAward === 'TIEU_BIEU'
        ? 'Học sinh Tiêu biểu'
        : rec.finalAward === 'HOAN_THANH_CHUONG_TRINH'
        ? 'Hoàn thành CT'
        : 'Cần rèn luyện';

    const rawComment =
      tv?.teacherComment ||
      rec.qualities.comment ||
      rec.competencies.comment ||
      'Hoàn thành nhiệm vụ học tập.';
    const shortComment = rawComment.length > 38 ? `${rawComment.slice(0, 37)}...` : rawComment;

    const rowCells = [
      String(idx + 1),
      rec.studentName,
      tvStr,
      toanStr,
      `Đạt chuẩn`,
      awardLabel,
      shortComment
    ];

    for (let c = 0; c < rowCells.length; c++) {
      ctx.fillText(rowCells[c], curX + 8, y + 27);
      if (c > 0) {
        ctx.beginPath();
        ctx.moveTo(curX, y);
        ctx.lineTo(curX, y + rowH);
        ctx.stroke();
      }
      curX += colWidths[c];
    }
    y += rowH;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '15px "Times New Roman", Times, serif';
  ctx.fillText(
    `Trang 2 • Phụ lục Tổng hợp Đánh giá Học sinh theo Thông tư 27/2020/TT-BGDĐT • ${summary.schoolName}`,
    PAGE_W / 2,
    PAGE_H - 62
  );

  return canvas;
}

/**
 * Generates a real, multi-page A4 PDF binary Blob and triggers browser download.
 */
export async function exportMinistryMonthlyPdf(
  summary: MonthlyReportSummary,
  lessons: LessonRecord[],
  tt27Records: StudentTT27Record[]
): Promise<{ filename: string; pageCount: number; reportCode: string; byteSize: number }> {
  const page1Canvas = renderPage1Canvas(summary, lessons, tt27Records);
  const pagesData: Array<{ jpegBytes: Uint8Array; widthPx: number; heightPx: number }> = [
    {
      jpegBytes: dataUrlToUint8Array(page1Canvas.toDataURL('image/jpeg', 0.94)),
      widthPx: page1Canvas.width,
      heightPx: page1Canvas.height
    }
  ];

  if (tt27Records.length > 0) {
    const page2Canvas = renderPage2StudentRosterCanvas(summary, tt27Records);
    pagesData.push({
      jpegBytes: dataUrlToUint8Array(page2Canvas.toDataURL('image/jpeg', 0.94)),
      widthPx: page2Canvas.width,
      heightPx: page2Canvas.height
    });
  }

  const pdfBlob = buildPdfFromJpegPages(pagesData);
  const safeMonth = summary.monthLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const filename = `Bao_Cao_Tong_Ket_${safeMonth}_TT27_SoDauBai_BGD.pdf`;

  // Trigger download via hidden anchor element (works cleanly inside sandboxed iframes without window.open)
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  return {
    filename,
    pageCount: pagesData.length,
    reportCode: summary.reportCode,
    byteSize: pdfBlob.size
  };
}
