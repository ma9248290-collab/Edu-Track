// ==========================================
// قواعد البيانات المحلية (LocalStorage)
// ==========================================
let students = JSON.parse(localStorage.getItem("students")) || [];
let groups = JSON.parse(localStorage.getItem("groups")) || [];
let classSessions = JSON.parse(localStorage.getItem("classSessions")) || []; 
let exams = JSON.parse(localStorage.getItem("exams")) || []; 
let homeworks = JSON.parse(localStorage.getItem("homeworks")) || []; 
let financeRecords = JSON.parse(localStorage.getItem("financeRecords")) || {}; 
let expenses = JSON.parse(localStorage.getItem("expenses")) || []; 
let isAssistantMode = localStorage.getItem("isAssistantMode") === "true";
let adminPin = localStorage.getItem("adminPin") || "2580";

let currentActiveSessionId = null;
let currentActiveExamId = null;
let currentActiveHwId = null;
let currentActiveGroup = null; 
let currentStudentProfileCode = null;

let attendanceChartInstance = null;
let groupsChartInstance = null;
let financeChartInstance = null;

let html5QrcodeScanner = null;
let currentScannerTarget = '';

if(isAssistantMode) enableAssistantMode();

// ==========================================
// نظام الإشعارات والتأكيد 
// ==========================================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast ${type}`;
    toast.innerHTML = `<span style="margin-left: 10px;">${type === 'success' ? '✅' : '❌'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease-in forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

let confirmCallback = null;
function customConfirm(message, callback) {
    document.getElementById('confirmMessage').innerText = message; confirmCallback = callback;
    document.getElementById('customConfirmModal').style.display = 'block';
}
document.getElementById('confirmYesBtn').addEventListener('click', function() {
    if(confirmCallback) confirmCallback(); closeModal('customConfirmModal');
});

// ==========================================
// نظام التنقل و وضع المساعد
// ==========================================
function switchPage(pageId) {
    document.querySelectorAll(".view-section").forEach(el => el.style.display = "none");
    document.querySelectorAll(".nav-links li").forEach(el => el.classList.remove("active"));
    document.getElementById(pageId + "-view").style.display = "block";
    document.getElementById("nav-" + pageId).classList.add("active");

    const titles = {
        "dashboard": ["أهلاً بك يا شيفو 👋", "الرسوم البيانية ونظرة عامة"],
        "groups": ["إدارة المجموعات 📚", "إضافة، تعديل، وإدارة المجموعات"],
        "students": ["إدارة الطلاب 🎓", "سجل الطلاب الشامل والملفات"],
        "attendance": ["سجل الحضور 📋", "تسجيل غياب الطلاب"],
        "exams": ["الامتحانات 📝", "رصد درجات الامتحانات"],
        "homework": ["الواجبات 📝", "تقييم الواجبات"],
        "finance": ["الماليات (حساب الحصة) 💰", "الإيرادات والمصروفات وصافي الربح لكل حصة"],
        "leaderboard": ["لوحة الشرف 🏆", "أفضل 5 طلاب في المجموعات"],
        "backup": ["النسخ الاحتياطي 🛡️", "حفظ واسترجاع بيانات النظام"],
        "atrisk": ["تحت الملاحظة 🚨", "الطلاب المعرضين للخطر (تأخر دراسي)"]
    };
    if(titles[pageId]) { document.getElementById("page-title").innerText = titles[pageId][0]; document.getElementById("page-desc").innerText = titles[pageId][1]; }

    if (pageId === "dashboard") { renderDashboardCharts(); }
    if (pageId === "students") { document.getElementById("students-overview").style.display = "block"; document.getElementById("student-profile-view").style.display = "none"; renderTable(); }
    if (pageId === "groups") { document.getElementById("groups-overview").style.display = "block"; document.getElementById("group-details-view").style.display = "none"; renderGroupCards(); }
    if (pageId === "attendance") { document.getElementById("sessions-overview").style.display = "block"; document.getElementById("session-details-view").style.display = "none"; renderSessionCards(); populateDropdowns(); }
    if (pageId === "exams") { document.getElementById("exams-overview").style.display = "block"; document.getElementById("exam-details-view").style.display = "none"; renderExamCards(); populateDropdowns(); }
    if (pageId === "homework") { document.getElementById("hw-overview").style.display = "block"; document.getElementById("hw-details-view").style.display = "none"; renderHwCards(); populateDropdowns(); }
    if (pageId === "finance") { populateDropdowns(); renderFinanceTable(); }
    if (pageId === "leaderboard") { populateDropdowns(); }
    if (pageId === "atrisk") { renderAtRiskStudents(); }
}

const currentTheme = localStorage.getItem("theme") || "dark"; const themeBtn = document.getElementById("theme-btn");
if (currentTheme === "light") { document.documentElement.setAttribute("data-theme", "light"); themeBtn.innerText = "🌙 الوضع الداكن"; }
function toggleTheme() {
    const root = document.documentElement;
    if (root.getAttribute("data-theme") === "light") { root.removeAttribute("data-theme"); localStorage.setItem("theme", "dark"); themeBtn.innerText = "☀️ الوضع الفاتح"; } 
    else { root.setAttribute("data-theme", "light"); localStorage.setItem("theme", "light"); themeBtn.innerText = "🌙 الوضع الداكن"; }
    renderDashboardCharts(); 
}

function toggleAssistantMode() {
    if(isAssistantMode) { openModal('pinModal'); } 
    else { enableAssistantMode(); showToast("تم تفعيل وضع المساعد وإغلاق الصلاحيات"); }
}
function enableAssistantMode() {
    isAssistantMode = true; localStorage.setItem("isAssistantMode", "true");
    document.body.classList.add('assistant-mode');
    document.getElementById('assistant-btn').innerText = "🔓 فتح الإدارة";
    document.getElementById('assistant-btn').style.borderColor = "var(--success-color)";
    document.getElementById('assistant-btn').style.color = "var(--success-color)";
    switchPage('dashboard');
}
function verifyPin() {
    const entered = document.getElementById('adminPinInput').value;
    if(entered === adminPin) {
        isAssistantMode = false; localStorage.setItem("isAssistantMode", "false");
        document.body.classList.remove('assistant-mode');
        document.getElementById('assistant-btn').innerText = "🔒 قفل الإدارة (للمساعد)";
        document.getElementById('assistant-btn').style.borderColor = "var(--danger-color)";
        document.getElementById('assistant-btn').style.color = "var(--danger-color)";
        closeModal('pinModal'); document.getElementById('adminPinInput').value = '';
        showToast("مرحباً بك يا شيفو! تم فتح الصلاحيات كاملة.");
        renderDashboardCharts();
    } else { showToast("الرقم السري خاطئ!", "error"); }
}

// ==========================================
// ماسح الباركود بالكاميرا (جديد)
// ==========================================
function startCameraScanner(targetInputId) {
    currentScannerTarget = targetInputId;
    document.getElementById('scannerModal').style.display = 'block';
    
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function stopCameraScanner() {
    if(html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
            document.getElementById('scannerModal').style.display = 'none';
        }).catch(error => {
            document.getElementById('scannerModal').style.display = 'none';
        });
    } else {
        document.getElementById('scannerModal').style.display = 'none';
    }
}

function onScanSuccess(decodedText, decodedResult) {
    stopCameraScanner();
    const targetInput = document.getElementById(currentScannerTarget);
    if(targetInput) {
        targetInput.value = decodedText;
        // محاكاة ضغطة Enter عشان يستدعي كود التسجيل الخارجي
        const enterEvent = new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        targetInput.dispatchEvent(enterEvent);
    }
}
function onScanFailure(error) {} // تجاهل الأخطاء العادية وقت المسح

// ==========================================
// 1. لوحة القيادة التفاعلية (الماليات السنوية الجديدة)
// ==========================================
function renderDashboardCharts() {
    document.getElementById("total-students").innerText = students.length;
    document.getElementById("total-groups").innerText = groups.length;
    
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim() || '#fff';
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#3b82f6';
    
    // 1. الحضور مجمع
    const ctxAtt = document.getElementById('attendanceChart').getContext('2d');
    if(attendanceChartInstance) attendanceChartInstance.destroy();
    
    const sessionsByDate = {};
    classSessions.forEach(s => {
        if(!sessionsByDate[s.date]) { sessionsByDate[s.date] = { expected: 0, attended: 0 }; }
        const groupStudentsCount = students.filter(st => st.group === s.group).length;
        const presentCount = Object.values(s.attendance).filter(v => v === 'present').length;
        sessionsByDate[s.date].expected += groupStudentsCount;
        sessionsByDate[s.date].attended += presentCount;
    });

    const sortedDates = Object.keys(sessionsByDate).sort((a,b) => new Date(a) - new Date(b)).slice(-7);
    const sessionLabels = sortedDates.map(d => d.substring(5)); 
    const sessionData = sortedDates.map(d => {
        const exp = sessionsByDate[d].expected;
        return exp > 0 ? Math.round((sessionsByDate[d].attended / exp) * 100) : 0;
    });

    attendanceChartInstance = new Chart(ctxAtt, {
        type: 'line',
        data: { labels: sessionLabels, datasets: [{ label: 'متوسط الحضور اليومي (%)', data: sessionData, borderColor: primaryColor, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 3, fill: true, tension: 0.3 }] },
        options: { plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor }, min: 0, max: 100 } } }
    });

    // 2. المجموعات
    const ctxGrp = document.getElementById('groupsChart').getContext('2d');
    if(groupsChartInstance) groupsChartInstance.destroy();
    const groupLabels = groups;
    const groupData = groups.map(g => students.filter(s => s.group === g).length);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    groupsChartInstance = new Chart(ctxGrp, {
        type: 'doughnut',
        data: { labels: groupLabels, datasets: [{ data: groupData, backgroundColor: colors, borderWidth: 0 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { color: textColor } } } }
    });

    // 3. التحليلات المالية السنوية (جديد)
    if(isAssistantMode) return; // المساعد ميشوفش الفلوس

    const ctxFin = document.getElementById('financeChart').getContext('2d');
    if(financeChartInstance) financeChartInstance.destroy();

    const monthlyData = {};
    const defaultStudentFee = 50; 
    const defaultCenterFee = 10;

    classSessions.forEach(s => {
        const month = s.date.substring(0, 7); // YYYY-MM
        if(!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0, net: 0 };
    });

    Object.keys(financeRecords).forEach(key => {
        if(key.startsWith('fin_session_')) {
            const sessionId = key.replace('fin_session_', '');
            const session = classSessions.find(s => s.id === sessionId);
            if(session) {
                const month = session.date.substring(0, 7);
                if(!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0, net: 0 };
                
                let paidCount = 0;
                Object.values(financeRecords[key]).forEach(status => { if(status === 'paid') paidCount++; });
                
                const income = paidCount * defaultStudentFee;
                const centerCut = paidCount * defaultCenterFee;
                monthlyData[month].income += income;
                monthlyData[month].expenses += centerCut;
            }
        }
    });

    expenses.forEach(ex => {
        const session = classSessions.find(s => s.id === ex.sessionId);
        if(session) {
            const month = session.date.substring(0, 7);
            if(!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0, net: 0 };
            monthlyData[month].expenses += parseFloat(ex.amount);
        }
    });

    Object.keys(monthlyData).forEach(m => { monthlyData[m].net = monthlyData[m].income - monthlyData[m].expenses; });
    const sortedMonths = Object.keys(monthlyData).sort();
    
    financeChartInstance = new Chart(ctxFin, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: [
                { label: 'الإيرادات', data: sortedMonths.map(m => monthlyData[m].income), backgroundColor: '#10b981' },
                { label: 'المصروفات', data: sortedMonths.map(m => monthlyData[m].expenses), backgroundColor: '#ef4444' },
                { label: 'صافي الربح', data: sortedMonths.map(m => monthlyData[m].net), backgroundColor: '#3b82f6' }
            ]
        },
        options: { plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } }
    });
}

// ==========================================
// 2. نظام الإنذار المبكر (At-Risk)
// ==========================================
function renderAtRiskStudents() {
    const tbody = document.getElementById("atrisk-list"); tbody.innerHTML = "";
    if(students.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">لا يوجد طلاب</td></tr>`;
    
    let atRiskCount = 0;
    students.forEach(student => {
        let reasons = [];
        const gSessions = classSessions.filter(s => s.group === student.group).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 2);
        if(gSessions.length === 2 && gSessions[0].attendance[student.phone] === 'absent' && gSessions[1].attendance[student.phone] === 'absent') { reasons.push("غياب آخر حصتين متتاليتين"); }

        const gExams = exams.filter(e => e.group === student.group).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 2);
        let failCount = 0;
        gExams.forEach(ex => {
            const grade = ex.grades[student.phone];
            if(grade !== undefined && parseFloat(grade) < (parseFloat(ex.maxScore) / 2)) failCount++;
        });
        if(failCount === 2) reasons.push("رسوب في آخر امتحانين");

        if(reasons.length > 0) {
            atRiskCount++;
            const msg = encodeURIComponent(`تحذير من إدارة الدرس: الطالب ${student.name} مستواه متراجع. السبب: ${reasons.join(" و ")}. برجاء المتابعة!`);
            const waUrl = `https://wa.me/20${student.parentPhone.replace(/^0+/, '')}?text=${msg}`;
            tbody.innerHTML += `<tr><td><strong>${student.code}</strong></td><td>${student.name}</td><td>${student.group}</td><td style="color:var(--danger-color); font-weight:bold;">${reasons.join("<br>")}</td><td><button class="icon-btn" style="background-color:#128C7E; color:white; border:none;" onclick="window.open('${waUrl}','_blank')">إنذار للولي 💬</button></td></tr>`;
        }
    });

    if(atRiskCount === 0) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--success-color); font-weight:bold;">الطلاب كلهم في مستوى أمان والحمد لله!</td></tr>`;
}

