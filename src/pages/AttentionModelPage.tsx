import React, { useState, useEffect } from 'react';
import type { AttentionModelRow, LayerDetail } from '@/types/attentionModel'; // Use import type

interface LayerCellProps {
  value: LayerDetail;
  onEdit: (field: 'theory' | 'implementation', newValue: string) => void;
}

const LayerCell: React.FC<LayerCellProps> = ({ value, onEdit }) => {
  const combinedContent = `${value.theory}<br>${value.implementation}`;

  const handleCombinedEdit = (e: React.FocusEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML || '';
    // Simple split by <br> to try and separate theory and implementation
    const parts = content.split('<br>');
    onEdit('theory', parts[0] || '');
    onEdit('implementation', parts[1] || '');
  };

  return (
    <div
      className="py-1 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
      contentEditable
      onBlur={handleCombinedEdit}
      suppressContentEditableWarning={true}
      dangerouslySetInnerHTML={{ __html: combinedContent }}
    >
    </div>
  );
};

const initialData: AttentionModelRow[] = [
  {
    id: 'youtube_id_1', // Example YouTube ID
    attention: {
      theory: '이론: Primacy Effect (초두 효과) 및 Cognitive Fluency (인지 유창성)',
      implementation: '예시: <br>• 리뷰엉이: "지식의 진실을 알려줄게"와 같은 도발적인 문장이나 "○○을 몰랐다고?"처럼 시청자의 기존 지식을 건드리는 질문으로 시작합니다. <br>• 미미미누: "수능 만점자도 틀린 문제"와 같이 궁금증을 유발하는 자극적 키워드나 숫자를 사용해 짧은 시간 안에 시청자의 주의를 끌어냅니다.'
    },
    engagement: {
      theory: '이론: Flow 이론 및 Cognitive Load Theory (인지 부하 관리)',
      implementation: '예시: <br>• 입시덕후: 어려운 입시 정보나 복잡한 개념을 빠르고 명료한 자막과 간결한 편집으로 전달해 인지 부하를 최소화합니다. <br>• 리뷰엉이: "오답 고르기" 퀴즈 형식이나 문제 제시 후 정답을 공개하는 방식으로 시청자가 능동적으로 참여하고 몰입하게 만듭니다.'
    },
    persuasion: {
      theory: '이론: Aristotle의 Ethos/Pathos/Logos',
      implementation: '예시: <br>• Ethos (신뢰): 채널 로고, 일관된 자막 디자인, 전문적인 톤을 유지하여 콘텐츠의 신뢰성을 높입니다. <br>• Pathos (감정): 유행하는 밈, 유머러스한 애니메이션, 몰입감을 높이는 효과음을 활용하여 재미와 감정적 연결을 유도합니다. <br>• Logos (논리): 복잡한 내용을 명확한 구조로 설명하며, 핵심 내용을 짧게 요약해 논리적 근거를 제공합니다.'
    },
    retention: {
      theory: '이론: 유의미 학습 이론 및 Recency Effect (최신 효과)',
      implementation: '예시: <br>• 리뷰엉이, 입시덕후: 영상 마지막 부분에 핵심 키워드나 결론을 자막이나 이미지로 강조하여 시청자가 내용을 오래 기억하도록 돕습니다. <br>• 모든 성공 채널: 영상 끝부분에 요약 슬라이드를 넣어 중요한 정보가 시청자의 머릿속에 각인되도록 합니다.'
    },
    action: {
      theory: '이론: Monroe’s Sequence (Action 단계) 및 네트워크 효과',
      implementation: '예시: <br>• 미미미누, 입시덕후: 쇼츠 하단 설명란에 "더 많은 내용은 풀영상에서"와 같이 롱폼 영상으로의 이동을 유도하는 명확한 CTA를 사용합니다. <br>• 모든 성공 채널: 영상의 마지막 1~2초에 다음 쇼츠 영상이나 채널 구독을 유도하는 버튼을 시각적으로 강조합니다.'
    },
  },
];

const AttentionModelPage: React.FC = () => {
  const [data, setData] = useState<AttentionModelRow[]>(initialData);

  

  const handleEdit = (id: string, field: keyof AttentionModelRow, value: string | LayerDetail) => {
    setData((prevData) =>
      prevData.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    const newId = `youtube_id_${data.length > 0 ? Math.max(...data.map(row => Number(row.id.replace('youtube_id_', '')))) + 1 : 1}`;
    setData((prevData) => [
      ...prevData,
      {
        id: newId,
        attention: { theory: '', implementation: '' },
        engagement: { theory: '', implementation: '' },
        persuasion: { theory: '', implementation: '' },
        retention: { theory: '', implementation: '' },
        action: { theory: '', implementation: '' },
      },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    setData((prevData) => prevData.filter((row) => row.id !== id));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Attention Model</h1>
      <button
        onClick={handleAddRow}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Add Row
      </button>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b text-left">YouTube ID</th>
              <th className="py-2 px-4 border-b text-left">주목 (Attention)</th>
              <th className="py-2 px-4 border-b text-left">몰입 (Engagement)</th>
              <th className="py-2 px-4 border-b text-left">설득 (Persuasion)</th>
              <th className="py-2 px-4 border-b text-left">기억 (Retention)</th>
              <th className="py-2 px-4 border-b text-left">행동 (Action)</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td className="py-2 px-4 border-b">
                  <div
                    className="py-1 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    contentEditable
                    onBlur={(e) => handleEdit(row.id, 'id', e.currentTarget.textContent || '')}
                    suppressContentEditableWarning={true}
                  >
                    {row.id}
                  </div>
                </td>
                <td className="py-2 px-4 border-b">
                  <LayerCell
                    value={row.attention}
                    onEdit={(field, newValue) => handleEdit(row.id, 'attention', { ...row.attention, [field]: newValue })}
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <LayerCell
                    value={row.engagement}
                    onEdit={(field, newValue) => handleEdit(row.id, 'engagement', { ...row.engagement, [field]: newValue })}
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <LayerCell
                    value={row.persuasion}
                    onEdit={(field, newValue) => handleEdit(row.id, 'persuasion', { ...row.persuasion, [field]: newValue })}
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <LayerCell
                    value={row.retention}
                    onEdit={(field, newValue) => handleEdit(row.id, 'retention', { ...row.retention, [field]: newValue })}
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <LayerCell
                    value={row.action}
                    onEdit={(field, newValue) => handleEdit(row.id, 'action', { ...row.action, [field]: newValue })}
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttentionModelPage;