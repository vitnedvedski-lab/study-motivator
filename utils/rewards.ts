import { AppSettings, Reward } from '../types';

const LEGACY_REWARD_TRANSLATIONS: Record<string, { nameEn: string; nameZh: string; descriptionEn: string; descriptionZh: string }> = {
  'Поздний отбой': {
    nameEn: 'Late bedtime',
    nameZh: '晚睡一次',
    descriptionEn: 'One evening with a later bedtime',
    descriptionZh: '有一个晚上可以晚点睡',
  },
  'Выбор ужина': {
    nameEn: 'Dinner choice',
    nameZh: '选择晚餐',
    descriptionEn: 'The child chooses the family dinner',
    descriptionZh: '孩子选择家庭晚餐',
  },
  'Игровой вечер': {
    nameEn: 'Game night',
    nameZh: '游戏之夜',
    descriptionEn: 'Board games or video games together',
    descriptionZh: '一起玩桌游或电子游戏',
  },
  'Поход в кино': {
    nameEn: 'Movie night',
    nameZh: '电影之夜',
    descriptionEn: 'A family cinema trip or home movie night',
    descriptionZh: '家庭影院或去电影院',
  },
};

const translateLegacyScreenReward = (value: string, language: AppSettings['language']) => {
  const match = /^(\d+)\s+мин экрана$/i.exec(value.trim());
  if (!match) return value;
  if (language === 'en') return `${match[1]} min screen time`;
  if (language === 'zh') return `${match[1]}分钟屏幕时间`;
  return value;
};

export const getRewardDisplayName = (reward: Reward, language: AppSettings['language']) => {
  if (language === 'en') return reward.nameEn || LEGACY_REWARD_TRANSLATIONS[reward.name]?.nameEn || translateLegacyScreenReward(reward.name, language);
  if (language === 'zh') return reward.nameZh || LEGACY_REWARD_TRANSLATIONS[reward.name]?.nameZh || translateLegacyScreenReward(reward.name, language);
  return reward.name;
};

export const getRewardDisplayDescription = (reward: Reward, language: AppSettings['language']) => {
  if (language === 'en') return reward.descriptionEn || LEGACY_REWARD_TRANSLATIONS[reward.name]?.descriptionEn || reward.description;
  if (language === 'zh') return reward.descriptionZh || LEGACY_REWARD_TRANSLATIONS[reward.name]?.descriptionZh || reward.description;
  return reward.description;
};
