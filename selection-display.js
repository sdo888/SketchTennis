/**
 * Renders the details of the selected lottery applications into the list view.
 * @param {object} state - The application state object.
 * @param {object} ui - The UI elements object.
 */
export function renderSelectionDetails(state, ui) {
  const list = ui.selectionDetailsList;
  list.innerHTML = ''; // Clear previous content

  if (state.selectedSlots.size === 0) {
    list.innerHTML = '<p class="no-selection-message">選択された申込はありません。</p>';
    return;
  }

  const sortedDates = Array.from(state.selectedSlots.keys()).sort();
  const dayOfWeekNames = ['日', '月', '火', '水', '木', '金', '土'];

  sortedDates.forEach(date => {
    const dailySelection = state.selectedSlots.get(date);
    if (dailySelection && dailySelection.timeSlots.size > 0) {
      
      const dateObj = new Date(date.replace(/-/g, '/'));
      const dayOfWeek = dayOfWeekNames[dateObj.getDay()];

      const dateHeader = document.createElement('div');
      dateHeader.className = 'selection-date-header';
      dateHeader.textContent = `【${date} (${dayOfWeek}) - ${dailySelection.parkName}】`;
      list.appendChild(dateHeader);

      const sortedTimes = Array.from(dailySelection.timeSlots.keys()).sort();
      sortedTimes.forEach(time => {
        const accounts = dailySelection.timeSlots.get(time);
        const item = document.createElement('div');
        item.className = 'selection-item';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'selection-time';
        timeSpan.textContent = time;

        const accountsSpan = document.createElement('span');
        accountsSpan.className = 'selection-accounts';
        accountsSpan.textContent = `${accounts}アカウント`;

        item.appendChild(timeSpan);
        item.appendChild(accountsSpan);
        list.appendChild(item);
      });
    }
  });
}