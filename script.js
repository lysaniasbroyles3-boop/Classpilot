
/* ==================================
   CLASSPILOT V2.0
   Main Application + Advanced Study Center
================================== */

// ==================================
// CONFIGURATION
// ==================================

// Leave this as it is until we build a backend.
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
// GENERAL HELPERS
// ==================================

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value;
}

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
    const toast = getElement("toast");

    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function getTodayKey() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ==================================
// STARTUP
// ==================================

window.addEventListener("load", () => {
    setTimeout(() => {
        const loadingScreen = getElement("loading-screen");

        if (loadingScreen) {
            loadingScreen.classList.add("finished");
        }
    }, 1900);

    loadStates();
    loadSchool();
    initializeStudyCenter();
    checkBackend();

    console.log("CLASSPILOT V2.0 READY");
});

// ==================================
// SCHOOL SELECTOR
// ==================================

function loadStates() {
    const select = getElement("state-select");

    if (!select) return;

    // Prevent duplicate state options.
    if (select.options.length > 1) return;

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

    const schoolInput = getElement("school-name");
    const stateSelect = getElement("state-select");

    if (school && schoolInput) {
        schoolInput.value = school;
    }

    if (state && stateSelect) {
        stateSelect.value = state;
    }

    if (school && state) {
        setText("school-display", school + " • " + state);
    }
}

const saveSchoolButton = getElement("save-school");

if (saveSchoolButton) {
    saveSchoolButton.addEventListener("click", () => {
        const school = getElement("school-name")?.value.trim();
        const state = getElement("state-select")?.value;

        if (!school || !state) {
            showToast("Please enter your school and state.");
            return;
        }

        localStorage.setItem("cp_school", school);
        localStorage.setItem("cp_state", state);

        setText("school-display", school + " • " + state);
        setText("school-message", "School profile saved!");

        showToast("School profile saved!");
        showPage("dashboard");
    });
}

// ==================================
// NAVIGATION
// ==================================

function showPage(page) {
    document.querySelectorAll(".page").forEach(element => {
        element.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.remove("active");
    });

    const target = getElement(page + "-page");

    if (target) {
        target.classList.add("active");
    }

    const nav = document.querySelector(
        `.nav-btn[data-page="${page}"]`
    );

    if (nav) {
        nav.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
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
        showToast("Google Classroom connection is not configured.");
        return;
    }

    window.location.href = API_BASE + "/auth/google";
}

const connectGoogleButton = getElement("connect-google");
const connectGoogleButton2 = getElement("connect-google-2");

if (connectGoogleButton) {
    connectGoogleButton.addEventListener("click", connectGoogle);
}

if (connectGoogleButton2) {
    connectGoogleButton2.addEventListener("click", connectGoogle);
}

// ==================================
// BACKEND CONNECTION
// ==================================

async function checkBackend() {
    const status = getElement("connection-status");

    if (API_BASE.includes("YOUR-CLASSPILOT")) {
        if (status) {
            status.textContent = "BACKEND NOT CONFIGURED";
        }
        return;
    }

    try {
        const response = await fetch(API_BASE + "/api/health");

        if (!response.ok) {
            throw new Error("Backend unavailable");
        }

        if (status) {
            status.textContent = "BACKEND ONLINE";
        }

        await loadClassrooms();
        await loadAssignments();

    } catch (error) {
        if (status) {
            status.textContent = "BACKEND OFFLINE";
        }

        console.log("Backend connection:", error.message);
    }
}

// ==================================
// LOAD CLASSROOMS
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
        setText("class-count", classrooms.length);

    } catch (error) {
        console.log("Classroom loading:", error.message);
    }
}

function renderClassrooms() {
    const dashboard = getElement("dashboard-classes");
    const allClasses = getElement("all-classes");

    const message = `
        <div class="empty-state">
            <div class="empty-icon">▤</div>
            <h3>No classes found</h3>
            <p>Classes will appear here when available.</p>
        </div>
    `;

    if (!classrooms.length) {
        if (dashboard) dashboard.innerHTML = message;
        if (allClasses) allClasses.innerHTML = message;
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

    if (dashboard) dashboard.innerHTML = cards;
    if (allClasses) allClasses.innerHTML = cards;

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
    currentClass = classrooms.find(
        course => String(course.id) === String(courseId)
    );

    if (!currentClass) return;

    setText("detail-title", currentClass.name);
    setText(
        "detail-description",
        currentClass.section || "Your classroom"
    );

    showPage("class-detail");

    const stream = getElement("stream-content");
    const coursework = getElement("coursework-content");

    if (stream) {
        stream.innerHTML =
            '<div class="empty-state">Loading your class stream...</div>';
    }

    if (coursework) {
        coursework.innerHTML =
            '<div class="empty-state">Loading classwork...</div>';
    }

    document.querySelectorAll(".tab-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.tab === "stream"
        );
    });

    if (stream) stream.classList.remove("hidden");
    if (coursework) coursework.classList.add("hidden");

    try {
        const response = await fetch(
            API_BASE + "/api/courses/" +
            encodeURIComponent(courseId) + "/announcements",
            { credentials: "include" }
        );

        if (!response.ok) {
            throw new Error("Stream unavailable");
        }

        const data = await response.json();

        renderStream(data.announcements || []);

    } catch (error) {
        if (stream) {
            stream.innerHTML =
                '<div class="empty-state">Could not load the class stream.</div>';
        }
    }

    renderCoursework(courseId);
}

