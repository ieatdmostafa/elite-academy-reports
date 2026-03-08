// ====== Configuration & State ======
// Supabase Setup
const SUPABASE_URL = 'https://wdmzkcnkbguqdkymibgz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbXprY25rYmd1cWRreW1pYmd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MjA2MzcsImV4cCI6MjA4ODQ5NjYzN30.Qo_bfFoUxS5ghs0j9yAR_ejVmk5AdrocVnc5kZ9anK0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaultMetricsData = [
    { id: 'regular_posts', title: 'المنشورات العادية', target: 11, achieved: 0 },
    { id: 'carousel_posts', title: 'المنشورات متعددة الصور (الكاروسيل)', target: 6, achieved: 0 },
    { id: 'videos', title: 'مقاطع الفيديو', target: 6, achieved: 0 },
    { id: 'articles', title: 'المقالات', target: 1, achieved: 0 },
    { id: 'profiles', title: 'الملفات التعريفية (البروفايلات)', target: 1, achieved: 0 },
    { id: 'followers', title: 'نمو المتابعين', target: 175, achieved: 0 }
];

let metricsData = JSON.parse(JSON.stringify(defaultMetricsData));
const charts = {};
let saveTimeout;
let theme = localStorage.getItem('theme') || 'dark';

// History state
let historyLog = JSON.parse(localStorage.getItem('reportsHistory')) || [];
let historyLineChart = null;
let linksData = [];

// Calendar state
const DAY_NAMES = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const CONTENT_TYPES = {
    post: { label: '📝 منشور', emoji: '📝' },
    carousel: { label: '🎠 كاروسيل', emoji: '🎠' },
    video: { label: '🎬 فيديو', emoji: '🎬' },
    article: { label: '📰 مقال', emoji: '📰' },
    profile: { label: '👤 بروفايل', emoji: '👤' }
};
let calendarData = DAY_NAMES.map((name, i) => ({ dayIndex: i, dayName: name, items: [] }));

// Performance data state
let performanceData = {
    engagementInstagram: '', engagementFacebook: '', engagementLinkedin: '', engagementTiktok: '',
    weeklyReach: '', weeklyImpressions: '',
    bestPostTitle: '', bestPostUrl: '',
    inboxMessages: '', totalComments: '', totalShares: ''
};

// Templates state
let customTemplates = JSON.parse(localStorage.getItem('customTemplates')) || [];
const PREDEFINED_TEMPLATES = [
    {
        id: 'normal', icon: '📌', name: 'أسبوع عادي',
        desc: 'الأهداف الأساسية لأسبوع عمل طبيعي',
        metrics: [
            { id: 'regular_posts', title: 'المنشورات العادية', target: 11, achieved: 0 },
            { id: 'carousel_posts', title: 'المنشورات متعددة الصور (الكاروسيل)', target: 6, achieved: 0 },
            { id: 'videos', title: 'مقاطع الفيديو', target: 6, achieved: 0 },
            { id: 'articles', title: 'المقالات', target: 1, achieved: 0 },
            { id: 'profiles', title: 'الملفات التعريفية (البروفايلات)', target: 1, achieved: 0 },
            { id: 'followers', title: 'نمو المتابعين', target: 175, achieved: 0 }
        ]
    },
    {
        id: 'campaign', icon: '🚀', name: 'أسبوع حملة إعلانية',
        desc: 'أهداف مكثفة لأسبوع حملة تسويقية',
        metrics: [
            { id: 'regular_posts', title: 'المنشورات العادية', target: 15, achieved: 0 },
            { id: 'carousel_posts', title: 'المنشورات متعددة الصور (الكاروسيل)', target: 10, achieved: 0 },
            { id: 'videos', title: 'مقاطع الفيديو', target: 10, achieved: 0 },
            { id: 'articles', title: 'المقالات', target: 2, achieved: 0 },
            { id: 'profiles', title: 'الملفات التعريفية (البروفايلات)', target: 2, achieved: 0 },
            { id: 'followers', title: 'نمو المتابعين', target: 350, achieved: 0 }
        ]
    },
    {
        id: 'course_launch', icon: '🎓', name: 'أسبوع إطلاق كورس',
        desc: 'التركيز على الترويج لكورس جديد',
        metrics: [
            { id: 'regular_posts', title: 'المنشورات العادية', target: 14, achieved: 0 },
            { id: 'carousel_posts', title: 'المنشورات متعددة الصور (الكاروسيل)', target: 8, achieved: 0 },
            { id: 'videos', title: 'مقاطع الفيديو', target: 12, achieved: 0 },
            { id: 'articles', title: 'المقالات', target: 3, achieved: 0 },
            { id: 'profiles', title: 'الملفات التعريفية (البروفايلات)', target: 1, achieved: 0 },
            { id: 'followers', title: 'نمو المتابعين', target: 500, achieved: 0 }
        ]
    }
];

