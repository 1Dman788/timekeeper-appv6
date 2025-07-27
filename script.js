
const API_URL = "https://script.google.com/macros/s/AKfycbwKNJlBGGIh_Paksj9BXY1CfBty3h8sAdBXX_qYdB4j04LgfmigjJJKO0pIHFpHEHb9/exec";

async function apiCall(action, data) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action, ...data }),
            headers: { "Content-Type": "application/json" },
        });
        return await response.json();
    } catch (error) {
        console.error("API call error:", error);
        alert("Network or API error. Check console for details.");
        return null;
    }
}

async function handleLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const res = await apiCall("login", { username, password });
    if (res && res.success) {
        localStorage.setItem("user", JSON.stringify({ username, role: res.role }));
        loadDashboard(res.role);
    } else {
        alert("Invalid login.");
    }
}

function loadDashboard(role) {
    document.getElementById("login-view").style.display = "none";
    document.getElementById("dashboard-view").style.display = "block";
    if (role === "admin") {
        document.getElementById("admin-tools").style.display = "block";
        loadAdminData();
    } else {
        document.getElementById("employee-tools").style.display = "block";
        loadEmployeeLogs();
    }
}

async function handlePunch(type) {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return alert("Login first.");
    const res = await apiCall("punch", { username: user.username, type });
    if (res && res.success) {
        alert("Punch recorded.");
        loadEmployeeLogs();
    } else {
        alert("Punch failed.");
    }
}

async function loadEmployeeLogs() {
    const user = JSON.parse(localStorage.getItem("user"));
    const res = await apiCall("getLogs", { username: user.username });
    const logEl = document.getElementById("employee-log");
    logEl.innerHTML = "<h3>Shift History</h3>";
    if (res && res.logs) {
        res.logs.forEach(log => {
            logEl.innerHTML += `<div>${log[0]} - ${log[2]}</div>`;
        });
    } else {
        logEl.innerHTML += "<div>No logs found.</div>";
    }
}

async function handleCreateUser() {
    const username = document.getElementById("new-username").value;
    const password = document.getElementById("new-password").value;
    const hourlyRate = document.getElementById("hourly-rate").value;
    const shiftStart = document.getElementById("shift-start").value;
    const shiftEnd = document.getElementById("shift-end").value;
    const adminPassword = document.getElementById("admin-password").value;
    const res = await apiCall("createUser", {
        username, password, hourlyRate, shiftStart, shiftEnd, adminPassword
    });
    if (res && res.success) {
        alert("User created.");
        loadAdminData();
    } else {
        alert("Failed to create user.");
    }
}

async function loadAdminData() {
    const adminPassword = document.getElementById("admin-password").value;
    const res = await apiCall("getUsers", { adminPassword });
    const adminEl = document.getElementById("admin-users");
    adminEl.innerHTML = "<h3>Accounts</h3>";
    if (res && res.users) {
        res.users.forEach(u => {
            adminEl.innerHTML += `<div>${u.username} - $${u.hourlyRate}/hr</div>`;
        });
    } else {
        adminEl.innerHTML += "<div>No user data found.</div>";
    }
}

window.onload = function () {
    const user = localStorage.getItem("user");
    if (user) {
        const { role } = JSON.parse(user);
        loadDashboard(role);
    }
    document.getElementById("login-btn").onclick = handleLogin;
    document.getElementById("punch-in-btn").onclick = () => handlePunch("in");
    document.getElementById("punch-out-btn").onclick = () => handlePunch("out");
    document.getElementById("create-user-btn").onclick = handleCreateUser;
};


// Summary and CSV Export
async function loadSummary() {
    const adminPassword = document.getElementById("admin-password").value;
    const res = await apiCall("getSummary", { adminPassword });
    const summaryDiv = document.getElementById("summary-results");
    summaryDiv.innerHTML = "<h4>Summary (Current Pay Period)</h4>";

    if (res && res.summary && res.summary.length > 0) {
        let csv = "Username,Hours,Minutes,Hourly Rate,Total Pay\n";
        summaryDiv.innerHTML += "<table><tr><th>User</th><th>Hours</th><th>Minutes</th><th>Rate</th><th>Total</th></tr>";
        res.summary.forEach(entry => {
            const [user, hours, minutes, rate, total] = entry;
            summaryDiv.innerHTML += `<tr><td>${user}</td><td>${hours}</td><td>${minutes}</td><td>$${rate}</td><td>$${total}</td></tr>`;
            csv += `${user},${hours},${minutes},${rate},${total}\n`;
        });
        summaryDiv.innerHTML += "</table>";
        window.lastCSV = csv;
    } else {
        summaryDiv.innerHTML += "<p>No summary data found.</p>";
    }
}

function exportCSV() {
    if (!window.lastCSV) return alert("No CSV data to export.");
    const blob = new Blob([window.lastCSV], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pay_summary.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.getElementById("load-summary-btn").onclick = loadSummary;
document.getElementById("export-csv-btn").onclick = exportCSV;
