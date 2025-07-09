// sdo888/sketchtennis/SketchTennis-b3708640fbba7f2b5de345be44e07fbe40c4abaf/automation.js
import { URLS, SELECTORS, VALUES, WAIT_TIMES, TIME_SELECTOR_MAP, DEBUG_MODE } from './constants.js';
import { parseAccountCsv } from './utils.js';
import { executeScript, wait, pollPage } from './automation-helpers.js';
import { loginAndNavigateToLotteryPage, navigateToCalendarView, findCorrectWeek } from './automation-navigation.js';
import { performLotteryApplication } from './automation-actions.js';

/**
 * 選択された抽選申込を確認し、実行する自動化フロー。
 * UIから渡された複数の申込情報を個別のタスクとして処理します。
 * @param {Array<object>} selections - UIから受け取った申込情報の配列。
 * @param {function} sendResponse - 最終的なレスポンスを返すためのコールバック関数。
 * @param {function} logger - リアルタイムログ出力用の関数。
 */
export async function executeConfirmLottery(selections, sendResponse, logger) {
  try {
    logger('抽選申込処理を開始します。');
    logger('UIから受け取った申込情報:');
    logger(JSON.stringify(selections, null, 2));

    const individualApplications = [];
    const REPEAT_COUNT_PER_SLOT = 2;

    let overallAccountCounter = 0;

    for (const dailySelection of selections) {
      for (const [timeSlot, count] of Object.entries(dailySelection.timeSlots)) {
        for (let uiSlotIdx = 0; uiSlotIdx < count; uiSlotIdx++) {
          const assignedAccountIndex = overallAccountCounter;

          for (let applicationNumber = 1; applicationNumber <= REPEAT_COUNT_PER_SLOT; applicationNumber++) {
            individualApplications.push({
              date: dailySelection.date,
              parkId: dailySelection.parkId,
              parkName: dailySelection.parkName,
              courtType: dailySelection.courtType,
              timeSlot: timeSlot,
              assignedAccountIndex: assignedAccountIndex,
              applicationNumberInSlot: applicationNumber,
            });
          }
          overallAccountCounter++;
        }
      }
    }

    if (individualApplications.length === 0) {
      throw new Error('申込可能な時間帯が選択されていません。');
    }
    logger(`合計 ${individualApplications.length} 件の申込を作成します。（各UI選択スロットにつき ${REPEAT_COUNT_PER_SLOT} 回申込み）`);

    const { accountCsvContent } = await chrome.storage.local.get('accountCsvContent');
    if (!accountCsvContent) throw new Error('アカウントCSVがアップロードされていません。');
    const allAccounts = parseAccountCsv(accountCsvContent);

    if (allAccounts.length < overallAccountCounter) {
      throw new Error(`アカウント数が不足しています。必要: ${overallAccountCounter}, 登録済: ${allAccounts.length}`);
    }

    let successfulApplications = 0;

    // 開いているタブを追跡するためのマップ (エラー発生時のクリーンアップ用)
    const openTabs = new Map();

    const applicationsByAccount = new Map();
    for (const app of individualApplications) {
      if (!applicationsByAccount.has(app.assignedAccountIndex)) {
        applicationsByAccount.set(app.assignedAccountIndex, []);
      }
      applicationsByAccount.get(app.assignedAccountIndex).push(app);
    }

    for (const [accountIndex, appsForThisAccount] of applicationsByAccount.entries()) {
      const account = allAccounts[accountIndex];
      let currentTab = null;

      try {
        logger(`--- アカウント: ${account.id} での申込み処理を開始 ---`);

        const { tab } = await loginAndNavigateToLotteryPage(logger, account);
        currentTab = tab;
        openTabs.set(accountIndex, currentTab);

        await navigateToCalendarView(currentTab, appsForThisAccount[0].parkId, appsForThisAccount[0].courtType, logger);

        for (let i = 0; i < appsForThisAccount.length; i++) {
          const application = appsForThisAccount[i];
          const isLastApplicationForThisAccount = (i === appsForThisAccount.length - 1);

          logger(`--- (${i + 1}/${appsForThisAccount.length}) ${account.id} での個別申込処理を開始 (内部申込番号: ${application.applicationNumberInSlot}) ---`);
          logger(`申込内容: ${application.date} ${application.parkName} ${application.timeSlot} (コート種類: ${application.courtType})`);

          await findCorrectWeek(currentTab.id, application.date, logger);
          const dateForCellClick = application.date.substring(5).replace('-', '');

          await performLotteryApplication(currentTab, {
            date: dateForCellClick,
            timeSelector: TIME_SELECTOR_MAP[application.timeSlot],
            applicationNumber: application.applicationNumberInSlot,
            shouldClickContinueButton: !isLastApplicationForThisAccount
          }, logger);

          logger(`--- (${i + 1}/${appsForThisAccount.length}) ${account.id} での個別申込処理が正常に完了しました ---`);
          successfulApplications++;
        }
      } catch (error) {
        logger(`--- アカウント: ${account.id} での処理中にエラーが発生しました: ${error.message} ---`);
      } finally {
        if (currentTab) {
          if (!DEBUG_MODE) {
            logger(`--- アカウント: ${account.id} のタブを閉じます。---`);
            await chrome.tabs.remove(currentTab.id);
          } else {
            logger(`--- デバッグモードのため、アカウント: ${account.id} のタブは閉じません。---`);
          }
          openTabs.delete(accountIndex);
        }
      }
    }

    logger(`全 ${individualApplications.length} 件中、${successfulApplications} 件の申込が完了しました。`);
    sendResponse({ success: true, message: `抽選申込処理が完了しました。 (${successfulApplications}/${individualApplications.length}件成功)` });
  } catch (error) {
    logger(`エラーが発生しました: ${error.message}`);
    if (!DEBUG_MODE) {
      logger('--- エラー発生時のタブクリーンアップを開始します。 ---');
      for (const [accountIndex, tabObject] of openTabs.entries()) {
        try {
          logger(`タブ ${tabObject.id} を閉じます (アカウント: ${allAccounts[accountIndex].id})。`);
          await chrome.tabs.remove(tabObject.id);
        } catch (closeError) {
          console.error(`タブ ${tabObject.id} のクローズに失敗しました:`, closeError);
          logger(`タブ ${tabObject.id} のクローズに失敗しました: ${closeError.message}`);
        }
      }
      logger('--- タブクリーンアップ完了。 ---');
    } else {
      logger('--- デバッグモードのため、エラー発生時も開いているタブは閉じません。 ---');
    }
    sendResponse({ success: false, message: error.message });
  }
}