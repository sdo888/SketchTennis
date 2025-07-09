import { ui, showView } from './ui.js';
import { VALUES } from './constants.js';
import { renderCalendar } from './calendar.js';
import { openTimeSlotModal, initializeModal } from './modal.js';
import { renderSelectionDetails } from './selection-display.js';
import { initializeCsvHandler, loadInitialCsv } from './csv-handler.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- State Management ---
  // Central state object for the application
  const state = {
    displayedDate: new Date(),
    selectedSlots: new Map(),
    currentEditingDate: null,
    accountCsvContent: null,
    currentParkId: VALUES.PARK_ID_KIBA, // Default park
    totalAccounts: 0 // Total number of accounts from CSV
  };

  // --- Core Functions ---
  // A wrapper function to pass to other modules that need to re-render the calendar
  const rerenderCalendar = () => renderCalendar(state, ui, handleDateClick);

  /**
   * Calculates the total number of used accounts and updates the summary display.
   */
  const updateAccountSummary = () => {
    let usedAccounts = 0;
    // Iterate through all selected dates and their time slots
    for (const dailySelection of state.selectedSlots.values()) {
      for (const accounts of dailySelection.timeSlots.values()) {
        usedAccounts += accounts;
      }
    }
    const remainingAccounts = state.totalAccounts - usedAccounts;

    ui.usedAccountsCount.textContent = usedAccounts;
    ui.remainingAccountsCount.textContent = remainingAccounts;

    // Also render the detailed list of selections
    renderSelectionDetails(state, ui);
  };

  // The handler for when a date cell is clicked
  const handleDateClick = (event) => {
    openTimeSlotModal(event, state, ui);
  };

  // --- Event Listener Setup ---
  function initializeEventListeners() {
    // Main View
    ui.applyBtn.addEventListener('click', () => {
      showView('calendarView');
      // Set calendar to the next month
      const today = new Date();
      state.displayedDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      rerenderCalendar();
    });

    // Calendar View
    ui.backToMainBtn.addEventListener('click', () => showView('mainView'));
    ui.prevMonthBtn.addEventListener('click', () => {
      state.displayedDate.setMonth(state.displayedDate.getMonth() - 1);
      rerenderCalendar();
    });
    ui.nextMonthBtn.addEventListener('click', () => {
      state.displayedDate.setMonth(state.displayedDate.getMonth() + 1);
      rerenderCalendar();
    });

    // Confirm Lottery Application Button
    ui.confirmLotteryApplicationBtn.addEventListener('click', handleConfirmLottery);

    // Test Mode
    ui.testModeCheckbox.addEventListener('change', handleTestModeChange);
    ui.testDayInput.addEventListener('input', handleTestDayInput);

    // Initialize module-specific event listeners
    initializeModal(state, ui, rerenderCalendar, updateAccountSummary);
    initializeCsvHandler(state, ui, updateAccountSummary);
  }

  // --- Logic for Specific Actions ---
  /**
   * A generic handler to send a message to the background script and update the UI.
   * @param {HTMLButtonElement} button - The button that was clicked.
   * @param {string} action - The action to send to the background script.
   * @param {string} initialMessage - The message to display while processing.
   * @param {object} [payload={}] - Additional data to send with the message.
   */
  function handleAutomationRequest(button, action, initialMessage, payload = {}) {
    button.disabled = true;
    ui.statusDisplayArea.classList.remove('hidden');
    ui.statusText.textContent = initialMessage;
    ui.statusText.style.color = '#333';
    ui.statusLogView.classList.add('hidden');

    chrome.runtime.sendMessage({ action, ...payload }, (response) => {
      button.disabled = false;
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        ui.statusText.textContent = `エラー: ${chrome.runtime.lastError.message}`;
        ui.statusText.style.color = 'red';
        return;
      }

      if (response) {
        ui.statusText.textContent = response.message;
        ui.statusText.style.color = response.success ? 'green' : 'red';

        if (response.log && response.log.length > 0) {
          ui.statusLogText.textContent = response.log.join('\n');
          ui.statusLogView.classList.remove('hidden');
        }
      } else {
        ui.statusText.textContent = 'バックグラウンドからの応答がありません。';
        ui.statusText.style.color = 'red';
      }
    });
  }

  function handleConfirmLottery() {
    // ボタンクリック時に再度アカウント数を計算して最終チェック
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

    // Convert the Map of selections into a serializable array of objects
    const selectionData = Array.from(state.selectedSlots.entries()).map(([date, details]) => {
      return {
        date,
        parkId: details.parkId,
        parkName: details.parkName, // Add parkName for logging
        timeSlots: Object.fromEntries(details.timeSlots) // Convert inner Map to a plain object
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
