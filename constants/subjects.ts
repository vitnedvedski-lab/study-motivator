/**
 * Предустановленные предметы (25+)
 */
import { Subject } from '../types';

const SUBJECTS: Omit<Subject, 'id' | 'custom' | 'name'>[] = [
  { nameRu: 'Математика', nameEn: 'Mathematics', nameZh: '数学', category: 'A' },
  { nameRu: 'Русский язык', nameEn: 'Russian Language', nameZh: '俄语', category: 'A' },
  { nameRu: 'Литература', nameEn: 'Literature', nameZh: '文学', category: 'A' },
  { nameRu: 'История', nameEn: 'History', nameZh: '历史', category: 'A' },
  { nameRu: 'Английский язык', nameEn: 'English', nameZh: '英语', category: 'A' },
  { nameRu: 'Физика', nameEn: 'Physics', nameZh: '物理', category: 'A' },
  { nameRu: 'Химия', nameEn: 'Chemistry', nameZh: '化学', category: 'A' },
  { nameRu: 'Биология', nameEn: 'Biology', nameZh: '生物', category: 'A' },
  { nameRu: 'География', nameEn: 'Geography', nameZh: '地理', category: 'B' },
  { nameRu: 'Информатика', nameEn: 'Computer Science', nameZh: '计算机科学', category: 'B' },
  { nameRu: 'Обществознание', nameEn: 'Social Studies', nameZh: '社会学', category: 'B' },
  { nameRu: 'Естествознание', nameEn: 'Natural Science', nameZh: '自然科学', category: 'B' },
  { nameRu: 'Музыка', nameEn: 'Music', nameZh: '音乐', category: 'C' },
  { nameRu: 'Изобразительное искусство', nameEn: 'Art', nameZh: '美术', category: 'C' },
  { nameRu: 'Физкультура', nameEn: 'Physical Education', nameZh: '体育', category: 'C' },
  { nameRu: 'Технология', nameEn: 'Technology', nameZh: '技术', category: 'C' },
  { nameRu: 'Немецкий язык', nameEn: 'German', nameZh: '德语', category: 'B' },
  { nameRu: 'Французский язык', nameEn: 'French', nameZh: '法语', category: 'B' },
  { nameRu: 'Китайский язык', nameEn: 'Chinese', nameZh: '中文', category: 'B' },
  { nameRu: 'Алгебра', nameEn: 'Algebra', nameZh: '代数', category: 'A' },
  { nameRu: 'Геометрия', nameEn: 'Geometry', nameZh: '几何', category: 'A' },
  { nameRu: 'Естествознание', nameEn: 'Science', nameZh: '科学', category: 'B' },
  { nameRu: 'Окружающий мир', nameEn: 'Environmental Studies', nameZh: '环境研究', category: 'B' },
  { nameRu: 'Чтение', nameEn: 'Reading', nameZh: '阅读', category: 'A' },
  { nameRu: 'Письмо', nameEn: 'Writing', nameZh: '写作', category: 'A' },
  { nameRu: 'Астрономия', nameEn: 'Astronomy', nameZh: '天文学', category: 'C' },
  { nameRu: 'Экология', nameEn: 'Ecology', nameZh: '生态学', category: 'C' },
];

export const DEFAULT_SUBJECTS: Omit<Subject, 'id' | 'custom'>[] = SUBJECTS.map((subject) => ({
  ...subject,
  name: subject.nameRu,
}));
