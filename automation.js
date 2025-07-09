import { URLS, SELECTORS, VALUES, WAIT_TIMES, TIME_SELECTOR_MAP } from './constants.js';
import { parseAccountCsv } from './utils.js';
import { executeScript, wait, pollPage } from './automation-helpers.js';
import { loginAndNavigateToLotteryPage, navigateToCalendarView, findCorrectWeek } from './automation-navigation.js';
import { performLotteryApplication } from './automation-actions.js';

/**
 * 選択された抽選申込を確認し、実行する自動化フロー。
 * UIから渡された複数の申込情報を個別のタスクとして処理します。
 * @param {Array<object>} selections - UIから受け取った申込情報の配列。
 * @param {function} sendResponse - 最終的なレスポンスを返すためのコールバック関数。
 */
export async function executeConfirmLottery(selections, sendResponse) {
  const log = [];

  try {
    log.push('抽選申込処理を開始します。');
    log.push('UIから受け取った申込情報:');
    log.push(JSON.stringify(selections, null, 2));

    // 1. UIからの選択情報を、個別の申込リストに変換する
    const individualApplications = [];
    for (const dailySelection of selections) {
      for (const [timeSlot, count] of Object.entries(dailySelection.timeSlots)) {
        for (let i = 0; i < count; i++) {
          individualApplications.push({
            date: dailySelection.date,
            parkId: dailySelection.parkId,
            parkName: dailySelection.parkName,
            timeSlot: timeSlot,
          });
        }
      }
    }

    if (individualApplications.length === 0) {
      throw new Error('申込可能な時間帯が選択されていません。');
    }
    log.push(`合計 ${individualApplications.length} 件の申込を作成します。`);

    // 2. 全てのアカウント情報を取得する
    const { accountCsvContent } = await chrome.storage.local.get('accountCsvContent');
    if (!accountCsvContent) throw new Error('アカウントCSVがアップロードされていません。');
    const allAccounts = parseAccountCsv(accountCsvContent);
    if (allAccounts.length < individualApplications.length) {
      throw new Error(`アカウント数が不足しています。必要: ${individualApplications.length}, 登録済: ${allAccounts.length}`);
    }

    // 3. 各申込を、それぞれ別のアカウントで実行する
    let successfulApplications = 0;
    for (let i = 0; i < individualApplications.length; i++) {
      const application = individualApplications[i];
      const account = allAccounts[i];
      let tab; // このループ専用のタブ

      try {
        log.push(`--- ${i + 1}/${individualApplications.length}件目の申込処理を開始 (アカウント: ${account.id}) ---`);
        log.push(`申込内容: ${application.date} ${application.parkName} ${application.timeSlot}`);

        ({ tab } = await loginAndNavigateToLotteryPage(log, account));

        await navigateToCalendarView(tab, application.parkId, log);
        await findCorrectWeek(tab.id, application.date, log);
        const dateForCellClick = application.date.substring(5).replace('-', '');
        await performLotteryApplication(tab, { date: dateForCellClick, timeSelector: TIME_SELECTOR_MAP[application.timeSlot], applicationNumber: 1 }, log);

        log.push(`--- ${i + 1}件目の申込処理が正常に完了しました ---`);
        successfulApplications++;
      } catch (error) {
        log.push(`--- ${i + 1}件目の申込処理中にエラーが発生しました: ${error.message} ---`);
      } finally {
        if (tab) await chrome.tabs.remove(tab.id); // 次の処理のためにタブを閉じる
      }
    }

    log.push(`全 ${individualApplications.length} 件中、${successfulApplications} 件の申込が完了しました。`);
    sendResponse({ success: true, message: `抽選申込処理が完了しました。 (${successfulApplications}/${individualApplications.length}件成功)`, log });
  } catch (error) {
    log.push(`エラーが発生しました: ${error.message}`);
    sendResponse({ success: false, message: error.message, log });
  }
}