// ====== Initialization ======
document.addEventListener('DOMContentLoaded', () => {
    // Current Date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ar-EG', dateOptions);

    // Apply saved theme
    applyTheme(theme);

    // Load Data from Local Storage
    loadData();

    // Render Metrics
    renderMetrics();
    updateOverallProgress();
    renderLinks();
    renderCalendar();

    // Setup Listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Auto-save on any input with class 'save-target'
    document.querySelectorAll('.save-target').forEach(el => {
        el.addEventListener('input', triggerAutoSave);
    });

    // Performance metric inputs
    document.querySelectorAll('.perf-target').forEach(el => {
        el.addEventListener('input', () => {
            syncPerformanceDataFromUI();
            triggerAutoSave();
        });
    });

    // Controls
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('exportImgBtn').addEventListener('click', exportToImage);
    document.getElementById('clearDataBtn').addEventListener('click', clearData);

    // History Modal
    document.getElementById('historyBtn').addEventListener('click', openHistoryModal);
    document.getElementById('closeHistoryBtn').addEventListener('click', closeHistoryModal);
    document.getElementById('saveNewReportBtn').addEventListener('click', archiveCurrentReport);

    // Templates Modal
    document.getElementById('templatesBtn').addEventListener('click', openTemplatesModal);
    document.getElementById('closeTemplatesBtn').addEventListener('click', closeTemplatesModal);
    document.getElementById('saveTemplateBtn').addEventListener('click', saveCurrentAsTemplate);

    // Calendar Add Item Modal
    document.getElementById('closeCalItemBtn').addEventListener('click', () => {
        document.getElementById('addCalItemModal').classList.remove('active');
    });
    document.getElementById('confirmAddCalItem').addEventListener('click', confirmAddCalendarItem);
}

// ====== Render UI ======
function renderMetrics() {
    const grid = document.getElementById('metricsGrid');
    grid.innerHTML = '';

    metricsData.forEach(metric => {
        const remaining = Math.max(0, metric.target - metric.achieved);
        const progressPercent = metric.target > 0 ? Math.min(100, Math.round((metric.achieved / metric.target) * 100)) : 0;

        const card = document.createElement('div');
        card.className = 'metric-card glass-panel';
        if (progressPercent === 100) card.style.setProperty('--primary-color', 'var(--success)');

        card.innerHTML = `
            <div class="metric-header">
                <span class="metric-title">${metric.title}</span>
            </div>
            <div class="chart-container">
                <canvas id="chart_${metric.id}"></canvas>
                <div class="chart-percentage">${progressPercent}%</div>
            </div>
            
            <div class="metric-inputs">
                <div class="input-group">
                    <label>المستهدف</label>
                    <input type="number" class="glass-input save-target" id="target_${metric.id}" value="${metric.target}" min="1" oninput="handleMetricChange('${metric.id}')">
                </div>
                <div class="input-group">
                    <label>المنجز</label>
                    <input type="number" class="glass-input save-target" id="achieved_${metric.id}" value="${metric.achieved}" min="0" oninput="handleMetricChange('${metric.id}')">
                </div>
            </div>

            <div class="metric-stats">
                <div class="stat-item">
                    <span>الهدف</span>
                    <span class="stat-val val-target" id="stat_target_${metric.id}">${metric.target}</span>
                </div>
                <div class="stat-item">
                    <span>المنجز</span>
                    <span class="stat-val val-achieved" id="stat_achieved_${metric.id}">${metric.achieved}</span>
                </div>
                <div class="stat-item">
                    <span>المتبقي</span>
                    <span class="stat-val val-remaining" id="stat_remaining_${metric.id}">${remaining}</span>
                </div>
            </div>

            <!-- Links for this metric -->
            <div class="metric-links-section">
                <h4 style="font-size: 0.95rem; margin-top: 1rem; color: var(--text-muted); border-top: 1px dashed var(--panel-border); padding-top: 0.8rem;">روابط الأعمال (${metric.title})</h4>
                <div id="linksList_${metric.id}" class="links-list" style="margin-top: 0.8rem;">
                    <!-- Links for this metric will be injected here -->
                </div>
                <button class="btn btn-icon" onclick="addLink('${metric.id}')" style="margin-top: 0.8rem; width: 100%; border: 1px dashed var(--primary-color); justify-content: center; font-size: 0.9rem; padding: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    إضافة رابط جديد
                </button>
            </div>
        `;
        grid.appendChild(card);

        initChart(metric.id, metric.achieved, remaining);
    });
}

function renderLinks() {
    // Clear all existing link containers
    metricsData.forEach(metric => {
        const list = document.getElementById(`linksList_${metric.id}`);
        if (list) list.innerHTML = '';
    });

    linksData.forEach(link => {
        // Find which metric container this link belongs to (defaulting to the first one if metrics changed)
        const targetMetricId = link.metricId || metricsData[0].id;
        const list = document.getElementById(`linksList_${targetMetricId}`);
        if (!list) return;

        const item = document.createElement('div');
        item.className = 'link-item';
        let href = link.url.trim() || '#';
        if (href !== '#' && !href.startsWith('http')) href = 'https://' + href;

        item.innerHTML = `
            <div class="link-inputs" style="gap: 0.5rem;">
                <input type="text" placeholder="عنوان الرابط" class="glass-input link-title save-target" style="padding: 0.5rem; font-size: 0.9rem;" value="${link.title}">
                <input type="url" placeholder="الرابط المُرفق" class="glass-input link-url save-target" style="padding: 0.5rem; font-size: 0.9rem;" value="${link.url}">
                <button class="btn-icon remove-link-btn" title="حذف الرابط" style="padding: 0.5rem;" onclick="removeLink('${link.id}')">🗑️</button>
            </div>
            <div class="link-print-view">
                <a href="${href}" target="_blank">${link.title || 'رابط بدون عنوان'}</a>
            </div>
        `;
        list.appendChild(item);
    });

    // Reattach listeners to new elements
    document.querySelectorAll('.links-list .save-target').forEach(el => {
        el.addEventListener('input', (e) => {
            updateLinkData(e.target);
            triggerAutoSave();
        });
    });
}

function addLink(metricId) {
    linksData.push({ id: Date.now().toString(), metricId: metricId, title: '', url: '' });
    renderLinks();
    triggerAutoSave();
}

function removeLink(id) {
    if (confirm('هل تريد حذف هذا الرابط؟')) {
        linksData = linksData.filter(l => l.id !== id);
        renderLinks();
        triggerAutoSave();
    }
}

function updateLinkData(inputEl) {
    const itemEl = inputEl.closest('.link-item');
    const index = Array.from(itemEl.parentNode.children).indexOf(itemEl);
    if (index > -1 && linksData[index]) {
        const title = itemEl.querySelector('.link-title').value;
        const url = itemEl.querySelector('.link-url').value;
        linksData[index].title = title;
        linksData[index].url = url;

        let href = url.trim() || '#';
        if (href !== '#' && !href.startsWith('http')) href = 'https://' + href;

        const aTag = itemEl.querySelector('.link-print-view a');
        aTag.textContent = title || 'رابط بدون عنوان';
        aTag.href = href;
    }
}

function initChart(id, achieved, remaining) {
    const ctx = document.getElementById(`chart_${id}`).getContext('2d');

    const chartColor = remaining === 0 ? getSuccessGradient(ctx) : getPrimaryGradient(ctx);
    const bgColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    charts[id] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['المنجز', 'المتبقي'],
            datasets: [{
                data: [achieved, remaining],
                backgroundColor: [chartColor, bgColor],
                borderWidth: 0,
                borderRadius: 5,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    rtl: true,
                    titleFont: { family: 'Cairo' },
                    bodyFont: { family: 'Cairo' },
                    backgroundColor: theme === 'dark' ? 'rgba(22, 27, 34, 0.9)' : 'rgba(255,255,255,0.9)',
                    titleColor: theme === 'dark' ? '#fff' : '#000',
                    bodyColor: theme === 'dark' ? '#fff' : '#000',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

function getPrimaryGradient(ctx) {
    if (!ctx) return '#58a6ff';
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, '#58a6ff');
    gradient.addColorStop(1, '#3b82f6');
    return gradient;
}

function getSuccessGradient(ctx) {
    if (!ctx) return '#2ea043';
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, '#2ea043');
    gradient.addColorStop(1, '#238636');
    return gradient;
}

// ====== Interactivity ======
window.handleMetricChange = function (id) {
    const targetInput = document.getElementById(`target_${id}`);
    const achievedInput = document.getElementById(`achieved_${id}`);

    let target = parseInt(targetInput.value) || 0;
    let achieved = parseInt(achievedInput.value) || 0;

    if (target < 0) { target = 0; targetInput.value = 0; }
    if (achieved < 0) { achieved = 0; achievedInput.value = 0; }

    const remaining = Math.max(0, target - achieved);
    const progressPercent = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

    const metricIndex = metricsData.findIndex(m => m.id === id);
    const wasCompleted = metricsData[metricIndex].achieved >= metricsData[metricIndex].target && metricsData[metricIndex].target > 0;

    // Update state
    metricsData[metricIndex].target = target;
    metricsData[metricIndex].achieved = achieved;

    // Update UI DOM
    document.getElementById(`stat_target_${id}`).textContent = target;
    document.getElementById(`stat_achieved_${id}`).textContent = achieved;
    document.getElementById(`stat_remaining_${id}`).textContent = remaining;

    const card = targetInput.closest('.metric-card');
    card.querySelector('.chart-percentage').textContent = `${progressPercent}%`;

    // Chart update
    const chart = charts[id];
    const ctx = chart.canvas.getContext('2d');
    chart.data.datasets[0].backgroundColor[0] = remaining === 0 ? getSuccessGradient(ctx) : getPrimaryGradient(ctx);
    chart.data.datasets[0].data = [achieved, remaining];
    chart.update();

    // Check completion & styling
    if (progressPercent >= 100) {
        card.style.setProperty('--primary-color', 'var(--success)');
        if (!wasCompleted && achieved > 0) {
            triggerConfetti();
            showToast(`🎉 مميز! تم إنجاز هدف: ${metricsData[metricIndex].title}`, 'success');
        }
    } else {
        card.style.setProperty('--primary-color', theme === 'dark' ? '#58a6ff' : '#0969da');
    }

    updateOverallProgress();
    triggerAutoSave();
};

function getOverallProgress() {
    let totalTarget = 0;
    let totalAchieved = 0;

    metricsData.forEach(metric => {
        totalTarget += metric.target;
        totalAchieved += Math.min(metric.achieved, metric.target); // Cap at target for overall
    });

    return totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
}

function updateOverallProgress() {
    const overallPercent = getOverallProgress();

    const percentageText = document.getElementById('overallPercentage');
    const progressBar = document.getElementById('overallProgressBar');

    percentageText.textContent = `${overallPercent}%`;
    progressBar.style.width = `${overallPercent}%`;

    if (overallPercent === 100 && metricsData.reduce((acc, curr) => acc + curr.target, 0) > 0) {
        progressBar.style.background = 'linear-gradient(90deg, var(--success), #3fb950)';
        percentageText.style.color = 'var(--success)';
        document.querySelector('.progress-header').style.color = 'var(--success)';
    } else {
        progressBar.style.background = 'linear-gradient(90deg, var(--primary-color), var(--accent-gold))';
        percentageText.style.color = 'var(--primary-color)';
        document.querySelector('.progress-header').style.color = 'var(--heading-color)';
    }
}

// ====== Visual Effects ======
function triggerConfetti() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#58a6ff', '#2ea043', '#f0c354', '#d2a8ff']
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '💡';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ====== Theme ======
function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Update chart background colors
    Object.keys(charts).forEach(id => {
        const chart = charts[id];
        chart.data.datasets[0].backgroundColor[1] = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        chart.options.plugins.tooltip.backgroundColor = theme === 'dark' ? 'rgba(22, 27, 34, 0.9)' : 'rgba(255,255,255,0.9)';
        chart.options.plugins.tooltip.titleColor = theme === 'dark' ? '#fff' : '#000';
        chart.options.plugins.tooltip.bodyColor = theme === 'dark' ? '#fff' : '#000';

        const card = document.getElementById(`target_${id}`).closest('.metric-card');
        const achieved = parseInt(document.getElementById(`achieved_${id}`).value) || 0;
        const target = parseInt(document.getElementById(`target_${id}`).value) || 0;
        if (achieved < target || target === 0) {
            card.style.setProperty('--primary-color', theme === 'dark' ? '#58a6ff' : '#0969da');
        }

        chart.update();
    });

    if (historyLineChart) {
        updateHistoryChartTheme();
    }
}

function applyTheme(currentTheme) {
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('themeIcon').textContent = '🌙';
        document.getElementById('themeToggleBtn').title = 'تفعيل الوضع الداكن';
    } else {
        document.body.classList.remove('light-mode');
        document.getElementById('themeIcon').textContent = '☀️';
        document.getElementById('themeToggleBtn').title = 'تفعيل الوضع الفاتح';
    }
}

