// sdo888/sketchtennis/SketchTennis-f49469c17466247324ca2a270d69c6c405e56fb8/automation-navigation.js
import { URLS, SELECTORS, VALUES, WAIT_TIMES, TIME_SELECTOR_MAP } from './constants.js';
import { parseAccountCsv } from './utils.js'; // Note: parseAccountCsv is not used in this file
import { executeScript, wait, pollPage } from './automation-helpers.js';

/**
 * Logs in and navigates to the main lottery application page.
 * @param {function} logger - The logger function to push messages to.
 * @param {object} account - The account object with id and password.
 * @returns {Promise<{tab: object}>} - The tab object.
 */
export async function loginAndNavigateToLotteryPage(logger, account) {
  if (!account || !account.id || !account.password) {
    throw new Error('無効なアカウント情報が指定されました。');
  }
  logger(`アカウント: ${account.id} を使用してログインします。`);

  const tab = await chrome.tabs.create({ url: URLS.TOP_PAGE, active: false });
  logger(`タブ (ID: ${tab.id}) でトップページを開きました。`);

  await new Promise((resolve, reject) => {
    const listener = async (tabId, changeInfo, updatedTab) => {
      if (tabId !== tab.id || changeInfo.status !== 'complete') return;

      try {
        if (updatedTab.url === URLS.TOP_PAGE) {
          logger('トップページ読込完了。ログインボタンをクリックします。');
          await executeScript(tab.id, (selector) => document.querySelector(selector).click(), [SELECTORS.TOP_PAGE_LOGIN_BUTTON]);
        } else if (updatedTab.url.includes(URLS.LOGIN_PAGE_PART)) {
          logger('ログインページ読込完了。情報を入力してログインします。');
          await executeScript(tab.id, (id, pass, selectors) => {
            document.querySelector(selectors.LOGIN_PAGE_USER_ID_INPUT).value = id;
            document.querySelector(selectors.LOGIN_PAGE_PASSWORD_INPUT).value = pass;
            document.querySelector(selectors.LOGIN_PAGE_LOGIN_BUTTON).click();
          }, [account.id, account.password, SELECTORS]);

          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      } catch (error) {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(error);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });

  await wait(WAIT_TIMES.LOGIN_PAGE_TRANSITION);
  const isLoggedIn = await executeScript(tab.id, (selector) => !!document.querySelector(selector), [SELECTORS.LOGIN_SUCCESS_INDICATOR]);
  if (!isLoggedIn) throw new Error('ログインに失敗しました。');
  logger('ログイン成功。抽選申込みページへ遷移します...');

  await executeScript(tab.id, (selector) => document.querySelector(selector).click(), [SELECTORS.LOTTERY_MENU_LINK]);
  await wait(WAIT_TIMES.MODAL_DISPLAY);
  await executeScript(tab.id, () => doAction(document.form1, gLotWOpeLotSearchAction));

  await wait(WAIT_TIMES.PAGE_LOAD);
  const pageTitle = await executeScript(tab.id, (selector) => document.querySelector(selector)?.innerText, [SELECTORS.PAGE_TITLE_H2]);
  if (!pageTitle || !pageTitle.includes('抽選申込み')) throw new Error('抽選申込みページへの遷移に失敗しました。');
  logger('抽選申込みページへ遷移成功。');

  return { tab };
}

/**
 * From the main lottery page, navigates to the calendar view for a specific facility.
 * @param {object} tab - The tab object.
 * @param {string} parkId - The ID of the park to select.
 * @param {string} courtType - The type of court ('artificial' or 'hard'). // ★変更: courtType引数を追加
 * @param {function} logger - The logger function to push messages to.
 */
export async function navigateToCalendarView(tab, parkId, courtType, logger) { // ★変更: courtType引数を追加
  let applyButtonSelector;
  let logMessage;

  if (courtType === 'hard') {
    applyButtonSelector = SELECTORS.TENNIS_HARD_APPLY_BUTTON;
    logMessage = '「テニス(ハード)」の申込みボタンをクリックしました。';
  } else {
    // デフォルトは人工芝、または 'artificial' の場合
    applyButtonSelector = SELECTORS.TENNIS_ARTIFICIAL_APPLY_BUTTON; // ★変更: セレクター名を修正
    logMessage = '「テニス(人工芝)」の申込みボタンをクリックしました。';
  }

  await executeScript(tab.id, (selector) => {
    const button = document.querySelector(selector);
    const script = button.getAttribute('onclick').replace(/^javascript:/, '');
    new Function(script)();
  }, [applyButtonSelector]); // ★変更: 動的に選択されたセレクターを使用
  logger(logMessage); // ★変更: 動的に選択されたログメッセージを使用

  await wait(WAIT_TIMES.PAGE_LOAD);
  logger('公園と施設を選択します...');
  await executeScript(tab.id, (parkId, selectors) => {
    document.querySelector(selectors.PARK_SELECT).value = parkId;
    changeBname(document.form1);
  }, [parkId, SELECTORS]);
  await wait(WAIT_TIMES.AJAX_UPDATE);

  await executeScript(tab.id, (selectors) => {
    const facilitySelect = document.querySelector(selectors.FACILITY_SELECT);
    if (!facilitySelect) {
      throw new Error('施設選択ドロップダウンが見つかりませんでした。');
    }

    let tennisFacilityValue = null;
    for (const option of facilitySelect.options) {
      if (option.textContent.includes('テニス')) {
        tennisFacilityValue = option.value;
        break;
      }
    }

    if (tennisFacilityValue) {
      facilitySelect.value = tennisFacilityValue;
      changeIname(document.form1, gLotWTransLotInstSrchVacantAjaxAction);
    } else {
      throw new Error('「テニス」施設オプションが見つかりませんでした。');
    }
  }, [SELECTORS]);
  logger('公園と施設の選択が完了しました。');

  // 公園と施設の選択が完了した後、カレンダーテーブルの表示を確認する前に1秒待つ
  await wait(1000); // 1秒待機

  await wait(WAIT_TIMES.AJAX_UPDATE); // 既存の待機処理
  const calendarVisible = await executeScript(tab.id, (selector) => !!document.querySelector(selector), [SELECTORS.LOTTERY_TABLE]); // 既存のカレンダーテーブル表示確認
  if (!calendarVisible) throw new Error('カレンダーテーブルの表示に失敗しました。'); // 既存のエラーハンドリング
  logger('カレンダーが表示されました。'); // 既存のログ出力
}

/**
 * Clicks a specific cell in the lottery calendar.
 * @param {number} tabId - The ID of the tab.
 * @param {string} dateToFind - The date to find (e.g., '0802').
 * @param {string} timeRowSelector - The CSS selector for the time row (e.g., '#usedate-bheader-5').
 * @param {function} logger - The logger function to push messages to.
 */
export async function clickCalendarCell(tabId, dateToFind, timeRowSelector, logger) {
  logger(`日時（日付末尾: ${dateToFind}, 時間帯セレクタ: ${timeRowSelector}）をクリックします。`);
  await executeScript(tabId, (dateToFind, timeRowSelector) => {
    const dateHeaders = Array.from(document.querySelectorAll('thead th input[name="selectUseYMD"]'));
    const dateIndex = dateHeaders.findIndex(input => input.value.endsWith(dateToFind));

    if (dateIndex === -1) {
      throw new Error(`日付 ${dateToFind} が見つかりませんでした。`);
    }

    const timeRow = document.querySelector(timeRowSelector);
    if (!timeRow) {
      throw new Error(`時間帯の行 (${timeRowSelector}) が見つかりませんでした。`);
    }

    const cells = timeRow.querySelectorAll('td');
    const targetCell = cells[dateIndex];

    if (!targetCell) {
      throw new Error('指定された日時のセルが見つかりませんでした。');
    }
    targetCell.click();
  }, [dateToFind, timeRowSelector]);
  logger('日時のクリックに成功しました。');
}

/**
 * Finds the correct week on the calendar for a given date by clicking "Next Week" if necessary.
 * @param {number} tabId The ID of the tab.
 * @param {string} targetDate The target date in 'YYYY-MM-DD' format.
 * @param {function} logger The logger function.
 */
export async function findCorrectWeek(tabId, targetDate, logger) {
  const targetDateYYYYMMDD = targetDate.replace(/-/g, '');

  let dateFoundOnCalendar = false;
  const MAX_WEEKS_TO_CHECK = 5;

  for (let i = 0; i < MAX_WEEKS_TO_CHECK; i++) {
    logger(`カレンダーで日付 ${targetDate} を検索中... (${i + 1}週目)`);
    dateFoundOnCalendar = await executeScript(tabId, (targetDate) => {
      const dateInputs = document.querySelectorAll('thead th input[name="selectUseYMD"]');
      const valuesOnPage = Array.from(dateInputs).map(input => input.value);
      return valuesOnPage.some(value => value.endsWith(targetDate));
    }, [targetDateYYYYMMDD]);

    if (dateFoundOnCalendar) {
      logger(`日付 ${targetDate} を現在のビューで発見しました。`);
      return;
    }

    logger('現在の日付が見つからないため、「翌週」をクリックします。');
    await executeScript(tabId, (nextWeekButtonSelector) => {
      const nextWeekButton = document.querySelector(nextWeekButtonSelector);
      if (nextWeekButton) nextWeekButton.click();
      else throw new Error('「翌週」ボタンが見つかりませんでした。');
    }, [SELECTORS.NEXT_WEEK_BUTTON]);
    await wait(WAIT_TIMES.AJAX_UPDATE);
  }

  throw new Error(`日付 ${targetDate} がカレンダー内で見つかりませんでした。`);
}