// ==========================================
// 3. الخزنة الشاملة (للحصة الواحدة)
// ==========================================
function renderFinanceTable() {
    const sessionId = document.getElementById("financeSessionSelect").value;
    const studentFee = parseFloat(document.getElementById("financeStudentFee").value) || 0;
    const centerFee = parseFloat(document.getElementById("financeCenterFee").value) || 0;
    const tbody = document.getElementById("finance-list");
    
    if(!sessionId) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">اختر الحصة لعرض حساباتها</td></tr>`;
    
    const session = classSessions.find(s => s.id === sessionId);
    if(!session) return;

    const groupStudents = students.filter(s => s.group === session.group);
    if(groupStudents.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">لا يوجد طلاب في هذه المجموعة</td></tr>`;
    
    const recordKey = `fin_session_${sessionId}`;
    if(!financeRecords[recordKey]) financeRecords[recordKey] = {};
    
    tbody.innerHTML = "";
    let totalPaidCount = 0;

    groupStudents.forEach(student => {
        const isPaid = financeRecords[recordKey][student.code] === 'paid';
        if(isPaid) totalPaidCount++;

        const attendanceStatus = session.attendance[student.phone] || 'none';
        let attBadge = `<span style="color:var(--text-muted)">لم يسجل</span>`;
        if(attendanceStatus === 'present') attBadge = `<span style="color:var(--success-color); font-weight:bold;">حاضر</span>`;
        if(attendanceStatus === 'absent') attBadge = `<span style="color:var(--danger-color); font-weight:bold;">غائب</span>`;

        const badge = isPaid ? `<span class="status-badge status-present">تم الدفع ✅</span>` : `<span class="status-badge status-absent">لم يدفع ❌</span>`;
        const btn = isPaid ? `<button class="icon-btn danger" onclick="togglePayment('${recordKey}', '${student.code}', 'unpaid')">إلغاء الدفع</button>` : `<button class="enter-btn" onclick="togglePayment('${recordKey}', '${student.code}', 'paid')">تأكيد الدفع</button>`;
        tbody.innerHTML += `<tr><td><strong>${student.code}</strong></td><td>${student.name}</td><td>${attBadge}</td><td>${badge}</td><td>${btn}</td></tr>`;
    });

    const totalIncome = totalPaidCount * studentFee;
    const totalCenterCut = totalPaidCount * centerFee;

    document.getElementById("total-income").innerText = `${totalIncome} ج.م`;
    document.getElementById("total-income").dataset.income = totalIncome;
    document.getElementById("total-income").dataset.centerCut = totalCenterCut;

    renderExpensesList();
}

function togglePayment(recordKey, studentCode, status) {
    financeRecords[recordKey][studentCode] = status;
    localStorage.setItem("financeRecords", JSON.stringify(financeRecords));
    renderFinanceTable(); showToast(status === 'paid' ? "تم تسجيل الدفع" : "تم إلغاء الدفع");
}

document.getElementById("addExpenseForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const desc = document.getElementById("expDesc").value;
    const amount = parseFloat(document.getElementById("expAmount").value);
    const sessionId = document.getElementById("financeSessionSelect").value;
    if(!sessionId) return showToast("اختر الحصة أولاً!", "error");
    
    expenses.push({ id: Date.now(), sessionId, desc, amount });
    localStorage.setItem("expenses", JSON.stringify(expenses));
    this.reset(); renderExpensesList(); showToast("تم إضافة المصروف");
});

