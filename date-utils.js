/**
 * 日本の祝日かどうかを判定し、祝日名を返す（振替休日も含む）
 * @param {Date} date 判定する日付
 * @returns {string|null} 祝日名、祝日でない場合はnull
 */
export function getHolidayName(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // 祝日基本データ（振替休日は別途判定）
  const getBaseHolidayName = (d) => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const date = d.getDate();

    // N番目の月曜日を計算するヘルパー
    const getNthMonday = (n, month, year) => {
      const firstDay = new Date(year, month - 1, 1);
      const firstDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon...
      const daysUntilFirstMonday = (firstDayOfWeek === 1) ? 0 : (8 - firstDayOfWeek) % 7;
      const firstMonday = 1 + daysUntilFirstMonday;
      return firstMonday + (n - 1) * 7;
    };

    // 固定祝日
    const fixedHolidays = {
      '1-1': '元日', '2-11': '建国記念の日', '2-23': '天皇誕生日', '4-29': '昭和の日',
      '5-3': '憲法記念日', '5-4': 'みどりの日', '5-5': 'こどもの日', '8-11': '山の日',
      '11-3': '文化の日', '11-23': '勤労感謝の日',
    };
    if (fixedHolidays[`${m}-${date}`]) return fixedHolidays[`${m}-${date}`];

    // 移動祝日 (ハッピーマンデー)
    if (m === 1 && date === getNthMonday(2, 1, y)) return '成人の日';
    if (m === 7 && date === getNthMonday(3, 7, y)) return '海の日';
    if (m === 9 && date === getNthMonday(3, 9, y)) return '敬老の日';
    if (m === 10 && date === getNthMonday(2, 10, y)) return 'スポーツの日';

    // 春分の日・秋分の日 (簡易計算式 1980-2099年まで有効)
    if (m === 3) {
      const vernalEquinoxDay = Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
      if (date === vernalEquinoxDay) return '春分の日';
    }
    if (m === 9) {
      const autumnalEquinoxDay = Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
      if (date === autumnalEquinoxDay) return '秋分の日';
    }
    return null;
  };

  const baseHoliday = getBaseHolidayName(date);
  if (baseHoliday) return baseHoliday;

  // 振替休日の判定 (祝日が日曜日の場合、次の平日が休み)
  if (date.getDay() === 1) { // 月曜日
    const yesterday = new Date(year, month - 1, day - 1);
    if (yesterday.getDay() === 0 && getBaseHolidayName(yesterday)) return '振替休日';
  }
  return null;
}