// ====== Export ======
async function exportToImage() {
    const captureArea = document.getElementById('captureArea');
    showToast('يتم الآن تحضير التقرير للصورة...', 'info');
    document.getElementById('exportImgBtn').disabled = true;

    captureArea.classList.add('exporting');

    try {
        await new Promise(r => setTimeout(r, 500)); // allow css to settle

        const canvas = await html2canvas(captureArea, {
            scale: 2,
            useCORS: true,
            backgroundColor: theme === 'dark' ? '#0d1117' : '#f6f8fa',
        });

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `التقرير_الأسبوعي_${document.getElementById('weekNum').value || 'جديد'}.png`;
        link.href = dataUrl;
        link.click();

        showToast('تم حفظ التقرير كصورة بنجاح!', 'success');
        triggerConfetti();
    } catch (error) {
        console.error('Error generating image', error);
        showToast('حدث خطأ أثناء حفظ الصورة.', 'warning');
    } finally {
        captureArea.classList.remove('exporting');
        document.getElementById('exportImgBtn').disabled = false;
    }
}

// ====== Supabase Data Storage ======
function triggerAutoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveData, 2000); // 2 second debounce for DB
}

async function saveData() {
    syncPerformanceDataFromUI();

    const dataToSave = {
        metricsData: metricsData,
        generalInfo: {
            weekNum: document.getElementById('weekNum').value,
            monthName: document.getElementById('monthName').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value
        },
        texts: {
            completedTasks: document.getElementById('completedTasks').value,
            inProgressTasks: document.getElementById('inProgressTasks').value,
            uncompletedTasks: document.getElementById('uncompletedTasks').value,
            notes: document.getElementById('notes').value
        },
        links: linksData,
        calendar: calendarData,
        performance: performanceData
    };

    // Save locally as fallback/cache
    localStorage.setItem('weeklyReportData', JSON.stringify(dataToSave));

    const weekNumVal = document.getElementById('weekNum').value;
    if (!weekNumVal) return; // Only save to supabase if we have a week number to use as ID

    try {
        const { error } = await supabase.from('reports_current').upsert({
            id: 1, // Store the single current working copy
            week_number: parseInt(weekNumVal),
            report_data: dataToSave,
            updated_at: new Date().toISOString()
        });

        if (error) console.error("Error saving data to Supabase:", error);
    } catch (err) {
        console.error("Supabase Save Error:", err);
    }
}