function renderExpensesList() {
    const sessionId = document.getElementById("financeSessionSelect").value;
    const tbody = document.getElementById("expenses-list");
    tbody.innerHTML = "";
    
    let totalAdditionalExp = 0;
    expenses.filter(ex => ex.sessionId === sessionId).forEach((ex) => {
        totalAdditionalExp += ex.amount;
        tbody.innerHTML += `<tr><td>${ex.desc}</td><td>${ex.amount} ج</td><td><button class="icon-btn danger" onclick="deleteExpense('${ex.id}')">🗑️</button></td></tr>`;
    });
    
    const incomeEl = document.getElementById("total-income");
    const totalIncome = parseFloat(incomeEl.dataset.income) || 0;
    const centerCut = parseFloat(incomeEl.dataset.centerCut) || 0;

    const totalExpensesWithCenter = centerCut + totalAdditionalExp;
    document.getElementById("total-expenses").innerText = `${totalExpensesWithCenter} ج.م`;
    document.getElementById("total-expenses").title = `السنتر: ${centerCut} ج.م + مصروفات: ${totalAdditionalExp} ج.م`;

    const netProfit = totalIncome - totalExpensesWithCenter;
    const netEl = document.getElementById("net-profit");
    netEl.innerText = `${netProfit} ج.م`;
    netEl.style.color = netProfit < 0 ? "var(--danger-color)" : "var(--primary-color)";
}

function deleteExpense(id) {
    expenses = expenses.filter(ex => ex.id.toString() !== id.toString());
    localStorage.setItem("expenses", JSON.stringify(expenses));
    renderExpensesList();
}

// ==========================================
// 4. لوحة الشرف (Leaderboard)
// ==========================================
function generateLeaderboard() {
    const group = document.getElementById("leaderboardGroup").value;
    const container = document.getElementById("leaderboard-results");
    if(!group) return container.innerHTML = `<p style="text-align: center; color: var(--text-muted);">اختر المجموعة لعرض أوائل الطلبة</p>`;
    
    const groupStudents = students.filter(s => s.group === group);
    if(groupStudents.length === 0) return container.innerHTML = `<p style="text-align: center;">لا يوجد طلاب في هذه المجموعة</p>`;

    let leaderboard = groupStudents.map(student => {
        let score = 0;
        classSessions.filter(s => s.group === group).forEach(session => { if(session.attendance[student.phone] === 'present') score += 10; });
        exams.filter(e => e.group === group).forEach(exam => { if(exam.grades[student.phone]) { score += (parseFloat(exam.grades[student.phone]) / parseFloat(exam.maxScore)) * 50; } });
        homeworks.filter(h => h.group === group).forEach(hw => { if(hw.grades[student.phone]) { score += (parseFloat(hw.grades[student.phone]) / parseFloat(hw.maxScore)) * 20; } });
        score += (student.behaviorPoints || 0); 
        return { name: student.name, code: student.code, score: Math.round(score) };
    });

    leaderboard.sort((a, b) => b.score - a.score);
    const top5 = leaderboard.slice(0, 5);
    
    container.innerHTML = "";
    const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];
    top5.forEach((st, index) => {
        container.innerHTML += `
            <div class="stat-card" style="display:flex; justify-content:space-between; align-items:center; border-left: 5px solid var(--exam-color);">
                <div style="display:flex; gap:15px; align-items:center;"><span style="font-size:30px;">${medals[index]}</span><div><h3 style="margin-bottom:5px; color:var(--text-main); font-size:18px;">${st.name}</h3><p style="color:var(--primary-color); font-weight:bold;">الكود: ${st.code}</p></div></div>
                <div style="text-align:center;"><p style="color:var(--text-muted); font-size:12px;">مجموع النقاط</p><p style="font-size:24px; font-weight:bold; color:var(--exam-color);">${st.score}</p></div>
            </div>`;
    });
}

