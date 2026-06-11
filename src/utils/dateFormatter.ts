/**
 * Helper to format date with Arabic voice and standard boundaries
 */
export function formatArabicDistanceToNow(dateInput: any): string {
  if (!dateInput) return 'الآن';
  
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (dateInput?.toDate) {
    date = dateInput.toDate();
  } else if (dateInput?.toMillis) {
    date = new Date(dateInput.toMillis());
  } else if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    try {
      date = new Date(dateInput);
    } catch {
      return 'الآن';
    }
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // If dynamic/future/just now offset is very small or negative
  if (diffInSeconds < 15) {
    return 'الآن';
  }
  if (diffInSeconds < 60) {
    return 'منذ ثوانٍ';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (diffInMinutes === 1) return 'منذ دقيقة';
    if (diffInMinutes === 2) return 'منذ دقيقتين';
    if (diffInMinutes >= 3 && diffInMinutes <= 10) return `منذ ${diffInMinutes} دقائق`;
    return `منذ ${diffInMinutes} دقيقة`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (diffInHours === 1) return 'منذ ساعة';
    if (diffInHours === 2) return 'منذ ساعتين';
    if (diffInHours >= 3 && diffInHours <= 10) return `منذ ${diffInHours} ساعات`;
    return `منذ ${diffInHours} ساعة`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    if (diffInDays === 1) return 'منذ يوم';
    if (diffInDays === 2) return 'منذ يومين';
    if (diffInDays >= 3 && diffInDays <= 10) return `منذ ${diffInDays} أيام`;
    return `منذ ${diffInDays} يوماً`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    if (diffInMonths === 1) return 'منذ شهر';
    if (diffInMonths === 2) return 'منذ شهرين';
    if (diffInMonths >= 3 && diffInMonths <= 10) return `منذ ${diffInMonths} أشهر`;
    return `منذ ${diffInMonths} شهراً`;
  }

  // Fallback to formatted string
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}
