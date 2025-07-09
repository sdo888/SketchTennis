// sdo888/sketchtennis/SketchTennis-b3708640fbba7f2b5de345be44e07fbe40c4abaf/background.js
import { executeConfirmLottery } from './automation.js';

// ポート参照を保持するための変数
let popupPort = null;

// ポップアップからの接続をリッスン
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "lotteryLog") {
    popupPort = port;
    console.log("Popup connected for logging.");

    // ポップアップからのメッセージ（初期リクエスト）をリッスン
    port.onMessage.addListener((request) => {
      if (request.action === 'executeConfirmLottery') {
        // リアルタイムログ出力用のラッパー関数
        const realTimeLogger = (message) => {
          if (popupPort) {
            try {
              popupPort.postMessage({ type: 'log', message: message });
            } catch (e) {
              console.error("Failed to send log message to popup:", e);
              // ポップアップが予期せず閉じられた場合などを考慮
              popupPort = null; // ポートを無効化
            }
          }
        };

        // メインの自動化関数をリアルタイムロガーとカスタムsendResponseで呼び出す
        executeConfirmLottery(request.selections, (finalResponse) => {
          if (popupPort) {
            try {
              popupPort.postMessage({ type: 'response', response: finalResponse });
            } catch (e) {
              console.error("Failed to send final response to popup:", e);
            }
            // 最終応答送信後にポートを切断
            popupPort.disconnect();
            popupPort = null;
          }
        }, realTimeLogger); // ロガー関数を渡す
      }
    });

    // ポート切断のハンドリング
    port.onDisconnect.addListener(() => {
      console.log("Popup disconnected from logging port.");
      popupPort = null; // ポート参照をクリア
    });
  }
});

// 拡張機能アイコンのクリックをリッスン
chrome.action.onClicked.addListener(async () => {
  const extensionPageUrl = chrome.runtime.getURL('popup.html');
  const tabs = await chrome.tabs.query({ url: extensionPageUrl });

  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: extensionPageUrl });
  }
});