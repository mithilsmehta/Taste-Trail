const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getMondayDateKey = (dateKey) => {
  const date = parseDateKey(dateKey);
  const dayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOffset);
  return toDateKey(date);
};

export const getTomorrowDateKey = () => {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateKey(tomorrow);
};

export const getUpcomingWeek = (startOffset = 0) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() + startOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      dayIndex: index,
      dateKey: toDateKey(date),
      dayName: dayNames[date.getDay()],
      shortDayName: shortDayNames[date.getDay()],
      dateLabel: `${date.getDate()} ${monthNames[date.getMonth()]}`,
      fullLabel: `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}`
    };
  });
};

export const getWeekFromDateKey = (startDateKey) => {
  const startDate = parseDateKey(startDateKey);
  startDate.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      dayIndex: index,
      dateKey: toDateKey(date),
      dayName: dayNames[date.getDay()],
      shortDayName: shortDayNames[date.getDay()],
      dateLabel: `${date.getDate()} ${monthNames[date.getMonth()]}`,
      fullLabel: `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}`
    };
  });
};
