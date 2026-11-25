
/* ==================================
   CLASSPILOT V1.0
   Main Application
================================== */

// IMPORTANT:
// Replace this with your Render backend URL
// when we build and deploy the backend.

const API_BASE = "https://YOUR-CLASSPILOT-BACKEND.onrender.com";

const STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas",
    "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas",
    "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma",
    "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas",
    "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
    "District of Columbia"
];

let classrooms = [];
let assignments = [];
let currentClass = null;

// ==================================
// STARTUP
// ==================================

window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("loading-screen")
            .classList.add("finished");
    }, 1900);

    loadStates();
    loadSchool();
    checkBackend();
});

// ==================================
// SCHOOL SELECTOR
// ==================================

function loadStates() {
    const select = document.getElementById("state-select");

    STATES.forEach(state => {
        const option = document.createElement("option");
        option.value = state;
        option.textContent = state;
        select.appendChild(option);
    });
}

function loadSchool() {
    const school = localStorage.getItem("cp_school");
    const state = localStorage.getItem("cp_state");

    if (school) {
        document.getElementById("school-name").value = school;
    }

    if (state) {
        document.getElementById("state-select").value = state;
    }

    if (school && state) {
        document.getElementById("school-display").textContent =
            school + " • " + state;
    }
}

document.getElementById("save-school").addEventListener("click", () => {
    const school = document.getElementById("school-name").value.trim();
    const state = document.getElementById("state-select").value;

    if (!school || !state) {
        showToast("Please enter your school and state.");
        return;
    }

    localStorage.setItem("cp_school", school);
    localStorage.setItem("cp_state", state);

    document.getElementById("school-display").textContent =
        school + " • " + state;

    document.getElementById("school-message").textContent =
        "School profile saved! Now connect Google Classroom.";

    showToast("School profile saved!");
    showPage("dashboard");
});

// ==================================
// NAVIGATION
// ==================================

function showPage(page) {
    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    const target = document.getElementById(page + "-page");

    if (target) {
        target.classList.add("active");
    }

    const nav = document.querySelector(
        `.nav-btn[data-page="${page}"]`
    );

    if (nav) nav.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.goto);
    });
});

// ==================================
// GOOGLE CLASSROOM CONNECTION
// ==================================

function connectGoogle() {
    if (API_BASE.includes("YOUR-CLASSPILOT")) {
        showToast("Our Google connection backend is not configured yet.");
        return;
    }

    window.location.href = API_BASE + "/auth/google";
}

document.getElementById("connect-google")
    .addEventListener("click", connectGoogle);

document.getElementById("connect-google-2")
    .addEventListener("click", connectGoogle);

async function checkBackend() {
    const status = document.getElementById("connection-status");

    if (API_BASE.includes("YOUR-CLASSPILOT")) {
        status.textContent = "BACKEND NOT CONFIGURED";
        return;
    }

    try {
        const response = await fetch(API_BASE + "/api/health");

        if (!response.ok) throw new Error("Backend unavailable");

        status.textContent = "BACKEND ONLINE";

        await loadClassrooms();
        await loadAssignments();

    } catch (error) {
        status.textContent = "BACKEND OFFLINE";
        console.log("Connection:", error.message);
    }
}

// ==================================
// LOAD REAL CLASSROOMS
// ==================================

