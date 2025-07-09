// sdo888/sketchtennis/SketchTennis-b3708640fbba7f2b5de345be44e07fbe40c4abaf/popup.js
import { ui, showView } from './ui.js';
import { VALUES } from './constants.js';
import { renderCalendar } from './calendar.js';
import { openTimeSlotModal, initializeModal } from './modal.js';
import { renderSelectionDetails } from './selection-display.js';
import { initializeCsvHandler, loadInitialCsv } from './csv-handler.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- State Management ---
  const state = {
    displayedDate: new Date(),
    selectedSlots: new Map(),
    currentEditingDate: null,
    accountCsvContent: null,
    currentParkId: VALUES.PARK_ID_KIBA,
    totalAccounts: 0
  };

  const rerenderCalendar = () => renderCalendar(state, ui, handleDateClick);

  const updateAccountSummary = () => {
    let usedAccounts = 0;
    for (const dailySelection of state.selectedSlots.values()) {
      for (const accounts of dailySelection.timeSlots.values()) {
        usedAccounts += accounts;
      }
    }
    const remainingAccounts = state.totalAccounts - usedAccounts;

    ui.usedAccountsCount.textContent = usedAccounts;
    ui.remainingAccountsCount.textContent = remainingAccounts;

    renderSelectionDetails(state, ui);
  };

  const handleDateClick = (event) => {
    openTimeSlotModal(event, state, ui);
  };

  function initializeEventListeners() {
    ui.applyBtn.addEventListener('click', () => {
      showView('calendarView');
      const today = new Date();
      state.displayedDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      rerenderCalendar();
    });

    ui.backToMainBtn.addEventListener('click', () => showView('mainView'));
    ui.prevMonthBtn.addEventListener('click', () => {
      state.displayedDate.setMonth(state.displayedDate.getMonth() - 1);
      rerenderCalendar();
    });
    ui.nextMonthBtn.addEventListener('click', () => {
      state.displayedDate.setMonth(state.displayedDate.getMonth() + 1);
      rerenderCalendar();
    });

    ui.confirmLotteryApplicationBtn.addEventListener('click', handleConfirmLottery);

    ui.testModeCheckbox.addEventListener('change', handleTestModeChange);
    ui.testDayInput.addEventListener('input', handleTestDayInput);

    initializeModal(state, ui, rerenderCalendar, updateAccountSummary);
    initializeCsvHandler(state, ui, updateAccountSummary);
  }

  // --- Logic for Specific Actions ---
  let logPort = null; // ポート参照を保持するための変数

  function handleAutomationRequest(button, action, initialMessage, payload = {}) {
    button.disabled = true;
    ui.statusDisplayArea.classList.remove('hidden');
    ui.statusText.textContent = initialMessage;
    ui.statusText.style.color = '#333';
    ui.statusLogView.classList.remove('hidden'); // ログ表示エリアを最初から表示
    ui.statusLogText.textContent = ''; // ログをクリア

    // バックグラウンドスクリプトへの接続を確立
    logPort = chrome.runtime.connect({ name: "lotteryLog" });

    // バックグラウンドスクリプトからのメッセージ（ログ更新）をリッスン
    logPort.onMessage.addListener((msg) => {
      if (msg.type === 'log') {
        ui.statusLogText.textContent += msg.message + '\n';
        ui.statusLogText.scrollTop = ui.statusLogText.scrollHeight; // スクロールを最下部に移動
      } else if (msg.type === 'response') {
        // 最終応答を受信
        button.disabled = false;
        ui.statusText.textContent = msg.response.message;
        ui.statusText.style.color = msg.response.success ? 'green' : 'red';
        // ログは既にインクリメンタルに表示されているため、ここではセットしない
        // ポートを切断
        if (logPort) {
          logPort.disconnect();
          logPort = null;
        }
      }
    });

    // ポート切断のハンドリング（例: バックグラウンドスクリプトがクラッシュした場合など）
    logPort.onDisconnect.addListener(() => {
      if (logPort) {
        console.warn("Log port disconnected unexpectedly.");
        button.disabled = false;
        ui.statusText.textContent = 'エラー: ログ接続が切断されました。';
        ui.statusText.style.color = 'red';
        logPort = null;
      }
    });

    // ポート経由でバックグラウンドスクリプトに初期リクエストを送信
    logPort.postMessage({ action, ...payload });
  }

  function handleConfirmLottery() {
    let usedAccounts = 0;
    for (const dailySelection of state.selectedSlots.values()) {
      for (const accounts of dailySelection.timeSlots.values()) {
        usedAccounts += accounts;
      }
    }

    if (usedAccounts === 0) {
      alert('申し込みたい日付と時間帯を選択してください。');
      return;
    }

    if (usedAccounts > state.totalAccounts) {
      alert(`申込アカウント数が登録アカウント数を超えています。(申込: ${usedAccounts} / 登録: ${state.totalAccounts})\n処理を中断します。`);
      return;
    }

    const selectionData = Array.from(state.selectedSlots.entries()).map(([date, details]) => {
      return {
        date,
        parkId: details.parkId,
        parkName: details.parkName,
        courtType: details.courtType, // ★この行を追加しました
        timeSlots: Object.fromEntries(details.timeSlots)
      };
    });

    handleAutomationRequest(
      ui.confirmLotteryApplicationBtn,
      'executeConfirmLottery',
      '抽選申込を実行中...',
      { selections: selectionData }
    );
  }

  function updateButtonStates(day) {
    ui.applyBtn.disabled = true;

    if (!day || day < 1 || day > 31) {
      ui.statusMsg.textContent = '有効な日付を入力してください。';
      return;
    }

    if (day >= 1 && day <= 10) {
      ui.applyBtn.disabled = false;
      ui.statusMsg.textContent = `【${day}日】抽選申し込み期間です。`;
    } else {
      ui.statusMsg.textContent = `【${day}日】受付期間外です。`;
    }
  }

  function handleTestModeChange() {
    const isTestMode = ui.testModeCheckbox.checked;
    ui.testDateControls.classList.toggle('hidden', !isTestMode);
    const day = isTestMode ? parseInt(ui.testDayInput.value, 10) : new Date().getDate();
    updateButtonStates(day);
  }

  function handleTestDayInput() {
    if (ui.testModeCheckbox.checked) {
      const testDay = parseInt(ui.testDayInput.value, 10);
      updateButtonStates(testDay);
    }
  }

  // --- Initialization ---
  function initialize() {
    initializeEventListeners();
    const initialDay = new Date().getDate();
    ui.testDayInput.value = initialDay;
    updateButtonStates(initialDay);
    if (chrome && chrome.storage && chrome.storage.local) {
      loadInitialCsv(state, ui, updateAccountSummary);
    } else {
      console.error('chrome.storage.local APIが利用できません。');
      ui.statusMsg.textContent = 'エラー: ストレージにアクセスできません。';
      ui.statusMsg.style.color = 'red';
      ui.csvUploadView.classList.remove('hidden');
      ui.csvManageView.classList.add('hidden');
    }
  }

  initialize();
});