// ==========================================
// 5. إدارة الطلاب والبروفايل
// ==========================================
function generateStudentCode() { let maxId = 0; students.forEach(s => { let num = parseInt(s.code, 10); if (!isNaN(num) && num > maxId) maxId = num; }); return (maxId + 1).toString(); }
function openModal(modalId) { document.getElementById(modalId).style.display = "block"; if(modalId === 'addStudentModal') document.getElementById('studentCode').value = generateStudentCode(); if(modalId === 'addSessionModal') { document.getElementById('sessionDate').valueAsDate = new Date(); toggleAutoInputs(); } if(modalId === 'addExamModal') document.getElementById('examDate').valueAsDate = new Date(); if(modalId === 'addHwModal') document.getElementById('hwDate').valueAsDate = new Date(); }
function closeModal(modalId) { 
    document.getElementById(modalId).style.display = "none"; 
    if(modalId === 'scannerModal') stopCameraScanner();
}
window.onclick = function(event) { 
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none"; 
        if(event.target.id === 'scannerModal') stopCameraScanner();
    }
}

function populateDropdowns() {
    const selects = ["studentGroup", "sessionGroupSelect", "examGroupSelect", "hwGroupSelect", "leaderboardGroup", "editStudentGroup"];
    selects.forEach(id => { const el = document.getElementById(id); if(el) { el.innerHTML = "<option value=''>اختر المجموعة...</option>"; groups.forEach(g => el.innerHTML += `<option value="${g}">${g}</option>`); }});
    const finSelect = document.getElementById("financeSessionSelect");
    if(finSelect) { finSelect.innerHTML = "<option value=''>اختر الحصة...</option>"; [...classSessions].reverse().forEach(s => { finSelect.innerHTML += `<option value="${s.id}">${s.date} - ${s.group} (${s.topic})</option>`; }); }
}

document.getElementById("addStudentForm").addEventListener("submit", function(e) { e.preventDefault(); const code = document.getElementById("studentCode").value; const name = document.getElementById("studentName").value; const level = document.getElementById("studentLevel").value; const gender = document.getElementById("studentGender").value; const phone = document.getElementById("studentPhone").value; const parentPhone = document.getElementById("parentPhone").value; const group = document.getElementById("studentGroup").value; if(group === "") return showToast("يرجى اختيار مجموعة!", "error"); students.push({ code, name, level, gender, phone, parentPhone, group, behaviorPoints: 0 }); localStorage.setItem("students", JSON.stringify(students)); this.reset(); closeModal('addStudentModal'); renderTable(); showToast("تم تسجيل الطالب"); });
function renderTable() { const tbody = document.getElementById("students-list"); tbody.innerHTML = ""; students.forEach((student) => { tbody.innerHTML += `<tr><td><strong style="color:var(--primary-color);">${student.code}</strong></td><td>${student.name}</td><td>${student.level}</td><td>${student.group}</td><td><button class="profile-btn" onclick="openStudentProfile('${student.code}')">👤 الملف</button></td></tr>`; }); document.getElementById("total-students").innerText = students.length; }
function searchStudent() { const filter = document.getElementById("searchInput").value.toLowerCase(); const rows = document.getElementById("students-list").getElementsByTagName("tr"); for (let i = 0; i < rows.length; i++) { const codeCol = rows[i].getElementsByTagName("td")[0]; const nameCol = rows[i].getElementsByTagName("td")[1]; if (codeCol && nameCol) { const txt = codeCol.innerText.toLowerCase() + " " + nameCol.innerText.toLowerCase(); rows[i].style.display = (txt.indexOf(filter) > -1) ? "" : "none"; } } }

function openStudentProfile(code) {
    const student = students.find(s => s.code === code); if(!student) return;
    currentStudentProfileCode = code;
    document.getElementById("students-overview").style.display = "none"; document.getElementById("student-profile-view").style.display = "block";
    document.getElementById("profile-name").innerText = student.name; document.getElementById("profile-code-group").innerText = `${student.code} | المجموعة: ${student.group}`;
    if(document.getElementById("profile-phone")) document.getElementById("profile-phone").innerText = student.phone;
    if(document.getElementById("profile-parent")) document.getElementById("profile-parent").innerText = student.parentPhone;
    if(document.getElementById("profile-level")) document.getElementById("profile-level").innerText = student.level;
    if(document.getElementById("profile-gender")) document.getElementById("profile-gender").innerText = student.gender;
    document.getElementById("profile-behavior-points").innerText = student.behaviorPoints || 0; 

    const waUrl = (phone) => `https://wa.me/20${phone.replace(/^0+/, '')}`; 
    if(document.getElementById("wa-student-btn")) document.getElementById("wa-student-btn").onclick = () => window.open(waUrl(student.phone), '_blank');
    if(document.getElementById("wa-parent-btn")) document.getElementById("wa-parent-btn").onclick = () => { const msg = encodeURIComponent(`أهلاً بحضرتك ولي أمر الطالب ${student.name}.. رسالة من إدارة الدرس: `); window.open(waUrl(student.parentPhone) + `?text=${msg}`, '_blank'); };

    const groupSessions = classSessions.filter(s => s.group === student.group).sort((a,b) => new Date(b.date) - new Date(a.date));
    let attended = 0; const attTbody = document.getElementById("profile-attendance-list"); if(attTbody) attTbody.innerHTML = "";
    groupSessions.forEach(s => { const st = s.attendance[student.phone]; if(st === 'present') attended++; const badge = st === 'present' ? `<span style="color:var(--success-color);">حاضر ✓</span>` : st === 'absent' ? `<span style="color:var(--danger-color);">غائب ✗</span>` : `-`; if(attTbody) attTbody.innerHTML += `<tr><td>${s.date}</td><td>${badge}</td></tr>`; });
    document.getElementById("profile-attendance").innerText = `${groupSessions.length > 0 ? Math.round((attended / groupSessions.length) * 100) : 0}%`;

    const groupExams = exams.filter(e => e.group === student.group).sort((a,b) => new Date(b.date) - new Date(a.date));
    let tExam = 0, sExam = 0; const exTbody = document.getElementById("profile-exams-list"); if(exTbody) exTbody.innerHTML = "";
    groupExams.forEach(e => { if(e.grades[student.phone]) { tExam += parseFloat(e.maxScore); sExam += parseFloat(e.grades[student.phone]); } if(exTbody) exTbody.innerHTML += `<tr><td>${e.name}</td><td>${e.date}</td><td><strong>${e.grades[student.phone] || '--'}</strong> / ${e.maxScore}</td></tr>`; });
    document.getElementById("profile-exams").innerText = `${tExam > 0 ? Math.round((sExam / tExam) * 100) : 0}%`;

    const groupHw = homeworks.filter(h => h.group === student.group).sort((a,b) => new Date(b.date) - new Date(a.date));
    let tHw = 0, sHw = 0; const hwTbody = document.getElementById("profile-hw-list"); if(hwTbody) hwTbody.innerHTML = "";
    groupHw.forEach(h => { if(h.grades[student.phone]) { tHw += parseFloat(h.maxScore); sHw += parseFloat(h.grades[student.phone]); } if(hwTbody) hwTbody.innerHTML += `<tr><td>${h.name}</td><td>${h.date}</td><td><strong>${h.grades[student.phone] || '--'}</strong> / ${h.maxScore}</td></tr>`; });
    document.getElementById("profile-hw").innerText = `${tHw > 0 ? Math.round((sHw / tHw) * 100) : 0}%`;
}
function backToStudents() { currentStudentProfileCode = null; document.getElementById("students-overview").style.display = "block"; document.getElementById("student-profile-view").style.display = "none"; }
function deleteStudentFromProfile() { customConfirm("حذف الطالب نهائياً؟", () => { students = students.filter(s => s.code !== currentStudentProfileCode); localStorage.setItem("students", JSON.stringify(students)); backToStudents(); renderTable(); showToast("تم الحذف"); }); }
function changeBehaviorPoints(points) { const student = students.find(s => s.code === currentStudentProfileCode); if(student) { student.behaviorPoints = (student.behaviorPoints || 0) + points; localStorage.setItem("students", JSON.stringify(students)); document.getElementById("profile-behavior-points").innerText = student.behaviorPoints; showToast(points > 0 ? "تم إضافة نقاط تميز 🌟" : "تم خصم نقاط 🤫"); } }

