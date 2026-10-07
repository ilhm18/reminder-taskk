import React from 'react';
import { UnifiedChatView } from '../common/UnifiedChatView';
import { useApp } from '../../context/AppContext';

export const MemberAdminChatView: React.FC = () => {
  const { currentClass } = useApp();

  return (
    <UnifiedChatView
      initialTargetUserId={currentClass?.adminId || 'admin'}
      title={`Chat Siswa & Pengelola (${currentClass?.name || 'Kelas'})`}
      subtitle="Kirim pesan langsung, konsultasi tugas, atau obrolan santai ke admin, teman kelas, dan owner platform"
    />
  );
};
