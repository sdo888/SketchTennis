import { URLS, SELECTORS, VALUES, WAIT_TIMES, TIME_SELECTOR_MAP } from './constants.js';
import { parseAccountCsv } from './utils.js';
import { executeScript, wait, pollPage } from './automation-helpers.js';

/**
 * Logs in and navigates to the main lottery application page.
 * This is a common flow for both getting status and applying for lottery.
 * @param {string[]} log - The log array to push messages to.
 * @param {object} account - The account object with id and password.
 * @returns {Promise<{tab: object}>} - The tab object.
 */
export async function loginAndNavigateToLotteryPage(log, account) {
  // 1. Get Account Info
  if (!account || !account.id || !account.password) {
    throw new Error('無効なアカウント情報が指定されました。');
  }
  log.push(`アカウント: ${account.id} を使用してログインします。`);

  // 2. Open Tab and Login
  const tab = await chrome.tabs.create({ url: URLS.TOP_PAGE, active: false });
  log.push(`タブ (ID: ${tab.id}) でトップページを開きました。`);

  await new Promise((resolve, reject) => {
    const listener = async (tabId, changeInfo, updatedTab) => {
      if (tabId !== tab.id || changeInfo.status !== 'complete') return;

      try {
        if (updatedTab.url === URLS.TOP_PAGE) {
          log.push('トップページ読込完了。ログインボタンをクリックします。');
          await executeScript(tab.id, (selector) => document.querySelector(selector).click(), [SELECTORS.TOP_PAGE_LOGIN_BUTTON]);
        } else if (updatedTab.url.includes(URLS.LOGIN_PAGE_PART)) {
          log.push('ログインページ読込完了。情報を入力してログインします。');
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

  // 3. Verify Login and Navigate to Lottery Page
  await wait(WAIT_TIMES.LOGIN_PAGE_TRANSITION);
  const isLoggedIn = await executeScript(tab.id, (selector) => !!document.querySelector(selector), [SELECTORS.LOGIN_SUCCESS_INDICATOR]);
  if (!isLoggedIn) throw new Error('ログインに失敗しました。');
  log.push('ログイン成功。抽選申込みページへ遷移します...');

  await executeScript(tab.id, (selector) => document.querySelector(selector).click(), [SELECTORS.LOTTERY_MENU_LINK]);
  await wait(WAIT_TIMES.MODAL_DISPLAY);
  await executeScript(tab.id, () => doAction(document.form1, gLotWOpeLotSearchAction));

  // 4. Verify navigation to Lottery Page
  await wait(WAIT_TIMES.PAGE_LOAD);
  const pageTitle = await executeScript(tab.id, (selector) => document.querySelector(selector)?.innerText, [SELECTORS.PAGE_TITLE_H2]);
  if (!pageTitle || !pageTitle.includes('抽選申込み')) throw new Error('抽選申込みページへの遷移に失敗しました。');
  log.push('抽選申込みページへ遷移成功。');

  return { tab };
}

/**
 * From the main lottery page, navigates to the calendar view for a specific facility.
 * @param {object} tab - The tab object.
 * @param {string} parkId - The ID of the park to select.
 * @param {string[]} log - The log array to push messages to.
 */
export async function navigateToCalendarView(tab, parkId, log) {
  // Navigate to Tennis Lottery Page
  await executeScript(tab.id, (selector) => {
    const button = document.querySelector(selector);
    const script = button.getAttribute('onclick').replace(/^javascript:/, '');
    new Function(script)();
  }, [SELECTORS.TENNIS_APPLY_BUTTON]);
  log.push('「テニス(人工芝)」の申込みボタンをクリックしました。');

  // Select Park and Facility
  await wait(WAIT_TIMES.PAGE_LOAD);
  log.push('公園と施設を選択します...');
  await executeScript(tab.id, (parkId, selectors) => {
    document.querySelector(selectors.PARK_SELECT).value = parkId;
    changeBname(document.form1);
  }, [parkId, SELECTORS]);
  await wait(WAIT_TIMES.AJAX_UPDATE);
  await executeScript(tab.id, (selectors, values) => {
    document.querySelector(selectors.FACILITY_SELECT).value = values.FACILITY_ID_TENNIS;
    changeIname(document.form1, gLotWTransLotInstSrchVacantAjaxAction);
  }, [SELECTORS, VALUES]);
  log.push('公園と施設の選択が完了しました。');

  // Verify that the calendar table is now visible (or at least the container)
  await wait(WAIT_TIMES.AJAX_UPDATE); // Wait for calendar to load
  const calendarVisible = await executeScript(tab.id, (selector) => !!document.querySelector(selector), [SELECTORS.LOTTERY_TABLE]);
  if (!calendarVisible) throw new Error('カレンダーテーブルの表示に失敗しました。');
  log.push('カレンダーが表示されました。');
}

/**
 * Clicks a specific cell in the lottery calendar.
 * @param {number} tabId - The ID of the tab.
 * @param {string} dateToFind - The date to find (e.g., '0802').
 * @param {string} timeRowSelector - The CSS selector for the time row (e.g., '#usedate-bheader-5').
 * @param {string[]} log - The log array to push messages to.
 */
export async function clickCalendarCell(tabId, dateToFind, timeRowSelector, log) {
  log.push(`日時（日付末尾: ${dateToFind}, 時間帯セレクタ: ${timeRowSelector}）をクリックします。`);
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
  log.push('日時のクリックに成功しました。');
}

/**
 * Finds the correct week on the calendar for a given date by clicking "Next Week" if necessary.
 * @param {number} tabId The ID of the tab.
 * @param {string} targetDate The target date in 'YYYY-MM-DD' format.
 * @param {string[]} log The log array.
 */
export async function findCorrectWeek(tabId, targetDate, log) {
  const targetDateYYYYMMDD = targetDate.replace(/-/g, ''); // YYYY-MM-DD -> YYYYMMDD

  let dateFoundOnCalendar = false;
  const MAX_WEEKS_TO_CHECK = 5; // Safety break

  for (let i = 0; i < MAX_WEEKS_TO_CHECK; i++) {
    log.push(`カレンダーで日付 ${targetDate} を検索中... (${i + 1}週目)`);
    dateFoundOnCalendar = await executeScript(tabId, (targetDate) => {
      const dateInputs = document.querySelectorAll('thead th input[name="selectUseYMD"]');
      const valuesOnPage = Array.from(dateInputs).map(input => input.value);
      return valuesOnPage.some(value => value.endsWith(targetDate));
    }, [targetDateYYYYMMDD]);

    if (dateFoundOnCalendar) {
      log.push(`日付 ${targetDate} を現在のビューで発見しました。`);
      return; // Exit the function successfully
    }

    log.push('現在の日付が見つからないため、「翌週」をクリックします。');
    await executeScript(tabId, (nextWeekButtonSelector) => {
      const nextWeekButton = document.querySelector(nextWeekButtonSelector);
      if (nextWeekButton) nextWeekButton.click();
      else throw new Error('「翌週」ボタンが見つかりませんでした。');
    }, [SELECTORS.NEXT_WEEK_BUTTON]);
    await wait(WAIT_TIMES.AJAX_UPDATE);
  }

  throw new Error(`日付 ${targetDate} がカレンダー内で見つかりませんでした。`);
}