function openEditStudentModal() { const student = students.find(s => s.code === currentStudentProfileCode); if(student) { populateDropdowns(); document.getElementById('editStudentCode').value = student.code; document.getElementById('editStudentName').value = student.name; document.getElementById('editStudentLevel').value = student.level; document.getElementById('editStudentGender').value = student.gender; document.getElementById('editStudentPhone').value = student.phone; document.getElementById('editParentPhone').value = student.parentPhone; document.getElementById('editStudentGroup').value = student.group; openModal('editStudentModal'); } }
document.getElementById('editStudentForm').addEventListener('submit', function(e) { e.preventDefault(); const code = document.getElementById('editStudentCode').value; const studentIndex = students.findIndex(s => s.code === code); if(studentIndex > -1) { const oldPhone = students[studentIndex].phone; const newPhone = document.getElementById('editStudentPhone').value; students[studentIndex].name = document.getElementById('editStudentName').value; students[studentIndex].level = document.getElementById('editStudentLevel').value; students[studentIndex].gender = document.getElementById('editStudentGender').value; students[studentIndex].phone = newPhone; students[studentIndex].parentPhone = document.getElementById('editParentPhone').value; students[studentIndex].group = document.getElementById('editStudentGroup').value; if(oldPhone !== newPhone) { classSessions.forEach(s => { if(s.attendance[oldPhone]) { s.attendance[newPhone] = s.attendance[oldPhone]; delete s.attendance[oldPhone]; }}); exams.forEach(ex => { if(ex.grades[oldPhone]) { ex.grades[newPhone] = ex.grades[oldPhone]; delete ex.grades[oldPhone]; }}); homeworks.forEach(hw => { if(hw.grades[oldPhone]) { hw.grades[newPhone] = hw.grades[oldPhone]; delete hw.grades[oldPhone]; }}); localStorage.setItem("classSessions", JSON.stringify(classSessions)); localStorage.setItem("exams", JSON.stringify(exams)); localStorage.setItem("homeworks", JSON.stringify(homeworks)); } localStorage.setItem("students", JSON.stringify(students)); closeModal('editStudentModal'); openStudentProfile(code); showToast("تم التحديث"); } });

