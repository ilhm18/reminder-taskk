import React from 'react';
import { UnifiedChatView } from './UnifiedChatView';
import { useApp } from '../../context/AppContext';

export const OwnerChatView: React.FC = () => {
  const { currentRole } = useApp();

  return (
    <UnifiedChatView
      initialTargetUserId={currentRole !== 'owner' ? 'owner' : undefined}
      title={currentRole === 'owner' ? 'Kotak Masuk Konsultasi & Chat Owner' : 'Chat Pribadi ke Owner Platform'}
      subtitle={
        currentRole === 'owner'
          ? 'Pantau riwayat percakapan dari seluruh Admin Kelas dan Siswa, serta mulai chat ke pengguna manapun'
          : 'Kirim pesan pribadi, konsultasi teknis, atau bantuan fitur langsung ke Owner Platform'
      }
    />
  );
};
