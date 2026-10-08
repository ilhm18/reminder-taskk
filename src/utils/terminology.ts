import { EducatorType, User, ClassItem } from '../types';

export interface Terminology {
  educatorTitle: string;       // e.g. "Dosen", "Guru", "Pengurus Kelas"
  educatorTitleShort: string;  // e.g. "Dosen", "Guru", "Pengurus"
  memberTitle: string;         // e.g. "Mahasiswa", "Siswa"
  memberTitlePlural: string;   // e.g. "Mahasiswa", "Siswa"
  classTitle: string;          // e.g. "Perkuliahan", "Pelajaran", "Kelas Mahasiswa", "Kelas Sekolah"
  courseLabel: string;         // e.g. "Mata Kuliah", "Mata Pelajaran"
  adminRoleName: string;       // e.g. "Dosen Pengampu", "Guru Kelas", "Pengurus Kelas"
  isCollege: boolean;          // true if dosen or pengurus_mahasiswa
  isPengurus: boolean;         // true if pengurus_mahasiswa or pengurus_sekolah
}

export function getTerminology(educatorType?: EducatorType | string): Terminology {
  const type = (educatorType || 'guru') as EducatorType;

  switch (type) {
    case 'dosen':
      return {
        educatorTitle: 'Dosen',
        educatorTitleShort: 'Dosen',
        memberTitle: 'Mahasiswa',
        memberTitlePlural: 'Mahasiswa',
        classTitle: 'Perkuliahan',
        courseLabel: 'Mata Kuliah',
        adminRoleName: 'Dosen Pengampu',
        isCollege: true,
        isPengurus: false,
      };

    case 'pengurus_mahasiswa':
      return {
        educatorTitle: 'Pengurus Kelas',
        educatorTitleShort: 'Pengurus',
        memberTitle: 'Mahasiswa',
        memberTitlePlural: 'Mahasiswa',
        classTitle: 'Kelas Mahasiswa',
        courseLabel: 'Mata Kuliah',
        adminRoleName: 'Pengurus Kelas',
        isCollege: true,
        isPengurus: true,
      };

    case 'pengurus_sekolah':
      return {
        educatorTitle: 'Pengurus Kelas',
        educatorTitleShort: 'Pengurus',
        memberTitle: 'Siswa',
        memberTitlePlural: 'Siswa',
        classTitle: 'Kelas Sekolah',
        courseLabel: 'Mata Pelajaran',
        adminRoleName: 'Pengurus Kelas',
        isCollege: false,
        isPengurus: true,
      };

    case 'guru':
    default:
      return {
        educatorTitle: 'Guru',
        educatorTitleShort: 'Guru',
        memberTitle: 'Siswa',
        memberTitlePlural: 'Siswa',
        classTitle: 'Pelajaran / Kelas',
        courseLabel: 'Mata Pelajaran',
        adminRoleName: 'Guru Kelas',
        isCollege: false,
        isPengurus: false,
      };
  }
}

/**
 * Resolves educatorType from either a user object, class object, or fallback string.
 */
export function resolveEducatorType(user?: User | null, classItem?: ClassItem | null): EducatorType {
  if (user?.educatorType) return user.educatorType;
  if (classItem?.educatorType) return classItem.educatorType;
  return 'guru';
}
