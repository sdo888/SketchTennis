import { PARK_LIST, PARK_LIST_HARD_COURT } from './constants.js';
import { ui } from './ui.js';

const FORBIDDEN_PARK_ID = "1301110"; // 城北中央公園

/**
 * Creates and appends the park selector dropdown to the modal.
 * @param {object} state - The application state object.
 * @param {object} ui - The UI elements object.
 * @param {string} selectedCourtType - The currently selected court type ('artificial' or 'hard').
 */
function createParkSelector(state, ui, selectedCourtType) {
  ui.modalParkSelectorContainer.innerHTML = ''; // Clear previous

  const label = document.createElement('label');
  label.htmlFor = 'modal-park-select';
  label.textContent = '公園:';

  const select = document.createElement('select');
  select.id = 'modal-park-select';
  select.className = 'custom-select'; // For styling

  let parksToDisplay = [];
  if (selectedCourtType === 'artificial') {
    parksToDisplay = PARK_LIST; // 人工芝の場合、既存のPARK_LISTをそのまま使用
  } else if (selectedCourtType === 'hard') {
    parksToDisplay = PARK_LIST_HARD_COURT; // ハードコートの場合、新しいPARK_LIST_HARD_COURTを使用
  } else {
    // デフォルトまたはフォールバック (例えば、人工芝のリスト)
    parksToDisplay = PARK_LIST;
  }

  // 現在編集中の日付に公園が既に選択されているかを確認し、なければ「選択してください」を初期値とする
  const previouslySelectedParkId = state.selectedSlots.get(state.currentEditingDate)?.parkId;
  const initialSelectedParkValue = previouslySelectedParkId || "0";

  parksToDisplay.forEach(park => {
    const option = new Option(park.name, park.value);
    // 初期選択の公園値と一致する場合にselectedを設定
    if (park.value === initialSelectedParkValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  ui.modalParkSelectorContainer.appendChild(label);
  ui.modalParkSelectorContainer.appendChild(select);

  // --- Add event listener to prevent selection of a specific park ---
  let previousValidParkId = select.value;

  select.addEventListener('focus', () => {
    // Store the current valid selection before the user might change it
    previousValidParkId = select.value;
  });

  select.addEventListener('change', () => {
    if (select.value === FORBIDDEN_PARK_ID) {
      alert('すいません、城北中央公園は今は選べません');
      select.value = previousValidParkId; // Revert to the last valid selection
    }
  });
}

/**
 * Populates and opens the time slot selection modal.
 * @param {Event} event - The click event from the date cell.
 * @param {object} state - The application state object.
 * @param {object} ui - The UI elements object.
 */
export function openTimeSlotModal(event, state, ui) {
  state.currentEditingDate = event.currentTarget.dataset.date;
  if (!state.currentEditingDate) return;

  const [year, month, day] = state.currentEditingDate.split('-');
  ui.modalDateHeader.textContent = `${year}年${month}月${day}日`;

  // コート種類の初期値を取得し、それに基づいて公園セレクターを作成
  const initialCourtType = ui.courtTypeSelect.value;
  createParkSelector(state, ui, initialCourtType);

  // Generate time slot list
  ui.timeSlotList.innerHTML = '';
  const timeRanges = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'];
  const previouslySelected = state.selectedSlots.get(state.currentEditingDate)?.timeSlots || new Map();

  // Add a header for the list columns
  const header = document.createElement('div');
  header.className = 'time-slot-item time-slot-header'; // Align with items
  header.innerHTML = `
    <div></div> <div class="time-slot-right-container">
      <span class="header-label">申込口数</span>
    </div>
  `;
  ui.timeSlotList.appendChild(header);

  timeRanges.forEach(time => {
    const item = document.createElement('div');
    item.className = 'time-slot-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `time-${time}`;
    checkbox.value = time;
    checkbox.checked = previouslySelected.has(time);

    const label = document.createElement('label');
    label.htmlFor = `time-${time}`;
    label.textContent = time;

    item.appendChild(checkbox);
    item.appendChild(label);

    // Create a container for the right-aligned items
    const rightContainer = document.createElement('div');
    rightContainer.className = 'time-slot-right-container';

    // Add account number selector
    const accountSelect = document.createElement('select');
    accountSelect.className = 'account-select';
    for (let i = 1; i <= 10; i++) { // Max 10 accounts
      accountSelect.add(new Option(String(i), String(i)));
    }
    const previouslySelectedAccounts = previouslySelected.get(time) || 1;
    accountSelect.value = previouslySelectedAccounts;
    accountSelect.disabled = !checkbox.checked;

    checkbox.addEventListener('change', () => {
      accountSelect.disabled = !checkbox.checked;
    });

    rightContainer.appendChild(accountSelect);
    item.appendChild(rightContainer);
    ui.timeSlotList.appendChild(item);
  });

  ui.timeSlotModal.classList.remove('hidden');
}

/**
 * Closes the time slot selection modal.
 * @param {object} state - The application state object.
 * @param {object} ui - The UI elements object.
 */
function closeTimeSlotModal(state, ui) {
  ui.timeSlotModal.classList.add('hidden');
  state.currentEditingDate = null;
}

/**
 * Confirms the time selection and updates the state.
 * @param {object} state - The application state object.
 * @param {object} ui - The UI elements object.
 * @param {function} renderCalendar - The function to re-render the calendar.
 */
function confirmTimeSelection(state, ui, renderCalendar, updateAccountSummary) {
  const selectedTimesAndAccounts = new Map();
  ui.timeSlotList.querySelectorAll('.time-slot-item').forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
      const time = checkbox.value;
      const select = item.querySelector('.account-select');
      const accounts = parseInt(select.value, 10);
      selectedTimesAndAccounts.set(time, accounts);
    }
  });

  // Get selected park info
  const parkSelect = document.getElementById('modal-park-select');
  const parkId = parkSelect.value;
  const parkName = parkSelect.options[parkSelect.selectedIndex].text;

  // Get the selected court type
  const courtTypeSelect = document.getElementById('court-type-select'); // 追加
  const selectedCourtType = courtTypeSelect ? courtTypeSelect.value : ''; // 追加

  if (selectedTimesAndAccounts.size > 0) {
    state.selectedSlots.set(state.currentEditingDate, {
      parkId: parkId,
      parkName: parkName,
      courtType: selectedCourtType, // 追加
      timeSlots: selectedTimesAndAccounts,
    });
  } else {
    state.selectedSlots.delete(state.currentEditingDate); // Remove date if no selections
  }
  closeTimeSlotModal(state, ui);
  renderCalendar(); // Re-render calendar to reflect selection
  updateAccountSummary(); // Update the summary display
}

/**
 * Initializes the event listeners for the modal buttons.
 * @param {object} state - The application state object.
  * @param {object} ui - The UI elements object.
 * @param {function} renderCalendar - The function to re-render the calendar.
 */
export function initializeModal(state, ui, renderCalendar, updateAccountSummary) {
  ui.confirmTimeBtn.addEventListener('click', () => confirmTimeSelection(state, ui, renderCalendar, updateAccountSummary));
  ui.cancelTimeBtn.addEventListener('click', () => closeTimeSlotModal(state, ui));

  // コート種類ドロップダウンの変更イベントをリッスン
  ui.courtTypeSelect.addEventListener('change', () => {
    const selectedCourtType = ui.courtTypeSelect.value;
    createParkSelector(state, ui, selectedCourtType); // 選択された種類に基づいて公園リストを更新
  });
}