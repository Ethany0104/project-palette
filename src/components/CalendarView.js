import React, { useCallback } from 'react';
import { formatDate, getTextColorForBackground } from '../utils/helpers';

export function CalendarView({ date, events, legends, onDateClick, onEventClick, selectionRange, isEditingEvent }) {
    const renderCalendar = useCallback(() => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const calendarDays = [];

        for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push({ day: new Date(year, month, i - firstDayOfMonth + 1), isCurrentMonth: false });
        for (let day = 1; day <= daysInMonth; day++) calendarDays.push({ day: new Date(year, month, day), isCurrentMonth: true });
        
        const totalCells = calendarDays.length > 35 ? 42 : 35;
        let nextMonthDay = 1;
        while (calendarDays.length < totalCells) calendarDays.push({ day: new Date(year, month + 1, nextMonthDay++), isCurrentMonth: false });

        return calendarDays.map((dayInfo, index) => {
            const fullDateStr = formatDate(dayInfo.day);
            const dayDate = dayInfo.day;
            dayDate.setHours(0, 0, 0, 0);

            const dayEvents = events.filter(e => {
                if (!e.startDate || !e.endDate) return false;
                const startDate = new Date(e.startDate); startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(e.endDate); endDate.setHours(0, 0, 0, 0);
                return dayDate >= startDate && dayDate <= endDate;
            }).map(e => ({ ...e, legend: legends.find(l => l.id === e.legendId) || { name: '?', color: '#ccc' } }));

            let selectionClass = '';
            if (selectionRange && selectionRange.start) {
                const startDate = new Date(selectionRange.start); startDate.setHours(0, 0, 0, 0);
                if (selectionRange.end) {
                    const endDate = new Date(selectionRange.end); endDate.setHours(0, 0, 0, 0);
                    if (dayDate >= startDate && dayDate <= endDate) selectionClass = ' bg-blue-100';
                } else if (dayDate.getTime() === startDate.getTime()) {
                    selectionClass = ' bg-blue-200';
                }
            }
            
            const cursorClass = isEditingEvent ? 'cursor-crosshair' : 'cursor-pointer';

            return (
                <div key={index} className={`p-1 flex flex-col min-h-[80px] print:min-h-[72px] ${dayInfo.isCurrentMonth ? `bg-white ${cursorClass} hover:bg-blue-50` : 'bg-gray-50'}${selectionClass}`} onClick={() => onDateClick(fullDateStr)}>
                    <span className={`text-sm font-semibold ${dayInfo.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>{dayInfo.day.getDate()}</span>
                    <div className="flex-grow mt-1 space-y-1 overflow-y-auto">
                        {dayEvents.map(event => (
                            <div key={event.id} className="p-1 rounded text-xs font-semibold shadow-sm truncate" style={{ backgroundColor: event.legend.color, color: getTextColorForBackground(event.legend.color) }} onClick={(e) => { e.stopPropagation(); onEventClick(event); }}>
                                {event.legend.name}
                            </div>
                        ))}
                    </div>
                </div>
            );
        });
    }, [date, events, legends, onDateClick, onEventClick, selectionRange, isEditingEvent]);

    return (
        <div className="break-inside-avoid">
            <h3 className="text-xl font-bold text-center my-3 print:my-1 print:text-lg">{`${date.getFullYear()}년 ${date.getMonth() + 1}월`}</h3>
            <div className="grid grid-cols-7 gap-px bg-black border border-black">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day} className="text-center font-bold py-2 bg-gray-100 text-gray-600 text-sm">{day}</div>)}
                {renderCalendar()}
            </div>
        </div>
    );
}
