export const ui = {
  // Main View
  mainView: document.getElementById('main-view'),
  applyBtn: document.getElementById('apply-lottery-btn'),
  statusMsg: document.getElementById('status'),
  testModeCheckbox: document.getElementById('test-mode-checkbox'),
  testDateControls: document.getElementById('test-date-controls'),
  testDayInput: document.getElementById('test-day-input'),
  
  // CSV Elements
  accountCsvUpload: document.getElementById('account-csv-upload'),
  csvPreview: document.getElementById('csv-preview'),
  csvUploadView: document.getElementById('csv-upload-view'),
  csvManageView: document.getElementById('csv-manage-view'),
  checkCsvBtn: document.getElementById('check-csv-btn'),
  updateCsvBtn: document.getElementById('update-csv-btn'),
  cancelCsvUpdateBtn: document.getElementById('cancel-csv-update-btn'),
  csvUploadLabel: document.getElementById('csv-upload-label'),
  
  // Calendar View
  calendarView: document.getElementById('calendar-view'),
  calendarMonthYear: document.getElementById('calendar-month-year'),
  calendarGrid: document.getElementById('calendar-grid'),
  selectionSummary: document.getElementById('selection-summary'),
  usedAccountsCount: document.getElementById('used-accounts-count'),
  remainingAccountsCount: document.getElementById('remaining-accounts-count'),
  selectionDetailsView: document.getElementById('selection-details-view'),
  selectionDetailsList: document.getElementById('selection-details-list'),
  prevMonthBtn: document.getElementById('prev-month-btn'),
  nextMonthBtn: document.getElementById('next-month-btn'),
  confirmLotteryApplicationBtn: document.getElementById('confirm-lottery-application-btn'),
  backToMainBtn: document.getElementById('back-to-main-btn'),

  // Lottery Status Elements
  statusDisplayArea: document.getElementById('status-display-area'),
  statusText: document.getElementById('status-text'),
  statusLogView: document.getElementById('status-log-view'),
  statusLogText: document.getElementById('status-log-text'),

  // Time Slot Modal
  timeSlotModal: document.getElementById('time-slot-modal'),
  modalDateHeader: document.getElementById('modal-date-header'),
  modalParkSelectorContainer: document.getElementById('modal-park-selector-container'),
  timeSlotList: document.getElementById('time-slot-list'),
  confirmTimeBtn: document.getElementById('confirm-time-btn'),
  cancelTimeBtn: document.getElementById('cancel-time-btn'),
};

export function showView(viewName) {
  ui.mainView.classList.add('hidden');
  ui.calendarView.classList.add('hidden');

  if (ui[viewName]) {
    ui[viewName].classList.remove('hidden');
  }
}