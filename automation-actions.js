import { executeScript, wait } from './automation-helpers.js';
import { clickCalendarCell, navigateToCalendarView } from './automation-navigation.js';
import { WAIT_TIMES } from './constants.js';

/**
 * Performs a single complete lottery application flow from the calendar view.
 * @param {object} tab - The tab object.
 * @param {object} applicationDetails - Details for the application.
 * @param {string} applicationDetails.date - The date to apply for (e.g., '0802').
 * @param {string} applicationDetails.timeSelector - The CSS selector for the time row.
 * @param {number} applicationDetails.applicationNumber - The application number (1, 2, etc.).
 * @param {string[]} log - The log array to push messages to.
 */
export async function performLotteryApplication(tab, applicationDetails, log) {
  const { date, timeSelector, applicationNumber } = applicationDetails;

  // 1. Click on the calendar cell
  await clickCalendarCell(tab.id, date, timeSelector, log);
  await wait(WAIT_TIMES.PAGE_LOAD);

  // 2. Click the first "申込み" button
  log.push(`${applicationNumber}件目の「申込み」ボタンをクリックします。`);
  const clickResult = await executeScript(tab.id, () => {
    let alertMessage = null;
    const originalAlert = window.alert;
    window.alert = (message) => {
      // Only treat alerts containing specific error text as blocking errors.
      if (message.includes('選択されていません')) {
        alertMessage = message;
      } else {
        console.log('An alert was shown but ignored:', message);
      }
    };

    try {
      if (typeof doApplay === 'function' && typeof gLotWInstTempLotApplyAction !== 'undefined') {
        doApplay(document.form1, gLotWInstTempLotApplyAction);
      } else {
        throw new Error('`doApplay` または `gLotWInstTempLotApplyAction` 関数が見つかりませんでした。');
      }

      if (alertMessage) {
        return { success: false, error: `「申込み」ボタンクリック時にエラーポップアップが表示されました: ${alertMessage}` };
      }
      return { success: true };
    } finally {
      window.alert = originalAlert;
    }
  });

  if (!clickResult.success) {
    throw new Error(clickResult.error);
  }
  await wait(WAIT_TIMES.PAGE_LOAD);

  // 3. Select the application number
  log.push(`申込み番号のドロップダウンリストから「申込み${applicationNumber}件目」を選択します。`);
  const applyValue = `${applicationNumber}-1`; // e.g., '1-1', '2-1'
  await executeScript(tab.id, (applyValue) => {
    const applyNoSelect = document.querySelector('#apply');
    if (applyNoSelect) {
      applyNoSelect.value = applyValue;
    } else {
      throw new Error('申込み番号のドロップダウンリスト(#apply)が見つかりませんでした。');
    }
  }, [applyValue]);
  await wait(500);

  // 4. Click the final "申込み" button and confirm
  log.push(`${applicationNumber}件目の最終確認の「申込み」ボタンをクリックし、ポップアップを承認します。`);
  await executeScript(tab.id, () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    try {
      if (typeof sendLotApply === 'function' && typeof gLotWInstLotApplyAction !== 'undefined') {
        sendLotApply(document.form1, gLotWInstLotApplyAction, new Event('click'));
      } else {
        throw new Error('`sendLotApply` または `gLotWInstLotApplyAction` 関数が見つかりませんでした。');
      }
    } finally {
      window.confirm = originalConfirm;
    }
  });
}