async function loadData() {
    try {
        // Try to fetch from Supabase first
        const { data: supaData, error } = await supabase
            .from('reports_current')
            .select('report_data')
            .eq('id', 1)
            .single();

        let dataToApply = null;

        if (supaData && supaData.report_data) {
            dataToApply = supaData.report_data;
        } else {
            // Fallback to local
            const saved = localStorage.getItem('weeklyReportData');
            if (saved) dataToApply = JSON.parse(saved);
        }

        if (dataToApply) {
            applyDataToUI(dataToApply);
        }

        // Fetch history summary from Supabase
        await loadHistoryFromSupabase();

    } catch (e) {
        console.error('Error loading data', e);
        // Fallback to local
        const saved = localStorage.getItem('weeklyReportData');
        if (saved) applyDataToUI(JSON.parse(saved));
    }
}

function applyDataToUI(data) {
    if (data.metricsData) metricsData = data.metricsData;

    if (data.generalInfo) {
        document.getElementById('weekNum').value = data.generalInfo.weekNum || '';
        document.getElementById('monthName').value = data.generalInfo.monthName || '';
        document.getElementById('startDate').value = data.generalInfo.startDate || '';
        document.getElementById('endDate').value = data.generalInfo.endDate || '';
    }

    if (data.texts) {
        document.getElementById('completedTasks').value = data.texts.completedTasks || '';
        document.getElementById('inProgressTasks').value = data.texts.inProgressTasks || '';
        document.getElementById('uncompletedTasks').value = data.texts.uncompletedTasks || '';
        document.getElementById('notes').value = data.texts.notes || '';
    }

    if (data.links) {
        linksData = data.links;
    } else {
        linksData = [];
    }

    // Calendar data
    if (data.calendar && Array.isArray(data.calendar)) {
        calendarData = data.calendar;
    } else {
        calendarData = DAY_NAMES.map((name, i) => ({ dayIndex: i, dayName: name, items: [] }));
    }

    // Performance data
    if (data.performance) {
        performanceData = data.performance;
        applyPerformanceDataToUI();
    }

    renderMetrics();
    renderLinks();
    renderCalendar();
    updateOverallProgress();
}

