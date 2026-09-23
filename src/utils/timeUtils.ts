export interface DailySchedule {
  type: 'DAILY';
  start_time: string;
  end_time: string;
}

export interface WeeklySchedule {
  type: 'WEEKLY';
  start_time: string;
  end_time: string;
  days: string[];
}

export interface OneTimeSchedule {
  type: 'ONE_TIME';
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
}

export type Schedule = DailySchedule | WeeklySchedule | OneTimeSchedule;

const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'p.m.' : 'a.m.';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const isAvailableToday = (schedule: Schedule): boolean => {
  const now = new Date();
  const currentDay = DAYS_OF_WEEK[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  if (schedule.type === 'DAILY') {
    return currentTime <= schedule.end_time;
  }

  if (schedule.type === 'WEEKLY') {
    return schedule.days.includes(currentDay) && currentTime <= schedule.end_time;
  }

  if (schedule.type === 'ONE_TIME') {
    const currentDate = now.toISOString().slice(0, 10);
    return (
      currentDate >= schedule.start_date &&
      currentDate <= schedule.end_date &&
      currentTime <= schedule.end_time
    );
  }

  return false;
};

export const getTimeInfo = (schedule: Schedule): string => {
  if (schedule.type === 'DAILY') {
    return `Daily ${formatTime12Hour(schedule.start_time)} - ${formatTime12Hour(schedule.end_time)}`;
  }

  if (schedule.type === 'WEEKLY') {
    const days = schedule.days.map(d => d.charAt(0) + d.slice(1).toLowerCase()).join(', ');
    return `${days} ${formatTime12Hour(schedule.start_time)} - ${formatTime12Hour(schedule.end_time)}`;
  }

  if (schedule.type === 'ONE_TIME') {
    return `${schedule.start_date} to ${schedule.end_date} ${formatTime12Hour(schedule.start_time)} - ${formatTime12Hour(schedule.end_time)}`;
  }

  return 'Schedule not available';
};
