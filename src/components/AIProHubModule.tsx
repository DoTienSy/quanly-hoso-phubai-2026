/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  BrainCircuit,
  FileScan,
  Mic,
  Send,
  RefreshCw,
  FileText,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';
import { UserProfile } from '../types/edtech';

interface AIProHubModuleProps {
  currentUser: UserProfile;
}

export const AIProHubModule: React.FC<AIProHubModuleProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'ADVISOR' | 'OCR' | 'SPEECH_MINUTES'>('ADVISOR');

  // Tab 1: AI Advisor State
  const [query, setQuery] = useState<string>('');
  const [useHighThinking, setUseHighThinking] = useState<boolean>(true);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState<boolean>(false);
  const [advisorResponses, setAdvisorResponses] = useState<Array<{ role: 'user' | 'ai'; text: string; source?: string }>>([
    {
      role: 'ai',
      text: `Xin chào Thầy/Cô ${currentUser.name} (${currentUser.schoolName})! Tôi là Trợ lý Cố vấn Sư phạm AI chuẩn Thông tư 27/2020/TT-BGDĐT và Thông tư 28/2020/TT-BGDĐT.\nThầy/Cô có thể đặt câu hỏi về phương pháp nhận xét học sinh, giải quyết tình huống sư phạm hoặc số hóa hồ sơ tại đây.`,
      source: 'Hệ thống Sư phạm Chuẩn BGD'
    }
  ]);

  // Tab 2: OCR State
  const [ocrDocNumber, setOcrDocNumber] = useState<string>('27/2020/TT-BGDĐT');
  const [ocrAuthority, setOcrAuthority] = useState<string>(currentUser.schoolName);
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);

  // Tab 3: Speech-to-Minutes State
  const [meetingTitle, setMeetingTitle] = useState<string>(`Họp Chuyên Môn Tuần ${currentUser.currentWeek || 1}`);
  const [rawSpeechText, setRawSpeechText] = useState<string>('');
  const [isProcessingSpeech, setIsProcessingSpeech] = useState<boolean>(false);
  const [meetingMinutes, setMeetingMinutes] = useState<any>(null);

  const handleSendAdvisor = async (customPrompt?: string) => {
    const promptToSend = customPrompt || query;
    if (!promptToSend.trim()) return;

    const userMsg = promptToSend;
    setQuery('');
    setAdvisorResponses(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAdvisorLoading(true);

    try {
      const res = await fetch('/api/ai/pedagogical-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg,
          context: `${currentUser.schoolName}. Người dùng: ${currentUser.name} (${currentUser.title})`,
          useHighThinking
        })
      });

      const data = await res.json();
      setAdvisorResponses(prev => [
        ...prev,
        {
          role: 'ai',
          text: data.advice || 'Đã ghi nhận yêu cầu sư phạm.',
          source: data.source || 'gemini-4-argon'
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdvisorLoading(false);
    }
  };

  const handleRunOcr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOcrLoading(true);
    try {
      const res = await fetch('/api/ai/ocr-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumber: ocrDocNumber,
          issuingAuthority: ocrAuthority || currentUser.schoolName,
          schoolName: currentUser.schoolName,
          rawText: ocrRawText
        })
      });
      const data = await res.json();
      setOcrResult(data.document);
    } catch (err) {
      console.error(err);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleGenerateMeetingMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingSpeech(true);
    try {
      const res = await fetch('/api/ai/speech-to-minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: currentUser.schoolName,
          meetingTitle,
          chairPerson: currentUser.name,
          rawSpeechText
        })
      });
      const data = await res.json();
      setMeetingMinutes(data.minutes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingSpeech(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Trợ Lý AI Sư Phạm • {currentUser.schoolName}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Trung Tâm Trợ Lý AI Sư Phạm & Số Hóa Hành Chính
            </h2>
          </div>

          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('ADVISOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'ADVISOR'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              Cố Vấn Sư Phạm
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('OCR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'OCR'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileScan className="w-4 h-4" />
              AI OCR Công Văn
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('SPEECH_MINUTES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'SPEECH_MINUTES'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-4 h-4" />
              Biên Bản Họp AI
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'ADVISOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Câu hỏi nghiệp vụ gợi ý
            </div>

            <div className="space-y-2">
              {[
                'Cách viết lời nhận xét Thông tư 27 khích lệ học sinh còn rụt rè, chưa tự tin phát biểu?',
                'Phương pháp giúp học sinh rèn luyện năng lực tự chủ và tự học ở cấp tiểu học?',
                'Cách phối hợp với phụ huynh khi học sinh cần hỗ trợ thêm môn Toán và Tiếng Việt?'
              ].map((scenario, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendAdvisor(scenario)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs text-slate-700 transition-all font-medium leading-relaxed cursor-pointer"
                >
                  {scenario}
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-950 flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-purple-700" />
                  Chế độ Suy nghĩ Chuyên sâu
                </span>
                <input
                  type="checkbox"
                  checked={useHighThinking}
                  onChange={(e) => setUseHighThinking(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-[520px] overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {advisorResponses.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white rounded-tr-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAdvisorLoading && (
                <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 p-3 rounded-xl max-w-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  <span>AI đang phân tích nghiệp vụ sư phạm...</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAdvisor();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Nhập câu hỏi nghiệp vụ sư phạm..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  disabled={isAdvisorLoading || !query.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Gửi
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'OCR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleRunOcr} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileScan className="w-5 h-5 text-indigo-600" />
              Số Hóa Văn Bản / Công Văn
            </h3>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số ký hiệu văn bản</label>
              <input
                type="text"
                value={ocrDocNumber}
                onChange={(e) => setOcrDocNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cơ quan ban hành</label>
              <input
                type="text"
                value={ocrAuthority}
                onChange={(e) => setOcrAuthority(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nội dung văn bản cần trích xuất</label>
              <textarea
                rows={4}
                value={ocrRawText}
                onChange={(e) => setOcrRawText(e.target.value)}
                placeholder="Dán nội dung công văn, kế hoạch chuyên môn..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={isOcrLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <FileScan className="w-4 h-4" />
              Trích Xuất & Số Hóa Văn Bản
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Kết Quả Số Hóa Hồ Sơ
            </h3>
            {ocrResult ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block">Số hiệu:</span>
                    <strong>{ocrResult.docNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Đơn vị:</span>
                    <strong>{ocrResult.issuingAuthority}</strong>
                  </div>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 font-semibold">
                  {ocrResult.title}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nhập nội dung văn bản bên trái và nhấn &quot;Trích Xuất & Số Hóa Văn Bản&quot;.
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'SPEECH_MINUTES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleGenerateMeetingMinutes} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mic className="w-5 h-5 text-rose-600" />
              Soạn Biên Bản Họp Từ Nội Dung Ghi Âm
            </h3>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tiêu đề cuộc họp</label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nội dung phát biểu trong cuộc họp</label>
              <textarea
                rows={5}
                value={rawSpeechText}
                onChange={(e) => setRawSpeechText(e.target.value)}
                placeholder="Nhập nội dung thảo luận tại cuộc họp..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <button
              type="submit"
              disabled={isProcessingSpeech}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Tạo Biên Bản Họp Tự Động
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
            {meetingMinutes ? (
              <div className="space-y-3">
                <div className="text-center pb-3 border-b border-slate-200">
                  <div className="font-extrabold text-slate-900">{meetingMinutes.school}</div>
                  <h4 className="text-base font-extrabold text-slate-900 pt-1">{meetingMinutes.title}</h4>
                  <div className="text-[11px] text-slate-500">Chủ trì: {meetingMinutes.chairPerson}</div>
                </div>
                <div className="space-y-2">
                  {meetingMinutes.discussions?.map((d: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-blue-800">{d.speaker}:</strong> {d.content}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                Nhập nội dung cuộc họp và nhấn &quot;Tạo Biên Bản Họp Tự Động&quot;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
