// sdo888/sketchtennis/SketchTennis-b3708640fbba7f2b5de345be44e07fbe40c4abaf/automation-actions.js
import { executeScript, wait } from './automation-helpers.js';
import { clickCalendarCell, navigateToCalendarView } from './automation-navigation.js'; // Note: navigateToCalendarView is not used in this file
import { WAIT_TIMES } from './constants.js';

/**
 * Performs a single complete lottery application flow from the calendar view.
 * @param {object} tab - The tab object.
 * @param {object} applicationDetails - Details for the application.
 * @param {string} applicationDetails.date - The date to apply for (e.g., '0802').
 * @param {string} applicationDetails.timeSelector - The CSS selector for the time row.
 * @param {number} applicationDetails.applicationNumber - The application number (1, 2, etc.).
 * @param {boolean} applicationDetails.shouldClickContinueButton - Whether to click "続けて申込み" button after application.
 * @param {function} logger - The logger function to push messages to.
 */
export async function performLotteryApplication(tab, applicationDetails, logger) {
  const { date, timeSelector, applicationNumber, shouldClickContinueButton } = applicationDetails;

  // 1. カレンダーセルをクリック
  await clickCalendarCell(tab.id, date, timeSelector, logger);
  await wait(WAIT_TIMES.PAGE_LOAD);

  // 2. 最初の「申込み」ボタンをクリック
  logger(`${applicationNumber}件目の「申込み」ボタンをクリックします。`);
  const clickResult = await executeScript(tab.id, () => {
    let alertMessage = null;
    const originalAlert = window.alert;
    window.alert = (message) => {
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

  // 3. 申込み番号を選択
  logger(`申込み番号のドロップダウンリストから「申込み${applicationNumber}件目」を選択します。`);
  const applyValue = `${applicationNumber}-1`;
  await executeScript(tab.id, (applyValue) => {
    const applyNoSelect = document.querySelector('#apply');
    if (applyNoSelect) {
      applyNoSelect.value = applyValue;
    } else {
      throw new Error('申込み番号のドロップダウンリスト(#apply)が見つかりませんでした。');
    }
  }, [applyValue]);
  await wait(500);

  // 4. 最終確認の「申込み」ボタンをクリックし、確認
  logger(`${applicationNumber}件目の最終確認の「申込み」ボタンをクリックし、ポップアップを承認します。`);
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

  // 5. 完了ページへの遷移を待ち、必要に応じて「続けて申込み」ボタンをクリック
  logger('「抽選申込完了」ページへの遷移を待ちます。');
  await wait(WAIT_TIMES.PAGE_LOAD);

  if (shouldClickContinueButton) {
    logger('「続けて申込み」ボタンをクリックします。');
    const continueApplyButtonSelector = '#btn-light[onclick*="gWOpeTransLotInstSrchVacantAction"]';

    await executeScript(tab.id, (selector) => {
      const continueButton = document.querySelector(selector);
      if (continueButton) {
        const onclickAttr = continueButton.getAttribute('onclick');
        if (onclickAttr) {
          const scriptCode = onclickAttr.replace(/^javascript:/, '');
          new Function(scriptCode)();
        } else {
          throw new Error('「続けて申込み」ボタンのonclick属性が見つかりませんでした。');
        }
      } else {
        throw new Error('「続けて申込み」ボタンが見つかりませんでした。');
      }
    }, [continueApplyButtonSelector]);
    logger('「続けて申込み」ボタンをクリックしました。');
    await wait(WAIT_TIMES.PAGE_LOAD);
  } else {
    logger('「続けて申込み」ボタンはクリックしません。（このアカウントでの最後の申込みのため）');
  }
}