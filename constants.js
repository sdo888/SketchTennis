export const URLS = {
  TOP_PAGE: 'https://kouen.sports.metro.tokyo.lg.jp/web/index.jsp',
  LOGIN_PAGE_PART: '/web/rsvWTransUserLoginAction.do',
};

export const SELECTORS = {
  // Login Flow
  TOP_PAGE_LOGIN_BUTTON: '#btn-login',
  LOGIN_PAGE_USER_ID_INPUT: 'input[name="userId"]',
  LOGIN_PAGE_PASSWORD_INPUT: 'input[name="password"]',
  LOGIN_PAGE_LOGIN_BUTTON: '#btn-go',
  LOGIN_SUCCESS_INDICATOR: '#btn-barcode',
  LOGIN_ERROR_MESSAGE: '.err',

  // Navigation to Lottery Page
  LOTTERY_MENU_LINK: 'a[data-target="#modal-menus"]',
  LOTTERY_APPLY_LINK_IN_MODAL: '#modal-menus > div > div > div > table > tbody > tr:nth-child(1) > td > a',
  PAGE_TITLE_H2: 'h2.session-title',

  // Lottery Application Page
  TENNIS_APPLY_BUTTON: '#lottery-info-list-area > table > tbody > tr:nth-child(4) > td.request > button',
  PARK_SELECT: '#bname',
  FACILITY_SELECT: '#iname',
  NEXT_WEEK_BUTTON: '#next-week',
  LOTTERY_TABLE: '#usedate-table',
};

export const VALUES = {
  PARK_ID_KIBA: '1301060',
  FACILITY_ID_TENNIS: '10600010',
};

export const WAIT_TIMES = {
  LOGIN_PAGE_TRANSITION: 5000,
  MODAL_DISPLAY: 4000,
  PAGE_LOAD: 3000,
  AJAX_UPDATE: 3000,
};

export const LOG_MESSAGES = {
  // Add common log messages here if needed
};

export const TIME_SELECTOR_MAP = {
  '09:00-11:00': '#usedate-bheader-1',
  '11:00-13:00': '#usedate-bheader-2',
  '13:00-15:00': '#usedate-bheader-3',
  '15:00-17:00': '#usedate-bheader-4',
  '17:00-19:00': '#usedate-bheader-5',
  '19:00-21:00': '#usedate-bheader-6',
};

export const PARK_LIST = [
  { value: "0", name: "選択してください。" }, // 追加
  { value: "1301000", name: "日比谷公園" },
  { value: "1301010", name: "芝公園" },
  { value: "1301040", name: "猿江恩賜公園" },
  { value: "1301050", name: "亀戸中央公園" },
  { value: "1301060", name: "木場公園" },
  { value: "1301070", name: "祖師谷公園" },
  { value: "1301090", name: "東白鬚公園" },
  { value: "1301100", name: "浮間公園" },
  { value: "1301110", name: "城北中央公園" },
  { value: "1301120", name: "赤塚公園" },
  { value: "1301130", name: "東綾瀬公園" },
  { value: "1301140", name: "舎人公園" },
  { value: "1301150", name: "篠崎公園Ａ" },
  { value: "1301160", name: "大島小松川公園" },
  { value: "1301170", name: "汐入公園" },
  { value: "1301175", name: "高井戸公園" },
  { value: "1301180", name: "善福寺川緑地" },
  { value: "1301190", name: "光が丘公園" },
  { value: "1301205", name: "石神井公園Ｂ" },
  { value: "1301220", name: "井の頭恩賜公園" },
  { value: "1301230", name: "武蔵野中央公園" },
  { value: "1301240", name: "小金井公園" },
  { value: "1301260", name: "野川公園" },
  { value: "1301270", name: "府中の森公園" },
  { value: "1301280", name: "東大和南公園" },
  { value: "1301315", name: "大井ふ頭中央海浜公園Ｂ" },
  { value: "1301360", name: "有明テニスＣ人工芝コート" },
];

export const PARK_LIST_HARD_COURT = [
  { value: "0", name: "選択してください。" },
  { value: "1310", name: "大井ふ頭海浜公園Ａ" },
  { value: "1315", name: "大井ふ頭海浜公園Ｂ" },
  { value: "1350", name: "有明テニスＡ屋外ハードコート" },
  { value: "1370", name: "有明テニスＢインドアコート" },
];

export const DEBUG_MODE = true; // 開発時にタブを閉じないようにする (リリース時は false に設定)