// ==================================
// CLASSROOM TABS
// ==================================

document.querySelectorAll(".tab-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(tab => {
            tab.classList.remove("active");
        });

        button.classList.add("active");

        const isStream = button.dataset.tab === "stream";

        const stream = getElement("stream-content");
        const coursework = getElement("coursework-content");

        if (stream) {
            stream.classList.toggle("hidden", !isStream);
        }

        if (coursework) {
            coursework.classList.toggle("hidden", isStream);
        }
    });
});

// ==================================
// CLASS STREAM
// ==================================

function renderStream(posts) {
    const container = getElement("stream-content");

    if (!container) return;

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

        if (!response.ok) {
            throw new Error("Assignments unavailable");
        }

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
        const due = new Date(work.dueDate + "T23:59:59");

        return work.state === "NEW" && due < new Date();
    }

    return false;
}

function assignmentHTML(work) {
    const missing = isMissing(work);

    const done =
        work.status === "TURNED_IN" ||
        work.status === "DONE" ||
        work.state === "TURNED_IN";

    const status = missing
        ? "MISSING"
        : done
        ? "TURNED IN"
        : "UPCOMING";

    const css = missing
        ? "missing"
        : done
        ? "done"
        : "upcoming";

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

    setText("missing-count", missing.length);
    setText("completed-count", completed.length);

    const allWork = getElement("all-work");
    const missingWork = getElement("missing-work");
    const upcomingList = getElement("upcoming-list");

    if (allWork) {
        allWork.innerHTML = assignments.length
            ? assignments.map(assignmentHTML).join("")
            : '<div class="empty-state">No assignments found.</div>';
    }

    if (missingWork) {
        missingWork.innerHTML = missing.length
            ? missing.map(assignmentHTML).join("")
            : '<div class="empty-state">No overdue assignments found. Great job!</div>';
    }

    const upcoming = assignments.filter(work =>
        !isMissing(work) && !completed.includes(work)
    );

    if (upcomingList) {
        upcomingList.innerHTML = upcoming.length
            ? upcoming.slice(0, 5).map(assignmentHTML).join("")
            : '<div class="empty-state compact">No upcoming assignments.</div>';
    }
}

function renderCoursework(courseId) {
    const container = getElement("coursework-content");

    if (!container) return;

    const work = assignments.filter(item =>
        String(item.courseId) === String(courseId)
    );

    container.innerHTML = work.length
        ? work.map(assignmentHTML).join("")
        : '<div class="empty-state">No classwork loaded for this class.</div>';
}

// ==================================
// REFRESH
// ==================================

const refreshButton = getElement("refresh-classes");

if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
        showToast("Refreshing classrooms...");

        await loadClassrooms();
        await loadAssignments();

        showToast("Refresh complete!");
    });
}

// ==================================
// ADVANCED STUDY CENTER
// ==================================

const STUDY_STORAGE_KEY = "cp_study_data";

let studyData = {
    sessions: [],
    cards: [],
    goal: 60,
    notes: ""
};

function loadStudyData() {
    try {
        const saved = localStorage.getItem(STUDY_STORAGE_KEY);

        if (saved) {
            const parsed = JSON.parse(saved);

            studyData = {
                sessions: Array.isArray(parsed.sessions)
                    ? parsed.sessions : [],

                cards: Array.isArray(parsed.cards)
                    ? parsed.cards : [],

                goal: Number(parsed.goal) || 60,

                notes: typeof parsed.notes === "string"
                    ? parsed.notes : ""
            };
        }
    } catch (error) {
        console.log("Study data could not be loaded:", error);
    }
}

function saveStudyData() {
    localStorage.setItem(
        STUDY_STORAGE_KEY,
        JSON.stringify(studyData)
    );
}

