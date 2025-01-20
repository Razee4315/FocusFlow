// Window controls
document.getElementById('exitBtn').addEventListener('click', () => {
    ipcRenderer.send('close-window');
});

document.getElementById('minimizeBtn').addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
    ipcRenderer.send('toggle-fullscreen');
});

// Timer state
let isRunning = false;
let timeLeft = 25 * 60;
let isWorkTime = true;
let timerInterval;
let sessionsCompleted = 0;
let totalFocusTime = 0;
let totalBreakTime = 0;

// Settings
let settings = {
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    theme: 'light',
    autoStartBreaks: false,
    dailyGoal: 8
};

// Load settings from localStorage
const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
settings = { ...settings, ...savedSettings };

// DOM elements
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const settingsBtn = document.getElementById('settingsBtn');
const saveSettingsBtn = document.getElementById('saveSettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const timerLabel = document.querySelector('.timer-label');
const progressRing = document.querySelector('.progress-ring__circle');
const sessionCount = document.getElementById('sessionCount');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const toggleFullscreenBtn = document.getElementById('toggleFullscreenBtn');
const skipBreakBtn = document.getElementById('skipBreakBtn');
const settingsModal = document.getElementById('settingsModal');
const goalBar = document.getElementById('goalBar');
const goalText = document.getElementById('goalText');

// Calculate progress ring circumference
const radius = progressRing.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
progressRing.style.strokeDasharray = `${circumference} ${circumference}`;

// GSAP Animation for progress ring
gsap.set(progressRing, { strokeDashoffset: 0 });

function setProgress(percent) {
    const offset = circumference - (percent / 100 * circumference);
    gsap.to(progressRing, {
        strokeDashoffset: offset,
        duration: 0.5,
        ease: "power2.out"
    });
}

function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    minutesDisplay.textContent = minutes.toString().padStart(2, '0');
    secondsDisplay.textContent = seconds.toString().padStart(2, '0');
    
    const totalTime = isWorkTime ? settings.workDuration * 60 : 
        (sessionsCompleted % settings.longBreakInterval === 0 ? settings.longBreakDuration * 60 : settings.breakDuration * 60);
    const progress = (timeLeft / totalTime) * 100;
    setProgress(progress);
}

function startTimer() {
    if (!isRunning) {
        isRunning = true;
        startBtn.innerHTML = '<i class="fas fa-pause"></i>';
        timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            
            if (timeLeft <= 0) {
                handleTimerComplete();
            }
        }, 1000);
    } else {
        isRunning = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i>';
        clearInterval(timerInterval);
    }
}

function handleTimerComplete() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i>';
    
    if (isWorkTime) {
        sessionsCompleted++;
        totalFocusTime += settings.workDuration;
        sessionCount.textContent = sessionsCompleted;
        
        const isLongBreak = sessionsCompleted % settings.longBreakInterval === 0;
        timeLeft = isLongBreak ? settings.longBreakDuration * 60 : settings.breakDuration * 60;
        timerLabel.textContent = isLongBreak ? 'Long Break' : 'Break Time';
        showToast('Work session completed! Time for a break!');
    } else {
        timeLeft = settings.workDuration * 60;
        timerLabel.textContent = 'Work Time';
        showToast('Break time over! Ready to focus?');
    }
    
    isWorkTime = !isWorkTime;
    updateDisplay();
    updateStats();
    
    if (!isWorkTime && settings.autoStartBreaks) {
        startTimer();
    }

    // Save progress
    localStorage.setItem('progress', JSON.stringify({
        sessionsCompleted,
        totalFocusTime,
        totalBreakTime,
        lastDate: new Date().toDateString()
    }));
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i>';
    timeLeft = settings.workDuration * 60;
    isWorkTime = true;
    timerLabel.textContent = 'Work Time';
    updateDisplay();
    showToast('Timer reset');
}

function updateStats() {
    const progress = (sessionsCompleted / settings.dailyGoal) * 100;
    gsap.to(goalBar, {
        width: `${Math.min(progress, 100)}%`,
        duration: 0.5,
        ease: "power2.out"
    });
    goalText.textContent = `${sessionsCompleted}/${settings.dailyGoal} Pomodoros`;
}

function toggleTheme() {
    settings.theme = settings.theme === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme', settings.theme === 'dark');
    localStorage.setItem('settings', JSON.stringify(settings));
    showToast(`${settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)} theme activated`);
}

function toggleFullscreen() {
    ipcRenderer.send('toggle-fullscreen');
}

function skipBreak() {
    if (!isWorkTime) {
        handleTimerComplete();
        showToast('Break skipped');
    }
}

// Event listeners
startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
settingsBtn.addEventListener('click', () => settingsModal.style.display = 'block');
closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
toggleThemeBtn.addEventListener('click', toggleTheme);
toggleFullscreenBtn.addEventListener('click', toggleFullscreen);
skipBreakBtn.addEventListener('click', skipBreak);

// Settings
saveSettingsBtn.addEventListener('click', () => {
    const newSettings = {
        workDuration: parseInt(document.getElementById('workDuration').value),
        breakDuration: parseInt(document.getElementById('breakDuration').value),
        longBreakDuration: parseInt(document.getElementById('longBreakDuration').value),
        dailyGoal: parseInt(document.getElementById('dailyGoal').value),
        theme: document.getElementById('themeSelect').value
    };
    
    settings = { ...settings, ...newSettings };
    localStorage.setItem('settings', JSON.stringify(settings));
    
    if (isWorkTime) {
        timeLeft = settings.workDuration * 60;
    } else {
        const isLongBreak = sessionsCompleted % settings.longBreakInterval === 0;
        timeLeft = isLongBreak ? settings.longBreakDuration * 60 : settings.breakDuration * 60;
    }
    
    updateDisplay();
    updateStats();
    settingsModal.style.display = 'none';
    document.body.classList.toggle('dark-theme', settings.theme === 'dark');
    showToast('Settings saved successfully!');
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select')) return;
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            startTimer();
            break;
        case 'KeyR':
            resetTimer();
            break;
        case 'KeyS':
            settingsModal.style.display = 'block';
            break;
        case 'Escape':
            settingsModal.style.display = 'none';
            break;
        case 'KeyT':
            toggleTheme();
            break;
    }
});

// Load saved progress
const savedProgress = JSON.parse(localStorage.getItem('progress'));
if (savedProgress && savedProgress.lastDate === new Date().toDateString()) {
    sessionsCompleted = savedProgress.sessionsCompleted;
    totalFocusTime = savedProgress.totalFocusTime;
    totalBreakTime = savedProgress.totalBreakTime;
    sessionCount.textContent = sessionsCompleted;
} else {
    localStorage.removeItem('progress');
}

// Initial setup
document.body.classList.toggle('dark-theme', settings.theme === 'dark');
updateDisplay();
updateStats();
