import { parseAccountCsv } from './utils.js';

/**
 * Handles the change event of the file input.
 * @param {Event} event - The change event.
 * @param {object} state - The application state object.
 * @param {object} ui - The UI elements object.
 * @param {function} updateAccountSummary - Function to update the summary display.
 */
function handleFileSelect(event, state, ui, updateAccountSummary) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.accountCsvContent = e.target.result;

      // Count accounts from the new CSV content
      const accounts = parseAccountCsv(state.accountCsvContent);
      state.totalAccounts = accounts.length;
      console.log(`取得したアカウント数: ${state.totalAccounts}`);

      // Update the summary display with the new total
      updateAccountSummary();

      if (chrome && chrome.storage && chrome.storage.local) {
        // Save both content and the count
        chrome.storage.local.set({ accountCsvContent: state.accountCsvContent, totalAccounts: state.totalAccounts }, () => {
          console.log('アカウントCSVが保存されました。');
          ui.csvUploadView.classList.add('hidden');
          ui.csvManageView.classList.remove('hidden');
          ui.cancelCsvUpdateBtn.classList.add('hidden');
          ui.csvPreview.classList.add('hidden');
        });
      } else {
        console.error('chrome.storage.local APIが利用できません。');
        ui.statusMsg.textContent = 'エラー: ストレージに保存できません。';
        ui.statusMsg.style.color = 'red';
      }
    };
    reader.readAsText(file, 'UTF-8');
  }
}

/**
 * Initializes the event listeners for the CSV upload and management UI.
 * @param {object} state - The application state object.
 * @param {object} ui - The UI elements object.
 * @param {function} updateAccountSummary - Function to update the summary display.
 */
export function initializeCsvHandler(state, ui, updateAccountSummary) {
  ui.accountCsvUpload.addEventListener('change', (event) => handleFileSelect(event, state, ui, updateAccountSummary));

  ui.checkCsvBtn.addEventListener('click', () => {
    if (state.accountCsvContent) {
      ui.csvPreview.textContent = state.accountCsvContent;
      ui.csvPreview.classList.toggle('hidden');
    }
  });

  ui.updateCsvBtn.addEventListener('click', () => {
    ui.csvManageView.classList.add('hidden');
    ui.csvUploadView.classList.remove('hidden');
    ui.csvUploadLabel.textContent = '新しいアカウントCSVを選択:';
    ui.cancelCsvUpdateBtn.classList.remove('hidden');
    ui.csvPreview.classList.add('hidden');
    ui.accountCsvUpload.value = '';
  });

  ui.cancelCsvUpdateBtn.addEventListener('click', () => {
    ui.csvUploadView.classList.add('hidden');
    ui.csvManageView.classList.remove('hidden');
    ui.cancelCsvUpdateBtn.classList.add('hidden');
  });
}

export function loadInitialCsv(state, ui, updateAccountSummary) {
  // Load both content and the count on startup
  chrome.storage.local.get(['accountCsvContent', 'totalAccounts'], (result) => {
    if (result.accountCsvContent) {
      console.log('ストレージからアカウントCSVを読み込みました。');
      state.accountCsvContent = result.accountCsvContent;
      state.totalAccounts = result.totalAccounts || 0;

      // Update the summary display on initial load
      updateAccountSummary();

      ui.csvUploadView.classList.add('hidden');
      ui.csvManageView.classList.remove('hidden');
    } else {
      ui.csvUploadView.classList.remove('hidden');
      ui.csvManageView.classList.add('hidden');
    }
  });
}