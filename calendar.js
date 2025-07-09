import { getHolidayName } from './date-utils.js';

/**
 * Renders the calendar grid for the given month and year.
 * @param {object} state - The application state object.
 * @param {object} ui - The UI elements object.
 * @param {function} handleDateClick - The function to call when a date is clicked.
 */
export function renderCalendar(state, ui, handleDateClick) {
  const year = state.displayedDate.getFullYear();
  const month = state.displayedDate.getMonth(); // 0-11

  ui.calendarGrid.innerHTML = ''; // Clear previous calendar
  ui.calendarMonthYear.textContent = `${year}年 ${month + 1}月`;

  const dayIndex = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
  const firstDayOfMonth = (dayIndex === 0) ? 6 : dayIndex - 1; // Monday as 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Add day name headers
  const dayNames = ['月', '火', '水', '木', '金', '土', '日'];
  dayNames.forEach((name, index) => {
    const dayNameEl = document.createElement('div');
    dayNameEl.className = 'calendar-day day-name';
    dayNameEl.textContent = name;
    if (index === 5) { // Saturday
      dayNameEl.classList.add('saturday');
    } else if (index === 6) { // Sunday
      dayNameEl.classList.add('sunday');
    }
    ui.calendarGrid.appendChild(dayNameEl);
  });

  // Add blank cells for the beginning of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day';
    ui.calendarGrid.appendChild(emptyCell);
  }

  // Add date cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateCell = document.createElement('div');
    dateCell.className = 'calendar-day date-cell';
    dateCell.textContent = day;
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentDate = new Date(year, month, day);
    const holidayName = getHolidayName(currentDate);
    const dayOfWeek = currentDate.getDay();

    if (holidayName) {
      dateCell.classList.add('sunday'); // Style holidays like Sundays
      dateCell.title = holidayName;     // Show holiday name on hover
    } else if (dayOfWeek === 0) { // Sunday
      dateCell.classList.add('sunday');
    } else if (dayOfWeek === 6) { // Saturday
      dateCell.classList.add('saturday');
    }
    dateCell.dataset.date = dateString;

    if (state.selectedSlots.has(dateString) && state.selectedSlots.get(dateString).timeSlots.size > 0) {
      dateCell.classList.add('has-selection');
    }

    dateCell.addEventListener('click', handleDateClick);
    ui.calendarGrid.appendChild(dateCell);
  }
}