// ==========================================
// باقي الأكواد الأساسية (المجموعات / الحصص / الامتحانات / الواجبات)
// ==========================================
document.getElementById("addGroupForm").addEventListener("submit", function(e) { e.preventDefault(); const groupName = document.getElementById("groupName").value; if(!groups.includes(groupName)) { groups.push(groupName); localStorage.setItem("groups", JSON.stringify(groups)); showToast("تم الإضافة"); } this.reset(); renderGroupCards(); populateDropdowns(); });
function renderGroupCards() { const grid = document.getElementById("groups-list"); grid.innerHTML = ""; groups.forEach((group, index) => { const studentsCount = students.filter(s => s.group === group).length; grid.innerHTML += `<div class="session-card"><div class="session-header-card"><div class="session-group-name">📁 ${group}</div></div><div style="font-size: 14px; color: var(--text-muted);">👥 عدد الطلاب: <strong style="color:var(--text-main);">${studentsCount}</strong></div><div class="session-actions"><button class="enter-btn" onclick="openGroupDetails('${group}')">إدارة المجموعة</button><button class="icon-btn danger admin-only" onclick="deleteGroup(${index})" title="حذف">🗑️</button></div></div>`; }); document.getElementById("total-groups").innerText = groups.length; }
function deleteGroup(index) { customConfirm("حذف هذه المجموعة؟", () => { groups.splice(index, 1); localStorage.setItem("groups", JSON.stringify(groups)); renderGroupCards(); populateDropdowns(); }); }
function openGroupDetails(groupName) { currentActiveGroup = groupName; document.getElementById("groups-overview").style.display = "none"; document.getElementById("group-details-view").style.display = "block"; document.getElementById("current-group-title").innerText = `مجموعة: ${groupName}`; renderGroupStudentsTable(); }
function backToGroups() { currentActiveGroup = null; document.getElementById("groups-overview").style.display = "block"; document.getElementById("group-details-view").style.display = "none"; renderGroupCards(); }
function renderGroupStudentsTable() { const tbody = document.getElementById("group-students-list"); tbody.innerHTML = ""; const groupStudents = students.filter(s => s.group === currentActiveGroup); if(groupStudents.length===0) return tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">لا يوجد طلاب</td></tr>`; groupStudents.forEach((student) => { tbody.innerHTML += `<tr><td><strong style="color:var(--primary-color);">${student.code}</strong></td><td>${student.name}</td><td>${student.parentPhone}</td><td><button class="profile-btn" onclick="openStudentProfile('${student.code}')">👤 الملف</button></td></tr>`; }); }
function quickExamForGroup() { if(!currentActiveGroup) return; const quickExam = { id: Date.now().toString(), group: currentActiveGroup, name: `امتحان مفاجئ - ${new Date().toLocaleDateString('ar-EG')}`, maxScore: "10", date: new Date().toISOString().split('T')[0], status: "open", grades: {} }; exams.push(quickExam); localStorage.setItem("exams", JSON.stringify(exams)); switchPage('exams'); openExamDetails(quickExam.id); }
function openAddStudentToGroupModal() { openModal('addStudentToGroupModal'); const select = document.getElementById('existingStudentSelect'); select.innerHTML = "<option value=''>اختر طالباً...</option>"; students.filter(s => s.group !== currentActiveGroup).forEach(s => { select.innerHTML += `<option value="${s.code}">${s.name} (${s.code})</option>`; }); }
function switchAddStudentTab(tab) { const f = document.getElementById('addExistingStudentForm'); const c = document.getElementById('newStudentTabContent'); const b = document.querySelectorAll('#addStudentToGroupModal .theme-btn'); if(tab === 'existing') { f.style.display = 'block'; c.style.display = 'none'; b[0].style.color = 'var(--primary-color)'; b[1].style.color = 'var(--text-main)'; } else { f.style.display = 'none'; c.style.display = 'block'; b[1].style.color = 'var(--primary-color)'; b[0].style.color = 'var(--text-main)'; } }
document.getElementById('addExistingStudentForm').addEventListener('submit', function(e) { e.preventDefault(); const code = document.getElementById('existingStudentSelect').value; const student = students.find(s => s.code === code); if(student) { student.group = currentActiveGroup; localStorage.setItem("students", JSON.stringify(students)); closeModal('addStudentToGroupModal'); renderGroupStudentsTable(); showToast("تم إضافة الطالب"); } });
window.goToNewStudentForm = function() { closeModal('addStudentToGroupModal'); openModal('addStudentModal'); setTimeout(() => { document.getElementById('studentGroup').value = currentActiveGroup || ""; }, 50); };

// الحصص
function toggleAutoInputs() { const eCheck = document.getElementById("autoExamCheck").checked; const hCheck = document.getElementById("autoHwCheck").checked; document.getElementById("autoExamScore").style.display = eCheck ? "block" : "none"; document.getElementById("autoHwScore").style.display = hCheck ? "block" : "none"; }
document.getElementById("addSessionForm").addEventListener("submit", function(e) { e.preventDefault(); const group = document.getElementById("sessionGroupSelect").value; const date = document.getElementById("sessionDate").value; const topic = document.getElementById("sessionTopic").value || "حصة"; classSessions.push({ id: Date.now().toString(), group, date, topic, status: "open", attendance: {} }); localStorage.setItem("classSessions", JSON.stringify(classSessions)); if(document.getElementById("autoExamCheck").checked) { exams.push({ id: Date.now().toString()+"_e", group, name: `امتحان: ${topic}`, maxScore: document.getElementById("autoExamScore").value, date, status: "open", grades: {} }); localStorage.setItem("exams", JSON.stringify(exams)); } if(document.getElementById("autoHwCheck").checked) { homeworks.push({ id: Date.now().toString()+"_h", group, name: `واجب: ${topic}`, maxScore: document.getElementById("autoHwScore").value, date, status: "open", grades: {} }); localStorage.setItem("homeworks", JSON.stringify(homeworks)); } this.reset(); toggleAutoInputs(); closeModal('addSessionModal'); renderSessionCards(); populateDropdowns(); showToast("تم الإنشاء"); });
function renderSessionCards() { const grid = document.getElementById("sessions-grid"); grid.innerHTML = ""; [...classSessions].reverse().forEach(session => { const presentCount = Object.values(session.attendance).filter(v => v === 'present').length; const total = students.filter(s => s.group === session.group).length; const isClosed = session.status === 'closed'; grid.innerHTML += `<div class="session-card"><div class="session-header-card"><div><div class="session-group-name">${session.group}</div><div class="session-date">${session.date}</div></div><span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">${isClosed ? 'مغلقة' : 'مفتوحة'}</span></div><div class="session-topic">${session.topic}</div><div style="font-size: 14px; color: var(--text-muted);">الحضور: <strong>${presentCount} / ${total}</strong></div><div class="session-actions"><button class="enter-btn" onclick="openSessionDetails('${session.id}')" ${isClosed?'disabled':''}>تسجيل</button><button class="icon-btn admin-only" onclick="openEditSessionModal('${session.id}')">✏️</button><button class="icon-btn admin-only" onclick="toggleSessionStatus('${session.id}')">${isClosed?'🔓':'🔒'}</button><button class="icon-btn danger admin-only" onclick="deleteSession('${session.id}')">🗑️</button></div></div>`; }); }
function openEditSessionModal(id) { const session = classSessions.find(s => s.id === id); if(session) { document.getElementById('editSessionId').value = id; document.getElementById('editSessionDate').value = session.date; document.getElementById('editSessionTopic').value = session.topic; openModal('editSessionModal'); } }
document.getElementById('editSessionForm').addEventListener('submit', function(e) { e.preventDefault(); const session = classSessions.find(s => s.id === document.getElementById('editSessionId').value); if(session) { session.date = document.getElementById('editSessionDate').value; session.topic = document.getElementById('editSessionTopic').value; localStorage.setItem("classSessions", JSON.stringify(classSessions)); closeModal('editSessionModal'); renderSessionCards(); showToast("تم التعديل"); } });
function toggleSessionStatus(id) { const s = classSessions.find(s => s.id === id); if(s) { s.status = s.status === 'open' ? 'closed' : 'open'; localStorage.setItem("classSessions", JSON.stringify(classSessions)); renderSessionCards(); } }
function deleteSession(id) { customConfirm("حذف الحصة؟", () => { classSessions = classSessions.filter(s => s.id !== id); localStorage.setItem("classSessions", JSON.stringify(classSessions)); renderSessionCards(); }); }
function openSessionDetails(id) { currentActiveSessionId = id; const session = classSessions.find(s => s.id === id); document.getElementById("sessions-overview").style.display = "none"; document.getElementById("session-details-view").style.display = "block"; document.getElementById("current-session-title").innerText = session.group; renderAttendanceTable(session); }
function backToSessions() { document.getElementById("sessions-overview").style.display = "block"; document.getElementById("session-details-view").style.display = "none"; renderSessionCards(); }
function renderAttendanceTable(session) { const tbody = document.getElementById("attendance-list"); const gStudents = students.filter(s => s.group === session.group); if(gStudents.length===0) return tbody.innerHTML=`<tr><td colspan="6">لا يوجد طلاب</td></tr>`; tbody.innerHTML = ""; const groupS = classSessions.filter(s => s.group === session.group).sort((a,b)=>new Date(a.date)-new Date(b.date)); const prevSession = groupS[groupS.findIndex(s => s.id === session.id) - 1]; gStudents.forEach(st => { const stat = session.attendance[st.phone]; const statHtml = stat === 'present' ? '<span style="color:var(--success-color)">حاضر ✓</span>' : stat === 'absent' ? '<span style="color:var(--danger-color)">غائب ✗</span>' : 'لم يسجل'; let pHT = '--'; if(prevSession) { const p = prevSession.attendance[st.phone]; pHT = p==='present'?'حاضر':p==='absent'?'غائب':'--'; } tbody.innerHTML += `<tr><td><strong>${st.code}</strong></td><td>${st.name}</td><td>${st.phone}</td><td>${pHT}</td><td>${statHtml}</td><td><button class="btn-present" onclick="markAttendance('${st.phone}','present')">حاضر</button><button class="btn-absent" onclick="markAttendance('${st.phone}','absent')">غائب</button></td></tr>`; }); }
function markAttendance(phone, status) { const s = classSessions.find(s => s.id === currentActiveSessionId); if(s && s.status==='open') { s.attendance[phone] = status; localStorage.setItem("classSessions", JSON.stringify(classSessions)); renderAttendanceTable(s); } }

document.getElementById('attendanceBarcode').addEventListener('keypress', function(e) { 
    if(e.key === 'Enter') { 
        e.preventDefault(); 
        let code = this.value.trim(); 
        let student = students.find(s => s.code === code); 
        const session = classSessions.find(s => s.id === currentActiveSessionId); 
        if(student && student.group === session.group) { 
            markAttendance(student.phone, 'present'); 
            showToast(`تم حضور: ${student.name}`); 
        } else showToast(`خطأ!`, 'error'); 
        this.value = ''; 
    } 
});

// الامتحانات
document.getElementById("addExamForm").addEventListener("submit", function(e) { e.preventDefault(); exams.push({ id: Date.now().toString(), group: document.getElementById("examGroupSelect").value, name: document.getElementById("examName").value, maxScore: document.getElementById("examMaxScore").value, date: document.getElementById("examDate").value, status: "open", grades: {} }); localStorage.setItem("exams", JSON.stringify(exams)); this.reset(); closeModal('addExamModal'); renderExamCards(); showToast("تم الإنشاء"); });
function renderExamCards() { const grid = document.getElementById("exams-grid"); grid.innerHTML = ""; [...exams].reverse().forEach(exam => { const isClosed = exam.status === 'closed'; grid.innerHTML += `<div class="session-card exam-card"><div class="session-header-card"><div><div class="exam-group-name">${exam.name}</div><div class="session-date">${exam.group}</div></div><span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">${isClosed?'مغلق':'مفتوح'}</span></div><div class="session-actions"><button class="enter-btn enter-exam-btn" onclick="openExamDetails('${exam.id}')" ${isClosed?'disabled':''}>رصد</button><button class="icon-btn admin-only" onclick="openEditExamModal('${exam.id}')">✏️</button><button class="icon-btn admin-only" onclick="toggleExamStatus('${exam.id}')">${isClosed?'🔓':'🔒'}</button><button class="icon-btn danger admin-only" onclick="deleteExam('${exam.id}')">🗑️</button></div></div>`; }); }
function openEditExamModal(id) { const e = exams.find(e => e.id === id); if(e) { document.getElementById('editExamId').value=id; document.getElementById('editExamName').value=e.name; document.getElementById('editExamMaxScore').value=e.maxScore; document.getElementById('editExamDate').value=e.date; openModal('editExamModal'); } }
document.getElementById('editExamForm').addEventListener('submit', function(e) { e.preventDefault(); const ex = exams.find(e => e.id === document.getElementById('editExamId').value); if(ex) { ex.name = document.getElementById('editExamName').value; ex.maxScore = document.getElementById('editExamMaxScore').value; ex.date = document.getElementById('editExamDate').value; localStorage.setItem("exams", JSON.stringify(exams)); closeModal('editExamModal'); renderExamCards(); } });
function toggleExamStatus(id) { const e = exams.find(e => e.id === id); if(e) { e.status = e.status === 'open' ? 'closed' : 'open'; localStorage.setItem("exams", JSON.stringify(exams)); renderExamCards(); } }
function deleteExam(id) { customConfirm("حذف الامتحان؟", () => { exams = exams.filter(e => e.id !== id); localStorage.setItem("exams", JSON.stringify(exams)); renderExamCards(); }); }
function openExamDetails(id) { currentActiveExamId = id; const e = exams.find(e => e.id === id); document.getElementById("exams-overview").style.display = "none"; document.getElementById("exam-details-view").style.display = "block"; document.getElementById("current-exam-title").innerText = e.name; document.getElementById('examBarcodeCode').value = ''; document.getElementById('examBarcodeGrade').value = ''; renderGradesTable(e, "grades-list", saveExamGrade, currentActiveExamId, 'exam'); }
function backToExams() { document.getElementById("exams-overview").style.display = "block"; document.getElementById("exam-details-view").style.display = "none"; renderExamCards(); }
function saveExamGrade(phone) { const e = exams.find(e => e.id === currentActiveExamId); const v = document.getElementById(`grade_${phone}`).value; if(v !== "") { e.grades[phone] = v; localStorage.setItem("exams", JSON.stringify(exams)); renderGradesTable(e, "grades-list", saveExamGrade, currentActiveExamId, 'exam'); } }

document.getElementById('examBarcodeCode').addEventListener('keypress', function(e) {
    if(e.key === 'Enter') {
        e.preventDefault(); let code = this.value.trim();
        if(code) {
            let student = students.find(st => st.code === code); const exam = exams.find(ex => ex.id === currentActiveExamId);
            if(exam.status === 'closed') { showToast(`مغلق!`, 'error'); this.value = ''; } 
            else if(student && student.group === exam.group) { document.getElementById('examBarcodeGrade').focus(); showToast(`اكتب درجة: ${student.name}`); } 
            else { showToast(`كود غير صحيح!`, 'error'); this.value = ''; }
        }
    }
});
document.getElementById('examBarcodeGrade').addEventListener('keypress', function(e) { if(e.key === 'Enter') { e.preventDefault(); window.submitExamBarcodeGrade(); } });
window.submitExamBarcodeGrade = function() {
    let c = document.getElementById('examBarcodeCode').value.trim(); let g = document.getElementById('examBarcodeGrade').value.trim();
    const ex = exams.find(e => e.id === currentActiveExamId);
    if(c !== "" && g !== "") {
        let student = students.find(st => st.code === c);
        if(student && ex && ex.status === 'open') {
            if(parseFloat(g) > parseFloat(ex.maxScore) || parseFloat(g) < 0) { showToast(`درجة غير منطقية!`, 'error'); return; }
            ex.grades[student.phone] = g; localStorage.setItem("exams", JSON.stringify(exams)); renderGradesTable(ex, "grades-list", saveExamGrade, currentActiveExamId, 'exam'); showToast(`تم رصد ${g} لـ ${student.name}`);
            document.getElementById('examBarcodeCode').value = ''; document.getElementById('examBarcodeGrade').value = ''; document.getElementById('examBarcodeCode').focus();
        }
    }
};

// الواجبات
document.getElementById("addHwForm").addEventListener("submit", function(e) { e.preventDefault(); homeworks.push({ id: Date.now().toString(), group: document.getElementById("hwGroupSelect").value, name: document.getElementById("hwName").value, maxScore: document.getElementById("hwMaxScore").value, date: document.getElementById("hwDate").value, status: "open", grades: {} }); localStorage.setItem("homeworks", JSON.stringify(homeworks)); this.reset(); closeModal('addHwModal'); renderHwCards(); });
function renderHwCards() { const grid = document.getElementById("hw-grid"); grid.innerHTML = ""; [...homeworks].reverse().forEach(hw => { const isClosed = hw.status === 'closed'; grid.innerHTML += `<div class="session-card hw-card"><div class="session-header-card"><div><div class="hw-group-name">${hw.name}</div><div class="session-date">${hw.group}</div></div><span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">${isClosed?'مغلق':'مفتوح'}</span></div><div class="session-actions"><button class="enter-btn enter-hw-btn" onclick="openHwDetails('${hw.id}')" ${isClosed?'disabled':''}>تقييم</button><button class="icon-btn admin-only" onclick="openEditHwModal('${hw.id}')">✏️</button><button class="icon-btn admin-only" onclick="toggleHwStatus('${hw.id}')">${isClosed?'🔓':'🔒'}</button><button class="icon-btn danger admin-only" onclick="deleteHw('${hw.id}')">🗑️</button></div></div>`; }); }
function openEditHwModal(id) { const h = homeworks.find(h => h.id === id); if(h) { document.getElementById('editHwId').value=id; document.getElementById('editHwName').value=h.name; document.getElementById('editHwMaxScore').value=h.maxScore; document.getElementById('editHwDate').value=h.date; openModal('editHwModal'); } }
document.getElementById('editHwForm').addEventListener('submit', function(e) { e.preventDefault(); const hw = homeworks.find(h => h.id === document.getElementById('editHwId').value); if(hw) { hw.name = document.getElementById('editHwName').value; hw.maxScore = document.getElementById('editHwMaxScore').value; hw.date = document.getElementById('editHwDate').value; localStorage.setItem("homeworks", JSON.stringify(homeworks)); closeModal('editHwModal'); renderHwCards(); } });
function toggleHwStatus(id) { const h = homeworks.find(h => h.id === id); if(h) { h.status = h.status === 'open' ? 'closed' : 'open'; localStorage.setItem("homeworks", JSON.stringify(homeworks)); renderHwCards(); } }
function deleteHw(id) { customConfirm("حذف الواجب؟", () => { homeworks = homeworks.filter(h => h.id !== id); localStorage.setItem("homeworks", JSON.stringify(homeworks)); renderHwCards(); }); }
function openHwDetails(id) { currentActiveHwId = id; const hw = homeworks.find(h => h.id === id); document.getElementById("hw-overview").style.display = "none"; document.getElementById("hw-details-view").style.display = "block"; document.getElementById("current-hw-title").innerText = hw.name; document.getElementById('hwBarcodeCode').value = ''; document.getElementById('hwBarcodeGrade').value = ''; renderGradesTable(hw, "hw-grades-list", saveHwGrade, currentActiveHwId, 'hw'); }
function backToHw() { document.getElementById("hw-overview").style.display = "block"; document.getElementById("hw-details-view").style.display = "none"; renderHwCards(); }
function saveHwGrade(phone) { const hw = homeworks.find(h => h.id === currentActiveHwId); const v = document.getElementById(`grade_${phone}`).value; if(v !== "") { hw.grades[phone] = v; localStorage.setItem("homeworks", JSON.stringify(homeworks)); renderGradesTable(hw, "hw-grades-list", saveHwGrade, currentActiveHwId, 'hw'); } }

document.getElementById('hwBarcodeCode').addEventListener('keypress', function(e) {
    if(e.key === 'Enter') {
        e.preventDefault(); let code = this.value.trim();
        if(code) {
            let student = students.find(st => st.code === code); const hw = homeworks.find(h => h.id === currentActiveHwId);
            if(hw.status === 'closed') { showToast(`مغلق!`, 'error'); this.value = ''; } 
            else if(student && student.group === hw.group) { document.getElementById('hwBarcodeGrade').focus(); showToast(`اكتب درجة: ${student.name}`); } 
            else { showToast(`كود غير صحيح!`, 'error'); this.value = ''; }
        }
    }
});
document.getElementById('hwBarcodeGrade').addEventListener('keypress', function(e) { if(e.key === 'Enter') { e.preventDefault(); window.submitHwBarcodeGrade(); } });
window.submitHwBarcodeGrade = function() {
    let c = document.getElementById('hwBarcodeCode').value.trim(); let g = document.getElementById('hwBarcodeGrade').value.trim();
    const hw = homeworks.find(h => h.id === currentActiveHwId);
    if(c !== "" && g !== "") {
        let student = students.find(st => st.code === c);
        if(student && hw && hw.status === 'open') {
            if(parseFloat(g) > parseFloat(hw.maxScore) || parseFloat(g) < 0) { showToast(`درجة غير منطقية!`, 'error'); return; }
            hw.grades[student.phone] = g; localStorage.setItem("homeworks", JSON.stringify(homeworks)); renderGradesTable(hw, "hw-grades-list", saveHwGrade, currentActiveHwId, 'hw'); showToast(`تم رصد ${g} لـ ${student.name}`);
            document.getElementById('hwBarcodeCode').value = ''; document.getElementById('hwBarcodeGrade').value = ''; document.getElementById('hwBarcodeCode').focus();
        }
    }
};

function renderGradesTable(itemDetails, tbodyId, saveFunction, itemId, itemType) {
    const tbody = document.getElementById(tbodyId); const gStudents = students.filter(s => s.group === itemDetails.group);
    if(gStudents.length === 0) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">لا يوجد طلاب</td></tr>`; tbody.innerHTML = ""; 
    
    let prevItem = null;
    if(itemType === 'exam') { const grpItems = exams.filter(e => e.group === itemDetails.group).sort((a,b)=>new Date(a.date)-new Date(b.date)); prevItem = grpItems[grpItems.findIndex(e=>e.id===itemDetails.id)-1]; }
    if(itemType === 'hw') { const grpItems = homeworks.filter(h => h.group === itemDetails.group).sort((a,b)=>new Date(a.date)-new Date(b.date)); prevItem = grpItems[grpItems.findIndex(h=>h.id===itemDetails.id)-1]; }

    gStudents.forEach(st => {
        const grade = itemDetails.grades[st.phone] !== undefined ? itemDetails.grades[st.phone] : '';
        const isHw = tbodyId === 'hw-grades-list'; const btnColor = isHw ? 'var(--hw-color)' : 'var(--exam-color)';
        
        let pHT = `<span style="color:var(--text-muted)">--</span>`;
        if(prevItem && prevItem.grades[st.phone] !== undefined) pHT = `<strong style="color:${btnColor}">${prevItem.grades[st.phone]} / ${prevItem.maxScore}</strong>`;

        tbody.innerHTML += `<tr><td><strong>${st.code}</strong></td><td>${st.name}</td><td>${st.phone}</td><td style="direction:ltr;">${pHT}</td><td style="direction: ltr;"><span style="color:var(--text-muted);">/ ${itemDetails.maxScore}</span><input type="number" id="grade_${st.phone}" class="custom-input" style="width:70px; padding:5px; text-align:center;" value="${grade}" max="${itemDetails.maxScore}"></td><td><button class="btn-present" onclick="${saveFunction.name}('${st.phone}')" style="background-color: ${btnColor}; color: #fff;">حفظ</button></td></tr>`;
    });
}

// تشغيل النظام
function exportData() { const data = { students, groups, classSessions, exams, homeworks, financeRecords, expenses }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `EduTrack_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url); showToast("تم تحميل النسخة الاحتياطية بنجاح"); }
function importData(event) { const file = event.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const imp = JSON.parse(e.target.result); if(imp.students && imp.groups) { localStorage.setItem("students", JSON.stringify(imp.students)); localStorage.setItem("groups", JSON.stringify(imp.groups)); localStorage.setItem("classSessions", JSON.stringify(imp.classSessions || [])); localStorage.setItem("exams", JSON.stringify(imp.exams || [])); localStorage.setItem("homeworks", JSON.stringify(imp.homeworks || [])); localStorage.setItem("financeRecords", JSON.stringify(imp.financeRecords || {})); localStorage.setItem("expenses", JSON.stringify(imp.expenses || [])); alert("تم استرجاع البيانات بنجاح! سيتم إعادة تحميل الصفحة."); location.reload(); } else { showToast("ملف غير صالح!", "error"); } } catch(err) { showToast("خطأ أثناء قراءة الملف!", "error"); } }; reader.readAsText(file); }

renderGroupCards(); renderTable(); populateDropdowns(); setTimeout(renderDashboardCharts, 500);