api_end_url = "https://wm5w707f-8000.inc1.devtunnels.ms"

document.addEventListener("DOMContentLoaded", function () {
    requestCameraAccess().then(startExam);
});

// ✅ Request Camera Access First
function requestCameraAccess() {
    return new Promise((resolve, reject) => {
        const video = document.getElementById("videoFeed");

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    video.srcObject = stream;
                    console.log("Camera access granted.");
                    resolve(); // Proceed to start the exam
                })
                .catch(error => {
                    console.warn("Camera access denied.", error);
                    alert("Camera access is required to continue the exam.");
                    reject(); // Do not start the exam
                });
        } else {
            alert("No webcam detected!");
            reject();
        }
    });
}

// ✅ Start Exam After Camera Access is Granted
function startExam() {
    enforceFullscreen();
    detectTabSwitch();
    fetchExamInstructions();
    fetchQuestions();
    fetchTimeLimit();
}

function fetchTimeLimit() {
    fetch(api_end_url + "/get_time_limit") // Ensure the backend provides time in minutes
        .then(response => response.json())
        .then(data => {
            timeRemaining = data.time_limit * 60; // Convert minutes to seconds
            startCountdown();
        })
        .catch(error => console.error("Error fetching time limit:", error));
}

let timeRemaining = 0;
let timerInterval;

function startCountdown() {
    const timerElement = document.getElementById("timer");

    timerInterval = setInterval(() => {
        let minutes = Math.floor(timeRemaining / 60);
        let seconds = timeRemaining % 60;
        timerElement.textContent = `Time Remaining: ${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert("Time is up! Submitting your exam automatically.");
            submitExam(); // Auto-submit when time runs out
        }

        timeRemaining--;
    }, 1000);
}

// ✅ Enforce Fullscreen Mode
function enforceFullscreen() {
    document.documentElement.requestFullscreen().catch(err => {
        console.warn("Fullscreen mode could not be enabled:", err);
    });
}

// ✅ Detect Tab Switching (Cheating Prevention)
function detectTabSwitch() {
    let warningDisplayed = false;

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            disqualifyStudent();
        }
    });

    window.addEventListener("blur", function () {
        if (!warningDisplayed) {
            warningDisplayed = true;
            document.getElementById("warning").style.display = "block";
            setTimeout(disqualifyStudent, 2000);
        }
    });

    function disqualifyStudent() {
        alert("You switched tabs! You are disqualified.");
        window.location.href = "index.html";
    }
}

// ✅ Fetch Exam Instructions from Backend
function fetchExamInstructions() {
    fetch(api_end_url + "/get_instructions")
        .then(response => response.json())
        .then(data => {
            document.getElementById("instructions").innerText = data.instructions;
        })
        .catch(error => console.error("Error fetching instructions:", error));
}

// ✅ Fetch and Display Questions Dynamically
function fetchQuestions() {
    fetch(api_end_url + "/get_questions")
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("questions-container");
            container.innerHTML = "";
            data.questions.forEach((q, index) => {
                const questionDiv = document.createElement("div");
                questionDiv.classList.add("question");

                questionDiv.innerHTML = `
                    <p><strong>Q${index + 1}:</strong> ${q.question}</p>
                    ${q.options.map(option => `
                        <label>
                            <input type="radio" name="q${index}" value="${option}"> ${option}
                        </label><br>
                    `).join("")}
                `;

                container.appendChild(questionDiv);
            });
        })
        .catch(error => console.error("Error fetching questions:", error));
}

// ✅ Submit Answers to Backend
function submitExam() {
    clearInterval(timerInterval); // Stop the timer when submitting

    const rollNumber = sessionStorage.getItem("roll_number"); // Retrieve stored roll number

    alert("Your Roll Number..." + rollNumber);

    if (!rollNumber) {
        alert("Roll number not found. Please register again. " + rollNumber);
        window.location.href = "index.html";
        return;
    }

    let answers = [];
    document.querySelectorAll(".question").forEach((div, index) => {
        const selectedOption = div.querySelector(`input[name="q${index}"]:checked`);
        answers.push({
            questionIndex: index,
            selectedOption: selectedOption ? selectedOption.value : "No Answer"
        });
    });

    const payload = { 
        roll_number: rollNumber, 
        answers: answers 
    };

    fetch(api_end_url + "/submit_exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        window.location.href = "index.html";
    })
    .catch(error => console.error("Error submitting exam:", error));
}

document.getElementById("submitExam").addEventListener("click", function () {
    submitExam();
});
