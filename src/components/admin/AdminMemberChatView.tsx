import React from 'react';
import { UnifiedChatView } from '../common/UnifiedChatView';
import { useApp } from '../../context/AppContext';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';

export const AdminMemberChatView: React.FC = () => {
  const { currentClass, currentUser } = useApp();
  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  return (
    <UnifiedChatView
      title={`Chat & Pesan (${currentClass?.name || 'Ruang Kelas'})`}
      subtitle={`Kelola kotak masuk percakapan ${terms.memberTitlePlural.toLowerCase()}, mulai chat baru ke ${terms.memberTitle.toLowerCase()} atau owner platform`}
    />
  );
};
