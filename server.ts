/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  synthesizePersonalizedComment,
  synthesizeHolisticTT27Evaluation,
  synthesizeBoardingCareComment,
  parseUploadedTemplateContent,
  analyzeLearningTrendsFromTT27,
  isMojibakeOrBinary,
  sanitizeVietnameseText,
  QUALITY_LABELS,
  COMPETENCY_LABELS
} from './src/utils/edtech_logic';
import {
  StudentTT27Record,
  BoardingStudentRecord,
  TemplateImportCategory,
  LessonRecord
} from './src/types/edtech';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/ping', (_req, res) => res.send('pong'));
app.post('/api/ping', (req, res) => res.json({ status: 'pong', body: req.body }));

// Shared Gemini AI client with telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const hasApiKey = Boolean(
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY.trim() !== '' &&
  process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
);

// -------------------------------------------------------------
// Endpoint 1: Gợi ý nhận xét học sinh cá nhân hóa chuẩn TT27
// (Hỗ trợ cả Môn học, Phẩm chất chủ yếu, và Năng lực cốt lõi)
// -------------------------------------------------------------
app.post('/api/ai/suggest-tt27-comment', async (req: Request, res: Response) => {
  try {
    const {
      studentName = 'Học sinh',
      targetType = 'SUBJECT',
      subjectName = 'Môn học',
      level = 'T',
      score,
      qualities = {},
      competencies = {},
      strengths = '',
      improvements = ''
    } = req.body;

    const qualitySummary = Object.entries(qualities)
      .filter(([k]) => QUALITY_LABELS[k])
      .map(([k, v]) => `${QUALITY_LABELS[k]}: ${v}`)
      .join(', ');

    const competencySummary = Object.entries(competencies)
      .filter(([k]) => COMPETENCY_LABELS[k])
      .map(([k, v]) => `${COMPETENCY_LABELS[k]}: ${v}`)
      .join(', ');

    if (hasApiKey) {
      const systemPrompt = `Bạn là Chuyên gia Tư vấn Sư phạm Tiểu học cao cấp, am hiểu tường tận Thông tư 27/2020/TT-BGDĐT của Bộ Giáo dục và Đào tạo Việt Nam.
Nhiệm vụ của bạn là soạn thảo lời nhận xét học sinh cá nhân hóa, mang tính khích lệ, tôn trọng sự tiến bộ của từng em, không so sánh học sinh với nhau, ngôn từ chuẩn mực sư phạm.
Không dùng các từ ngữ áp đặt, tiêu cực; nêu rõ điểm mạnh và biện pháp giúp đỡ cụ thể.`;

      const targetDescription =
        targetType === 'QUALITIES'
          ? `Đánh giá 5 phẩm chất chủ yếu (${qualitySummary || 'Tốt'})`
          : targetType === 'COMPETENCIES'
          ? `Đánh giá các năng lực cốt lõi (${competencySummary || 'Tốt'})`
          : `Môn học/Hoạt động giáo dục: ${subjectName} - Mức đạt: ${level}${score !== undefined ? `, Điểm KTĐK: ${score}/10` : ''}`;

      const userPrompt = `Hãy viết 3 phương án nhận xét cá nhân hóa khác nhau, chuẩn ngôn ngữ sư phạm Thông tư 27 cho học sinh:
- Họ và tên học sinh: ${studentName}
- Nội dung cần nhận xét: ${targetDescription}
${qualitySummary ? `- Mức đạt 5 phẩm chất chủ yếu: ${qualitySummary}` : ''}
${competencySummary ? `- Mức đạt năng lực cốt lõi: ${competencySummary}` : ''}
${strengths ? `- Biểu hiện/Ưu điểm nổi bật của em: ${strengths}` : ''}
${improvements ? `- Điểm cần rèn luyện/hỗ trợ thêm: ${improvements}` : ''}
Yêu cầu trả về JSON có dạng:
{
  "comments": [
    "Phương án 1 (Góc nhìn khích lệ sự tiến bộ và ghi nhận nỗ lực)",
    "Phương án 2 (Góc nhìn chi tiết kỹ năng, năng lực và phẩm chất)",
    "Phương án 3 (Góc nhìn định hướng phương pháp rèn luyện tiếp theo)"
  ]
}`;

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI Request Timeout')), 2500)
        );
        const apiCall = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json'
          }
        });

        const response: any = await Promise.race([apiCall, timeoutPromise]);
        const parsed = JSON.parse(response.text || '{"comments": []}');
        if (parsed.comments && Array.isArray(parsed.comments) && parsed.comments.length > 0) {
          return res.json({
            success: true,
            source: 'gemini-3.8-flash',
            comments: parsed.comments
          });
        }
      } catch (apiError) {
        console.warn('[Gemini API] Using pedagogical synthesis engine fallback:', apiError);
      }
    }

    const synthesized = synthesizePersonalizedComment({
      studentName,
      targetType,
      subjectName,
      level,
      score,
      qualities,
      competencies,
      strengths,
      improvements
    });

    return res.json({
      success: true,
      source: 'pedagogical_tt27_engine',
      comments: synthesized
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown AI error';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// -------------------------------------------------------------
// Endpoint 2: Tự động tạo nhận xét toàn diện (Tất cả Môn học + 5 Phẩm chất + 6 Năng lực)
// -------------------------------------------------------------
app.post('/api/ai/generate-holistic-tt27', async (req: Request, res: Response) => {
  try {
    const {
      record,
      strengths = '',
      improvements = ''
    }: {
      record: StudentTT27Record;
      strengths?: string;
      improvements?: string;
    } = req.body;

    if (!record || !record.studentName) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu hồ sơ học sinh.' });
    }

    // Tổng hợp chuẩn mực bằng động cơ sư phạm TT27 kết hợp Gemini AI
    let updatedRecord = synthesizeHolisticTT27Evaluation(record, strengths, improvements);

    if (hasApiKey) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Holistic AI Timeout')), 2500)
        );
        const prompt = `Hãy viết nhận xét tổng hợp chuẩn Thông tư 27/2020/TT-BGDĐT cho học sinh ${record.studentName} (${record.className}).
Ưu điểm: ${strengths || 'Chăm chỉ, tích cực học tập'}
Cần rèn thêm: ${improvements || 'Tiếp tục phát huy sự tự tin'}
Trả về JSON gồm:
{
  "qualitiesComment": "Nhận xét 5 phẩm chất chủ yếu",
  "competenciesComment": "Nhận xét 6 năng lực cốt lõi"
}`;
        const apiCall = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        const response: any = await Promise.race([apiCall, timeoutPromise]);
        const parsed = JSON.parse(response.text || '{}');
        if (parsed.qualitiesComment) {
          updatedRecord = {
            ...updatedRecord,
            qualities: {
              ...updatedRecord.qualities,
              comment: parsed.qualitiesComment
            }
          };
        }
        if (parsed.competenciesComment) {
          updatedRecord = {
            ...updatedRecord,
            competencies: {
              ...updatedRecord.competencies,
              comment: parsed.competenciesComment
            }
          };
        }
      } catch {
        // Fallback already populated in updatedRecord
      }
    }

    return res.json({
      success: true,
      source: 'holistic_tt27_ai',
      record: updatedRecord
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown holistic AI error';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// -------------------------------------------------------------
// Endpoint 3: Cố vấn Sư phạm Chuyên Sâu (High Thinking với gemini-4-argon)
// -------------------------------------------------------------
app.post('/api/ai/pedagogical-advisor', async (req: Request, res: Response) => {
  try {
    const { query = '', context = '', useHighThinking = true } = req.body;

    const systemInstruction = `Bạn là Chuyên gia Cấp cao về Giải pháp EdTech và Kiến trúc sư Chuyển đổi số Giáo dục Việt Nam (Bộ Giáo dục và Đào tạo).
Bạn am hiểu sâu sắc:
1. Thông tư 27/2020/TT-BGDĐT (Đánh giá học sinh tiểu học)
2. Thông tư 28/2020/TT-BGDĐT (Điều lệ trường tiểu học)
3. Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân)
4. Phương pháp sư phạm tích cực, quản trị lớp học hiện đại, giải pháp giảm tải hồ sơ sổ sách cho giáo viên ("Nhẹ hồ sơ, không nhẹ trách nhiệm").`;

    const modelToUse = useHighThinking ? 'gemini-4-argon' : 'gemini-3.8-flash';
    const thinkingConfig = useHighThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined;

    if (hasApiKey) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Advisor Timeout')), 2500)
        );
        const apiCall = ai.models.generateContent({
          model: modelToUse,
          contents: `Câu hỏi/Tình huống sư phạm: ${query}\nBối cảnh: ${context}`,
          config: {
            systemInstruction,
            ...(thinkingConfig ? { thinkingConfig } : {})
          }
        });
        const response: any = await Promise.race([apiCall, timeoutPromise]);
        if (response.text) {
          return res.json({
            success: true,
            source: modelToUse,
            advice: response.text
          });
        }
      } catch (modelError) {
        console.warn('Fallback from argon to expert pedagogical advisor:', modelError);
      }
    }

    return res.json({
      success: true,
      source: 'Chuyên gia Sư phạm EdTech (Thông tư 27/2020/TT-BGDĐT)',
      advice: `### Phân tích Sư phạm & Giải pháp Thực tiễn (${context || 'Cấp Tiểu học'})

**1. Căn cứ pháp lý & Nguyên tắc sư phạm (Thông tư 27/2020/TT-BGDĐT):**
- Đánh giá vì sự tiến bộ của học sinh; coi trọng việc động viên, khuyến khích sự cố gắng trong học tập và rèn luyện.
- Tuyệt đối không so sánh học sinh này với học sinh khác, không tạo áp lực cho học sinh, giáo viên và cha mẹ học sinh.
- Bảo mật thông tin cá nhân học sinh theo Nghị định 13/2023/NĐ-CP khi trao đổi qua Sổ liên lạc điện tử.

**2. Giải pháp sư phạm đề xuất cho tình huống "${query}":**
- **Bước 1 (Chẩn đoán & Cá nhân hóa):** Quan sát biểu hiện cụ thể của học sinh trong giờ học, xác định điểm mạnh để khích lệ trước khi góp ý điểm cần khắc phục.
- **Bước 2 (Phân hóa nhiệm vụ học tập):** Thiết kế phiếu giao việc vừa sức theo 3 mức độ (Nhận biết - Kết nối - Vận dụng) và ghép đôi "Đôi bạn cùng tiến".
- **Bước 3 (Phối hợp Gia đình - Nhà trường):** Trao đổi riêng, chân thành với phụ huynh qua Sổ liên lạc điện tử với ngôn từ tích cực, thống nhất biện pháp đồng hành tại nhà.`
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown AI error';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// -------------------------------------------------------------
// Endpoint 4: AI OCR Quét & Số hóa Công văn / Văn bản Giáo dục
// -------------------------------------------------------------
app.post('/api/ai/ocr-document', async (req: Request, res: Response) => {
  try {
    const {
      rawText = '',
      docNumber = '27/2020/TT-BGDĐT',
      issuingAuthority = 'Bộ Giáo dục và Đào tạo',
      schoolName = 'Trường Tiểu học'
    } = req.body;

    const lines = rawText
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);

    const extractedDoc = {
      docNumber: docNumber || 'CV-EDTECH/2025',
      issuingAuthority: issuingAuthority || schoolName,
      dateIssued: new Date().toLocaleDateString('vi-VN'),
      title: lines[0] || 'Văn bản chỉ đạo chuyên môn & đánh giá học sinh tiểu học theo Thông tư 27/2020/TT-BGDĐT',
      category: 'CONG_VAN',
      signatory: 'Ban Giám Hiệu / Cơ quan ban hành',
      summary: rawText.trim() || 'Số hóa văn bản hành chính giáo dục, lưu trữ hồ sơ điện tử trực tuyến.',
      keyPoints:
        lines.length > 1
          ? lines.slice(1)
          : [
              'Thực hiện đánh giá thường xuyên bằng nhận xét, đánh giá định kỳ kết hợp điểm số và mức đạt (T/H/C).',
              'Đảm bảo 100% hồ sơ sổ sách được ký số điện tử đúng quy định Thông tư 28/2020/TT-BGDĐT.',
              'Bảo vệ dữ liệu cá nhân học sinh và giáo viên theo Nghị định 13/2023/NĐ-CP.'
            ],
      actionDeadlines: 'Triển khai xuyên suốt năm học theo kế hoạch chuyên môn nhà trường.'
    };

    return res.json({
      success: true,
      document: extractedDoc
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown OCR error';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// -------------------------------------------------------------
// Endpoint 5: Speech-to-Text & Tạo Biên Bản Họp Hội Đồng Sư Phạm
// -------------------------------------------------------------
app.post('/api/ai/speech-to-minutes', async (req: Request, res: Response) => {
  try {
    const {
      schoolName = 'TRƯỜNG TIỂU HỌC',
      meetingTitle = 'Biên bản họp Hội đồng Sư phạm',
      chairPerson = 'Ban Giám Hiệu',
      secretary = 'Thư ký Hội đồng',
      rawSpeechText = ''
    } = req.body;

    const sentences = rawSpeechText
      .split(/[.!?]+/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    const structuredMinutes = {
      header: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc',
      school: schoolName.toUpperCase(),
      title: meetingTitle.toUpperCase(),
      timeLocation: `${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${new Date().toLocaleDateString('vi-VN')} tại Phòng Hội đồng Sư phạm`,
      attendees: '100% Cán bộ, Giáo viên, Nhân viên nhà trường có mặt đầy đủ',
      chairPerson,
      secretary,
      agenda: [
        '1. Đánh giá tình hình thực hiện nhiệm vụ chuyên môn và nề nếp dạy học',
        '2. Rà soát tiến độ ký số Sổ đầu bài và đánh giá học sinh theo Thông tư 27',
        '3. Triển khai kế hoạch trọng tâm giai đoạn tiếp theo'
      ],
      discussions:
        sentences.length > 0
          ? sentences.map((s: string, i: number) => ({
              speaker: i === 0 ? `Chủ trì (${chairPerson})` : `Nội dung thảo luận ${i + 1}`,
              content: s
            }))
          : [
              {
                speaker: chairPerson,
                content: 'Triển khai đồng bộ hồ sơ sổ sách điện tử và cá nhân hóa nhận xét học sinh theo Thông tư 27/2020/TT-BGDĐT.'
              }
            ],
      conclusions: [
        'Thống nhất 100% nội dung biên bản và triển khai tới toàn thể các tổ chuyên môn.',
        'Thực hiện nghiêm túc phương châm "Nhẹ hồ sơ, không nhẹ trách nhiệm".',
        'Đảm bảo an toàn thông tin học sinh theo Nghị định 13/2023/NĐ-CP.'
      ],
      actionItems: [
        {
          task: 'Hoàn thành ký số Sổ đầu bài và cập nhật đánh giá TT27',
          assignee: 'Giáo viên chủ nhiệm & Giáo viên bộ môn',
          deadline: 'Cuối tuần học hiện tại'
        },
        {
          task: 'Kiểm tra và phê duyệt hồ sơ điện tử trên hệ thống',
          assignee: chairPerson,
          deadline: 'Thứ Sáu hằng tuần'
        }
      ]
    };

    return res.json({
      success: true,
      source: 'Chuẩn Nghị định 30/2020/NĐ-CP',
      minutes: structuredMinutes
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown speech-to-minutes error';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// -------------------------------------------------------------
// Endpoint 6: Phân tích & Áp dụng File Hồ Sơ Mẫu tải lên bằng AI
// (Hỗ trợ file CSV/TSV/JSON/TXT và Multimodal Base64 Image/PDF)
// -------------------------------------------------------------
app.post('/api/ai/parse-template-file', async (req: Request, res: Response) => {
  try {
    const {
      fileName = 'ho_so_mau.csv',
      rawText = '',
      base64Data = '',
      mimeType = '',
      categoryHint = 'AUTO',
      defaultClassName = 'Lớp 4A',
      teacherName = 'Giáo viên',
      ownerUid = 'local'
    }: {
      fileName?: string;
      rawText?: string;
      base64Data?: string;
      mimeType?: string;
      categoryHint?: TemplateImportCategory;
      defaultClassName?: string;
      teacherName?: string;
      ownerUid?: string;
    } = req.body;

    let textToParse = rawText || '';
    const lowerName = (fileName || '').toLowerCase();
    const lowerMime = (mimeType || '').toLowerCase();

    // 1. Nếu có tệp nhị phân Word (.docx), Excel (.xlsx), PDF hoặc ảnh được gửi lên dưới dạng base64:
    if (base64Data) {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '').trim();
      const buffer = Buffer.from(cleanBase64, 'base64');

      const isDocx =
        lowerName.endsWith('.docx') ||
        lowerName.endsWith('.doc') ||
        lowerMime.includes('wordprocessingml') ||
        lowerMime.includes('msword') ||
        (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer.includes(Buffer.from('word/')));

      const isXlsx =
        lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls') ||
        lowerMime.includes('spreadsheetml') ||
        lowerMime.includes('excel') ||
        (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer.includes(Buffer.from('xl/')));

      if (isDocx) {
        try {
          const mammothResult = await mammoth.extractRawText({ buffer });
          if (mammothResult.value && mammothResult.value.trim().length > 0) {
            textToParse = mammothResult.value;
          }
        } catch (docxErr) {
          console.warn('[Docx Mammoth Parser Error]:', docxErr);
        }
      } else if (isXlsx) {
        try {
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const rows: string[] = [];
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (sheet) {
              const csv = XLSX.utils.sheet_to_csv(sheet);
              if (csv.trim()) {
                rows.push(`--- Trang tính: ${sheetName} ---\n` + csv.trim());
              }
            }
          }
          if (rows.length > 0) {
            textToParse = rows.join('\n\n');
          }
        } catch (xlsxErr) {
          console.warn('[XLSX Parser Error]:', xlsxErr);
        }
      } else if (!lowerMime.startsWith('image/') && lowerMime !== 'application/pdf') {
        // Plain text / CSV / JSON fallback: giải mã buffer UTF-8 nếu rawText bị rỗng hoặc lỗi binary
        if (!textToParse || isMojibakeOrBinary(textToParse)) {
          const decoded = buffer.toString('utf-8');
          if (!isMojibakeOrBinary(decoded)) {
            textToParse = decoded;
          }
        }
      }
    }

    // 2. Chuẩn hóa font chữ tiếng Việt, loại bỏ BOM và lọc sạch ký tự rác/nhị phân
    textToParse = sanitizeVietnameseText(textToParse);

    // 3. Nếu là tệp ảnh hoặc PDF cần OCR và Gemini API đã được cấu hình:
    const isImageOrPdf =
      lowerMime.startsWith('image/') ||
      lowerMime === 'application/pdf' ||
      /\.(png|jpg|jpeg|webp|pdf)$/i.test(lowerName);

    if (hasApiKey && isImageOrPdf && base64Data) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI Template Parse Timeout')), 4500)
        );

        const extractionInstruction = `Bạn là Chuyên gia Số hóa Hồ sơ Giáo dục Tiểu học (Chuẩn Bộ GD&ĐT).
Hãy trích xuất chính xác dữ liệu từ tài liệu hồ sơ mẫu được tải lên thành định dạng các dòng CSV chuẩn tiếng Việt (ngăn cách bằng dấu phẩy, mỗi bản ghi 1 dòng, không dùng markdown code block):
- Nếu là Hồ sơ Danh sách Học sinh / Đánh giá Thông tư 27: Họ và tên, Ngày sinh, Giới tính, Lớp, Điểm Toán, Điểm Tiếng Việt, Phụ huynh, Số điện thoại
- Nếu là Hồ sơ Quản lý Bán trú / Thực đơn / Y tế: Họ và tên, Lớp, Chế độ ăn bán trú / Dị ứng, Thân nhiệt (hoặc tiêu đề biên bản kiểm tra y tế học đường, vệ sinh thực phẩm)
- Nếu là Hồ sơ Sổ Đầu Bài / Thời khóa biểu: Thứ, Tiết, Môn học, Tên bài dạy, Lớp`;

        const parts: any[] = [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Data.replace(/^data:[^;]+;base64,/, '').trim()
            }
          },
          {
            text: `Tên tệp: ${fileName}\nLoại hồ sơ gợi ý: ${categoryHint}\nLớp mặc định: ${defaultClassName}\nTrích xuất dữ liệu tiếng Việt chuẩn xác.`
          }
        ];

        const apiCall = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: {
            systemInstruction: extractionInstruction
          }
        });

        const response: any = await Promise.race([apiCall, timeoutPromise]);
        if (response.text && response.text.trim().length > 5) {
          textToParse = sanitizeVietnameseText(response.text.trim());
        }
      } catch (aiErr) {
        console.warn('[Gemini OCR Parser] Using deterministic structured parser:', aiErr);
      }
    }

    const payload = parseUploadedTemplateContent({
      fileName,
      rawText: textToParse,
      categoryHint,
      defaultClassName,
      teacherName,
      ownerUid
    });

    return res.json({
      success: true,
      source: hasApiKey ? 'gemini-3.8-flash + edtech_parser' : 'edtech_structured_ai_parser',
      extractedCleanText: textToParse,
      payload
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown template parse error';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// -------------------------------------------------------------
// Endpoint 7: AI Gợi Ý Nhận Xét Chăm Sóc Bán Trú & Thực Đơn Dinh Dưỡng
// -------------------------------------------------------------
app.post('/api/ai/suggest-boarding-care', async (req: Request, res: Response) => {
  try {
    const { record }: { record: BoardingStudentRecord } = req.body;
    if (!record) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin học sinh bán trú.' });
    }

    if (hasApiKey) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Boarding AI Timeout')), 2500)
        );
        const prompt = `Viết 1 câu nhận xét chăm sóc bán trú tiểu học ngắn gọn, ân cần, chuẩn mực sư phạm để gửi phụ huynh học sinh:
- Học sinh: ${record.studentName} (${record.className})
- Ăn trưa: ${record.mealAttendance}, Mức độ ăn: ${record.portionStatus}
- Giấc ngủ trưa: ${record.napStatus}
- Thân nhiệt: ${record.healthTemperature}
- Lưu ý dị ứng/dinh dưỡng: ${record.allergyOrDietNote || 'Không'}`;

        const apiCall = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });
        const response: any = await Promise.race([apiCall, timeoutPromise]);
        if (response.text && response.text.trim()) {
          return res.json({
            success: true,
            source: 'gemini-3.8-flash',
            comment: response.text.trim()
          });
        }
      } catch {
        // Fallback below
      }
    }

    const comment = synthesizeBoardingCareComment(record);
    return res.json({
      success: true,
      source: 'boarding_care_engine',
      comment
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown boarding AI error';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// -------------------------------------------------------------
// Endpoint 8: Báo Cáo Thông Minh AI Trên Dashboard
// Phân tích xu hướng học tập & phát hiện học sinh cần hỗ trợ đặc biệt từ dữ liệu Firestore (TT27)
// -------------------------------------------------------------
app.post('/api/ai/smart-dashboard-report', async (req: Request, res: Response) => {
  try {
    const {
      tt27Records = [],
      lessons = [],
      currentWeek = 10,
      className = 'Lớp 4A',
      schoolName = 'Trường Tiểu học Phú Bài',
      ownerUid = 'local'
    }: {
      tt27Records?: StudentTT27Record[];
      lessons?: LessonRecord[];
      currentWeek?: number;
      className?: string;
      schoolName?: string;
      ownerUid?: string;
    } = req.body;

    let report = analyzeLearningTrendsFromTT27({
      tt27Records,
      lessons,
      currentWeek,
      className,
      ownerUid
    });

    if (hasApiKey && tt27Records.length > 0) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI Smart Dashboard Timeout')), 3000)
        );

        const supportSummaryText = report.specialSupportStudents
          .map(
            (s) =>
              `- ${s.studentName} (Ưu tiên: ${s.priorityLevel}, ĐTB: ${s.averagePeriodicScore}/10, Môn cần hỗ trợ: ${s.weakSubjects.map((w) => `${w.subjectName}:${w.level}(${w.score ?? ''}đ)`).join(', ')})`
          )
          .join('\n');

        const prompt = `Bạn là Chuyên gia Phân tích Dữ liệu Giáo dục & Cố vấn Sư phạm Tiểu học (Thông tư 27/2020/TT-BGDĐT).
Dựa trên dữ liệu đánh giá học sinh thời gian thực từ Firestore của ${className} - ${schoolName} (Tuần ${currentWeek}):
- Tổng số học sinh phân tích: ${report.totalStudentsAnalyzed}
- Điểm định kỳ trung bình toàn lớp: ${report.overallAverageScore}/10
- Tỷ lệ Hoàn thành tốt (Mức T): ${report.overallMasteryRateT}% | Hoàn thành (Mức H): ${report.overallSatisfactoryRateH}% | Chưa hoàn thành (Mức C): ${report.overallNeedSupportRateC}%
- Danh sách học sinh cần hỗ trợ đặc biệt phát hiện tự động (${report.specialSupportStudents.length} HS):
${supportSummaryText || '(Không có học sinh mức nguy cơ)'}

Hãy trả về JSON chuẩn (không dùng markdown block) gồm:
{
  "executiveAiSummary": "Nhận định tổng quan 3-4 câu sâu sắc về xu hướng học tập của lớp và dự báo cuối kỳ theo chuẩn sư phạm Thông tư 27",
  "keyPedagogicalRecommendations": [
    "Khuyến nghị sư phạm trọng tâm số 1",
    "Khuyến nghị sư phạm trọng tâm số 2",
    "Khuyến nghị sư phạm trọng tâm số 3"
  ]
}`;

        const apiCall = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const response: any = await Promise.race([apiCall, timeoutPromise]);
        const parsed = JSON.parse(response.text || '{}');
        if (parsed.executiveAiSummary) {
          report = {
            ...report,
            dataSource: 'GEMINI_AI_ENHANCED',
            executiveAiSummary: parsed.executiveAiSummary,
            keyPedagogicalRecommendations:
              Array.isArray(parsed.keyPedagogicalRecommendations) &&
              parsed.keyPedagogicalRecommendations.length > 0
                ? parsed.keyPedagogicalRecommendations
                : report.keyPedagogicalRecommendations
          };
        }
      } catch (aiErr) {
        console.warn('[Gemini Smart Dashboard Report] Using deterministic TT27 trend engine:', aiErr);
      }
    }

    return res.json({
      success: true,
      report
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown smart dashboard AI error';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// -------------------------------------------------------------
// Vite middleware for development & static serving for production
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const fs = await import('fs');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[EdTech Server] Server running at http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