async function loadClassrooms() {
    try {
        const response = await fetch(API_BASE + "/api/classrooms", {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Could not load classrooms");
        }

        const data = await response.json();

        classrooms = data.classrooms || [];

        renderClassrooms();

        document.getElementById("class-count").textContent =
            classrooms.length;

    } catch (error) {
        console.log("Classroom loading:", error.message);
    }
}

function renderClassrooms() {
    const dashboard = document.getElementById("dashboard-classes");
    const allClasses = document.getElementById("all-classes");

    if (!classrooms.length) {
        const message = `
            <div class="empty-state">
                <div class="empty-icon">▤</div>
                <h3>No classes found</h3>
                <p>Connect an account with Google Classroom courses.</p>
            </div>`;

        dashboard.innerHTML = message;
        allClasses.innerHTML = message;
        return;
    }

    const cards = classrooms.map(course => `
        <article class="class-card"
            data-course="${escapeHTML(course.id)}">
            <div class="class-banner">
                CLASSPILOT CLASSROOM
            </div>
            <div class="class-info">
                <h3>${escapeHTML(course.name)}</h3>
                <p>${escapeHTML(course.section || "Your classroom")}</p>
            </div>
        </article>
    `).join("");

    dashboard.innerHTML = cards;
    allClasses.innerHTML = cards;

    document.querySelectorAll(".class-card").forEach(card => {
        card.addEventListener("click", () => {
            openClass(card.dataset.course);
        });
    });
}

// ==================================
// OPEN A CLASSROOM
// ==================================

async function openClass(courseId) {
    currentClass = classrooms.find(c => String(c.id) === String(courseId));

    if (!currentClass) return;

    document.getElementById("detail-title").textContent =
        currentClass.name;

    document.getElementById("detail-description").textContent =
        currentClass.section || "Your Google Classroom";

    showPage("class-detail");

    document.getElementById("stream-content").innerHTML =
        '<div class="empty-state">Loading your class stream...</div>';

    document.getElementById("coursework-content").innerHTML =
        '<div class="empty-state">Loading classwork...</div>';

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === "stream");
    });

    document.getElementById("stream-content").classList.remove("hidden");
    document.getElementById("coursework-content").classList.add("hidden");

    try {
        const response = await fetch(
            API_BASE + "/api/courses/" +
            encodeURIComponent(courseId) + "/announcements",
            { credentials: "include" }
        );

        if (!response.ok) throw new Error("Stream unavailable");

        const data = await response.json();
        renderStream(data.announcements || []);

    } catch (error) {
        document.getElementById("stream-content").innerHTML =
            '<div class="empty-state">Could not load the class stream.</div>';
    }

    renderCoursework(courseId);
}

// ==================================
// CLASSROOM TABS
// ==================================

document.querySelectorAll(".tab-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        const stream = button.dataset.tab === "stream";

        document.getElementById("stream-content")
            .classList.toggle("hidden", !stream);

        document.getElementById("coursework-content")
            .classList.toggle("hidden", stream);
    });
});

// ==================================
// STREAM
// ==================================

function renderStream(posts) {
    const container = document.getElementById("stream-content");

    if (!posts.length) {
        container.innerHTML =
            '<div class="empty-state">No announcements available.</div>';
        return;
    }

    container.innerHTML = posts.map(post => `
        <div class="stream-card">
            <h3>${escapeHTML(post.title || "Class announcement")}</h3>
            <p>${escapeHTML(post.text || post.textContent || "")}</p>
            <p>${escapeHTML(post.date || "")}</p>
        </div>
    `).join("");
}

// ==================================
// ASSIGNMENTS
// ==================================

async function loadAssignments() {
    try {
        const response = await fetch(API_BASE + "/api/coursework", {
            credentials: "include"
        });

        if (!response.ok) throw new Error("Assignments unavailable");

        const data = await response.json();

        assignments = data.assignments || [];

        renderAssignments();

    } catch (error) {
        console.log("Assignment loading:", error.message);
    }
}

function isMissing(work) {
    if (work.status) {
        return work.status === "MISSING";
    }

    if (work.state && work.dueDate) {
        const due = new Date(
            work.dueDate + "T23:59:59"
        );

        return work.state === "NEW" && due < new Date();
    }

    return false;
}

function assignmentHTML(work) {
    const missing = isMissing(work);
    const done = work.status === "TURNED_IN" ||
                 work.status === "DONE" ||
                 work.state === "TURNED_IN";

    const status = missing ? "MISSING" : done ? "TURNED IN" : "UPCOMING";
    const css = missing ? "missing" : done ? "done" : "upcoming";

    return `
        <div class="assignment-card">
            <div>
                <h3>${escapeHTML(work.title || "Assignment")}</h3>
                <p>${escapeHTML(work.courseName || "Classwork")}</p>
                <p>Due: ${escapeHTML(work.dueDate || "Not specified")}</p>
            </div>
            <span class="status ${css}">${status}</span>
        </div>
    `;
}

