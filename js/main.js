$(document).ready(function () {
    let currentQuestions = [];

    // 1. Load danh sách chủ đề
    async function init() {
        const topics = await API.fetchData("topics");
        const html = topics.map(t => `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm border-0 p-3 text-center">
                    <h5 class="fw-bold">${t.name}</h5>
                    <button class="btn btn-primary mt-2" onclick="startQuiz('${t.id}', '${t.name}')">Làm bài</button>
                </div>
            </div>`).join('');
        $('#topic-list').html(html);
    }

    // 2. Bắt đầu làm bài
    window.startQuiz = async (topicId, topicName) => {
        const allQuestions = await API.fetchData("questions");
        currentQuestions = allQuestions.filter(q => q.topicId == topicId);

        if (currentQuestions.length === 0) return alert("Chủ đề này chưa có câu hỏi!");

        $('#topic-container').addClass('d-none');
        $('#quiz-section').removeClass('d-none');
        $('#quiz-title').text(topicName);

        const html = currentQuestions.map((q, i) => `
            <div class="mb-4 p-3 bg-white rounded border">
                <p class="fw-bold">Câu ${i+1}: ${q.content}</p>
                ${q.options.map((opt, idx) => `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="q${i}" value="${idx}" id="q${i}_${idx}">
                        <label class="form-check-label" for="q${i}_${idx}">${opt}</label>
                    </div>`).join('')}
            </div>`).join('');
        $('#question-container').html(html);
    };

    // 3. Nộp bài
    $('#btn-submit').click(async function () {
        let score = 0;
        currentQuestions.forEach((q, i) => {
            const selected = $(`input[name="q${i}"]:checked`).val();
            if (selected == q.correct_answer) score++;
        });

        const percent = Math.round((score / currentQuestions.length) * 100);
        $('#result-body').html(`<h3>Bạn đạt: ${percent}%</h3><p>Đúng ${score}/${currentQuestions.length} câu.</p>`);
        new bootstrap.Modal($('#resultModal')).show();

        // Lưu kết quả
        await API.create("results", {
            studentName: "Học sinh",
            topicId: currentQuestions[0].topicId,
            score: percent,
            date: new Date().toLocaleString('vi-VN')
        });
    });

    init();
});