function clearData() {
    if (confirm('هل أنت متأكد أنك تريد مسح جميع بيانات التقرير الحالي والبدء من جديد؟ لن يتم مسح الأرشيف.')) {
        localStorage.removeItem('weeklyReportData');
        metricsData = JSON.parse(JSON.stringify(defaultMetricsData));
        linksData = [];
        calendarData = DAY_NAMES.map((name, i) => ({ dayIndex: i, dayName: name, items: [] }));
        performanceData = {
            engagementInstagram: '', engagementFacebook: '', engagementLinkedin: '', engagementTiktok: '',
            weeklyReach: '', weeklyImpressions: '',
            bestPostTitle: '', bestPostUrl: '',
            inboxMessages: '', totalComments: '', totalShares: ''
        };
        document.querySelectorAll('input[type="number"], input[type="date"], input[type="text"]:not(#creatorName), textarea, input[type="url"]').forEach(el => el.value = '');
        renderMetrics();
        renderLinks();
        renderCalendar();
        updateOverallProgress();
        showToast('تم مسح البيانات والبدء من جديد.', 'warning');
    }
}

// ====== History Management ======
function openHistoryModal() {
    document.getElementById('historyModal').classList.add('active');
    renderHistoryChart();
    renderHistoryList();
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

async function archiveCurrentReport() {
    const week = document.getElementById('weekNum').value;
    const month = document.getElementById('monthName').value;

    if (!week) {
        showToast('يرجى تحديد رقم الأسبوع أولاً.', 'warning');
        return;
    }

    const title = `الأسبوع ${week}` + (month ? ` - شهر ${month}` : '');
    const overallProgress = getOverallProgress();
    const dateSaved = new Date().toLocaleDateString('ar-EG');
    const weekNumberInt = parseInt(week) || 0;

    const newReportData = {
        title: title,
        weekNumber: weekNumberInt,
        dateSaved: dateSaved,
        overallProgress: overallProgress,
        data: {
            metricsData: JSON.parse(JSON.stringify(metricsData)),
            generalInfo: {
                weekNum: week,
                monthName: month,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value
            },
            texts: {
                completedTasks: document.getElementById('completedTasks').value,
                inProgressTasks: document.getElementById('inProgressTasks').value,
                uncompletedTasks: document.getElementById('uncompletedTasks').value,
                notes: document.getElementById('notes').value
            },
            links: JSON.parse(JSON.stringify(linksData)),
            calendar: JSON.parse(JSON.stringify(calendarData)),
            performance: JSON.parse(JSON.stringify(performanceData))
        }
    };

    try {
        // Upsert to Supabase
        const { data, error } = await supabase.from('reports_archive').upsert({
            week_number: weekNumberInt,
            title: title,
            overall_progress: overallProgress,
            date_saved: dateSaved,
            report_data: newReportData.data,
            updated_at: new Date().toISOString()
        }, { onConflict: 'week_number' }).select();

        if (error) throw error;

        showToast('تمت أرشفة التقرير في السحابة بنجاح!', 'success');

        // Refresh local history list from DB
        await loadHistoryFromSupabase();

    } catch (err) {
        console.error("Archive Error:", err);
        showToast('حدث خطأ أثناء أرشفة التقرير في السحابة.', 'danger');
    }
}

async function loadHistoryFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('reports_archive')
            .select('*')
            .order('week_number', { ascending: true });

        if (error) throw error;

        if (data) {
            historyLog = data.map(row => ({
                id: row.id,
                title: row.title,
                weekNumber: row.week_number,
                dateSaved: row.date_saved,
                overallProgress: row.overall_progress,
                data: row.report_data
            }));

            // Backup locally
            localStorage.setItem('reportsHistory', JSON.stringify(historyLog));

            renderHistoryChart();
            renderHistoryList();
        }
    } catch (err) {
        console.error("Load history error", err);
    }
}

