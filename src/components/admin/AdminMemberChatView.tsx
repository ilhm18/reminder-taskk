import React from 'react';
import { UnifiedChatView } from '../common/UnifiedChatView';
import { useApp } from '../../context/AppContext';

export const AdminMemberChatView: React.FC = () => {
  const { currentClass } = useApp();

  return (
    <UnifiedChatView
      title={`Chat Siswa & Komunikasi (${currentClass?.name || 'Ruang Kelas'})`}
      subtitle="Kelola kotak masuk percakapan siswa, mulai chat baru ke siswa atau owner platform"
    />
  );
};
