import { AppSettings, Subject } from '../types';
import { DEFAULT_SUBJECTS } from '../constants/subjects';

type SubjectNameFields = Pick<Subject, 'name' | 'nameRu' | 'nameEn' | 'nameZh'>;

export const getSubjectDisplayName = (subject: SubjectNameFields | null | undefined, language: AppSettings['language']) => {
  if (!subject) return '';
  if (language === 'en') return subject.nameEn || subject.name || subject.nameRu;
  if (language === 'zh') return subject.nameZh || subject.name || subject.nameRu;
  return subject.nameRu || subject.name;
};

export const getLocalizedSubjectName = (name: string | null | undefined, language: AppSettings['language']) => {
  if (!name) return '';
  const normalized = name.trim().toLowerCase();
  const subject = DEFAULT_SUBJECTS.find((item) =>
    [item.name, item.nameRu, item.nameEn, item.nameZh]
      .filter(Boolean)
      .some((candidate) => candidate.trim().toLowerCase() === normalized)
  );
  return subject ? getSubjectDisplayName(subject, language) : name;
};