// ==================================
// TIMER VARIABLES
// ==================================

let totalSeconds = 25 * 60;
let remainingSeconds = totalSeconds;
let timerInterval = null;
let timerRunning = false;
let timerType = "focus";

function updateTimer() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    setText(
        "timer-display",
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0")
    );

    const progress =
        ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

    const progressBar = getElement("timer-progress-fill");

    if (progressBar) {
        progressBar.style.width = progress + "%";
    }
}

function stopTimerInterval() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    timerRunning = false;
}

function startTimer() {
    if (timerRunning) return;

    timerRunning = true;
    setText("timer-start", "Pause");

    timerInterval = setInterval(() => {
        remainingSeconds--;

        updateTimer();

        if (remainingSeconds <= 0) {
            stopTimerInterval();

            setText("timer-start", "Start");

            if (timerType === "focus") {
                completeStudySession();
            } else {
                setText(
                    "timer-message",
                    "Break complete! Ready for another session?"
                );

                showToast("Your break is complete!");
            }
        }
    }, 1000);
}

function pauseTimer() {
    stopTimerInterval();
    setText("timer-start", "Resume");
    setText("timer-message", "Timer paused. Continue when you're ready.");
}

function resetTimer() {
    stopTimerInterval();

    remainingSeconds = totalSeconds;

    setText("timer-start", "Start");
    setText(
        "timer-message",
        "You've got this. One step at a time!"
    );

    updateTimer();
}

function completeStudySession() {
    const subject = getElement("study-subject")?.value || "General Study";

    const session = {
        subject: subject,
        minutes: Math.round(totalSeconds / 60),
        date: getTodayKey(),
        completedAt: new Date().toISOString()
    };

    studyData.sessions.unshift(session);

    saveStudyData();
    updateStudyStats();

    setText("timer-message", "Focus session complete! Excellent work!");
    showToast("Study session completed!");
}

// ==================================
// TIMER BUTTONS
// ==================================

const timerStartButton = getElement("timer-start");

if (timerStartButton) {
    timerStartButton.addEventListener("click", () => {
        if (timerRunning) {
            pauseTimer();
        } else {
            if (remainingSeconds <= 0) {
                resetTimer();
            }

            startTimer();
        }
    });
}

const timerResetButton = getElement("timer-reset");

if (timerResetButton) {
    timerResetButton.addEventListener("click", resetTimer);
}

document.querySelectorAll(".preset").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".preset").forEach(preset => {
            preset.classList.remove("active");
        });

        button.classList.add("active");

        timerType = "focus";
        totalSeconds = Number(button.dataset.minutes) * 60;
        remainingSeconds = totalSeconds;

        setText("timer-mode", "FOCUS SESSION");

        resetTimer();
    });
});

const breakButton = getElement("break-button");

if (breakButton) {
    breakButton.addEventListener("click", () => {
        document.querySelectorAll(".preset").forEach(button => {
            button.classList.remove("active");
        });

        timerType = "break";
        totalSeconds = 5 * 60;
        remainingSeconds = totalSeconds;

        setText("timer-mode", "BREAK TIME");

        resetTimer();
    });
}

// ==================================
// DAILY STUDY GOALS
// ==================================

function updateStudyStats() {
    const today = getTodayKey();

    const todaySessions = studyData.sessions.filter(
        session => session.date === today
    );

    const minutesToday = todaySessions.reduce(
        (total, session) => total + session.minutes,
        0
    );

    const goal = Math.max(5, Number(studyData.goal) || 60);

    const percentage = Math.min(
        100,
        Math.round((minutesToday / goal) * 100)
    );

    setText("study-today", minutesToday);
    setText("study-sessions", studyData.sessions.length);
    setText("card-count", studyData.cards.length);

    setText("goal-percent", percentage + "%");
    setText(
        "goal-description",
        `${minutesToday} of ${goal} minutes completed today`
    );

    const goalCircle = document.querySelector(".goal-circle");

    if (goalCircle) {
        const degrees = percentage * 3.6;

        goalCircle.style.background =
            `conic-gradient(#936cff 0deg ${degrees}deg, #2a3456 ${degrees}deg 360deg)`;
    }

    renderStudyHistory();
}

const saveGoalButton = getElement("save-goal");

if (saveGoalButton) {
    saveGoalButton.addEventListener("click", () => {
        const input = getElement("goal-input");

        const goal = Number(input?.value);

        if (!Number.isFinite(goal) || goal < 5 || goal > 600) {
            showToast("Choose a goal between 5 and 600 minutes.");
            return;
        }

        studyData.goal = goal;

        saveStudyData();
        updateStudyStats();

        showToast("Daily study goal saved!");
    });
}

