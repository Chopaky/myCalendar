import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Snackbar, Alert, Switch, FormControlLabel } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayjs from 'dayjs';
import './App.css';

function App() {
  // 기본 일정 상태
  const [schedule, setSchedule] = useState(() => {
    const savedSchedule = localStorage.getItem('schedule');
    return savedSchedule ? JSON.parse(savedSchedule) : {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
  });

  // localStorage 저장 useEffect
  useEffect(() => {
    try {
      localStorage.setItem('schedule', JSON.stringify(schedule));
      console.log('Schedule saved:', schedule); // 저장 확인용 
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  }, [schedule]);

  // 현재 요일을 얻는 함수
  const getCurrentDayName = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  };

  // 새로운 일정 입력을 위한 상태 수정
  const [newEvent, setNewEvent] = useState({
    day: getCurrentDayName(), // 현재 요일로 초기화
    title: '',
    startTime: dayjs().set('hour', 0).set('minute', 0),
    endTime: dayjs().set('hour', 0).set('minute', 30),
    color: '#4a4a8f'  // 기본 색상
  });

  // 삭제 다이얼로그 상태
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    day: null,
    index: null
  });

  // 알림 상태
  const [alert, setAlert] = useState({
    open: false,
    message: ''
  });

  // 현재 시간 상태 추가
  const [currentTime, setCurrentTime] = useState(new Date());

  // 알림 상태
  const [scheduleAlert, setScheduleAlert] = useState({
    open: false,
    message: '',
    events: []
  });

  // 알림음 상태와 ref 추가
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundIntervalRef = useRef(null);
  const notificationSound = useMemo(() => new Audio('/notification.mp3'), []);

  // 알림음 재생 함수
  const playNotificationSound = () => {
    if (soundEnabled) {
      notificationSound.play()
        .catch(err => console.log('알림음 재생 실패:', err));
    }
  };

  // 알림음 반복 재생 시작
  const startRepeatingSound = useCallback(() => {
    if (soundEnabled) {
      playNotificationSound(); // 즉시 한 번 재생
      soundIntervalRef.current = setInterval(playNotificationSound, 1000); // 3초마다 반복
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled]);

  // 알림음 중지
  const stopRepeatingSound = useCallback(() => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    if (notificationSound) {
      notificationSound.pause();
      notificationSound.currentTime = 0;
    }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상태 추가 (컴포넌트 최상단)
  const [earlyNotification, setEarlyNotification] = useState(true);

  // checkUpcomingSchedules 함수 수정
  const checkUpcomingSchedules = useCallback((currentTime) => {
    // 현재 초가 0일 때만 체크
    if (currentTime.getSeconds() !== 0) return;

    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentTime.getDay()];
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    // 현재 시간 5분 후 계산
    const fiveMinutesLater = new Date(currentTime);
    fiveMinutesLater.setMinutes(currentTime.getMinutes() + 5);
    const fiveMinutesLaterString = `${fiveMinutesLater.getHours().toString().padStart(2, '0')}:${fiveMinutesLater.getMinutes().toString().padStart(2, '0')}`;

    const todayEvents = schedule[currentDay] || [];
    
    // 현재 시작하는 일정 확인
    const currentEvents = todayEvents.filter(event => event.start === currentTimeString);
    
    // 5분 후 시작하는 일정 확인
    const upcomingEvents = earlyNotification ? 
      todayEvents.filter(event => event.start === fiveMinutesLaterString) : 
      [];

    if (currentEvents.length > 0) {
      setScheduleAlert({
        open: true,
        message: '새로운 일정이 시작됩니다!',
        events: currentEvents
      });
      startRepeatingSound();
    } else if (upcomingEvents.length > 0) {
      setScheduleAlert({
        open: true,
        message: '5분 후 시작하는 일정이 있습니다!',
        events: upcomingEvents
      });
      startRepeatingSound();
    }
  }, [schedule, startRepeatingSound, earlyNotification]);

  // 시간 업데이트와 스케줄 체크를 위한 단일 useEffect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      checkUpcomingSchedules(now);
    }, 1000);

    return () => clearInterval(interval);
  }, [checkUpcomingSchedules]);

  // 알림 닫기 핸들러
  const handleCloseAlert = useCallback(() => {
    setScheduleAlert(prev => ({ ...prev, open: false }));
    stopRepeatingSound();
  }, [stopRepeatingSound]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRepeatingSound();
    };
  }, [stopRepeatingSound]);

  // 요일 변환 함수
  const getDayName = (day) => {
    const days = {
      monday: '월요일',
      tuesday: '화요일',
      wednesday: '수요일',
      thursday: '목요일',
      friday: '금요일',
      saturday: '토요일',
      sunday: '일요일'
    };
    return days[day];
  };

  // 요일 날짜로 변환하는 함수

  // 요일을 숫자로 변환하는 함수 추가
  const getDayNumber = (day) => {
    const days = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    return days[day];
  };

  // colorOptions 배열 추가 (컴포넌트 최상단에 추가)
  const colorOptions = [
    { value: '#4a4a8f', label: '기본' },
    { value: '#e74c3c', label: '빨강' },
    { value: '#2ecc71', label: '초록' },
    { value: '#3498db', label: '파랑' },
    { value: '#f1c40f', label: '노랑' },
    { value: '#9b59b6', label: '보라' },
    { value: '#e67e22', label: '주황' },
    { value: '#1abc9c', label: '청록' }
  ];

  // getDayNameKorean 함수 추가
  const getDayNameKorean = (date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  // formatTimeNumber 함수 추가
  const formatTimeNumber = (number) => {
    return number.toString().padStart(2, '0');
  };

  // getCurrentEvent 함수 추가
  const getCurrentEvent = (currentTime) => {
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentTime.getDay()];
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    const todayEvents = schedule[currentDay] || [];
    return todayEvents.find(event => 
      event.start <= currentTimeString && 
      event.end > currentTimeString
    );
  };

  // convertScheduleToEvents 함수 수정
  const convertScheduleToEvents = useCallback(() => {
    const events = [];
    
    Object.entries(schedule).forEach(([day, dayEvents]) => {
      dayEvents.forEach((event) => {
        events.push({
          title: event.title,
          daysOfWeek: [getDayNumber(day)],
          startTime: event.start,
          endTime: event.end,
          backgroundColor: event.color || '#4a4a8f',
          borderColor: event.color || '#4a4a8f',
          textColor: '#ffffff',
          display: 'block',
          extendedProps: {
            day: day,
            originalStart: event.start,
            originalEnd: event.end
          }
        });
      });
    });
    
    return events;
  }, [schedule]);

  // 수정을 위한 상태 추가 (컴포넌트 상단에 추가)
  const [editDialog, setEditDialog] = useState({
    open: false,
    day: null,
    index: null,
    title: '',
    color: '#4a4a8f'
  });

  // handleEventClick 함수 수정
  const handleEventClick = (info) => {
    const eventTitle = info.event.title;
    const day = info.event.extendedProps.day;
    const start = info.event.extendedProps.originalStart;
    const end = info.event.extendedProps.originalEnd;
    const color = info.event.backgroundColor;
    
    const index = schedule[day].findIndex(event => 
      event.title === eventTitle && 
      event.start === start && 
      event.end === end
    );

    if (index !== -1) {
      setEditDialog({
        open: true,
        day,
        index,
        title: eventTitle,
        color: color
      });
    }
  };

  // 수정 처리 함수 추가
  const handleEdit = () => {
    if (editDialog.day && editDialog.index !== null) {
      setSchedule(prev => {
        const newSchedule = { ...prev };
        const event = newSchedule[editDialog.day][editDialog.index];
        newSchedule[editDialog.day][editDialog.index] = {
          ...event,
          title: editDialog.title,
          color: editDialog.color
        };
        return newSchedule;
      });
      setEditDialog({ open: false, day: null, index: null, title: '', color: '#4a4a8f' });
    }
  };

  // handleDelete 함수 수정
  const handleDelete = () => {
    if (deleteDialog.day && deleteDialog.index !== null) {
      setSchedule(prev => {
        const newSchedule = { ...prev };
        newSchedule[deleteDialog.day] = [
          ...newSchedule[deleteDialog.day].slice(0, deleteDialog.index),
          ...newSchedule[deleteDialog.day].slice(deleteDialog.index + 1)
        ];
        return newSchedule;
      });
      setDeleteDialog({ open: false, day: null, index: null });
    }
  };

  // 제출 들러
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newEvent.title.trim()) {
      setAlert({
        open: true,
        message: '일정 내용을 입력해주세요.'
      });
      return;
    }

    const newSchedule = {
      ...schedule,
      [newEvent.day]: [
        ...schedule[newEvent.day],
        {
          title: newEvent.title,
          start: newEvent.startTime.format('HH:mm'),
          end: newEvent.endTime.format('HH:mm'),
          color: newEvent.color  // 색상 정보 저장
        }
      ].sort((a, b) => a.start.localeCompare(b.start))
    };

    setSchedule(newSchedule);
    
    setNewEvent({
      day: getCurrentDayName(),
      title: '',
      startTime: dayjs().set('hour', 0).set('minute', 0),
      endTime: dayjs().set('hour', 0).set('minute', 30),
      color: '#4a4a8f'
    });
  };

  // 수정 다이얼로그의 삭제 버튼 클릭 핸들러 추가
  const handleDeleteClick = () => {
    // 현재 수정 중인 일정 정보를 삭제 다이얼로그로 전달
    setDeleteDialog({
      open: true,
      day: editDialog.day,
      index: editDialog.index
    });
    // 수정 다이얼로그 닫기
    setEditDialog({ ...editDialog, open: false });
  };

  // 모든 일정 제거 함수 추가
  const handleClearAllSchedules = () => {
    if (window.confirm('모든 일정을 삭제하시겠습니까?')) {
      setSchedule({
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      });
    }
  };

  // 파일 내보내기 함수 추가
  const exportSchedule = () => {
    const scheduleData = JSON.stringify(schedule, null, 2); // 보기 좋게 포맷팅
    const blob = new Blob([scheduleData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `my-calendar-schedule-${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(link);
    link.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  // 파일 불러오기 함수 추가
  const importSchedule = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSchedule = JSON.parse(e.target.result);
          setSchedule(importedSchedule);
          setAlert({
            open: true,
            message: '일정을 성공적으로 불러왔습니다.'
          });
        } catch (error) {
          setAlert({
            open: true,
            message: '올바른 형식의 파일이 아닙니다.'
          });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="App">
      <div className="input-section">
        <h2>새로운 일정 등록</h2>
        <form onSubmit={handleSubmit}>
          <div className="day-buttons">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
              <button
                key={day}
                type="button"
                className={`day-button ${newEvent.day === day ? 'active' : ''}`}
                onClick={() => setNewEvent({...newEvent, day: day})}
              >
                {getDayName(day).slice(0, 1)}
              </button>
            ))}
          </div>

          <div className="time-picker-section">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="time-picker-group">
                <label>시작 시간</label>
                <TimePicker
                  value={newEvent.startTime}
                  onChange={(newTime) => setNewEvent({...newEvent, startTime: newTime})}
                  format="HH:mm"
                  ampm={false}
                  closeOnSelect={false}
                  slotProps={{
                    textField: {
                      size: 'small',
                      onClick: (e) => e.target.closest('.MuiInputBase-root').querySelector('button').click(),
                      InputProps: { readOnly: true }
                    }
                  }}
                />
              </div>

              <div className="time-picker-group">
                <label>종료 시간</label>
                <TimePicker
                  value={newEvent.endTime}
                  onChange={(newTime) => setNewEvent({...newEvent, endTime: newTime})}
                  format="HH:mm"
                  ampm={false}
                  closeOnSelect={false}
                  slotProps={{
                    textField: {
                      size: 'small',
                      onClick: (e) => e.target.closest('.MuiInputBase-root').querySelector('button').click(),
                      InputProps: { readOnly: true }
                    }
                  }}
                />
              </div>
            </LocalizationProvider>
          </div>

          <input
            type="text"
            placeholder="일정 내용"
            value={newEvent.title}
            onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
          />

          {/* 색상 선택 추가 */}
          <div className="color-picker">
            <label>일정 색상:</label>
            <div className="color-options">
              {colorOptions.map((color) => (
                <div
                  key={color.value}
                  className={`color-option ${newEvent.color === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setNewEvent({ ...newEvent, color: color.value })}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="submit-button">일정 추가</button>
        </form>

        {/* 알림음 설정을 폼 아래로 이동 */}
        
        <div className="clear-all-button" style={{ marginTop: '15px' }}>
          <Button
            onClick={handleClearAllSchedules}
            style={{
              width: '100%',
              backgroundColor: '#e74c3c',
              color: '#fff',
              padding: '10px',
              borderRadius: '4px',
              marginTop: '350px'
            }}
          >
            모든 일정 제거
          </Button>
        </div>
        <div className="sound-setting">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <FormControlLabel
              control={
                <Switch
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="알림음 ON"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={earlyNotification}
                  onChange={(e) => setEarlyNotification(e.target.checked)}
                  color="primary"
                />
              }
              label="5분전 알림"
            />
          </div>
          <div className="sound-attribution">
            Sound Effect by{' '}
            <a href="https://pixabay.com/ko/users/soundreality-31074404/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=158195">
              Jurij
            </a>{' '}
            from{' '}
            <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=158195">
              Pixabay
            </a>
          </div>
        </div>

        <div className="schedule-actions" style={{ 
          display: 'flex', 
          gap: '10px',
          marginTop: '15px',
          marginBottom: '15px' 
        }}>
          <Button
            onClick={exportSchedule}
            style={{
              flex: 1,
              backgroundColor: '#4a4a8f',
              color: '#fff',
              padding: '10px'
            }}
          >
            일정 내보내기
          </Button>
          <input
            type="file"
            accept=".txt"
            style={{ display: 'none' }}
            id="schedule-file-input"
            onChange={importSchedule}
          />
          <Button
            onClick={() => document.getElementById('schedule-file-input').click()}
            style={{
              flex: 1,
              backgroundColor: '#4a4a8f',
              color: '#fff',
              padding: '10px'
            }}
          >
            일정 불러오기
          </Button>
        </div>

      </div>

      <div className="schedule-section">
        <div className="current-time">
          {formatTimeNumber(currentTime.getHours())}시{' '}
          {formatTimeNumber(currentTime.getMinutes())}분{' '}
          {formatTimeNumber(currentTime.getSeconds())}초{' '}
          {getDayNameKorean(currentTime)}요일
          {getCurrentEvent(currentTime) && (
          <div className="current-event">
            현재 일정: {getCurrentEvent(currentTime).title}
          </div>
        )}
        </div>

        <div className="calendar-container">
          <FullCalendar
            plugins={[timeGridPlugin]}
            initialView="timeGridWeek"
            firstDay={1}
            slotDuration="00:05:00"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            allDaySlot={false}
            headerToolbar={false}
            events={convertScheduleToEvents()}
            eventClick={handleEventClick}
            height="auto"
            locale="ko"
            slotLabelInterval="01:00"
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            dayHeaderFormat={{ weekday: 'short' }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            eventDisplay="block"
            eventTextColor="#ffffff"
          />
        </div>
      </div>

      {/* 삭제 인 다이얼로그 */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, day: null, index: null })}
        PaperProps={{
          style: {
            backgroundColor: '#2d2d2d',
            color: '#fff'
          }
        }}
      >
        <DialogTitle>일정 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText style={{ color: '#fff' }}>
            이 일정을 삭제하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog({ open: false, day: null, index: null })}
            style={{ color: '#fff' }}
          >
            취소
          </Button>
          <Button 
            onClick={handleDelete}
            style={{ 
              backgroundColor: '#4a4a8f',
              color: '#fff'
            }}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 Snackbar */}
      <Snackbar
        open={alert.open}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity="warning"
          sx={{
            backgroundColor: '#4a4a8f',
            color: '#fff',
            '& .MuiAlert-icon': {
              color: '#fff'
            }
          }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      {/* 스케줄 알림 Snackbar 추가 */}
      <Snackbar
        open={scheduleAlert.open}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          onClose={handleCloseAlert}
          sx={{
            width: '100%',
            backgroundColor: '#4a4a8f',
            color: '#fff',
            '& .MuiAlert-icon': {
              color: '#fff'
            }
          }}
        >
          <div className="schedule-alert">
            <div className="alert-title">{scheduleAlert.message}</div>
            {scheduleAlert.events.map((event, index) => (
              <div key={index} className="alert-event">
                {event.title} ({event.start})
              </div>
            ))}
          </div>
        </Alert>
      </Snackbar>

      {/* 수정 다이얼로그 */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ ...editDialog, open: false })}
        PaperProps={{
          style: {
            backgroundColor: '#2d2d2d',
            color: '#fff',
            minWidth: '300px'
          }
        }}
      >
        <DialogTitle>일정 수정</DialogTitle>
        <DialogContent>
          <div style={{ marginTop: '10px' }}>
            <input
              type="text"
              value={editDialog.title}
              onChange={(e) => setEditDialog({ ...editDialog, title: e.target.value })}
              placeholder="일정 제목"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '15px',
                backgroundColor: '#3d3d3d',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff'
              }}
            />
            <div className="color-picker">
              <label>색상 선택</label>
              <div className="color-options">
                {colorOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`color-option ${editDialog.color === option.value ? 'selected' : ''}`}
                    style={{ backgroundColor: option.value }}
                    onClick={() => setEditDialog({ ...editDialog, color: option.value })}
                    title={option.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions style={{ padding: '16px' }}>
            <Button 
              onClick={handleDeleteClick}  // handleDelete에서 handleDeleteClick으로 변경
              style={{ 
                backgroundColor: '#e74c3c',
                color: '#fff',
                marginLeft: '8px',
                marginRight: '100px'
              }}
            >
              삭제
            </Button>
            <Button 
              onClick={handleEdit}
              style={{ 
                backgroundColor: '#4a4a8f',
                color: '#fff',
                marginLeft: '8px'
              }}
            >
              수정
            </Button>
          <Button 
            onClick={() => setEditDialog({ ...editDialog, open: false })}
            style={{ 
              backgroundColor: '#656565',
              color: '#fff',
              marginLeft: '8px'
            }}
          >
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default App;