function renderHistoryList() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (historyLog.length === 0) {
        list.innerHTML = '<p style="text-align:center; color: var(--text-muted)">لا توجد تقارير مؤرشفة بعد.</p>';
        return;
    }

    // reverse to show newest first in list
    [...historyLog].reverse().forEach(report => {
        const item = document.createElement('div');
        item.className = 'history-item';

        let color = 'var(--primary-color)';
        if (report.overallProgress === 100) color = 'var(--success)';
        else if (report.overallProgress < 50) color = 'var(--danger)';

        item.innerHTML = `
            <div class="history-info">
                <strong>${report.title}</strong>
                <p>تاريخ الحفظ: ${report.dateSaved} | معدل الإنجاز: <span style="color: ${color}; font-weight:bold">${report.overallProgress}%</span></p>
            </div>
            <div class="history-item-actions">
                <button class="btn btn-icon" title="استرجاع هذا التقرير" onclick="loadReportFromHistory('${report.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                </button>
                <button class="btn btn-icon" title="حذف" onclick="deleteHistoryReport('${report.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.loadReportFromHistory = function (id) {
    if (confirm('سيتم الكتابة فوق التقرير الحالي. هل تود الاستمرار؟')) {
        const report = historyLog.find(r => r.id === id);
        if (!report) return;

        localStorage.setItem('weeklyReportData', JSON.stringify(report.data));
        loadData();
        renderMetrics();
        updateOverallProgress();
        closeHistoryModal();
        showToast('تم استرجاع التقرير بنجاح!', 'success');
    }
}

async function deleteHistoryReport(id) {
    if (confirm('هل أنت متأكد من حذف هذا التقرير المؤرشف من السحابة؟')) {
        try {
            const { error } = await supabase
                .from('reports_archive')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showToast('تم حذف التقرير المؤرشف.', 'success');
            await loadHistoryFromSupabase();
        } catch (err) {
            console.error("Delete history error", err);
            showToast('حدث خطأ أثناء حذف التقرير.', 'danger');
        }
    }
}
window.deleteHistoryReport = deleteHistoryReport;

function renderHistoryChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');

    if (historyLineChart) {
        historyLineChart.destroy();
    }

    if (historyLog.length === 0) return;

    const labels = historyLog.map(r => `أسبوع ${r.weekNumber || '?'}`);
    const dataPoints = historyLog.map(r => r.overallProgress);

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    const colorTop = theme === 'dark' ? 'rgba(88, 166, 255, 0.4)' : 'rgba(9, 105, 218, 0.4)';
    const colorBot = theme === 'dark' ? 'rgba(88, 166, 255, 0)' : 'rgba(9, 105, 218, 0)';
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBot);

    const borderColor = theme === 'dark' ? '#58a6ff' : '#0969da';
    const textColor = theme === 'dark' ? '#c9d1d9' : '#24292f';
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.1)';

    historyLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'معدل الإنجاز %',
                data: dataPoints,
                borderColor: borderColor,
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: theme === 'dark' ? '#d2a8ff' : '#8250df',
                pointRadius: 5,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Cairo' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'Cairo' } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    rtl: true,
                    titleFont: { family: 'Cairo' },
                    bodyFont: { family: 'Cairo' }
                }
            }
        }
    });
}

function updateHistoryChartTheme() {
    // A quick re-render to apply theme differences
    if (document.getElementById('historyModal').classList.contains('active')) {
        renderHistoryChart();
    }
}

// ====== Content Calendar ======
function getTodayDayIndex() {
    // JS getDay(): 0=Sunday. We want: 0=Saturday
    const jsDay = new Date().getDay();
    // Map: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
    return jsDay === 6 ? 0 : jsDay + 1;
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    const todayIdx = getTodayDayIndex();

    calendarData.forEach((day, dayIdx) => {
        const col = document.createElement('div');
        col.className = 'cal-day' + (dayIdx === todayIdx ? ' today' : '');
        col.dataset.dayIndex = dayIdx;

        col.innerHTML = `
            <div class="cal-day-name">${day.dayName}</div>
            <div class="cal-day-items" data-day="${dayIdx}"></div>
            <div class="cal-day-add">
                <button onclick="openAddCalItem(${dayIdx})">+ إضافة</button>
            </div>
        `;

        // Drag & Drop zone
        const itemsContainer = col.querySelector('.cal-day-items');
        itemsContainer.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });
        itemsContainer.addEventListener('dragleave', () => {
            col.classList.remove('drag-over');
        });
        itemsContainer.addEventListener('drop', e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const fromDay = parseInt(e.dataTransfer.getData('fromDay'));
            const itemId = e.dataTransfer.getData('itemId');
            moveCalendarItem(fromDay, dayIdx, itemId);
        });

        // Render items
        (day.items || []).forEach(item => {
            const chip = document.createElement('div');
            chip.className = `cal-chip type-${item.type}`;
            chip.draggable = true;
            chip.innerHTML = `
                <span>${CONTENT_TYPES[item.type]?.emoji || ''} ${item.title || CONTENT_TYPES[item.type]?.label || ''}</span>
                <span class="chip-delete" onclick="removeCalendarItem(${dayIdx}, '${item.id}')">✕</span>
            `;

            chip.addEventListener('dragstart', e => {
                e.dataTransfer.setData('fromDay', dayIdx.toString());
                e.dataTransfer.setData('itemId', item.id);
                chip.style.opacity = '0.4';
            });
            chip.addEventListener('dragend', () => {
                chip.style.opacity = '1';
            });

            itemsContainer.appendChild(chip);
        });

        grid.appendChild(col);
    });
}

window.openAddCalItem = function (dayIdx) {
    document.getElementById('calItemDay').value = dayIdx;
    document.getElementById('calItemTitle').value = '';
    document.getElementById('calItemType').value = 'post';
    document.getElementById('addCalItemModal').classList.add('active');
};

function confirmAddCalendarItem() {
    const dayIdx = parseInt(document.getElementById('calItemDay').value);
    const type = document.getElementById('calItemType').value;
    const title = document.getElementById('calItemTitle').value.trim();

    if (!calendarData[dayIdx]) return;

    calendarData[dayIdx].items.push({
        id: Date.now().toString(),
        type: type,
        title: title || CONTENT_TYPES[type]?.label || type
    });

    document.getElementById('addCalItemModal').classList.remove('active');
    renderCalendar();
    triggerAutoSave();
    showToast(`تم إضافة ${CONTENT_TYPES[type]?.label || type} ليوم ${calendarData[dayIdx].dayName}`, 'success');
}

window.removeCalendarItem = function (dayIdx, itemId) {
    if (!calendarData[dayIdx]) return;
    calendarData[dayIdx].items = calendarData[dayIdx].items.filter(i => i.id !== itemId);
    renderCalendar();
    triggerAutoSave();
};

function moveCalendarItem(fromDay, toDay, itemId) {
    if (fromDay === toDay) return;
    if (!calendarData[fromDay] || !calendarData[toDay]) return;

    const itemIndex = calendarData[fromDay].items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const [item] = calendarData[fromDay].items.splice(itemIndex, 1);
    calendarData[toDay].items.push(item);

    renderCalendar();
    triggerAutoSave();
    showToast(`تم نقل المحتوى إلى يوم ${calendarData[toDay].dayName}`, 'info');
}

// ====== Performance Data Sync ======
const PERF_FIELDS = [
    'engagementInstagram', 'engagementFacebook', 'engagementLinkedin', 'engagementTiktok',
    'weeklyReach', 'weeklyImpressions',
    'bestPostTitle', 'bestPostUrl',
    'inboxMessages', 'totalComments', 'totalShares'
];

function syncPerformanceDataFromUI() {
    PERF_FIELDS.forEach(field => {
        const el = document.getElementById(field);
        if (el) performanceData[field] = el.value;
    });
}

function applyPerformanceDataToUI() {
    PERF_FIELDS.forEach(field => {
        const el = document.getElementById(field);
        if (el) el.value = performanceData[field] || '';
    });
}

// ====== Templates ======
function openTemplatesModal() {
    document.getElementById('templatesModal').classList.add('active');
    renderTemplates();
}

function closeTemplatesModal() {
    document.getElementById('templatesModal').classList.remove('active');
}

function renderTemplates() {
    // Predefined
    const predefinedGrid = document.getElementById('predefinedTemplates');
    predefinedGrid.innerHTML = '';
    PREDEFINED_TEMPLATES.forEach(t => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
            <div class="template-icon">${t.icon}</div>
            <div class="template-name">${t.name}</div>
            <div class="template-desc">${t.desc}</div>
        `;
        card.addEventListener('click', () => loadTemplate(t));
        predefinedGrid.appendChild(card);
    });

    // Custom
    const customGrid = document.getElementById('customTemplatesList');
    customGrid.innerHTML = '';
    if (customTemplates.length === 0) {
        customGrid.innerHTML = '<p style="text-align:center; color: var(--text-muted); grid-column: 1/-1;">لا توجد قوالب محفوظة بعد.</p>';
        return;
    }
    customTemplates.forEach(t => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
            <button class="template-delete" onclick="event.stopPropagation(); deleteCustomTemplate('${t.id}')">✕</button>
            <div class="template-icon">📁</div>
            <div class="template-name">${t.name}</div>
            <div class="template-desc">تم الحفظ: ${t.dateSaved}</div>
        `;
        card.addEventListener('click', () => loadTemplate(t));
        customGrid.appendChild(card);
    });
}

function loadTemplate(template) {
    if (!confirm(`سيتم تطبيق قالب "${template.name}" على التقرير الحالي. هل تود الاستمرار؟`)) return;

    metricsData = JSON.parse(JSON.stringify(template.metrics));
    renderMetrics();
    updateOverallProgress();
    closeTemplatesModal();
    triggerAutoSave();
    showToast(`تم تحميل قالب: ${template.name}`, 'success');
    triggerConfetti();
}

function saveCurrentAsTemplate() {
    const name = prompt('أدخل اسم القالب:');
    if (!name || !name.trim()) return;

    const template = {
        id: Date.now().toString(),
        name: name.trim(),
        icon: '📁',
        desc: `قالب مخصص`,
        dateSaved: new Date().toLocaleDateString('ar-EG'),
        metrics: JSON.parse(JSON.stringify(metricsData))
    };

    customTemplates.push(template);
    localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
    renderTemplates();
    showToast(`تم حفظ القالب: ${name}`, 'success');
}

window.deleteCustomTemplate = function (id) {
    if (!confirm('هل تريد حذف هذا القالب؟')) return;
    customTemplates = customTemplates.filter(t => t.id !== id);
    localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
    renderTemplates();
    showToast('تم حذف القالب.', 'warning');
};
