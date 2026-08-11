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
  const date = dateKey ? parseDateKey(dateKey) : new Date();
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + diffToMonday);
  return toDateKey(date);
};

export const getTodayDateKey = () => toDateKey(new Date());

export const getWeekFromMonday = (mondayKey) => {
  const startDate = parseDateKey(mondayKey);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + idx);
    const key = toDateKey(d);
    return {
      dateKey: key,
      dayName: dayNames[idx],
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString("en-US", { month: "short" })
    };
  });
};