function renderAssignments() {
    const missing = assignments.filter(isMissing);

    const completed = assignments.filter(work =>
        work.status === "TURNED_IN" ||
        work.status === "DONE" ||
        work.state === "TURNED_IN"
    );

    document.getElementById("missing-count").textContent =
        missing.length;

    document.getElementById("completed-count").textContent =
        completed.length;

    document.getElementById("all-work").innerHTML =
        assignments.length
            ? assignments.map(assignmentHTML).join("")
            : '<div class="empty-state">No assignments found.</div>';

    document.getElementById("missing-work").innerHTML =
        missing.length
            ? missing.map(assignmentHTML).join("")
            : '<div class="empty-state">No overdue assignments found. Great job!</div>';

    const upcoming = assignments.filter(work =>
        !isMissing(work) &&
        !completed.includes(work)
    );

    document.getElementById("upcoming-list").innerHTML =
        upcoming.length
            ? upcoming.slice(0, 5).map(assignmentHTML).join("")
            : '<div class="empty-state compact">No upcoming assignments.</div>';
}

async function renderCoursework(courseId) {
    const container = document.getElementById("coursework-content");

    const work = assignments.filter(item =>
        String(item.courseId) === String(courseId)
    );

    if (!work.length) {
        container.innerHTML =
            '<div class="empty-state">No classwork loaded for this class.</div>';
        return;
    }

    container.innerHTML = work.map(assignmentHTML).join("");
}

// ==================================
// REFRESH
// ==================================

document.getElementById("refresh-classes")
    .addEventListener("click", async () => {
        showToast("Refreshing classrooms...");
        await loadClassrooms();
        await loadAssignments();
        showToast("Refresh complete!");
    });

// ==================================
// STUDY TIMER
// ==================================

let totalSeconds = 25 * 60;
let remainingSeconds = totalSeconds;
let timerInterval = null;
let timerRunning = false;

function updateTimer() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    document.getElementById("timer-display").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");

    const progress =
        ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

    document.getElementById("timer-progress-fill")
        .style.width = progress + "%";
}

function startTimer() {
    if (timerRunning) return;

    timerRunning = true;
    document.getElementById("timer-start").textContent = "Pause";

    timerInterval = setInterval(() => {
        remainingSeconds--;

        updateTimer();

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;

            document.getElementById("timer-start").textContent = "Start";
            document.getElementById("timer-message").textContent =
                "Session complete! Great work!";

            showToast("Study session complete!");
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById("timer-start").textContent = "Resume";
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    remainingSeconds = totalSeconds;

    document.getElementById("timer-start").textContent = "Start";
    document.getElementById("timer-message").textContent =
        "You've got this. One step at a time!";

    updateTimer();
}

document.getElementById("timer-start").addEventListener("click", () => {
    if (timerRunning) {
        pauseTimer();
    } else {
        if (remainingSeconds <= 0) resetTimer();
        startTimer();
    }
});

document.getElementById("timer-reset")
    .addEventListener("click", resetTimer);

document.querySelectorAll(".preset").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".preset").forEach(b =>
            b.classList.remove("active")
        );

        button.classList.add("active");

        totalSeconds = Number(button.dataset.minutes) * 60;
        remainingSeconds = totalSeconds;

        document.getElementById("timer-mode").textContent =
            "FOCUS SESSION";

        resetTimer();
    });
});

document.getElementById("break-button")
    .addEventListener("click", () => {
        document.querySelectorAll(".preset").forEach(b =>
            b.classList.remove("active")
        );

        totalSeconds = 5 * 60;
        remainingSeconds = totalSeconds;

        document.getElementById("timer-mode").textContent =
            "BREAK TIME";

        resetTimer();
    });

// ==================================
// UTILITIES
// ==================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

console.log("CLASS PILOT V1.0 READY");
