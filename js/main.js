$(document).ready(function () {
    let currentQuestions = [];

    // 1. Load danh sách chủ đề
    async function init() {
        const topics = await API.fetchData("topics");
        const html = topics.map(t => `
            <div class="col-md-4 subject-item">
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

    $('#historyButton').click(openHistory);

    init();
});

async function openHistory() {
    $('#history-loading').removeClass('d-none');
    $('#history-content').addClass('d-none');
    $('#history-empty').addClass('d-none');

    try {
        const [topics, results] = await Promise.all([
            API.fetchData('topics'),
            API.fetchData('results')
        ]);

        const topicMap = topics.reduce((map, topic) => {
            map[topic.id] = topic.name;
            return map;
        }, {});

        const sortedResults = results
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const rows = sortedResults.map(result => {
            return `<tr>
                        <td>${result.date}</td>
                        <td>${topicMap[result.topicId] || 'Không rõ'}</td>
                        <td><span class="badge bg-success">${result.score}%</span></td>
                    </tr>`;
        }).join('');

        $('#history-table-body').html(rows);
        if (rows.length === 0) {
            $('#history-empty').removeClass('d-none');
        }

        $('#history-loading').addClass('d-none');
        $('#history-content').removeClass('d-none');
        new bootstrap.Modal($('#historyModal')).show();
    } catch (error) {
        $('#history-loading').html(`<p class="text-danger">Không thể tải lịch sử. Vui lòng thử lại sau.</p>`);
        console.error(error);
    }
}

// Tìm kiếm môn học
$("#searchSubject").on("keyup", function () {
  let keyword = $(this).val().toLowerCase();

  $(".subject-item").each(function () {
    let subjectName = $(this).text().toLowerCase();

    if (subjectName.includes(keyword)) {
      $(this).show();
    } else {
      $(this).hide();
    }
  });
});