// ==================================
// STUDY NOTES
// ==================================

function loadStudyNotes() {
    const notes = getElement("study-notes");

    if (notes) {
        notes.value = studyData.notes;
    }
}

const saveNotesButton = getElement("save-notes");

if (saveNotesButton) {
    saveNotesButton.addEventListener("click", () => {
        studyData.notes = getElement("study-notes")?.value || "";

        saveStudyData();

        setText("notes-status", "Saved successfully!");
        showToast("Your notes have been saved!");
    });
}

// ==================================
// FLASHCARD LABORATORY
// ==================================

let currentCardIndex = 0;
let cardFlipped = false;

function renderFlashcard() {
    const display = getElement("flashcard-text");
    const hint = getElement("flashcard-hint");

    if (!display) return;

    if (!studyData.cards.length) {
        display.textContent = "Your flashcards will appear here.";
        if (hint) hint.textContent = "Create your first flashcard to begin.";
        setText("flashcard-counter", "0 / 0");
        return;
    }

    currentCardIndex = Math.max(
        0,
        Math.min(currentCardIndex, studyData.cards.length - 1)
    );

    const card = studyData.cards[currentCardIndex];

    display.textContent = cardFlipped
        ? card.answer
        : card.question;

    if (hint) {
        hint.textContent = cardFlipped
            ? "Answer"
            : "Question";
    }

    setText(
        "flashcard-counter",
        `${currentCardIndex + 1} / ${studyData.cards.length}`
    );

    setText("card-count", studyData.cards.length);
}

const addFlashcardButton = getElement("add-flashcard");

if (addFlashcardButton) {
    addFlashcardButton.addEventListener("click", () => {
        const question = getElement("flash-question")?.value.trim();
        const answer = getElement("flash-answer")?.value.trim();

        if (!question || !answer) {
            showToast("Enter both a question and an answer.");
            return;
        }

        studyData.cards.push({
            question: question,
            answer: answer
        });

        saveStudyData();

        getElement("flash-question").value = "";
        getElement("flash-answer").value = "";

        currentCardIndex = studyData.cards.length - 1;
        cardFlipped = false;

        renderFlashcard();
        updateStudyStats();

        showToast("Flashcard created!");
    });
}

const flipCardButton = getElement("flip-card");

if (flipCardButton) {
    flipCardButton.addEventListener("click", () => {
        if (!studyData.cards.length) return;

        cardFlipped = !cardFlipped;
        renderFlashcard();
    });
}

const previousCardButton = getElement("previous-card");

if (previousCardButton) {
    previousCardButton.addEventListener("click", () => {
        if (!studyData.cards.length) return;

        currentCardIndex =
            (currentCardIndex - 1 + studyData.cards.length) %
            studyData.cards.length;

        cardFlipped = false;
        renderFlashcard();
    });
}

const nextCardButton = getElement("next-card");

if (nextCardButton) {
    nextCardButton.addEventListener("click", () => {
        if (!studyData.cards.length) return;

        currentCardIndex =
            (currentCardIndex + 1) % studyData.cards.length;

        cardFlipped = false;
        renderFlashcard();
    });
}

// ==================================
// STUDY SESSION HISTORY
// ==================================

function renderStudyHistory() {
    const container = getElement("study-history");

    if (!container) return;

    if (!studyData.sessions.length) {
        container.innerHTML = `
            <div class="empty-state">
                No completed study sessions yet.
                Your progress will appear here.
            </div>
        `;
        return;
    }

    container.innerHTML = studyData.sessions
        .slice(0, 10)
        .map(session => {
            const date = new Date(
                session.completedAt || session.date
            );

            const formattedDate = Number.isNaN(date.getTime())
                ? session.date
                : date.toLocaleDateString();

            return `
                <div class="history-item">
                    <div>
                        <strong>${escapeHTML(session.subject)}</strong>
                        <p>${escapeHTML(formattedDate)}</p>
                    </div>

                    <span>${escapeHTML(session.minutes)} min</span>
                </div>
            `;
        })
        .join("");
}

// ==================================
// INITIALIZE STUDY CENTER
// ==================================

function initializeStudyCenter() {
    loadStudyData();

    const goalInput = getElement("goal-input");

    if (goalInput) {
        goalInput.value = studyData.goal;
    }

    loadStudyNotes();

    updateTimer();
    updateStudyStats();
    renderFlashcard();
}

// ==================================
// FINAL STARTUP MESSAGE
// ==================================

console.log("CLASSPILOT V2.0 READY");
console.log("ADVANCED STUDY CENTER INITIALIZED");

